const db = require('../db/db');
const crypto = require('crypto');

// Encryption key and IV (should be stored securely in env variables in production)
const ENCRYPTION_KEY = process.env.CHAT_ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes for aes-256
const IV = process.env.CHAT_ENCRYPTION_IV || '1234567890123456'; // 16 bytes for aes-256-cbc

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(IV));
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(text) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(IV));
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GET chat history between two users
exports.getChat = async (req, res) => {
  const userId = req.user_id;
  const otherUserId = req.params.userId;
  const sql = `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY time ASC`;
  console.log('getChat called:', { userId, otherUserId });
  try {
    const [results] = await db.query(sql, [userId, otherUserId, otherUserId, userId]);
    // Decrypt messages before sending to client
    const decryptedResults = results.map(msg => {
      let decryptedMsg = msg.message;
      try {
        decryptedMsg = msg.message ? decrypt(msg.message) : '';
      } catch (e) {
        // If decryption fails, return the original message (for old plain text)
        decryptedMsg = msg.message;
      }
      return {
        ...msg,
        message: decryptedMsg
      };
    });
    res.json({ messages: decryptedResults });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching chat', error: err.message });
  }
};


exports.sendMessage = async (req, res) => {
  const userId = req.user_id;
  const { to, message } = req.body;

  console.log('sendMessage called:', { userId, to, message });

  res.on('finish', () => {
    console.log('Response sent for sendMessage');
  });

  if (!to || !message) {
    console.log('Missing required fields');
    return res.status(400).json({ msg: 'Missing fields' });
  }

  // Encrypt the message before storing
  const encryptedMessage = encrypt(message);

  const sql = `INSERT INTO messages (sender_id, receiver_id, message, time) VALUES (?, ?, ?, NOW())`;
  console.log('Running query...');

  try {
    const [result] = await db.query(sql, [userId, to, encryptedMessage]);
    console.log('Query success, inserted ID:', result.insertId);
    res.status(200).json({ success: true, messageId: result.insertId , sender_id: userId, receiver_id: to });
  } catch (err) {
    console.error('Query error:', err.message);
    res.status(500).json({ msg: 'DB error', error: err.message });
  }
};

