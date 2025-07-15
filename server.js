require('dotenv').config();
require('./db/db');
require('./utils/passport');
const express = require('express');
const session = require('express-session'); 
const passport = require('passport');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');



const app = express();
const http = require('http').createServer(app);

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using HTTPS
}));

// 🔸 Initialize passport session
app.use(passport.initialize());
app.use(passport.session());


const { Server } = require('socket.io');
const port = process.env.PORT || 3000;
const chatController = require('./controller/chatController');
const chatSocket = require('./websocket/chatSocket'); // <-- yahan import karein


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
app.use('/api/auth', require('./routes/authRoutes'));

app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ msg: 'Internal ser Server Error', error: err.message });
});





const io = new Server(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
chatController.setSocketIoInstance(io);

// Saara socket logic yahan se hata kar:
chatSocket(io); // <-- yahan call karein

http.listen(port, () => {
  console.log(`Server running on ${process.env.PUBLIC_API_URL}`);
});

