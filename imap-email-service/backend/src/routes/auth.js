import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { prefix, password } = req.body;

    if (!prefix || !password) {
      return res.status(400).json({ error: 'Prefix and password are required' });
    }

    // Find prefix in database
    const prefixData = db.prepare('SELECT * FROM prefixes WHERE prefix = ?').get(prefix.toLowerCase());

    if (!prefixData) {
      return res.status(401).json({ error: 'Invalid prefix or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, prefixData.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid prefix or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { prefix: prefixData.prefix },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      prefix: prefixData.prefix,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, prefix: req.user.prefix });
});

export default router;
