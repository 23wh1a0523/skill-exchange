const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'skill_user',
    password: 'Pravallika@26', // Replace with your MySQL password
    database: 'skill_exchange',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = pool;