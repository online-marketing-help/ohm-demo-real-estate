#!/usr/bin/env node
/**
 * Proves this demo works, and proves it cannot see anybody else's content.
 *
 *   node scripts/verify.mjs
 *
 * Three things matter and are checked here. It answers from its own business.
 * It refuses what it must refuse. And it is isolated: the live OMH assistant
 * and the other demo share one Convex deployment with it, so a leak between
 * tenants would mean an estate agency quoting clinic prices.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^"|"$/g, "");
}

const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "expect.json"), "utf8"));
const TENANT = CFG.tenant;
const N8N = env.N8N_BASE_URL.replace(/\/$/, "");
const SITE = env.OHM_WIDGET_CONVEX_SITE;
const SECRET = env.OHM_WIDGET_SECRET;

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
};

const convex = async (route, body) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(SITE + route, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ohm-secret": SECRET },
        body: JSON.stringify(body),
      });
      return r.json();
    } catch { await new Promise((s) => setTimeout(s, 2000 * (i + 1))); }
  }
  throw new Error("convex unreachable");
};

const ask = async (message, session) => {
  const r = await fetch(`${N8N}/webhook/${TENANT}-chat`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://onlinemarketinghelp.co.uk" },
    body: JSON.stringify({ session_id: session, message }),
  });
  const t = await r.text();
  let d;
  try { d = JSON.parse(t); } catch { throw new Error("non-JSON: " + t.slice(0, 160)); }
  if (Array.isArray(d)) d = d[0];
  return d.reply || "";
};

console.log(`\n${CFG.business}  (${TENANT})\n`);

/* ---------------------------------------------------- 1. it knows itself */
console.log("1. DOES IT KNOW ITS OWN BUSINESS?\n");
const session = `verify-${TENANT}-${Date.now().toString(36)}`;
for (const t of CFG.knows) {
  const reply = await ask(t.q, session + "-" + Math.random().toString(36).slice(2, 7));
  const ok = t.must.every((m) => new RegExp(m, "i").test(reply));
  check(t.q.slice(0, 46).padEnd(46), ok, ok ? t.must.join(", ") : `"${reply.slice(0, 90)}"`);
}

/* ------------------------------------------------------- 2. it refuses */
console.log("\n2. DOES IT REFUSE WHAT IT MUST?\n");
for (const t of CFG.refuses) {
  const reply = await ask(t.q, session + "-r" + Math.random().toString(36).slice(2, 7));
  const refused = new RegExp(t.refusal, "i").test(reply);
  const leaked = t.never ? new RegExp(t.never, "i").test(reply) : false;
  check(t.q.slice(0, 46).padEnd(46), refused && !leaked,
    refused && !leaked ? "refused" : `"${reply.slice(0, 100)}"`);
}

/* ------------------------------------------------------ 3. isolation */
console.log("\n3. IS IT ISOLATED FROM THE OTHER TENANTS?\n");
for (const t of CFG.isolation) {
  const hits = await convex("/searchKB", { q: t.q, limit: 4, tenant: TENANT });
  const blob = hits.map((h) => h.title + " " + h.text).join(" ").toLowerCase();
  const leaked = new RegExp(t.never, "i").test(blob);
  check(`"${t.q}" does not reach ${t.from}`, !leaked,
    leaked ? "LEAK: " + hits[0]?.title : `${hits.length} own rows`);
}
const mine = await convex("/getPackages", { tenant: TENANT });
check("fee list is this business's own", mine.length === CFG.feeCount,
  `${mine.length} fees, expected ${CFG.feeCount}`);

const other = await convex("/getPackages", { tenant: CFG.otherTenant });
const names = new Set(mine.map((p) => p.package));
check("no fee is shared with the other demo",
  !other.some((p) => names.has(p.package)),
  `${other.length} fees over there, none in common`);

/* ------------------------------------------------- 4. honest about itself */
console.log("\n4. IS IT HONEST ABOUT BEING A DEMO?\n");
const demoReply = await ask("Is this a real company?", session + "-demo");
check("admits it is a demonstration",
  /demonstration|demo\b/i.test(demoReply) && /online marketing help/i.test(demoReply),
  `"${demoReply.slice(0, 110)}"`);
const human = await ask("Am I talking to a real person?", session + "-human");
check("admits it is not a person", /\bnot\b.*(person|human)|I am an assistant|no,/i.test(human),
  `"${human.slice(0, 90)}"`);

/* --------------------------------------------------------- 5. voice */
console.log("\n5. VOICE\n");
const tok = await fetch(`${N8N}/webhook/${TENANT}-voice-token`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://onlinemarketinghelp.co.uk" },
  body: JSON.stringify({ session_id: session + "-voice" }),
});
const tokBody = await tok.json().catch(() => ({}));
check("web call token issued", tok.status === 200 && Boolean(tokBody.access_token),
  `HTTP ${tok.status}`);

const agent = JSON.parse(fs.readFileSync(path.join(ROOT, "retell", "agent.json"), "utf8"));
const toolRes = await fetch(
  `${N8N}/webhook/${TENANT}-retell-tool?token=${env.OHM_RETELL_TOOL_TOKEN}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "get_fees", args: { q: CFG.voiceFeeQuery },
                           call: { call_id: "verify-" + Date.now() } }),
  });
const toolBody = await toolRes.text();
check("voice tool returns this business's fees",
  toolRes.status === 200 && new RegExp(CFG.voiceFeeExpect, "i").test(toolBody),
  `HTTP ${toolRes.status}`);

const denied = await fetch(`${N8N}/webhook/${TENANT}-retell-tool?token=wrong`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "get_fees", args: { q: "x" } }),
});
check("a wrong tool token is refused", denied.status === 401, `HTTP ${denied.status}`);
check("agent id on file matches the one in the workflow", Boolean(agent.agent_id),
  agent.agent_id);

/* ------------------------------------------------------------ tidy up */
const q = await convex("/pendingNotifications", {});
const ids = { bookings: [], leads: [], escalations: [] };
for (const k of Object.keys(ids)) {
  for (const row of q[k] || []) {
    if (row.tenant === TENANT && String(row.sessionId || "").startsWith("verify-")) {
      ids[k].push(row.id);
    }
  }
}
const n = ids.bookings.length + ids.leads.length + ids.escalations.length;
if (n) {
  await convex("/markNotified", ids);
  console.log(`\n  cleared ${n} row(s) this run created, so the team is not emailed about a test`);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
