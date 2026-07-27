import dotenv from "dotenv";

// Loaded here (not just in server.js) because ES module imports are evaluated before
// the importing module's body runs — without this, NODE_ENV would be read too early.
dotenv.config();

export const isProduction = process.env.NODE_ENV === "production";

// In production the frontend and API live on different Vercel domains, so the
// auth cookie has to be SameSite=None + Secure to survive the cross-site request.
// Locally the frontend is on plain http, where a Secure/None cookie is unreliable
// (and rejected outright by Safari), so use Lax instead.
export const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};
