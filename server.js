require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

// API to get items by category
app.get('/api/items/:category', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('cat', sql.NVarChar, req.params.category)
            .query("SELECT * FROM items WHERE category = @cat");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(3000, () => console.log('Backend running on http://localhost:3000'));