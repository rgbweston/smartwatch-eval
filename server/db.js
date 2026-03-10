const { createClient } = require('@libsql/client');
const path = require('path');

const url = process.env.TURSO_DATABASE_URL
  || `file:${path.join(__dirname, 'data', 'eval.db')}`;

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN
});

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
}

module.exports = { db, initDb };
