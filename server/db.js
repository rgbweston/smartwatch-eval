const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'eval.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    participant_code  TEXT PRIMARY KEY,
    mst_group         INTEGER NOT NULL,
    device_model      TEXT NOT NULL,
    metadata          TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS logs (
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
  );

  CREATE TABLE IF NOT EXISTS parameter_defs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    label      TEXT NOT NULL,
    type       TEXT NOT NULL,
    scope      TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

module.exports = db;
