const express = require('express');
const router = express.Router();
const { directoryCreate, updateDirectory, deleteDirectory, getDirectory } = require('../controller/directoryController');
const authMiddleware = require('../utils/authValidation');
const { uploadDirectoryPhoto, validateDirectoryPhoto, uploadToolsPhoto } = require('../utils/validation');
const { getTools, deleteTools, updateTools, toolsCreate } = require('../controller/toolsController');

router.post('/directory', uploadDirectoryPhoto, validateDirectoryPhoto,authMiddleware, directoryCreate);
router.patch('/directory/:id', uploadDirectoryPhoto, validateDirectoryPhoto, authMiddleware, updateDirectory);
router.delete('/directory/:id',deleteDirectory)
router.get(['/directory', '/directory/:id'], getDirectory);

router.post('/tools', uploadToolsPhoto, authMiddleware, toolsCreate);
router.patch('/tools/:id', uploadToolsPhoto, authMiddleware, updateTools);
router.delete('/tools/:id',deleteTools)
router.get(['/tools', '/tools/:id'], getTools);

module.exports = router;

