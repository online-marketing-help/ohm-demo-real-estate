/* Demo assistant. Built from web/src/embed.js - edit that, not this file. */
(()=>{(function(){"use strict";if(window.__demoAssistantLoaded)return;window.__demoAssistantLoaded=!0;var O="https://n8n.srv1836598.hstgr.cloud",A=document.currentScript,b=A&&A.dataset||{},B=b.chatUrl||O+"/webhook/demo-real-estate-chat",U=b.voiceTokenUrl||O+"/webhook/demo-real-estate-voice-token",N=b.position==="left"?"left":"right",p=b.mount||"",x="",E=!1,W="Marlborough and Hale",$="I can tell you what we charge, what we cover, and book your valuation or a viewing.",J=b.retellSdk||"https://cdn.jsdelivr.net/npm/retell-client-js-sdk@2.0.5/+esm",g="01702 960 114",K="+441702960114",G="hello@marlboroughhale.example",F="Hello, you're through to Marlborough and Hale. I can tell you what we charge, what we cover, and book your valuation or a viewing, at any hour.",Q=["What do you charge to sell?","Book a valuation","Do you do lettings?","Where are you?"],t={open:!1,tab:"chat",msgs:[{role:"assistant",text:F}],sending:!1,voice:"idle",note:"",secs:0},y=null,w=null,I=X();function X(){try{var e=sessionStorage.getItem("ohm_assistant_session");if(e)return e}catch(n){}var o="web-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);try{sessionStorage.setItem("ohm_assistant_session",o)}catch(n){}return o}var C='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"',f={headset:"<svg "+C+' width="18" height="18"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M20 14h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1z"/></svg>',chat:"<svg "+C+' width="15" height="15"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>',mic:"<svg "+C+' width="15" height="15"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',send:"<svg "+C+' width="17" height="17"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>'},Z=`
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
button,input{font:inherit;color:inherit;margin:0}

.fab{position:fixed;${N}:20px;bottom:20px;z-index:2147483000;display:inline-flex;
  align-items:center;gap:9px;padding:13px 20px;border:none;border-radius:999px;cursor:pointer;
  background:var(--color-ink,#101828);color:var(--color-oninverse,#fff);
  font:600 15px/1 var(--font-body,"Source Sans 3",system-ui,-apple-system,sans-serif);
  box-shadow:0 10px 30px -10px rgba(16,24,40,.45)}
.fab:hover{transform:translateY(-1px)}

.panel{position:fixed;${N}:20px;bottom:20px;z-index:2147483000;
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
  .fab{${N}:12px;bottom:12px}
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
`,u=document.createElement("div");u.id="demo-assistant-root",u.style.cssText="all:initial;position:static";var k=u.attachShadow({mode:"open"}),H=document.createElement("style");H.textContent=Z,k.appendChild(H);var P=document.createElement("div");P.innerHTML='<button class="fab" type="button" aria-label="Open the assistant">'+f.headset+'<span>Ask the assistant</span></button><section class="panel" role="dialog" aria-modal="false" hidden aria-label="Online Marketing Help assistant"><header class="head"><span class="ico" aria-hidden="true">'+f.headset+'</span><span class="who"><strong>Marlborough & Hale</strong><em><i class="dot" aria-hidden="true"></i>Assistant. Answers from our own information</em></span><button class="x" type="button" aria-label="Close">&#10005;</button></header><div class="tabs" role="tablist"><button type="button" role="tab" data-tab="chat" class="on" aria-selected="true">'+f.chat+' Chat</button><button type="button" role="tab" data-tab="voice" aria-selected="false">'+f.mic+' Voice</button></div><div class="pane-chat"><div class="thread" aria-live="polite"></div><div class="chips"></div><form class="compose"><input type="text" placeholder="Type your question\u2026" aria-label="Your message" autocomplete="off"><button type="submit" aria-label="Send" disabled>'+f.send+'</button></form></div><div class="voice" hidden><div class="orb" aria-hidden="true">'+f.headset+'</div><h3></h3><p class="vlead"></p><p class="vnote" hidden></p><button class="call" type="button"></button><p class="vfoot">Prefer a person? Call <a href="tel:'+K+'">'+g+'</a></p></div><footer class="foot">Demo by <strong>Online Marketing Help</strong></footer></section>',k.appendChild(P);var i=function(e){return k.querySelector(e)},Y=i(".fab"),ee=i(".panel"),h=i(".thread"),te=i(".chips"),oe=i(".compose"),l=i(".compose input"),j=i(".compose button"),D=i(".pane-chat"),ne=i(".voice"),ae=i(".orb"),re=i(".voice h3"),ie=i(".vlead"),z=i(".vnote"),S=i(".call"),v=k.querySelectorAll(".tabs button");D.style.cssText="flex:1;min-height:0;display:flex;flex-direction:column",Q.forEach(function(e){var o=document.createElement("button");o.type="button",o.textContent=e,o.addEventListener("click",function(){T(e)}),te.appendChild(o)});function se(){var e=document.createElement("div");e.className="namestep";var o=document.createElement("p");o.className="ns-q",o.textContent="Who shall I say is calling?";var n=document.createElement("p");n.className="ns-sub",n.textContent="You'll be answered by name, by text and on the phone.";var c=document.createElement("form");c.className="ns-row";var a=document.createElement("input");a.type="text",a.maxLength=40,a.autocomplete="name",a.placeholder="Your name",a.setAttribute("aria-label","Your name");var d=document.createElement("button");d.type="submit",d.textContent="Start",d.disabled=!0,a.addEventListener("input",function(){d.disabled=!a.value.trim()}),c.addEventListener("submit",function(pe){pe.preventDefault(),a.value.trim()&&V.setCaller(a.value)}),c.append(a,d);var s=document.createElement("button");return s.type="button",s.className="ns-skip",s.textContent="Skip, just start talking",s.addEventListener("click",function(){E=!0,_(),l&&l.focus()}),e.append(o,n,c,s),e}function _(){if(h.textContent="",p&&!x&&!E){h.appendChild(se());return}if(t.msgs.forEach(function(o){var n=document.createElement("div");n.className="bub "+o.role,n.textContent=o.text,h.appendChild(n)}),t.sending){var e=document.createElement("div");e.className="typing",e.setAttribute("aria-label","typing"),e.innerHTML="<i></i><i></i><i></i>",h.appendChild(e)}h.scrollTop=h.scrollHeight}function q(){var e=t.voice;ae.className="orb"+(e==="live"?" live":e==="connecting"?" connecting":""),re.textContent=e==="live"?"You are on a call":e==="connecting"?"Connecting\u2026":"Talk to the assistant",ie.textContent=e==="live"?"Speak normally. You can interrupt at any time. "+le():"It answers in English, from our own information, and can book your valuation or a viewing. Your browser will ask for the microphone.",z.textContent=t.note,z.hidden=!t.note,z.className="vnote"+(e==="error"?" bad":""),S.textContent=e==="live"?"End call":e==="connecting"?"Connecting\u2026":"Start call",S.className="call"+(e==="live"?" end":""),S.disabled=e==="connecting"}function r(){Y.hidden=t.open,ee.hidden=!t.open,D.hidden=t.tab!=="chat",ne.hidden=t.tab!=="voice";for(var e=0;e<v.length;e++){var o=v[e].dataset.tab===t.tab;v[e].className=o?"on":"",v[e].setAttribute("aria-selected",o?"true":"false")}k.querySelectorAll(".chips button").forEach(function(n){n.disabled=t.sending}),j.disabled=t.sending||!l.value.trim(),_(),q()}function le(){var e=Math.floor(t.secs/60),o=t.secs%60;return(e<10?"0":"")+e+":"+(o<10?"0":"")+o}function T(e){var o=(e||"").trim();!o||t.sending||(l.value="",t.msgs.push({role:"user",text:o}),t.sending=!0,r(),fetch(B,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:I,message:o,page_url:location.href})}).then(function(n){if(!n.ok)throw new Error(String(n.status));return n.json()}).then(function(n){t.msgs.push({role:"assistant",text:n.reply||"Sorry, could you put that another way?"})}).catch(function(){t.msgs.push({role:"assistant",text:"Sorry, I cannot reach our system right now. Please call "+g+" or email "+G+" and the team will pick it up."})}).then(function(){t.sending=!1,r(),l.focus()}))}var m=null;function de(){if(m)return m;var e=J;return m=import(e).then(function(o){var n=o&&(o.RetellWebClient||o.default&&o.default.RetellWebClient);if(!n)throw new Error("sdk");return n}),m.catch(function(){m=null}),m}function ce(){t.voice==="live"||t.voice==="connecting"||(t.voice="connecting",t.note="Connecting\u2026",r(),de().then(function(e){if(!e)throw new Error("sdk");return fetch(U,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:I,caller_name:x,page_url:location.href})}).then(function(o){if(!o.ok)throw new Error("token");return o.json()}).then(function(o){if(!o.access_token)throw new Error("token");return{Client:e,token:o.access_token}})}).then(function(e){var o=new e.Client;return y=o,o.on("call_started",function(){t.voice="live",t.note="",clearInterval(w),t.secs=0,w=setInterval(function(){t.secs++,q()},1e3),r()}),o.on("call_ended",function(){t.voice="idle",t.note="Call ended.",clearInterval(w),r()}),o.on("error",function(){t.voice="error",t.note="The call dropped. Please try again or ring "+g+".",clearInterval(w);try{o.stopCall()}catch(n){}r()}),o.on("update",function(n){var c=n&&n.transcript,a=c&&c[c.length-1];if(!(!a||!a.content)){var d=a.role==="agent"?"assistant":"user",s=t.msgs[t.msgs.length-1];if(s&&s.role===d&&a.content.indexOf(s.text)===0)s.text=a.content;else{if(s&&s.role===d&&s.text===a.content)return;t.msgs.push({role:d,text:a.content})}_()}}),o.startCall({accessToken:e.token})}).catch(function(e){t.voice="error",t.note=e&&e.message==="token"?"Could not start the call. Please ring "+g+".":"Your browser blocked the microphone, or the call could not start. Please ring "+g+".",r()}))}function L(){try{y&&y.stopCall()}catch(e){}clearInterval(w),t.voice="idle",r()}Y.addEventListener("click",function(){t.open=!0,r(),l.focus()}),i(".x").addEventListener("click",function(){L(),t.open=!1,r()});for(var M=0;M<v.length;M++)v[M].addEventListener("click",function(){t.tab=this.dataset.tab,r(),t.tab==="chat"&&l.focus()});oe.addEventListener("submit",function(e){e.preventDefault(),T(l.value)}),l.addEventListener("input",function(){j.disabled=t.sending||!l.value.trim()}),S.addEventListener("click",function(){t.voice==="live"?L():ce()}),document.addEventListener("keydown",function(e){p||e.key==="Escape"&&t.open&&(L(),t.open=!1,r())}),window.addEventListener("pagehide",function(){try{y&&y.stopCall()}catch(e){}});function R(){var e=p?document.querySelector(p):null;p&&!e&&window.console&&console.warn("[assistant] data-mount not found: "+p),e?(u.className="inline",u.style.cssText="all:initial;display:flex;height:100%",e.appendChild(u),t.open=!0):document.body.appendChild(u),r()}p&&window.addEventListener("message",function(e){var o=e.data;!o||typeof o!="object"||(o.type==="assistant:ask"&&typeof o.text=="string"?(E=!0,r(),T(o.text.slice(0,300))):o.type==="assistant:caller"&&typeof o.name=="string"&&V.setCaller(o.name))}),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",R):R();var V=window.DemoAssistant={open:function(e){t.open=!0,(e==="voice"||e==="chat")&&(t.tab=e),r()},close:function(){L(),t.open=!1,r()},sessionId:function(){return I},setCaller:function(e){x=String(e||"").trim().slice(0,40),E=!0,x&&(t.msgs=[{role:"assistant",text:"Hello "+x+", you're through to "+W+". "+$}],t.open=!0,r(),l&&l.focus())}}})();})();
