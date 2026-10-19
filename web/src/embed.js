/* =========================================================================
   OMH site assistant, as a drop-in embed.

   onlinemarketinghelp.co.uk is WordPress, so this cannot be the React
   component: it has to survive a theme it knows nothing about, and it has to
   install with one script tag and no build step.

   Two decisions follow from that.

   1. Vanilla DOM, not React. The host page may already ship its own React,
      and a second copy is both weight and a source of version conflicts.

   2. Shadow DOM. WordPress themes set global rules on button, input and * that
      would wreck this panel, and this panel's own rules would leak back into
      the theme. A shadow root stops both directions. CSS custom properties
      still inherit across the boundary, so the var(--color-ink, #101828)
      pattern keeps working: on the Next.js site it picks up the real brand
      tokens, on WordPress it falls back to the literals below.

   Install:
     <script src="/path/to/ohm-assistant.js" defer></script>

   Override the endpoints without editing this file:
     <script src="…/ohm-assistant.js" defer
             data-chat-url="https://…/webhook/ohm-chat"
             data-voice-token-url="https://…/webhook/ohm-voice-token"
             data-position="left"></script>
   ========================================================================= */

(function () {
  "use strict";

  /* A WordPress site can easily end up including the same script twice, from a
     theme and from a plugin. Two panels fighting over one session id is worse
     than no panel, so the second copy does nothing. */
  if (window.__demoAssistantLoaded) return;
  window.__demoAssistantLoaded = true;

  /* ------------------------------------------------------------- config */

  var N8N = "https://n8n.srv1836598.hstgr.cloud";
  var el = document.currentScript;
  var data = (el && el.dataset) || {};

  var CHAT_URL = data.chatUrl || N8N + "/webhook/demo-real-estate-chat";
  var VOICE_TOKEN_URL = data.voiceTokenUrl || N8N + "/webhook/demo-real-estate-voice-token";
  var SIDE = data.position === "left" ? "left" : "right";
  /* Inline mode. The OMH site already has its own assistant pinned to the
     bottom right of every page; a second floating pill next to it is confusing
     and makes a fictional business's prices look like ours. With data-mount the
     panel is rendered inside that element instead, docked and already open,
     with no pill at all. */
  var MOUNT = data.mount || "";

  /* The visitor plays the caller, so they can give their own name and be
     addressed by it. Held here only; it is sent with each message and with the
     voice token, never stored. */
  var caller = "";
  var askedName = false;
  var BUSINESS = "Marlborough and Hale";
  var OPENER_TAIL =
    "I can tell you what we charge, what we cover, and book your valuation or a viewing.";
  /* The ESM build, not the UMD one. retell-client-js-sdk's UMD file leaves
     eventemitter3 and livekit-client as externals, so loading it from a CDN in
     a plain script tag throws "Cannot read properties of undefined (reading
     'EventEmitter')" the moment a call starts. jsDelivr's +esm build rewrites
     those imports to further +esm URLs, so the browser fetches the whole tree
     itself. It is pulled in on demand, so a visitor who never opens the Voice
     tab never downloads it. */
  var RETELL_SDK =
    data.retellSdk || "https://cdn.jsdelivr.net/npm/retell-client-js-sdk@2.0.5/+esm";

  var PHONE = "01702 960 114";
  var TEL = "+441702960114";
  var EMAIL = "hello@marlboroughhale.example";

  var OPENER =
    "Hello, you're through to Marlborough and Hale. I can tell you what we charge, what we cover, and book your valuation or a viewing, at any hour.";

  var CHIPS = [
    "What do you charge to sell?",
    "Book a valuation",
    "Do you do lettings?",
    "Where are you?",
  ];

  /* ------------------------------------------------------------- state */

  var state = {
    open: false,
    tab: "chat",
    msgs: [{ role: "assistant", text: OPENER }],
    sending: false,
    voice: "idle", // idle | connecting | live | error
    note: "",
    secs: 0,
  };

  var retell = null;
  var timer = null;
  var sess = sessionId();

  function sessionId() {
    try {
      var found = sessionStorage.getItem("ohm_assistant_session");
      if (found) return found;
    } catch (e) {
      /* private window, or the host blocks storage: fall through to a fresh id */
    }
    var id =
      "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    try {
      sessionStorage.setItem("ohm_assistant_session", id);
    } catch (e) {
      /* not fatal: the id just will not survive a reload */
    }
    return id;
  }

  /* ------------------------------------------------------------- icons */

  var SVG =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"';

  var ICON = {
    headset:
      "<svg " + SVG + ' width="18" height="18">' +
      '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/>' +
      '<path d="M4 14h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>' +
      '<path d="M20 14h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1z"/></svg>',
    chat:
      "<svg " + SVG + ' width="15" height="15">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>',
    mic:
      "<svg " + SVG + ' width="15" height="15">' +
      '<rect x="9" y="2" width="6" height="11" rx="3"/>' +
      '<path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
    send:
      "<svg " + SVG + ' width="17" height="17">' +
      '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  };

  /* ------------------------------------------------------------- styles */

  var CSS = `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
button,input{font:inherit;color:inherit;margin:0}

.fab{position:fixed;${SIDE}:20px;bottom:20px;z-index:2147483000;display:inline-flex;
  align-items:center;gap:9px;padding:13px 20px;border:none;border-radius:999px;cursor:pointer;
  background:var(--color-ink,#101828);color:var(--color-oninverse,#fff);
  font:600 15px/1 var(--font-body,"Source Sans 3",system-ui,-apple-system,sans-serif);
  box-shadow:0 10px 30px -10px rgba(16,24,40,.45)}
.fab:hover{transform:translateY(-1px)}

.panel{position:fixed;${SIDE}:20px;bottom:20px;z-index:2147483000;
  width:min(408px,calc(100vw - 32px));height:min(660px,calc(100vh - 40px));
  display:flex;flex-direction:column;overflow:hidden;text-align:left;
  background:var(--color-surface,#fff);color:var(--color-ink,#101828);
  border:1px solid var(--color-line,#d9ddd8);border-radius:var(--radius-card,14px);
  box-shadow:0 24px 64px -18px rgba(16,24,40,.38);
  font:400 15px/1.55 var(--font-body,"Source Sans 3",system-ui,-apple-system,sans-serif)}
[hidden]{display:none!important}

.head{display:flex;align-items:center;gap:12px;padding:15px 16px}
.ico{width:40px;height:40px;flex:0 0 auto;border-radius:12px;display:grid;place-items:center;
  background:var(--color-amber,#d79a37);color:#fff}
.who{display:flex;flex-direction:column;gap:3px;min-width:0}
.who strong{font:600 16px/1.1 var(--font-display,"Instrument Sans",system-ui,sans-serif)}
.who em{font-style:normal;font-size:12px;color:var(--color-muted,#667085);
  display:flex;align-items:center;gap:6px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--color-success,#067647);
  flex:0 0 auto;animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.x{margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;line-height:1;
  color:var(--color-muted,#667085);padding:7px}
.x:hover{color:var(--color-ink,#101828)}

.tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--color-line,#d9ddd8)}
.tabs button{display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:12px 8px;background:none;border:none;cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-1px;
  color:var(--color-muted,#667085);font-weight:600;font-size:14.5px;line-height:1}
.tabs button:hover{color:var(--color-ink,#101828)}
.tabs button.on{color:var(--color-ink,#101828);border-bottom-color:var(--color-amber,#d79a37)}

.thread{flex:1;min-height:0;overflow-y:auto;padding:18px 16px;
  display:flex;flex-direction:column;gap:10px}
.bub{max-width:88%;padding:12px 15px;border-radius:14px;font-size:14.5px;
  white-space:pre-wrap;overflow-wrap:break-word;
  animation:in .22s cubic-bezier(.2,.7,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.bub.assistant{align-self:flex-start;background:var(--color-warm,#f7f6f2);
  border:1px solid var(--color-line,#d9ddd8);border-bottom-left-radius:5px}
.bub.user{align-self:flex-end;background:var(--color-ink,#101828);
  color:var(--color-oninverse,#fff);border-bottom-right-radius:5px}
.typing{display:inline-flex;gap:4px;align-items:center;padding:14px;align-self:flex-start;
  background:var(--color-warm,#f7f6f2);border:1px solid var(--color-line,#d9ddd8);
  border-radius:14px;border-bottom-left-radius:5px}
.typing i{width:6px;height:6px;border-radius:50%;background:var(--color-muted,#667085);
  animation:bounce 1.2s infinite ease-in-out}
.typing i:nth-child(2){animation-delay:.15s}
.typing i:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:1}}

.namestep{margin:auto 0;padding:6px 2px;text-align:center}
.ns-q{font:600 19px/1.3 var(--font-display,"Instrument Sans",system-ui,sans-serif);
  color:var(--color-ink,#101828)}
.ns-sub{font-size:14px;color:var(--color-muted,#667085);margin:6px 0 16px}
.ns-row{display:flex;gap:8px;margin:0 auto;max-width:320px}
.ns-row input{flex:1;min-width:0;padding:12px 15px;border-radius:999px;font:inherit;font-size:15px;
  border:1px solid var(--color-line,#d9ddd8);background:var(--color-surface,#fff);
  color:var(--color-ink,#101828);text-align:center}
.ns-row input:focus{outline:none;border-color:var(--color-amber,#d79a37)}
.ns-row button{border:none;border-radius:999px;padding:12px 20px;cursor:pointer;font:inherit;
  font-weight:600;font-size:15px;background:var(--color-ink,#101828);color:#fff}
.ns-row button:disabled{opacity:.35;cursor:not-allowed}
.ns-skip{display:block;margin:14px auto 0;background:none;border:none;cursor:pointer;
  font:inherit;font-size:13.5px;color:var(--color-muted,#667085);text-decoration:underline}
.ns-skip:hover{color:var(--color-ink,#101828)}

.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 12px}
.chips button{padding:9px 15px;border-radius:999px;cursor:pointer;font-size:13.5px;
  background:var(--color-surface,#fff);color:var(--color-ink,#101828);
  border:1px solid var(--color-line,#d9ddd8)}
.chips button:hover:not(:disabled){border-color:var(--color-amber,#d79a37);
  color:var(--color-amber-deep,#8f5a0e)}
.chips button:disabled{opacity:.5;cursor:not-allowed}

.compose{display:flex;gap:9px;align-items:center;padding:0 16px 14px}
.compose input{flex:1;min-width:0;padding:13px 17px;border-radius:999px;font-size:14.5px;
  border:1px solid var(--color-line,#d9ddd8);background:var(--color-surface,#fff);
  color:var(--color-ink,#101828)}
.compose input:focus{outline:none;border-color:var(--color-amber,#d79a37)}
.compose button{width:46px;height:46px;flex:0 0 auto;border-radius:50%;border:none;cursor:pointer;
  display:grid;place-items:center;background:var(--color-amber,#d79a37);color:#fff}
.compose button:hover:not(:disabled){background:var(--color-amber-deep,#8f5a0e)}
.compose button:disabled{opacity:.4;cursor:not-allowed}

.voice{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:24px 26px;gap:3px}
.orb{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;
  background:var(--color-warm,#f7f6f2);border:1px solid var(--color-line,#d9ddd8);
  color:var(--color-amber,#d79a37);margin-bottom:18px}
.orb svg{width:34px;height:34px}
.orb.live{background:var(--color-amber,#d79a37);color:#fff;border-color:transparent;
  animation:ring 1.8s ease-out infinite}
.orb.connecting{animation:pulse 1.2s ease-in-out infinite}
@keyframes ring{0%{box-shadow:0 0 0 0 rgba(215,154,55,.5)}100%{box-shadow:0 0 0 22px rgba(215,154,55,0)}}
.voice h3{margin:0 0 7px;font:600 18px/1.2 var(--font-display,"Instrument Sans",system-ui,sans-serif)}
.voice p{margin:0;font-size:14px;color:var(--color-muted,#667085);max-width:34ch}
.vnote{margin-top:10px!important;font-size:13px!important}
.vnote.bad{color:var(--color-error,#b42318)!important}
.call{margin-top:22px;padding:14px 34px;border-radius:999px;border:none;cursor:pointer;
  background:var(--color-ink,#101828);color:var(--color-oninverse,#fff);
  font-weight:600;font-size:15px;line-height:1}
.call.end{background:var(--color-error,#b42318)}
.call:disabled{opacity:.5;cursor:not-allowed}
.vfoot{margin-top:18px!important;font-size:13px!important}
.vfoot a{color:var(--color-amber-deep,#8f5a0e)}

.foot{padding:11px 16px;text-align:center;font-size:12px;
  color:var(--color-muted,#667085);border-top:1px solid var(--color-line,#d9ddd8);
  background:var(--color-warm,#f7f6f2)}
.foot strong{color:var(--color-ink,#101828);font-weight:600}

@media (max-width:460px){
  .panel{right:8px;left:8px;bottom:8px;width:auto;height:min(82vh,660px)}
  .fab{${SIDE}:12px;bottom:12px}
}
/* Docked: fills whatever box the host page gives it. */
:host(.inline){display:flex;height:100%}
:host(.inline) > div{display:flex;flex:1;min-height:0}
:host(.inline) .panel{position:static;width:100%;flex:1;height:auto;min-height:0;max-height:none;
  box-shadow:none;border-radius:var(--radius-card,14px)}
:host(.inline) .fab{display:none}
:host(.inline) .x{display:none}

@media (prefers-reduced-motion:reduce){
  .bub,.dot,.typing i,.orb.live,.orb.connecting{animation:none}
}
`;

  /* ------------------------------------------------------------- build */

  var host = document.createElement("div");
  host.id = "demo-assistant-root";
  /* The host element itself must not take part in the page layout, or a theme
     with `div { margin }` shifts the footer. */
  host.style.cssText = "all:initial;position:static";
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = CSS;
  root.appendChild(style);

  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<button class="fab" type="button" aria-label="Open the assistant">' +
      ICON.headset + "<span>Ask the assistant</span></button>" +

    '<section class="panel" role="dialog" aria-modal="false" hidden ' +
            'aria-label="Online Marketing Help assistant">' +
      '<header class="head">' +
        '<span class="ico" aria-hidden="true">' + ICON.headset + "</span>" +
        '<span class="who"><strong>Marlborough & Hale</strong>' +
          '<em><i class="dot" aria-hidden="true"></i>' +
          "Assistant. Answers from our own information</em></span>" +
        '<button class="x" type="button" aria-label="Close">&#10005;</button>' +
      "</header>" +

      '<div class="tabs" role="tablist">' +
        '<button type="button" role="tab" data-tab="chat" class="on" aria-selected="true">' +
          ICON.chat + " Chat</button>" +
        '<button type="button" role="tab" data-tab="voice" aria-selected="false">' +
          ICON.mic + " Voice</button>" +
      "</div>" +

      '<div class="pane-chat">' +
        '<div class="thread" aria-live="polite"></div>' +
        '<div class="chips"></div>' +
        '<form class="compose">' +
          '<input type="text" placeholder="Type your question…" aria-label="Your message" ' +
                 'autocomplete="off">' +
          '<button type="submit" aria-label="Send" disabled>' + ICON.send + "</button>" +
        "</form>" +
      "</div>" +

      '<div class="voice" hidden>' +
        '<div class="orb" aria-hidden="true">' + ICON.headset + "</div>" +
        "<h3></h3><p class=\"vlead\"></p>" +
        '<p class="vnote" hidden></p>' +
        '<button class="call" type="button"></button>' +
        '<p class="vfoot">Prefer a person? Call <a href="tel:' + TEL + '">' + PHONE + "</a></p>" +
      "</div>" +

      '<footer class="foot">Demo by <strong>Online Marketing Help</strong></footer>' +
    "</section>";
  root.appendChild(wrap);

  var $ = function (sel) { return root.querySelector(sel); };
  var fab = $(".fab");
  var panel = $(".panel");
  var thread = $(".thread");
  var chips = $(".chips");
  var form = $(".compose");
  var input = $(".compose input");
  var sendBtn = $(".compose button");
  var paneChat = $(".pane-chat");
  var paneVoice = $(".voice");
  var orb = $(".orb");
  var vTitle = $(".voice h3");
  var vLead = $(".vlead");
  var vNote = $(".vnote");
  var callBtn = $(".call");
  var tabBtns = root.querySelectorAll(".tabs button");

  /* The chat pane is a flex child that must shrink; it is a plain div in the
     markup, so give it the same box the old component's fragment had. */
  paneChat.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column";

  CHIPS.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = c;
    b.addEventListener("click", function () { send(c); });
    chips.appendChild(b);
  });

  /* ------------------------------------------------------------- render */

  function nameStep() {
    var wrap = document.createElement("div");
    wrap.className = "namestep";
    var h = document.createElement("p");
    h.className = "ns-q";
    h.textContent = "Who shall I say is calling?";
    var sub = document.createElement("p");
    sub.className = "ns-sub";
    sub.textContent = "You'll be answered by name, by text and on the phone.";
    var row = document.createElement("form");
    row.className = "ns-row";
    var i = document.createElement("input");
    i.type = "text";
    i.maxLength = 40;
    i.autocomplete = "name";
    i.placeholder = "Your name";
    i.setAttribute("aria-label", "Your name");
    var go = document.createElement("button");
    go.type = "submit";
    go.textContent = "Start";
    go.disabled = true;
    i.addEventListener("input", function () { go.disabled = !i.value.trim(); });
    row.addEventListener("submit", function (e) {
      e.preventDefault();
      if (i.value.trim()) api.setCaller(i.value);
    });
    row.append(i, go);
    var skip = document.createElement("button");
    skip.type = "button";
    skip.className = "ns-skip";
    skip.textContent = "Skip, just start talking";
    skip.addEventListener("click", function () {
      askedName = true;
      renderThread();
      if (input) input.focus();
    });
    wrap.append(h, sub, row, skip);
    return wrap;
  }

  function renderThread() {
    thread.textContent = "";
    /* Docked on someone else's page, the first thing it asks for is a name, so
       the visitor can hear it answer them personally. */
    if (MOUNT && !caller && !askedName) {
      thread.appendChild(nameStep());
      return;
    }
    state.msgs.forEach(function (m) {
      var d = document.createElement("div");
      d.className = "bub " + m.role;
      /* textContent, never innerHTML: the reply is ours, but a knowledge base
         is edited by people and must never be able to inject markup. */
      d.textContent = m.text;
      thread.appendChild(d);
    });
    if (state.sending) {
      var t = document.createElement("div");
      t.className = "typing";
      t.setAttribute("aria-label", "typing");
      t.innerHTML = "<i></i><i></i><i></i>";
      thread.appendChild(t);
    }
    thread.scrollTop = thread.scrollHeight;
  }

  function renderVoice() {
    var v = state.voice;
    orb.className = "orb" + (v === "live" ? " live" : v === "connecting" ? " connecting" : "");
    vTitle.textContent =
      v === "live" ? "You are on a call" : v === "connecting" ? "Connecting…" : "Talk to the assistant";
    vLead.textContent =
      v === "live"
        ? "Speak normally. You can interrupt at any time. " + mmss()
        : "It answers in English, from our own information, and can book your valuation or a viewing. " +
          "Your browser will ask for the microphone.";
    vNote.textContent = state.note;
    vNote.hidden = !state.note;
    vNote.className = "vnote" + (v === "error" ? " bad" : "");
    callBtn.textContent = v === "live" ? "End call" : v === "connecting" ? "Connecting…" : "Start call";
    callBtn.className = "call" + (v === "live" ? " end" : "");
    callBtn.disabled = v === "connecting";
  }

  function render() {
    fab.hidden = state.open;
    panel.hidden = !state.open;
    paneChat.hidden = state.tab !== "chat";
    paneVoice.hidden = state.tab !== "voice";
    for (var i = 0; i < tabBtns.length; i++) {
      var on = tabBtns[i].dataset.tab === state.tab;
      tabBtns[i].className = on ? "on" : "";
      tabBtns[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    root.querySelectorAll(".chips button").forEach(function (b) { b.disabled = state.sending; });
    sendBtn.disabled = state.sending || !input.value.trim();
    renderThread();
    renderVoice();
  }

  function mmss() {
    var m = Math.floor(state.secs / 60), s = state.secs % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ------------------------------------------------------------- chat */

  function send(text) {
    var clean = (text || "").trim();
    if (!clean || state.sending) return;
    input.value = "";
    state.msgs.push({ role: "user", text: clean });
    state.sending = true;
    render();

    fetch(CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id: sess,
        message: clean,
        page_url: location.href,
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (d) {
        state.msgs.push({
          role: "assistant",
          text: d.reply || "Sorry, could you put that another way?",
        });
      })
      .catch(function () {
        /* Never leave someone staring at a dead box. Give them a way through. */
        state.msgs.push({
          role: "assistant",
          text:
            "Sorry, I cannot reach our system right now. Please call " +
            PHONE + " or email " + EMAIL + " and the team will pick it up.",
        });
      })
      .then(function () {
        state.sending = false;
        render();
        input.focus();
      });
  }

  /* ------------------------------------------------------------- voice */

  var sdkPromise = null;

  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    /* The URL is held in a variable so the bundler cannot resolve it at build
       time and inline the SDK into this file. */
    var url = RETELL_SDK;
    sdkPromise = import(url).then(function (m) {
      var C = m && (m.RetellWebClient || (m.default && m.default.RetellWebClient));
      if (!C) throw new Error("sdk");
      return C;
    });
    /* A failed load must not be cached, or the second attempt can never work. */
    sdkPromise.catch(function () { sdkPromise = null; });
    return sdkPromise;
  }

  function startVoice() {
    if (state.voice === "live" || state.voice === "connecting") return;
    state.voice = "connecting";
    state.note = "Connecting…";
    render();

    loadSdk()
      .then(function (Client) {
        if (!Client) throw new Error("sdk");
        return fetch(VOICE_TOKEN_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: sess, caller_name: caller,
                                 page_url: location.href }),
        }).then(function (r) {
          if (!r.ok) throw new Error("token");
          return r.json();
        }).then(function (d) {
          if (!d.access_token) throw new Error("token");
          return { Client: Client, token: d.access_token };
        });
      })
      .then(function (o) {
        var client = new o.Client();
        retell = client;

        client.on("call_started", function () {
          state.voice = "live";
          state.note = "";
          clearInterval(timer);
          state.secs = 0;
          timer = setInterval(function () { state.secs++; renderVoice(); }, 1000);
          render();
        });
        client.on("call_ended", function () {
          state.voice = "idle";
          state.note = "Call ended.";
          clearInterval(timer);
          render();
        });
        client.on("error", function () {
          state.voice = "error";
          state.note = "The call dropped. Please try again or ring " + PHONE + ".";
          clearInterval(timer);
          try { client.stopCall(); } catch (e) { /* already gone */ }
          render();
        });
        /* Mirror the call into the same thread, so chat and voice stay one
           conversation and the caller can read back what they agreed. */
        client.on("update", function (u) {
          var tr = u && u.transcript;
          var last = tr && tr[tr.length - 1];
          if (!last || !last.content) return;
          var role = last.role === "agent" ? "assistant" : "user";
          var prev = state.msgs[state.msgs.length - 1];
          if (prev && prev.role === role && last.content.indexOf(prev.text) === 0) {
            prev.text = last.content;
          } else if (prev && prev.role === role && prev.text === last.content) {
            return;
          } else {
            state.msgs.push({ role: role, text: last.content });
          }
          renderThread();
        });

        return client.startCall({ accessToken: o.token });
      })
      .catch(function (e) {
        state.voice = "error";
        state.note =
          e && e.message === "token"
            ? "Could not start the call. Please ring " + PHONE + "."
            : "Your browser blocked the microphone, or the call could not start. " +
              "Please ring " + PHONE + ".";
        render();
      });
  }

  function stopVoice() {
    try { if (retell) retell.stopCall(); } catch (e) { /* already stopped */ }
    clearInterval(timer);
    state.voice = "idle";
    render();
  }

  /* ------------------------------------------------------------- wiring */

  fab.addEventListener("click", function () {
    state.open = true;
    render();
    input.focus();
  });

  $(".x").addEventListener("click", function () {
    stopVoice();
    state.open = false;
    render();
  });

  for (var i = 0; i < tabBtns.length; i++) {
    tabBtns[i].addEventListener("click", function () {
      state.tab = this.dataset.tab;
      render();
      if (state.tab === "chat") input.focus();
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    send(input.value);
  });
  input.addEventListener("input", function () {
    sendBtn.disabled = state.sending || !input.value.trim();
  });

  callBtn.addEventListener("click", function () {
    if (state.voice === "live") stopVoice();
    else startVoice();
  });

  document.addEventListener("keydown", function (e) {
    if (MOUNT) return;                 /* docked: there is nothing to close */
    if (e.key === "Escape" && state.open) {
      stopVoice();
      state.open = false;
      render();
    }
  });

  /* A live call must not survive the page it belongs to. */
  window.addEventListener("pagehide", function () {
    try { if (retell) retell.stopCall(); } catch (e) { /* going anyway */ }
  });

  function mount() {
    var target = MOUNT ? document.querySelector(MOUNT) : null;
    if (MOUNT && !target) {
      /* Say so rather than silently falling back to a floating pill the page
         did not ask for. */
      if (window.console) console.warn("[assistant] data-mount not found: " + MOUNT);
    }
    if (target) {
      host.className = "inline";
      host.style.cssText = "all:initial;display:flex;height:100%";
      target.appendChild(host);
      state.open = true;
    } else {
      document.body.appendChild(host);
    }
    render();
  }
  /* The page this is embedded in can ask a question or set the caller, so the
     suggested prompts beside the frame actually do something rather than being
     a list of things the visitor has to retype. Only honoured when docked, and
     only for the two messages below. */
  if (MOUNT) {
    window.addEventListener("message", function (e) {
      var d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "assistant:ask" && typeof d.text === "string") {
        askedName = true;
        render();
        send(d.text.slice(0, 300));
      } else if (d.type === "assistant:caller" && typeof d.name === "string") {
        api.setCaller(d.name);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  /* A small handle, so the site can open the panel from its own "Chat to us"
     button instead of only the floating one. */
  var api = window.DemoAssistant = {
    open: function (tab) {
      state.open = true;
      if (tab === "voice" || tab === "chat") state.tab = tab;
      render();
    },
    close: function () { stopVoice(); state.open = false; render(); },
    sessionId: function () { return sess; },
    /* Set who the visitor is playing. Greets them by name straight away so the
       effect is visible before they type anything. */
    setCaller: function (name) {
      caller = String(name || "").trim().slice(0, 40);
      askedName = true;
      if (!caller) return;
      state.msgs = [{ role: "assistant",
        text: "Hello " + caller + ", you're through to " + BUSINESS + ". " + OPENER_TAIL }];
      state.open = true;
      render();
      if (input) input.focus();
    },
  };
})();
