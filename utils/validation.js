
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Multer storage config (for uploads folder)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});

// Multer upload middleware for directory photo (single image, max 1 file, max 5MB)
const uploadDirectoryPhoto = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (isValidImage(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for directory photo'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single('p_photo');

const uploadToolsPhoto = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (isValidImage(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for directory photo'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single('img_url');


function validateDirectoryPhoto(req, res, next) {
    if (!req.file) {
        return res.status(400).json({ msg: 'Directory photo is required' });
    }
    if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ msg: 'Directory photo must be <= 5MB' });
    }
    next();
}

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

// Accept any image type for images, and common video types
function isValidImage(mimetype) {
    return mimetype.startsWith('image/');
}
function isValidVideo(mimetype) {
    return mimetype.startsWith('video/');
}



function fileFilter(req, file, cb) {
    if (isValidImage(file.mimetype) || isValidVideo(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed'));
    }
}

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

const uploadPostMedia = multer({
    storage,
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB max for any file, will check type below
}).fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 }
]);

function validatePostMediaFiles(req, res, next) {
    const images = req.files?.images || [];
    const videos = req.files?.videos || [];

    for (const img of images) {
        if (img.size > 5 * 1024 * 1024) {
            return res.status(400).json({ msg: 'Each image must be <= 5MB' });
        }
    }
    for (const vid of videos) {
        if (vid.size > 15 * 1024 * 1024) {
            return res.status(400).json({ msg: 'Each video must be <= 15MB' });
        }
    }
    next();
}

const uploadSinglePostMedia = multer({
    storage,
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
}).fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

function validateSinglePostMediaFile(req, res, next) {
    if (req.files?.image) {
        if (req.files.image[0].size > 5 * 1024 * 1024) {
            return res.status(400).json({ msg: 'Image must be <= 5MB' });
        }
    }
    if (req.files?.video) {
        if (req.files.video[0].size > 15 * 1024 * 1024) {
            return res.status(400).json({ msg: 'Video must be <= 15MB' });
        }
    }
    next();
}

module.exports = {
    isValidGmail,
    isValidPhone,
    isValidPassword,
    isValidImage,
    uploadImage,
    uploadPostMedia,
    validatePostMediaFiles,
    uploadSinglePostMedia,
    validateSinglePostMediaFile
    ,uploadDirectoryPhoto
    ,validateDirectoryPhoto,
    uploadToolsPhoto
};