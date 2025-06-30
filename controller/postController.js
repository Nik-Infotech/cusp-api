
const createPost = async (req, res) => {
    try {
        const { title, content, user_id, tag_id ,} = req.body;

        if (!title || !content || !user_id) {
            return res.status(400).json({ msg: 'Title, content, and user ID are required' });
        }

        // Check if user exists
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE id = ? AND status = 1`, [user_id]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found or inactive' });
        }

        // Insert post into database
        const sql = `INSERT INTO ${TABLES.POST_TABLE} (title, content, user_id, tag_id) VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(sql, [title, content, user_id, tag_id || null]);

        const post = {
            id: result.insertId,
            title,
            content,
            user_id,
            tag_id: tag_id || null,
            created_at: new Date(),
            updated_at: new Date()
        };

        res.status(201).json({ msg: 'Post created successfully', post });
        
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
        
    }
}