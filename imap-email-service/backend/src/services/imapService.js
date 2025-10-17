import Imap from 'imap';
import { simpleParser } from 'mailparser';
import db from '../db/database.js';

function extractPrefix(email) {
  // Extract prefix from email address
  // Supports formats like: prefix+anything@domain.com or prefix@domain.com
  const localPart = email.split('@')[0];
  const prefix = localPart.split('+')[0];
  return prefix.toLowerCase();
}

export async function fetchEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT) || 993,
      tls: process.env.IMAP_TLS === 'true',
      tlsOptions: { rejectUnauthorized: false }
    });

    function openInbox(cb) {
      imap.openBox('INBOX', false, cb);
    }

    imap.once('ready', () => {
      openInbox((err, box) => {
        if (err) {
          console.error('Error opening inbox:', err);
          imap.end();
          return reject(err);
        }

        // Fetch unseen emails
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('Error searching emails:', err);
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log('No new emails');
            imap.end();
            return resolve(0);
          }

          console.log(`Found ${results.length} new emails`);
          const fetch = imap.fetch(results, { bodies: '' });
          let processedCount = 0;

          fetch.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  return;
                }

                try {
                  // Extract recipient email
                  const toAddress = parsed.to?.value?.[0]?.address || parsed.to?.text || '';
                  const prefix = extractPrefix(toAddress);
                  
                  // Check if prefix exists in database
                  const prefixExists = db.prepare('SELECT * FROM prefixes WHERE prefix = ?').get(prefix);
                  
                  if (!prefixExists) {
                    console.log(`No prefix configured for: ${prefix}`);
                    return;
                  }

                  // Prepare attachments data
                  const attachments = parsed.attachments?.map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size
                  })) || [];

                  // Check if email already exists
                  const existing = db.prepare('SELECT id FROM emails WHERE message_id = ?').get(parsed.messageId);
                  
                  if (!existing) {
                    // Insert email into database
                    const stmt = db.prepare(`
                      INSERT INTO emails (
                        message_id, prefix, from_address, to_address, 
                        subject, body_text, body_html, received_date, attachments
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);

                    stmt.run(
                      parsed.messageId || `${Date.now()}-${seqno}`,
                      prefix,
                      parsed.from?.value?.[0]?.address || parsed.from?.text || '',
                      toAddress,
                      parsed.subject || '(No Subject)',
                      parsed.text || '',
                      parsed.html || '',
                      parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                      JSON.stringify(attachments)
                    );

                    processedCount++;
                    console.log(`Saved email for prefix: ${prefix}, subject: ${parsed.subject}`);
                  }
                } catch (error) {
                  console.error('Error saving email to database:', error);
                }
              });
            });
          });

          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            imap.end();
            reject(err);
          });

          fetch.once('end', () => {
            console.log(`Processed ${processedCount} new emails`);
            imap.end();
            resolve(processedCount);
          });
        });
      });
    });

    imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
      reject(err);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended');
    });

    imap.connect();
  });
}
