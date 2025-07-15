const express = require('express');
const router = express.Router();
const { createPost, getPost, deletePost, updatePost, updatePostUpload, savePost, DeleteSavedPost, reportPost, getReports, updateReport } = require("../controller/postController");
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

router.post('/save-post',authMiddleware,savePost);
router.delete('/delete-post',authMiddleware,DeleteSavedPost);

router.post('/report-post',authMiddleware,reportPost);
router.get(['/reports', '/reports/:id'], getReports);
router.patch('/reports/:id', updateReport);



module.exports = router;