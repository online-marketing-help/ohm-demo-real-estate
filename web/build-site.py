#!/usr/bin/env python3
"""
Builds the demo site: a plausible business page with the assistant on it.

    python3 web/build-site.py

The page has to look like a real small business, because the point is for a
prospect to press the button and hear what their own callers would hear. A
landing page that obviously belongs to an agency breaks that.

It also has to be honest. There is a banner at the top saying this is a
demonstration, and the assistant says so too if asked. Those are not optional:
a convincing fake estate agency with a working phone assistant is passing off
if it does not say what it is.

Everything is read from kb/business.py, so the page, the knowledge base and the
agent cannot drift apart.
"""
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "kb"))
import business as B  # noqa: E402

b = B.BIZ
DIST = HERE / "dist"
DIST.mkdir(exist_ok=True)

IS_CLINIC = hasattr(B, "CLINICS")
ACCENT = "#1f6f5c" if IS_CLINIC else "#1d3f6e"
ACCENT_SOFT = "#eef5f2" if IS_CLINIC else "#eef2f8"

if IS_CLINIC:
    HERO = "Private care, without the wait."
    SUB = (f"{b['name']} is an outpatient clinic in {b['town']} offering dermatology, "
           "musculoskeletal and sports injury, physiotherapy, diagnostic ultrasound "
           "and general health reviews.")
    CARDS = [(name, f"with {who}", f"{days}. {first} minutes for a first appointment.")
             for name, who, days, first, _ in B.CLINICS]
    STRIP = [("Same week", "appointments in most clinics"),
             ("6 insurers", "recognised, including Bupa and AXA"),
             ("Free parking", "under the building, two hours")]
else:
    HERO = "Your move, handled properly."
    SUB = (f"{b['name']} is an independent estate and letting agency in {b['town']}, "
           f"covering {b['area']}. Selling, letting and management from one office.")
    CARDS = [("Selling", "sole or multi agency",
              "1.2% plus VAT, no sale no fee. Photography, floorplan and all three "
              "portals included."),
             ("Letting", "let only to fully managed",
              "From one month's rent. Referencing, right to rent and the tenancy "
              "agreement handled."),
             ("Management", "for landlords",
              "12% of rent. Maintenance, inspections, deposits and the end of "
              "tenancy, all of it.")]
    STRIP = [("Since 2009", "independent, one office"),
             ("Evenings", "valuations and viewings out of hours"),
             ("Free", "market appraisal, no obligation")]

cards = "".join(
    f'<article class="card"><h3>{t}</h3><p class="kicker">{k}</p><p>{d}</p></article>'
    for t, k, d in CARDS)
strip = "".join(f'<div><b>{a}</b><span>{c}</span></div>' for a, c in STRIP)

