#!/usr/bin/env python3
"""
Creates or updates this demo's Retell agent.

    python3 retell/create-agent.py            show what would be sent
    python3 retell/create-agent.py --push     create or update on Retell

The prompt is assembled from business.py, so the agent and the knowledge base
can never describe two different companies. Agent and LLM ids are written to
retell/agent.json and reused on the next run, so this is safe to run twice.
"""
import json
import pathlib
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "kb"))
import business as B  # noqa: E402

env = {}
for line in (ROOT / ".env.local").read_text().split("\n"):
    t = line.strip()
    if not t or t.startswith("#") or "=" not in t:
        continue
    k, _, v = t.partition("=")
    env[k] = v.strip().strip('"')

KEY = env["RETELL_API_KEY"]
N8N = env["N8N_BASE_URL"].rstrip("/")
TOOL_TOKEN = env["OHM_RETELL_TOOL_TOKEN"]
STORE = HERE / "agent.json"

b = B.BIZ
VOICE = "11labs-Amy"          # same British voice as the live OMH agent
NAME = b["agent_name"]

NEVER = "\n".join(f"- {n}" for n in B.NEVER)
BOOKABLE = "\n".join(f"- {x}" for x in getattr(B, "BOOKS", []))

# Healthcare has urgency rules that must sit in the prompt, not only in the
# knowledge base: by the time the agent has decided to search, a caller with
# chest pain has already waited too long.
TRIAGE_BLOCK = ""
if hasattr(B, "TRIAGE"):
    rules = "\n".join(f"- If the caller describes {w.lower()}:\n  {a}"
                       for w, a in B.TRIAGE)
    TRIAGE_BLOCK = f"""
## Urgency, before anything else
Judge this on the first thing they say, before you search for anything.
{rules}
"""

PROMPT = f"""You are {NAME}, the assistant for **{b['name']}**, a {b['kind']} in
{b['town']}. You answer the phone. You are not a salesperson and you are not a
switchboard: you handle the call.

## The business
{b['name']} covers {b['area']}. {b['branches'].capitalize()}. Open {b['hours']}.
Phone {b['phone']}. Email {b['email']}.

## How you work
Answer from the knowledge base and nothing else. Before you state any fact about
{b['short']}, call `search_knowledge`. Before you state any price or fee, call
`get_fees`. If neither returns it, you do not know it, and you say so.

NEVER GUESS. An invented answer is worse than no answer, because the caller acts
on it. If something is outside what you have been given, say plainly that you
cannot answer it, then take their details and use `escalate_to_team` so a person
rings them back.

Keep it short. One or two sentences, then the next question. Nobody rings a
business to listen to a paragraph.

Answer first, then ask. If someone asks what a fee is, tell them the fee, then
ask your question. Do not hold information back to force a conversation.

Offer two times, never an open question. "Thursday at half five or Saturday at
ten, which suits?" books far more often than "when would you like to come in?".

Read numbers back. Repeat a phone number or a postcode before you confirm it.

{TRIAGE_BLOCK}
## What you must never do
{NEVER}

## If asked whether you are a person
Say no, plainly, and offer to put them through to the team. Do not volunteer it
unprompted, and do not pretend.

## If asked whether this is a real company
It is not. {b['name']} is a demonstration built by Online Marketing Help. Say so
honestly, and that a real one would be built from the business's own information.

## What you can book
{BOOKABLE}
Use those words. Do not offer a "free consultation" or a "package": that is
somebody else's language and this business does not sell it.

## Booking
Use `book_appointment` while the caller is on the line. Take the name, a mobile
number, and what the appointment is for. Confirm the day, date and time back to
them before you finish.

Today is {{{{now_uk}}}}.
"""

# This demo has its own tool webhook, its own workflows and its own agent.
TOOL_URL = f"{N8N}/webhook/{B.TENANT}-retell-tool?token={TOOL_TOKEN}"

