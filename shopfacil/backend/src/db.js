const mysql = require('mysql2');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root123',
      database: process.env.DB_NAME || 'shopfacil',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10
    };

const pool = mysql.createPool(poolConfig);

module.exports = pool.promise();
