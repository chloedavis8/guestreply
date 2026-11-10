// The AI feature: writes review replies and finds patterns, using Claude.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

async function askClaude(system, user, maxTokens) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const e = new Error("ANTHROPIC_API_KEY missing");
    e.publicMessage = "The AI isn't connected yet (missing API key).";
    throw e;
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`Anthropic API ${r.status}: ${JSON.stringify(data)}`);
    e.publicMessage = "The AI couldn't respond right now. Please try again in a moment.";
    throw e;
  }
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

function parseJson(text, open, close) {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start === -1 || end === -1) throw Object.assign(new Error("Bad AI JSON: " + text), { publicMessage: "The AI gave an unexpected answer. Please try again." });
  return JSON.parse(text.slice(start, end + 1));
}

function describeBusiness(p) {
  return [
    `Business name: ${p.business_name || "(not given)"}`,
    `Type: ${p.business_type || "Restaurant or hotel"}`,
    `Tone of voice: ${p.tone || "Warm and professional"}`,
    `About the business (menu, policies, facts): ${p.details || "(none given)"}`,
    `Sign replies as: ${p.signoff || p.business_name || "The Team"}`,
  ].join("\n");
}

async function writeReplies(profile, reviews) {
  const system = `You write public replies to online guest reviews on behalf of a hospitality business.
Rules:
- Reply in the business's tone of voice and sign off as instructed.
- Respond to the specific things the guest mentioned (dishes, staff, wait times, rooms, etc.). Never be generic.
- For complaints: thank them, apologize sincerely for the specific issue, briefly say what the business will do, and invite them to get in touch or come back. Never argue or blame the guest.
- For praise: thank them warmly and mention the specific things they liked.
- Only state facts given in the business details. Never invent discounts, refunds, staff names or policies.
- Keep each reply 2 to 5 sentences. Plain text, no emojis, no hashtags.
Return ONLY a JSON array of strings, one reply per review, in the same order.`;
  const user = `${describeBusiness(profile)}\n\nReviews to reply to:\n${reviews.map((r, i) => `[${i + 1}] ${r}`).join("\n\n")}`;
  const replies = parseJson(await askClaude(system, user, 600 * reviews.length + 200), "[", "]");
  if (!Array.isArray(replies) || replies.length !== reviews.length) {
    throw Object.assign(new Error("Reply count mismatch"), { publicMessage: "The AI gave an unexpected answer. Please try again." });
  }
  return replies.map(String);
}

async function findPatterns(profile, reviews) {
  const system = `You are an operations advisor for a hospitality business. You read its recent guest reviews and tell the manager what keeps coming up.
Return ONLY JSON in this shape:
{"summary": "2-3 sentence overview of guest sentiment",
 "praise": [{"theme": "...", "count": n, "example": "short quote"}],
 "problems": [{"theme": "...", "count": n, "example": "short quote", "suggestion": "one practical fix"}]}
Only include themes that actually appear in the reviews. Count how many reviews mention each theme. Order by count, highest first. At most 4 of each.`;
  const user = `${describeBusiness(profile)}\n\n${reviews.length} recent reviews:\n${reviews.map((r, i) => `[${i + 1}] ${r}`).join("\n\n")}`;
  return parseJson(await askClaude(system, user, 1500), "{", "}");
}

module.exports = { writeReplies, findPatterns };
