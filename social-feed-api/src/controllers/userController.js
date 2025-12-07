const db = require('../config/db');

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 1. Check if user already exists
        const checkUser = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // 2. Insert the new user
        // (Note: In a real app, we would hash the password here!)
        const result = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, password]
        );

        // 3. Send back the new user info
        res.status(201).json({
            message: "User registered successfully!",
            user: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
};
// POST /users/follow
exports.followUser = async (req, res) => {
    // In a real app, follower_id comes from the token (req.user.id)
    // For testing, we send both IDs in the body
    const { follower_id, following_id } = req.body;

    if (follower_id === following_id) {
        return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const client = await db.connect(); // Get a dedicated client for transaction

    try {
        await client.query('BEGIN'); // Start Transaction

        // 1. Insert into follows table
        // ON CONFLICT DO NOTHING handles if they click follow twice
        const insertRes = await client.query(
            'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [follower_id, following_id]
        );

        if (insertRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Already following this user" });
        }

        // 2. Increment follower's "following_count"
        await client.query(
            'UPDATE users SET following_count = following_count + 1 WHERE id = $1',
            [follower_id]
        );

        // 3. Increment target's "follower_count"
        await client.query(
            'UPDATE users SET follower_count = follower_count + 1 WHERE id = $1',
            [following_id]
        );

        await client.query('COMMIT'); // Commit Transaction
        res.json({ message: "Followed successfully!" });

    } catch (err) {
        await client.query('ROLLBACK'); // Undo everything if error
        console.error(err);
        res.status(500).json({ error: "Database error" });
    } finally {
        client.release(); // Release client back to pool
    }
};