const db = require('../db/db');
const TABLES = require('..//utils/tables'); 
const SERVER_URL = process.env.PUBLIC_API_URL || 'http://localhost:8000'; 


const createDocument = async (req, res) => {
    try {
        const { title, description } = req.body;
        const user_id = req.user_id; 

        if (!title || !description || !req.files || req.files.length === 0) {
            return res.status(400).json({ msg: 'Title, description, and at least one document are required' });
        }

        
        const insertPromises = req.files.map(file => {
            const filePath = file.filename; 
            const fileType = file.mimetype;

            return db.query(
                `INSERT INTO ${TABLES.DOCUMENTS_TABLE} (title, description, file_path, file_type, user_id) VALUES (?, ?, ?, ?, ?)`,
                [title, description, filePath, fileType, user_id]
            );
        });

        await Promise.all(insertPromises);

        res.status(201).json({ msg: 'Documents uploaded successfully' ,data: req.files.map(file => ({
            title,
            description,
            file_path: `${SERVER_URL}/uploads/${file.filename}`,
            file_type: file.mimetype
        }))});
    } catch (error) {
        console.error('Error uploading documents:', error);
        res.status(500).json({ msg: 'Internal server error' });
    }
};



const updateDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required in the URL' });
    }

    // Get existing record
    const [existingRows] = await db.query(
      `SELECT * FROM ${TABLES.DOCUMENTS_TABLE} WHERE id = ?`,
      [documentId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const existingDoc = existingRows[0];

    const { title, description } = req.body;

    const updatedTitle = title ?? existingDoc.title;
    const updatedDescription = description ?? existingDoc.description;

    // If a new file is uploaded, update file_path and file_type
    let updatedFilePath = existingDoc.file_path;
    let updatedFileType = existingDoc.file_type;

    if (req.files && req.files.length > 0) {
      updatedFilePath = req.files[0].filename;
      updatedFileType = req.files[0].mimetype;
    }

    await db.query(
      `UPDATE ${TABLES.DOCUMENTS_TABLE}
       SET title = ?, description = ?, file_path = ?, file_type = ?, updated_at = NOW()
       WHERE id = ?`,
      [updatedTitle, updatedDescription, updatedFilePath, updatedFileType, documentId]
    );

    return res.status(200).json({
      msg: 'Document updated successfully',
      data: {
        id: documentId,
        title: updatedTitle,
        description: updatedDescription,
        file_path: `${SERVER_URL}/uploads/${updatedFilePath}`,
        file_type: updatedFileType
      }
    });

  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteDocuments = async (req, res) => {
    try {
        const documentId = req.params.id;
        if (!documentId) {
            return res.status(400).json({ msg: 'Document ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.DOCUMENTS_TABLE} WHERE id = ? AND status = 1`, [documentId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'document not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.DOCUMENTS_TABLE} SET status = 0 WHERE id = ?`, [documentId]);
        res.status(200).json({ msg: 'Tag deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};


const getDocuments = async (req, res) => {
    try {
        const documentId = req.params.id;
        let sql, params;

        sql = `
            SELECT d.*, u.username, u.email 
            FROM ${TABLES.DOCUMENTS_TABLE} d 
            LEFT JOIN ${TABLES.USER_TABLE} u ON d.user_id = u.id 
            WHERE d.status = 1
        `;

        if (documentId) {
            sql += ' AND d.id = ?';
            params = [documentId];
        } else {
            params = [];
        }

        const [documents] = await db.query(sql, params);

        if (documentId && documents.length === 0) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        res.status(200).json(documentId ? [documents[0]] : documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};







module.exports = {createDocument , updateDocument ,deleteDocuments , getDocuments};