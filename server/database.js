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

db.exec(`
    CREATE TABLE IF NOT EXISTS monitoring (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        cpu REAL NOT NULL,
        ram REAL NOT NULL,
        temp REAL NOT NULL,
        battery REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
    )
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitoring_device_id ON monitoring(device_id);
    CREATE INDEX IF NOT EXISTS idx_monitoring_timestamp ON monitoring(timestamp);
    CREATE INDEX IF NOT EXISTS idx_monitoring_device_timestamp ON monitoring(device_id, timestamp DESC);
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

export function saveMetrics(device_id, metrics) {
    try {
        db.prepare(`
            INSERT INTO monitoring (device_id, cpu, ram, temp, battery, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            device_id,
            parseFloat(metrics.cpu),
            parseFloat(metrics.ram),
            parseFloat(metrics.temp),
            parseFloat(metrics.battery),
            metrics.timestamp || new Date().toISOString()
        );
        return { success: true };
    } catch (error) {
        console.error('Error saving monitoring data:', error);
        return { success: false, error: error.message };
    }
}

export function getLatestMetrics(device_id, limit = 100) {
    return db.prepare(`
        SELECT cpu, ram, temp, battery, timestamp
        FROM monitoring
        WHERE device_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `).all(device_id, limit);
}

export function getMetricsInRange(device_id, startTime, endTime) {
    return db.prepare(`
        SELECT cpu, ram, temp, battery, timestamp
        FROM monitoring
        WHERE device_id = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
    `).all(device_id, startTime, endTime);
}

export function deleteOldMetrics(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = db.prepare(`
        DELETE FROM monitoring
        WHERE timestamp < ?
    `).run(cutoffDate.toISOString());

    return { deleted: result.changes };
}

export { db };
