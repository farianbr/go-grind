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

// CORS configuration - allow multiple origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  process.env.FRONTEND_URL,
  "https://go-grind.vercel.app", // Add your deployed frontend URL
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
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

// Connect to MongoDB - ensure this happens only once for serverless environments
let isConnected = false;
app.use((req, res, next) => {
  if (!isConnected) {
    connectDB();
    isConnected = true;
  }
  next();
});

// Define API routes
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
  if (req.path.startsWith("/api/")) return next();
  return res.sendFile(join(clientDistPath, "index.html"));
});

// // Start the server - local development
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   connectDB();
// });

// Export the app for serverless deployment
export default app;