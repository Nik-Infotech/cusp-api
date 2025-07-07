const db = require('../db/db');
const TABLES = require('..//utils/tables'); 



const directoryCreate = async (req, res) => {
    try {
        const { place_name, location, location_url, p_name, p_email } = req.body;
        const p_photo = req.file ? req.file.filename : null;
        // Build full photo URL if file exists
        const baseUrl = req.protocol + '://' + req.get('host');
        const p_photo_url = p_photo ? `${baseUrl}/uploads/${p_photo}` : null;
        if (!place_name || !location || !location_url || !p_name || !p_email || !p_photo) {
            return res.status(400).json({ error: 'Directory details and photo are required' });
        }

        const [existingDirectories] = await db.query(`SELECT * FROM ${TABLES.DIRECTORY_TABLE} WHERE place_name = ?`, [place_name]);
        if (existingDirectories.length > 0) {
            return res.status(400).json({ error: 'Directory already exists' });
        }

        // Insert new directory
        const sql = `INSERT INTO ${TABLES.DIRECTORY_TABLE} (place_name, location, location_url, p_name, p_email, p_photo) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [place_name, location, location_url, p_name, p_email, p_photo]);

        return res.status(201).json({
            message: 'Directory created successfully',
            directoryId: result.insertId,
            data: {
                place_name,
                location,
                location_url,
                p_name,
                p_email,
                p_photo: p_photo_url
            }
        });
    } catch (error) {
        console.error('Error creating directory:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const updateDirectory = async (req, res) => {
    try {
        const directoryId = req.params.id;
        const { place_name, location, location_url, p_name, p_email } = req.body;
        const p_photo = req.file ? req.file.filename : undefined;

        if (!directoryId) {
            return res.status(400).json({ error: 'Directory ID is required' });
        }

        // Check if directory exists
        const [existingDirectories] = await db.query(`SELECT * FROM ${TABLES.DIRECTORY_TABLE} WHERE id = ?`, [directoryId]);
        if (existingDirectories.length === 0) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        // Build dynamic update query
        const fields = [];
        const values = [];
        if (place_name !== undefined) {
            fields.push('place_name = ?');
            values.push(place_name);
        }
        if (location !== undefined) {
            fields.push('location = ?');
            values.push(location);
        }
        if (location_url !== undefined) {
            fields.push('location_url = ?');
            values.push(location_url);
        }
        if (p_name !== undefined) {
            fields.push('p_name = ?');
            values.push(p_name);
        }
        if (p_email !== undefined) {
            fields.push('p_email = ?');
            values.push(p_email);
        }
        if (p_photo !== undefined) {
            fields.push('p_photo = ?');
            values.push(p_photo);
        }
        fields.push('updated_at = NOW()');

        if (fields.length === 1) { // Only updated_at, nothing to update
            return res.status(400).json({ error: 'No fields to update' });
        }

        const sql = `UPDATE ${TABLES.DIRECTORY_TABLE} SET ${fields.join(', ')} WHERE id = ?`;
        values.push(directoryId);
        await db.query(sql, values);

        // Fetch updated directory
        const [updatedRows] = await db.query(`SELECT * FROM ${TABLES.DIRECTORY_TABLE} WHERE id = ?`, [directoryId]);
        let updatedData = updatedRows[0] || {};
        // Build full photo URL if p_photo exists
        if (updatedData.p_photo) {
            const baseUrl = req.protocol + '://' + req.get('host');
            updatedData.p_photo = `${baseUrl}/uploads/${updatedData.p_photo}`;
        }

        return res.status(200).json({ message: 'Directory updated successfully', data: updatedData });
        
    } catch (error) {
        console.error('Error updating directory:', error);
        return res.status(500).json({ error: 'Internal server error' });
        
    }
}

const getDirectory = async (req, res) => {
    try {
        const directoryId = req.params.id;
        let sql, params;

        if (directoryId) {
            sql = `SELECT * FROM ${TABLES.DIRECTORY_TABLE} WHERE id = ? AND status = 1`;
            params = [directoryId];
        } else {
            sql = `SELECT * FROM ${TABLES.DIRECTORY_TABLE} WHERE status = 1`;
            params = [];
        }

        const [users] = await db.query(sql, params);

        if (directoryId && users.length === 0) {
            return res.status(404).json({ msg: 'directory not found' });
        }

        // Always return an array, even for single result
        if (directoryId) {
            return res.status(200).json(users);
        } else {
            return res.status(200).json(users);
        }
    } catch (error) {
        console.error('Error fetching directory:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deleteDirectory = async (req, res) => {
    try {
        const directoryId = req.params.id;
        if (!directoryId) {
            return res.status(400).json({ msg: 'directory ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.DIRECTORY_TABLE} WHERE id = ? AND status = 1`, [directoryId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Tag not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.DIRECTORY_TABLE} SET status = 0 WHERE id = ?`, [directoryId]);
        res.status(200).json({ msg: 'Tag deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

module.exports = { directoryCreate , updateDirectory ,deleteDirectory , getDirectory };
