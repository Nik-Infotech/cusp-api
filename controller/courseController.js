const db = require('../db/db');
const TABLES = require('..//utils/tables'); 
const SERVER_URL = process.env.PUBLIC_API_URL || 'http://localhost:8000'; 

const courseCreate = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Course name is required' });
        }

        // Check if course already exists
        const [existingTags] = await db.query(
            `SELECT * FROM ${TABLES.COURSES_TABLE} WHERE name = ?`,
            [name]
        );
        if (existingTags.length > 0) {
            return res.status(400).json({ error: 'Course already exists' });
        }

        // Image file
        const image = req.file ? req.file.filename : null;

        // Insert new course
        const sql = `INSERT INTO ${TABLES.COURSES_TABLE} (name, description, image) VALUES (?, ?, ?)`;
        const [result] = await db.query(sql, [name, description, image]);

        // Build full image URL (http(s)://host/uploads/filename)
        const imageUrl = image
            ? `${req.protocol}://${req.get('host')}/uploads/${image}`
            : null;

        return res.status(201).json({
            message: 'Course created successfully',
            courseId: result.insertId,
            data: {
                name,
                description,
                image: imageUrl
            }
        });
    } catch (error) {
        console.error('Error creating course:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};



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
            return res.status(400).json({ error: 'Course ID is required' });
        }

        // Check if course exists
        const [existingTags] = await db.query(`SELECT * FROM ${TABLES.COURSES_TABLE} WHERE id = ? AND status = 1`, [courseId]);
        if (existingTags.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const image = req.file?.filename;

        let sql, params;

        if (image) {
            sql = `UPDATE ${TABLES.COURSES_TABLE} SET name = ?, description = ?, image = ?, updated_at = NOW() WHERE id = ?`;
            params = [name, description, image, courseId];
        } else {
            sql = `UPDATE ${TABLES.COURSES_TABLE} SET name = ?, description = ?, updated_at = NOW() WHERE id = ?`;
            params = [name, description, courseId];
        }

        await db.query(sql, params);

        const imageUrl = image
            ? `${req.protocol}://${req.get('host')}/uploads/${image}`
            : existingTags[0].image
                ? `${req.protocol}://${req.get('host')}/uploads/${existingTags[0].image}`
                : null;

        return res.status(200).json({
            message: 'Course updated successfully',
            data: {
                id: courseId,
                name,
                description,
                image: imageUrl
            }
        });

    } catch (error) {
        console.error('Error updating course:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


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


const createTopic = async (req, res) => {
    try {
        const { lesson_id } = req.body;

        if (!lesson_id) {
            return res.status(400).json({ error: 'Lesson ID is required' });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'At least one PPT file is required' });
        }

        // Check if lesson exists
        const [existingLesson] = await db.query(`SELECT * FROM ${TABLES.LESSONS_TABLE} WHERE id = ? AND status = 1`, [lesson_id]);
        if (existingLesson.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        // Insert each PPT as a topic entry
        const inserted = [];
        for (const pptFile of req.files) {
            const pptUrl = `${SERVER_URL}/uploads/${pptFile.filename}`;
            const sql = `INSERT INTO ${TABLES.TOPICS_TABLE} (lesson_id, ppt) VALUES (?, ?)`;
            const [result] = await db.query(sql, [lesson_id, pptUrl]);
            inserted.push({ id: result.insertId, lesson_id, ppt: pptUrl });
        }

        return res.status(201).json({ message: 'Topics created successfully', data: inserted });
    } catch (error) {
        console.error('Error creating topic:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const updateTopic = async (req, res) => {
    try {
        const topicId = req.params.id;
        const { lesson_id } = req.body;

        if (!topicId) {
            return res.status(400).json({ error: 'Topic ID is required' });
        }
        if (!lesson_id) {
            return res.status(400).json({ error: 'Lesson ID is required' });
        }

        // Check if topic exists
        const [existingTopic] = await db.query(`SELECT * FROM ${TABLES.TOPICS_TABLE} WHERE id = ?`, [topicId]);
        if (existingTopic.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        let pptUrl = existingTopic[0].ppt;
        if (req.files && req.files.length > 0) {
            pptUrl = `${SERVER_URL}/uploads/${req.files[0].filename}`;
        }

        const sql = `UPDATE ${TABLES.TOPICS_TABLE} SET lesson_id = ?, ppt = ?, updated_at = NOW() WHERE id = ?`;
        await db.query(sql, [lesson_id, pptUrl, topicId]);

        return res.status(200).json({ message: 'Topic updated successfully', data: { id: topicId, lesson_id, ppt: pptUrl } });
    } catch (error) {
        console.error('Error updating topic:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const getTopic = async (req, res) => {
    try {
        const topicId = req.params.id;
        let sql, params;

        if (topicId) {
            sql = `
                SELECT t.*, l.name AS lesson_name
                FROM ${TABLES.TOPICS_TABLE} t
                LEFT JOIN ${TABLES.LESSONS_TABLE} l ON t.lesson_id = l.id
                WHERE t.id = ? AND t.status = 1
            `;
            params = [topicId];
        } else {
            sql = `
                SELECT t.*, l.name AS lesson_name
                FROM ${TABLES.TOPICS_TABLE} t
                LEFT JOIN ${TABLES.LESSONS_TABLE} l ON t.lesson_id = l.id
                WHERE t.status = 1
            `;
            params = [];
        }

        const [topics] = await db.query(sql, params);

        if (topicId && topics.length === 0) {
            return res.status(404).json({ msg: 'directory not found' });
        }

        return res.status(200).json(topics);
    } catch (error) {
        console.error('Error fetching directory:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deleteTopic = async (req, res) => {
    try {
        const topicId = req.params.id;
        if (!topicId) {
            return res.status(400).json({ msg: 'directory ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.TOPICS_TABLE} WHERE id = ? AND status = 1`, [topicId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Tag not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.TOPICS_TABLE} SET status = 0 WHERE id = ?`, [topicId]);
        res.status(200).json({ msg: 'Tag deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const userEnroll = async (req, res) => {
    try {
        const user_id = req.user_id;
        const { course_id } = req.body;
        console.log("course_id =>", course_id);

        if (!user_id || !course_id) {
            return res.status(400).json({ error: 'User ID and Course ID are required' });
        }

        // Insert into enrollments table
        await db.query(
            `INSERT INTO ${TABLES.ENROLLMENTS_TABLE} (user_id, course_id) VALUES (?, ?)`,
            [user_id, course_id]
        );

        // Fetch user name and course name using JOINs
        const [result] = await db.query(
            `SELECT 
                u.username, 
                c.name AS course_name 
             FROM ${TABLES.USER_TABLE} u
             JOIN ${TABLES.ENROLLMENTS_TABLE} e ON u.id = e.user_id
             JOIN ${TABLES.COURSES_TABLE} c ON c.id = e.course_id
             WHERE e.user_id = ? AND e.course_id = ?
             ORDER BY e.id DESC
             LIMIT 1`,
            [user_id, course_id]
        );

        const enrolledData = result[0]; // latest enrolled record with username and course name

        res.status(201).json({
            message: 'Enrollment successful',
            user: enrolledData.username,
            course: enrolledData.course_name
        });

    } catch (error) {
        console.error('Error enrolling user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};





module.exports = {courseCreate , updateCourse , deleteCourse , getCourse ,lessionCreate , getLession , deletelession , updatelession,createTopic , updateTopic,deleteTopic, getTopic , userEnroll};