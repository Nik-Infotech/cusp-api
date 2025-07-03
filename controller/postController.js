const db = require('../db/db');
const TABLES = require('../utils/tables');
const { uploadPostMedia, validatePostMediaFiles, uploadSinglePostMedia, validateSinglePostMediaFile } = require('../utils/validation');
const fs = require('fs');
const path = require('path');

const createPost = async (req, res) => {
    try {
        console.log('BODY:', req.body);
        console.log('FILES:', req.files);

        const { title, description, tags = '', likes = 0, comments = 0 } = req.body;
        const user_id = req.user_id;

        if (!title || !description) {
            return res.status(400).json({ msg: 'Title and description are required' });
        }
        if (!user_id) {
            return res.status(401).json({ msg: 'Unauthorized: user_id missing' });
        }

        const tagsStr = typeof tags === 'string' ? tags : tags.join(',');
        const tagsArray = tagsStr ? tagsStr.split(',') : [];

        // Insert post
        const sql = `INSERT INTO ${TABLES.POST_TABLE} (title, description, user_id, tags, likes, comments) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
            title,
            description,
            user_id,
            tagsStr,
            likes,
            comments
        ]);
        const postId = result.insertId;
        console.log('Post inserted, id:', postId);

        // Handle uploads
        const images = req.files?.images || [];
        const videos = req.files?.videos || [];
        const uploads = [];

        for (const img of images) {
            const fileUrl = `/uploads/${img.filename}`;
            console.log('Inserting image:', fileUrl);
            await db.query(
                `INSERT INTO post_uploads (post_id, user_id, image, video) VALUES (?, ?, ?, NULL)`,
                [postId, user_id, fileUrl]
            );
            uploads.push({ image: fileUrl, video: null });
        }
        for (const vid of videos) {
            const fileUrl = `/uploads/${vid.filename}`;
            console.log('Inserting video:', fileUrl);
            await db.query(
                `INSERT INTO post_uploads (post_id, user_id, image, video) VALUES (?, ?, NULL, ?)`,
                [postId, user_id, fileUrl]
            );
            uploads.push({ image: null, video: fileUrl });
        }

        res.status(201).json({
            msg: 'Post created successfully',
            post: {
                id: postId,
                title,
                description,
                user_id,
                tags: tagsArray,
                likes,
                comments,
                uploads
            }
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ msg: 'Internal dd Server Error', error: error.message });
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
        return res.status(500).json({ msg: 'Internal gt Server Error' });
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
        res.status(500).json({ msg: 'Internal hh Server Error' });
    }
};

const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, description, tags, likes, comments, remove_upload_ids } = req.body;
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

        // Update post data
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

        // Remove uploads if requested
        if (remove_upload_ids) {
            const ids = Array.isArray(remove_upload_ids) ? remove_upload_ids : [remove_upload_ids];
            for (const id of ids) {
                // Get file path to delete
                const [rows] = await db.query('SELECT * FROM post_uploads WHERE id = ? AND post_id = ?', [id, postId]);
                if (rows.length) {
                    const upload = rows[0];
                    const filePath = upload.image || upload.video;
                    if (filePath) {
                        const absPath = path.join(process.cwd(), filePath.replace('/uploads/', 'uploads/'));
                        if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
                    }
                    await db.query('DELETE FROM post_uploads WHERE id = ?', [id]);
                }
            }
        }

        // Add new uploads if provided
        const images = req.files?.images || [];
        const videos = req.files?.videos || [];
        for (const img of images) {
            const fileUrl = `/uploads/${img.filename}`;
            await db.query(
                `INSERT INTO post_uploads (post_id, user_id, image, video) VALUES (?, ?, ?, NULL)`,
                [postId, user_id, fileUrl]
            );
        }
        for (const vid of videos) {
            const fileUrl = `/uploads/${vid.filename}`;
            await db.query(
                `INSERT INTO post_uploads (post_id, user_id, image, video) VALUES (?, ?, NULL, ?)`,
                [postId, user_id, fileUrl]
            );
        }

        res.status(200).json({ msg: 'Post updated successfully' });

    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ msg: 'Internal Server Error', error: error.message });
    }
};


const updatePostUpload = async (req, res) => {
    try {
        const uploadId = req.params.id;
        const user_id = req.user_id;

        // Fetch existing upload
        const [rows] = await db.query('SELECT * FROM post_uploads WHERE id = ?', [uploadId]);
        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Upload not found' });
        }
        const upload = rows[0];

        // Only allow owner to update
        if (upload.user_id !== user_id) {
            return res.status(403).json({ msg: 'Forbidden' });
        }

        let newImage = upload.image;
        let newVideo = upload.video;

        // Remove old file if new one is uploaded
        if (req.files?.image) {
            if (upload.image) {
                const oldPath = path.join(process.cwd(), upload.image.replace('/uploads/', 'uploads/'));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            newImage = `/uploads/${req.files.image[0].filename}`;
            newVideo = null;
        }
        if (req.files?.video) {
            if (upload.video) {
                const oldPath = path.join(process.cwd(), upload.video.replace('/uploads/', 'uploads/'));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            newVideo = `/uploads/${req.files.video[0].filename}`;
            newImage = null;
        }

        await db.query(
            'UPDATE post_uploads SET image = ?, video = ? WHERE id = ?',
            [newImage, newVideo, uploadId]
        );

        res.status(200).json({ msg: 'Upload updated successfully', upload: { id: uploadId, image: newImage, video: newVideo } });
    } catch (error) {
        console.error('Error updating post upload:', error);
        res.status(500).json({ msg: 'Internal Server Error', error: error.message });
    }
};

module.exports = { createPost, getPost, deletePost, updatePost, updatePostUpload };