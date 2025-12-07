const redis = require('redis');

// Create a Redis client
const client = redis.createClient({
    url: 'redis://localhost:6379' // Default URL for local Redis
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
    if (!client.isOpen) {
        await client.connect();
        console.log('✅ Connected to Redis Cache');
    }
}

connectRedis();

module.exports = client;