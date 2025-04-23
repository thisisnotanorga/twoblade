CREATE TABLE domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    server_ip VARCHAR(45) NOT NULL,
    server_port INTEGER NOT NULL DEFAULT 5000,
    owner_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 5000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, host)
);

CREATE TABLE emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_address VARCHAR(255) NOT NULL,     -- format: user@domain
    from_domain VARCHAR(255) NOT NULL,      -- extracted domain
    to_address VARCHAR(255) NOT NULL,       -- format: user@domain
    to_domain VARCHAR(255) NOT NULL,        -- extracted domain
    subject TEXT,
    body TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',   -- pending, delivered, failed
    error_message TEXT,
    FOREIGN KEY (from_domain) REFERENCES domains(domain_name),
    FOREIGN KEY (to_domain) REFERENCES domains(domain_name)
);

CREATE INDEX idx_emails_from ON emails(from_address);
CREATE INDEX idx_emails_to ON emails(to_address);
CREATE INDEX idx_emails_status ON emails(status);

CREATE VIEW email_routing AS
SELECT 
    e.id,
    e.from_address,
    e.to_address,
    e.subject,
    e.status,
    fd.server_ip as from_server_ip,
    fd.server_port as from_server_port,
    td.server_ip as to_server_ip,
    td.server_port as to_server_port
FROM emails e
JOIN domains fd ON e.from_domain = fd.domain_name
JOIN domains td ON e.to_domain = td.domain_name;