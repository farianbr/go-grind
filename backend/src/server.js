import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import spaceRoutes from "./routes/space.route.js";
import notificationRoutes from "./routes/notification.route.js";
import sessionRoutes from "./routes/session.route.js";

import { connectDB } from "./lib/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.NODE_ENV === "production" 
      ? process.env.FRONTEND_URL 
      : ["http://localhost:5173"],
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

// Serve frontend static files (SPA) if the build exists.
// This will serve the Vite production build located at ../frontend/dist
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDistPath = join(__dirname, "../../frontend/dist");

app.use(express.static(clientDistPath));

// SPA fallback: for any non-API route, return index.html so the client router can handle it
app.get("/", (req, res) => {
  res.sendFile(join(clientDistPath, "index.html"));
});

app.get("/*", (req, res, next) => {
  // If the request is for an API route, skip
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
