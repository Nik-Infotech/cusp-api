const express = require('express');
const router = express.Router();
const { createPost, getPost, deletePost, updatePost, updatePostUpload } = require("../controller/postController");
const authMiddleware = require("../utils/authValidation");
const { uploadPostMedia, validatePostMediaFiles, uploadSinglePostMedia, validateSinglePostMediaFile } = require("../utils/validation");

router.post(
    '/post',
    authMiddleware,
    uploadPostMedia,
    validatePostMediaFiles,
    createPost
);

router.get(['/post', '/post/:id'], getPost);
router.delete('/post/:id', deletePost);
router.patch(
  '/post/:id',
  authMiddleware,
  uploadPostMedia,
  validatePostMediaFiles,
  updatePost
);
// router.patch(
//     '/post-upload/:id',
//     authMiddleware,
//     uploadSinglePostMedia,
//     validateSinglePostMediaFile,
//     updatePostUpload
// );

module.exports = router;