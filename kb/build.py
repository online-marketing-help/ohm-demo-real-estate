#!/usr/bin/env python3
"""
Turns business.py into knowledge base rows and pushes them to Convex.

    python3 kb/build.py            build and show
    python3 kb/build.py --push     build and seed

Deterministic. No model is involved in writing the knowledge base, because a
model paraphrasing a fee list is how an agent ends up quoting a price nobody
agreed. Every chunk here is assembled from the fields in business.py.

Rows are written under this demo's tenant, so they are invisible to the live
OMH assistant and vice versa.
"""
import json
import pathlib
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import business as B  # noqa: E402

env = {}
for line in (ROOT / ".env.local").read_text().split("\n"):
    t = line.strip()
    if not t or t.startswith("#") or "=" not in t:
        continue
    k, _, v = t.partition("=")
    env[k] = v.strip().strip('"')

SITE = env["OHM_WIDGET_CONVEX_SITE"]
SECRET = env["OHM_WIDGET_SECRET"]


def post(route, body, tries=4):
    """Convex's edge occasionally resets the connection mid-handshake. One retry
       is not enough; it has needed three on a slow link."""
    last = None
    for n in range(tries):
        try:
            r = urllib.request.Request(
                SITE + route, data=json.dumps(body).encode(),
                headers={"content-type": "application/json", "x-ohm-secret": SECRET})
            with urllib.request.urlopen(r, timeout=120) as resp:
                return json.load(resp)
        except Exception as e:                      # noqa: BLE001
            last = e
            time.sleep(2 + n * 2)
    raise last


rows = []


def add(key, kind, title, text, service="General", also=""):
    """The search index runs over `text` only, not the title, so a chunk headed
       "Insurers we are recognised by" did not come top for "insurers". The
       title, and any extra phrasings a caller might use, go into the text."""
    body = text.strip()
    head = title.strip()
    if head.lower() not in body.lower():
        body = f"{head}. {body}"
    if also:
        body = f"{body} {also.strip()}"
    rows.append(dict(key=f"{B.TENANT}:{key}", kind=kind, title=title,
                     service=service, url="", text=body))


# ----------------------------------------------------------------- company
b = B.BIZ
add("company", "company", f"About {b['name']}",
    f"{b['name']} is a {b['kind']} in {b['town']}, covering {b['area']}. "
    f"Established {b['founded']}, with {b['branches']}. "
    f"Telephone {b['phone']}, email {b['email']}. "
    f"Opening hours: {b['hours']}.")

add("contact", "company", "Phone, email and hours",
    f"You can reach {b['short']} on {b['phone']} or by email at {b['email']}. "
    f"The office is open {b['hours']}. Appointments can be booked outside those "
    "hours through this assistant.")

# ------------------------------------------------------------------- team
if hasattr(B, "TEAM"):
    team = "; ".join(f"{n}, {role}, covers {area} ({dept})" for n, role, area, dept in B.TEAM)
    add("team", "company", "Who does what",
        f"The team at {b['short']}: {team}. Appointments are booked against the "
        "right person's diary, not into a general pool.")

if hasattr(B, "CLINICS"):
    cl = "; ".join(f"{name} with {who}, {days}, {first} minutes for a first "
                   f"appointment and {follow} for a follow-up"
                   for name, who, days, first, follow in B.CLINICS)
    add("clinics", "company", "Clinics and consultants",
        f"{b['short']} runs: {cl}.")

# ------------------------------------------------------------------- fees
for f in B.FEES:
    add(f"fee-{f['name'].lower().replace(' ', '-')}", "pricing",
        f"{f['group']}: {f['name']}",
        f"{f['name']} is {f['price']}. {f['detail']}", service=f["group"])

groups = sorted({f["group"] for f in B.FEES})
for g in groups:
    items = [f for f in B.FEES if f["group"] == g]
    summary = ". ".join(f"{i['name']} is {i['price']}" for i in items)
    add(f"fees-{g.lower()}", "pricing", f"All {g.lower()} fees",
        f"{g} at {b['short']}: {summary}. These are the only figures that may be "
        "quoted.", service=g)

# --------------------------------------------------------------- insurers
if hasattr(B, "INSURERS"):
    add("insurers", "faq", "Insurers we are recognised by",
        f"{b['short']} is recognised by {', '.join(B.INSURERS)}. You will need your "
        "membership number and usually an authorisation code from your insurer. "
        "Whether a specific policy covers a specific treatment is for the insurer "
        "to confirm, not us.",
        also="Which insurers do you take. Do you take insurance. Are you recognised "
             "by my insurer. Insured patients. Private medical insurance.")

# ------------------------------------------------------------------ facts
for title, text in B.FACTS:
    add(f"fact-{title.lower().replace(' ', '-')}", "faq", title, text)

# ---------------------------------------------------------------- triage
if hasattr(B, "TRIAGE"):
    for when, what in B.TRIAGE:
        add(f"triage-{when[:24].lower().replace(' ', '-').replace(',', '')}",
            "faq", "Urgency rules", f"If the caller describes {when.lower()}: {what}")

# ------------------------------------------------------------------ never
add("limits", "company", "What the assistant will not do",
    "The assistant will not: " + " ".join(B.NEVER))

# ------------------------------------------------------------------ demo
add("is-a-demo", "company", "This is a demonstration",
    f"{b['name']} is a fictional {b['kind']} created by Online Marketing Help to "
    "demonstrate an AI voice agent. The business, the people, the prices and the "
    "phone number are invented. If a caller asks whether this is a real company, "
    "say plainly that it is a demonstration built by Online Marketing Help, and "
    "that a real one would be built from their own information.")

# ----------------------------------------------------------- fees as packages
pkg_rows = []
for f in B.FEES:
    num = "".join(c for c in f["price"] if c.isdigit() or c == ".")
    pkg_rows.append(dict(
        group=f["group"], name=f["name"],
        # People do not say "sole agency", they say "what do you charge to sell
        # my house". Without these the lookup returns nothing and the agent
        # tells a caller it cannot find a fee that is sitting right there.
        aliases=sorted(set(f.get("aliases", []) + [f["name"].lower(), f["group"].lower()])),
        priceGbpMonthly=float(num) if num else 0.0,
        included=[], notIncluded=[], details=[f["price"], f["detail"]],
        url=""))

if __name__ == "__main__":
    print(f"  tenant   {B.TENANT}")
    print(f"  business {b['name']}")
    print(f"  chunks   {len(rows)}")
    print(f"  fees     {len(pkg_rows)}")
    for r in rows[:4]:
        print(f"    [{r['kind']:<8}] {r['title']}")
    print("    ...")

    if "--push" in sys.argv:
        BATCH = 40
        ins = upd = 0
        for i in range(0, len(rows), BATCH):
            res = post("/upsertKB", {"rows": rows[i:i + BATCH], "tenant": B.TENANT})
            ins += res.get("inserted", 0)
            upd += res.get("updated", 0)
        print(f"\n  kb       {ins} inserted, {upd} updated")
        pr = post("/pruneKB", {"keep": [r["key"] for r in rows], "tenant": B.TENANT})
        print(f"  pruned   {pr['removed']} stale, {pr['remaining']} remain")
        pk = post("/upsertPackages", {"rows": pkg_rows, "tenant": B.TENANT})
        print(f"  fees     {pk['count']} written")
