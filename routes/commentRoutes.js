const express = require('express');
const router = express.Router();

const authMiddleware = require("../utils/authValidation");
const { createComment, deleteComment, getComments, createReply, deleteReply, getReplies, likePost } = require('../controller/commentController');

router.post('/comment', authMiddleware, createComment  );
router.get(['/comment', '/comment/:id', '/comment/post-id/:id'], getComments);

router.delete('/comment/:id',deleteComment)
router.delete('/reply/:id',deleteReply)

router.post('/reply', authMiddleware, createReply);
router.get('/commentreply/:id', getReplies);
router.patch('/like-status',authMiddleware,likePost)


module.exports = router;