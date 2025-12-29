require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { middleware: i18nMiddleware } = require('./src/utils/i18n');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// i18n middleware (must be before routes)
app.use(i18nMiddleware);

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/requests', require('./src/routes/requests'));
// Content routes (serving migrated Firestore admin content)
app.use('/api/content', require('./src/routes/content'));
// User routes (profile endpoints)
app.use('/api/users', require('./src/routes/users'));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend is running! 🚀',
    timestamp: new Date(),
    kafka: 'Ready'
  });
});

// Error handling: map known errors to statuses and return structured JSON
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const message = (err && err.message) ? err.message : String(err);
  const { translate } = require('./src/utils/i18n');

  // Auth and validation errors (use translations)
  if (message.includes('email-already-in-use')) {
    return res.status(409).json({ 
      error: 'email-already-in-use', 
      message: translate(req, 'errors.email-already-in-use') 
    });
  }
  if (message.startsWith('weak-password')) {
    const customMessage = message.split(':').slice(1).join(':').trim();
    return res.status(400).json({ 
      error: 'weak-password', 
      message: customMessage || translate(req, 'errors.weak-password') 
    });
  }
  if (message.includes('invalid-email')) {
    return res.status(400).json({ 
      error: 'invalid-email', 
      message: translate(req, 'errors.invalid-email') 
    });
  }
  if (message.includes('postgres-required')) {
    return res.status(500).json({ 
      error: 'postgres-required', 
      message: translate(req, 'errors.postgres-required') 
    });
  }

  // Fallback
  res.status(500).json({ 
    error: 'something-went-wrong', 
    message: translate(req, 'errors.something-went-wrong') 
  });
});

const PORT = process.env.PORT || 3000;

// Start server and handle common listen errors (EADDRINUSE)
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Kafka Broker: ${process.env.KAFKA_BROKER || 'localhost:9092'}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Choose a different PORT or stop the process using it.`);
    // Optional: exit with non-zero code so supervisors know it failed
    process.exit(1);
  }
  // Re-throw other errors so they are handled by the global handler
  throw err;
});