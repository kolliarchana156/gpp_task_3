# 🚀 Scalable Social Media Feed API

![Node.js](https://img.shields.io/badge/Node.js-v14+-green?style=flat&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v13+-blue?style=flat&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-v5+-red?style=flat&logo=redis)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

A high-performance backend API designed to handle *read-heavy* social media workloads. This system implements the *Fan-Out-On-Write* architecture pattern to deliver near-instant feed retrieval using *Redis Caching, alongside **Cursor-Based Pagination* for infinite scrolling and *ACID transactions* for data integrity.

---

## 📑 Table of Contents
- [Architecture & Design](#-architecture--design)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Future Improvements](#-future-improvements)

---

## 🏗 Architecture & Design

This system solves the "Celebrity Problem" and slow feed loading times by shifting the computational cost from *Read time* to *Write time*.

![System Architecture](architecture.png)

### Key Design Decisions:
1.  *Fan-Out-On-Write (Push Model):*
    * When a user creates a post, the system asynchronously "pushes" the Post ID to the Redis cache of all their followers.
    * *Trade-off:* Slower write (post creation) for lightning-fast reads (feed loading).
2.  *Redis Sorted Sets (ZSET):*
    * Used to store user feeds.
    * *Score:* Unix Timestamp (for sorting).
    * *Value:* Post ID.
    * Allows efficient range queries (ZREVRANGEBYSCORE) for pagination.
3.  *Cursor-Based Pagination:*
    * Unlike OFFSET pagination, this remains stable even if new posts are added while a user is scrolling.
    * We use the timestamp of the last seen post as the cursor.
4.  *Denormalization & Transactions:*
    * Counters like follower_count and like_count are stored on the tables to avoid expensive COUNT(*) queries.
    * Updates are wrapped in *SQL Transactions* to ensure data consistency.

---

## ✨ Features

* *Authentication:* User registration and management.
* *Social Graph:* Follow/Unfollow users with transactional integrity.
* *Post Broadcasting:* Posts are instantly distributed to followers' caches.
* *Smart Feed:* Personalized feed retrieval with <50ms latency.
* *Infinite Scroll:* Optimized pagination using cursors.
* *Interactions:* Like/Unlike posts with real-time counter updates.
* *Compatibility:* Custom Redis implementation to support both Windows (Redis 5) and Linux environments.

---

## 🛠 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| *Runtime* | Node.js | Backend logic execution |
| *Framework* | Express.js | REST API routing and middleware |
| *Database* | PostgreSQL | Primary source of truth (Relational Data) |
| *Cache* | Redis | In-memory store for feeds (Speed Layer) |
| *Client Libs* | pg, redis | Database drivers |

---

## 📂 Project Structure


social-feed-api/

├── src/

│   ├── config/

│   │   ├── db.js           # PostgreSQL Connection Pool

│   │   └── redisClient.js  # Redis Client Configuration

│   ├── controllers/

│   │   ├── userController.js # Auth & Follow Logic

│   │   └── postController.js # Post, Like, & Feed Logic (Fan-out)

│   ├── routes/

│   │   ├── authRoutes.js

│   │   ├── userRoutes.js

│   │   └── postRoutes.js

│   └── index.js            # Entry Point

├── .env.example            # Environment variables template

├── init-db.js              # Database Initialization Script

├── schema.sql              # SQL Schema definitions

├── package.json            # Dependencies

└── README.md               # Documentation

---


🚀 Getting Started

Prerequisites
Ensure you have the following running locally:
Node.js (v14+)
PostgreSQL (Port 5432)
Redis (Port 6379)

Installation Steps
1. Clone the repository:
```bash
clone [https://github.com/yourusername/social-feed-api.git](https://github.com/yourusername/social-feed-api.git)
cd social-feed-api
```
2. Install dependencies:
```bash
npm install
```

3. Configure Environment:
Create a `.env` file or update `src/config/db.js` with your DB credentials.

4. Initialize Database:
Run the script to create tables and indexes.
```bash
node init-db.js
```

Output should be: `✅ Database tables created successfully!`


5. Run the Server:
```bash
npm run dev
# OR
node src/index.js
```


🔐 Environment Variables
Create a `.env` file in the root directory:
```bash
PORT=3000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
REDIS_URL=redis://localhost:6379
```

🔮 Future Improvements
Hybrid Feed: Implement "Pull" model for celebrity users (users with >1M followers) to prevent Redis write bottlenecks.
Job Queue: Move the fan-out process to a background queue (e.g., BullMQ) for better reliability.
WebSockets: Real-time notification when a new post arrives.