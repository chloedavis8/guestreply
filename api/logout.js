const { clearSession } = require("../lib/auth");
const { send, route } = require("../lib/http");

module.exports = route(["POST"], async (req, res) => {
  clearSession(res);
  send(res, 200, { ok: true });
});
