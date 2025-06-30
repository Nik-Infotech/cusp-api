

const mysql = require('mysql2/promise');

require('dotenv').config();

const pool = mysql.createPool({

  host: process.env.DB_HOST || 'localhost',
 

 
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME || 'cusp',
  waitForConnections: true,

  connectTimeout: process.env.DB_CONNECT_TIMEOUT || 20000, // 10 seconds timeout
  
});


const testDbConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1);
  }
};

testDbConnection();

module.exports = pool;
