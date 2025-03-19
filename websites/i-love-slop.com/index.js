// server.js
import express from 'express';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(express.json());

// Constants
const INITIAL_SCORE = 10;
const REFERRAL_BONUS = 25;
const REFERRED_BONUS = 15;

// Serve static files from the public directory, except index.html
app.use(express.static(path.join(__dirname, 'public'), {
  index: false  // Don't serve index.html automatically
}));

// Setup SQLite
const db = new sqlite3.Database('waitlist.db', (err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to database');
    
    // Create table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        referral_code TEXT UNIQUE,
        score INTEGER DEFAULT ${INITIAL_SCORE},
        referred_by TEXT,
        username TEXT UNIQUE
      )
    `);
  }
});

// Endpoints
app.get('/leaderboard', (req, res) => {
  db.all(`
    SELECT username, score 
    FROM users 
    ORDER BY score DESC 
    LIMIT 10
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(rows);
  });
});

app.post('/join', (req, res) => {
  const { email, referralCode } = req.body;
  
  if (!email) return res.status(400).json({ error: 'Email required' });

  // First check if user already exists
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    
    if (existingUser) {
      return res.status(409).json({ 
        email: existingUser.email,
        username: existingUser.username,
        referralCode: existingUser.referral_code,
        score: existingUser.score,
        shareLink: `https://i-love-slop.com?ref=${existingUser.referral_code}`
      });
    }

    const username = email.split('@')[0] + '#' + Math.random().toString(36).slice(-4);
    const userReferralCode = Math.random().toString(36).slice(-6).toUpperCase();

    db.serialize(() => {
      if (referralCode) {
        db.get('SELECT email FROM users WHERE referral_code = ?', [referralCode], (err, referrer) => {
          if (referrer) {
            // Add bonus to referrer
            db.run('UPDATE users SET score = score + ? WHERE email = ?', 
              [REFERRAL_BONUS, referrer.email]);
            
            // Add new user with bonus
            db.run(`
              INSERT INTO users (email, username, referral_code, score, referred_by) 
              VALUES (?, ?, ?, ?, ?)`,
              [email, username, userReferralCode, INITIAL_SCORE + REFERRED_BONUS, referrer.email]
            );
          } else {
            // Invalid referral code, just add user without bonus
            db.run(`
              INSERT INTO users (email, username, referral_code, score) 
              VALUES (?, ?, ?, ?)`,
              [email, username, userReferralCode, INITIAL_SCORE]
            );
          }
        });
      } else {
        // No referral code, add user with base score
        db.run(`
          INSERT INTO users (email, username, referral_code, score) 
          VALUES (?, ?, ?, ?)`,
          [email, username, userReferralCode, INITIAL_SCORE]
        );
      }
    });

    res.json({ 
      email,
      username,
      referralCode: userReferralCode,
      score: INITIAL_SCORE + (referralCode ? REFERRED_BONUS : 0),
      shareLink: `https://i-love-slop.com?ref=${userReferralCode}`
    });
  });
});

// Get user data
app.get('/user/:email', (req, res) => {
  const { email } = req.params;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      email: user.email,
      username: user.username,
      referralCode: user.referral_code,
      score: user.score
    });
  });
});

// Serve the HTML with constants injected
app.get('/', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading page');
    }
    
    // Replace placeholder constants with actual values
    const html = data
      .replace(/INITIAL_SCORE_PLACEHOLDER/g, INITIAL_SCORE)
      .replace(/REFERRAL_BONUS_PLACEHOLDER/g, REFERRAL_BONUS)
      .replace(/REFERRED_BONUS_PLACEHOLDER/g, REFERRED_BONUS);
    
    res.send(html);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});