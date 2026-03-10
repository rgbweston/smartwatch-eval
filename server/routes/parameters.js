const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/parameters — list all parameter definitions
router.get('/', (req, res) => {
  const params = db.prepare('SELECT * FROM parameter_defs ORDER BY created_at ASC').all();
  res.json(params);
});

// POST /api/parameters — create a new parameter definition
router.post('/', (req, res) => {
  const { name, label, type, scope } = req.body;

  if (!name || !label || !type || !scope) {
    return res.status(400).json({ error: 'Missing required fields: name, label, type, scope' });
  }
  if (!['text', 'number', 'boolean'].includes(type)) {
    return res.status(400).json({ error: 'type must be text, number, or boolean' });
  }
  if (!['participant', 'log'].includes(scope)) {
    return res.status(400).json({ error: 'scope must be participant or log' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO parameter_defs (name, label, type, scope, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, label, type, scope, new Date().toISOString());

    res.json({ id: result.lastInsertRowid, name, label, type, scope });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Parameter name already exists' });
    }
    throw err;
  }
});

// DELETE /api/parameters/:id — remove a parameter definition
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM parameter_defs WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Parameter not found' });
  res.json({ ok: true });
});

module.exports = router;
