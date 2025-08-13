const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 80;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(express.json());
app.use(express.static('public'));

async function waitForDatabase(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('Database is reachable');
      return;
    } catch (err) {
      console.log(`Waiting for DB... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Could not connect to database after retries');
}

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS votes (
        animal VARCHAR(10) PRIMARY KEY,
        count INT DEFAULT 0
      )
    `);
    await connection.query(`
      INSERT IGNORE INTO votes (animal, count)
      VALUES ('cat', 0), ('dog', 0)
    `);
    connection.release();
    console.log('Table "votes" is ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

(async () => {
  try {
    await waitForDatabase();
    await initializeDatabase();

    app.listen(port, '0.0.0.0', () => {
      console.log(` Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
})();

app.post('/vote/:animal', async (req, res) => {
  const animal = req.params.animal.toLowerCase();
  if (!['cat', 'dog'].includes(animal)) {
    return res.status(400).send('Invalid animal');
  }
  try {
    const connection = await pool.getConnection();
    await connection.query('UPDATE votes SET count = count + 1 WHERE animal = ?', [animal]);
    connection.release();
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/votes', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM votes');
    connection.release();
    const result = {};
    rows.forEach(row => {
      result[row.animal] = row.count;
    });
    res.json(result);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
