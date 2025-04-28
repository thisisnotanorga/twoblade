DROP TABLE IF EXISTS emails;

DROP TABLE IF EXISTS user_secret_codes;

DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS email_status;

CREATE TYPE email_status AS ENUM (
    'pending', -- Initial state
    'sending', -- Transmission in progress
    'sent', -- Successfully delivered
    'failed', -- Transmission failed
    'rejected' -- Explicitly rejected by remote server
);

CREATE TABLE
    users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        domain VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_banned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_users_username ON users (username);

CREATE TABLE
    user_secret_codes (
        code VARCHAR(64) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at TIMESTAMP
        WITH
            TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ip VARCHAR(48),
            user_agent TEXT
    );

CREATE INDEX idx_user_secret_codes_user_id ON user_secret_codes (user_id);

CREATE TABLE
    emails (
        id SERIAL PRIMARY KEY,
        from_address VARCHAR(255) NOT NULL, -- format: user@domain
        from_domain VARCHAR(255) NOT NULL, -- extracted domain
        to_address VARCHAR(255) NOT NULL, -- format: user@domain
        to_domain VARCHAR(255) NOT NULL, -- extracted domain
        subject TEXT,
        body TEXT,
        content_type VARCHAR(50) DEFAULT 'text/plain',
        html_body TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT DEFAULT NULL,
        status email_status DEFAULT 'pending',
        snooze_until TIMESTAMP
        WITH
            TIME ZONE DEFAULT NULL
    );

CREATE INDEX idx_emails_from ON emails (from_address);

CREATE INDEX idx_emails_to ON emails (to_address);

CREATE INDEX idx_emails_status ON emails (status);