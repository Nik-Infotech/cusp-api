const express = require('express');
const router = express.Router();
const passport = require('passport');

// 🔹 1. Start Google OAuth flow
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// 🔹 2. Handle callback after Google authenticates user (custom callback)
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', async (err, user, info) => {
    if (err) {
      console.error('Google login error:', err);
      return res.status(500).json({ msg: 'Google login failed', error: err.message });
    }
    if (!user) {
      return res.status(401).json({ msg: 'No user returned from Google' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {D
        console.error('Login session error:', loginErr);
        return res.status(500).json({ msg: 'Login session failed' });
      }

      console.log('User info:', user); 
      return res.json({
        msg: 'Google login successful',
        user
      });
    });
  })(req, res, next);
});

module.exports = router;
