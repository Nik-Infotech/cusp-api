const path = require('path');
const multer = require('multer');
const fs = require('fs');

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Email validation: only allow @gmail.com
function isValidGmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return emailRegex.test(email);
}

// Phone validation: only 10 digits, no chars allowed
function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

// Password validation: min 6 chars, at least 1 special char, 1 digit, 1 letter
function isValidPassword(password) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    return passwordRegex.test(password);
}

// Image validation: only allow jpg, jpeg, png
function isValidImage(mimetype) {
    return ['image/jpeg', 'image/png', 'image/jpg'].includes(mimetype);
}

// Multer storage config (for uploads folder)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

// Multer upload middleware (only images)
const uploadImage = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (isValidImage(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only jpg, jpeg, png images are allowed'));
        }
    }
});

module.exports = {
    isValidGmail,
    isValidPhone,
    isValidPassword,
    isValidImage,
    uploadImage // export this for reuse
};