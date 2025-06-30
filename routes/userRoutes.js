const express = require('express');
const { register, login, getUsers, deleteUser, updateUser, forgotPassword, changePassword } = require('../controller/user/userController');
const authMiddleware = require('../utils/authValidation');
const { uploadImage } = require('../utils/validation');
const router = express.Router();

// Register route
router.post('/register', uploadImage.single('profile_photo'), register);
router.post('/login', login);
router.get(['/users', '/users/:id'], getUsers);
router.delete('/users/:id',deleteUser);
router.patch('/users/update', authMiddleware, uploadImage.single('profile_photo'), updateUser);
router.post('/users/forgot-password',forgotPassword);
router.put('/users/change-password', changePassword); 


module.exports = router;