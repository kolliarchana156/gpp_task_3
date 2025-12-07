const db = require('../config/db');
const redisClient = require('../config/redisClient');

// POST /posts
exports.createPost = async (req, res) => {
    const { user_id, content } = req.body;

    try {
        const result = await db.query(
            'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *',
            [user_id, content]
        );
        const newPost = result.rows[0];

        // Fan-out
        const followers = await db.query(
            'SELECT follower_id FROM follows WHERE following_id = $1',
            [user_id]
        );

        const timestamp = Date.now();
        for (const row of followers.rows) {
            const feedKey = `feed:${row.follower_id}`;
            await redisClient.zAdd(feedKey, {
                score: timestamp,
                value: newPost.id.toString()
            });
        }

        res.status(201).json({
            message: "Post created and pushed to followers!",
            post: newPost
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
};

// POST /posts/:id/like
exports.likePost = async (req, res) => {
    const postId = req.params.id;
    const { user_id } = req.body;

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const insertLike = await client.query(
            'INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [user_id, postId]
        );

        if (insertLike.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "You already liked this post" });
        }

        await client.query(
            'UPDATE posts SET like_count = like_count + 1 WHERE id = $1',
            [postId]
        );

        await client.query('COMMIT');
        res.json({ message: "Post liked successfully! ❤️" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Database error" });
    } finally {
        client.release();
    }
};

// GET /posts/feed (WINDOWS/REDIS 5.0 COMPATIBLE)
// GET /posts/feed (UNIVERSAL FIX)
exports.getFeed = async (req, res) => {
    console.log("--- EXECUTING UNIVERSAL FIX ---"); 
    
    const userId = req.query.user_id;
    const cursor = req.query.cursor || '+inf'; 

    if (!userId) {
        return res.status(400).json({ error: "Missing user_id" });
    }

    try {
        const feedKey = `feed:${userId}`;

        // FIX: We manually send the raw command to support Windows Redis 5.0
        // Command: ZREVRANGEBYSCORE key max min LIMIT offset count
        const postIds = await redisClient.sendCommand([
            'ZREVRANGEBYSCORE', 
            feedKey, 
            cursor, 
            '-inf', 
            'LIMIT', 
            '0', 
            '10'
        ]);

        if (postIds.length === 0) {
            return res.json({ feed: [], nextCursor: null });
        }

        const numericIds = postIds.map(id => parseInt(id, 10));

        const queryText = `
            SELECT p.id, p.content, u.username, p.created_at, 
                   EXTRACT(EPOCH FROM p.created_at) * 1000 as timestamp_ms
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ANY($1::int[])
            ORDER BY p.created_at DESC
        `;
        
        const result = await db.query(queryText, [numericIds]);

        const lastItem = result.rows[result.rows.length - 1];
        const nextCursor = lastItem ? lastItem.timestamp_ms : null;

        res.json({ 
            feed: result.rows,
            nextCursor: nextCursor 
        });

    } catch (err) {
        console.error("Feed Error:", err);
        res.status(500).json({ error: "Error fetching feed" });
    }
};