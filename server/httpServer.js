import http from "http";
import { generateToken } from "./auth.js";
import { verifyDeviceCredentials, getDeviceInfo } from "./database.js";

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

    } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            error: "Not found",
            available_endpoints: ["/api/login (POST)"]
        }));
    }
});
