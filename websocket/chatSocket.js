const authValidation = require('../utils/authValidation');
let onlineUsers = {};

module.exports = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
      if (!token) return next(new Error('Authentication token required'));
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

  io.on('connection', (socket) => {
    const user = socket.user;
    onlineUsers[user._id] = socket.id;
    io.emit('onlineUsers', Object.keys(onlineUsers));

    socket.on('chatMessage', ({ to, message }) => {
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
};