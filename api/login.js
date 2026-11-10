const { query } = require("../lib/db");
const { checkPassword, setSession } = require("../lib/auth");
const { send, readBody, route } = require("../lib/http");

module.exports = route(["POST"], async (req, res) => {
  const { email, password } = await readBody(req);
  const { rows } = await query("SELECT id, password_hash FROM users WHERE email = $1", [String(email || "").trim().toLowerCase()]);
  if (!rows[0] || !checkPassword(String(password || ""), rows[0].password_hash)) {
    return send(res, 401, { error: "Wrong email or password." });
  }
  setSession(res, rows[0].id);
  send(res, 200, { ok: true });
});
