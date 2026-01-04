import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const secretKey = process.env.JWT_SECRET;

export function generateToken(device_id) {
    return jwt.sign({ device_id }, secretKey, { expiresIn: "1h" });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, secretKey);
    } catch (error) {
        return null;
    }
}
