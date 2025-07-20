const db = require('../db/db');
const TABLES = require('../utils/tables');

const submitPractice = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      siteSize,
      dentalChairs,
      practiceType,
      interiorFinish,
      locationType,
      locationOther,
      unitCondition,
      equipmentCondition,
      equipmentNeeded,
      specialistEquipment
    } = req.body;

    // Validate required fields
    if (
      !name || !email || !phone || !siteSize || !dentalChairs ||
      !practiceType || !interiorFinish || !locationType || !locationOther ||
      !unitCondition || !equipmentCondition ||
      !equipmentNeeded || !specialistEquipment
    ) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Convert to comma-separated strings for DB
    const equipmentNeededStr = Array.isArray(equipmentNeeded) ? equipmentNeeded.join(',') : equipmentNeeded;
    const specialistEquipmentStr = Array.isArray(specialistEquipment) ? specialistEquipment.join(',') : specialistEquipment;

    // At least one item required
    if (!equipmentNeededStr.trim() || !specialistEquipmentStr.trim()) {
      return res.status(400).json({ error: 'equipmentNeeded and specialistEquipment must contain at least one item' });
    }

    const query = `
      INSERT INTO ${TABLES.CALCULATOR_TABLE} (
        name, email, phone, siteSize, dentalChairs,
        practiceType, interiorFinish, locationType, locationOther,
        unitCondition, equipmentCondition, equipmentNeeded, specialistEquipment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name, email, phone, siteSize, dentalChairs,
      practiceType, interiorFinish, locationType, locationOther,
      unitCondition, equipmentCondition, equipmentNeededStr, specialistEquipmentStr
    ];

    await db.query(query, values);

    // ✅ Return proper response object
    return res.status(201).json({
      message: 'Practice data submitted successfully',
      data: {
        name,
        email,
        phone,
        siteSize,
        dentalChairs,
        practiceType,
        interiorFinish,
        locationType,
        locationOther,
        unitCondition,
        equipmentCondition,
        equipmentNeeded: equipmentNeededStr.split(',').map(item => item.trim()),
        specialistEquipment: specialistEquipmentStr.split(',').map(item => item.trim())
      }
    });
  } catch (error) {
    console.error('Error inserting practice info:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const getsubmitPractice = async (req, res) => {
  try {
    const { id } = req.params;

    let query = `SELECT * FROM ${TABLES.CALCULATOR_TABLE}`;
    let values = [];

    if (id) {
      query += ' WHERE id = ?';
      values.push(id);
    }

    const [rows] = await db.query(query, values);

    if (id && rows.length === 0) {
      return res.status(404).json({ error: 'No record found for the given ID' });
    }

    const formatted = rows.map(row => ({
      name: row.name,
      email: row.email,
      phone: row.phone,
      siteSize: row.siteSize,
      dentalChairs: row.dentalChairs,
      practiceType: row.practiceType,
      interiorFinish: row.interiorFinish,
      locationType: row.locationType,
      locationOther: row.locationOther,
      unitCondition: row.unitCondition,
      equipmentCondition: row.equipmentCondition,
      equipmentNeeded: row.equipmentNeeded ? row.equipmentNeeded.split(',').map(e => e.trim()) : [],
      specialistEquipment: row.specialistEquipment ? row.specialistEquipment.split(',').map(e => e.trim()) : []
    }));

    return res.status(200).json(id ? formatted[0] : formatted);

  } catch (error) {
    console.error('Error fetching practice info:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {submitPractice, getsubmitPractice};
