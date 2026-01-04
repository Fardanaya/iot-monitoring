# 🚀 IoT Device Monitoring System

Real-time monitoring system untuk IoT devices dengan autentikasi JWT, transmisi data via TCP, dan dashboard WebSocket real-time.

## ✨ Features

- **🔐 JWT Authentication** - Secure device authentication dengan bcrypt password hashing
- **💾 SQLite Database** - Device credential management
- **📡 TCP Server** - High-performance data transmission dari IoT devices
- **🌐 WebSocket** - Real-time dashboard updates
- **📊 Live Charts** - Chart.js untuk visualisasi metrics (CPU, RAM, Temperature, Battery)


## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/iot-monitoring.git
cd iot-monitoring
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
JWT_SECRET=your-secret-key-here
DEVICE_ID=your-device-id
DEVICE_PASSWORD=your-device-password
```

### 4. Seed Database

```bash
npm run seed
```

Default devices:
- **laptop-1** / password: `haha`
- **laptop-2** / password: `hihi`

### 5. Start Servers

```bash
npm start
```

Servers akan running di:
- HTTP Auth: `http://localhost:3000`
- TCP Server: `localhost:9000`
- WebSocket: `ws://localhost:8080`

### 6. Start Client (Terminal Baru)

```bash
npm run client
```

### 7. Open Dashboard

Buka `dashboard/index.html` di browser.

## 📁 Project Structure

```
iot-monitoring/
├── client/
│   └── device.js           # IoT device simulator
├── server/
│   ├── index.js            # Main server entry point
│   ├── auth.js             # JWT utilities
│   ├── database.js         # SQLite database layer
│   ├── httpServer.js       # HTTP authentication server
│   ├── tcpServer.js        # TCP data receiver
│   └── wsServer.js         # WebSocket broadcaster
├── dashboard/
│   ├── index.html          # Dashboard UI
│   └── dashboard.js        # Dashboard logic
├── seed-devices.js         # Database seeder
├── .env.example            # Environment template
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key untuk JWT signing | `king-yoga` |
| `HTTP_PORT` | HTTP auth server port | `3000` |
| `TCP_PORT` | TCP data server port | `9000` |
| `WS_PORT` | WebSocket server port | `8080` |
| `DEVICE_ID` | Device identifier | `laptop-1` |
| `DEVICE_PASSWORD` | Device password | `haha` |

### Device Management

**Add Device via SQL:**
```bash
sqlite3 server/devices.db
```

```sql
INSERT INTO devices (device_id, device_name, password_hash, device_type)
VALUES ('laptop-3', 'My Laptop', '$2a$10$...', 'laptop');
```

**Generate password hash:**
```javascript
import bcrypt from 'bcryptjs';
const hash = bcrypt.hashSync('haha', 10);
console.log(hash);
```

## 📊 API Documentation

### POST /api/login

Authenticate device dan dapatkan JWT token.

**Request:**
```json
{
  "device_id": "laptop-1",
  "password": "haha"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "device_id": "laptop-1",
  "device_name": "Laptop Franky",
  "device_type": "laptop",
  "expires_in": "1h"
}
```

## 🧪 Testing

### Test Multi-Device

Terminal 1:
```bash
DEVICE_ID=laptop-1 DEVICE_PASSWORD=haha npm run client
```

Terminal 2:
```bash
DEVICE_ID=laptop-2 DEVICE_PASSWORD=hihi npm run client
```

Dashboard akan menampilkan 2 device cards dengan data real-time terpisah.

**⭐ Star this repo jika bermanfaat!**
