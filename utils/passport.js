const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db/db');
const TABLES = require('./tables');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.PUBLIC_API_URL}/api/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Use USER_TABLE for user storage
    const [rows] = await pool.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE google_id = ?`, [profile.id]);
    let user;
    if (rows.length > 0) {
      user = rows[0];
    } else {
      // Insert new user into USER_TABLE
      const [result] = await pool.query(
        `INSERT INTO ${TABLES.USER_TABLE} (google_id, email, username, profile_photo) VALUES (?, ?, ?, ?)`,
        [profile.id, profile.emails[0].value, profile.displayName, profile.photos[0]?.value || null]
      );
      user = { id: result.insertId, google_id: profile.id, email: profile.emails[0].value, username: profile.displayName, profile_photo: profile.photos[0]?.value || null };
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));
