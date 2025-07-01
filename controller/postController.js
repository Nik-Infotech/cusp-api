const db = require('../db/db');
const { get } = require('../routes/userRoutes');
const TABLES = require('../utils/tables');

const createPost = async (req, res) => {
    try {
        const { title, description, tags = '', likes = 0, comments = 0 } = req.body;
        const user_id = req.user_id;

        if (!title || !description) {
            return res.status(400).json({ msg: 'Title and description are required' });
        }
        if (!user_id) {
            return res.status(401).json({ msg: 'Unauthorized: user_id missing' });
        }
        
        // // post already exists
        // const [existingPosts] = await db.query(`select * from ${TABLES.POST_TABLE} where title = ? and user_id = ?`, [title, user_id]);
        // if (existingPosts.length > 0) {
        //     return res.status(400).json({ msg: 'Post with this title already exist for this user' });

        // }


        const tagsStr = typeof tags === 'string' ? tags : tags.join(',');
        const tagsArray = tagsStr ? tagsStr.split(',') : [];

        const sql = `INSERT INTO ${TABLES.POST_TABLE} (title, description, user_id, tags, likes, comments) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
            title,
            description,
            user_id,
            tagsStr,
            likes,
            comments
        ]);

        res.status(201).json({
            msg: 'Post created successfully',
            post: {
                id: result.insertId,
                title,
                description,
                user_id,
                tags: tagsArray,
                likes,
                comments
            }
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const getPost = async (req, res) => {
    try {
        const postId = req.params.id;
        let sql, params;

        const baseQuery = `
            SELECT 
                p.*,
                u.username,
                u.email,
                u.phone,
                u.company_name,
                u.job_title,
                t.id AS tag_id,
                t.name AS tag_title
            FROM ${TABLES.POST_TABLE} p
            LEFT JOIN ${TABLES.USER_TABLE} u ON p.user_id = u.id
            LEFT JOIN ${TABLES.TAG_TABLE} t ON FIND_IN_SET(t.id, p.tags)
            WHERE p.status = 1
        `;

        if (postId) {
            sql = baseQuery + ` AND p.id = ?`;
            params = [postId];
        } else {
            sql = baseQuery;
            params = [];
        }

        const [rows] = await db.query(sql, params);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Group tags under each post
        const postsMap = new Map();

        for (const row of rows) {
            const postId = row.id;
            if (!postsMap.has(postId)) {
                postsMap.set(postId, {
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    likes: row.likes,
                    comments: row.comments,
                    tags: [],
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    status: row.status,
                    user_id: row.user_id,
                    username: row.username,
                    email: row.email,
                    phone: row.phone,
                    company_name: row.company_name,
                    job_title: row.job_title
                });
            }

            if (row.tag_id && row.tag_title) {
                postsMap.get(postId).tags.push({
                    tag_id: row.tag_id,
                    tag_title: row.tag_title
                });
            }
        }

        const result = postId ? [...postsMap.values()][0] : [...postsMap.values()];

        return res.status(200).json(result);

    } catch (error) {
        console.error('Error fetching posts:', error);
        return res.status(500).json({ msg: 'Internal Server Error' });
    }
};



const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return res.status(400).json({ msg: 'Post ID is required' });
        }

        
        const [users] = await db.query(`SELECT * FROM ${TABLES.POST_TABLE} WHERE id = ? AND status = 1`, [postId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Post not found or already deleted' });
        }

       
        await db.query(`UPDATE ${TABLES.POST_TABLE} SET status = 0 WHERE id = ?`, [postId]);
        res.status(200).json({ msg: 'Post deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, description, tags, likes, comments } = req.body;
        const user_id = req.user_id;

        if (!postId) {
            return res.status(400).json({ msg: 'Post ID is required' });
        }
        if (!user_id) {
            return res.status(401).json({ msg: 'Unauthorized: user_id missing' });
        }

        // Fetch existing post
        const [existingPosts] = await db.query(
            `SELECT * FROM ${TABLES.POST_TABLE} WHERE id = ? AND status = 1`,
            [postId]
        );

        if (existingPosts.length === 0) {
            return res.status(404).json({ msg: 'Post not found or already deleted' });
        }

        const existing = existingPosts[0];

        const updatedTitle = title ?? existing.title;
        const updatedDescription = description ?? existing.description;

        let tagsStr = '';
        if (tags !== undefined) {
            tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
        } else {
            tagsStr = existing.tags;
        }

        const updatedLikes = likes ?? existing.likes;
        const updatedComments = comments ?? existing.comments;

        const sql = `
            UPDATE ${TABLES.POST_TABLE}
            SET title = ?, description = ?, tags = ?, likes = ?, comments = ?, updated_at = NOW()
            WHERE id = ?
        `;

        await db.query(sql, [
            updatedTitle,
            updatedDescription,
            tagsStr,
            updatedLikes,
            updatedComments,
            postId
        ]);

        res.status(200).json({ msg: 'Post updated successfully' });

    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};




module.exports = { createPost , getPost, deletePost , updatePost };