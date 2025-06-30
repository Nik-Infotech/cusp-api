const db = require('../db/db');
const TABLES = require('../utils/tables'); 

const tagCreate = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Tag name is required' });
        }

        // Check if tag already exists
        const [existingTags] = await db.query(`SELECT * FROM ${TABLES.TAG_TABLE} WHERE name = ?`, [name]);
        if (existingTags.length > 0) {
            return res.status(400).json({ error: 'Tag already exists' });
        }

        // Insert new tag
        const sql = `INSERT INTO ${TABLES.TAG_TABLE} (name, description) VALUES (?, ?)`;
        const [result] = await db.query(sql, [name, description]);

        return res.status(201).json({ message: 'Tag created successfully', tagId: result.insertId ,data: { name, description } });
    } catch (error) {
        console.error('Error creating tag:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const getTags = async (req, res) => {
    try {
        const tagId = req.params.id;
        let sql, params;

        if (tagId) {
            sql = `SELECT * FROM ${TABLES.TAG_TABLE} WHERE id = ? AND status = 1`;
            params = [tagId];
        } else {
            sql = `SELECT * FROM ${TABLES.TAG_TABLE} WHERE status = 1`;
            params = [];
        }

        const [users] = await db.query(sql, params);

        if (tagId && users.length === 0) {
            return res.status(404).json({ msg: 'Tag not found' });
        }

        res.status(200).json(tagId ? users[0] : users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deleteTag = async (req, res) => {
    try {
        const tagId = req.params.id;
        if (!tagId) {
            return res.status(400).json({ msg: 'User ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.TAG_TABLE} WHERE id = ? AND status = 1`, [tagId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Tag not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.TAG_TABLE} SET status = 0 WHERE id = ?`, [tagId]);
        res.status(200).json({ msg: 'Tag deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const updateTag = async (req, res) => {
    try {
        const tagId = req.params.id;
        const { name, description } = req.body;

        if (!tagId) {
            return res.status(400).json({ error: 'Tag ID is required' });
        }

        // Check if tag exists
        const [existingTags] = await db.query(`SELECT * FROM ${TABLES.TAG_TABLE} WHERE id = ? AND status = 1`, [tagId]);
        if (existingTags.length === 0) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Update tag
        const sql = `UPDATE ${TABLES.TAG_TABLE} SET name = ?, description = ? WHERE id = ?`;
        await db.query(sql, [name, description, tagId]);

        return res.status(200).json({ message: 'Tag updated successfully', data: { id: tagId, name, description } });
        
    } catch (error) {
        console.error('Error updating tag:', error);
        return res.status(500).json({ error: 'Internal server error' });
        
    }
}
    
module.exports = { tagCreate , getTags , deleteTag, updateTag};