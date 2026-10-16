#!/usr/bin/env python3
"""
Builds this demo's four n8n workflows, the same way the live OMH assistant is
built.

    python3 n8n/build-workflows.py          write the JSON
    python3 n8n/push.py                     push to n8n
    python3 n8n/push.py --activate          push and turn on

    01-chat.json     the chat webhook and the agent behind it
    02-voice.json    Retell's tool calls, and the web call token
    03-events.json   Retell call_analyzed, written back as a transcript
    04-notify.json   emails the team about anything waiting

Everything is scoped to this demo's tenant, so the agent can only read its own
knowledge base and can only write bookings against its own business. The live
OMH assistant and the other demo are invisible to it.

Webhook paths carry the tenant, so the three sets never collide on the instance.
"""
import json
import pathlib
import sys

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

CONVEX = env["OHM_WIDGET_CONVEX_SITE"]
SECRET = env["OHM_WIDGET_SECRET"]
TOOL_TOKEN = env["OHM_RETELL_TOOL_TOKEN"]
RETELL_KEY = env["RETELL_API_KEY"]
TENANT = B.TENANT
SLUG = TENANT                      # webhook prefix, e.g. demo-real-estate
BIZ = B.BIZ

AGENT = json.loads((ROOT / "retell" / "agent.json").read_text())
AGENT_ID = AGENT["agent_id"]

OPENROUTER_CRED = {
    "openRouterApi": {"id": "Sj2vuK21qAcp0hJj", "name": "OpenRouter — OMH Site Assistant"}
}
CHAT_MODEL = "anthropic/claude-haiku-5.5"
CHAT_MODEL_FALLBACK = "openai/gpt-4o-mini"
GMAIL_CRED = {"smtp": {"id": "I7yvfVmEpZslNAxV",
                       "name": "Gmail SMTP — Ads System (app pw 2026-08-04)"}}

# Only the pages that host this demo may call it.
ALLOWED_ORIGINS = ",".join([
    "https://onlinemarketinghelp.co.uk",
    "https://www.onlinemarketinghelp.co.uk",
    "https://ohm-demo-real-estate.vercel.app",
    "https://ohm-demo-real-estate-online-marketing-help.vercel.app",
    "http://localhost:4488",
])

NOW = "{{ $now.setZone('Europe/London').toFormat('cccc d LLLL yyyy, HH:mm') }}"

NEVER = "\n".join(f"- {n}" for n in B.NEVER)
TRIAGE = ""
if hasattr(B, "TRIAGE"):
    rules = "\n".join(f"- If the caller describes {w.lower()}: {a}" for w, a in B.TRIAGE)
    TRIAGE = f"\n## Urgency, before anything else\nJudge this on the first thing "\
             f"they say, before you search for anything.\n{rules}\n"

BOOKABLE = "\n".join(f"- {x}" for x in getattr(B, "BOOKS", []))

PROMPT = f"""You are {BIZ['agent_name']}, the assistant for **{BIZ['name']}**, a
{BIZ['kind']} in {BIZ['town']}. You are answering a message on the website.

## The business
{BIZ['name']} covers {BIZ['area']}. Open {BIZ['hours']}.
Phone {BIZ['phone']}. Email {BIZ['email']}.

## How you work
Answer from the knowledge base and nothing else. Before stating any fact, call
search_knowledge. Before stating any price, call get_fees. If neither returns
it, you do not know it, and you say so.

NEVER GUESS. An invented answer is worse than no answer. If something is outside
what you have, say so plainly, then use escalate_to_team so a person follows up.

Keep it short: two or three sentences. Answer first, then ask. Offer two times
rather than an open question. Read numbers back before confirming.
## What you can book
{BOOKABLE}
Use those words. Do not offer a "free consultation" or a "package": that is
somebody else's language and this business does not sell it.
{TRIAGE}
## What you must never do
{NEVER}

## If asked whether you are a person
Say no, plainly, and offer the team. Do not volunteer it unprompted.

## If asked whether this is a real company
It is not. {BIZ['name']} is a demonstration built by Online Marketing Help. Say
so honestly, and that a real one would be built from the business's own
information.

Today is {NOW}.
"""


def hdr(name, value):
    return {"sendHeaders": True,
            "headerParameters": {"parameters": [{"name": name, "value": value}]}}


