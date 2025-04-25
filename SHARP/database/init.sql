DROP TABLE IF EXISTS emails;
DROP TABLE IF EXISTS users;

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
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'pending'    -- pending, delivered, failed
);

CREATE INDEX idx_emails_from ON emails(from_address);
CREATE INDEX idx_emails_to ON emails(to_address);
CREATE INDEX idx_emails_status ON emails(status);