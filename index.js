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
// ---- Wallet Reporters: demo submit handler (no-form pages) ----
(function () {
  function findWalletInput() {
    // Try common patterns: id/name/placeholder contains "wallet" or "address"
    const candidates = Array.from(document.querySelectorAll("input, textarea"));
    return (
      candidates.find((el) => /wallet/i.test(el.id || "")) ||
      candidates.find((el) => /wallet/i.test(el.name || "")) ||
      candidates.find((el) => /wallet/i.test(el.placeholder || "")) ||
      candidates.find((el) => /address/i.test(el.id || "")) ||
      candidates.find((el) => /address/i.test(el.name || "")) ||
      candidates.find((el) => /address/i.test(el.placeholder || ""))
    );
  }

  function findEmailInput() {
    return (
      document.querySelector('input[type="email"]') ||
      Array.from(document.querySelectorAll("input")).find((el) => /email/i.test(el.id || "")) ||
      Array.from(document.querySelectorAll("input")).find((el) => /email/i.test(el.name || "")) ||
      Array.from(document.querySelectorAll("input")).find((el) => /email/i.test(el.placeholder || ""))
    );
  }

  function findMessageInput() {
    const candidates = Array.from(document.querySelectorAll("textarea, input"));
    return (
      candidates.find((el) => /message/i.test(el.id || "")) ||
      candidates.find((el) => /details/i.test(el.id || "")) ||
      candidates.find((el) => /describe/i.test(el.placeholder || "")) ||
      candidates.find((el) => /message/i.test(el.placeholder || "")) ||
      null
    );
  }

  function findSubmitButton() {
    // Pick the most likely "submit" button by its visible text
    const buttons = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit']"));
    return (
      buttons.find((b) => /submit/i.test(b.textContent || b.value || "")) ||
      buttons.find((b) => /report/i.test(b.textContent || b.value || "")) ||
      buttons.find((b) => /send/i.test(b.textContent || b.value || "")) ||
      null
    );
  }

  async function submitReport() {
    const apiBase = window.WR_API_BASE;
    if (!apiBase) {
      alert("WR_API_BASE is not set.");
      return;
    }

    const walletEl = findWalletInput();
    const emailEl = findEmailInput();
    const msgEl = findMessageInput();

    const wallet_address = (walletEl && walletEl.value ? String(walletEl.value) : "").trim();
    const email = (emailEl && emailEl.value ? String(emailEl.value) : "").trim();
    const message = (msgEl && msgEl.value ? String(msgEl.value) : "").trim();

    if (!wallet_address) {
      alert("Please enter a wallet address.");
      return;
    }
    if (!email) {
      alert("Please enter an email (demo only).");
      return;
    }

    const payload = {
      wallet_address,
      email,
      message,
      url: window.location.href,
      category: "demo"
    };

    try {
      const res = await fetch(apiBase.replace(/\/$/, "") + "/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        console.error("Submit failed:", res.status, data);
        alert("Submit failed. Check console for details.");
        return;
      }

      console.log("Submitted:", data);
      alert("Submitted! Thank you.");
    } catch (e) {
      console.error("Submit error:", e);
      alert("Submit failed (network error). Check console.");
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const btn = findSubmitButton();
    if (!btn) {
      console.warn("Wallet Reporters: could not find submit button.");
      return;
    }

    // Avoid double-wiring
    if (btn.__wrBound) return;
    btn.__wrBound = true;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      submitReport();
    });

    console.log("Wallet Reporters: submit handler attached to:", btn);
  });
})();
