const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const authValidation = require('../utils/authValidation');
const authMiddleware = require('../utils/authValidation');


// Get chat history with a user
router.get('/chat/:userId', authMiddleware, chatController.getChat);
// Send a message
router.post('/chat/send', authMiddleware, chatController.sendMessage);

module.exports = router;
