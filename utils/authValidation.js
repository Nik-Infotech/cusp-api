require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
console.log('JWT_SECRET_KEY:', JWT_SECRET_KEY);

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token from header:', token);
    if (!token) {
        return res.status(401).json({ message: 'No token provided', status: 'error' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY); 
        req.user_id = decoded.id || decoded.data?.id;

        console.log('Decoded JWT:', decoded);
        next();
    } catch (error) {
        console.log('JWT Verify Error:', error); 
        return res.status(401).json({ message: 'Invalid token', status: 'error' });
    }
};

module.exports = authMiddleware;