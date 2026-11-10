const { query } = require("../lib/db");
const { hashPassword, setSession } = require("../lib/auth");
const { send, readBody, route } = require("../lib/http");

module.exports = route(["POST"], async (req, res) => {
  const { name, email, password } = await readBody(req);
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return send(res, 400, { error: "Please enter a valid email." });
  if (String(password || "").length < 8) return send(res, 400, { error: "Password must be at least 8 characters." });
  const existing = await query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
  if (existing.rows.length) return send(res, 409, { error: "An account with that email already exists. Try logging in." });
  const { rows } = await query(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    [String(name || "").trim().slice(0, 100), cleanEmail, hashPassword(String(password))]
  );
  setSession(res, rows[0].id);
  send(res, 200, { ok: true });
});
