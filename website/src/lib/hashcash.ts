import { crypto } from '@noble/hashes/crypto';
import { sha1 } from '@noble/hashes/legacy.js';
import log from './logger';

export async function generateHashcash(resource: string, bits: number, signal?: AbortSignal): Promise<string> {
    log.debug(`Generating Hashcash(${bits}) for ${resource}`);
    const startTime = Date.now();
    const version = 1;
    const date = formatDate(new Date());
    const rand = generateRandomString();
    let counter = 0;

    while (true) {
        if (signal?.aborted) {
            log.debug(`Hashcash generation aborted for ${resource}`);
            throw new DOMException('Aborted', 'AbortError');
        }

        if (counter % 1000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const counterBuf = new Uint8Array(4);
        new DataView(counterBuf.buffer).setUint32(0, counter);
        const counterB64 = btoa(String.fromCharCode(...counterBuf)).replace(/=+$/, '');

        const header = [version, bits, date, resource, '', rand, counterB64].join(':');

        if (hasLeadingZeroBits(sha1Hash(header), bits)) {
            const duration = Date.now() - startTime;
            log.debug(`Found hashcash after ${counter} iterations in ${duration}ms.`);
            return header;
        }
        counter++;
    }
}

function formatDate(date: Date): string {
    return [
        date.getUTCFullYear().toString().slice(-2),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
        String(date.getUTCHours()).padStart(2, '0'),
        String(date.getUTCMinutes()).padStart(2, '0'),
        String(date.getUTCSeconds()).padStart(2, '0')
    ].join('');
}

function generateRandomString(length = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from<number, string>(bytes, byte => chars[byte % chars.length]).join('');
}

function sha1Hash(str: string): string {
    const hash = sha1(new TextEncoder().encode(str));
    return Array.from<number>(hash)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hasLeadingZeroBits(hexHash: string, bits: number): boolean {
    const hashInt = BigInt('0x' + hexHash);
    const bin = hashInt.toString(2).padStart(160, '0');
    return bin.startsWith('0'.repeat(bits));
}

export class HashcashPool {
    private tokens: Map<string, { token: string, timestamp: number }[]> = new Map();
    private mining: Map<string, Promise<void>> = new Map();
    private maxPoolSize: number;
    private minDifficulty: number;
    private abortController: AbortController;

    constructor(options = { maxPoolSize: 5, minDifficulty: 18 }) {
        this.maxPoolSize = options.maxPoolSize;
        this.minDifficulty = options.minDifficulty;
        this.abortController = new AbortController();
    }

    async getToken(recipient: string): Promise<string> {
        log.debug(`getToken called for ${recipient}. Current difficulty: ${this.minDifficulty}`);
        let tokens = this.tokens.get(recipient);

        if (tokens?.length) {
            log.debug(`Using pre-mined token for ${recipient}. Pool size: ${tokens.length - 1}`);
            const [first, ...rest] = tokens;
            this.tokens.set(recipient, rest);
            this.ensurePoolFilled(recipient);
            return first.token;
        }

        const miningPromise = this.mining.get(recipient);
        if (miningPromise) {
            log.debug(`Waiting for ongoing background mining for ${recipient}...`);
            await miningPromise;

            tokens = this.tokens.get(recipient);
            if (tokens?.length) {
                log.debug(`Using token mined in background for ${recipient}. Pool size: ${tokens.length - 1}`);
                const [first, ...rest] = tokens;
                this.tokens.set(recipient, rest);

                return first.token;
            }

            log.debug(`Background mining finished but no token available for ${recipient}. Generating synchronously...`);
        } else {
            log.debug(`No pre-mined token and no background mining running for ${recipient}. Generating synchronously...`);
        }

        const token = await generateHashcash(recipient, this.minDifficulty, this.abortController.signal);
        this.ensurePoolFilled(recipient);
        return token;
    }

    public async ensurePoolFilled(recipient: string) {
        if ((this.tokens.get(recipient) ?? []).length >= this.maxPoolSize) {
            return;
        }

        if (!this.mining.has(recipient)) {
            this.mining.set(recipient, this.mineTokens(recipient));
        }
    }

    private async mineTokens(recipient: string) {
        log.debug(`Starting background mining for ${recipient} (difficulty: ${this.minDifficulty})`);
        try {
            while ((this.tokens.get(recipient) ?? []).length < this.maxPoolSize) {
                if (this.abortController.signal.aborted) {
                    log.debug(`Background mining aborted for ${recipient} before starting next token.`);
                    break;
                }

                const currentLength = (this.tokens.get(recipient) ?? []).length;
                log.debug(`Mining token ${currentLength + 1}/${this.maxPoolSize} for ${recipient}...`);
                const token = await generateHashcash(recipient, this.minDifficulty, this.abortController.signal);

                if (this.abortController.signal.aborted) {
                    log.debug(`Background mining aborted for ${recipient} after finishing token.`);
                    break;
                }

                const tokens = this.tokens.get(recipient) || [];
                tokens.push({ token, timestamp: Date.now() });
                this.tokens.set(recipient, tokens);
                log.debug(`Finished mining token ${currentLength + 1}/${this.maxPoolSize} for ${recipient}.`);
            }
            if (!this.abortController.signal.aborted) {
                log.debug(`Token pool for ${recipient} is full.`);
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                log.debug(`Background mining explicitly aborted for ${recipient}.`);
            } else {
                log.error(`Error during background mining for ${recipient}:`, error);
            }
        }
        finally {
            this.mining.delete(recipient);
        }
    }

    setMinBits(bits: number) {
        this.minDifficulty = bits;
        this.tokens.clear();
        this.mining.clear();
    }

    getMinBits(): number {
        return this.minDifficulty;
    }

    cleanup() {
        log.debug("Cleaning up HashcashPool: Aborting ongoing generation and clearing tokens.");
        this.abortController.abort();
        this.tokens.clear();
        this.mining.clear();
        this.abortController = new AbortController();
    }
}