def convex(node_id, name, route, body, x=0, y=0, always=True):
    n = {"parameters": {"method": "POST", "url": f"{CONVEX}{route}",
                        **hdr("x-ohm-secret", SECRET),
                        "sendBody": True, "specifyBody": "json",
                        "jsonBody": body, "options": {}},
         "id": node_id, "name": name, "type": "n8n-nodes-base.httpRequest",
         "typeVersion": 4.2, "position": [x, y]}
    if always:
        n["onError"] = "continueRegularOutput"
    return n


# Every tool call is pinned to this tenant, so the agent physically cannot read
# another business's content even if the prompt were wrong.
TOOLS = [
    ("tool_kb", "search_knowledge", "/searchKB",
     f"Search what {BIZ['short']} has published about itself: what it does, "
     "opening hours, how things work, policies and common questions. Call this "
     "BEFORE stating any fact. Input: a few keywords, not a sentence.",
     "={{ JSON.stringify({ q: $fromAI('q', 'A few search keywords', 'string'), "
     f"limit: 6, tenant: '{TENANT}' }} ) }}}}"),
    ("tool_fees", "get_fees", "/getPackages",
     f"Look up what {BIZ['short']} charges. Call this before quoting any figure. "
     "Never state a price from memory.",
     "={{ JSON.stringify({ q: $fromAI('q', 'what they asked about', 'string'), "
     f"tenant: '{TENANT}' }} ) }}}}"),
    ("tool_book", "book_appointment", "/bookAppointment",
     "Book the appointment while the visitor is still here. Needs name, phone, "
     "what it is for, a date as YYYY-MM-DD and a time as HH:mm.",
     "={{ JSON.stringify({ sessionId: $('Chat Webhook').item.json.body.session_id, "
     "name: $fromAI('name','full name','string'), phone: $fromAI('phone','mobile','string'), "
     "email: $fromAI('email','email if given','string'), "
     "service: $fromAI('service','what it is for','string'), "
     "preferredDate: $fromAI('date','YYYY-MM-DD','string'), "
     "preferredTime: $fromAI('time','HH:mm','string'), "
     "notes: $fromAI('notes','anything useful','string'), "
     f"channel: 'chat', tenant: '{TENANT}' }} ) }}}}"),
    ("tool_lead", "save_lead", "/saveLead",
     "Save the visitor's details when they ask to be contacted but do not book.",
     "={{ JSON.stringify({ sessionId: $('Chat Webhook').item.json.body.session_id, "
     "name: $fromAI('name','full name','string'), phone: $fromAI('phone','phone','string'), "
     "email: $fromAI('email','email','string'), "
     "message: $fromAI('message','what they want','string'), hot: true, "
     f"channel: 'chat', tenant: '{TENANT}' }} ) }}}}"),
    ("tool_esc", "escalate_to_team", "/escalate",
     "Use when you cannot answer, when it is outside your remit, or when they "
     "ask for a person.",
     "={{ JSON.stringify({ sessionId: $('Chat Webhook').item.json.body.session_id, "
     "question: $fromAI('question','what they asked','string'), "
     "reason: $fromAI('reason','why you could not answer','string'), "
     "contact: $fromAI('contact','their contact if given','string'), "
     f"channel: 'chat', tenant: '{TENANT}' }} ) }}}}"),
]


