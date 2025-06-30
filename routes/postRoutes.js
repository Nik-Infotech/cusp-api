const express = require('express');
const router = express.Router();
const { createPost } = require("../controller/postController");
const authMiddleware = require("../utils/authValidation");

router.post('/posts', authMiddleware, createPost);


module.exports = router;