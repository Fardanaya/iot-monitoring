import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

const WS_PORT = process.env.WS_PORT || 8080;

export const wsServer = new WebSocketServer({ port: WS_PORT });

export function broadcast(data) {
    wsServer.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
}