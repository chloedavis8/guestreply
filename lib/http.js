// Small helpers shared by the API routes.
const { query } = require("./db");
const { sessionUserId } = require("./auth");

const FREE_REPLIES = 5;

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { return {}; }
}

async function currentUser(req) {
  const id = sessionUserId(req);
  if (!id) return null;
  const { rows } = await query("SELECT id, name, email, is_paid FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

// Wraps a route so errors come back as a clear message instead of a crash.
function route(methods, fn) {
  return async (req, res) => {
    if (!methods.includes(req.method)) return send(res, 405, { error: "Method not allowed" });
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      send(res, 500, { error: err.publicMessage || "Something went wrong. Please try again." });
    }
  };
}

function baseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers.host}`;
}

module.exports = { send, readBody, currentUser, route, baseUrl, FREE_REPLIES };
