CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT,
  message TEXT,
  url TEXT,
  created_at INTEGER NOT NULL
);
