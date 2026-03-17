const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/stats
router.get('/stats', async (req, res) => {
  try {
    const { config_id } = req.query;
    let logSql = 'SELECT l.participant_code, l.mst_group, l.battery_percentage, l.timestamp, p.device_model FROM logs l LEFT JOIN participants p ON p.participant_code = l.participant_code';
    const logArgs = [];

    if (config_id) {
      const cfgResult = await db.execute({ sql: 'SELECT start_date, end_date FROM sampling_configs WHERE id = ?', args: [config_id] });
      if (cfgResult.rows.length > 0) {
        const { start_date, end_date } = cfgResult.rows[0];
        logSql += ' WHERE l.timestamp >= ?';
        logArgs.push(start_date);
        if (end_date) {
          logSql += ' AND l.timestamp < ?';
          logArgs.push(end_date);
        }
      }
    }

    logSql += ' ORDER BY l.participant_code, l.timestamp ASC';

    const [logsResult, participantsResult] = await Promise.all([
      db.execute({ sql: logSql, args: logArgs }),
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

    const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    const round1 = v => v !== null ? Math.round(v * 10) / 10 : null;

    // Per-participant averaging: compute each participant's own averages first,
    // then combine those averages equally (prevents frequent loggers from dominating).
    const participantStats = [];
    for (const [participantCode, pLogs] of Object.entries(byParticipant)) {
      const rates = [], daytimeRatesP = [], nightRatesP = [];
      let mst_group = null, device_model = null;
      for (let i = 0; i < pLogs.length - 1; i++) {
        const a = pLogs[i], b = pLogs[i + 1];
        const hours = (new Date(b.timestamp) - new Date(a.timestamp)) / 3600000;
        if (hours <= 0 || hours > 24) continue;           // skip gaps > 24h
        const loss = a.battery_percentage - b.battery_percentage;
        if (loss < 0) continue;                           // skip charges
        const hour = new Date(a.timestamp).getUTCHours();
        const lossPerHour = loss / hours;
        rates.push(lossPerHour);
        if (hour >= 6 && hour < 22) daytimeRatesP.push(lossPerHour);
        else nightRatesP.push(lossPerHour);
        mst_group = a.mst_group;
        device_model = a.device_model;
      }
      if (rates.length === 0) continue;
      participantStats.push({
        participant_code: participantCode,
        avg: avg(rates),
        avgDaytime: avg(daytimeRatesP),
        avgNight: avg(nightRatesP),
        mst_group,
        device_model,
        count: rates.length
      });
    }

    // Overall = average of per-participant averages (equal weight per person)
    const avgHourly = avg(participantStats.map(p => p.avg));
    const daytimeRates = participantStats.map(p => p.avgDaytime).filter(v => v !== null);
    const nightRates   = participantStats.map(p => p.avgNight).filter(v => v !== null);

    // By MST group: average the per-participant avgs within each group
    const mstMap = {};
    for (const p of participantStats) {
      if (!mstMap[p.mst_group]) mstMap[p.mst_group] = [];
      mstMap[p.mst_group].push(p.avg);
    }
    const byMst = Object.entries(mstMap)
      .map(([g, avgs]) => ({ mst_group: Number(g), avg_hourly_loss: round1(avg(avgs)), count: avgs.length }))
      .sort((a, b) => a.mst_group - b.mst_group);

    const deviceMap = {};
    for (const p of participantStats) {
      if (!deviceMap[p.device_model]) deviceMap[p.device_model] = [];
      deviceMap[p.device_model].push(p.avg);
    }
    const by_device = Object.entries(deviceMap)
      .map(([model, avgs]) => ({ device_model: model, avg_hourly_loss: round1(avg(avgs)), count: avgs.length }))
      .sort((a, b) => (b.avg_hourly_loss ?? 0) - (a.avg_hourly_loss ?? 0));

    const by_participant = participantStats
      .map(p => ({
        participant_code: p.participant_code,
        device_model: p.device_model,
        avg_hourly_loss: round1(p.avg),
        avg_daily_loss: round1(p.avg !== null ? p.avg * 24 : null),
        nighttime_loss: round1(p.avgNight),
        count: p.count
      }))
      .sort((a, b) => a.participant_code.localeCompare(b.participant_code));

    res.json({
      overall: {
        avg_hourly_loss: round1(avgHourly),
        avg_daily_loss:  round1(avgHourly !== null ? avgHourly * 24 : null),
        daytime_loss:    round1(avg(daytimeRates)),
        nighttime_loss:  round1(avg(nightRates))
      },
      by_mst: byMst,
      by_device,
      by_participant,
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
    const result = await db.execute(`
      SELECT p.*, COALESCE(lc.log_count, 0) as log_count
      FROM participants p
      LEFT JOIN (
        SELECT participant_code, COUNT(*) as log_count FROM logs GROUP BY participant_code
      ) lc ON lc.participant_code = p.participant_code
      ORDER BY p.participant_code
    `);
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

// GET /api/sampling-configs
router.get('/sampling-configs', async (req, res) => {
  try {
    const [configsResult, valuesResult] = await Promise.all([
      db.execute('SELECT * FROM sampling_configs ORDER BY start_date ASC'),
      db.execute('SELECT * FROM sampling_config_values')
    ]);
    const valuesByConfig = {};
    for (const v of valuesResult.rows) {
      if (!valuesByConfig[v.config_id]) valuesByConfig[v.config_id] = {};
      valuesByConfig[v.config_id][v.param_name] = v.value;
    }
    const configs = configsResult.rows.map(c => ({
      ...c,
      values: valuesByConfig[c.id] || {}
    }));
    res.json(configs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sampling-configs
router.post('/sampling-configs', async (req, res) => {
  try {
    const { name, start_date } = req.body;
    if (!name || !start_date) return res.status(400).json({ error: 'name and start_date are required' });

    // Auto-close any currently open config
    await db.execute({ sql: `UPDATE sampling_configs SET end_date = ? WHERE end_date IS NULL`, args: [start_date] });

    const inserted = await db.execute({
      sql: `INSERT INTO sampling_configs (name, start_date, end_date) VALUES (?, ?, NULL)`,
      args: [name, start_date]
    });
    const configId = Number(inserted.lastInsertRowid);

    const logParams = await db.execute("SELECT name FROM parameter_defs WHERE scope='log'");
    for (const p of logParams.rows) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO sampling_config_values (config_id, param_name, value) VALUES (?, ?, 'Unknown')`,
        args: [configId, p.name]
      });
    }

    const newConfig = await db.execute({ sql: 'SELECT * FROM sampling_configs WHERE id = ?', args: [configId] });
    res.json(newConfig.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/sampling-configs/:id
router.patch('/sampling-configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, values } = req.body;

    if (name !== undefined) {
      await db.execute({ sql: 'UPDATE sampling_configs SET name = ? WHERE id = ?', args: [name, id] });
    }
    if (start_date !== undefined) {
      await db.execute({ sql: 'UPDATE sampling_configs SET start_date = ? WHERE id = ?', args: [start_date, id] });
    }
    if (end_date !== undefined) {
      await db.execute({ sql: 'UPDATE sampling_configs SET end_date = ? WHERE id = ?', args: [end_date || null, id] });
    }
    if (values && typeof values === 'object') {
      for (const [param_name, value] of Object.entries(values)) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO sampling_config_values (config_id, param_name, value) VALUES (?, ?, ?)`,
          args: [id, param_name, value]
        });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/participants/:code/sensor-config-field
router.patch('/participants/:code/sensor-config-field', async (req, res) => {
  try {
    const { code } = req.params;
    const { name, value } = req.body;
    if (!name || value == null) return res.status(400).json({ error: 'name and value are required' });

    const result = await db.execute({
      sql: 'SELECT metadata FROM participants WHERE participant_code = ?',
      args: [code]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Participant not found' });

    const existing = JSON.parse(result.rows[0].metadata || '{}');
    if (!existing._sensor_config) existing._sensor_config = {};
    existing._sensor_config[name] = value;

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

// DELETE /api/sampling-configs/:id
router.delete('/sampling-configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const countResult = await db.execute('SELECT COUNT(*) as count FROM sampling_configs');
    if (Number(countResult.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only config' });
    }
    await db.execute({ sql: 'DELETE FROM sampling_config_values WHERE config_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM sampling_configs WHERE id = ?', args: [id] });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/announcements
router.get('/announcements', async (req, res) => {
  try {
    const { participant_code, mst_group } = req.query;
    const result = await db.execute({
      sql: `SELECT * FROM announcements
            WHERE target_type = 'all'
               OR (target_type = 'mst_group' AND target_value = ?)
               OR (target_type = 'participant' AND target_value = ?)
            ORDER BY created_at ASC`,
      args: [mst_group ?? null, participant_code ?? null]
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcements
router.post('/announcements', async (req, res) => {
  try {
    const { message, target_type, target_value } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    if (!['all', 'mst_group', 'participant'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type must be all, mst_group, or participant' });
    }
    if (target_type !== 'all' && !target_value) {
      return res.status(400).json({ error: 'target_value is required for mst_group and participant targets' });
    }
    const inserted = await db.execute({
      sql: `INSERT INTO announcements (message, target_type, target_value, created_at) VALUES (?, ?, ?, ?)`,
      args: [message, target_type, target_value ?? null, new Date().toISOString()]
    });
    res.json({ id: Number(inserted.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/announcements/:id
router.delete('/announcements/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM announcements WHERE id = ?',
      args: [req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
