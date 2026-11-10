// Starts a Stripe Checkout for the $15/month GuestReply Pro plan.
const { send, currentUser, route, baseUrl } = require("../lib/http");

module.exports = route(["POST"], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Please log in." });
  if (user.is_paid) return send(res, 400, { error: "You already have GuestReply Pro." });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return send(res, 500, { error: "Payments aren't connected yet (missing Stripe key)." });

  const site = baseUrl(req);
  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(process.env.PRICE_CENTS || 1500),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": "GuestReply Pro",
    client_reference_id: String(user.id),
    customer_email: user.email,
    success_url: `${site}/api/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/app?canceled=1`,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await r.json();
  if (!r.ok) {
    console.error("Stripe error", data);
    return send(res, 502, { error: "Couldn't start checkout. Please try again." });
  }
  send(res, 200, { url: data.url });
});
