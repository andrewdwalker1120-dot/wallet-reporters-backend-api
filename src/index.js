export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "wallet-reporters-backend" }, cors);
    }

    // POST /api/reports (public)
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

    // GET /api/reports?wallet=0x... (public)
    if (
  request.method === "GET" &&
  (url.pathname === "/api/admin/reports" ||
    url.pathname === "/api/admin/reports/")
) {
  const adminKey = request.headers.get("x-admin-key");
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return json({ ok: false, error: "Unauthorized" }, cors, 401);
  }

  const q = (url.searchParams.get("q") || "").trim();
  const limitRaw = parseInt(url.searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 200)
    : 50;

  let stmt;
  if (!q) {
    stmt = env.wallet_reporters.prepare(
      `SELECT id, wallet_address, email, category, message, url, created_at
       FROM reports
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(limit);
  } else if (q.includes("@")) {
    stmt = env.wallet_reporters.prepare(
      `SELECT id, wallet_address, email, category, message, url, created_at
       FROM reports
       WHERE email LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(`%${q}%`, limit);
  } else {
    stmt = env.wallet_reporters.prepare(
      `SELECT id, wallet_address, email, category, message, url, created_at
       FROM reports
       WHERE wallet_address LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(`%${q}%`, limit);
  }

  const { results } = await stmt.all();
  return json({ ok: true, results }, cors);
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

    // GET /api/admin/reports?q=...&limit=50 (admin)
    if (
      request.method === "GET" &&
      (url.pathname === "/api/admin/reports" ||
        url.pathname === "/api/admin/reports/")
    ) {
      const q = (url.searchParams.get("q") || "").trim();
      const limitRaw = parseInt(url.searchParams.get("limit") || "50", 10);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 200)
        : 50;

      let stmt;
      if (!q) {
        stmt = env.wallet_reporters.prepare(
          `SELECT id, wallet_address, email, category, message, url, created_at
           FROM reports
           ORDER BY created_at DESC
           LIMIT ?`
        ).bind(limit);
      } else if (q.includes("@")) {
        stmt = env.wallet_reporters.prepare(
          `SELECT id, wallet_address, email, category, message, url, created_at
           FROM reports
           WHERE email LIKE ?
           ORDER BY created_at DESC
           LIMIT ?`
        ).bind(`%${q}%`, limit);
      } else {
        stmt = env.wallet_reporters.prepare(
          `SELECT id, wallet_address, email, category, message, url, created_at
           FROM reports
           WHERE wallet_address LIKE ?
           ORDER BY created_at DESC
           LIMIT ?`
        ).bind(`%${q}%`, limit);
      }

      const { results } = await stmt.all();
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
