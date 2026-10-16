# Putting this demo on onlinemarketinghelp.co.uk

Written for the web developer who maintains the OHM site.

This demo is a complete site of its own, already live and already working. You
are not installing an app. You are deciding how a visitor on the estate agents
page gets to it.

**The demo:** https://ohm-demo-real-estate.vercel.app

---

## The one rule

**Do not put this demo's widget on a page that already has the OMH assistant.**

The OMH site has its own assistant, which answers as Online Marketing Help. This
one answers as a fictional estate agency. Two assistants on one page is
confusing at best, and a visitor who asks "what do you charge" and gets 1.2%
plus VAT will think that is our price.

Everything below keeps them apart.

---

## Option A: a card that opens the demo (recommended)

The simplest and the one that works best. Put this on
`/ai-voice-agents-for-real-estate`, near the top, under the hero.

```html
<section class="try-demo">
  <h2>Hear it answer an estate agency's phone</h2>
  <p>
    We built a working agency and gave it the agent. Ask what it charges, ask it
    to value your house, try to catch it out. It answers by voice or by typing.
  </p>
  <a class="btn" href="https://ohm-demo-real-estate.vercel.app"
     target="_blank" rel="noopener">
    Try the demo
  </a>
  <small>Opens a demonstration site. Marlborough &amp; Hale is not a real agency.</small>
</section>
```

Style it with the page's existing classes. The only things that matter are that
it opens in a new tab and that the line about it being a demonstration is
visible, not hidden in a tooltip.

### Where to put it

Three places earn their keep, in this order:

1. **Under the hero** on the estate agents page. A visitor who is still deciding
   whether this is real gets to find out in one click.
2. **Next to the pricing block**, where the objection is strongest.
3. **In the industry PDF's landing section**, if you link the PDF from that page.

---

## Option B: embed it in the page

If you would rather keep them on the site, put the whole demo in an iframe. It
is a full page, so give it room.

```html
<iframe src="https://ohm-demo-real-estate.vercel.app"
        title="AI voice agent demo for an estate agency"
        loading="lazy"
        allow="microphone"
        style="width:100%;height:900px;border:1px solid #e3e6ea;border-radius:12px">
</iframe>
```

**Keep `allow="microphone"`.** Browsers default the microphone Permissions
Policy to the top page's own origin, so a cross-origin frame has to be granted
it explicitly or `getUserMedia` is refused inside the frame. We could not
reproduce the refusal in a headless browser, where the test flags interfere, so
treat this as the rule rather than something we watched break: add it, then
open the voice tab in a real browser and check you can be heard.

Below 900px tall the demo's own page starts scrolling inside the frame, which
reads badly. On mobile, Option A is better than a short iframe.

---

## Option C: the widget alone, on our own page (advanced)

You can drop just the assistant onto an OMH page, with no demo site around it,
and it will answer as the agency:

```html
<script src="https://ohm-demo-real-estate.vercel.app/assistant.js" defer></script>
```

The webhook already accepts `onlinemarketinghelp.co.uk`, so this works today.

**Only do this on a page that does not already load the OMH assistant**, and
only with a line of text next to it explaining whose phone it is answering.
Without that, see "The one rule" above. In practice Option A is better: the demo
site gives the visitor the context that makes the agent make sense.

---

## What a visitor should be told to try

Worth putting on the page in a line or two, because people do not know what to
ask an assistant and a blank box gets one question and a shrug.

- **"What do you charge to sell my house?"** It quotes the real fee list.
- **"What's my house worth?"** It refuses, and books the valuation instead.
- **"Do you do mortgages?"** It says no rather than inventing an answer.

The second one is the one that sells. Every voice agent demo shows a perfect
booking; almost none show the agent declining to guess.

---

## Checking it works after you add it

1. Open the page and click through to the demo.
2. Type **"What do you charge to sell my house?"** You should get 1.2% plus VAT.
3. Open the **Voice** tab, press **Start call**, allow the microphone. You should
   be talking within a few seconds.
4. On an iframe, do steps 2 and 3 inside the frame.

If chat works inside the frame and voice does not, the missing
`allow="microphone"` is the first thing to check.

---

## If you need to change something

Nothing in this repository needs editing to put the demo on the site. If you
want the agency's fees, hours or services changed, that is `kb/business.py` and
a redeploy, which is Rafiul's job, not a content edit.

If you need the demo to work from a staging domain, the webhook's origin
allow-list has to be updated first or the browser will refuse it. Send the URL
and it takes a minute.

---

Online Marketing Help, The Hut, Central Ave, Hullbridge, Hockley SS5 6AU.
020 3489 3934, support@onlinemarketinghelp.co.uk
