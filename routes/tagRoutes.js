const express = require('express');

const authMiddleware = require('../utils/authValidation');
const { tagCreate, getTags, deleteTag, updateTag } = require('../controller/tagController');
const {submitPractice, getsubmitPractice} = require('../controller/calculatorController');

const router = express.Router();


router.post('/tag', tagCreate);
router.get(['/tags', '/tags/:id'], getTags);
router.delete('/tags/:id',deleteTag)
router.patch('/tags/:id', authMiddleware ,updateTag); 

router.post('/calculator',submitPractice)
router.get(['/calculator', '/calculator/:id'],getsubmitPractice);



module.exports = router;