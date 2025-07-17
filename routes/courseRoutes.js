const express = require('express');

const authMiddleware = require('../utils/authValidation');
const { courseCreate, getCourse, deleteCourse, updateCourse, lessionCreate, getLession, deletelession, updatelession, createTopic, updateTopic, getTopic, deleteTopic } = require('../controller/courseController');
const { uploadPPT, validatePPTFiles, uploadCourseImage } = require('../utils/validation');

const router = express.Router();


router.post('/course', authMiddleware,uploadCourseImage, courseCreate);
router.get(['/course', '/course/:id'], getCourse);
router.delete('/course/:id',deleteCourse)
router.patch('/course/:id', authMiddleware,uploadCourseImage ,updateCourse); 

router.post('/lession', authMiddleware, lessionCreate);
router.get(['/lession', '/lession/:id'], getLession);
router.delete('/lession/:id',deletelession)
router.patch('/lession/:id', authMiddleware ,updatelession); 

router.post(
    '/topic',
    uploadPPT,
    validatePPTFiles,
    createTopic
);
router.patch(
    '/topic/:id',
    uploadPPT,
    validatePPTFiles,
    updateTopic
);

router.get(['/topic', '/topic/:id'], getTopic);
router.delete('/topic/:id',deleteTopic)

module.exports = router;