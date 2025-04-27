DROP TABLE IF EXISTS emails;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS email_status;
CREATE TYPE email_status AS ENUM (
    'pending',    -- Initial state
    'sending',    -- Transmission in progress
    'sent',       -- Successfully delivered
    'failed',     -- Transmission failed
    'rejected'    -- Explicitly rejected by remote server
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emails (
    id SERIAL PRIMARY KEY,
    from_address VARCHAR(255) NOT NULL,     -- format: user@domain
    from_domain VARCHAR(255) NOT NULL,      -- extracted domain
    to_address VARCHAR(255) NOT NULL,       -- format: user@domain
    to_domain VARCHAR(255) NOT NULL,        -- extracted domain
    subject TEXT,
    body TEXT,
    content_type VARCHAR(50) DEFAULT 'text/plain',
    html_body TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT DEFAULT NULL,
    status email_status DEFAULT 'pending'
);

CREATE INDEX idx_emails_from ON emails(from_address);
CREATE INDEX idx_emails_to ON emails(to_address);
CREATE INDEX idx_emails_status ON emails(status);