import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get emails for authenticated prefix
router.get('/', authenticateToken, (req, res) => {
  try {
    const { prefix } = req.user;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM emails WHERE prefix = ?');
    const { total } = countStmt.get(prefix);

    // Get emails
    const stmt = db.prepare(`
      SELECT 
        id, message_id, from_address, to_address, subject, 
        body_text, body_html, received_date, is_read, attachments
      FROM emails 
      WHERE prefix = ? 
      ORDER BY received_date DESC 
      LIMIT ? OFFSET ?
    `);

    const emails = stmt.all(prefix, parseInt(limit), offset);

    // Parse attachments JSON
    emails.forEach(email => {
      try {
        email.attachments = JSON.parse(email.attachments || '[]');
      } catch (e) {
        email.attachments = [];
      }
    });

    res.json({
      emails,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single email
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { prefix } = req.user;
    const { id } = req.params;

    const stmt = db.prepare(`
      SELECT * FROM emails 
      WHERE id = ? AND prefix = ?
    `);

    const email = stmt.get(id, prefix);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Parse attachments
    try {
      email.attachments = JSON.parse(email.attachments || '[]');
    } catch (e) {
      email.attachments = [];
    }

    // Mark as read
    db.prepare('UPDATE emails SET is_read = 1 WHERE id = ?').run(id);

    res.json(email);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark email as read/unread
router.patch('/:id/read', authenticateToken, (req, res) => {
  try {
    const { prefix } = req.user;
    const { id } = req.params;
    const { isRead } = req.body;

    // Verify email belongs to user's prefix
    const email = db.prepare('SELECT * FROM emails WHERE id = ? AND prefix = ?').get(id, prefix);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    db.prepare('UPDATE emails SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete email
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { prefix } = req.user;
    const { id } = req.params;

    // Verify email belongs to user's prefix
    const email = db.prepare('SELECT * FROM emails WHERE id = ? AND prefix = ?').get(id, prefix);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    db.prepare('DELETE FROM emails WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
