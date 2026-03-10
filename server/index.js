require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const { initDb } = require('./db');
const logsRouter = require('./routes/logs');
const parametersRouter = require('./routes/parameters');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/logs', logsRouter);
app.use('/api/parameters', parametersRouter);
app.use('/api', adminRouter);

if (isProd) {
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
