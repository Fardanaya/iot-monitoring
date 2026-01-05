import net from "net";
import { verifyToken } from "./auth.js";
import { broadcast } from "./wsServer.js";

const deviceList = new Map(); // Map<device_id, {socket, decoded, clientAddress}>

export const tcpServer = net.createServer((socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`New connection from ${clientAddress}`);

    let dataBuffer = '';
    let currentDeviceId = null;

    socket.on('data', buffer => {
        try {
            dataBuffer += buffer.toString();

            // Split by newline to handle multiple messages
            const messages = dataBuffer.split('\n');

            // Keep the last incomplete message in buffer
            dataBuffer = messages.pop();

            // Process each complete message
            for (const msgStr of messages) {
                if (!msgStr.trim()) continue;

                const msg = JSON.parse(msgStr);

                const decoded = verifyToken(msg.token);

                if (!decoded || !decoded.device_id) {
                    console.log(`Authentication failed from ${clientAddress} - Invalid token`);
                    socket.write(JSON.stringify({
                        error: "Authentication failed - Invalid token"
                    }) + '\n');
                    socket.destroy();
                    return;
                }

                if (msg.device_id !== decoded.device_id) {
                    console.log(`Device ID mismatch from ${clientAddress} - Token: ${decoded.device_id}, Sent: ${msg.device_id}`);
                    socket.write(JSON.stringify({
                        error: "Device ID mismatch"
                    }) + '\n');
                    socket.destroy();
                    return;
                }

                // Store device by device_id, not socket
                currentDeviceId = msg.device_id;

                // Check if device already exists and close old connection
                if (deviceList.has(currentDeviceId)) {
                    const oldDevice = deviceList.get(currentDeviceId);
                    console.log(`Device ${currentDeviceId} reconnecting. Closing old connection from ${oldDevice.clientAddress}`);
                    oldDevice.socket.destroy();
                }

                deviceList.set(currentDeviceId, {
                    socket,
                    decoded,
                    clientAddress
                });

                console.log(`Data received from device: ${msg.device_id} (${clientAddress})`);
                console.log(`Active devices: ${deviceList.size}`);

                broadcast({
                    device_id: msg.device_id,
                    device_name: msg.device_name || msg.device_id,
                    data: msg.payload
                });
            }

        } catch (error) {
            console.error(`Error processing data from ${clientAddress}:`, error.message);
            socket.destroy();
        }
    });

    socket.on('close', () => {
        if (currentDeviceId && deviceList.has(currentDeviceId)) {
            const device = deviceList.get(currentDeviceId);
            // Only remove if this socket is the current one for this device
            if (device.socket === socket) {
                deviceList.delete(currentDeviceId);
                console.log(`Device disconnected: ${currentDeviceId} (${clientAddress})`);
                console.log(`Active devices: ${deviceList.size}`);
            }
        } else {
            console.log(`Connection closed: ${clientAddress}`);
        }
    });

    socket.on('error', (error) => {
        console.error(`Socket error from ${clientAddress}:`, error.message);
    });
});