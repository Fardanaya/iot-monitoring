import bcrypt from 'bcryptjs';
import { db } from './server/database.js';

const devices = [
    {
        device_id: 'laptop-1',
        device_name: 'Laptop Franky',
        password: 'haha',
        device_type: 'laptop'
    },
    {
        device_id: 'laptop-2',
        device_name: 'Laptop Yoga',
        password: 'hihi',
        device_type: 'laptop'
    }
];

const insertDevice = db.prepare(`
    INSERT INTO devices (device_id, device_name, password_hash, device_type)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
        device_name = excluded.device_name,
        password_hash = excluded.password_hash,
        device_type = excluded.device_type
`);

for (const device of devices) {
    const passwordHash = bcrypt.hashSync(device.password, 10);

    insertDevice.run(
        device.device_id,
        device.device_name,
        passwordHash,
        device.device_type
    );

    console.log(`✅ ${device.device_id} (${device.device_name})`);
    console.log(`   Password: ${device.password}`);
}

db.close();
