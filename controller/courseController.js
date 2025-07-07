const db = require('../db/db');
const TABLES = require('..//utils/tables'); 

const courseCreate = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'course name is required' });
        }

        // Check if couse already exists
        const [existingTags] = await db.query(`SELECT * FROM ${TABLES.COURSES_TABLE} WHERE name = ?`, [name]);
        if (existingTags.length > 0) {
            return res.status(400).json({ error: 'course already exists' });
        }

        // Insert new course
        const sql = `INSERT INTO ${TABLES.COURSES_TABLE} (name, description) VALUES (?, ?)`;
        const [result] = await db.query(sql, [name, description]);

        return res.status(201).json({ message: 'course created successfully', courseId: result.insertId ,data: { name, description } });
    } catch (error) {
        console.error('Error creating tag:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const getCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        let sql, params;

        if (courseId) {
            sql = `SELECT * FROM ${TABLES.COURSES_TABLE} WHERE id = ? AND status = 1`;
            params = [courseId];
        } else {
            sql = `SELECT * FROM ${TABLES.COURSES_TABLE} WHERE status = 1`;
            params = [];
        }

        const [courses] = await db.query(sql, params);

        if (courseId && courses.length === 0) {
            return res.status(404).json({ msg: 'course not found' });
        }

        // Helper to get lessons count for a course
        const getLessonsCount = async (course_id) => {
            const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${TABLES.LESSONS_TABLE} WHERE course_id = ? AND status = 1`, [course_id]);
            return rows[0]?.count || 0;
        };

        if (courseId) {
            // Single course
            const course = courses[0];
            course.lessons_count = await getLessonsCount(course.id);
            return res.status(200).json(course);
        } else {
            // All courses
            const coursesWithCount = await Promise.all(
                courses.map(async (course) => {
                    course.lessons_count = await getLessonsCount(course.id);
                    return course;
                })
            );
            return res.status(200).json(coursesWithCount);
        }
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        if (!courseId) {
            return res.status(400).json({ msg: 'course ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.COURSES_TABLE} WHERE id = ? AND status = 1`, [courseId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'course not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.COURSES_TABLE} SET status = 0 WHERE id = ?`, [courseId]);
        res.status(200).json({ msg: 'course deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const updateCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        const { name, description } = req.body;

        if (!courseId) {
            return res.status(400).json({ error: 'course ID is required' });
        }

        // Check if tag exists
        const [existingTags] = await db.query(`SELECT * FROM ${TABLES.COURSES_TABLE} WHERE id = ? AND status = 1`, [courseId]);
        if (existingTags.length === 0) {
            return res.status(404).json({ error: 'course not found' });
        }

        // Update tag
        const sql = `UPDATE ${TABLES.COURSES_TABLE} SET name = ?, description = ? , updated_at=NOW() WHERE id = ?`;
        await db.query(sql, [name, description, courseId]);

        return res.status(200).json({ message: 'course updated successfully', data: { id: courseId, name, description } });
        
    } catch (error) {
        console.error('Error updating tag:', error);
        return res.status(500).json({ error: 'Internal server error' });
        
    }
}


const lessionCreate = async (req, res) => {
    try {
        const { name, description, course_id } = req.body;
        if (!name || !course_id) {
            return res.status(400).json({ error: 'Lesson name and course ID are required' });
        }

        // Check if course exists
        const [existingCourse] = await db.query(`SELECT * FROM ${TABLES.COURSES_TABLE} WHERE id = ? AND status = 1`, [course_id]);
        if (existingCourse.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Insert new lesson
        const sql = `INSERT INTO ${TABLES.LESSONS_TABLE} (name, description, course_id) VALUES (?, ?, ?)`;
        const [result] = await db.query(sql, [name, description, course_id]);

        return res.status(201).json({ message: 'Lesson created successfully', lessonId: result.insertId ,data: { name, description, course_id } });
        
    } catch (error) {
        console.error('Error creating lesson:', error);
        return res.status(500).json({ error: 'Internal server error' });
        
    }
}

const getLession = async (req, res) => { 
    try {
        const lessionId = req.params.id;
        let sql, params;

        if (lessionId) {
            sql = `SELECT * FROM ${TABLES.LESSONS_TABLE} WHERE id = ? AND status = 1`;
            params = [lessionId];
        } else {
            sql = `SELECT * FROM ${TABLES.LESSONS_TABLE} WHERE status = 1`;
            params = [];
        }

        const [lession] = await db.query(sql, params);

        if (lessionId && lession.length === 0) {
            return res.status(404).json({ msg: 'lessions not found' });
        }

        res.status(200).json(lessionId ? lession[0] : lession);
    } catch (error) {
        console.error('Error fetching lessions:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deletelession = async (req, res) => {
    try {
        const lessionId = req.params.id;
        if (!lessionId) {
            return res.status(400).json({ msg: 'lession ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.LESSONS_TABLE} WHERE id = ? AND status = 1`, [lessionId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'lession not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.LESSONS_TABLE} SET status = 0 WHERE id = ?`, [lessionId]);
        res.status(200).json({ msg: 'lession deleted successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const updatelession = async (req, res) => {
    try {
        const lessionId = req.params.id;
        const { name, description } = req.body;

        if (!lessionId) {
            return res.status(400).json({ error: 'course ID is required' });
        }

        // Check if tag exists
        const [existingTags] = await db.query(`SELECT * FROM ${TABLES.LESSONS_TABLE} WHERE id = ? AND status = 1`, [lessionId]);
        if (existingTags.length === 0) {
            return res.status(404).json({ error: 'course not found' });
        }

        // Update tag
        const sql = `UPDATE ${TABLES.LESSONS_TABLE} SET name = ?, description = ? , updated_at=NOW() WHERE id = ?`;
        await db.query(sql, [name, description, lessionId]);

        return res.status(200).json({ message: 'course updated successfully', data: { id: lessionId, name, description } });
        
    } catch (error) {
        console.error('Error updating tag:', error);
        return res.status(500).json({ error: 'Internal server error' });
        
    }
}

module.exports = {courseCreate , updateCourse , deleteCourse , getCourse ,lessionCreate , getLession , deletelession , updatelession};