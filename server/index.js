import dotenv from "dotenv";
import { tcpServer } from './tcpServer.js';
import { httpServer } from './httpServer.js';

dotenv.config();

const TCP_PORT = process.env.TCP_PORT || 9000;
const WS_PORT = process.env.WS_PORT || 8080;
const HTTP_PORT = process.env.HTTP_PORT || 3000;

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Auth Server running on port ${HTTP_PORT}`);
    console.log(`Login endpoint: http://localhost:${HTTP_PORT}/api/login`);
});

tcpServer.listen(TCP_PORT, () => {
    console.log(`TCP IoT Server running on port ${TCP_PORT}`);
});

console.log(`WebSocket Server running on port ${WS_PORT}`);
console.log('\nAll servers started successfully!\n');
