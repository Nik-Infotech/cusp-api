require('dotenv').config();
require('./db/db');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');



const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const port = process.env.PORT || 3000;
const authValidation = require('./utils/authValidation');


app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,PATCH,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  exposedHeaders: 'Content-Length,X-Kuma-Revision',
  credentials: true,
  maxAge: 600
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/', (req, res) => {
  res.send('api working!');
});

app.use('/api', require('./routes/userRoutes'));
app.use('/api', require('./routes/tagRoutes'));
app.use('/api', require('./routes/postRoutes'));
app.use('/api', require('./routes/commentRoutes'));
app.use('/api', require('./routes/eventRoutes'));
app.use('/api', require('./routes/directoryRoutes'));
app.use('/api', require('./routes/courseRoutes'));
app.use('/api', require('./routes/chatRoutes'));

app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ msg: 'Internal ser Server Error', error: err.message });
});



// --- SOCKET.IO CHAT SECTION ---
const io = new Server(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket authentication middleware using your authValidation
io.use(async (socket, next) => {
  try {
    // Accept token from query or headers
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) return next(new Error('Authentication token required'));
    // Use your existing authValidation logic
    const user = await new Promise((resolve, reject) => {
      authValidation(token, (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// In-memory chat (for demo, not persistent)
let onlineUsers = {};

io.on('connection', (socket) => {
  const user = socket.user;
  onlineUsers[user._id] = socket.id;
  io.emit('onlineUsers', Object.keys(onlineUsers));

  socket.on('chatMessage', ({ to, message }) => {
    // Send message to specific user if online
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit('chatMessage', {
        from: user._id,
        message,
        time: new Date()
      });
    }
  });

  socket.on('disconnect', () => {
    delete onlineUsers[user._id];
    io.emit('onlineUsers', Object.keys(onlineUsers));
  });
});

http.listen(port, () => {
  console.log(`Server running on ${process.env.PUBLIC_API_URL}`);
});

