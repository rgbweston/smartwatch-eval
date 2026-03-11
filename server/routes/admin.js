const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/stats
router.get('/stats', async (req, res) => {
  try {
    const [logsResult, participantsResult] = await Promise.all([
      db.execute('SELECT participant_code, mst_group, battery_percentage, timestamp FROM logs ORDER BY participant_code, timestamp ASC'),
      db.execute('SELECT COUNT(*) as count FROM participants')
    ]);

    const logs = logsResult.rows;
    const participantCount = Number(participantsResult.rows[0].count);
    const now = Date.now();
    const totalLogs = logs.length;
    const logsPastDay = logs.filter(l => now - new Date(l.timestamp).getTime() < 86400000).length;
    const logsPastHour = logs.filter(l => now - new Date(l.timestamp).getTime() < 3600000).length;

    // Group by participant, calculate consecutive-pair loss rates
    const byParticipant = {};
    for (const log of logs) {
      if (!byParticipant[log.participant_code]) byParticipant[log.participant_code] = [];
      byParticipant[log.participant_code].push(log);
    }

    const allRates = [];    // { lossPerHour, mst_group, isDaytime }
    for (const pLogs of Object.values(byParticipant)) {
      for (let i = 0; i < pLogs.length - 1; i++) {
        const a = pLogs[i], b = pLogs[i + 1];
        const hours = (new Date(b.timestamp) - new Date(a.timestamp)) / 3600000;
        if (hours <= 0 || hours > 24) continue;           // skip gaps > 24h
        const loss = a.battery_percentage - b.battery_percentage;
        if (loss < 0) continue;                           // skip charges
        const hour = new Date(a.timestamp).getUTCHours();
        allRates.push({
          lossPerHour: loss / hours,
          mst_group: a.mst_group,
          isDaytime: hour >= 6 && hour < 22
        });
      }
    }

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const round1 = v => v !== null ? Math.round(v * 10) / 10 : null;

    const avgHourly = avg(allRates.map(r => r.lossPerHour));
    const daytimeRates = allRates.filter(r => r.isDaytime).map(r => r.lossPerHour);
    const nightRates   = allRates.filter(r => !r.isDaytime).map(r => r.lossPerHour);

    // By MST group
    const mstMap = {};
    for (const r of allRates) {
      if (!mstMap[r.mst_group]) mstMap[r.mst_group] = [];
      mstMap[r.mst_group].push(r.lossPerHour);
    }
    const byMst = Object.entries(mstMap)
      .map(([g, rates]) => ({ mst_group: Number(g), avg_hourly_loss: round1(avg(rates)), count: rates.length }))
      .sort((a, b) => a.mst_group - b.mst_group);

    res.json({
      overall: {
        avg_hourly_loss: round1(avgHourly),
        avg_daily_loss:  round1(avgHourly !== null ? avgHourly * 24 : null),
        daytime_loss:    round1(avg(daytimeRates)),
        nighttime_loss:  round1(avg(nightRates))
      },
      by_mst: byMst,
      snapshot: {
        participant_count:         participantCount,
        total_logs:                totalLogs,
        avg_logs_per_participant:  participantCount > 0 ? Math.round((totalLogs / participantCount) * 10) / 10 : 0,
        logs_past_day:             logsPastDay,
        logs_past_hour:            logsPastHour
      }
    });
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

// DELETE /api/participants/:code
router.delete('/participants/:code', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM participants WHERE participant_code = ?',
      args: [req.params.code]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Participant not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/participants/:code/sensor-config
router.patch('/participants/:code/sensor-config', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await db.execute({
      sql: 'SELECT metadata FROM participants WHERE participant_code = ?',
      args: [code]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Participant not found' });

    const existing = JSON.parse(result.rows[0].metadata || '{}');
    existing._sensor_config = req.body; // full replacement
    await db.execute({
      sql: 'UPDATE participants SET metadata = ? WHERE participant_code = ?',
      args: [JSON.stringify(existing), code]
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/device-model-configs
router.get('/device-model-configs', async (req, res) => {
  try {
    const { device_model } = req.query;
    let sql = 'SELECT * FROM device_model_configs';
    const args = [];
    if (device_model) { sql += ' WHERE device_model = ?'; args.push(device_model); }
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/device-model-configs
router.put('/device-model-configs', async (req, res) => {
  try {
    const { device_model, param_name, value } = req.body;
    if (!device_model || !param_name || value == null) {
      return res.status(400).json({ error: 'device_model, param_name, and value are required' });
    }
    await db.execute({
      sql: `INSERT INTO device_model_configs (device_model, param_name, value) VALUES (?, ?, ?)
            ON CONFLICT(device_model, param_name) DO UPDATE SET value = excluded.value`,
      args: [device_model, param_name, value]
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/device-model-configs/:device_model/:param_name
router.delete('/device-model-configs/:device_model/:param_name', async (req, res) => {
  try {
    const { device_model, param_name } = req.params;
    const result = await db.execute({
      sql: 'DELETE FROM device_model_configs WHERE device_model = ? AND param_name = ?',
      args: [device_model, param_name]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Override not found' });
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
