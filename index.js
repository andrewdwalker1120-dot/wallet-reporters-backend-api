export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "wallet-reporters-backend" }, cors);
    }
  const adminKey = request.headers.get("x-admin-key");
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return json({ ok: false, error: "Unauthorized" }, cors, 401);
  }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, cors, 400);
      }

      const wallet_address = String(body.wallet_address || "").trim();
      const email = String(body.email || "").trim();
      const category = body.category ? String(body.category).trim() : null;
      const message = body.message ? String(body.message).trim() : null;
      const report_url = body.url ? String(body.url).trim() : null;

      if (!wallet_address) {
        return json({ ok: false, error: "wallet_address is required" }, cors, 400);
      }
      if (!email) {
        return json({ ok: false, error: "email is required (demo only)" }, cors, 400);
      }

      const id = crypto.randomUUID();
      const created_at = Math.floor(Date.now() / 1000);

      await env.wallet_reporters
        .prepare(
          `INSERT INTO reports (id, wallet_address, email, category, message, url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, wallet_address, email, category, message, report_url, created_at)
        .run();

      return json({ ok: true, id, created_at }, cors);
    }

    if (request.method === "GET" && url.pathname === "/api/reports") {
      const wallet = (url.searchParams.get("wallet") || "").trim();
      if (!wallet) {
        return json({ ok: false, error: "wallet query param required" }, cors, 400);
      }

      const { results } = await env.wallet_reporters
        .prepare(
          `SELECT id, wallet_address, category, message, url, created_at
           FROM reports
           WHERE wallet_address = ?
           ORDER BY created_at DESC
           LIMIT 100`
        )
        .bind(wallet)
        .all();

      return json({ ok: true, results }, cors);
    }

    return json({ ok: false, error: "Not found" }, cors, 404);
  },
};

function json(obj, corsHeaders, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
