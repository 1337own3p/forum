const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// SQLite Database Setup
const db = new sqlite3.Database('./forum.db', (err) => {
  if (err) {
    console.error('Database opening error: ', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Create posts table
    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create comments table
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )
    `);
  });
}

// API Endpoints

// Get all posts
app.get('/api/posts', (req, res) => {
  db.all('SELECT * FROM posts ORDER BY created_at DESC', (err, posts) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(posts);
    }
  });
});

// Get single post with comments
app.get('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!post) {
      res.status(404).json({ error: 'Post not found' });
    } else {
      db.all('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC', [postId], (err, comments) => {
        post.comments = comments || [];
        res.json(post);
      });
    }
  });
});

// Create new post
app.post('/api/posts', (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  db.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', [title, content, author], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, message: 'Post created successfully' });
    }
  });
});

// Add comment to post
app.post('/api/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  const { content, author } = req.body;
  
  if (!content || !author) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run('INSERT INTO comments (post_id, content, author) VALUES (?, ?, ?)', [postId, content, author], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, message: 'Comment added successfully' });
    }
  });
});

// Delete post
app.delete('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  db.run('DELETE FROM posts WHERE id = ?', [postId], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, message: 'Post deleted successfully' });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎉 Forum server is running at http://localhost:${PORT}`);
  console.log(`📋 Visit http://localhost:${PORT} in your browser to see the forum`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
