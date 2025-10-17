import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.user.prefix !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Get all prefixes (admin only)
router.get('/prefixes', authenticateToken, isAdmin, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, prefix, created_at, updated_at 
      FROM prefixes 
      ORDER BY created_at DESC
    `);

    const prefixes = stmt.all();
    res.json(prefixes);
  } catch (error) {
    console.error('Error fetching prefixes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new prefix (admin only)
router.post('/prefixes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { prefix, password } = req.body;

    if (!prefix || !password) {
      return res.status(400).json({ error: 'Prefix and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if prefix already exists
    const existing = db.prepare('SELECT * FROM prefixes WHERE prefix = ?').get(prefix.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Prefix already exists' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert prefix
    const stmt = db.prepare('INSERT INTO prefixes (prefix, password_hash) VALUES (?, ?)');
    const result = stmt.run(prefix.toLowerCase(), hash);

    res.status(201).json({
      id: result.lastInsertRowid,
      prefix: prefix.toLowerCase(),
      message: 'Prefix created successfully'
    });
  } catch (error) {
    console.error('Error creating prefix:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update prefix password (admin only)
router.put('/prefixes/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Update password
    const stmt = db.prepare('UPDATE prefixes SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(hash, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prefix not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating prefix:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete prefix (admin only)
router.delete('/prefixes/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting admin prefix
    const prefix = db.prepare('SELECT * FROM prefixes WHERE id = ?').get(id);
    if (prefix && prefix.prefix === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin prefix' });
    }

    const stmt = db.prepare('DELETE FROM prefixes WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prefix not found' });
    }

    res.json({ message: 'Prefix deleted successfully' });
  } catch (error) {
    console.error('Error deleting prefix:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics (admin only)
router.get('/stats', authenticateToken, isAdmin, (req, res) => {
  try {
    const prefixCount = db.prepare('SELECT COUNT(*) as count FROM prefixes').get();
    const emailCount = db.prepare('SELECT COUNT(*) as count FROM emails').get();
    const emailsByPrefix = db.prepare(`
      SELECT prefix, COUNT(*) as count 
      FROM emails 
      GROUP BY prefix 
      ORDER BY count DESC
    `).all();

    res.json({
      totalPrefixes: prefixCount.count,
      totalEmails: emailCount.count,
      emailsByPrefix
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
