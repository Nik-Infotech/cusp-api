const express = require('express');

const authMiddleware = require('../utils/authValidation');
const { createDocument, updateDocument, deleteDocuments, getDocuments } = require('../controller/documentsController');
const { uploadDocuments, validateDocuments } = require('../utils/validation');

const router = express.Router();


router.post('/documents', authMiddleware,uploadDocuments,validateDocuments, createDocument);
router.get(['/documents', '/documents/:id'], getDocuments);
router.delete('/documents/:id',deleteDocuments)
router.patch('/documents/:id', authMiddleware ,uploadDocuments,validateDocuments, updateDocument); 



module.exports = router;