HTML = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{b['name']} | {b['town']}</title>
<meta name="description" content="{SUB}">
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {{ --ink:#111826; --muted:#5b6676; --line:#e3e6ea; --accent:{ACCENT};
           --soft:{ACCENT_SOFT}; color-scheme:light; }}
  * {{ box-sizing:border-box; margin:0; padding:0 }}
  body {{ background:#fff; color:var(--ink);
          font:400 17px/1.6 "Source Sans 3",system-ui,sans-serif }}
  .wrap {{ max-width:1080px; margin:0 auto; padding:0 24px }}

  .demo-bar {{ background:var(--ink); color:#fff; font-size:14px; padding:9px 0 }}
  .demo-bar .wrap {{ display:flex; gap:12px; align-items:center; flex-wrap:wrap }}
  .demo-bar b {{ background:#fff; color:var(--ink); border-radius:99px;
                 padding:2px 10px; font-size:12px; letter-spacing:.4px }}
  .demo-bar a {{ color:#fff }}

  header.top {{ border-bottom:1px solid var(--line) }}
  header.top .wrap {{ display:flex; align-items:center; gap:18px; padding-top:20px;
                      padding-bottom:20px; flex-wrap:wrap }}
  .logo {{ font:700 23px "Fraunces",Georgia,serif; letter-spacing:-.4px }}
  .logo span {{ color:var(--accent) }}
  nav {{ margin-left:auto; display:flex; gap:22px; font-size:15.5px; color:var(--muted) }}
  .tel {{ font-weight:600; color:var(--ink) }}

  .hero {{ padding:66px 0 54px; background:var(--soft) }}
  .hero h1 {{ font:700 clamp(34px,5.2vw,52px)/1.08 "Fraunces",Georgia,serif;
              letter-spacing:-1px; max-width:16ch }}
  .hero p {{ margin-top:16px; max-width:56ch; color:var(--muted); font-size:18.5px }}
  .cta {{ display:inline-block; margin-top:26px; background:var(--accent); color:#fff;
          text-decoration:none; border-radius:8px; padding:14px 26px; font-weight:600 }}
  .hint {{ margin-top:14px; font-size:15px; color:var(--muted) }}

  .strip {{ display:grid; grid-template-columns:repeat(3,1fr); gap:1px;
            background:var(--line); border-bottom:1px solid var(--line) }}
  .strip div {{ background:#fff; padding:22px 24px }}
  .strip b {{ display:block; font:700 20px "Fraunces",Georgia,serif }}
  .strip span {{ font-size:15px; color:var(--muted) }}
  @media (max-width:720px) {{ .strip {{ grid-template-columns:1fr }} }}

  section.cards {{ padding:60px 0 }}
  section.cards h2 {{ font:700 30px "Fraunces",Georgia,serif; margin-bottom:26px }}
  .grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px }}
  @media (max-width:860px) {{ .grid {{ grid-template-columns:1fr }} }}
  .card {{ border:1px solid var(--line); border-radius:12px; padding:24px }}
  .card h3 {{ font:700 20px "Fraunces",Georgia,serif }}
  .card .kicker {{ color:var(--accent); font-size:14.5px; margin:3px 0 10px }}
  .card p {{ color:var(--muted); font-size:16px }}

  .try {{ background:var(--ink); color:#fff; padding:54px 0 }}
  .try h2 {{ font:700 30px "Fraunces",Georgia,serif; max-width:20ch }}
  .try p {{ color:#c3cbd6; margin-top:12px; max-width:58ch }}
  .try ul {{ margin:20px 0 0 18px; color:#c3cbd6 }}
  .try li {{ margin:6px 0 }}

  footer {{ border-top:1px solid var(--line); padding:32px 0 60px;
            font-size:15px; color:var(--muted) }}
  footer b {{ color:var(--ink) }}
</style>
</head>
<body>

<div class="demo-bar"><div class="wrap">
  <b>DEMONSTRATION</b>
  <span>{b['name']} is not a real business. This page was built by
  Online Marketing Help to show an AI voice agent answering a
  {'clinic' if IS_CLINIC else 'estate agency'}'s calls.</span>
  <a href="https://onlinemarketinghelp.co.uk">onlinemarketinghelp.co.uk</a>
</div></div>

<header class="top"><div class="wrap">
  <div class="logo">{b['name'].split()[0]}<span>{' ' + ' '.join(b['name'].split()[1:]) if len(b['name'].split()) > 1 else ''}</span></div>
  <nav>
    <span>{'Clinics' if IS_CLINIC else 'Selling'}</span>
    <span>{'Fees' if IS_CLINIC else 'Letting'}</span>
    <span>About</span>
  </nav>
  <span class="tel">{b['phone']}</span>
</div></header>

<div class="hero"><div class="wrap">
  <h1>{HERO}</h1>
  <p>{SUB}</p>
  <a class="cta" href="#" onclick="DemoAssistant.open('voice');return false">
    Talk to {b['agent_name']} now</a>
  <p class="hint">Or use the button in the corner to type instead. It answers at
  any hour, including right now.</p>
</div></div>

<div class="strip">{strip}</div>

<section class="cards"><div class="wrap">
  <h2>What we do</h2>
  <div class="grid">{cards}</div>
</div></section>

<section class="try"><div class="wrap">
  <h2>This is the part worth testing.</h2>
  <p>The assistant on this page is the real thing, wired to a real knowledge
  base and a real diary. Try to catch it out:</p>
  <ul>
    <li>Ask what we charge. It will quote the fee list and nothing else.</li>
    <li>{'Ask it to tell you whether your symptoms are serious. It will refuse and get a clinician.'
        if IS_CLINIC else 'Ask what your house is worth. It will refuse and book the valuation instead.'}</li>
    <li>Ask something we have not told it. It will say so rather than invent an answer.</li>
    <li>Book an appointment. It goes in the diary while you are still on the line.</li>
  </ul>
</div></section>

<footer><div class="wrap">
  <b>{b['name']}</b>, {b['town']} &middot; {b['phone']} &middot; {b['email']}<br>
  Open {b['hours']}.<br><br>
  A demonstration built by <b>Online Marketing Help</b>. The business, the people,
  the prices and the phone number are invented. The phone number is in Ofcom's
  reserved range for drama, so it cannot ring anybody.
</div></footer>

<script src="assistant.js" defer></script>
</body>
</html>
"""

(DIST / "index.html").write_text(HTML, encoding="utf-8")
print(f"  dist/index.html   {b['name']}")
print(f"  accent {ACCENT}, {'clinic' if IS_CLINIC else 'agency'} layout")