TOOLS = [
    dict(type="custom", name="search_knowledge",
         description=f"Search what {b['short']} has published about itself: services, "
                     "opening hours, how things work, policies, and the answers to "
                     "common questions. Call this BEFORE stating any fact. Input is a "
                     "few keywords, not a sentence.",
         url=TOOL_URL, speak_during_execution=False, speak_after_execution=True,
         parameters={"type": "object", "properties": {
             "query": {"type": "string", "description": "a few keywords"}},
             "required": ["query"]}),
    dict(type="custom", name="get_fees",
         description=f"Look up what {b['short']} charges. Call this before quoting any "
                     "figure. Never state a price from memory.",
         url=TOOL_URL, speak_during_execution=False, speak_after_execution=True,
         parameters={"type": "object", "properties": {
             "query": {"type": "string", "description": "what they asked about"}},
             "required": ["query"]}),
    dict(type="custom", name="book_appointment",
         description="Book the appointment while the caller is on the line.",
         url=TOOL_URL, speak_during_execution=True, speak_after_execution=True,
         parameters={"type": "object", "properties": {
             "name": {"type": "string"}, "phone": {"type": "string"},
             "email": {"type": "string"},
             "service": {"type": "string", "description": "what it is for"},
             "preferredDate": {"type": "string", "description": "YYYY-MM-DD"},
             "preferredTime": {"type": "string", "description": "HH:mm, 24 hour"},
             "notes": {"type": "string"}},
             "required": ["name", "phone", "service", "preferredDate", "preferredTime"]}),
    dict(type="custom", name="escalate_to_team",
         description="Use when you cannot answer, when the caller asks for something "
                     "outside your remit, or when they ask for a person.",
         url=TOOL_URL, speak_during_execution=False, speak_after_execution=True,
         parameters={"type": "object", "properties": {
             "question": {"type": "string"}, "reason": {"type": "string"},
             "contact": {"type": "string"}},
             "required": ["question", "reason"]}),
]

BEGIN = (f"Good day, you're through to {b['short']}. "
         f"I'm {NAME}, how can I help?")


def api(path, body=None, method="POST"):
    for n in range(4):
        try:
            r = urllib.request.Request(
                f"https://api.retellai.com/{path}",
                data=json.dumps(body).encode() if body is not None else None,
                headers={"Authorization": f"Bearer {KEY}",
                         "content-type": "application/json"},
                method=method)
            with urllib.request.urlopen(r, timeout=90) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            raise SystemExit(f"{path} -> {e.code} {e.read().decode()[:400]}")
        except Exception as e:                       # noqa: BLE001
            last = e
            time.sleep(2 + n * 2)
    raise last


if __name__ == "__main__":
    print(f"  tenant   {B.TENANT}")
    print(f"  business {b['name']}")
    print(f"  agent    {NAME}, voice {VOICE}")
    print(f"  tools    {', '.join(t['name'] for t in TOOLS)}")
    print(f"  prompt   {len(PROMPT)} chars")
    print(f"  opener   {BEGIN}")

    if "--push" not in sys.argv:
        raise SystemExit("\n  dry run. pass --push to create or update on Retell.")

    saved = json.loads(STORE.read_text()) if STORE.exists() else {}

    if saved.get("llm_id"):
        llm = api(f"update-retell-llm/{saved['llm_id']}",
                  {"general_prompt": PROMPT, "general_tools": TOOLS,
                   "begin_message": BEGIN}, method="PATCH")
        print(f"\n  llm      updated {llm['llm_id']}")
    else:
        llm = api("create-retell-llm",
                  {"model": "gpt-4.1", "general_prompt": PROMPT,
                   "general_tools": TOOLS, "begin_message": BEGIN})
        print(f"\n  llm      created {llm['llm_id']}")

    agent_body = {
        "agent_name": f"{b['name']} demo ({NAME})",
        "voice_id": VOICE,
        "language": "en-GB",
        "response_engine": {"type": "retell-llm", "llm_id": llm["llm_id"]},
    }
    if saved.get("agent_id"):
        ag = api(f"update-agent/{saved['agent_id']}", agent_body, method="PATCH")
        print(f"  agent    updated {ag['agent_id']}")
    else:
        ag = api("create-agent", agent_body)
        print(f"  agent    created {ag['agent_id']}")

    STORE.write_text(json.dumps(
        {"tenant": B.TENANT, "business": b["name"], "agent_id": ag["agent_id"],
         "llm_id": llm["llm_id"], "voice_id": VOICE}, indent=2) + "\n")
    print(f"  saved    {STORE.relative_to(ROOT)}")
