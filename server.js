require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_SERVER || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "traceback_db",
    waitForConnections: true,
    connectionLimit: 10
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT 1 FROM admin WHERE admin_username=? AND admin_password=?",
            [username, password]
        );
        if (!rows.length) return res.status(401).json({ success: false });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/items/:type", async (req, res) => {
    const map = {
        Current: "current_items",
        Found: "claimed_items",
        Discarded: "discarded_items"
    };

    const table = map[req.params.type];
    if (!table) return res.status(400).json({ error: "Invalid type" });

    try {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/items/add", async (req, res) => {
    const { name, desc, student_id, date, location, category } = req.body;
    try {
        await pool.query(
            `INSERT INTO current_items 
            (Item_Name, Item_Desc, Location_ID_FK, Date_Found, Category_Name, Student_ID_FK) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [name, desc, location, date, category, student_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to add item: " + err.message });
    }
});

app.post("/api/items/restore/:id", async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let [rows] = await conn.query("SELECT * FROM claimed_items WHERE Item_ID_FK = ?", [id]);
        let sourceTable = "claimed_items";

        if (!rows.length) {
            [rows] = await conn.query("SELECT * FROM discarded_items WHERE Item_ID_FK = ?", [id]);
            sourceTable = "discarded_items";
        }

        if (!rows.length) throw new Error("Item not found in archives");
        const item = rows[0];

        await conn.query(
            `INSERT INTO current_items 
            (Item_Name, Item_Desc, Location_ID_FK, Category_Name, Date_Found, Student_ID_FK)
            VALUES (?, ?, ?, ?, NOW(), ?)`,
            [
                item.Item_Name,
                item.Item_Desc,
                item.Location_ID_FK,
                item.Category_Name,
                item.Student_ID_FK
            ]
        );

        await conn.query(`DELETE FROM ${sourceTable} WHERE Item_ID_FK = ?`, [id]);

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        console.error("Restore Error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

app.post("/api/items/found/:id", async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.body;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();
        const [rows] = await conn.query("SELECT * FROM current_items WHERE Item_ID_PK=?", [id]);
        if (!rows.length) throw new Error("Item not found");
        const item = rows[0];

        await conn.query(
            `INSERT INTO claimed_items
            (Student_ID_FK, Received_Time, Item_ID_FK, Item_Name, Item_Desc, Location_ID_FK, Category_Name)
            VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
            [student_id, id, item.Item_Name, item.Item_Desc, item.Location_ID_FK, item.Category_Name]
        );

        await conn.query("DELETE FROM current_items WHERE Item_ID_PK=?", [id]);
        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

app.post("/api/items/discard/:id", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();
        const [rows] = await conn.query("SELECT * FROM current_items WHERE Item_ID_PK=?", [id]);
        if (!rows.length) throw new Error("Item not found");
        const item = rows[0];

        await conn.query(
            `INSERT INTO discarded_items
            (Item_ID_FK, Discard_Date, Discard_Reason, Item_Name, Item_Desc, Location_ID_FK, Category_Name)
            VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
            [id, reason || "No reason", item.Item_Name, item.Item_Desc, item.Location_ID_FK, item.Category_Name]
        );

        await conn.query("DELETE FROM current_items WHERE Item_ID_PK=?", [id]);
        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

app.post("/api/items/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM current_items WHERE Item_ID_PK=?", [id]);
        await pool.query("DELETE FROM claimed_items WHERE Item_ID_FK=?", [id]);
        await pool.query("DELETE FROM discarded_items WHERE Item_ID_FK=?", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/locations", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT Location_ID_PK FROM location ORDER BY Location_ID_PK ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("🚀 Server fixed and running on http://localhost:3000");
});