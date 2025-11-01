import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import spaceRoutes from "./routes/space.route.js";
import notificationRoutes from "./routes/notification.route.js";
import sessionRoutes from "./routes/session.route.js";

import { connectDB } from "./lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://localhost:5173", "http://192.168.1.114:5173", "https://192.168.1.114:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sessions", sessionRoutes);

// Try to use HTTPS if certificates exist, otherwise fallback to HTTP
const certPath = path.join(__dirname, "..", "cert", "cert.pem");
const keyPath = path.join(__dirname, "..", "cert", "key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https.createServer(httpsOptions, app).listen(PORT, "0.0.0.0", () => {
    console.log(`🔒 HTTPS Server is running on https://0.0.0.0:${PORT}`);
    connectDB();
  });
} else {
  console.log("⚠️  SSL certificates not found. Running on HTTP.");
  console.log("   To enable HTTPS, run: npm run generate-cert");
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    connectDB();
  });
}
