export type EmailStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'rejected' | 'scheduled';
export type EmailContentType = 'text/plain' | 'text/html';

export type EmailClassification = 'primary' | 'promotions' | 'social' | 'forums' | 'updates';

export interface EmailAttachment {
    key: string;
    filename: string;
    size: number;
    type: string;
}

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
    starred: boolean;
    content_type: EmailContentType;
    html_body: string | null;
    read_at: string | null;
    classification: EmailClassification;
    reply_to_id?: string | null;  // ID of email this is replying to
    thread_id?: string | null;    // ID of the root email in this thread
    attachments: EmailAttachment[];
}

export interface Draft {
    id: number;
    user_email: string;
    to_address: string | null;
    subject: string | null;
    body: string | null;
    content_type: EmailContentType;
    html_body: string | null;
    created_at: string;
    updated_at: string;
}

export type AllowedTag = 'p' | 'br' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' |
    'ul' | 'ol' | 'li' | 'strong' | 'em' | 'u' | 'a' | 'img' |
    'table' | 'thead' | 'tbody' | 'tr' | 'th' | 'td';

export type AllowedCSSProperty = 'color' | 'font-size' | 'font-weight' | 
    'text-align' | 'margin' | 'padding' | 'border';

export const ALLOWED_HTML_TAGS: AllowedTag[] = [
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'strong', 'em', 'u', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

export type AttributeMap = {
    [K in AllowedTag | '*']?: readonly string[];
};

export const ALLOWED_HTML_ATTRIBUTES: AttributeMap = {
    'a': ['href'],
    'img': ['src', 'alt', 'width', 'height'],
    '*': ['style']
};

export const ALLOWED_CSS_PROPERTIES: AllowedCSSProperty[] = [
    'color', 'font-size', 'font-weight', 'text-align',
    'margin', 'padding', 'border'
];
