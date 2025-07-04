const express = require('express');

const authMiddleware = require('../utils/authValidation');
const { createEvent, updateEvent, deleteEvent, getEvents, registerEvent } = require('../controller/eventController');


const router = express.Router();


router.post('/event',authMiddleware, createEvent);
router.get(['/event', '/event/:id'], getEvents);
router.delete('/event/:id',deleteEvent)
router.patch('/event/:id', authMiddleware ,updateEvent); 
router.post('/register-event', authMiddleware, registerEvent); 


module.exports = router;