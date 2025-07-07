const express = require('express');
const router = express.Router();
const { directoryCreate, updateDirectory, deleteDirectory, getDirectory } = require('../controller/directoryController');
const authMiddleware = require('../utils/authValidation');
const { uploadDirectoryPhoto, validateDirectoryPhoto } = require('../utils/validation');

router.post('/directory', uploadDirectoryPhoto, validateDirectoryPhoto,authMiddleware, directoryCreate);
router.patch('/directory/:id', uploadDirectoryPhoto, validateDirectoryPhoto, authMiddleware, updateDirectory);
router.delete('/directory/:id',deleteDirectory)
router.get(['/directory', '/directory/:id'], getDirectory);

module.exports = router;

