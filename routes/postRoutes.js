const express = require('express');
const router = express.Router();
const { createPost, getPost, deletePost, updatePost } = require("../controller/postController");
const authMiddleware = require("../utils/authValidation");

router.post('/post', authMiddleware, createPost);
router.get(['/post', '/post/:id'], getPost);

router.delete('/post/:id',deletePost)
router.patch('/post/:id', authMiddleware ,updatePost); 


module.exports = router;