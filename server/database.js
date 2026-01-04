import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'devices.db');

const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        device_type TEXT DEFAULT 'laptop',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT,
        is_active INTEGER DEFAULT 1
    )
`);

export function verifyDeviceCredentials(device_id, password) {
    const device = db.prepare(`
        SELECT password_hash, is_active 
        FROM devices 
        WHERE device_id = ?
    `).get(device_id);

    if (!device) {
        return { success: false, reason: 'Device not found' };
    }

    if (!device.is_active) {
        return { success: false, reason: 'Device is inactive' };
    }

    const isValid = bcrypt.compareSync(password, device.password_hash);

    if (!isValid) {
        return { success: false, reason: 'Invalid password' };
    }

    updateLastSeen(device_id);

    return { success: true };
}

export function updateLastSeen(device_id) {
    db.prepare(`
        UPDATE devices 
        SET last_seen = ? 
        WHERE device_id = ?
    `).run(new Date().toISOString(), device_id);
}

export function getDeviceInfo(device_id) {
    return db.prepare(`
        SELECT device_id, device_name, device_type, created_at, last_seen, is_active
        FROM devices 
        WHERE device_id = ?
    `).get(device_id);
}

export function getAllDevices() {
    return db.prepare(`
        SELECT device_id, device_name, device_type, created_at, last_seen, is_active
        FROM devices
        ORDER BY created_at DESC
    `).all();
}

export { db };
