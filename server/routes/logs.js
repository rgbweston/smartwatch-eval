const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/logs — submit a log entry
router.post('/', (req, res) => {
  const {
    participant_code,
    mst_group,
    battery_percentage,
    shift_type,
    gps_enabled = false,
    notifications_enabled = false,
    always_on_display = false,
    device_model,
    metadata = {}
  } = req.body;

  if (!participant_code || !mst_group || battery_percentage == null || !shift_type || !device_model) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Upsert participant
  db.prepare(`
    INSERT INTO participants (participant_code, mst_group, device_model)
    VALUES (?, ?, ?)
    ON CONFLICT(participant_code) DO UPDATE SET
      mst_group = excluded.mst_group,
      device_model = excluded.device_model
  `).run(participant_code, mst_group, device_model);

  const stmt = db.prepare(`
    INSERT INTO logs (
      participant_code, mst_group, battery_percentage, shift_type,
      gps_enabled, notifications_enabled, always_on_display,
      device_model, timestamp, source, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'participant', ?)
  `);

  const result = stmt.run(
    participant_code,
    mst_group,
    battery_percentage,
    shift_type,
    gps_enabled ? 1 : 0,
    notifications_enabled ? 1 : 0,
    always_on_display ? 1 : 0,
    device_model,
    new Date().toISOString(),
    JSON.stringify(metadata)
  );

  res.json({ id: result.lastInsertRowid });
});

// POST /api/logs/backlog — admin creates entry with custom timestamp
router.post('/backlog', (req, res) => {
  const {
    participant_code,
    mst_group,
    battery_percentage,
    shift_type,
    gps_enabled = false,
    notifications_enabled = false,
    always_on_display = false,
    device_model,
    timestamp,
    metadata = {}
  } = req.body;

  if (!participant_code || !mst_group || battery_percentage == null || !shift_type || !device_model || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const stmt = db.prepare(`
    INSERT INTO logs (
      participant_code, mst_group, battery_percentage, shift_type,
      gps_enabled, notifications_enabled, always_on_display,
      device_model, timestamp, source, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'backlog', ?)
  `);

  const result = stmt.run(
    participant_code,
    mst_group,
    battery_percentage,
    shift_type,
    gps_enabled ? 1 : 0,
    notifications_enabled ? 1 : 0,
    always_on_display ? 1 : 0,
    device_model,
    timestamp,
    JSON.stringify(metadata)
  );

  res.json({ id: result.lastInsertRowid });
});

// GET /api/logs — all entries (filterable)
router.get('/', (req, res) => {
  const { participant_code, mst_group, source } = req.query;
  let query = 'SELECT * FROM logs WHERE 1=1';
  const params = [];

  if (participant_code) {
    query += ' AND participant_code = ?';
    params.push(participant_code);
  }
  if (mst_group) {
    query += ' AND mst_group = ?';
    params.push(mst_group);
  }
  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }

  query += ' ORDER BY timestamp DESC';
  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

// GET /api/logs/export — CSV download
router.get('/export', (req, res) => {
  const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all();
  const paramDefs = db.prepare("SELECT * FROM parameter_defs WHERE scope = 'log'").all();

  const fixedHeaders = [
    'id', 'participant_code', 'mst_group', 'battery_percentage',
    'shift_type', 'gps_enabled', 'notifications_enabled', 'always_on_display',
    'device_model', 'timestamp', 'source'
  ];
  const metaHeaders = paramDefs.map(p => p.name);
  const allHeaders = [...fixedHeaders, ...metaHeaders];

  const rows = logs.map(log => {
    const meta = JSON.parse(log.metadata || '{}');
    const fixed = fixedHeaders.map(h => {
      const v = log[h];
      return `"${String(v ?? '').replace(/"/g, '""')}"`;
    });
    const metaCols = metaHeaders.map(h => {
      const v = meta[h];
      return `"${String(v ?? '').replace(/"/g, '""')}"`;
    });
    return [...fixed, ...metaCols].join(',');
  });

  const csv = [allHeaders.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="smartwatch-logs.csv"');
  res.send(csv);
});

// PATCH /api/logs/:id/metadata — update researcher metadata on a log
router.patch('/:id/metadata', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const log = db.prepare('SELECT metadata FROM logs WHERE id = ?').get(id);
  if (!log) return res.status(404).json({ error: 'Log not found' });

  const existing = JSON.parse(log.metadata || '{}');
  const merged = { ...existing, ...updates };

  db.prepare('UPDATE logs SET metadata = ? WHERE id = ?').run(JSON.stringify(merged), id);
  res.json({ ok: true });
});

module.exports = router;
