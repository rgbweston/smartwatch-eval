const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/parameters
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM parameter_defs ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/parameters
router.post('/', async (req, res) => {
  try {
    const { name, label, type, scope, default_value = null, options = null } = req.body;

    if (!name || !label || !type || !scope) {
      return res.status(400).json({ error: 'Missing required fields: name, label, type, scope' });
    }
    if (!['text', 'number', 'boolean', 'select'].includes(type)) {
      return res.status(400).json({ error: 'type must be text, number, boolean, or select' });
    }
    if (!['participant', 'log'].includes(scope)) {
      return res.status(400).json({ error: 'scope must be participant or log' });
    }
    if (type === 'select') {
      if (!options) return res.status(400).json({ error: 'options is required for select type' });
      try {
        const parsed = JSON.parse(options);
        if (!Array.isArray(parsed) || parsed.some(o => typeof o !== 'string')) {
          return res.status(400).json({ error: 'options must be a JSON array of strings' });
        }
      } catch {
        return res.status(400).json({ error: 'options must be a valid JSON array' });
      }
    }

    const result = await db.execute({
      sql: `INSERT INTO parameter_defs (name, label, type, scope, default_value, options, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [name, label, type, scope, default_value, type === 'select' ? options : null, new Date().toISOString()]
    });

    res.json({ id: Number(result.lastInsertRowid), name, label, type, scope, default_value, options });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Parameter name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/parameters/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM parameter_defs WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Parameter not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
