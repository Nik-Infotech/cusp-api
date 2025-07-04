const db = require('../db/db');
const TABLES = require('../utils/tables');


const createComment = async (req, res) => {
    try {
        const post_id = req.body?.post_id;
        const comment_text = req.body?.comment_text;
        const user_id = req.user_id;

        if (!post_id || !comment_text) {
            return res.status(400).json({ msg: 'Post ID and comment text are required' });
        }

        if (!user_id) {
            return res.status(401).json({ msg: 'Unauthorized: user_id missing' });
        }

        // Check if post exists
        const [postExists] = await db.query(
            `SELECT * FROM ${TABLES.POST_TABLE} WHERE id = ?`,
            [post_id]
        );
        if (postExists.length === 0) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Insert the comment
        const sql = `INSERT INTO ${TABLES.COMMENT_TABLE} 
            (post_id, user_id, comment_text) 
            VALUES (?, ?, ?)`;

        const [result] = await db.query(sql, [post_id, user_id, comment_text]);

        // ✅ Count total comments for this post
        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM ${TABLES.COMMENT_TABLE} 
             WHERE post_id = ? AND status = 1`,
            [post_id]
        );
        const totalComments = countRows[0].total;

        // ✅ Update post table with new comment count
        await db.query(
            `UPDATE ${TABLES.POST_TABLE} SET comments = ? WHERE id = ?`,
            [totalComments, post_id]
        );

        res.status(201).json({
            msg: 'Comment created successfully',
            comment: {
                id: result.insertId,
                post_id,
                user_id,
                comment_text
            }
        });

    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};


const deleteComment = async (req, res) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return res.status(400).json({ msg: 'Comment ID is required' });
        }

        
        const [users] = await db.query(`SELECT * FROM ${TABLES.COMMENT_TABLE} WHERE id = ? AND status = 1`, [postId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Comment not found or already deleted' });
        }

       
        await db.query(`UPDATE ${TABLES.COMMENT_TABLE} SET status = 0 WHERE id = ?`, [postId]);
        res.status(200).json({ msg: 'Comment deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};



const getComments = async (req, res) => {
    try {
        const commentId = req.params.id;
        // Check if the route is /comment/post-id/:id
        const isPostIdRoute = req.originalUrl.includes('/comment/post-id/');
        let sql, params;

        const baseQuery = `
            SELECT 
                c.*,
                u.username,
                p.title AS post_title
            FROM ${TABLES.COMMENT_TABLE} c
            LEFT JOIN ${TABLES.USER_TABLE} u ON c.user_id = u.id
            LEFT JOIN ${TABLES.POST_TABLE} p ON c.post_id = p.id
            WHERE c.status = 1
        `;

        if (isPostIdRoute && commentId) {
            // If /comment/post-id/:id, treat id as post_id
            sql = baseQuery + ` AND c.post_id = ?`;
            params = [commentId];
        } else if (commentId) {
            // If /comment/:id, treat id as comment_id
            sql = baseQuery + ` AND c.id = ?`;
            params = [commentId];
        } else {
            sql = baseQuery;
            params = [];
        }

        const [rows] = await db.query(sql, params);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Comment not found' });
        }

        // Get all comment ids
        const commentIds = rows.map(c => c.id);

        // Fetch replies for all these comments
        let repliesMap = {};
        if (commentIds.length > 0) {
            const [replies] = await db.query(
                `SELECT 
                    r.comment_id, 
                    r.reply_user_id, 
                    r.reply_text, 
                    u.username AS reply_username
                 FROM ${TABLES.REPLY_TABLE} r
                 LEFT JOIN ${TABLES.USER_TABLE} u ON r.reply_user_id = u.id
                 WHERE r.comment_id IN (${commentIds.map(() => '?').join(',')}) AND r.status = 1`,
                commentIds
            );
            // Group replies by comment_id
            repliesMap = replies.reduce((acc, reply) => {
                if (!acc[reply.comment_id]) acc[reply.comment_id] = [];
                acc[reply.comment_id].push({
                    reply_user_id: reply.reply_user_id,
                    reply_username: reply.reply_username,
                    reply_text: reply.reply_text,
                    reply_created_at: reply.created_at || new Date().toISOString()
                });
                return acc;
            }, {});
        }

        // Attach replies array to each comment
        const result = rows.map(comment => ({
            ...comment,
            replies: repliesMap[comment.id] || []
        }));

        // If /comment/:id or /comment/post-id/:id, return single object if only one found
        if (commentId && result.length === 1) {
            return res.status(200).json(result[0]);
        }
        return res.status(200).json(result);

    } catch (error) {
        console.error('Error fetching comments:', error);
        return res.status(500).json({ msg: 'Internal Server Error' });
    }
};


const createReply = async (req, res) =>{
    try {
        const reply_user_id = req.user_id;
        const { comment_id, reply_text, post_id} = req.body;
        if (!comment_id || !reply_text) {
            return res.status(400).json({ msg: 'All fields are required' });
        }
        if (!reply_user_id) {
            return res.status(401).json({ msg: 'Unauthorized: user_id missing' });
        }

        const sql = `INSERT INTO ${TABLES.REPLY_TABLE} 
            (comment_id, reply_user_id, reply_text, post_id) 
            VALUES (?, ?, ?, ?)`;

        const [result] = await db.query(sql, [comment_id, reply_user_id, reply_text, post_id]);

        // Fetch joined data for response
        const [rows] = await db.query(
            `SELECT 
                r.id,
                r.comment_id,
                r.reply_user_id,
                r.reply_text,
                r.post_id,
                p.title AS post_title,
                u.username AS reply_username,
                c.comment_text
            FROM ${TABLES.REPLY_TABLE} r
            LEFT JOIN ${TABLES.POST_TABLE} p ON r.post_id = p.id
            LEFT JOIN ${TABLES.USER_TABLE} u ON r.reply_user_id = u.id
            LEFT JOIN ${TABLES.COMMENT_TABLE} c ON r.comment_id = c.id
            WHERE r.id = ?`,
            [result.insertId]
        );

        const replyData = rows[0];

        res.status(201).json({
            msg: 'Reply created successfully',
            reply: replyData
        });

    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
}


const deleteReply = async (req, res) => {
    try {
        const replyId = req.params.id;
        if (!replyId) {
            return res.status(400).json({ msg: 'Comment ID is required' });
        }

        
        const [users] = await db.query(`SELECT * FROM ${TABLES.REPLY_TABLE} WHERE id = ? AND status = 1`, [replyId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Comment Reply not found or already deleted' });
        }

       
        await db.query(`UPDATE ${TABLES.REPLY_TABLE} SET status = 0 WHERE id = ?`, [replyId]);
        res.status(200).json({ msg: 'Comment Reply deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const getReplies = async (req, res) => {
    try {
        const commentId = req.params.id;
        if (!commentId) {
            return res.status(400).json({ msg: 'Comment ID is required' });
        }

        const [rows] = await db.query(
            `SELECT 
                r.id,
                r.comment_id,
                r.reply_user_id,
                r.reply_text,
                u.username AS reply_username
             FROM ${TABLES.REPLY_TABLE} r
             LEFT JOIN ${TABLES.USER_TABLE} u ON r.reply_user_id = u.id
             WHERE r.comment_id = ? AND r.status = 1`,
            [commentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'No replies found for this comment' });
        }

        return res.status(200).json(rows);
        
    } catch (error) {
        console.error('Error fetching replies:', error);
        return res.status(500).json({ msg: 'Internal Server Error' });
        
    }
}

// like status in post
const likePost = async (req, res) => {
    try {
        const post_id = req.body?.post_id;
        const action = req.body?.like; // "yes" or "no"
        const user_id = req.user_id;

        if (!post_id  || !action) {
            return res.status(400).json({ msg: 'Post ID, user ID, and like status are required' });
        }

        const status = action === 'yes' ? 1 : 0;

        // Check if like record already exists
        const [existing] = await db.query(
            `SELECT * FROM ${TABLES.LIKE_TABLE} WHERE post_id = ? AND user_id = ?`,
            [post_id, user_id]
        );

        if (existing.length > 0) {
            // Update existing like/unlike
            await db.query(
                `UPDATE ${TABLES.LIKE_TABLE} SET status = ?, updated_at = NOW() WHERE id = ?`,
                [status, existing[0].id]
            );
        } else {
            // New like record
            await db.query(
                `INSERT INTO ${TABLES.LIKE_TABLE} (post_id, user_id, status) VALUES (?, ?, ?)`,
                [post_id, user_id, status]
            );
        }

        // Count total active likes
        const [countResult] = await db.query(
            `SELECT COUNT(*) AS total FROM ${TABLES.LIKE_TABLE} WHERE post_id = ? AND status = 1`,
            [post_id]
        );
        const totalLikes = countResult[0].total;

        // Update post table's likes field
        await db.query(
            `UPDATE ${TABLES.POST_TABLE} SET likes = ? WHERE id = ?`,
            [totalLikes, post_id]
        );

        res.status(200).json({ msg: `Post ${status === 1 ? 'liked' : 'unliked'}`, totalLikes ,

            //return post_id and title
            post_id: post_id,
            post_title: (await db.query(`SELECT title FROM ${TABLES.POST_TABLE} WHERE id = ?`, [post_id]))[0][0]?.title || 'Unknown Post Title'
            //return user_id and username
            , user_id: user_id,
            username: (await db.query(`SELECT username FROM ${TABLES.USER_TABLE} WHERE id = ?`, [user_id]))[0][0]?.username || 'Unknown User'
         });

    } catch (error) {
        console.error('Error updating like:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};


module.exports = { createComment , deleteComment , getComments , createReply , deleteReply,getReplies , likePost };
