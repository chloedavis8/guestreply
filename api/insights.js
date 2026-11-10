const { query } = require("../lib/db");
const { findPatterns } = require("../lib/ai");
const { send, currentUser, route } = require("../lib/http");

module.exports = route(["POST"], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Please log in." });
  if (!user.is_paid) return send(res, 402, { error: "The pattern report is part of GuestReply Pro.", needsUpgrade: true });
  const { rows } = await query("SELECT review FROM reviews WHERE user_id = $1 ORDER BY id DESC LIMIT 50", [user.id]);
  if (rows.length < 3) return send(res, 400, { error: "Reply to at least 3 reviews first so there's something to analyze." });
  const profile = (await query("SELECT business_name, business_type, tone, details, signoff FROM business_profiles WHERE user_id = $1", [user.id])).rows[0] || {};
  const report = await findPatterns(profile, rows.map((r) => r.review));
  send(res, 200, { report, reviewCount: rows.length });
});
