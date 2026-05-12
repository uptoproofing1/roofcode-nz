import { useState, useRef, useEffect, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const FREE_LIMIT = 5;
https://buy.stripe.com/test_28E7sEddA9L5bhl04k0ZW00
const UNLOCK_CODE = "ROOFPRO399";

// ─── Knowledge base (COP v26.03 March 2026) ───────────────────────────────────
const SYSTEM_PROMPT = `You are the Roof Code NZ Assistant — a highly technical NZ metal roofing assistant for roofers, contractors, LBPs and estimators. Powered by NZ Metal Roof and Wall Cladding Code of Practice v26.03 (March 2026).

Always start responses with "Kia ora! 👋" on first message of a new chat.

RULES:
- Give SPECIFIC answers with exact codes, mm dimensions, and COP table references.
- Fixing patterns: give exact code (5T3, C4 etc) AND plain English meaning.
- Flashing cover: give exact mm for wind zone category and pitch.
- State COP clause/table number when giving technical data.
- Plain English, NZ trade language. Direct answer first, detail second.
- Only say "check manufacturer specs" for data genuinely not in the COP.
- Flag consent/engineering-required situations clearly.

KEY DATA FROM COP v26.03:
WIND ZONES: Low=32m/s | Medium=37m/s | High=44m/s | VeryHigh=50m/s | ExtraHigh=55m/s
FIXING CODES: C2=Hit1Miss4 | C3=Hit1Miss2Miss3 | C4=Hit1Miss2Miss1 | C5=Hit1Miss1 | 5T2=Hit1Miss1 | 5T3=Hit2Miss1Hit1 | 5T4=HitAll | 6T3=Hit2Miss2Hit1 | 6T5=HitAll
0.55mm CORRUGATE unrestricted: 0.6m=C2 all | 0.9m EH=C3 rest=C2 | 1.2m H=C3 VH=C3 EH=C4 | 1.5m restricted H=C3 VH=C4 EH=C4
0.55mm 5-RIB unrestricted: 0.6m=5T2 all | 0.9m EH=5T3 rest=5T2 | 1.2m VH/EH=5T3 rest=5T2 | 1.5m H=5T3 VH=5T3 EH=5T4
0.40mm CORRUGATE restricted: 0.6m=C2 | 0.9m H=C3 VH=C4 EH=C4 | 1.2m non-trafficable H=C4 VH=C5
0.40mm 5-RIB restricted: 0.6m=5T2 all | 0.9m VH=5T3 EH=5T3 | 1.2m H=5T3 VH=5T4 EH=5T4
ALUMINIUM: Always requires load-spreading washers. 0.70mm corrugate non-traf 0.9m=C3 all | 0.90mm unrestricted=C3 all
MIN PITCH: Corrugate 16.5mm=8° | Corrugate 21mm=4° | Trapezoidal 20mm=4° | Trapezoidal 27mm=3° | Secret fix=3° | Standing seam=3° | Absolute min=3°
FLASHING CATEGORIES: CatA=Low/Med/High all pitches + VH/EH ≥10° | CatB=VH/EH <10° | CatC=SED 60m/s | CatD=SED 68m/s (NEW v26.03)
RIDGE C1: CatA=130mm | CatB=200mm | CatC/D=200mm+baffle
BARGE trap C2: CatA=1 upstand | CatB=2 upstands | CatC/D=2+undersoaker | C1 profiled: CatA=75mm | CatB=100mm | CatC/D=125mm
APRON trap C2: CatA=1 upstand | CatB=2 upstands max300mm | C1 profiled: CatA=75+hem/100 | CatB=100+hem/125 | CatC/D=125mm
THERMAL: Formula=12×ΔT×Length/1000mm. Unfavourable (dark, hot rolled purlins ≥3mm, spacing <1.5m, pan fix) threshold ~10-15m. Favourable ~15-30m.
PULL-OVER: 0.40mm=0.4kN / +washer=0.7kN | 0.55mm=0.5kN / +washer=0.9kN
END LAPS: Min 150mm, fix every rib, seal both ends, avoid where possible.
GROUND CLEARANCE: Paved=100mm | Lawn=150mm | Pasture=175mm | Gravel=125mm
NEW v26.03: Category D added | CatB VH now <10° (was <8°) | Colorsteel Maxam (was Maxx) | Scaffolding guidance added | Ventilation revised
LINKS: https://www.metalroofing.org.nz/cop | https://www.building.govt.nz | https://hirds.niwa.co.nz`;

const RESOURCES = [
  { title: "MRM COP v26.03 Online", desc: "Full NZ Metal Roofing Code of Practice", url: "https://www.metalroofing.org.nz/cop", icon: "📋" },
  { title: "MBIE E2/AS1", desc: "External Moisture Building Code", url: "https://www.building.govt.nz/building-code-compliance/e-moisture/e2-external-moisture", icon: "🏛" },
  { title: "NIWA HIRDS", desc: "NZ Rainfall intensity calculator", url: "https://hirds.niwa.co.nz", icon: "🌧" },
  { title: "Roofguide 3D", desc: "NZ Roofing detail visualiser", url: "https://www.roofguide.co.nz", icon: "🏠" },
  { title: "Wind Zone Tool", desc: "NZS 3604 wind zone calculator", url: "https://www.building.govt.nz/building-code-compliance/b-stability/b1-structure/wind-zones/", icon: "💨" },
  { title: "Colorsteel Selector", desc: "NZSS product and colour guide", url: "https://www.colorsteel.co.nz", icon: "🎨" },
];

const QUICK_QUESTIONS = [
  "Roof pitch requirements",
  "Fixing guidelines",
  "Underlay requirements",
  "E2/AS1 Guidance",
  "Compliance Docs",
  "Best Practice",
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>,
    chat: <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>,
    bookmark: <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>,
    book: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>,
    info: <><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01"/></>,
    settings: <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>,
    plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>,
    send: <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>,
    mic: <><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></>,
    close: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>,
    menu: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>,
    trash: <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>,
    roof: null,
    speaker: <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-4-4m4 4l4-4M9.172 9.172a4 4 0 000 5.656"/>,
    external: <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      {icons[name]}
    </svg>
  );
};

function RoofLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#lg)"/>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6"/>
          <stop offset="1" stopColor="#1d4ed8"/>
        </linearGradient>
      </defs>
      <path d="M6 28 L20 10 L34 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 28 L20 14 L30 28" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="6" y1="28" x2="34" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "4px 0", alignItems: "center" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#3b82f6",
          animation: `rcBounce 1.2s ease-in-out ${i*0.18}s infinite`,
        }}/>
      ))}
      <style>{`@keyframes rcBounce{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  );
}

// ─── Paywall ──────────────────────────────────────────────────────────────────
function PaywallModal({ onClose, onUnlock }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.6)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
      <div style={{ background:"#fff", borderRadius:24, padding:36, maxWidth:420, width:"100%", boxShadow:"0 32px 80px rgba(0,0,0,.18)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <RoofLogo size={52} />
          <h2 style={{ margin:"16px 0 8px", fontSize:22, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>5 free questions used</h2>
          <p style={{ margin:0, color:"#64748b", fontSize:14, lineHeight:1.65, fontFamily:"system-ui" }}>
            Unlimited access to COP v26.03 guidance for just <strong style={{ color:"#2563eb" }}>$3.99/month</strong>
          </p>
        </div>
        <div style={{ background:"#eff6ff", borderRadius:14, padding:"16px 18px", marginBottom:20 }}>
          {["Exact fixing patterns from COP tables","Flashing cover — mm by wind zone","Voice input + read-aloud answers","2026 COP updates and new clauses"].map(f => (
            <div key={f} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8, fontSize:13, color:"#1e40af", fontFamily:"system-ui" }}>
              <span style={{ color:"#3b82f6", fontWeight:700 }}>✓</span> {f}
            </div>
          ))}
        </div>
        <a href={STRIPE_LINK} target="_blank" rel="noreferrer" style={{ display:"block", background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:"#fff", borderRadius:14, padding:"14px 20px", textAlign:"center", fontWeight:700, fontSize:15, fontFamily:"system-ui", textDecoration:"none", marginBottom:16 }}>
          Subscribe — $3.99 / month
        </a>
        <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:14 }}>
          <p style={{ fontSize:12, color:"#94a3b8", fontFamily:"system-ui", margin:"0 0 8px" }}>Already subscribed? Enter your unlock code:</p>
          <div style={{ display:"flex", gap:8 }}>
            <input value={code} onChange={e=>{setCode(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&(code.trim().toUpperCase()===UNLOCK_CODE?onUnlock():setErr("Invalid code."))}
              placeholder="Unlock code" style={{ flex:1, border:"1.5px solid #e2e8f0", borderRadius:10, padding:"9px 12px", fontSize:13, fontFamily:"system-ui", outline:"none", color:"#0f172a" }}/>
            <button onClick={()=>code.trim().toUpperCase()===UNLOCK_CODE?onUnlock():setErr("Invalid code.")}
              style={{ background:"#1e40af", border:"none", color:"#fff", borderRadius:10, padding:"9px 16px", cursor:"pointer", fontFamily:"system-ui", fontSize:13, fontWeight:600 }}>Unlock</button>
          </div>
          {err && <p style={{ color:"#ef4444", fontSize:12, fontFamily:"system-ui", marginTop:6 }}>{err}</p>}
        </div>
        <button onClick={onClose} style={{ display:"block", width:"100%", marginTop:12, background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontFamily:"system-ui", fontSize:12 }}>Close</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function RoofCodeNZ() {
  const [view, setView] = useState("chat"); // chat | saved | resources | about | settings
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState([{ id: 1, title: "New Chat", messages: [], createdAt: new Date() }]);
  const [activeChatId, setActiveChatId] = useState(1);
  const [savedChats, setSavedChats] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [qCount, setQCount] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false); // hands-free voice mode
  const [voiceStatus, setVoiceStatus] = useState("idle"); // idle | listening | thinking | speaking

  const canAsk = isPaid || qCount < FREE_LIMIT;
  const remaining = Math.max(0, FREE_LIMIT - qCount);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const voiceModeRef = useRef(false);
  voiceModeRef.current = voiceMode;

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!(SR && window.speechSynthesis));
    return () => { recognitionRef.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (!isPaid && qCount === FREE_LIMIT && messages.length > 0 && !loading) {
      setTimeout(() => setShowPaywall(true), 900);
    }
  }, [qCount, isPaid, messages.length, loading]);

  const updateChat = (id, newMessages, title) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, messages: newMessages, title: title || c.title } : c));
  };

  const newChat = () => {
    const id = Date.now();
    setChats(prev => [{ id, title:"New Chat", messages:[], createdAt:new Date() }, ...prev]);
    setActiveChatId(id);
    setView("chat");
    setSidebarOpen(window.innerWidth > 768);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    setChats(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (remaining.length === 0) {
        const newId = Date.now();
        setActiveChatId(newId);
        return [{ id:newId, title:"New Chat", messages:[], createdAt:new Date() }];
      }
      if (activeChatId === id) setActiveChatId(remaining[0].id);
      return remaining;
    });
  };

  const saveChat = (chat) => {
    setSavedChats(prev => prev.find(c => c.id === chat.id) ? prev : [...prev, chat]);
  };

  const speakText = useCallback((text, onDone) => {
    if (!window.speechSynthesis) { if(onDone) onDone(); return; }
    window.speechSynthesis.cancel();
    const clean = text.replace(/https?:\/\/\S+/g,"").replace(/[*_#`|=]/g,"").replace(/\n{2,}/g,". ").replace(/\n/g," ").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "en-NZ"; utt.rate = 0.95;
    utt.onstart = () => { setSpeaking(true); setVoiceStatus("speaking"); };
    utt.onend = () => { setSpeaking(false); setVoiceStatus("idle"); if(onDone) onDone(); };
    utt.onerror = () => { setSpeaking(false); setVoiceStatus("idle"); if(onDone) onDone(); };
    setTimeout(() => window.speechSynthesis.speak(utt), 80);
  }, []);

  const stopSpeaking = () => { window.speechSynthesis?.cancel(); setSpeaking(false); setVoiceStatus("idle"); };

  // Hands-free: start listening after speaking finishes
  const startVoiceListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !voiceModeRef.current) return;
    const rec = new SR();
    rec.lang = "en-NZ"; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => { setListening(true); setVoiceStatus("listening"); };
    rec.onresult = (e) => {
      let interim="", final="";
      for (let i=e.resultIndex;i<e.results.length;i++) {
        if(e.results[i].isFinal) final+=e.results[i][0].transcript;
        else interim+=e.results[i][0].transcript;
      }
      setInterimText(interim);
      if (final) {
        setInterimText("");
        setInput(final.trim());
        // Auto-send in voice mode
        setTimeout(() => {
          setInput("");
          askVoice(final.trim());
        }, 300);
      }
    };
    rec.onerror = (e) => { if(e.error!=="aborted") setError("Mic: "+e.error); setListening(false); setVoiceStatus("idle"); setInterimText(""); };
    rec.onend = () => { setListening(false); setInterimText(""); if(voiceModeRef.current && voiceStatus!=="thinking" && voiceStatus!=="speaking") setVoiceStatus("idle"); };
    recognitionRef.current = rec;
    try { rec.start(); } catch(err) { setError("Mic error: "+err.message); }
  }, []);

  const askVoice = useCallback(async (text) => {
    if (!text || !canAsk) { if(!canAsk) setShowPaywall(true); return; }
    setVoiceStatus("thinking");
    setLoading(true);
    setQCount(c => c + 1);
    // Get current messages from ref to avoid stale closure
    setChats(prevChats => {
      const chat = prevChats.find(c => c.id === activeChatId) || prevChats[0];
      const msgs = chat?.messages || [];
      const newMessages = [...msgs, { role:"user", content:text }];
      const updated = prevChats.map(c => c.id === activeChatId ? { ...c, messages:newMessages, title:msgs.length===0?text.slice(0,40):c.title } : c);

      fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ messages: newMessages.map(m=>({role:m.role,content:m.content})) }),
      }).then(r=>r.json()).then(data => {
        if (data.error) throw new Error(data.error);
        const answer = data.reply || "No answer.";
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages:[...newMessages,{role:"assistant",content:answer}] } : c));
        setLoading(false);
        // Speak answer then listen again if still in voice mode
        speakText(answer, () => { if(voiceModeRef.current) startVoiceListening(); });
      }).catch(e => {
        setError("Error: "+e.message);
        setLoading(false);
        setVoiceStatus("idle");
        setQCount(c => Math.max(0,c-1));
      });

      return updated;
    });
  }, [canAsk, activeChatId, speakText, startVoiceListening]);

  const ask = useCallback(async (q) => {
    const text = (q || input).trim();
    if (!text || loading) return;
    if (!canAsk) { setShowPaywall(true); return; }
    stopSpeaking();
    setError("");
    const userMsg = { role:"user", content:text };
    const newMessages = [...messages, userMsg];
    updateChat(activeChatId, newMessages, messages.length === 0 ? text.slice(0,40) : undefined);
    setInput(""); setInterimText("");
    setLoading(true);
    setQCount(c => c + 1);
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ messages: newMessages.map(m=>({role:m.role,content:m.content})) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `API error ${res.status}`);
      const answer = data.reply || "No answer returned.";
      const finalMessages = [...newMessages, { role:"assistant", content:answer }];
      updateChat(activeChatId, finalMessages);
      if (voiceEnabled) speakText(answer);
    } catch(e) {
      setError("Error: " + (e.message||"Something went wrong."));
      setQCount(c => Math.max(0, c-1));
    } finally { setLoading(false); }
  }, [input, messages, loading, canAsk, activeChatId, voiceEnabled, speakText]);

  // Toggle hands-free voice mode
  const toggleVoiceMode = () => {
    if (voiceMode) {
      setVoiceMode(false);
      setVoiceStatus("idle");
      recognitionRef.current?.stop();
      stopSpeaking();
    } else {
      if (!canAsk) { setShowPaywall(true); return; }
      setVoiceMode(true);
      setVoiceStatus("listening");
      setTimeout(() => startVoiceListening(), 300);
    }
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopSpeaking();
    const rec = new SR();
    rec.lang = "en-NZ"; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let interim="", final="";
      for (let i=e.resultIndex;i<e.results.length;i++) {
        if(e.results[i].isFinal) final+=e.results[i][0].transcript;
        else interim+=e.results[i][0].transcript;
      }
      if(final){setInput(p=>(p+" "+final).trim());setInterimText("");}
      else setInterimText(interim);
    };
    rec.onerror=(e)=>{if(e.error!=="aborted")setError("Mic: "+e.error);setListening(false);setInterimText("");};
    rec.onend=()=>{setListening(false);setInterimText("");};
    recognitionRef.current=rec;
    try{rec.start();}catch(err){setError("Mic error: "+err.message);}
  };
  const stopListening=()=>{recognitionRef.current?.stop();setListening(false);setInterimText("");};

  const isMobile = () => window.innerWidth <= 768;

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div style={{
      width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0,
      background:"#f8faff", borderRight:"1px solid #e2e8f0",
      display:"flex", flexDirection:"column",
      transition:"width .25s ease, min-width .25s ease",
      overflow:"hidden", position:"relative", zIndex:20,
      height:"100%",
    }}>
      <div style={{ padding:"20px 16px 12px", flexShrink:0 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <RoofLogo size={36} />
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui", letterSpacing:"-.01em" }}>roof code nz</div>
            <div style={{ fontSize:10, color:"#94a3b8", fontFamily:"system-ui", letterSpacing:".04em" }}>COP v26.03</div>
          </div>
        </div>

        {/* New Chat */}
        <button onClick={newChat} style={{
          width:"100%", display:"flex", alignItems:"center", gap:10,
          background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:"#fff",
          border:"none", borderRadius:12, padding:"11px 16px", cursor:"pointer",
          fontFamily:"'DM Sans',system-ui", fontSize:14, fontWeight:600, marginBottom:8,
        }}>
          <Icon name="plus" size={16} color="#fff"/> New Chat
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding:"0 10px", flex:1, overflowY:"auto" }}>
        {[
          { id:"chat", icon:"chat", label:"Chats" },
          { id:"saved", icon:"bookmark", label:"Saved" },
          { id:"resources", icon:"book", label:"Resources" },
          { id:"about", icon:"info", label:"About Roof Code NZ" },
          { id:"settings", icon:"settings", label:"Settings" },
        ].map(item => (
          <button key={item.id} onClick={()=>{setView(item.id);if(isMobile())setSidebarOpen(false);}}
            style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              background: view===item.id ? "#eff6ff" : "transparent",
              color: view===item.id ? "#2563eb" : "#64748b",
              border:"none", borderRadius:10, padding:"10px 12px", cursor:"pointer",
              fontFamily:"system-ui", fontSize:13, fontWeight: view===item.id ? 600 : 400,
              marginBottom:2, textAlign:"left", transition:"all .15s",
            }}>
            <Icon name={item.icon} size={17} color={view===item.id?"#2563eb":"#94a3b8"}/> {item.label}
          </button>
        ))}

        {/* Recent chats */}
        {view==="chat" && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase", padding:"0 4px 8px", fontFamily:"system-ui" }}>Recent</div>
            {chats.map(chat => (
              <div key={chat.id} onClick={()=>{setActiveChatId(chat.id);setView("chat");if(isMobile())setSidebarOpen(false);}}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  background: activeChatId===chat.id ? "#eff6ff" : "transparent",
                  borderRadius:8, padding:"8px 10px", cursor:"pointer", marginBottom:2,
                  border: activeChatId===chat.id ? "1px solid #bfdbfe" : "1px solid transparent",
                  transition:"all .1s",
                }}>
                <div style={{ fontSize:12, color: activeChatId===chat.id?"#1d4ed8":"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, fontFamily:"system-ui" }}>
                  {chat.title}
                </div>
                <div style={{ display:"flex", gap:4, flexShrink:0, marginLeft:6 }}>
                  <button onClick={e=>{e.stopPropagation();saveChat(chat);}} title="Save"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:"2px", borderRadius:4, display:"flex" }}>
                    <Icon name="bookmark" size={13} color="#94a3b8"/>
                  </button>
                  <button onClick={e=>deleteChat(chat.id,e)} title="Delete"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:"2px", borderRadius:4, display:"flex" }}>
                    <Icon name="trash" size={13} color="#94a3b8"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom promo card */}
      <div style={{ padding:"12px 14px 20px", flexShrink:0 }}>
        <div style={{ background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)", borderRadius:14, padding:"14px 16px", color:"#fff" }}>
          <div style={{ fontSize:12, fontWeight:700, fontFamily:"'DM Sans',system-ui", marginBottom:4 }}>Your guide to roofing compliance in New Zealand.</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:"system-ui", lineHeight:1.5 }}>Built right. Roof tight. Code right.</div>
        </div>
      </div>
    </div>
  );

  // ─── Chat view ─────────────────────────────────────────────────────────────
  const ChatView = () => (
    <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Chat header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", gap:12, background:"#fff", flexShrink:0 }}>
        <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:4, borderRadius:8, display:"flex" }}>
          <Icon name="menu" size={20} color="#64748b"/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Roof Code NZ Assistant</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }}/>
            <span style={{ fontSize:12, color:"#64748b", fontFamily:"system-ui" }}>Online</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {!isPaid && (
            <button onClick={()=>setShowPaywall(true)} style={{ background: remaining<=1?"#fef2f2":"#eff6ff", border:`1px solid ${remaining<=1?"#fecaca":"#bfdbfe"}`, color:remaining<=1?"#ef4444":"#2563eb", borderRadius:20, padding:"4px 12px", cursor:"pointer", fontFamily:"system-ui", fontSize:12, fontWeight:500 }}>
              {remaining} free left
            </button>
          )}
          {isPaid && <span style={{ fontSize:12, color:"#16a34a", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:20, padding:"4px 10px", fontFamily:"system-ui" }}>✓ Pro</span>}
          <button onClick={voiceSupported ? toggleVoiceMode : ()=>setError("Voice requires Chrome or Safari on your deployed site.")}
            title="Hands-free voice mode"
            style={{ background: voiceMode?"#eff6ff":voiceSupported?"none":"rgba(0,0,0,.03)", border:`1px solid ${voiceMode?"#bfdbfe":voiceSupported?"#e2e8f0":"#e2e8f0"}`, color:voiceMode?"#2563eb":voiceSupported?"#475569":"#94a3b8", borderRadius:8, padding:"6px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:"system-ui", fontWeight:voiceMode?600:500 }}>
            🎙 <span>{voiceMode ? "Voice On" : "Voice Mode"}</span>
          </button>
          <button onClick={()=>{setVoiceEnabled(v=>!v);if(speaking)stopSpeaking();}} style={{ background:"none", border:`1px solid ${voiceEnabled?"#bfdbfe":"#e2e8f0"}`, color:voiceEnabled?"#2563eb":"#94a3b8", borderRadius:8, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:13, fontFamily:"system-ui" }}>
            {voiceEnabled?"🔊":"🔇"}
          </button>
          {speaking && <button onClick={stopSpeaking} style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#ef4444", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontFamily:"system-ui", fontSize:12 }}>■ Stop</button>}
        </div>
      </div>

      {/* ── Voice Mode Overlay ── */}
      {voiceMode && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.92)", backdropFilter:"blur(8px)", zIndex:150, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:32 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#60a5fa", fontFamily:"system-ui", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>Voice Mode Active</div>
            <div style={{ fontSize:22, fontWeight:700, color:"#f1f5f9", fontFamily:"'DM Sans',system-ui" }}>
              {voiceStatus==="listening" && "Listening…"}
              {voiceStatus==="thinking" && "Thinking…"}
              {voiceStatus==="speaking" && "Speaking…"}
              {voiceStatus==="idle" && "Ready"}
            </div>
          </div>

          {/* Big pulsing mic */}
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {/* Ripple rings */}
            {voiceStatus==="listening" && <>
              <div style={{ position:"absolute", width:160, height:160, borderRadius:"50%", border:"2px solid rgba(59,130,246,.3)", animation:"vmRipple 1.5s ease-out infinite" }}/>
              <div style={{ position:"absolute", width:130, height:130, borderRadius:"50%", border:"2px solid rgba(59,130,246,.4)", animation:"vmRipple 1.5s ease-out .4s infinite" }}/>
            </>}
            {voiceStatus==="speaking" && <>
              <div style={{ position:"absolute", width:160, height:160, borderRadius:"50%", border:"2px solid rgba(34,197,94,.3)", animation:"vmRipple 1s ease-out infinite" }}/>
              <div style={{ position:"absolute", width:130, height:130, borderRadius:"50%", border:"2px solid rgba(34,197,94,.4)", animation:"vmRipple 1s ease-out .3s infinite" }}/>
            </>}

            <div style={{
              width:100, height:100, borderRadius:"50%",
              background: voiceStatus==="listening" ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                        : voiceStatus==="speaking" ? "linear-gradient(135deg,#22c55e,#16a34a)"
                        : voiceStatus==="thinking" ? "linear-gradient(135deg,#f59e0b,#d97706)"
                        : "linear-gradient(135deg,#334155,#1e293b)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow: voiceStatus==="listening" ? "0 0 40px rgba(59,130,246,.5)"
                       : voiceStatus==="speaking" ? "0 0 40px rgba(34,197,94,.5)"
                       : voiceStatus==="thinking" ? "0 0 40px rgba(245,158,11,.4)"
                       : "0 8px 32px rgba(0,0,0,.4)",
              cursor:"pointer", transition:"all .3s",
            }} onClick={()=>{ if(voiceStatus==="speaking") stopSpeaking(); }}>
              <span style={{ fontSize:40 }}>
                {voiceStatus==="listening" && "🎙"}
                {voiceStatus==="speaking" && "🔊"}
                {voiceStatus==="thinking" && "⏳"}
                {voiceStatus==="idle" && "🎙"}
              </span>
            </div>
          </div>

          {/* Interim transcript */}
          {interimText && (
            <div style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.1)", borderRadius:14, padding:"12px 20px", maxWidth:480, textAlign:"center", color:"#cbd5e1", fontFamily:"system-ui", fontSize:15, fontStyle:"italic" }}>
              "{interimText}…"
            </div>
          )}

          <div style={{ fontSize:13, color:"#475569", fontFamily:"system-ui", textAlign:"center", lineHeight:1.8 }}>
            {voiceStatus==="listening" && "Speak your question — I'll answer automatically"}
            {voiceStatus==="thinking" && "Getting your answer…"}
            {voiceStatus==="speaking" && "Tap the button to stop · I'll listen again after"}
            {voiceStatus==="idle" && "Starting…"}
          </div>

          <button onClick={toggleVoiceMode} style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", color:"#f87171", borderRadius:12, padding:"12px 28px", cursor:"pointer", fontFamily:"system-ui", fontSize:14, fontWeight:600 }}>
            Exit Voice Mode
          </button>

          <style>{`
            @keyframes vmRipple{0%{transform:scale(.8);opacity:1}100%{transform:scale(1.4);opacity:0}}
          `}</style>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <RoofLogo size={64} />
            <h2 style={{ margin:"20px 0 8px", fontSize:20, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Roof Code NZ Assistant</h2>
            <p style={{ color:"#64748b", fontSize:14, fontFamily:"system-ui", marginBottom:4 }}>Here to help with your roofing questions.</p>
            <p style={{ color:"#94a3b8", fontSize:13, fontFamily:"system-ui", marginBottom:32 }}>
              {remaining} free question{remaining!==1?"s":""} · then $3.99/month
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={()=>ask(q)} style={{
                  background:"#fff", border:"1.5px solid #e2e8f0", color:"#475569",
                  borderRadius:20, padding:"8px 16px", cursor:"pointer",
                  fontFamily:"system-ui", fontSize:13, transition:"all .15s",
                  boxShadow:"0 1px 3px rgba(0,0,0,.05)",
                }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", marginBottom:20, gap:12, alignItems:"flex-start" }}>
            {msg.role==="assistant" && (
              <div style={{ flexShrink:0, marginTop:2 }}><RoofLogo size={34}/></div>
            )}
            <div style={{ maxWidth:"75%" }}>
              <div style={{
                background: msg.role==="user" ? "linear-gradient(135deg,#3b82f6,#1d4ed8)" : "#fff",
                border: msg.role==="user" ? "none" : "1px solid #e2e8f0",
                borderRadius: msg.role==="user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                padding:"13px 17px", fontSize:14, lineHeight:1.7,
                color: msg.role==="user" ? "#fff" : "#1e293b",
                whiteSpace:"pre-wrap", fontFamily:"system-ui",
                boxShadow: msg.role==="user" ? "0 4px 14px rgba(59,130,246,.3)" : "0 1px 4px rgba(0,0,0,.06)",
              }}>
                {msg.content}
              </div>
              {msg.role==="assistant" && (
                <div style={{ display:"flex", gap:8, marginTop:6, paddingLeft:2 }}>
                  <span style={{ fontSize:11, color:"#94a3b8", fontFamily:"system-ui" }}>
                    {new Date().toLocaleTimeString("en-NZ",{hour:"2-digit",minute:"2-digit"})}
                  </span>
                  {voiceSupported && (
                    <button onClick={()=>speakText(msg.content)} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:11, fontFamily:"system-ui", padding:0 }}>
                      🔊 replay
                    </button>
                  )}
                </div>
              )}
              {msg.role==="user" && (
                <div style={{ textAlign:"right", fontSize:11, color:"#94a3b8", marginTop:4, fontFamily:"system-ui" }}>
                  {new Date().toLocaleTimeString("en-NZ",{hour:"2-digit",minute:"2-digit"})} ✓✓
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"flex-start" }}>
            <RoofLogo size={34}/>
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"4px 18px 18px 18px", padding:"13px 17px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
              <LoadingDots/>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:"11px 15px", color:"#dc2626", fontSize:13, fontFamily:"system-ui", marginBottom:14 }}>
            {error}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:"12px 20px 16px", background:"#fff", borderTop:"1px solid #e2e8f0", flexShrink:0 }}>
        {interimText && (
          <div style={{ marginBottom:8, padding:"6px 14px", background:"#f1f5f9", borderRadius:8, fontSize:13, color:"#64748b", fontStyle:"italic", fontFamily:"system-ui" }}>
            {interimText}…
          </div>
        )}
        {!isPaid && remaining===0 && (
          <div style={{ marginBottom:10, textAlign:"center" }}>
            <button onClick={()=>setShowPaywall(true)} style={{ background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:"#fff", border:"none", borderRadius:12, padding:"11px 24px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"system-ui" }}>
              Subscribe $3.99/month to continue →
            </button>
          </div>
        )}
        <div style={{
          display:"flex", gap:10, alignItems:"flex-end",
          background:"#f8fafc", border:"1.5px solid #e2e8f0",
          borderRadius:16, padding:"10px 12px",
          boxShadow:"0 1px 4px rgba(0,0,0,.04)",
          opacity:!canAsk?.45:1, pointerEvents:!canAsk?"none":"auto",
        }}>
          <button onClick={()=>{}} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:"4px", display:"flex", borderRadius:8 }}>
            <Icon name="external" size={18} color="#94a3b8"/>
          </button>
          {voiceSupported && (
            <button onClick={listening?stopListening:startListening} style={{
              width:36, height:36, borderRadius:10, border:"none", flexShrink:0,
              background: listening?"#3b82f6":"transparent",
              color: listening?"#fff":"#94a3b8",
              display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
              animation: listening?"rcPulse 1.5s ease-in-out infinite":"none",
              transition:"all .2s",
            }}>
              <Icon name="mic" size={18} color={listening?"#fff":"#94a3b8"}/>
            </button>
          )}
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))ask();}}
            placeholder={listening?"Listening…":"Type your question…"}
            rows={1} style={{
              flex:1, background:"transparent", border:"none", outline:"none",
              color:"#1e293b", fontSize:14, lineHeight:1.5, resize:"none",
              fontFamily:"system-ui", caretColor:"#3b82f6",
            }}/>
          <button onClick={()=>ask()} disabled={loading||!input.trim()} style={{
            width:38, height:38, borderRadius:10, border:"none", flexShrink:0,
            background: loading||!input.trim()?"#e2e8f0":"linear-gradient(135deg,#3b82f6,#1d4ed8)",
            color: loading||!input.trim()?"#94a3b8":"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor: loading||!input.trim()?"not-allowed":"pointer", transition:"all .2s",
          }}>
            <Icon name="send" size={16} color={loading||!input.trim()?"#94a3b8":"#fff"}/>
          </button>
        </div>
        <p style={{ textAlign:"center", fontSize:11, color:"#cbd5e1", marginTop:8, fontFamily:"system-ui" }}>
          Roof Code NZ is independent and not affiliated with MBIE, NZMRM or the NZ Government. General guidance only — always verify against current COP and manufacturer specs.
        </p>
      </div>
    </div>
  );

  // ─── Saved view ────────────────────────────────────────────────────────────
  const SavedView = () => (
    <div style={{ flex:1, padding:24, overflowY:"auto" }}>
      <h2 style={{ fontSize:20, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui", margin:"0 0 20px" }}>Saved Conversations</h2>
      {savedChats.length===0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8", fontFamily:"system-ui" }}>
          <Icon name="bookmark" size={40} color="#e2e8f0"/>
          <p style={{ marginTop:12 }}>No saved conversations yet.<br/>Bookmark chats from the sidebar.</p>
        </div>
      ) : savedChats.map(chat => (
        <div key={chat.id} onClick={()=>{setActiveChatId(chat.id);setView("chat");}}
          style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px", marginBottom:12, cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ fontWeight:600, color:"#0f172a", fontFamily:"'DM Sans',system-ui", marginBottom:4 }}>{chat.title}</div>
          <div style={{ fontSize:12, color:"#94a3b8", fontFamily:"system-ui" }}>{chat.messages.length} messages</div>
        </div>
      ))}
    </div>
  );

  // ─── Resources view ────────────────────────────────────────────────────────
  const ResourcesView = () => (
    <div style={{ flex:1, padding:24, overflowY:"auto" }}>
      <h2 style={{ fontSize:20, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui", margin:"0 0 6px" }}>Resources</h2>
      <p style={{ color:"#64748b", fontSize:14, fontFamily:"system-ui", marginBottom:24 }}>Official NZ roofing references and tools</p>
      <div style={{ display:"grid", gap:12 }}>
        {RESOURCES.map(r => (
          <a key={r.title} href={r.url} target="_blank" rel="noreferrer"
            style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px", textDecoration:"none", display:"flex", alignItems:"center", gap:14, boxShadow:"0 1px 4px rgba(0,0,0,.05)", transition:"all .15s" }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{r.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, color:"#0f172a", fontFamily:"'DM Sans',system-ui", fontSize:14, marginBottom:2 }}>{r.title}</div>
              <div style={{ color:"#64748b", fontSize:12, fontFamily:"system-ui" }}>{r.desc}</div>
            </div>
            <Icon name="external" size={16} color="#94a3b8"/>
          </a>
        ))}
      </div>
    </div>
  );

  // ─── About view ───────────────────────────────────────────────────────────
  const AboutView = () => (
    <div style={{ flex:1, padding:24, overflowY:"auto" }}>
      <div style={{ maxWidth:560 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
          <RoofLogo size={52}/> 
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Roof Code NZ</h1>
            <div style={{ color:"#64748b", fontSize:13, fontFamily:"system-ui" }}>v26.03 · March 2026</div>
          </div>
        </div>
        {[
          { title:"What is Roof Code NZ?", body:"A practical AI assistant for New Zealand roofers, LBPs, contractors and estimators. It answers technical roofing questions with precise data from the NZ Metal Roof and Wall Cladding Code of Practice v26.03 (March 2026)." },
          { title:"What can it help with?", body:"Fixing patterns and wind zone tables · Flashing cover dimensions · Minimum pitch requirements · Thermal expansion guidance · Material and fastener selection · End lap requirements · Ground clearance rules · New v26.03 clauses" },
          { title:"Disclaimer", body:"Roof Code NZ is an independent platform and is not affiliated with, endorsed by, or operated by MBIE, NZMRM, or the New Zealand Government. Roof Code NZ provides general guidance only. Always verify against the current NZMRM COP online, manufacturer specifications, consent drawings, and engineering where required. Not a substitute for a Licensed Building Practitioner, engineer, or BCA decision." },
          { title:"Source", body:"References information sourced from the publicly available NZ Metal Roof and Wall Cladding Code of Practice v26.03, March 2026. © NZ Metal Roofing Manufacturers Inc 2026. Used with attribution for guidance purposes only." },
        ].map(s => (
          <div key={s.title} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px", marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <h3 style={{ margin:"0 0 8px", fontSize:14, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>{s.title}</h3>
            <p style={{ margin:0, color:"#475569", fontSize:13, fontFamily:"system-ui", lineHeight:1.7 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Settings view ─────────────────────────────────────────────────────────
  const SettingsView = () => (
    <div style={{ flex:1, padding:24, overflowY:"auto" }}>
      <h2 style={{ fontSize:20, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui", margin:"0 0 20px" }}>Settings</h2>
      <div style={{ maxWidth:480 }}>
        {/* Subscription */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px", marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:14, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Subscription</h3>
          {isPaid ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:"#22c55e" }}/>
              <span style={{ color:"#16a34a", fontFamily:"system-ui", fontSize:14, fontWeight:600 }}>Active — Pro Plan</span>
            </div>
          ) : (
            <div>
              <p style={{ color:"#64748b", fontSize:13, fontFamily:"system-ui", margin:"0 0 12px" }}>{remaining} free questions remaining</p>
              <button onClick={()=>setShowPaywall(true)} style={{ background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"system-ui" }}>
                Subscribe $3.99/month
              </button>
            </div>
          )}
        </div>

        {/* Voice */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px", marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h3 style={{ margin:"0 0 4px", fontSize:14, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Voice Output</h3>
              <p style={{ margin:0, color:"#64748b", fontSize:12, fontFamily:"system-ui" }}>Read answers aloud (en-NZ)</p>
            </div>
            <button onClick={()=>{setVoiceEnabled(v=>!v);if(speaking)stopSpeaking();}} style={{
              width:48, height:26, borderRadius:13, border:"none", cursor:"pointer",
              background: voiceEnabled?"#3b82f6":"#e2e8f0", position:"relative", transition:"background .2s",
            }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left: voiceEnabled?25:3, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
            </button>
          </div>
        </div>

        {/* Clear history */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
          <h3 style={{ margin:"0 0 8px", fontSize:14, fontWeight:700, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Chat History</h3>
          <button onClick={()=>{setChats([{id:Date.now(),title:"New Chat",messages:[],createdAt:new Date()}]);setActiveChatId(Date.now());setView("chat");}}
            style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:10, padding:"9px 18px", cursor:"pointer", fontFamily:"system-ui", fontSize:13, fontWeight:500 }}>
            Clear all chats
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:"100vh", display:"flex", background:"#f1f5f9", fontFamily:"system-ui", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes rcPulse{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.5)}60%{box-shadow:0 0 0 10px rgba(59,130,246,0)}}
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
        textarea{font-family:system-ui !important}
        a:hover{opacity:.85}
        button:hover{opacity:.9}
      `}</style>

      {showPaywall && <PaywallModal onClose={()=>setShowPaywall(false)} onUnlock={()=>{setIsPaid(true);setShowPaywall(false);}}/>}

      {/* Sidebar */}
      <Sidebar/>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile() && (
        <div onClick={()=>setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.3)", zIndex:10 }}/>
      )}

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#f8fafc", overflow:"hidden" }}>
        {view==="chat" && <ChatView/>}
        {view==="saved" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #e2e8f0", background:"#fff", display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex" }}><Icon name="menu" size={20} color="#64748b"/></button>
              <span style={{ fontWeight:600, fontSize:15, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Saved</span>
            </div>
            <SavedView/>
          </div>
        )}
        {view==="resources" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #e2e8f0", background:"#fff", display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex" }}><Icon name="menu" size={20} color="#64748b"/></button>
              <span style={{ fontWeight:600, fontSize:15, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Resources</span>
            </div>
            <ResourcesView/>
          </div>
        )}
        {view==="about" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #e2e8f0", background:"#fff", display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex" }}><Icon name="menu" size={20} color="#64748b"/></button>
              <span style={{ fontWeight:600, fontSize:15, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>About Roof Code NZ</span>
            </div>
            <AboutView/>
          </div>
        )}
        {view==="settings" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #e2e8f0", background:"#fff", display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex" }}><Icon name="menu" size={20} color="#64748b"/></button>
              <span style={{ fontWeight:600, fontSize:15, color:"#0f172a", fontFamily:"'DM Sans',system-ui" }}>Settings</span>
            </div>
            <SettingsView/>
          </div>
        )}
      </div>
    </div>
  );
}
