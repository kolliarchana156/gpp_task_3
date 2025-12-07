const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    user: 'postgres',        // Default superuser
    host: 'localhost',       // Your computer
    database: 'postgres',    // Default system DB
    password: 'password',    // <--- The password you set during install
    port: 5432,
});

async function initDB() {
    try {
        await client.connect();
        // Read the schema.sql file
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql')).toString();
        // Run the SQL to create tables
        await client.query(sql);
        console.log("✅ Database tables created successfully!");
    } catch (err) {
        console.error("❌ Error initializing database:", err);
    } finally {
        await client.end();
    }
}

initDB();