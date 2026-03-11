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

    const allRates = [];    // { lossPerHour, mst_group, isDaytime, device_model, participant_code }
    for (const [participantCode, pLogs] of Object.entries(byParticipant)) {
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
          isDaytime: hour >= 6 && hour < 22,
          device_model: a.device_model,
          participant_code: participantCode
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

    const deviceMap = {};
    for (const r of allRates) {
      if (!deviceMap[r.device_model]) deviceMap[r.device_model] = [];
      deviceMap[r.device_model].push(r.lossPerHour);
    }
    const by_device = Object.entries(deviceMap)
      .map(([model, rates]) => ({ device_model: model, avg_hourly_loss: round1(avg(rates)), count: rates.length }))
      .sort((a, b) => (b.avg_hourly_loss ?? 0) - (a.avg_hourly_loss ?? 0));

    const participantMap = {};
    for (const r of allRates) {
      if (!participantMap[r.participant_code]) participantMap[r.participant_code] = { all: [], night: [], device_model: r.device_model };
      participantMap[r.participant_code].all.push(r.lossPerHour);
      if (!r.isDaytime) participantMap[r.participant_code].night.push(r.lossPerHour);
    }
    const by_participant = Object.entries(participantMap)
      .map(([code, d]) => ({
        participant_code: code,
        device_model: d.device_model,
        avg_hourly_loss: round1(avg(d.all)),
        avg_daily_loss: round1(avg(d.all) !== null ? avg(d.all) * 24 : null),
        nighttime_loss: round1(avg(d.night)),
        count: d.all.length
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

module.exports = router;
