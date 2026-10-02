import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databasePath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), '..', 'database/database.sqlite');

mkdirSync(path.dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);

database.exec(`
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
