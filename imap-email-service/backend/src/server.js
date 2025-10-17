import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import adminRoutes from './routes/admin.js';
import { initDatabase } from './db/database.js';
import { fetchEmails } from './services/imapService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IMAP Email Service is running' });
});

// Fetch emails every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  console.log('Fetching emails from IMAP server...');
  try {
    await fetchEmails();
    console.log('Email fetch completed');
  } catch (error) {
    console.error('Error fetching emails:', error);
  }
});

// Initial email fetch on startup
setTimeout(async () => {
  console.log('Performing initial email fetch...');
  try {
    await fetchEmails();
    console.log('Initial email fetch completed');
  } catch (error) {
    console.error('Error in initial email fetch:', error);
  }
}, 5000);

app.listen(PORT, () => {
  console.log(`IMAP Email Service backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
