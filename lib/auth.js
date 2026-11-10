// Passwords and login sessions, using only Node's built-in crypto.
const crypto = require("crypto");

const COOKIE = "gr_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, "hex");
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

// Key used to sign login cookies. Uses AUTH_SECRET if set; otherwise derives
// one from the private database connection string, which only the server knows.
function secret() {
  const s = process.env.AUTH_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!s) throw new Error("No AUTH_SECRET or database configured.");
  return crypto.createHash("sha256").update("guestreply-session:" + s).digest("hex");
}

function sign(data) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

function makeToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + THIRTY_DAYS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now() / 1000) return null;
    return data.uid;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function setSession(res, userId) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${makeToken(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${THIRTY_DAYS}${secure}`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function sessionUserId(req) {
  return readToken(getCookie(req, COOKIE));
}

module.exports = { hashPassword, checkPassword, setSession, clearSession, sessionUserId };
