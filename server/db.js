const { createClient } = require('@libsql/client');
const path = require('path');

const url = process.env.TURSO_DATABASE_URL
  || `file:${path.join(__dirname, 'data', 'eval.db')}`;

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const SENSOR_PARAMS = [
  { name: 'heart_rate',        label: 'Heart Rate',                    type: 'boolean', default_value: 'true',       options: null },
  { name: 'respiration_rate',  label: 'Respiration Rate',              type: 'boolean', default_value: 'true',       options: null },
  { name: 'stress',            label: 'Stress',                        type: 'boolean', default_value: 'true',       options: null },
  { name: 'steps',             label: 'Steps',                         type: 'boolean', default_value: 'true',       options: null },
  { name: 'bbi',               label: 'Beat-to-Beat Interval (BBI)',   type: 'boolean', default_value: 'true',       options: null },
  { name: 'enhanced_bbi',      label: 'Enhanced BBI',                  type: 'boolean', default_value: 'true',       options: null },
  { name: 'gyroscope',         label: 'Gyroscope',                     type: 'boolean', default_value: 'true',       options: null },
  { name: 'spo2',              label: 'SpO2',                          type: 'select',  default_value: 'On Demand',  options: '["All day","Sleep Only","On Demand"]' },
  { name: 'skin_temperature',  label: 'Skin Temperature',              type: 'boolean', default_value: 'true',       options: null },
  { name: 'wrist_status',      label: 'Wrist Status',                  type: 'boolean', default_value: 'true',       options: null },
  { name: 'accelerometer',     label: 'Accelerometer',                 type: 'boolean', default_value: 'true',       options: null },
  { name: 'zero_crossing',     label: 'Zero Crossing',                 type: 'boolean', default_value: 'true',       options: null },
  { name: 'actigraphy_1',      label: 'Actigraphy 1',                  type: 'boolean', default_value: 'true',       options: null },
  { name: 'actigraphy_2',      label: 'Actigraphy 2',                  type: 'boolean', default_value: 'true',       options: null },
  { name: 'actigraphy_3',      label: 'Actigraphy 3',                  type: 'boolean', default_value: 'true',       options: null },
  { name: 'always_on_display', label: 'Always-on Display (AoD)',       type: 'boolean', default_value: 'false',      options: null },
];

async function initDb() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS participants (
      participant_code  TEXT PRIMARY KEY,
      mst_group         INTEGER NOT NULL,
      device_model      TEXT NOT NULL,
      metadata          TEXT DEFAULT '{}'
    )`,
    `CREATE TABLE IF NOT EXISTS logs (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_code      TEXT NOT NULL,
      mst_group             INTEGER NOT NULL,
      battery_percentage    INTEGER NOT NULL,
      shift_type            TEXT NOT NULL,
      gps_enabled           INTEGER DEFAULT 0,
      notifications_enabled INTEGER DEFAULT 0,
      always_on_display     INTEGER DEFAULT 0,
      device_model          TEXT NOT NULL,
      timestamp             TEXT NOT NULL,
      source                TEXT DEFAULT 'participant',
      metadata              TEXT DEFAULT '{}'
    )`,
    `CREATE TABLE IF NOT EXISTS parameter_defs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      label      TEXT NOT NULL,
      type       TEXT NOT NULL,
      scope      TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  ], 'write');

  // Add new columns (safe to call repeatedly — ALTER TABLE is ignored if already present)
  await db.execute("ALTER TABLE parameter_defs ADD COLUMN default_value TEXT DEFAULT NULL")
    .catch(() => {});
  await db.execute("ALTER TABLE parameter_defs ADD COLUMN options TEXT DEFAULT NULL")
    .catch(() => {});

  // Seed the 16 sensor parameters as per-log scope
  for (const p of SENSOR_PARAMS) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO parameter_defs (name, label, type, scope, default_value, options, created_at)
            VALUES (?, ?, ?, 'log', ?, ?, ?)`,
      args: [p.name, p.label, p.type, p.default_value, p.options, new Date().toISOString()]
    });
  }

  // Migrate any existing sensor params that were incorrectly set to 'participant' scope
  const sensorNames = SENSOR_PARAMS.map(p => `'${p.name}'`).join(',');
  await db.execute(
    `UPDATE parameter_defs SET scope='log' WHERE scope='participant' AND name IN (${sensorNames})`
  ).catch(() => {});
}

module.exports = { db, initDb };
