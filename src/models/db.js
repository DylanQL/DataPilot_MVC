const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');

const MySQLStore = MySQLStoreFactory(session);

const dbConfig = {
  host: process.env.MYSQL_ADDON_HOST,
  port: Number(process.env.MYSQL_ADDON_PORT || 3306),
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  timezone: '-05:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

if (pool.pool && typeof pool.pool.on === 'function') {
  pool.pool.on('connection', (connection) => {
    connection.query("SET time_zone = '-05:00'");
  });
}

const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 24 * 60 * 60 * 1000,
    createDatabaseTable: true,
    schema: {
      tableName: 'app_sessions'
    }
  },
  pool
);

module.exports = {
  pool,
  sessionStore
};
