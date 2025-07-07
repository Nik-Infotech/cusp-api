const express = require('express');

const authMiddleware = require('../utils/authValidation');
const { courseCreate, getCourse, deleteCourse, updateCourse, lessionCreate, getLession, deletelession, updatelession } = require('../controller/courseController');

const router = express.Router();


router.post('/course', authMiddleware, courseCreate);
router.get(['/course', '/course/:id'], getCourse);
router.delete('/course/:id',deleteCourse)
router.patch('/course/:id', authMiddleware ,updateCourse); 

router.post('/lession', authMiddleware, lessionCreate);
router.get(['/lession', '/lession/:id'], getLession);
router.delete('/lession/:id',deletelession)
router.patch('/lession/:id', authMiddleware ,updatelession); 

module.exports = router;