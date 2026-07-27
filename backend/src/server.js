import dotenv from "dotenv";

import app from "./app.js";
import { connectDB } from "./lib/db.js";
import { isProduction } from "./lib/config.js";

dotenv.config();

// On Vercel the platform imports this module and handles the request itself, so no
// port is ever bound. Locally (NODE_ENV=development) we start a real HTTP server.
if (!isProduction) {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server", error);
      process.exit(1);
    });
}

export default app;
