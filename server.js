require('dotenv').config();
require('./db/db');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');


const app = express();
const port = process.env.PORT || 3000;

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
app.use('/api', require('./routes/eventRoutes'))
app.use('/api', require('./routes/directoryRoutes'));

app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ msg: 'Internal ser Server Error', error: err.message });
});


app.listen(port, () => {
  console.log(`Server running on ${process.env.PUBLIC_API_URL}`);
});

