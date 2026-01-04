import net from "net";
import si from "systeminformation";
import dotenv from "dotenv";

dotenv.config();

const device_id = process.env.DEVICE_ID;
const DEVICE_PASSWORD = process.env.DEVICE_PASSWORD;
const HTTP_SERVER = process.env.HTTP_SERVER || "http://localhost:3000";
const TCP_SERVER = process.env.TCP_SERVER || "localhost";
const TCP_PORT = process.env.TCP_PORT || 9000;

let token = null;
let device_name = null;
let socket = null;

/**
 * Login to HTTP server and get JWT token
 */
async function login() {
    try {
        console.log(`Logging in as device: ${device_id}...`);

        const response = await fetch(`${HTTP_SERVER}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                device_id,
                password: DEVICE_PASSWORD
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Login failed");
        }

        token = data.token;
        device_name = data.device_name;
        console.log(`Login successful as ${device_name}! Token expires in: ${data.expires_in}`);
        return true;

    } catch (error) {
        console.error(`Login failed:`, error.message);
        return false;
    }
}

/**
 * Connect to TCP server
 */
function connectToTCP() {
    console.log(`Connecting to TCP server ${TCP_SERVER}:${TCP_PORT}...`);

    socket = net.createConnection(TCP_PORT, TCP_SERVER);

    socket.on('connect', () => {
        console.log(`Connected to TCP server`);
        console.log(`Starting to send sensor data every 3 seconds...\n`);
    });

    socket.on('error', (error) => {
        console.error(`TCP connection error:`, error.message);
    });

    socket.on('close', () => {
        console.log(`Connection closed. Reconnecting in 5 seconds...`);
        setTimeout(startClient, 5000);
    });
}

/**
 * Send sensor data to TCP server
 */
async function sendSensorData() {
    if (!socket || socket.destroyed) {
        return;
    }

    try {
        const [cpu, mem, temp, battery, network, time] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.cpuTemperature(),
            si.battery(),
            si.networkInterfaces(),
            si.time()
        ]);

        const payload = {
            cpu: cpu.currentLoad.toFixed(2),
            ram: ((mem.used / mem.total) * 100).toFixed(2),
            temp: temp.main || 0,
            battery: battery.percent || 0,
            network: network,
            uptime: time.uptime,
            timestamp: new Date().toISOString()
        };

        socket.write(JSON.stringify({
            device_id,
            device_name,
            token,
            payload
        }));

        console.log(`Sent data - CPU: ${payload.cpu}%, RAM: ${payload.ram}%, Temp: ${payload.temp}°C`);

    } catch (error) {
        console.error(`Error sending sensor data:`, error.message);
    }
}

/**
 * Start the client
 */
async function startClient() {
    // First, login to get token
    const loginSuccess = await login();

    if (!loginSuccess) {
        console.log(`⏳ Retrying login in 5 seconds...`);
        setTimeout(startClient, 5000);
        return;
    }

    // Connect to TCP server
    connectToTCP();

    // Send sensor data every 3 seconds
    setInterval(sendSensorData, 3000);
}

// Start the client
startClient();
