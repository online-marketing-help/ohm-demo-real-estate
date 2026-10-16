# Marlborough & Hale: AI voice agent demo

A working chat and voice assistant for a fictional estate and letting agency,
built by [Online Marketing Help](https://onlinemarketinghelp.co.uk) so a
prospect can hear what their own callers would hear before they buy anything.

**Live: https://ohm-demo-real-estate.vercel.app**

Press the button in the corner, or "Talk to Ruth now" in the hero. It answers by
voice or by typing, at any hour.

---

## It is a demonstration, and it says so

Marlborough & Hale does not exist. The business, the people, the fees and the
phone number are invented, and the number is in Ofcom's reserved range for
drama so it cannot ring anybody. There is a banner at the top of the page
saying so, and if you ask the assistant whether it is a real company, it tells
you plainly that it is not.

That is deliberate. A convincing fake estate agency with a working phone
assistant is passing off if it does not say what it is.

---

## What is worth testing

The point of a demo is not to watch it succeed. Three things are worth trying:

**Ask what it costs.** It quotes the fee list and nothing else. Sole agency is
1.2% plus VAT, fully managed is 12% of rent. It will not round, embellish or
offer you a discount it has not been given.

**Ask what your house is worth.** It will not tell you. Not a figure, not a
range, not a rough idea. It books the valuation instead. This is the single most
common request an estate agency gets and the single most important refusal: a
figure given over the phone without seeing the property is a guess, and the
caller acts on it.

**Ask something it has not been told.** It says so, and takes your details, and
a person follows up. It does not invent an answer. That is the behaviour a
cautious buyer is actually worried about, and it is the behaviour almost no
voice agent demo shows.

---

## How it is put together

```
kb/business.py        the fictional agency: fees, team, facts, limits
kb/build.py           turns that into knowledge base rows, pushes to Convex
retell/create-agent.py  builds the voice agent's prompt and tools
n8n/build-workflows.py  generates the four workflows
web/src/embed.js      the widget, vanilla DOM in a shadow root
web/build-site.py     the demo site itself
scripts/verify.mjs    proves it works and proves it is isolated
```

Nothing is hand written twice. The prompt, the knowledge base and the page all
read `kb/business.py`, so the agent cannot describe one business while the page
describes another.

### Four n8n workflows, this demo's own

| Workflow | What it does |
|---|---|
| Chat | the chat webhook and the agent behind it |
| Voice | Retell's tool calls, and the web call token |
| Retell Events | writes the transcript back when a call ends |
| Notify | emails the team about anything waiting |

### Backend

Convex holds the knowledge base, the fee list, conversations and bookings. One
deployment serves the live Online Marketing Help assistant and both industry
demos, separated by a `tenant` field. That separation is load bearing, not
cosmetic: without it an estate agency would be able to answer with a clinic's
prices. `scripts/verify.mjs` tests it on every run.

The chat agent runs on OpenRouter (Claude Haiku 5.5, falling back to GPT-4o
mini). Voice is Retell with a British voice, the same one the live assistant
uses.

---

## Running it

You need `.env.local` with the Convex, n8n, Retell and OpenRouter credentials.
It is not in this repository and must not be.

```bash
python3 kb/build.py --push              # seed the knowledge base
python3 retell/create-agent.py --push   # create or update the voice agent
python3 n8n/build-workflows.py          # generate the workflows
python3 n8n/push.py --activate          # push them and turn them on
python3 web/build-site.py && node web/build.mjs
node scripts/verify.mjs                 # 17 checks
```

`verify.mjs` is the one that matters. It asks the live assistant real questions,
checks it refuses what it must, and checks it cannot reach the other tenants'
content. It also clears up after itself, so running it does not email the team
about a test booking.

---

Online Marketing Help, The Hut, Central Ave, Hullbridge, Hockley SS5 6AU.
020 3489 3934.
