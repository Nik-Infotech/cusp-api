const db = require('../db/db');
const TABLES = require('../utils/tables');

const createPost = async (req, res) => {
    try {
        const { title, description, tags, likes = 0, comments = 0 } = req.body;
        const user_id = req.user_id; // from auth middleware

        if (!title || !description) {
            return res.status(400).json({ msg: 'Title and description are required' });
        }
        if (!user_id) {
            return res.status(401).json({ msg: 'Unauthorized: user_id missing' });
        }

        // Insert post
        const sql = `INSERT INTO ${TABLES.POST_TABLE} (title, description, user_id, likes, comments) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [title, description, user_id, likes, comments]);

        // Insert tags (optional)
        if (tags && Array.isArray(JSON.parse(tags))) {
            const tagArr = JSON.parse(tags);
            for (const tag_id of tagArr) {
                await db.query(`INSERT INTO ${TABLES.POST_TAG_TABLE} (post_id, tag_id) VALUES (?, ?)`, [result.insertId, tag_id]);
            }
        }

        res.status(201).json({
            msg: 'Post created successfully',
            post: {
                id: result.insertId,
                title,
                description,
                user_id,
                tags: tags ? JSON.parse(tags) : [],
                likes,
                comments
            }
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

module.exports = { createPost };