def build_chat():
    nodes = [
        {"parameters": {"httpMethod": "POST", "path": f"{SLUG}-chat",
                        "responseMode": "responseNode",
                        "options": {"allowedOrigins": ALLOWED_ORIGINS}},
         "id": "wh", "name": "Chat Webhook", "type": "n8n-nodes-base.webhook",
         "typeVersion": 2, "position": [-820, 0]},

        convex("log_user", "Log Message", "/logMessage",
               "={{ JSON.stringify({ sessionId: $json.body.session_id, role: 'user', "
               "text: $json.body.message, channel: 'chat', pageUrl: $json.body.page_url, "
               f"tenant: '{TENANT}' }} ) }}}}", -600, -160),

        {"parameters": {"jsCode":
            "const b = $('Chat Webhook').item.json.body || {};\n"
            "return [{ json: { chat_input: String(b.message || '').slice(0, 1200) } }];"},
         "id": "ctx", "name": "Build Context", "type": "n8n-nodes-base.code",
         "typeVersion": 2, "position": [-400, 0]},

        {"parameters": {"promptType": "define", "text": "={{ $json.chat_input }}",
                        "needsFallback": True,
                        "options": {"systemMessage": "=" + PROMPT}},
         "id": "agent", "name": BIZ["agent_name"],
         "type": "@n8n/n8n-nodes-langchain.agent", "typeVersion": 3.1,
         "position": [-140, 0], "retryOnFail": True, "maxTries": 2,
         "waitBetweenTries": 3000, "onError": "continueErrorOutput"},

        {"parameters": {"model": CHAT_MODEL, "options": {"temperature": 0.2}},
         "id": "llm", "name": "Chat Model",
         "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter", "typeVersion": 1,
         "position": [-260, 240], "credentials": OPENROUTER_CRED},
        {"parameters": {"model": CHAT_MODEL_FALLBACK, "options": {"temperature": 0.2}},
         "id": "llm_fb", "name": "Fallback Model",
         "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter", "typeVersion": 1,
         "position": [-120, 240], "credentials": OPENROUTER_CRED},
        {"parameters": {"sessionIdType": "customKey",
                        "sessionKey": "={{ $('Chat Webhook').item.json.body.session_id }}",
                        "contextWindowLength": 10},
         "id": "mem", "name": "Session Memory",
         "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow", "typeVersion": 1.3,
         "position": [-400, 240]},

        {"parameters": {"jsCode":
            "let t = ($input.first().json.output || '').toString().trim();\n"
            "t = t.replace(/^```+\\s*\\w*\\s*/g, '').replace(/```+$/g, '').trim();\n"
            "if (!t) t = \"Sorry, I didn't catch that. Could you say it again?\";\n"
            "return [{ json: { reply: t } }];"},
         "id": "clean", "name": "Clean Reply", "type": "n8n-nodes-base.code",
         "typeVersion": 2, "position": [120, 0]},
        {"parameters": {"jsCode":
            "return [{ json: { reply: 'Sorry, I cannot answer right now. Please ring "
            f"{BIZ['phone']}" + " and someone will help.' } }];"},
         "id": "fb", "name": "Agent Unavailable", "type": "n8n-nodes-base.code",
         "typeVersion": 2, "position": [120, 180]},

        convex("log_bot", "Log Reply", "/logMessage",
               "={{ JSON.stringify({ sessionId: $('Chat Webhook').item.json.body.session_id, "
               "role: 'assistant', text: $json.reply, channel: 'chat', "
               f"tenant: '{TENANT}' }} ) }}}}", 340, -160),
        {"parameters": {"respondWith": "json",
                        "responseBody": "={{ JSON.stringify({ reply: $json.reply }) }}",
                        "options": {}},
         "id": "resp", "name": "Respond", "type": "n8n-nodes-base.respondToWebhook",
         "typeVersion": 1.1, "position": [560, 0]},
    ]
    conns = {
        "Chat Webhook": {"main": [[{"node": "Log Message", "type": "main", "index": 0},
                                   {"node": "Build Context", "type": "main", "index": 0}]]},
        "Build Context": {"main": [[{"node": BIZ["agent_name"], "type": "main", "index": 0}]]},
        BIZ["agent_name"]: {"main": [[{"node": "Clean Reply", "type": "main", "index": 0}],
                                     [{"node": "Agent Unavailable", "type": "main", "index": 0}]]},
        # Log and respond in parallel. Chaining them through the Convex call
        # replaces $json with Convex's response, so the reply came back empty.
        "Clean Reply": {"main": [[{"node": "Log Reply", "type": "main", "index": 0},
                                  {"node": "Respond", "type": "main", "index": 0}]]},
        "Agent Unavailable": {"main": [[{"node": "Respond", "type": "main", "index": 0}]]},
        "Chat Model": {"ai_languageModel": [[{"node": BIZ["agent_name"], "type": "ai_languageModel", "index": 0}]]},
        "Fallback Model": {"ai_languageModel": [[{"node": BIZ["agent_name"], "type": "ai_languageModel", "index": 1}]]},
        "Session Memory": {"ai_memory": [[{"node": BIZ["agent_name"], "type": "ai_memory", "index": 0}]]},
    }
    for i, (nid, name, route, desc, body) in enumerate(TOOLS):
        nodes.append({
            "parameters": {"method": "POST", "url": f"{CONVEX}{route}",
                           **hdr("x-ohm-secret", SECRET),
                           "sendBody": True, "specifyBody": "json", "jsonBody": body,
                           "toolDescription": desc, "options": {}},
            "id": nid, "name": name,
            # The node OMH uses and that works. The langchain toolHttpRequest
            # variant takes the same parameters but silently fails to call out,
            # so the agent reported it could not find a fee that was there.
            "type": "n8n-nodes-base.httpRequestTool", "typeVersion": 4.2,
            "position": [-60 + i * 150, 420], "onError": "continueRegularOutput"})
        conns[name] = {"ai_tool": [[{"node": BIZ["agent_name"], "type": "ai_tool", "index": 0}]]}

    return {"name": f"{BIZ['name']} demo \u2014 Chat", "nodes": nodes,
            "connections": conns, "settings": {"executionOrder": "v1"}}


