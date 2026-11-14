export const versionOneSchema = `
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL DEFAULT '',
    goal TEXT NOT NULL DEFAULT '', tone TEXT NOT NULL DEFAULT 'cercano'
  );
  INSERT OR IGNORE INTO profile (id) VALUES (1);
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
    category TEXT NOT NULL, priority TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
    due_at TEXT, acknowledged_at TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, content TEXT NOT NULL,
    provider TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reviews (
    card_id TEXT PRIMARY KEY, stage INTEGER NOT NULL, next_review_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT NOT NULL,
    answer TEXT NOT NULL, grade TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ai_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS task_reminders ON tasks (done, due_at);
  CREATE INDEX IF NOT EXISTS ai_requests_date ON ai_requests (created_at);
`

const versionTwoSchema = `
  ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER NOT NULL DEFAULT 25
    CHECK (estimated_minutes BETWEEN 5 AND 240);
  ALTER TABLE tasks ADD COLUMN completed_at TEXT;
  ALTER TABLE tasks ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  CREATE TABLE task_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL, task_title TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX task_completions_date ON task_completions (created_at, task_id);
  CREATE TABLE daily_plans (
    day TEXT PRIMARY KEY, time_zone TEXT NOT NULL, plan_json TEXT NOT NULL,
    revision INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE daily_reviews (
    day TEXT PRIMARY KEY, time_zone TEXT NOT NULL, notes_json TEXT NOT NULL,
    snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
`

export function migrate(db) {
  const version = db.prepare('PRAGMA user_version').get().user_version
  if (version > 9) throw new Error('La base de datos pertenece a una versión más nueva de Jarvis. No se ha modificado.')
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
  if (version === 9) return
  db.exec('BEGIN IMMEDIATE')
  try {
    if (version === 0) db.exec(versionOneSchema)
    if (version < 2) db.exec(versionTwoSchema)
    if (version < 3) db.exec(`
      CREATE TABLE learning_cards (id TEXT PRIMARY KEY, content_json TEXT NOT NULL, revision INTEGER NOT NULL);
      CREATE TABLE learning_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT NOT NULL, revision INTEGER NOT NULL, content_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE learning_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, card_json TEXT NOT NULL, answer TEXT NOT NULL, feedback_json TEXT NOT NULL, created_at TEXT NOT NULL);
      ALTER TABLE attempts ADD COLUMN card_snapshot TEXT;
    `)
    // No inventar fechas ni actividad histórica para las tareas antiguas.
    if (version < 4) db.exec(`CREATE TABLE study_sessions (card_id TEXT NOT NULL, revision INTEGER NOT NULL, version INTEGER NOT NULL, session_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (card_id, revision));
      CREATE TABLE task_proposals (id TEXT PRIMARY KEY, task_json TEXT NOT NULL, task_id INTEGER, created_at TEXT NOT NULL);
      ALTER TABLE attempts ADD COLUMN technique_json TEXT;
      PRAGMA user_version = 4;`)
    if (version < 5) db.exec(`CREATE TABLE memories (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL);
      ALTER TABLE task_proposals ADD COLUMN target_id INTEGER;
      ALTER TABLE task_proposals ADD COLUMN target_version INTEGER;
      PRAGMA user_version = 5;`)
    if (version < 6) db.exec(`ALTER TABLE task_proposals ADD COLUMN action TEXT NOT NULL DEFAULT 'edit';
      ALTER TABLE task_proposals ADD COLUMN target_json TEXT;
      ALTER TABLE task_proposals ADD COLUMN result_json TEXT;
      CREATE TABLE memory_proposals (id TEXT PRIMARY KEY, memory_json TEXT NOT NULL, created_at TEXT NOT NULL, result_json TEXT);
      PRAGMA user_version = 6;`)
    if (version < 7) db.exec(`CREATE TABLE knowledge (id TEXT PRIMARY KEY, title TEXT NOT NULL, topic TEXT NOT NULL, content TEXT NOT NULL, origin TEXT NOT NULL, url TEXT, created_at TEXT NOT NULL);`)
    if (version < 8) db.exec(`CREATE TABLE goals (id TEXT PRIMARY KEY, content_json TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE goal_tasks (goal_id TEXT NOT NULL, step_id TEXT NOT NULL, task_id INTEGER NOT NULL, PRIMARY KEY (goal_id, step_id));
      CREATE TABLE sourced_proposals (id TEXT PRIMARY KEY, card_id TEXT, revision INTEGER NOT NULL, references_json TEXT NOT NULL, created_at TEXT NOT NULL, result_json TEXT);
      ALTER TABLE memories ADD COLUMN origin TEXT NOT NULL DEFAULT 'Origen no registrado (anterior)';
      ALTER TABLE memories ADD COLUMN valid_until TEXT;
      ALTER TABLE memories ADD COLUMN created_at TEXT;
      ALTER TABLE memories ADD COLUMN source_text TEXT;
      ALTER TABLE memory_proposals ADD COLUMN source_text TEXT;
      ALTER TABLE messages ADD COLUMN context_json TEXT;
      PRAGMA user_version = 8;`)
    // v9: avisos que suenan (escritorio y push), tareas que se repiten y repaso adaptativo (FSRS).
    db.exec(`ALTER TABLE tasks ADD COLUMN repeat TEXT;
      ALTER TABLE tasks ADD COLUMN snoozed_until TEXT;
      ALTER TABLE tasks ADD COLUMN notified_at TEXT;
      ALTER TABLE reviews ADD COLUMN stability REAL;
      ALTER TABLE reviews ADD COLUMN difficulty REAL;
      ALTER TABLE reviews ADD COLUMN last_review_at TEXT;
      CREATE TABLE push_subscriptions (endpoint TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      PRAGMA user_version = 9; COMMIT;`)
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
