const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stats — avg battery % grouped by MST
router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      mst_group,
      ROUND(AVG(battery_percentage), 1) AS avg_battery,
      COUNT(*) AS count
    FROM logs
    GROUP BY mst_group
    ORDER BY mst_group
  `).all();
  res.json(stats);
});

// GET /api/participants — all participants with metadata
router.get('/participants', (req, res) => {
  const participants = db.prepare('SELECT * FROM participants ORDER BY participant_code').all();
  res.json(participants);
});

// PATCH /api/participants/:code/metadata — update researcher metadata on a participant
router.patch('/participants/:code/metadata', (req, res) => {
  const { code } = req.params;
  const updates = req.body;

  const participant = db.prepare('SELECT metadata FROM participants WHERE participant_code = ?').get(code);
  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  const existing = JSON.parse(participant.metadata || '{}');
  const merged = { ...existing, ...updates };

  db.prepare('UPDATE participants SET metadata = ? WHERE participant_code = ?')
    .run(JSON.stringify(merged), code);
  res.json({ ok: true });
});

module.exports = router;
