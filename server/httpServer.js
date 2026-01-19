import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateToken } from "./auth.js";
import { verifyDeviceCredentials, getDeviceInfo, getAllDevices, getLatestMetrics, getMetricsInRange } from "./database.js";
import { getActiveDevices } from "./tcpServer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const httpServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === "POST" && req.url === "/api/login") {
        let body = "";

        req.on("data", chunk => {
            body += chunk.toString();
        });

        req.on("end", () => {
            try {
                const { device_id, password } = JSON.parse(body);

                if (!device_id || !password) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        error: "Missing device_id or password"
                    }));
                    return;
                }

                const verification = verifyDeviceCredentials(device_id, password);

                if (!verification.success) {
                    console.log(`Failed login attempt for device: ${device_id} - ${verification.reason}`);
                    res.writeHead(401, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        error: verification.reason
                    }));
                    return;
                }

                const token = generateToken(device_id);
                const deviceInfo = getDeviceInfo(device_id);
                console.log(`Login successful for device: ${device_id} (${deviceInfo.device_name})`);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    token,
                    device_id,
                    device_name: deviceInfo.device_name,
                    device_type: deviceInfo.device_type,
                    expires_in: "1h"
                }));
                console.log(`Login successful for device: ${device_id} (${deviceInfo.device_name})`);
                console.log(`Token: ${token}`);

            } catch (error) {
                console.error("Login error:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    error: "Internal server error"
                }));
            }
        });

    } else if (req.method === "GET" && req.url === "/api/devices") {
        try {
            const devices = getAllDevices();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                devices
            }));
        } catch (error) {
            console.error("Error fetching devices:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                error: "Internal server error"
            }));
        }

    } else if (req.method === "GET" && req.url === "/api/devices/active") {
        try {
            const activeDeviceIds = getActiveDevices();
            const allDevices = getAllDevices();

            // Filter to only return devices that are currently connected
            const activeDevices = allDevices.filter(device =>
                activeDeviceIds.includes(device.device_id)
            );

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                devices: activeDevices,
                count: activeDevices.length
            }));
        } catch (error) {
            console.error("Error fetching active devices:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                error: "Internal server error"
            }));
        }

    } else if (req.method === "GET" && req.url.startsWith("/api/metrics/")) {
        try {
            const urlParts = req.url.split('/');
            const deviceId = urlParts[3];
            const endpoint = urlParts[4];

            if (!deviceId) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Device ID is required" }));
                return;
            }

            if (endpoint && endpoint.startsWith("latest")) {
                const url = new URL(req.url, `http://${req.headers.host}`);
                const limit = parseInt(url.searchParams.get('limit')) || 100;

                const metrics = getLatestMetrics(deviceId, limit);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    device_id: deviceId,
                    count: metrics.length,
                    metrics
                }));
            } else if (endpoint && endpoint.startsWith("range")) {
                const url = new URL(req.url, `http://${req.headers.host}`);
                const start = url.searchParams.get('start');
                const end = url.searchParams.get('end');

                if (!start || !end) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        error: "Both start and end timestamps are required"
                    }));
                    return;
                }

                const metrics = getMetricsInRange(deviceId, start, end);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    device_id: deviceId,
                    start,
                    end,
                    count: metrics.length,
                    metrics
                }));
            } else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    error: "Unknown endpoint",
                    available: ["latest", "range"]
                }));
            }
        } catch (error) {
            console.error("Error fetching metrics:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                error: "Internal server error"
            }));
        }

    } else {
        // Serve static files from dashboard folder
        let filePath = req.url === '/' ? '/index.html' : req.url;
        filePath = path.join(__dirname, '../dashboard', filePath);

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 - File Not Found');
                } else {
                    res.writeHead(500);
                    res.end('Error loading file: ' + error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});
