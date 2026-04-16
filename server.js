require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// =====================
// GLOBAL REQUEST DEBUG
// =====================
app.use((req, res, next) => {
    console.log("\n====================");
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log("BODY:", req.body);
    console.log("====================\n");
    next();
});

// =====================
// DB POOL
// =====================
const pool = mysql.createPool({
    host: process.env.DB_SERVER || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "traceback_db",
    port: 3306, 
    waitForConnections: true,
    connectionLimit: 10
});

console.log("🚀 DB CONFIG LOADED:", {
    host: process.env.DB_SERVER || "localhost",
    user: process.env.DB_USER || "root",
    database: process.env.DB_NAME || "traceback_db"
});

// =====================
// LOGIN (DEBUG MODE)
// =====================
app.post("/api/login", async (req, res) => {
    let { username, password } = req.body;

    console.log("🔐 LOGIN ATTEMPT:", { username, password });

    try {
        const [rows] = await pool.query(
            `SELECT * FROM admin 
             WHERE admin_username = ? 
             AND admin_password = ?`,
            [username?.trim(), password?.trim()]
        );

        console.log("🧾 LOGIN QUERY RESULT:", rows);

        if (!rows.length) {
            console.log("❌ LOGIN FAILED");
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        console.log("✅ LOGIN SUCCESS");
        res.json({ success: true });

    } catch (err) {
        console.error("🔥 LOGIN ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// =====================
// GET ITEMS
// =====================
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
        console.error("GET ITEMS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// =====================
// ADD ITEM
// =====================
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
        console.error("ADD ITEM ERROR:", err);
        res.status(500).json({
            error: "Failed to add item",
            details: err.message
        });
    }
});

// =====================
// RESTORE ITEM
// =====================
app.post("/api/items/restore/:id", async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        let [rows] = await conn.query(
            "SELECT * FROM claimed_items WHERE Item_ID_FK = ?",
            [id]
        );

        let sourceTable = "claimed_items";

        if (!rows.length) {
            [rows] = await conn.query(
                "SELECT * FROM discarded_items WHERE Item_ID_FK = ?",
                [id]
            );
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

        await conn.query(
            `DELETE FROM \`${sourceTable}\` WHERE Item_ID_FK = ?`,
            [id]
        );

        await conn.commit();

        console.log("♻ RESTORE SUCCESS");
        res.json({ success: true });

    } catch (err) {
        await conn.rollback();
        console.error("🔥 RESTORE ERROR:", err);
        res.status(500).json({ error: err.message });

    } finally {
        conn.release();
    }
});

// =====================
// FOUND ITEM
// =====================
app.post("/api/items/found/:id", async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.body;

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            "SELECT * FROM current_items WHERE Item_ID_PK = ?",
            [id]
        );

        if (!rows.length) throw new Error("Item not found");

        const item = rows[0];

        await conn.query(
            `INSERT INTO claimed_items
            (Student_ID_FK, Received_Time, Item_ID_FK, Item_Name, Item_Desc, Location_ID_FK, Category_Name)
            VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
            [
                student_id,
                id,
                item.Item_Name,
                item.Item_Desc,
                item.Location_ID_FK,
                item.Category_Name
            ]
        );

        await conn.query(
            "DELETE FROM current_items WHERE Item_ID_PK = ?",
            [id]
        );

        await conn.commit();

        console.log("✅ ITEM CLAIMED");
        res.json({ success: true });

    } catch (err) {
        await conn.rollback();
        console.error("🔥 FOUND ERROR:", err);
        res.status(500).json({ error: err.message });

    } finally {
        conn.release();
    }
});

// =====================
// DISCARD ITEM
// =====================
app.post("/api/items/discard/:id", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            "SELECT * FROM current_items WHERE Item_ID_PK = ?",
            [id]
        );

        if (!rows.length) throw new Error("Item not found");

        const item = rows[0];

        await conn.query(
            `INSERT INTO discarded_items
            (Item_ID_FK, Discard_Date, Discard_Reason, Item_Name, Item_Desc, Location_ID_FK, Category_Name)
            VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
            [
                id,
                reason || "No reason",
                item.Item_Name,
                item.Item_Desc,
                item.Location_ID_FK,
                item.Category_Name
            ]
        );

        await conn.query(
            "DELETE FROM current_items WHERE Item_ID_PK = ?",
            [id]
        );

        await conn.commit();

        console.log("🗑 ITEM DISCARDED");
        res.json({ success: true });

    } catch (err) {
        await conn.rollback();
        console.error("🔥 DISCARD ERROR:", err);
        res.status(500).json({ error: err.message });

    } finally {
        conn.release();
    }
});

// =====================
// DELETE ITEM
// =====================
app.post("/api/items/delete/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("DELETE FROM current_items WHERE Item_ID_PK = ?", [id]);
        await pool.query("DELETE FROM claimed_items WHERE Item_ID_FK = ?", [id]);
        await pool.query("DELETE FROM discarded_items WHERE Item_ID_FK = ?", [id]);

        console.log("❌ ITEM DELETED");
        res.json({ success: true });

    } catch (err) {
        console.error("🔥 DELETE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// =====================
// LOCATIONS
// =====================
app.get("/api/locations", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT Location_ID_PK FROM location ORDER BY Location_ID_PK ASC"
        );

        res.json(rows);

    } catch (err) {
        console.error("LOCATIONS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// =====================
// START SERVER
// =====================
app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});