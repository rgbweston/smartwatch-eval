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

    const result = await db.execute({
      sql: `INSERT INTO parameter_defs (name, label, type, scope, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [name, label, type, scope, new Date().toISOString()]
    });

    res.json({ id: Number(result.lastInsertRowid), name, label, type, scope });
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
