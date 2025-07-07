const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const dotenv = require("dotenv")

const app = express();
const PORT = 3001;
dotenv.config()

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ✅ Add ticket to cart with quantity = 1
app.post("/cart", async (req, res) => {
    try {
        const { userId, artistName, price, ticketType } = req.body;
        await pool.query(
            "INSERT INTO cart(user_id, artist_name, price, ticket_type, quantity) VALUES ($1, $2, $3, $4, $5)",
            [userId, artistName, price, ticketType, 1]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Add Ticket Error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// ✅ Get grouped cart
app.get("/cart/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT MIN(id) as id, artist_name, price, ticket_type, SUM(quantity) as quantity
             FROM cart
             WHERE user_id = $1
             GROUP BY artist_name, price, ticket_type`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get Cart Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Get cart count
app.get("/cart/:userId/count", async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            "SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = $1",
            [userId]
        );
        res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        console.error("Cart Count Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Update quantity
app.put("/cart/:userId/update", async (req, res) => {
    const { userId } = req.params;
    const { itemId, quantity } = req.body;

    try {
        if (quantity <= 0) {
            await pool.query("DELETE FROM cart WHERE id = $1 AND user_id = $2", [itemId, userId]);
        } else {
            await pool.query("UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3", [quantity, itemId, userId]);
        }

        const updated = await pool.query(
            `SELECT MIN(id) as id, artist_name, price, ticket_type, SUM(quantity) as quantity
             FROM cart
             WHERE user_id = $1
             GROUP BY artist_name, price, ticket_type`,
            [userId]
        );
        res.json(updated.rows);
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Delete cart item
app.delete("/cart/:userId/delete/:itemId", async (req, res) => {
    const { userId, itemId } = req.params;
    try {
        await pool.query("DELETE FROM cart WHERE id = $1 AND user_id = $2", [itemId, userId]);

        const updated = await pool.query(
            `SELECT MIN(id) as id, artist_name, price, ticket_type, SUM(quantity) as quantity
             FROM cart
             WHERE user_id = $1
             GROUP BY artist_name, price, ticket_type`,
            [userId]
        );
        res.json(updated.rows);
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Checkout and save to ticket history
app.post("/cart/:userId/checkout", async (req, res) => {
    const { userId } = req.params;
    try {
        const cartResult = await pool.query(
            "SELECT artist_name, price, ticket_type, quantity FROM cart WHERE user_id = $1",
            [userId]
        );
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        for (let item of cartItems) {
            for (let i = 0; i < item.quantity; i++) {
                await pool.query(
                    "INSERT INTO tickets(user_id, price, ticket_type, concert_date, artist_name) VALUES ($1, $2, $3, NOW(), $4)",
                    [userId, item.price.toString(), item.ticket_type, item.artist_name]
                );
            }
        }

        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);

        res.json({ success: true, total });
    } catch (err) {
        console.error("Checkout Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Get ticket history
app.get("/history/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM tickets WHERE user_id = $1 ORDER BY concert_date DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("History Get Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Delete a ticket from history
app.delete("/history/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM tickets WHERE id = $1", [id]);
        res.sendStatus(200);
    } catch (err) {
        console.error("History Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
