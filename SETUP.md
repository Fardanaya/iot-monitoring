## 📦 Install Dependencies

```bash
npm install
```

## 🌱 Seed Database (Wajib!)

Jalankan sebelum start server untuk populate database:

```bash
npm run seed
```

## 🔑 Default Credentials

Setelah seed, gunakan credentials ini:

**Device 1:**
- device_id: `laptop-1`
- password: `haha`

**Device 2:**
- device_id: `laptop-2`
- password: `hihi`

## 🚀 Run Servers

```bash
# Terminal 1: Start all servers (HTTP + TCP + WebSocket)
npm start

# Terminal 2: Start client
npm run client
```

## 🗄️ Manual Database Insert

Jika mau tambah device manual, jalankan SQLite:

```bash
sqlite3 server/devices.db
```

```sql
-- Insert device baru
INSERT INTO devices (device_id, device_name, password_hash, device_type)
VALUES ('laptop-3', 'Laptop HP', 'hash_password_here', 'laptop');
```

Untuk hash password, gunakan:
```javascript
import bcrypt from 'bcryptjs';
const hash = bcrypt.hashSync('your_password', 10);
console.log(hash);
```
