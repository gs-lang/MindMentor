const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Assumes `pool` is passed via app.locals or injected
function createAuthRoutes(pool) {
  // Register
  router.post('/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Check if user exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, subscription_tier, created_at`,
        [email.toLowerCase(), passwordHash, displayName || null]
      );

      const user = result.rows[0];

      // Set session
      req.session.userId = user.id;

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          subscriptionTier: user.subscription_tier,
        },
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await pool.query(
        'SELECT id, email, password_hash, display_name, subscription_tier FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      req.session.userId = user.id;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          subscriptionTier: user.subscription_tier,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  });

  // Get current user
  router.get('/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const result = await pool.query(
        'SELECT id, email, display_name, subscription_tier, created_at FROM users WHERE id = $1',
        [req.session.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          subscriptionTier: user.subscription_tier,
        },
      });
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  return router;
}

module.exports = { createAuthRoutes };
