const db = require('../db/db');
const TABLES = require('..//utils/tables'); 



const toolsCreate = async (req, res) => {
    try {
        const {title,description,link } = req.body;
        // Use directory photo upload field name 'p_photo' as per validation.js and route
        const img_url = req.file ? req.file.filename : null;
        // Build full photo URL if file exists
        const baseUrl = req.protocol + '://' + req.get('host');
        const p_photo_url = img_url ? `${baseUrl}/uploads/${img_url}` : null;
        if (!title || !description || !link || !img_url) {
            return res.status(400).json({ error: 'Tools details and photo are required' });
        }

        // Check for existing tool by title (assuming title is unique for tools)
        const [existingTools] = await db.query(`SELECT * FROM ${TABLES.TOOLS_TABLE} WHERE title = ?`, [title]);
        if (existingTools.length > 0) {
            return res.status(400).json({ error: 'Tools already exists' });
        }

        // Insert new Tools (fix SQL syntax)
        const sql = `INSERT INTO ${TABLES.TOOLS_TABLE} (title, description, link, img_url) VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(sql, [title, description, link, img_url]);

        return res.status(201).json({
            message: 'Tools created successfully',
            toolsId: result.insertId,
            data: {
                title, description, link,
                img_url: p_photo_url
            }
        });
    } catch (error) {
        console.error('Error creating Tools:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const updateTools = async (req, res) => {
    try {
        const toolsId = req.params.id;
        const {title,description,link } = req.body;
        // Only set img_url if a new file is uploaded
        const img_url = req.file && req.file.filename ? req.file.filename : undefined;

        if (!toolsId) {
            return res.status(400).json({ error: 'Tools ID is required' });
        }

        // Check if Tools exists
        const [existingDirectories] = await db.query(`SELECT * FROM ${TABLES.TOOLS_TABLE} WHERE id = ?`, [toolsId]);
        if (existingDirectories.length === 0) {
            return res.status(404).json({ error: 'Tools not found' });
        }

        // Build dynamic update query
        const fields = [];
        const values = [];
        if (title !== undefined) {
            fields.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            fields.push('description = ?');
            values.push(description);
        }
        if (link !== undefined) {
            fields.push('link = ?');
            values.push(link);
        }
   
        if (img_url !== undefined) {
            fields.push('img_url = ?');
            values.push(img_url);
        }
        fields.push('updated_at = NOW()');

        if (fields.length === 1) { 
            return res.status(400).json({ error: 'No fields to update' });
        }

        const sql = `UPDATE ${TABLES.TOOLS_TABLE} SET ${fields.join(', ')} WHERE id = ?`;
        values.push(toolsId);
        await db.query(sql, values);

        // Fetch updated Tools
        const [updatedRows] = await db.query(`SELECT * FROM ${TABLES.TOOLS_TABLE} WHERE id = ?`, [toolsId]);
        let updatedData = updatedRows[0] || {};
        // Build full photo URL if img_url exists
        if (updatedData.img_url) {
            const baseUrl = req.protocol + '://' + req.get('host');
            updatedData.img_url = `${baseUrl}/uploads/${updatedData.img_url}`;
        }

        return res.status(200).json({ message: 'Tools updated successfully', data: updatedData });
        
    } catch (error) {
        console.error('Error updating Tools:', error);
        return res.status(500).json({ error: 'Internal server error' });
        
    }
}

const getTools = async (req, res) => {
    try {
        const toolsId = req.params.id;
        let sql, params;

        if (toolsId) {
            sql = `SELECT * FROM ${TABLES.TOOLS_TABLE} WHERE id = ? AND status = 1`;
            params = [toolsId];
        } else {
            sql = `SELECT * FROM ${TABLES.TOOLS_TABLE} WHERE status = 1`;
            params = [];
        }

        const [users] = await db.query(sql, params);

        if (toolsId && users.length === 0) {
            return res.status(404).json({ msg: 'Tools not found' });
        }

        if (toolsId) {
            return res.status(200).json(users);
        } else {
            return res.status(200).json(users);
        }
    } catch (error) {
        console.error('Error fetching Tools:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deleteTools = async (req, res) => {
    try {
        const toolsId = req.params.id;
        if (!toolsId) {
            return res.status(400).json({ msg: 'Tools ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.TOOLS_TABLE} WHERE id = ? AND status = 1`, [toolsId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Tag not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.TOOLS_TABLE} SET status = 0 WHERE id = ?`, [toolsId]);
        res.status(200).json({ msg: 'Tag deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

module.exports = { toolsCreate , updateTools ,deleteTools , getTools };
