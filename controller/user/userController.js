const db = require('../../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const TABLES = require('../../utils/tables'); 
const { isValidGmail, isValidPhone, isValidPassword, uploadImage } = require('../../utils/validation');
const JWT_SECRET = process.env.JWT_SECRET_KEY; // .

const register = async (req, res) => {
    try {
        let { username, email, phone, password, job_title, company_name, timezone, language, headline, tag_id, post_id, comment_id, rewards_id, save_id, que1, que2 } = req.body || {};

        // Add que1 and que2 to required fields check
        if (!username || !email || !password || !que1 || !que2) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        if (!isValidGmail(email)) {
            return res.status(400).json({ msg: 'Only @gmail.com emails are allowed' });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({ msg: 'Phone number must be exactly 10 digits' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters and include a letter, a number, and a special character' });
        }

        // Check if user exists
        const [results] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
        if (results.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let profilePhotoUrl = '';
        if (req.file) {
            const host = req.protocol + '://' + req.get('host');
            profilePhotoUrl = `${host}/uploads/${req.file.filename}`;
        }

        // Handle tag_id as CSV string if array
        if (Array.isArray(tag_id)) tag_id = tag_id.join(',');
        if (tag_id === undefined || tag_id === '' || tag_id === null) tag_id = null;
        if (post_id === undefined || post_id === '' || post_id === null) post_id = null;
        if (comment_id === undefined || comment_id === '' || comment_id === null) comment_id = null;
        if (rewards_id === undefined || rewards_id === '' || rewards_id === null) rewards_id = null;
        if (save_id === undefined || save_id === '' || save_id === null) save_id = null;


        const sql = `INSERT INTO ${TABLES.USER_TABLE} (username, email, phone, password, job_title, company_name, profile_photo, timezone, language, headline, tag_id, post_id, comment_id, rewards_id, save_id, que1, que2)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // 17 columns, 17 placeholders
        const [result] = await db.query(sql, [username, email, phone, hashedPassword, job_title, company_name, profilePhotoUrl, timezone, language, headline, tag_id, post_id, comment_id, rewards_id, save_id, que1, que2]);
        const user = {
            id: result.insertId,
            username,
            email,
            phone,
            job_title,
            company_name,
            profile_photo: profilePhotoUrl,
            timezone,
            language,
            headline,
            tag_id,
            post_id,
            comment_id,
            rewards_id,
            save_id,
            que1,
            que2
        };
        res.status(201).json({ msg: 'User registered successfully', user });
    } catch (error) {
        console.error('Error in Registration:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
        if (users.length === 0) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '10h' }
        );

        res.status(200).json({
            msg: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                job_title: user.job_title,
                company_name: user.company_name,
                profile_photo: user.profile_photo,
                timezone: user.timezone,
                language: user.language,
                headline: user.headline,
                tag_id: user.tag_id,
                que1: user.que1,
                que2: user.que2,
            }
        });
    } catch (error) {
        console.error('Error in Login:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const getUsers = async (req, res) => {
    try {
        const userId = req.params.id;
        let sql, params;

        if (userId) {
            sql = 'SELECT * FROM cusp_user WHERE id = ? AND status = 1';
            params = [userId];
        } else {
            sql = 'SELECT * FROM cusp_user WHERE status = 1';
            params = [];
        }

        const [users] = await db.query(sql, params);

        if (userId && users.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json(userId ? users[0] : users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ msg: 'User ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE id = ? AND status = 1`, [userId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.USER_TABLE} SET status = 0 WHERE id = ?`, [userId]);
        res.status(200).json({ msg: 'User deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.user_id;
        let { username, email, phone, job_title, company_name, timezone, language, headline, tag_id, post_id, comment_id, rewards_id , save_id, que1, que2 } = req.body || {};

        // Get current user
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE id = ?`, [userId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const currentUser = users[0];

        // Email validation & uniqueness (excluding self)
        if (email && email !== currentUser.email) {
            if (!isValidGmail(email)) {
                return res.status(400).json({ msg: 'Only @gmail.com emails are allowed' });
            }
            const [emailUsers] = await db.query(`SELECT id FROM ${TABLES.USER_TABLE} WHERE email = ? AND id != ?`, [email, userId]);
            if (emailUsers.length > 0) {
                return res.status(400).json({ msg: 'Email already exists' });
            }
        }

        // Phone validation & uniqueness (excluding self)
        if (phone && phone !== currentUser.phone) {
            if (!isValidPhone(phone)) {
                return res.status(400).json({ msg: 'Phone number must be exactly 10 digits' });
            }
            const [phoneUsers] = await db.query(`SELECT id FROM ${TABLES.USER_TABLE} WHERE phone = ? AND id != ?`, [phone, userId]);
            if (phoneUsers.length > 0) {
                return res.status(400).json({ msg: 'Phone number already exists' });
            }
        }

        if (username && username !== currentUser.username) {
            const [usernameUsers] = await db.query(`SELECT id FROM ${TABLES.USER_TABLE} WHERE username = ? AND id != ?`, [username, userId]);
            if (usernameUsers.length > 0) {
                return res.status(400).json({ msg: 'Username already exists' });
            }
        }

        let profilePhotoUrl = currentUser.profile_photo;
        if (req.file) {
            const host = req.protocol + '://' + req.get('host');
            profilePhotoUrl = `${host}/uploads/${req.file.filename}`;
        }

        // Handle tag_id as CSV string if array
        if (Array.isArray(tag_id)) tag_id = tag_id.join(',');
        if (tag_id === undefined || tag_id === '' || tag_id === null) tag_id = null;
        if (post_id === undefined || post_id === '' || post_id === null) post_id = null;
        if (comment_id === undefined || comment_id === '' || comment_id === null) comment_id = null;
        if (rewards_id === undefined || rewards_id === '' || rewards_id === null) rewards_id = null;
        if (save_id === undefined || save_id === '' || save_id === null) save_id = null;

        const updatedFields = {
            username: username || currentUser.username,
            email: email || currentUser.email,
            phone: phone || currentUser.phone,
            job_title: job_title || currentUser.job_title,
            company_name: company_name || currentUser.company_name,
            timezone: timezone || currentUser.timezone,
            language: language || currentUser.language,
            headline: headline || currentUser.headline,
            profile_photo: profilePhotoUrl,
            tag_id: tag_id || currentUser.tag_id,
            post_id: post_id || currentUser.post_id,
            comment_id: comment_id || currentUser.comment_id,
            rewards_id: rewards_id || currentUser.rewards_id,
            save_id: save_id || currentUser.save_id,
            que1: que1 || currentUser.que1,
            que2: que2 || currentUser.que2
        };

        await db.query(
            `UPDATE ${TABLES.USER_TABLE} SET username=?, email=?, phone=?, job_title=?, company_name=?, timezone=?, language=?, headline=?, profile_photo=?, tag_id=?, post_id=?, comment_id=?, rewards_id=?,save_id=?, que1=?, que2=?, updated_at=NOW() WHERE id=?`,
            [
                updatedFields.username,
                updatedFields.email,
                updatedFields.phone,
                updatedFields.job_title,
                updatedFields.company_name,
                updatedFields.timezone,
                updatedFields.language,
                updatedFields.headline,
                updatedFields.profile_photo,
                updatedFields.tag_id,
                updatedFields.post_id,
                updatedFields.comment_id,
                updatedFields.rewards_id,
                updatedFields.save_id,
                updatedFields.que1,
                updatedFields.que2,
                userId
            ]
        );

        res.status(200).json({ msg: 'User updated successfully', user: updatedFields });
    } catch (error) {
        console.error('Error in update:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const forgotPassword = async (req, res) => {
 try {
    const { email } = req.body;
    if (!email){
        return res.status(400).json({ error: 'Email is required', status: false });
    }
    if (!isValidGmail(email)) {
        return res.status(400).json({ error: 'Only @gmail.com emails are allowed', status: false });
    }
    const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
    if (users.length === 0) {
        return res.status(404).json({ error: 'User not found', status: false });
    }
    const user = users[0];
    const otp = Math.floor(100000 + Math.random() * 900000); 
    const expiry = new Date(Date.now() + 15 * 60 * 1000); 
    await db.query(`UPDATE ${TABLES.USER_TABLE} SET otp = ?, otp_expiry = ? WHERE id = ?`, [otp, expiry, user.id]);

    return res.status(200).json({ message: 'OTP sent successfully', otp, status
: true });
    
 } catch (error) {
    return res.status(500).json({ error: 'Server error', status: false });
    
 }
};

const changePassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ msg: 'Email, OTP, and new password are required' });
        }
        if (!isValidGmail(email)) {
            return res.status(400).json({ msg: 'Only @gmail.com emails are allowed' });
        }
        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters and include a letter, a number, and a special character' });
        }
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const user = users[0];
        if (String(user.otp) !== String(otp) || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
 
    await db.query(`UPDATE ${TABLES.USER_TABLE} SET password = ?, otp = NULL, otp_expiry = NULL WHERE id = ?`, [hashedPassword, user.id]);
            
        res.status(200).json({ msg: 'Password changed successfully' });

        
    } catch (error) {
        console.error('Error in changePassword:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
        
    }
}




module.exports = { register, login, uploadImage, getUsers, deleteUser, updateUser , forgotPassword ,changePassword};