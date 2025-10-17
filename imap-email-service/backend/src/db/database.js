import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/emails.db');
const db = new Database(dbPath);

export function initDatabase() {
  // Create prefixes table for authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS prefixes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create emails table
  db.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      prefix TEXT NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      subject TEXT,
      body_text TEXT,
      body_html TEXT,
      received_date DATETIME,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0,
      attachments TEXT
    )
  `);

  // Create index on prefix for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_emails_prefix ON emails(prefix);
    CREATE INDEX IF NOT EXISTS idx_emails_received_date ON emails(received_date DESC);
  `);

  console.log('Database initialized successfully');

  // Create default admin prefix if not exists
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const existingPrefix = db.prepare('SELECT * FROM prefixes WHERE prefix = ?').get('admin');
  
  if (!existingPrefix) {
    const hash = bcrypt.hashSync(defaultPassword, 10);
    db.prepare('INSERT INTO prefixes (prefix, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Default admin prefix created with password:', defaultPassword);
  }
}

export default db;
