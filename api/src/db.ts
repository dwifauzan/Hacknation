import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databasePath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), '..', 'database/database.sqlite');

mkdirSync(path.dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);

database.exec(`
    CREATE TABLE IF NOT EXISTS kanban_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR NOT NULL,
        description TEXT,
        status VARCHAR NOT NULL DEFAULT 'backlog',
        priority VARCHAR NOT NULL DEFAULT 'medium',
        assignee VARCHAR,
        due_date DATE,
        position INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME,
        updated_at DATETIME
    );
    CREATE INDEX IF NOT EXISTS kanban_tasks_status_index ON kanban_tasks(status);
    CREATE TABLE IF NOT EXISTS instagram_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR NOT NULL UNIQUE,
        display_name VARCHAR,
        instagram_user_id VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'logged_out',
        session_reference VARCHAR,
        last_checked_at DATETIME,
        last_error TEXT,
        created_at DATETIME,
        updated_at DATETIME
    );
`);
