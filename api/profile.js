const { query } = require("../lib/db");
const { send, readBody, currentUser, route } = require("../lib/http");

module.exports = route(["POST"], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Please log in." });
  const b = await readBody(req);
  const clip = (v, n) => String(v || "").trim().slice(0, n);
  await query(
    `INSERT INTO business_profiles (user_id, business_name, business_type, tone, details, signoff, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET business_name = $2, business_type = $3, tone = $4, details = $5, signoff = $6, updated_at = NOW()`,
    [user.id, clip(b.business_name, 120), clip(b.business_type, 60), clip(b.tone, 60), clip(b.details, 2000), clip(b.signoff, 120)]
  );
  send(res, 200, { ok: true });
});
