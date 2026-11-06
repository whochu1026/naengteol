import path from "path";

function read(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

export const env = {
  port: Number(read("PORT", "4000")),
  jwtSecret: read("JWT_SECRET", "dev-only-change-me"),
  jwtExpiresIn: read("JWT_EXPIRES_IN", "7d"),
  frontendOrigin: read("FRONTEND_ORIGIN", "http://localhost:3000"),
  dataDir: path.resolve(process.cwd(), read("DATA_DIR", "./data")),
  cookieName: "naengteol_token",
  demoLogin: read("DEMO_LOGIN", "true") !== "false",
  demoEmail: "demo@naengteol.local",
};
