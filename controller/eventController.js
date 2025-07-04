


const { get } = require('http');
const db = require('../db/db');
const TABLES = require('../utils/tables');
const { uploadImage } = require('../utils/validation');
const fs = require('fs');
const path = require('path');



const createEvent = [
    uploadImage.single('event_image'),
    async (req, res) => {
        try {
            const { title, description, date, time, location, location_url, event_link, event_tags } = req.body;
            if (!title || !description) {
                return res.status(400).json({ error: 'event name is required' });
            }

            // Check if event already exists
            const [existingTags] = await db.query(`SELECT * FROM ${TABLES.EVENT_TABLE} WHERE title = ?`, [title]);
            if (existingTags.length > 0) {
                return res.status(400).json({ error: 'Event already exists' });
            }

            // Handle event image
            let event_image = null;
            if (req.file) {
              
                event_image = `/uploads/${req.file.filename}`;
            }

            // Insert new event with additional fields
            const sql = `INSERT INTO ${TABLES.EVENT_TABLE} (title, description, date, time, location, location_url, event_link, event_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            const [result] = await db.query(sql, [title, description, date, time, location, location_url, event_link, event_image]);

            // Handle event_tags: insert each tag into EVENT_TAGS table with event_id
            let tagsInserted = [];
            if (event_tags) {
                let tagsArray = event_tags;
                if (typeof event_tags === 'string') {
                    try {
                        tagsArray = JSON.parse(event_tags);
                    } catch (e) {
                        tagsArray = event_tags.split(',').map(t => t.trim());
                    }
                }
                if (Array.isArray(tagsArray)) {
                    for (const tag of tagsArray) {
                        if (tag && tag.length > 0) {
                            await db.query(`INSERT INTO ${TABLES.EVENT_TAGS} (event_id, event_tag) VALUES (?, ?)`, [result.insertId, tag]);
                            tagsInserted.push(tag);
                        }
                    }
                }
            }

            return res.status(201).json({ 
                message: 'event created successfully', 
                eventId: result.insertId,
                data: { title, description, date, time, location, location_url, event_link, event_image, event_tags: tagsInserted }
            });
        } catch (error) {
            console.error('Error creating event:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
];

const updateEvent = [
    uploadImage.single('event_image'),
    async (req, res) => {
        try {
            const eventId = req.params.id;
            if (!eventId) {
                return res.status(400).json({ error: 'Event ID is required' });
            }

            // Get current event data
            const [events] = await db.query(`SELECT * FROM ${TABLES.EVENT_TABLE} WHERE id = ?`, [eventId]);
            if (events.length === 0) {
                return res.status(404).json({ error: 'Event not found' });
            }
            const current = events[0];

            // Check for duplicate title (excluding this event)
            if (req.body.title) {
                const [existing] = await db.query(`SELECT * FROM ${TABLES.EVENT_TABLE} WHERE title = ? AND id != ?`, [req.body.title, eventId]);
                if (existing.length > 0) {
                    return res.status(400).json({ error: 'Event already exists' });
                }
            }

            // Prepare updated fields (keep old if not provided)
            const title = req.body.title || current.title;
            const description = req.body.description || current.description;
            const date = req.body.date || current.date;
            let time = req.body.time || current.time;
            // Clean up time if it has extra quotes (e.g. '"02:30 pm"')
            if (typeof time === 'string') {
                time = time.replace(/^"|"$/g, '').trim();
            }
            const location = req.body.location || current.location;
            const location_url = req.body.location_url || current.location_url;
            const event_link = req.body.event_link || current.event_link;
            let event_image = current.event_image;
            if (req.file) {
                event_image = `/uploads/${req.file.filename}`;
            }

            // Update event
            const sql = `UPDATE ${TABLES.EVENT_TABLE} SET title=?, description=?, date=?, time=?, location=?, location_url=?, event_link=?, event_image=? WHERE id=?`;
            await db.query(sql, [title, description, date, time, location, location_url, event_link, event_image, eventId]);

            // Handle event_tags update (optional)
            let tagsInserted = [];
            if (req.body.event_tags) {
                let tagsArray = req.body.event_tags;
                if (typeof tagsArray === 'string') {
                    try {
                        tagsArray = JSON.parse(tagsArray);
                    } catch (e) {
                        tagsArray = tagsArray.split(',').map(t => t.trim());
                    }
                }
                if (Array.isArray(tagsArray)) {
                    // Remove old tags for this event
                    await db.query(`DELETE FROM ${TABLES.EVENT_TAGS} WHERE event_id = ?`, [eventId]);
                    // Insert new tags
                    for (let tag of tagsArray) {
                        if (typeof tag === 'string') {
                            tag = tag.replace(/^\[?"?/, '').replace(/"?\]?$/, '');
                        }
                        tag = String(tag).trim();
                        if (tag.length > 0) {
                            await db.query(`INSERT INTO ${TABLES.EVENT_TAGS} (event_id, event_tag) VALUES (?, ?)`, [eventId, tag]);
                            tagsInserted.push(tag);
                        }
                    }
                }
            } else {
                // If not updating tags, keep old tags
                const [oldTags] = await db.query(`SELECT event_tag FROM ${TABLES.EVENT_TAGS} WHERE event_id = ?`, [eventId]);
                tagsInserted = oldTags.map(t => t.event_tag);
            }

            return res.status(200).json({
                message: 'event updated successfully',
                eventId,
                data: { title, description, date, time, location, location_url, event_link, event_image, event_tags: tagsInserted }
            });
        } catch (error) {
            console.error('Error updating event:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
];

const deleteEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        if (!eventId) {
            return res.status(400).json({ msg: 'EVENT ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.EVENT_TABLE} WHERE id = ? AND status = 1`, [eventId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'event not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.EVENT_TABLE} SET status = 0 WHERE id = ?`, [eventId]);
        res.status(200).json({ msg: 'event deleted successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const getEvents = async (req, res) => {
    try {
        const eventId = req.params.id;
        let sql, params;

        if (eventId) {
            sql = `SELECT * FROM ${TABLES.EVENT_TABLE} WHERE id = ? AND status = 1`;
            params = [eventId];
        } else {
            sql = `SELECT * FROM ${TABLES.EVENT_TABLE} WHERE status = 1`;
            params = [];
        }

        const [events] = await db.query(sql, params);

        if (eventId && events.length === 0) {
            return res.status(404).json({ msg: 'Event not found' });
        }

        // Helper to fetch tags for a single event
        async function getTagsForEvent(event_id) {
            const [tags] = await db.query(`SELECT event_tag FROM ${TABLES.EVENT_TAGS} WHERE event_id = ?`, [event_id]);
            return tags.map(t => t.event_tag);
        }
        // Helper to fetch registered user_ids for a single event
        async function getRegisteredUsers(event_id) {
            const [users] = await db.query(`SELECT user_id FROM ${TABLES.EVENT_ATTENDEES_TABLE} WHERE event_id = ?`, [event_id]);
            return users.map(u => u.user_id);
        }

        if (eventId) {
            const event = events[0];
            event.event_tags = await getTagsForEvent(event.id);
            event.user_registered_in_this_event = await getRegisteredUsers(event.id);
            return res.status(200).json(event);
        } else {
            // For all events, attach tags and registered users
            const eventsWithTags = await Promise.all(events.map(async (event) => {
                event.event_tags = await getTagsForEvent(event.id);
                event.user_registered_in_this_event = await getRegisteredUsers(event.id);
                return event;
            }));
            return res.status(200).json(eventsWithTags);
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

// Event registration API
const registerEvent = async (req, res) => {
    try {
     
         const user_id = req.user_id;
        const { event_id } = req.body;
        if (!user_id) {
            return res.status(401).json({ error: 'Unauthorized: user not found' });
        }
        if (!event_id) {
            return res.status(400).json({ error: 'event_id is required' });
        }

        // Check if event exists and is active
        const [events] = await db.query(`SELECT * FROM ${TABLES.EVENT_TABLE} WHERE id = ? AND status = 1`, [event_id]);
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if already registered
        const [already] = await db.query(`SELECT * FROM ${TABLES.EVENT_ATTENDEES_TABLE} WHERE user_id = ? AND event_id = ?`, [user_id, event_id]);
        if (already.length > 0) {
            return res.status(400).json({ error: 'Already registered for this event' });
        }

        // Register user for event
        await db.query(`INSERT INTO ${TABLES.EVENT_ATTENDEES_TABLE} (user_id, event_id) VALUES (?, ?)`, [user_id, event_id]);

        return res.status(201).json({ message: 'Registered for event successfully', user_id, event_id });
    } catch (error) {
        console.error('Error registering for event:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { createEvent, updateEvent, deleteEvent, getEvents, registerEvent };
