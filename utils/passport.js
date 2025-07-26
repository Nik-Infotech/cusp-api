const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db/db');
const TABLES = require('./tables');

// ✅ Log environment variables to debug (REMOVE in production)
console.log('🔐 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('🔐 PUBLIC_API_URL:', process.env.PUBLIC_API_URL);

// ✅ Check for missing environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.PUBLIC_API_URL) {
  throw new Error('Google OAuth environment variables are not properly set.');
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.PUBLIC_API_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    const [rows] = await pool.query(
      `SELECT * FROM ${TABLES.USER_TABLE} WHERE google_id = ?`,
      [profile.id]
    );

    let user;

    if (rows.length > 0) {
      user = rows[0];
    } else {
      // Insert new user
      const [result] = await pool.query(
        `INSERT INTO ${TABLES.USER_TABLE} (google_id, email, username, profile_photo) VALUES (?, ?, ?, ?)`,
        [
          profile.id,
          profile.emails?.[0]?.value || null,
          profile.displayName || null,
          profile.photos?.[0]?.value || null
        ]
      );

      user = {
        id: result.insertId,
        google_id: profile.id,
        email: profile.emails?.[0]?.value || null,
        username: profile.displayName || null,
        profile_photo: profile.photos?.[0]?.value || null
      };
    }

    return done(null, user);

  } catch (error) {
    console.error('❌ Error in GoogleStrategy:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, { id });
});
