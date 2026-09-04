-- Cloudflare D1 / SQLite Database Schema for Floor Hours Tracker

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  work_date TEXT NOT NULL,              -- YYYY-MM-DD in IST
  work_mode TEXT NOT NULL DEFAULT 'office', -- 'office' | 'wfh' | 'leave'
  leave_reason TEXT,
  check_in_time TEXT,                   -- UTC timestamp (ISO 8601), NULL if leave
  check_out_time TEXT,                  -- UTC timestamp (ISO 8601), NULL until checked out
  is_auto_checkout INTEGER DEFAULT 0,   -- 1 if system auto-closed it at 8 PM IST
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'on_break' | 'completed' | 'leave'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS breaks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  break_start TEXT NOT NULL,            -- UTC timestamp (ISO 8601)
  break_end TEXT,                       -- UTC timestamp (ISO 8601), NULL while break is active
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS edit_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  edited_by TEXT NOT NULL REFERENCES users(id),
  field_changed TEXT NOT NULL,          -- 'check_in_time' | 'check_out_time' | 'break_start' | 'break_end' | 'work_mode'
  break_id TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  approved_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'approved',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON attendance_sessions(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status_date ON attendance_sessions(status, work_date);
CREATE INDEX IF NOT EXISTS idx_breaks_session ON breaks(session_id);
CREATE INDEX IF NOT EXISTS idx_edit_logs_session ON edit_logs(session_id);
