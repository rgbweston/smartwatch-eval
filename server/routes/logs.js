const express = require('express');
const router = express.Router();
const { db } = require('../db');

// POST /api/logs — submit a log entry
router.post('/', async (req, res) => {
  try {
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
    await db.execute({
      sql: `INSERT INTO participants (participant_code, mst_group, device_model)
            VALUES (?, ?, ?)
            ON CONFLICT(participant_code) DO UPDATE SET
              mst_group = excluded.mst_group,
              device_model = excluded.device_model`,
      args: [participant_code, mst_group, device_model]
    });

    const result = await db.execute({
      sql: `INSERT INTO logs (
              participant_code, mst_group, battery_percentage, shift_type,
              gps_enabled, notifications_enabled, always_on_display,
              device_model, timestamp, source, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'participant', ?)`,
      args: [
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
      ]
    });

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/logs/backlog — admin creates entry with custom timestamp
router.post('/backlog', async (req, res) => {
  try {
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

    const result = await db.execute({
      sql: `INSERT INTO logs (
              participant_code, mst_group, battery_percentage, shift_type,
              gps_enabled, notifications_enabled, always_on_display,
              device_model, timestamp, source, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'backlog', ?)`,
      args: [
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
      ]
    });

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/logs — all entries (filterable)
router.get('/', async (req, res) => {
  try {
    const { participant_code, mst_group, source } = req.query;
    let sql = 'SELECT * FROM logs WHERE 1=1';
    const args = [];

    if (participant_code) { sql += ' AND participant_code = ?'; args.push(participant_code); }
    if (mst_group)        { sql += ' AND mst_group = ?';        args.push(mst_group); }
    if (source)           { sql += ' AND source = ?';           args.push(source); }

    sql += ' ORDER BY timestamp DESC';

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/logs/export — CSV download
router.get('/export', async (req, res) => {
  try {
    const [logsResult, paramsResult] = await Promise.all([
      db.execute('SELECT * FROM logs ORDER BY timestamp DESC'),
      db.execute("SELECT * FROM parameter_defs WHERE scope = 'log'")
    ]);

    const logs = logsResult.rows;
    const paramDefs = paramsResult.rows;

    const fixedHeaders = [
      'id', 'participant_code', 'mst_group', 'battery_percentage',
      'shift_type', 'gps_enabled', 'notifications_enabled', 'always_on_display',
      'device_model', 'timestamp', 'source'
    ];
    const metaHeaders = paramDefs.map(p => p.name);
    const allHeaders = [...fixedHeaders, ...metaHeaders];

    const rows = logs.map(log => {
      const meta = JSON.parse(log.metadata || '{}');
      const fixed = fixedHeaders.map(h => `"${String(log[h] ?? '').replace(/"/g, '""')}"`);
      const metaCols = metaHeaders.map(h => `"${String(meta[h] ?? '').replace(/"/g, '""')}"`);
      return [...fixed, ...metaCols].join(',');
    });

    const csv = [allHeaders.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartwatch-logs.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/logs/:id/metadata
router.patch('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await db.execute({ sql: 'SELECT metadata FROM logs WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });

    const existing = JSON.parse(result.rows[0].metadata || '{}');
    const merged = { ...existing, ...updates };

    await db.execute({ sql: 'UPDATE logs SET metadata = ? WHERE id = ?', args: [JSON.stringify(merged), id] });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
