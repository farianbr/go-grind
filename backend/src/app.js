import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import spaceRoutes from "./routes/space.route.js";
import notificationRoutes from "./routes/notification.route.js";
import sessionRoutes from "./routes/session.route.js";

import { connectDB } from "./lib/db.js";
import { isProduction } from "./lib/config.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  process.env.FRONTEND_URL,
  "https://go-grind.vercel.app", // Add your deployed frontend URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);
app.use(express.json());
app.use(cookieParser());

// Make sure MongoDB is connected before any API route runs. connectDB() caches the
// connection, so this is a no-op once the process (or warm lambda) is connected.
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed", error);
    res.status(503).json({ message: "Database unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", env: process.env.NODE_ENV || "development" });
});

// API-only: the frontend is a separate Vercel deployment and is never served here.
app.get("/", (req, res) => {
  res.status(200).json({
    message: "go-grind API is running",
    env: isProduction ? "production" : "development",
  });
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error", error);
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({
    message: isProduction ? "Internal Server Error" : error.message,
  });
});

export default app;
