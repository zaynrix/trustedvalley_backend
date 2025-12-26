const express = require('express');
const router = express.Router();

// Simple in-memory store for requests (for testing)
const requests = [];

// Create a new request
router.post('/', (req, res) => {
  const { userId, title, description, priority } = req.body || {};
  if (!userId || !title) return res.status(400).json({ error: 'userId and title are required' });

  const newReq = {
    id: `req_${requests.length + 1}`,
    userId,
    title,
    description: description || '',
    priority: priority || 'normal',
    createdAt: new Date().toISOString()
  };

  requests.push(newReq);
  res.status(201).json({ request: newReq });
});

// (Optional) list requests
router.get('/', (req, res) => {
  res.json({ requests });
});

module.exports = router;
