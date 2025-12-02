-- Add prefix column to email table for catch-all filtering
ALTER TABLE email ADD COLUMN prefix TEXT DEFAULT '' NOT NULL;

-- Create index on prefix for faster filtering
CREATE INDEX idx_email_prefix ON email(prefix);

-- Create index on toEmail for prefix extraction
CREATE INDEX idx_email_to_email ON email(toEmail);

-- Create prefix management table
CREATE TABLE IF NOT EXISTS prefix (
    prefix_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER NOT NULL,
    create_time INTEGER NOT NULL,
    update_time INTEGER NOT NULL,
    last_access_time INTEGER,
    access_count INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for prefix table
CREATE INDEX idx_prefix_active ON prefix(is_active);
CREATE INDEX idx_prefix_access_time ON prefix(last_access_time);

-- Update existing emails to extract prefix from toEmail
UPDATE email 
SET prefix = LOWER(SUBSTR(to_email, 1, INSTR(to_email, '@') - 1))
WHERE to_email != '' AND INSTR(to_email, '@') > 0;