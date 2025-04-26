export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface Email {
    id: string;
    from_address: string;
    from_domain: string;
    to_address: string;
    to_domain: string;
    subject: string | null;
    body: string | null;
    sent_at: string;
    error_message: string | null;
    status: EmailStatus;
}
