const { query } = require("../lib/db");
const { send, currentUser, route, FREE_REPLIES } = require("../lib/http");

module.exports = route(["GET"], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Not logged in." });
  const profile = (await query("SELECT business_name, business_type, tone, details, signoff FROM business_profiles WHERE user_id = $1", [user.id])).rows[0] || null;
  const used = Number((await query("SELECT COUNT(*) AS n FROM reviews WHERE user_id = $1", [user.id])).rows[0].n);
  send(res, 200, { user, profile, used, freeLimit: FREE_REPLIES });
});
