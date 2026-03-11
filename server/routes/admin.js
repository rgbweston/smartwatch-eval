const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/stats
router.get('/stats', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        mst_group,
        ROUND(AVG(battery_percentage), 1) AS avg_battery,
        COUNT(*) AS count
      FROM logs
      GROUP BY mst_group
      ORDER BY mst_group
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/participants
router.get('/participants', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM participants ORDER BY participant_code');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/participants/:code/metadata
router.patch('/participants/:code/metadata', async (req, res) => {
  try {
    const { code } = req.params;
    const updates = req.body;

    const result = await db.execute({
      sql: 'SELECT metadata FROM participants WHERE participant_code = ?',
      args: [code]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Participant not found' });

    const existing = JSON.parse(result.rows[0].metadata || '{}');
    const merged = { ...existing, ...updates };

    await db.execute({
      sql: 'UPDATE participants SET metadata = ? WHERE participant_code = ?',
      args: [JSON.stringify(merged), code]
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/device-models
router.get('/device-models', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT device_model, COUNT(*) as count
      FROM participants
      GROUP BY device_model
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