def build_voice():
    """Retell's tool calls, and the token the browser needs to start a call."""
    routes = [("search_knowledge", "/searchKB"), ("get_fees", "/getPackages"),
              ("book_appointment", "/bookAppointment"), ("escalate_to_team", "/escalate")]
    nodes = [
        {"parameters": {"httpMethod": "POST", "path": f"{SLUG}-retell-tool",
                        "responseMode": "responseNode", "options": {}},
         "id": "wh_tool", "name": "Retell Tool Webhook",
         "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [-900, 0]},

        {"parameters": {"conditions": {"options": {"caseSensitive": True, "version": 2},
            "conditions": [{"id": "tok", "operator": {"type": "string", "operation": "equals"},
                            "leftValue": "={{ $json.query.token }}", "rightValue": TOOL_TOKEN}],
            "combinator": "and"}, "options": {}},
         "id": "auth", "name": "Check Token", "type": "n8n-nodes-base.if",
         "typeVersion": 2.2, "position": [-700, 0]},
        {"parameters": {"respondWith": "json",
                        "responseBody": "={{ JSON.stringify({ error: 'unauthorized' }) }}",
                        "options": {"responseCode": 401}},
         "id": "deny", "name": "Deny", "type": "n8n-nodes-base.respondToWebhook",
         "typeVersion": 1.1, "position": [-520, 180]},

        {"parameters": {"rules": {"values": [
            {"conditions": {"options": {"caseSensitive": True, "version": 2},
             "conditions": [{"id": f"r{i}", "operator": {"type": "string", "operation": "equals"},
                             "leftValue": "={{ $json.body.name }}", "rightValue": n}],
             "combinator": "and"}, "outputKey": n}
            for i, (n, _) in enumerate(routes)]}, "options": {}},
         "id": "route", "name": "Route Tool", "type": "n8n-nodes-base.switch",
         "typeVersion": 3.2, "position": [-520, -40]},

        {"parameters": {"respondWith": "json",
                        "responseBody": "={{ JSON.stringify($input.all().length > 1 ? "
                                        "$input.all().map(i => i.json) : $input.first().json) }}",
                        "options": {}},
         "id": "resp_tool", "name": "Respond Tool Result",
         "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "position": [60, 0]},

        {"parameters": {"httpMethod": "POST", "path": f"{SLUG}-voice-token",
                        "responseMode": "responseNode",
                        "options": {"allowedOrigins": ALLOWED_ORIGINS}},
         "id": "wh_tok", "name": "Voice Token Webhook",
         "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [-900, -320]},
        {"parameters": {"method": "POST", "url": "https://api.retellai.com/v2/create-web-call",
                        **hdr("Authorization", f"Bearer {RETELL_KEY}"),
                        "sendBody": True, "specifyBody": "json",
                        "jsonBody": "={{ JSON.stringify({ agent_id: '" + AGENT_ID + "', "
                        "metadata: { session_id: $json.body.session_id, "
                        f"page_url: $json.body.page_url, tenant: '{TENANT}' }}, "
                        "retell_llm_dynamic_variables: { session_id: $json.body.session_id, "
                        "now_uk: $now.setZone('Europe/London').toFormat('cccc d LLLL yyyy, HH:mm') "
                        "} }) }}",
                        "options": {}},
         "id": "mk_call", "name": "Create Web Call",
         "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [-620, -320]},
        {"parameters": {"respondWith": "json",
                        "responseBody": "={{ JSON.stringify({ access_token: $json.access_token, "
                                        "call_id: $json.call_id }) }}", "options": {}},
         "id": "resp_tok", "name": "Respond Token",
         "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "position": [-380, -320]},
    ]
    conns = {
        "Retell Tool Webhook": {"main": [[{"node": "Check Token", "type": "main", "index": 0}]]},
        "Check Token": {"main": [[{"node": "Route Tool", "type": "main", "index": 0}],
                                 [{"node": "Deny", "type": "main", "index": 0}]]},
        "Route Tool": {"main": []},
        "Voice Token Webhook": {"main": [[{"node": "Create Web Call", "type": "main", "index": 0}]]},
        "Create Web Call": {"main": [[{"node": "Respond Token", "type": "main", "index": 0}]]},
    }
    # The session id comes from the call metadata, falling back to the call id so
    # a booking can always be traced to the call that made it.
    sid = ("($json.body.args || {}).session_id || ($json.body.call && $json.body.call.metadata "
           "&& $json.body.call.metadata.session_id) || ($json.body.call && $json.body.call.call_id) "
           "|| 'voice-unknown'")
    for i, (name, route) in enumerate(routes):
        nid = f"call_{i}"
        nodes.append(convex(nid, f"Convex {name}", route,
                            "={{ JSON.stringify(Object.assign({ sessionId: " + sid +
                            f", channel: 'voice', tenant: '{TENANT}' }}, $json.body.args || {{}})) }}}}",
                            -260, -120 + i * 110, always=False))
        conns[f"Convex {name}"] = {"main": [[{"node": "Respond Tool Result", "type": "main", "index": 0}]]}
        conns["Route Tool"]["main"].append([{"node": f"Convex {name}", "type": "main", "index": 0}])

    return {"name": f"{BIZ['name']} demo \u2014 Voice", "nodes": nodes,
            "connections": conns, "settings": {"executionOrder": "v1"}}


def build_events():
    """Retell posts call_analyzed when a call ends. Write the transcript back."""
    nodes = [
        {"parameters": {"httpMethod": "POST", "path": f"{SLUG}-retell-events",
                        "responseMode": "lastNode", "options": {}},
         "id": "wh", "name": "Retell Events", "type": "n8n-nodes-base.webhook",
         "typeVersion": 2, "position": [-700, 0]},
        {"parameters": {"conditions": {"options": {"caseSensitive": True, "version": 2},
            "conditions": [{"id": "ev", "operator": {"type": "string", "operation": "equals"},
                            "leftValue": "={{ $json.body.event }}", "rightValue": "call_analyzed"}],
            "combinator": "and"}, "options": {}},
         "id": "is_done", "name": "Call Finished", "type": "n8n-nodes-base.if",
         "typeVersion": 2.2, "position": [-480, 0]},
        {"parameters": {"jsCode":
            "const c = $input.first().json.body.call || {};\n"
            "const sid = (c.metadata && c.metadata.session_id) || c.call_id || 'voice-unknown';\n"
            "const turns = (c.transcript_object || []).map(t =>\n"
            "  ({ role: t.role === 'agent' ? 'assistant' : 'user', text: t.content || '' }))\n"
            "  .filter(t => t.text);\n"
            "return turns.map(t => ({ json: { sessionId: sid, role: t.role, text: t.text } }));"},
         "id": "split", "name": "Split Transcript", "type": "n8n-nodes-base.code",
         "typeVersion": 2, "position": [-260, 0]},
        convex("log", "Log Turn", "/logMessage",
               "={{ JSON.stringify({ sessionId: $json.sessionId, role: $json.role, "
               f"text: $json.text, channel: 'voice', tenant: '{TENANT}' }} ) }}}}", -40, 0),
    ]
    conns = {
        "Retell Events": {"main": [[{"node": "Call Finished", "type": "main", "index": 0}]]},
        "Call Finished": {"main": [[{"node": "Split Transcript", "type": "main", "index": 0}]]},
        "Split Transcript": {"main": [[{"node": "Log Turn", "type": "main", "index": 0}]]},
    }
    return {"name": f"{BIZ['name']} demo \u2014 Retell Events", "nodes": nodes,
            "connections": conns, "settings": {"executionOrder": "v1"}}


def build_notify():
    """Every five minutes, email anything this demo has captured and not told."""
    to = "support@onlinemarketinghelp.co.uk"
    nodes = [
        {"parameters": {"rule": {"interval": [{"field": "minutes", "minutesInterval": 5}]}},
         "id": "cron", "name": "Every 5 Minutes",
         "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2, "position": [-820, 0]},
        convex("fetch", "Fetch New Items", "/pendingNotifications",
               "={{ JSON.stringify({ tenant: '" + TENANT + "' }) }}", -600, 0, always=False),
        {"parameters": {"jsCode":
            "const d = $input.first().json || {};\n"
            f"const mine = (r) => (r.tenant || '') === '{TENANT}';\n"
            "const bookings = (d.bookings || []).filter(mine);\n"
            "const leads = (d.leads || []).filter(mine);\n"
            "const escal = (d.escalations || []).filter(mine);\n"
            "if (!bookings.length && !leads.length && !escal.length) return [];\n"
            "const L = [];\n"
            f"L.push('{BIZ['name']} demo');\n"
            "L.push('');\n"
            "if (bookings.length) {\n"
            "  L.push('BOOKINGS');\n"
            "  bookings.forEach(b => L.push('  ' + b.reference + '  ' + b.name + '  ' +\n"
            "    b.date + ' ' + b.time + '  ' + (b.service || '') + '  ' + (b.phone || '')));\n"
            "  L.push('');\n"
            "}\n"
            "if (leads.length) {\n"
            "  L.push('ENQUIRIES');\n"
            "  leads.forEach(l => L.push('  ' + l.name + '  ' + (l.phone || l.email || '') +\n"
            "    '  ' + (l.message || '').slice(0, 120)));\n"
            "  L.push('');\n"
            "}\n"
            "if (escal.length) {\n"
            "  L.push('COULD NOT ANSWER');\n"
            "  escal.forEach(e => L.push('  ' + (e.question || '').slice(0, 140)));\n"
            "}\n"
            "const subject = 'Demo (' + [bookings.length && (bookings.length + ' booked'),\n"
            "  leads.length && (leads.length + ' enquiry'),\n"
            "  escal.length && (escal.length + ' unanswered')].filter(Boolean).join(', ') + ')';\n"
            "return [{ json: { subject, body: L.join('\\n'),\n"
            "  ids: { bookings: bookings.map(b => b.id), leads: leads.map(l => l.id),\n"
            "         escalations: escal.map(e => e.id) } } }];"},
         "id": "compose", "name": "Compose Email", "type": "n8n-nodes-base.code",
         "typeVersion": 2, "position": [-380, 0]},
        {"parameters": {"fromEmail": to, "toEmail": to,
                        "subject": "={{ $json.subject }}", "text": "={{ $json.body }}",
                        "options": {}},
         "id": "mail", "name": "Email The Team", "type": "n8n-nodes-base.emailSend",
         "typeVersion": 2.1, "position": [-160, 0], "credentials": GMAIL_CRED},
        convex("mark", "Mark As Told", "/markNotified",
               "={{ JSON.stringify($('Compose Email').item.json.ids) }}", 60, 0),
    ]
    conns = {
        "Every 5 Minutes": {"main": [[{"node": "Fetch New Items", "type": "main", "index": 0}]]},
        "Fetch New Items": {"main": [[{"node": "Compose Email", "type": "main", "index": 0}]]},
        "Compose Email": {"main": [[{"node": "Email The Team", "type": "main", "index": 0}]]},
        "Email The Team": {"main": [[{"node": "Mark As Told", "type": "main", "index": 0}]]},
    }
    return {"name": f"{BIZ['name']} demo \u2014 Notify", "nodes": nodes,
            "connections": conns, "settings": {"executionOrder": "v1"}}


OUT = {
    "01-chat.json": build_chat(),
    "02-voice.json": build_voice(),
    "03-events.json": build_events(),
    "04-notify.json": build_notify(),
}

if __name__ == "__main__":
    for fname, wf in OUT.items():
        (HERE / fname).write_text(json.dumps(wf, ensure_ascii=False, indent=1))
        print(f"  {fname:16} {wf['name'][:46]:48} {len(wf['nodes'])} nodes")
    base = env["N8N_BASE_URL"].rstrip("/")
    print(f"\n  tenant {TENANT}, agent {AGENT_ID}")
    print("  webhooks once active:")
    for p in (f"{SLUG}-chat", f"{SLUG}-voice-token", f"{SLUG}-retell-tool",
              f"{SLUG}-retell-events"):
        print(f"    {base}/webhook/{p}")
    print("\n  Nothing pushed yet. Run n8n/push.py.")
