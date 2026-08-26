import "dotenv/config";
import { pool } from "./database.js";

const query = `
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY,
    storage_key TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT NOT NULL,
    code_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'uploaded', 'deleted'))
);
`;

try {
    await pool.query(query);
    await pool.end();
} catch (error) {
    console.error(error);
    process.exit(1);
}