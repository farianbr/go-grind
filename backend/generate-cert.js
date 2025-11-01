import selfsigned from "selfsigned";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.join(__dirname, "cert");

// Create cert directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

console.log("Generating self-signed SSL certificates...");

try {
  const attrs = [{ name: "commonName", value: "localhost" }];
  const pems = selfsigned.generate(attrs, {
    keySize: 2048,
    days: 365,
    algorithm: "sha256",
    extensions: [
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 2, value: "192.168.1.114" },
          { type: 7, ip: "127.0.0.1" },
          { type: 7, ip: "192.168.1.114" },
        ],
      },
    ],
  });

  fs.writeFileSync(path.join(certDir, "cert.pem"), pems.cert);
  fs.writeFileSync(path.join(certDir, "key.pem"), pems.private);

  console.log("✅ SSL certificates generated successfully!");
  console.log(`   Certificate: ${path.join(certDir, "cert.pem")}`);
  console.log(`   Key: ${path.join(certDir, "key.pem")}`);
  console.log("\n⚠️  Don't forget to update your frontend .env:");
  console.log("   VITE_API_URL=https://192.168.1.114:5000/api");
} catch (error) {
  console.error("❌ Failed to generate certificates:", error);
  process.exit(1);
}
