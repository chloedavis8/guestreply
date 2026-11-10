// Stripe sends the customer here after paying. We double-check with Stripe, then unlock Pro.
const { query } = require("../lib/db");
const { currentUser, route } = require("../lib/http");

function redirect(res, to) {
  res.statusCode = 302;
  res.setHeader("Location", to);
  res.end();
}

module.exports = route(["GET"], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return redirect(res, "/login");
  const id = new URL(req.url, "http://x").searchParams.get("session_id");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!id || !key) return redirect(res, "/app?payment=error");

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const s = await r.json();
  const paid = r.ok && s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required");
  if (paid && String(s.client_reference_id) === String(user.id)) {
    await query("UPDATE users SET is_paid = TRUE WHERE id = $1", [user.id]);
    return redirect(res, "/app?upgraded=1");
  }
  redirect(res, "/app?payment=error");
});
