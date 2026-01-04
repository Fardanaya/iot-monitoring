import net from "net";
import { verifyToken } from "./auth.js";
import { broadcast } from "./wsServer.js";

const deviceList = new Map();

export const tcpServer = net.createServer((socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`New connection from ${clientAddress}`);

    socket.on('data', buffer => {
        try {
            const msg = JSON.parse(buffer.toString());

            const decoded = verifyToken(msg.token);

            if (!decoded || !decoded.device_id) {
                console.log(`Authentication failed from ${clientAddress} - Invalid token`);
                socket.write(JSON.stringify({
                    error: "Authentication failed - Invalid token"
                }));
                socket.destroy();
                return;
            }

            if (msg.device_id !== decoded.device_id) {
                console.log(`Device ID mismatch from ${clientAddress} - Token: ${decoded.device_id}, Sent: ${msg.device_id}`);
                socket.write(JSON.stringify({
                    error: "Device ID mismatch"
                }));
                socket.destroy();
                return;
            }

            deviceList.set(socket, decoded);

            console.log(`Data received from device: ${msg.device_id}`);

            broadcast({
                device_id: msg.device_id,
                device_name: msg.device_name || msg.device_id,
                data: msg.payload
            });

        } catch (error) {
            console.error(`Error processing data from ${clientAddress}:`, error.message);
            socket.destroy();
        }
    });

    socket.on('close', () => {
        let removedDevice = null;
        deviceList.forEach((value, key) => {
            if (key === socket) {
                removedDevice = value.device_id;
                deviceList.delete(key);
            }
        });

        if (removedDevice) {
            console.log(`Device disconnected: ${removedDevice} (${clientAddress})`);
        } else {
            console.log(`Connection closed: ${clientAddress}`);
        }
    });

    socket.on('error', (error) => {
        console.error(`Socket error from ${clientAddress}:`, error.message);
    });
});