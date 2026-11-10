const { query } = require("../lib/db");
const { writeReplies } = require("../lib/ai");
const { send, readBody, currentUser, route, FREE_REPLIES } = require("../lib/http");

const MAX_PER_BATCH = 10;

module.exports = route(["GET", "POST"], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Please log in." });

  if (req.method === "GET") {
    const { rows } = await query("SELECT id, review, reply, created_at FROM reviews WHERE user_id = $1 ORDER BY id DESC LIMIT 50", [user.id]);
    return send(res, 200, { history: rows });
  }

  const body = await readBody(req);
  const reviews = (Array.isArray(body.reviews) ? body.reviews : [])
    .map((r) => String(r || "").trim().slice(0, 3000))
    .filter(Boolean);
  if (!reviews.length) return send(res, 400, { error: "Paste at least one review." });
  if (reviews.length > MAX_PER_BATCH) return send(res, 400, { error: `Up to ${MAX_PER_BATCH} reviews at a time, please.` });

  if (!user.is_paid) {
    const used = Number((await query("SELECT COUNT(*) AS n FROM reviews WHERE user_id = $1", [user.id])).rows[0].n);
    if (used + reviews.length > FREE_REPLIES) {
      return send(res, 402, { error: `Free accounts get ${FREE_REPLIES} replies. You have ${Math.max(0, FREE_REPLIES - used)} left. Upgrade for unlimited replies.`, needsUpgrade: true });
    }
  }

  const profile = (await query("SELECT business_name, business_type, tone, details, signoff FROM business_profiles WHERE user_id = $1", [user.id])).rows[0] || {};
  const replies = await writeReplies(profile, reviews);
  const saved = [];
  for (let i = 0; i < reviews.length; i++) {
    const { rows } = await query("INSERT INTO reviews (user_id, review, reply) VALUES ($1, $2, $3) RETURNING id, review, reply, created_at", [user.id, reviews[i], replies[i]]);
    saved.push(rows[0]);
  }
  send(res, 200, { results: saved });
});
