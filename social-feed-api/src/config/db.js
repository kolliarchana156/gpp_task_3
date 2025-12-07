const { Pool } = require('pg');

// Create a connection pool (efficiently manages multiple connections)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',  // We created the tables in the default DB
    password: 'password',  // <--- YOUR PASSWORD HERE
    port: 5432,
});

// Test the connection when the app starts
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error acquiring client', err.stack);
    }
    console.log('✅ Connected to PostgreSQL database');
    release();
});

module.exports = pool;