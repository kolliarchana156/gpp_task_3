

### 1\. `README.md` Content

````markdown
# Social Media Feed API

A scalable REST API for a social media feed system, built with Node.js, PostgreSQL, and Redis. This system implements a **Fan-Out-On-Write** architecture to ensure low-latency feed retrieval and uses **Cursor-Based Pagination** for efficient scrolling.

## 🚀 Key Features
- **User Management**: Register users and follow/unfollow functionality.
- **Post System**: Create posts and "Like" posts with real-time counter updates.
- **High-Performance Feed**: Personalized feeds generated via a "Push" model to Redis.
- **Scalability**:
  - **Caching**: Redis Sorted Sets for O(1) feed retrieval.
  - **Database**: Denormalized counters (`like_count`, `follower_count`) for fast reads.
  - **Concurrency**: ACID transactions ensure data integrity for likes and follows.

---

## 🛠️ Architecture & Design Decisions

### 1. Feed Generation Algorithm: Fan-Out-On-Write (Push Model)
I chose the **Fan-Out-On-Write** approach to optimize for read-heavy workloads (social media typically has a 100:1 read-to-write ratio).

* **How it works**: When a user creates a post, the system performs an asynchronous task that identifies all followers of that user and pushes the new Post ID into their specific feed lists in the cache.
* **Trade-off**: This increases the time taken to *write* a post (Write Latency) but guarantees near-instant access when users load their feed (Read Latency).

### 2. Caching Strategy
* **Technology**: Redis
* **Data Structure**: **Sorted Set (`ZSET`)**
* **Why?**: Feeds require strict chronological ordering. `ZSET` allows us to store the `post_id` as the value and the `timestamp` as the score.
    * **Retrieval**: We use `ZREVRANGE` to instantly fetch the "Top 10" newest posts.
    * **Pagination**: We use `ZREVRANGEBYSCORE` to fetch posts older than a specific timestamp (cursor).

### 3. Database Schema & Denormalization
The system uses **PostgreSQL** as the source of truth. To avoid expensive `COUNT(*)` queries on every page load, I implemented **Denormalization**:
* `users` table: Stores `follower_count` and `following_count`.
* `posts` table: Stores `like_count` and `comment_count`.
* **Consistency**: These counters are updated using **Atomic Database Transactions**. If a user likes a post, the row insertion into `likes` and the increment on `posts` happen together or fail together.

---

## 🏗️ Architecture Diagram

```mermaid
graph TD
    User[Client / Mobile App] -->|HTTP Requests| API[Node.js API Server]
    
    subgraph "Write Path (Create Post)"
    API -->|1. Save Post| DB[(PostgreSQL)]
    API -->|2. Fetch Followers| DB
    API -->|3. Fan-Out (Push ID)| Redis[(Redis Cache)]
    end
    
    subgraph "Read Path (Get Feed)"
    API -->|1. Get Post IDs| Redis
    API -->|2. Hydrate Content| DB
    end
````

-----

## ⚙️ Setup & Installation

### Prerequisites

  * Node.js (v14+)
  * PostgreSQL (v12+)
  * Redis (v5+)

### 1\. Clone the Repository

```bash
git clone <repository_url>
cd social-feed-api
```

### 2\. Install Dependencies

```bash
npm install
```

### 3\. Environment Configuration

Create a `.env` file in the root directory and configure your database credentials. You can copy the example file:

```bash
cp .env.example .env
```

### 4\. Database Initialization

Run the initialization script to create the required tables (`users`, `posts`, `follows`, `likes`) and indexes.

```bash
node init-db.js
```

### 5\. Run the Application

```bash
# Development mode (restarts on changes)
npm run dev

# Production mode
node src/index.js
```

The server will start on `http://localhost:3000`.

-----

## 🧪 API Documentation

### Authentication

  * **POST** `/auth/register`
      * Body: `{ "username": "alice", "email": "alice@ex.com", "password": "123" }`

### User Operations

  * **POST** `/users/follow`
      * Body: `{ "follower_id": 1, "following_id": 2 }`

### Post Operations

  * **POST** `/posts`
      * Body: `{ "user_id": 2, "content": "Hello World" }`
  * **POST** `/posts/:id/like`
      * Body: `{ "user_id": 1 }`

### Feed Retrieval

  * **GET** `/posts/feed`
      * Query Params: `user_id` (required), `cursor` (optional timestamp)
      * Example: `GET /posts/feed?user_id=1&cursor=1715000000`
      * Response:
        ```json
        {
          "feed": [ ...list of posts... ],
          "nextCursor": 1714999000
        }
        ```

-----

## 📂 Project Structure

```
social-feed-api/
├── src/
│   ├── config/         # DB and Redis connection logic
│   ├── controllers/    # Business logic (Feed, Auth, Posts)
│   ├── routes/         # API Endpoint definitions
│   └── index.js        # App Entry point
├── init-db.js          # Database setup script
├── schema.sql          # SQL Schema definition
├── .env.example        # Environment variable template
└── package.json        # Dependencies
```

````

---

### 2. `.env.example` Content
*(Create a file named `.env.example` and paste this inside)*

```ini
# Server Configuration
PORT=3000
NODE_ENV=development

# PostgreSQL Database Configuration
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres

# Redis Cache Configuration
REDIS_URL=redis://localhost:6379
````