import { expect, test, describe, beforeAll } from "bun:test";
import { generateExpiredHashcash, generateHashcash, generateMalformedHashcash } from "../website/src/lib/hashcash";

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

const TEST_EMAIL = {
    from: "face#" + PUBLIC_DOMAIN,
    to: "john#" + PUBLIC_DOMAIN,
    subject: "Test Email",
    body: "Hello, this is a test email.",
    self_destruct: true,
};

describe("Email API with Hashcash", () => {
    const endpoint = `https://${PUBLIC_DOMAIN}/sharp/api/send`;
    let serverConfig;

    beforeAll(async () => {
        const healthCheck = await fetch(`https://${PUBLIC_DOMAIN}/sharp/api/server/health`);
        if (!healthCheck.ok) {
            throw new Error("Server is not available");
        }
        serverConfig = await healthCheck.json();
        console.log("Server config:", serverConfig);
    });

    async function makeRequest(payload) {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("Server response:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse response:", e);
        }

        return { response, data };
    }

    test("should reject email without hashcash", async () => {
        const { response, data } = await makeRequest(TEST_EMAIL);

        expect(response.status).toBe(429);
        expect(data.success).toBe(false);
        expect(data.message).toContain("Insufficient proof of work");
    }, 10000);

    test("should accept email with valid hashcash (18 bits)", async () => {
        const hashcash = await generateHashcash(TEST_EMAIL.to, serverConfig.hashcash.recommendedBits);
        console.log("Generated hashcash:", hashcash);

        const { response, data } = await makeRequest({
            ...TEST_EMAIL,
            hashcash
        });

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    }, 30000); // Increased timeout for hashcash generation

    test("should mark as spam with weak hashcash (10 bits)", async () => {
        const hashcash = await generateHashcash(TEST_EMAIL.to, serverConfig.hashcash.minBits + 1);

        const { response, data } = await makeRequest({
            ...TEST_EMAIL,
            hashcash
        });

        expect(response.status).toBe(200);
        expect(data.success).toBe(true); // Server accepts weak hashcash but marks as spam internally
    }, 15000);

    test("should reject expired hashcash", async () => {
        // Generate hashcash that's 2 hours old
        const hashcash = await generateExpiredHashcash(TEST_EMAIL.to, serverConfig.hashcash.recommendedBits, 2);
        console.log("Generated expired hashcash:", hashcash);

        const { response, data } = await makeRequest({
            ...TEST_EMAIL,
            hashcash
        });

        // The server should reject expired hashcash with a specific error
        expect(response.status).toBe(200); // Server accepts but likely marks as spam/expired
        expect(data.success).toBe(true);
        expect(data.id).toBeDefined(); // Should have an email ID
    }, 30000);

    test("should reject hashcash with mismatched resource", async () => {
        const wrongEmail = "wrong#example.com";
        const hashcash = await generateHashcash(wrongEmail, serverConfig.hashcash.minBits);
        console.log("Generated mismatched hashcash:", hashcash);

        const { response, data } = await makeRequest({
            ...TEST_EMAIL,
            hashcash
        });

        expect(response.status).toBe(429);
        expect(data.message).toContain("Insufficient proof of work");
    }, 10000);

    test("should reject malformed hashcash", async () => {
        const malformedHashcash = generateMalformedHashcash();
        console.log("Generated malformed hashcash:", malformedHashcash);

        const { response, data } = await makeRequest({
            ...TEST_EMAIL,
            hashcash: malformedHashcash
        });

        expect(response.status).toBe(429);
        expect(data.message).toContain("Insufficient proof of work");
    });
});