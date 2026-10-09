/* سهرة: party games. Host screen + phone controller, synced over Laravel Reverb. */
(()=>{
const CFG=window.SAHRA||{};
let QS=[],DRAW=[],WORDS={};

/* ================= helpers ================= */
const COLORS=["#ff4f6d","#ffcc33","#2ee6a6","#4cc2ff","#b98cff","#ff9a3c","#ff7fd0","#a8e05f"];
const INK=["#ff4f6d","#e0a800","#13b884","#1e9be0","#8f5ae8","#f07b12","#e8489f","#6aab1f"];
const FACES=["🦊","🐸","🐼","🐵","🦁","🐙","🐷","🐨"];
const OPTC=["#ffcc33","#4cc2ff","#2ee6a6","#ff9a3c","#b98cff","#ff7fd0","#a8e05f","#ff8a8a","#7fe0ff","#ffd98a"];
const MAXP=8,T_REVEAL=5200;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clip=(s,n)=>String(s??"").replace(/\s+/g," ").trim().slice(0,n);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const fmt=n=>(n||0).toLocaleString("ar-EG");
function norm(s){
  s=String(s||"").toLowerCase().replace(/[ً-ٰٟـ]/g,"")
   .replace(/[إأآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و").replace(/ئ/g,"ي")
   .replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
  return s.split(/[^\p{L}\p{N}.]+/u).filter(Boolean).map(w=>w.length>3&&w.startsWith("ال")?w.slice(2):w).join("");
}
const blankify=(q,fill)=>esc(q).replace("_____",fill?`<span class="blank filled">${esc(fill)}</span>`:`<span class="blank">&nbsp;</span>`);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const root=document.getElementById("root");
const $=id=>document.getElementById(id);

const QUIP={
  lobby:["يلا ادخلوا… السهرة ما تنتظر أحد","الجوالات طلعت؟ ممتاز، خلّها بيدك","كل واحد يدخل باسمه الحقيقي… على الأقل هذا"],
  menu:["وش نلعب الليلة؟","اختاروا لعبة… وخلّوا الزعل برا"],
  pick:["اختر بحكمة… أو اختر أي شي، كلها غريبة","موضوع الحين بيحدد مين الكذاب الأكبر"],
  lie:["اكذب بثقة، مثل ما تقول «أنا في الطريق» وأنت توك صاحي","كل ما كانت كذبتك أغرب، صدقوها أكثر","لا تكتب الحقيقة… هذي مو جلسة صراحة","الكذبة الحلوة مثل التمرة: صغيرة وتنبلع بسهولة"],
  choose:["وحدة منها حقيقية… والباقي شغل نصّابين","ركّز، أصحابك يبون يضحكون عليك","الحقيقة هنا، بس لابسة شماغ ومتنكرة","لا تصدق أول شي يعجبك… مثل عروض التخفيضات"],
  fooled:["انصاد بنجاح 🎣","يا عيني على الثقة العمياء","صدّقها مثل ما يصدق إعلانات «اربح آيفون»","تصفيق حار للكذاب"],
  truth:["الحقيقة أغرب من الخيال، صح؟","والله ما نكذب عليكم… هذي حقيقة","غريبة؟ ابحثوا عنها، بتنصدمون"],
  notruth:["ولا واحد عرف الحقيقة؟! الحقيقة زعلت وطلعت","كلكم انصدتم… فخورين فيكم"],
  scores:["الترتيب مؤقت… مثل حميتك الغذائية","فيه ناس محتاجين يركزون أكثر"],
  final:["الفبركة الأخيرة! النقاط ×٣… هنا تنقلب الطاولة"],
  draw:["ارسموا! ولا أحد يقول «أنا ما أعرف أرسم»… كلنا ما نعرف","بيكاسو بدأ مثلكم… تقريباً","الرسمة الحلوة مو شرط، المهم تكون مفهومة… أحياناً"],
  dlie:["وش هذي؟! اكتبوا عنوان يقنع الكل","لا تحاول تفهم الرسمة… اخترع لها قصة","الرسام يتفرج عليكم ويضحك 😎"],
  dchoose:["وحدة من هذي هي اللي كان يحاول يرسمها… المسكين","ركّزوا في الخربشة… فيها سر"],
  dtruth:["الرسام يستاهل ميدالية… أو نظارة","شفتوا؟ كانت واضحة… لا ما كانت واضحة"],
};

let ST={nick:"",code:"",voice:true};
try{Object.assign(ST,JSON.parse(localStorage.getItem("fabraka")||"{}"))}catch(e){}
const saveST=()=>{try{localStorage.setItem("fabraka",JSON.stringify(ST))}catch(e){}};
const randCode=()=>Array.from({length:4},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random()*24)]).join("");

/* ================= sound, voice, confetti ================= */
let ac=null;
function initAudio(){try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();ac.resume()}catch(e){}}
function beep(f,d=.12,type="triangle",v=.2,delay=0,f2){if(!ac)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d+.05)}
const sfx={
  join:()=>{beep(520,.1,"square",.08);beep(780,.15,"square",.08,.08)},
  tick:()=>beep(1300,.05,"square",.05),
  lie:()=>{beep(400,.5,"sawtooth",.12,0,120)},
  truth:()=>{[523,659,784,1046,1318].forEach((f,i)=>beep(f,.22,"triangle",.16,i*.08))},
  go:()=>{beep(392,.1,"triangle",.18);beep(523,.1,"triangle",.18,.1);beep(784,.25,"triangle",.18,.2)},
  drum:()=>{for(let i=0;i<10;i++)beep(110+i*6,.06,"triangle",.12,i*.05)},
  win:()=>{[523,523,523,659,784,659,784,1046].forEach((f,i)=>beep(f,.18,"square",.07,i*.13))},
};
let arVoice=null;
function loadVoices(){try{const vs=speechSynthesis.getVoices();arVoice=vs.find(v=>/^ar/i.test(v.lang)&&/SA/i.test(v.lang))||vs.find(v=>/^ar/i.test(v.lang))||null}catch(e){}}
try{loadVoices();speechSynthesis.onvoiceschanged=loadVoices}catch(e){}
function say(text){
  if(!ST.voice||!arVoice)return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/_____/g," فراغ ").replace(/[«»"]/g,""));u.voice=arVoice;u.lang=arVoice.lang;u.rate=1.02;speechSynthesis.speak(u)}catch(e){}
}
const fx=$("fx"),fc=fx.getContext("2d");let parts=[],fxOn=false;
function confetti(n=160){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  fx.width=innerWidth;fx.height=innerHeight;
  for(let i=0;i<n;i++)parts.push({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight*.45,vx:(Math.random()-.5)*16,vy:-Math.random()*16-6,r:Math.random()*6+4,c:pick(COLORS),a:Math.random()*6,va:(Math.random()-.5)*.4,life:160});
  if(!fxOn){fxOn=true;requestAnimationFrame(fxLoop)}
}
function fxLoop(){
  fc.clearRect(0,0,fx.width,fx.height);
  parts=parts.filter(p=>--p.life>0&&p.y<fx.height+20);
  parts.forEach(p=>{p.vy+=.45;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;fc.save();fc.translate(p.x,p.y);fc.rotate(p.a);fc.fillStyle=p.c;fc.fillRect(-p.r,-p.r/2,p.r*2,p.r);fc.restore()});
  if(parts.length)requestAnimationFrame(fxLoop);else{fxOn=false;fc.clearRect(0,0,fx.width,fx.height)}
}

/* ================= drawings: strokes are [{c:0|1|2, w:1|2, p:[x,y,x,y…]}] in 0..1000 ================= */
function strokeColor(c,owner){return c===2?"#ffffff":c===1?INK[Math.max(0,H.order.indexOf(owner))%8]:"#1a1033"}
function paint(cv,strokes,owner,animate,colorFn){
  if(!cv)return;const r=cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
  cv.width=Math.max(10,r.width*dpr);cv.height=Math.max(10,r.height*dpr);
  const x=cv.getContext("2d"),S=cv.width/1000;x.lineCap="round";x.lineJoin="round";
  const col=colorFn||(c=>strokeColor(c,owner));
  const list=Array.isArray(strokes)?strokes:[];
  const total=list.reduce((n,s)=>n+((s.p||[]).length>>1),0)||1;
  const drawUpTo=lim=>{x.fillStyle="#fff";x.fillRect(0,0,cv.width,cv.height);let n=0;
    for(const s of list){const p=s.p||[];if(p.length<2)continue;x.strokeStyle=col(s.c);x.lineWidth=(s.c===2?28:s.w===2?16:7)*S;
      x.beginPath();x.moveTo(p[0]*S,p[1]*S);if(p.length===2)x.lineTo(p[0]*S+.1,p[1]*S);
      for(let i=2;i<p.length;i+=2){if(n++>lim)break;x.lineTo(p[i]*S,p[i+1]*S)}x.stroke();if(n>lim)return}};
  if(!animate||matchMedia("(prefers-reduced-motion: reduce)").matches){drawUpTo(Infinity);return}
  const t0=performance.now(),dur=1800;
  const step=t=>{const k=Math.min(1,(t-t0)/dur);drawUpTo(k*total);if(k<1&&cv.isConnected)requestAnimationFrame(step)};requestAnimationFrame(step);
}
function cleanStrokes(d){
  if(!Array.isArray(d))return[];let pts=0;const out=[];
  for(const s of d.slice(0,400)){if(!s||!Array.isArray(s.p))continue;const p=s.p.slice(0,2000).map(v=>Math.max(0,Math.min(1000,v|0)));
    if(p.length<2)continue;pts+=p.length;if(pts>12000)break;out.push({c:[0,1,2].includes(s.c)?s.c:0,w:s.w===2?2:1,p})}
  return out;
}

/* ================= connection (Laravel Reverb: one presence channel per room) =================
   The big screen is the referee. It sends the full game view as "client-host";
   each phone sends its own small state as "client-p". Drawings go over HTTP. */
let room=null,role=null,myPeer=null,pusher=null;
const listeners=[];let onLost=()=>{};
const notify=()=>listeners.forEach(f=>{try{f()}catch(e){}});
async function api(method,path,body){
  const r=await fetch((CFG.api||"/api")+path,{method,headers:{"Accept":"application/json",...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  if(!r.ok){const e=new Error("http_"+r.status);e.status=r.status;throw e}
  return r.json();
}
function tabUid(){
  let u="";try{u=sessionStorage.getItem("sahra_uid")||""}catch(e){}
  if(!/^[a-z0-9]{6,24}$/.test(u)){u=Math.random().toString(36).slice(2,12).padEnd(8,"0");try{sessionStorage.setItem("sahra_uid",u)}catch(e){}}
  return u;
}
function openChannel(hostToken){return new Promise((res,rej)=>{
  const R=CFG.reverb||{};
  pusher=new Pusher(R.key,{
    wsHost:R.host,wsPort:R.port,wssPort:R.port,forceTLS:!!R.tls,enabledTransports:["ws","wss"],cluster:"mt1",disableStats:true,
    channelAuthorization:{customHandler:({socketId,channelName},cb)=>{
      api("POST","/rooms/auth",{socket_id:socketId,channel_name:channelName,uid:tabUid(),name:ST.nick||"",host_token:hostToken||null})
        .then(d=>cb(null,d)).catch(e=>cb(e,null));
    }},
  });
  const ch=pusher.subscribe("presence-room."+ST.code);
  const t=setTimeout(()=>{rej("timeout")},15000);
  ch.bind("pusher:subscription_succeeded",members=>{clearTimeout(t);res({ch,members})});
  ch.bind("pusher:subscription_error",st=>{clearTimeout(t);rej(st&&st.status===404?"nohost":"auth")});
})}
// Small state objects, sent at most every 120 ms and re-sent every few seconds so late joiners catch up.
function makeSender(ch,event,build){
  let timer=null,last=0;
  const flush=()=>{timer=null;last=Date.now();const d=build();const s=JSON.stringify(d);
    if(s.length>9500)console.warn("sahra: message is large",s.length);try{ch.trigger(event,d)}catch(e){}};
  const send=()=>{if(timer)return;const wait=Math.max(0,120-(Date.now()-last));timer=setTimeout(flush,wait)};
  setInterval(send,3000);
  return send;
}
async function hostRoom(){
  const {code,host_token}=await api("POST","/rooms");
  ST.code=code;
  const {ch,members}=await openChannel(host_token);
  const self={peer:members.me.id,sameTab:true,presence:{}},players=new Map();
  const isPlayer=m=>m&&m.info&&m.info.role==="player";
  members.each(m=>{if(isPlayer(m))players.set(m.id,{peer:m.id,sameTab:false,presence:{}})});
  const send=makeSender(ch,"client-host",()=>({p:self.presence}));
  ch.bind("pusher:member_added",m=>{if(isPlayer(m)&&!players.has(m.id))players.set(m.id,{peer:m.id,sameTab:false,presence:{}});send();notify()});
  ch.bind("pusher:member_removed",m=>{players.delete(m.id);notify()});
  ch.bind("client-p",d=>{if(!d||typeof d.from!=="string"||!d.p||typeof d.p!=="object")return;
    const e=players.get(d.from);if(!e)return;Object.assign(e.presence,d.p);notify()});
  return{
    peers:()=>[self,...players.values()],
    presence:async patch=>{Object.assign(self.presence,patch);send()},
    onPeers:fn=>listeners.push(fn),
  };
}
async function playerRoom(){
  await api("GET","/rooms/"+ST.code).catch(e=>{throw e.status===404?"nohost":"net"});
  const {ch,members}=await openChannel(null);
  const self={peer:members.me.id,sameTab:true,presence:{}};
  const host={peer:null,sameTab:false,presence:null};
  members.each(m=>{if(m.info&&m.info.role==="host")host.peer=m.id});
  let lostTimer=null;
  const send=makeSender(ch,"client-p",()=>({from:self.peer,p:self.presence}));
  ch.bind("client-host",d=>{if(d&&d.p&&typeof d.p==="object"){host.presence=d.p;notify()}});
  ch.bind("pusher:member_added",m=>{if(m.info&&m.info.role==="host"){host.peer=m.id;clearTimeout(lostTimer);lostTimer=null;send()}});
  ch.bind("pusher:member_removed",m=>{if(m.id===host.peer&&!lostTimer)lostTimer=setTimeout(()=>onLost(),8000)});
  pusher.connection.bind("state_change",s=>{if(s.current==="connected")send()});
  return{
    peers:()=>host.presence?[{...host,peer:host.peer||"host"},self]:[self],
    presence:async patch=>{Object.assign(self.presence,patch);send()},
    onPeers:fn=>listeners.push(fn),
  };
}
async function connect(asHost){
  if(typeof Pusher==="undefined")return"تعذّر تحميل مكتبة الاتصال. تأكد من الإنترنت وحدّث الصفحة.";
  if(!CFG.ready)return"السيرفر ما هو جاهز للعب الجماعي بعد (WebSockets مو مفعّلة).";
  try{room=asHost?await hostRoom():await playerRoom();return""}
  catch(e){
    try{pusher&&pusher.disconnect()}catch(_){}
    if(e==="nohost")return"ما لقينا غرفة بهذا الرمز. تأكد من الرمز وأن الشاشة الكبيرة مفتوحة.";
    if(e==="timeout")return"الاتصال تأخر كثير. تأكد من الإنترنت وجرّب مرة ثانية.";
    return"تعذّر الاتصال. جرّب مرة ثانية.";
  }
}
const peers=()=>room?[...room.peers()].filter(p=>p.presence&&p.presence.code===ST.code):[];
const P=p=>p.presence||{};

/* ================= landing ================= */
function landing(msg){
  root.className="wrap narrow";
  root.innerHTML=`
  <div class="col center" style="padding-top:14px"><div class="logo"><span class="nose">🎉</span><b>سهرة</b><small>ألعاب جماعية بالعربي</small></div></div>
  <p class="note center" style="font-size:18px;margin-inline:auto;max-width:40ch">شاشة كبيرة للعرض، وكل واحد يلعب من جواله. للصغار والكبار.</p>
  <div class="card">
    <h2 style="font-size:30px">🎮 ادخل كلاعب</h2>
    <label class="f">اسمك<input type="text" id="nickIn" maxlength="14" value="${esc(ST.nick)}" autocomplete="off" placeholder="مثلاً: أبو فهد"></label>
    <label class="f">رمز الغرفة<input type="text" id="codeIn" maxlength="4" value="" autocomplete="off" placeholder="ABCD"></label>
    <button class="btn coral wide" id="joinBtn">ادخل</button>
    <p class="err" id="msg">${msg?esc(msg):""}</p>
  </div>
  <div class="card">
    <h2 style="font-size:30px">📺 الشاشة الكبيرة</h2>
    <p class="note">افتحها على الكمبيوتر أو التلفزيون، وخلّوا الكل يشوفها.</p>
    <button class="btn wide" id="hostBtn">افتح سهرة جديدة</button>
  </div>`;
  $("hostBtn").onclick=async e=>{initAudio();e.target.disabled=true;e.target.textContent="جاري التجهيز…";
    const err=await connect(true);if(err)return landing(err);saveST();startHost()};
  $("codeIn").oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z]/g,"")};
  $("joinBtn").onclick=async()=>{
    const nk=clip($("nickIn").value,14),cd=$("codeIn").value.toUpperCase(),m=$("msg");
    if(!nk)return m.textContent="اكتب اسمك أولاً.";
    if(cd.length!==4)return m.textContent="الرمز ٤ حروف إنجليزية، تلقاه على الشاشة الكبيرة.";
    ST.nick=nk;ST.code=cd;saveST();
    const jb=$("joinBtn");jb.disabled=true;jb.textContent="جاري الاتصال…";
    const err=await connect(false);if(err)return landing(err);
    startPlayer();
  };
}

/* ================= HOST core ================= */
const H={game:null,ph:"menu",k:0,order:[],names:{},sc:{},lk:{},end:0,total:1,quip:"",lastView:"",lastKey:"",g:{}};
const col=id=>COLORS[Math.max(0,H.order.indexOf(id))%8];
const face=id=>FACES[Math.max(0,H.order.indexOf(id))%8];
const nm=id=>H.names[id]||"لاعب";
const tl=()=>Math.max(0,Math.ceil((H.end-Date.now())/1000));
const setTimer=s=>{H.total=s;H.end=Date.now()+s*1000};
const active=()=>{const here=new Set(peers().map(p=>p.peer));return H.order.filter(id=>here.has(id))};
let actOf=()=>null;
function startHost(){
  role="host";H.quip=pick(QUIP.menu);
  room.presence({role:"host",code:ST.code}).catch(()=>{});
  setInterval(hostTick,250);hostTick();
}
function hostTick(){
  const ps=peers(),now=Date.now();
  ps.forEach(p=>{const pr=P(p);if(pr.role!=="player")return;
    H.names[p.peer]=clip(pr.nm,14)||"لاعب";
    if((H.ph==="menu"||H.ph==="lobby")&&!H.order.includes(p.peer)&&H.order.length<MAXP){H.order.push(p.peer);sfx.join()}});
  if(H.ph==="menu"||H.ph==="lobby"){const here=new Set(ps.map(p=>p.peer));H.order=H.order.filter(id=>here.has(id))}
  actOf=id=>{const p=ps.find(x=>x.peer===id);return p&&P(p).act&&P(p).act.k===H.k?P(p).act:null};
  if(H.game&&H.ph!=="lobby"&&H.ph!=="menu"&&H.ph!=="end")GAMES[H.game].tick(now);
  if(["lie","choose","draw","vote","guess"].includes(H.ph)&&tl()<=5&&tl()>0&&H._lastTl!==tl())sfx.tick();
  H._lastTl=tl();
  publish();renderHost();
}
function publish(){
  const v={role:"host",code:ST.code,game:H.game,ph:H.ph,k:H.k,tl:tl(),order:H.order,nm:{}};
  H.order.forEach(id=>v.nm[id]=nm(id));
  if(H.game&&GAMES[H.game].view)GAMES[H.game].view(v);
  if(["scores","end","reveal","tally","result"].includes(H.ph))v.sc=H.sc;
  const s=JSON.stringify(v);if(s===H.lastView)return;H.lastView=s;
  room.presence(v).catch(()=>{});
}
function goMenu(){H.game=null;H.ph="menu";H.k++;H.quip=pick(QUIP.menu)}
function pickGame(id){H.game=id;H.ph="lobby";H.k++;H.quip=pick(QUIP.lobby)}
function startGame(){H.sc={};H.lk={};H.order.forEach(id=>{H.sc[id]=0;H.lk[id]=0});sfx.go();GAMES[H.game].start()}
function finishGame(){H.ph="end";H.k++;sfx.win();setTimeout(()=>confetti(260),300)}

/* shared host pieces */
const plHTML=(id,cls="",i=0)=>`<div class="pl ${cls}" style="--i:${i}"><div class="av" style="--c:${col(id)}">${face(id)}</div><span>${esc(nm(id))}</span></div>`;
const troupe=(ids,doneSet,artist)=>`<div class="troupe">${ids.map((id,i)=>plHTML(id,id===artist?"art":doneSet?(doneSet.has(id)?"ok":"wait"):"",i)).join("")}</div>`;
function ringHTML(){const t=tl(),c=2*Math.PI*42,off=c*(1-t/Math.max(1,H.total));
  return`<div class="ring ${t<=10?"low":""}" id="ring"><svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="42" fill="none" stroke="#3d2c86" stroke-width="9"/><circle id="ringArc" cx="48" cy="48" r="42" fill="none" stroke="${t<=10?"#ff4f6d":"#ffcc33"}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .25s linear"/></svg><b id="ringT">${t}</b></div>`}
const sayHTML=t=>t?`<div class="host-say"><span class="mic" aria-hidden="true">🎤</span><div class="bubble">${esc(t)}</div></div>`:"";
function boardHTML(){
  const ids=[...H.order].sort((a,b)=>(H.sc[b]||0)-(H.sc[a]||0)),max=Math.max(1,...ids.map(id=>H.sc[id]||0));
  return`<div class="board">${ids.map((id,i)=>`<div class="brow ${i===0&&(H.sc[id]||0)>0?"top":""}" style="--i:${i};--w:${Math.round((H.sc[id]||0)/max*100)}%"><span class="bar"></span><span class="rk">${fmt(i+1)}</span><div class="av sm" style="--c:${col(id)}">${face(id)}</div><span class="nm">${esc(nm(id))}</span><span class="sc">${fmt(H.sc[id])}</span></div>`).join("")}</div>`;
}
function joinPanel(){
  const url=location.host?location.host+location.pathname.replace(/index\.html$/,""):"";
  return`<div class="card center" style="justify-content:center;gap:12px">
    <p class="note" style="font-size:19px">ادخلوا من جوالاتكم على:</p>
    ${url?`<span class="url">${esc(url)}</span>`:""}
    <p class="note" style="font-size:19px">بالرمز:</p>
    <div class="code">${ST.code}</div>
    <div id="dyn" class="still" style="min-height:96px;display:flex;align-items:center;justify-content:center">${rosterHTML()}</div>
  </div>`;
}
const rosterHTML=()=>H.order.length?troupe(H.order):`<p class="note center">ولا أحد دخل للحين… وين الشباب؟</p>`;
function renderHost(){
  const key=[H.game,H.ph,H.k,H.g.rvI].join("|");
  if(key===H.lastKey){
    const r=$("ring");
    if(r){const t=tl(),c=2*Math.PI*42;$("ringT").textContent=t;const arc=$("ringArc");arc.setAttribute("stroke-dashoffset",c*(1-t/Math.max(1,H.total)));arc.setAttribute("stroke",t<=10?"#ff4f6d":"#ffcc33");r.classList.toggle("low",t<=10)}
    const dyn=$("dyn");
    if(dyn){const html=(H.ph==="menu"||H.ph==="lobby")?rosterHTML():H.game&&GAMES[H.game].dyn?GAMES[H.game].dyn():"";
      if(html&&dyn.dataset.h!==html){dyn.dataset.h=html;dyn.innerHTML=html}}
    const sb=$("startBtn");if(sb)sb.disabled=H.order.length<GAMES[H.game].min;
    return;
  }
  H.lastKey=key;root.className="wrap";
  const G=H.game?GAMES[H.game]:null;
  const bar=`<div class="hbar"><span class="mini-logo">${G?G.emoji+" "+G.name:"🎉 سهرة"}</span><div class="row">${G&&G.pill&&!["lobby","end"].includes(H.ph)?G.pill():""}<span class="pill" style="direction:ltr">${ST.code}</span></div></div>`;
  let body="";
  if(H.ph==="menu"){
    body=`<div class="spread">${sayHTML(H.quip)}</div>
    <div class="lobby">
      <div class="col"><div class="games">${Object.values(GAMES).map((g,i)=>`<button class="gcard" data-g="${g.id}" style="--g:${g.color};animation-delay:${i*.1}s"><span class="ge">${g.emoji}</span><h3>${g.name}</h3><p>${esc(g.desc)}</p><div class="tags">${g.tags.map(t=>`<span>${esc(t)}</span>`).join("")}</div></button>`).join("")}</div></div>
      ${joinPanel()}
    </div>`;
  }else if(H.ph==="lobby"){
    const hasVoice="speechSynthesis" in window;
    body=`<div class="lobby">
      <div class="card" style="justify-content:space-between">
        <div class="row"><span style="font-size:70px;line-height:1">${G.emoji}</span><div><h2 style="font-size:52px;color:var(--sun)">${G.name}</h2><p class="note" style="font-size:18px">${esc(G.desc)}</p></div></div>
        <div class="col" style="gap:8px">${G.rules.map(r=>`<p style="font-weight:700;font-size:19px">• ${esc(r)}</p>`).join("")}</div>
        <div class="col">
          <button class="btn coral wide" id="startBtn" ${H.order.length<G.min?"disabled":""}>يلا نبدأ!</button>
          <div class="spread"><button class="btn ghost" id="menuBtn">↩ قائمة الألعاب</button>
          ${hasVoice?`<label class="toggle"><input type="checkbox" id="voiceT" ${ST.voice?"checked":""}> قراءة بصوت</label>`:""}</div>
          <p class="note">من ${fmt(G.min)} إلى ${fmt(MAXP)} لاعبين. تقدر تلعب من نفس الكمبيوتر بفتح الرابط في تبويب ثانٍ.</p>
        </div>
      </div>
      ${joinPanel()}
    </div>`;
  }else if(H.ph==="end"){
    const ids=[...H.order].sort((a,b)=>(H.sc[b]||0)-(H.sc[a]||0)),w=ids[0];
    const fav=[...H.order].sort((a,b)=>(H.lk[b]||0)-(H.lk[a]||0))[0];
    body=`<div class="col center" style="gap:8px"><span class="crown">👑</span><div class="av lg" style="--c:${col(w)}">${face(w)}</div><div class="winner">${esc(nm(w))} ${esc(G.winTitle)}</div>
    ${fav&&H.lk[fav]?`<p class="bubble" style="margin-top:8px">😂 ${esc(G.likeTitle)}: ${esc(nm(fav))} (${fmt(H.lk[fav])} 👍)</p>`:""}</div>
    ${boardHTML()}
    <div class="row" style="justify-content:center"><button class="btn coral" id="againBtn">نفس اللعبة مرة ثانية</button><button class="btn" id="menuBtn">لعبة ثانية</button></div>`;
  }else body=G.render();
  const skip=["pick","lie","choose","scores","draw","ask","vote","guess"].includes(H.ph)&&!(H.game==="sawalif"&&H.ph==="ask")?`<div class="row"><button class="btn ghost" id="skipBtn">تخطَّ الوقت ⏭</button></div>`:"";
  root.innerHTML=bar+body+skip;
  root.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{initAudio();pickGame(b.dataset.g)});
  const sb=$("startBtn");if(sb)sb.onclick=()=>{initAudio();if(H.order.length>=G.min)startGame()};
  const mb=$("menuBtn");if(mb)mb.onclick=goMenu;
  const vt=$("voiceT");if(vt)vt.onchange=()=>{ST.voice=vt.checked;saveST();if(ST.voice)say("أهلاً فيكم في سهرة")};
  const ab=$("againBtn");if(ab)ab.onclick=()=>pickGame(H.game);
  const kb=$("skipBtn");if(kb)kb.onclick=()=>{H.end=0;if(H.g)H.g.forceSkip=true};
  if(G&&G.after)G.after();
}

/* ================= BLUFF ENGINE (shared by فبركة and ارسمها) ================= */
// g.truth, g.alts, g.decoys, g.ex (artist who can't play this item)
function bluffLie(g,secs){g.lies={};g.bad={};g.sug=shuffle(g.decoys).slice(0,2);H.ph="lie";H.k++;setTimer(secs);sfx.go()}
function bluffTickLie(g,now){
  const truths=[g.truth,...(g.alts||[])].map(norm);
  H.order.forEach(id=>{if(id===g.ex)return;const a=actOf(id);if(!a||typeof a.lie!=="string"||(g.lies[id]&&g.lies[id].n===a.n)||g.bad[id]===a.n)return;
    const t=clip(a.lie,40);if(!t)return;
    if(truths.includes(norm(t))){g.bad[id]=a.n;return}
    g.lies[id]={t,n:a.n}});
  const need=active().filter(id=>id!==g.ex);
  return now>H.end||(need.length&&need.every(id=>g.lies[id]));
}
function bluffChoose(g,secs){
  const groups=new Map();
  Object.entries(g.lies).forEach(([id,l])=>{const n=norm(l.t);if(!groups.has(n))groups.set(n,{t:l.t,a:[]});groups.get(n).a.push(id)});
  const decoys=shuffle(g.decoys).filter(d=>!groups.has(norm(d))&&norm(d)!==norm(g.truth));
  H.order.forEach(id=>{if(id!==g.ex&&!g.lies[id]&&decoys.length){const d=decoys.shift();groups.set(norm(d),{t:d,a:[id]})}});
  while(groups.size<3&&decoys.length){const d=decoys.shift();groups.set(norm(d),{t:d,a:[]})}
  g.opts=shuffle([...groups.values(),{t:g.truth,a:[],truth:true}]);
  g.choices={};g.likes={};H.ph="choose";H.k++;setTimer(secs);sfx.go();
}
function bluffTickChoose(g,now){
  H.order.forEach(id=>{if(id===g.ex)return;const a=actOf(id);if(!a)return;
    const own=i=>g.opts[i]&&g.opts[i].a.includes(id);
    if(Number.isInteger(a.ch)&&a.ch>=0&&a.ch<g.opts.length&&!own(a.ch))g.choices[id]=a.ch;
    if(Array.isArray(a.lk))g.likes[id]=a.lk.filter(i=>Number.isInteger(i)&&i>=0&&i<g.opts.length&&!own(i)).slice(0,10)});
  const need=active().filter(id=>id!==g.ex);
  return now>H.end||(need.length&&need.every(id=>g.choices[id]!==undefined));
}
function bluffReveal(g,m,artistPer,truthQuips){
  const steps=[];
  g.opts.forEach((o,i)=>{if(o.truth)return;const f=Object.keys(g.choices).filter(id=>g.choices[id]===i);if(!f.length)return;
    const pts=500*m*f.length;o.a.forEach(id=>H.sc[id]=(H.sc[id]||0)+pts);steps.push({o:i,a:o.a,f,p:pts,q:pick(QUIP.fooled)})});
  const ti=g.opts.findIndex(o=>o.truth),finders=Object.keys(g.choices).filter(id=>g.choices[id]===ti);
  finders.forEach(id=>H.sc[id]=(H.sc[id]||0)+1000*m);
  const ap=artistPer*m*finders.length;if(g.ex&&ap)H.sc[g.ex]=(H.sc[g.ex]||0)+ap;
  Object.entries(g.likes).forEach(([id,arr])=>arr.forEach(i=>{const o=g.opts[i];if(o&&!o.truth)o.a.forEach(a=>{if(a!==id)H.lk[a]=(H.lk[a]||0)+1})}));
  g.rv=[...shuffle(steps),{o:ti,a:[],f:finders,p:1000*m,ap,t:1,q:finders.length?pick(truthQuips||QUIP.truth):pick(QUIP.notruth)}];
  g.rvI=0;g.nextAt=Date.now()+T_REVEAL;H.ph="reveal";H.k++;bluffFx(g);
}
function bluffFx(g){const s=g.rv[g.rvI];if(!s)return;sfx.drum();
  setTimeout(()=>{if(s.t){sfx.truth();if(s.f.length)confetti()}else sfx.lie()},1600);
  setTimeout(()=>say(s.t?"الحقيقة: "+g.opts[s.o].t:"كذبة!"),1700)}
function bluffTickReveal(g,now){if(now<=g.nextAt)return false;g.rvI++;if(g.rvI>=g.rv.length)return true;g.nextAt=now+T_REVEAL;bluffFx(g);return false}
function bluffView(g,v){
  if(H.ph==="lie"){v.sug=g.sug;v.done=Object.keys(g.lies);v.bad=g.bad;v.ex=g.ex||null}
  if(H.ph==="choose"){v.opts=g.opts.map(o=>o.t);v.done=Object.keys(g.choices);v.ex=g.ex||null}
  if(H.ph==="reveal")v.rvI=g.rvI;
}
function bluffRevealHTML(g,stageHTML){
  const s=g.rv[g.rvI],o=g.opts[s.o];
  const fooled=s.f.length?s.f.map((id,i)=>plHTML(id,"",i)).join(""):`<span class="note" style="font-size:20px">ما أحد اختارها!</span>`;
  let who;
  if(s.t)who=s.f.length?`<span>${s.f.map(id=>esc(nm(id))).join("، ")} عرفوها</span><span class="pts">+${fmt(s.p)}</span>${g.ex&&s.ap?`<span>· ${esc(nm(g.ex))} الرسام</span><span class="pts">+${fmt(s.ap)}</span>`:""}`:`<span>ولا أحد عرفها!</span>`;
  else who=o.a.length?`${o.a.map(id=>`<div class="av sm" style="--c:${col(id)}">${face(id)}</div>`).join("")}<span>كذبة ${o.a.map(id=>esc(nm(id))).join(" و")}</span><span class="pts">+${fmt(s.p)}</span>`:`<span>كذبة من عندنا 😏</span>`;
  return stageHTML(s.t)+`<div class="reveal ${g.ex?"tight":""}">
      <div class="answer">${esc(o.t)}</div>
      <div class="fooled">${s.t?(s.f.length?fooled:""):`<span class="note" style="font-size:19px">صدّقها:</span>${fooled}`}</div>
      <div class="stamp ${s.t?"truth":"lie"}">${s.t?"الحقيقة!":"كذبة!"}</div>
      <div class="who">${who}</div>
      <div class="quip">🎤 ${esc(s.q)}</div>
    </div>`;
}
function bluffDyn(g){
  if(H.ph==="lie")return troupe(H.order,new Set(Object.keys(g.lies)),g.ex);
  if(H.ph==="choose")return troupe(H.order,new Set(Object.keys(g.choices)),g.ex);
  return"";
}
const optsHTML=g=>`<div class="opts">${g.opts.map((o,i)=>`<div class="opt" style="--o:${OPTC[i%OPTC.length]};animation-delay:${i*.08}s">${esc(o.t)}</div>`).join("")}</div>`;

/* ================= GAME: فبركة ================= */
const FAB_STEPS=[1,1,1,2,2,2,3];
const FAB={
  id:"fabraka",name:"فبركة",emoji:"🤥",color:"#ffcc33",min:2,
  desc:"حقائق غريبة لدرجة إنها تبدو كذب. اكتب كذبة تخدع أصحابك واكتشف الحقيقة.",
  tags:["٢-٨ لاعبين","كتابة","١٥ دقيقة"],
  rules:["تطلع حقيقة غريبة فيها فراغ","كل واحد يكتب كذبة مقنعة تكمّل الفراغ","تختارون وش الحقيقة بين الأكاذيب","تاخذ نقاط إذا عرفت الحقيقة، أو إذا انخدعوا بكذبتك"],
  winTitle:"أكبر مفبرك!",likeTitle:"أظرف كذّاب",
  used:new Set((()=>{try{return JSON.parse(localStorage.getItem("fabraka_used")||"[]")}catch(e){return[]}})()),
  fresh(){let pool=QS.map((_,i)=>i).filter(i=>!this.used.has(QS[i].id));if(pool.length<10){this.used.clear();pool=QS.map((_,i)=>i)}return shuffle(pool)},
  mark(i){this.used.add(QS[i].id);try{localStorage.setItem("fabraka_used",JSON.stringify([...this.used]))}catch(e){}},
  start(){H.g={step:-1};this.next()},
  m(){return FAB_STEPS[Math.max(0,H.g.step)]||1},
  next(){const g=H.g;g.step++;H.k++;
    if(g.step>=FAB_STEPS.length)return finishGame();
    if(this.m()===3){H.quip=pick(QUIP.final);return this.lie(this.fresh()[0])}
    const act=active();g.picker=act[g.step%Math.max(1,act.length)]||null;g.pick=this.fresh().slice(0,4);
    H.ph="pick";H.quip=pick(QUIP.pick);setTimer(15)},
  lie(qi){const g=H.g,q=QS[qi];this.mark(qi);g.q=qi;g.truth=q.a;g.alts=q.alt;g.decoys=q.d;g.ex=null;
    bluffLie(g,60);if(this.m()!==3)H.quip=pick(QUIP.lie);say(q.q)},
  tick(now){const g=H.g;
    if(H.ph==="pick"){const a=g.picker&&actOf(g.picker);
      if(a&&Number.isInteger(a.pick)&&g.pick[a.pick]!==undefined)this.lie(g.pick[a.pick]);
      else if(!g.picker||!active().includes(g.picker)||now>H.end||g.forceSkip){g.forceSkip=false;this.lie(pick(g.pick))}}
    else if(H.ph==="lie"){if(bluffTickLie(g,now)){bluffChoose(g,30);H.quip=pick(QUIP.choose);say("وين الحقيقة؟")}}
    else if(H.ph==="choose"){if(bluffTickChoose(g,now))bluffReveal(g,this.m(),0)}
    else if(H.ph==="reveal"){if(bluffTickReveal(g,now)){H.ph="scores";H.k++;setTimer(8);H.quip=pick(QUIP.scores)}}
    else if(H.ph==="scores"){if(now>H.end)this.next()}},
  view(v){const g=H.g;v.m=this.m();
    if(H.ph==="pick"){v.picker=g.picker;v.cats=g.pick.map(i=>QS[i].c)}
    if(H.ph==="lie"||H.ph==="choose"){v.q=QS[g.q].q}
    bluffView(g,v)},
  pill(){const m=this.m();return`<span class="pill ${m===3?"x":""}">${m===3?"الفبركة الأخيرة":m===2?"الجولة الثانية":"الجولة الأولى"}${m>1?` · ×${fmt(m)}`:""}</span>`},
  ticket(fill){const q=QS[H.g.q];return`<div class="ticket" ${fill!==undefined?'style="animation:none"':""}><span class="cat">${esc(q.c)}</span><p class="qtext">${blankify(q.q,fill?q.a:"")}</p></div>`},
  render(){const g=H.g;
    if(H.ph==="pick")return`<div class="spread"><div class="row"><div class="av lg" style="--c:${col(g.picker)}">${face(g.picker)}</div><h2 style="font-size:clamp(30px,4vw,46px)">${esc(nm(g.picker))} يختار الموضوع…</h2></div>${ringHTML()}</div>
      ${sayHTML(H.quip)}<div class="cats">${g.pick.map((i,j)=>`<div class="catcard" style="--o:${OPTC[j]};animation-delay:${j*.1}s">${esc(QS[i].c)}</div>`).join("")}</div>`;
    if(H.ph==="lie")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>${this.ticket()}
      <h3 style="font-size:26px;text-align:center">✍️ اكتبوا كذبة مقنعة من جوالاتكم</h3><div id="dyn" class="still">${bluffDyn(g)}</div>`;
    if(H.ph==="choose")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>${this.ticket()}${optsHTML(g)}<div id="dyn" class="still">${bluffDyn(g)}</div>`;
    if(H.ph==="reveal")return bluffRevealHTML(g,t=>this.ticket(t));
    if(H.ph==="scores")return`<div class="spread"><h2 style="font-size:46px">🏁 الترتيب</h2>${ringHTML()}</div>${sayHTML(H.quip)}${boardHTML()}`;
    return"";},
  dyn(){return bluffDyn(H.g)},
};

/* ================= GAME: ارسمها ================= */
const DRW={
  id:"arsimha",name:"ارسمها",emoji:"🎨",color:"#4cc2ff",min:3,
  desc:"كل واحد يرسم شي غريب بجواله، والباقين يخترعون له عنوان يخدع. مناسبة للصغار والكبار.",
  tags:["٣-٨ لاعبين","رسم","مناسبة للأطفال"],
  rules:["كل لاعب ياخذ موضوع سري ويرسمه بجواله","تطلع الرسمة على الشاشة، والباقين يكتبون عنوان كذب لها","تختارون العنوان الحقيقي","نقاط إذا عرفت، وإذا انخدعوا بعنوانك، والرسام ياخذ نقاط إذا عرفوا رسمته"],
  winTitle:"أعظم فنان!",likeTitle:"أظرف عنوان",
  used:new Set(),
  start(){H.g={round:0,rounds:2};this.newRound()},
  newRound(){const g=H.g;g.round++;
    let pool=DRAW.filter(p=>!this.used.has(p));if(pool.length<H.order.length+6){this.used.clear();pool=[...DRAW]}
    pool=shuffle(pool);g.prompts={};active().forEach(id=>{const p=pool.pop();g.prompts[id]=p;this.used.add(p)});
    g.drawings={};g.queue=[];H.ph="draw";H.k++;setTimer(90);H.quip=pick(QUIP.draw);sfx.go();say("ارسموا!")},
  nextDrawing(){const g=H.g;
    if(!g.queue.length){H.ph="scores";H.k++;setTimer(8);H.quip=pick(QUIP.scores);return}
    g.ex=g.queue.shift();g.truth=g.prompts[g.ex];g.alts=[];
    const others=Object.values(g.prompts).filter(p=>p!==g.truth);
    g.decoys=shuffle([...others,...shuffle(DRAW.filter(p=>!Object.values(g.prompts).includes(p))).slice(0,4)]).slice(0,6);
    bluffLie(g,45);H.quip=pick(QUIP.dlie)},
  tick(now){const g=H.g;
    if(H.ph==="draw"){
      H.order.forEach(id=>{const a=actOf(id);if(a&&typeof a.draw==="string"&&!g.drawings[id])fetchDrawing(g,id,a.draw)});
      const need=active().filter(id=>g.prompts[id]);
      if(now>H.end||g.forceSkip||(need.length&&need.every(id=>g.drawings[id]))){g.forceSkip=false;
        g.queue=shuffle(Object.keys(g.drawings).filter(id=>g.prompts[id]));
        if(!g.queue.length){H.ph="scores";H.k++;setTimer(5);H.quip="ولا أحد رسم شي؟! 😅";return}
        this.nextDrawing()}}
    else if(H.ph==="lie"){if(bluffTickLie(g,now)){bluffChoose(g,25);H.quip=pick(QUIP.dchoose)}}
    else if(H.ph==="choose"){if(bluffTickChoose(g,now))bluffReveal(g,g.round,500,QUIP.dtruth)}
    else if(H.ph==="reveal"){if(bluffTickReveal(g,now))this.nextDrawing()}
    else if(H.ph==="scores"){if(now>H.end){if(g.round<g.rounds)this.newRound();else finishGame()}}},
  view(v){const g=H.g;v.m=g.round;
    if(H.ph==="draw"){v.prompts=g.prompts;v.done=Object.keys(g.drawings)}
    if(H.ph==="lie"||H.ph==="choose")v.q="وش اللي رسمه "+nm(g.ex)+"؟";
    bluffView(g,v)},
  pill(){const g=H.g;return`<span class="pill ${g.round===2?"x":""}">الجولة ${g.round===2?"الثانية · ×٢":"الأولى"}</span>`},
  frame(small){const g=H.g;return`<div class="col center"><div class="frame ${small?"small":""}"><canvas id="art"></canvas></div><div class="artist"><div class="av sm" style="--c:${col(g.ex)}">${face(g.ex)}</div>رسمة ${esc(nm(g.ex))}</div></div>`},
  render(){const g=H.g;
    if(H.ph==="draw")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="col center" style="gap:18px"><span style="font-size:110px;line-height:1">🖍️</span><h2 style="font-size:clamp(34px,5vw,56px)">كل واحد يرسم موضوعه السري بجواله</h2><p class="note" style="font-size:19px">لا تخلون أحد يشوف جوالكم!</p></div>
      <div id="dyn" class="still">${troupe(H.order,new Set(Object.keys(g.drawings)))}</div>`;
    if(H.ph==="lie")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="easel">${this.frame()}<div class="col" style="justify-content:center;gap:18px"><h2 style="font-size:clamp(30px,4vw,48px)">وش هذي الرسمة؟ 🤔</h2><p style="font-weight:700;font-size:20px">اكتبوا عنوان يقنع الكل إنه هو اللي كان يرسمه ${esc(nm(g.ex))}.</p><div id="dyn" class="still">${bluffDyn(g)}</div></div></div>`;
    if(H.ph==="choose")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="easel">${this.frame()}<div class="col" style="justify-content:center"><h2 style="font-size:34px">وش كان يرسم ${esc(nm(g.ex))}؟</h2>${optsHTML(g)}<div id="dyn" class="still">${bluffDyn(g)}</div></div></div>`;
    if(H.ph==="reveal")return bluffRevealHTML(g,()=>this.frame(true));
    if(H.ph==="scores")return`<div class="spread"><h2 style="font-size:46px">🏁 الترتيب</h2>${ringHTML()}</div>${sayHTML(H.quip)}${boardHTML()}`;
    return""},
  after(){const g=H.g;if(["lie","choose","reveal"].includes(H.ph)&&$("art"))paint($("art"),g.drawings[g.ex],g.ex,H.ph==="lie")},
  dyn(){const g=H.g;return H.ph==="draw"?troupe(H.order,new Set(Object.keys(g.drawings))):bluffDyn(g)},
};

/* ================= GAME: برا السالفة ================= */
const SAL={
  id:"sawalif",name:"برا السالفة",emoji:"🕵️",color:"#ff7fd0",min:3,
  desc:"الكل يعرف السالفة إلا واحد. اسألوا بعض وحاولوا تكشفون مين برا السالفة.",
  tags:["٣-٨ لاعبين","كلام وأسئلة","مناسبة للأطفال"],
  rules:["الكل يشوف السالفة بجواله… إلا واحد يطلع له «أنت برا السالفة»","كل واحد يسأل اللي بعده سؤال عن السالفة بدون ما يفضحها","بعدها تصوّتون مين برا السالفة","إذا انكشف، يحاول يخمّن السالفة عشان ياخذ نقاط"],
  winTitle:"أذكى محقق!",likeTitle:"",
  start(){H.g={round:0,rounds:Math.min(5,Math.max(3,active().length))};this.next()},
  next(){const g=H.g;g.round++;H.k++;
    if(g.round>g.rounds)return finishGame();
    const act=active();g.picker=act[(g.round-1)%Math.max(1,act.length)]||null;
    g.cats=shuffle(Object.keys(WORDS)).slice(0,4);H.ph="pick";setTimer(15);H.quip="مين بيختار الموضوع؟ 🤔"},
  begin(cat){const g=H.g,act=active();g.cat=cat;g.word=pick(WORDS[cat]);g.out=pick(act);g.players=[...act];
    const ring=shuffle(act);g.pairs=[];for(let r=0;r<2;r++)ring.forEach((id,i)=>g.pairs.push([id,ring[(i+1)%ring.length]]));
    g.rvI=0;g.pairAt=Date.now()+20000;g.ready={};H.ph="ask";H.k++;setTimer(180);sfx.go();
    H.quip=pick(["كل واحد يسأل سؤال ذكي… لا تفضحون السالفة!","اللي برا السالفة الحين يعرق 😅","ركّزوا في الأجوبة… فيه واحد يألّف"]);say("السالفة جاهزة. يلا نبدأ الأسئلة")},
  tick(now){const g=H.g;
    if(H.ph==="pick"){const a=g.picker&&actOf(g.picker);
      if(a&&Number.isInteger(a.pick)&&g.cats[a.pick])this.begin(g.cats[a.pick]);
      else if(!g.picker||!active().includes(g.picker)||now>H.end||g.forceSkip){g.forceSkip=false;this.begin(pick(g.cats))}}
    else if(H.ph==="ask"){
      g.players.forEach(id=>{const a=actOf(id);if(a&&a.ready)g.ready[id]=1});
      const act=active().filter(id=>g.players.includes(id));
      if(now>g.pairAt&&g.rvI<g.pairs.length-1){g.rvI++;g.pairAt=now+20000;sfx.join()}
      const readyN=act.filter(id=>g.ready[id]).length;
      if(now>H.end||g.forceSkip||(act.length&&readyN>act.length/2)){g.forceSkip=false;this.vote()}}
    else if(H.ph==="vote"){
      g.players.forEach(id=>{const a=actOf(id);if(a&&typeof a.vote==="string"&&a.vote!==id&&g.players.includes(a.vote))g.votes[id]=a.vote});
      const act=active().filter(id=>g.players.includes(id));
      if(now>H.end||(act.length&&act.every(id=>g.votes[id])))this.tally()}
    else if(H.ph==="tally"){if(now>H.end){g.caught?this.guess():this.result()}}
    else if(H.ph==="guess"){const a=actOf(g.out);
      if(a&&typeof a.guess==="string"&&g.opts.includes(a.guess)){g.guessed=a.guess;this.result()}
      else if(now>H.end||!active().includes(g.out)){this.result()}}
    else if(H.ph==="result"){if(now>H.end){H.ph="scores";H.k++;setTimer(7);H.quip=pick(QUIP.scores)}}
    else if(H.ph==="scores"){if(now>H.end)this.next()}},
  vote(){const g=H.g;g.votes={};H.ph="vote";H.k++;setTimer(40);sfx.go();H.quip="مين برا السالفة؟ صوّتوا من جوالاتكم 🗳️";say("وقت التصويت. مين برا السالفة؟")},
  tally(){const g=H.g,count={};Object.values(g.votes).forEach(t=>count[t]=(count[t]||0)+1);g.count=count;
    const max=Math.max(0,...Object.values(count)),tops=Object.keys(count).filter(id=>count[id]===max);
    g.caught=max>0&&tops.length===1&&tops[0]===g.out;
    Object.entries(g.votes).forEach(([id,t])=>{if(t===g.out&&id!==g.out)H.sc[id]=(H.sc[id]||0)+500});
    if(!g.caught)H.sc[g.out]=(H.sc[g.out]||0)+1500;
    H.ph="tally";H.k++;setTimer(7);sfx.drum();setTimeout(()=>g.caught?sfx.truth():sfx.lie(),1600);
    if(g.caught)setTimeout(()=>confetti(),1700)},
  guess(){const g=H.g;g.opts=shuffle([g.word,...shuffle(WORDS[g.cat].filter(w=>w!==g.word)).slice(0,7)]);g.guessed=null;
    H.ph="guess";H.k++;setTimer(25);H.quip="فرصته الأخيرة… إذا عرف السالفة ياخذ نقاط!"},
  result(){const g=H.g;g.right=g.guessed===g.word;if(g.right)H.sc[g.out]=(H.sc[g.out]||0)+1000;
    H.ph="result";H.k++;setTimer(8);sfx.truth();say("السالفة كانت: "+g.word)},
  view(v){const g=H.g;v.m=g.round;
    if(H.ph==="pick"){v.picker=g.picker;v.cats=g.cats}
    if(["ask","vote"].includes(H.ph)){v.cat=g.cat;v.w=g.word;v.out=g.out;v.pl=g.players}
    if(H.ph==="ask"){v.ready=Object.keys(g.ready)}
    if(H.ph==="vote"){v.done=Object.keys(g.votes)}
    if(H.ph==="guess"){v.out=g.out;v.opts=g.opts;v.cat=g.cat}
    if(["tally","result","scores"].includes(H.ph))v.sc=H.sc},
  pill(){const g=H.g;return`<span class="pill">الجولة ${fmt(g.round)} من ${fmt(g.rounds)}</span>`},
  render(){const g=H.g;
    if(H.ph==="pick")return`<div class="spread"><div class="row"><div class="av lg" style="--c:${col(g.picker)}">${face(g.picker)}</div><h2 style="font-size:clamp(30px,4vw,46px)">${esc(nm(g.picker))} يختار الموضوع…</h2></div>${ringHTML()}</div>
      <div class="cats">${g.cats.map((c,j)=>`<div class="catcard" style="--o:${OPTC[j]};animation-delay:${j*.1}s">${esc(c)}</div>`).join("")}</div>`;
    if(H.ph==="ask"){const [a,b]=g.pairs[g.rvI]||[];
      return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="ticket" style="text-align:center"><span class="cat">الموضوع: ${esc(g.cat)}</span><p class="qtext">الكل يعرف السالفة… إلا واحد 🕵️</p></div>
      <div class="pair" id="pairBox"><div class="pl" style="width:auto"><div class="av lg" style="--c:${col(a)}">${face(a)}</div><span style="font-size:24px">${esc(nm(a))}</span></div>
        <span class="arrow">يسأل ←</span>
        <div class="pl" style="width:auto"><div class="av lg" style="--c:${col(b)}">${face(b)}</div><span style="font-size:24px">${esc(nm(b))}</span></div></div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="nextQ">السؤال التالي ⏭</button><button class="btn coral" id="toVote">خلّصنا، يلا نصوّت 🗳️</button></div>
      <div id="dyn" class="still">${this.dyn()}</div>`}
    if(H.ph==="vote")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">🗳️</span><h2 style="font-size:clamp(34px,5vw,56px)">مين برا السالفة؟</h2></div>
      <div id="dyn" class="still">${this.dyn()}</div>`;
    if(H.ph==="tally"){
      const tro=g.players.map((id,i)=>`<div class="pl" style="--i:${i};position:relative"><div class="av lg" style="--c:${col(id)}">${face(id)}${g.count[id]?`<span class="vote-n">${fmt(g.count[id])}</span>`:""}</div><span>${esc(nm(id))}</span></div>`).join("");
      return`<h2 style="font-size:40px;text-align:center">نتيجة التصويت</h2><div class="troupe">${tro}</div>
      <div class="reveal"><div class="row" style="justify-content:center;animation:fade .3s 1.2s both"><div class="av lg" style="--c:${col(g.out)}">${face(g.out)}</div><span style="font-family:var(--display);font-size:clamp(30px,4vw,48px)">${esc(nm(g.out))} كان برا السالفة!</span></div>
      <div class="stamp ${g.caught?"truth":"lie"}">${g.caught?"انكشف!":"هرب منكم!"}</div>
      <div class="who">${g.caught?"<span>اللي صوّتوا صح</span><span class=\"pts\">+٥٠٠</span>":`<span>${esc(nm(g.out))}</span><span class="pts">+١٬٥٠٠</span>`}</div></div>`}
    if(H.ph==="guess")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="row" style="justify-content:center"><div class="av lg" style="--c:${col(g.out)}">${face(g.out)}</div><h2 style="font-size:clamp(30px,4vw,46px)">${esc(nm(g.out))} يحاول يخمّن السالفة…</h2></div>
      <div class="opts">${g.opts.map((o,i)=>`<div class="opt" style="--o:${OPTC[i%OPTC.length]};animation-delay:${i*.06}s">${esc(o)}</div>`).join("")}</div>`;
    if(H.ph==="result")return`<div class="reveal" style="padding-top:20px"><p class="note" style="font-size:22px">السالفة كانت:</p><div class="answer">${esc(g.word)}</div>
      ${g.caught?`<div class="stamp ${g.right?"truth":"lie"}">${g.right?"عرفها!":"ما عرفها"}</div><div class="who"><div class="av sm" style="--c:${col(g.out)}">${face(g.out)}</div><span>${esc(nm(g.out))} ${g.guessed?`خمّن «${esc(g.guessed)}»`:"ما لحق يخمّن"}</span>${g.right?'<span class="pts">+١٬٠٠٠</span>':""}</div>`:`<div class="quip" style="animation-delay:.6s">🎤 ${esc(nm(g.out))} ضحك عليكم كلكم 😂</div>`}</div>`;
    if(H.ph==="scores")return`<div class="spread"><h2 style="font-size:46px">🏁 الترتيب</h2>${ringHTML()}</div>${sayHTML(H.quip)}${boardHTML()}`;
    return""},
  after(){const g=H.g;
    const n=$("nextQ");if(n)n.onclick=()=>{if(g.rvI<g.pairs.length-1){g.rvI++;g.pairAt=Date.now()+20000;sfx.join()}};
    const t=$("toVote");if(t)t.onclick=()=>{g.forceSkip=true}},
  dyn(){const g=H.g;
    if(H.ph==="ask"){const r=new Set(Object.keys(g.ready));return troupe(g.players,r)+`<p class="note center">اللي ضغطوا «جاهز للتصويت»: ${fmt(r.size)} من ${fmt(g.players.length)}</p>`}
    if(H.ph==="vote")return troupe(g.players,new Set(Object.keys(g.votes)));
    return""},
};
const GAMES={fabraka:FAB,arsimha:DRW,sawalif:SAL};
addEventListener("resize",()=>{if(role==="host"&&H.game==="arsimha"&&$("art"))paint($("art"),H.g.drawings[H.g.ex],H.g.ex,false)});

/* ================= PLAYER ================= */
const ME={n:0,myLie:"",lastKey:"",ch:null,lk:new Set()};
function startPlayer(){
  role="player";
  room.presence({role:"player",code:ST.code,nm:ST.nick,act:null}).catch(()=>{});
  room.onPeers(()=>renderPlayer());
  onLost=()=>{ME.lost=true;root.innerHTML=`<div class="emoji">🔌</div><p class="big">انقطع الاتصال</p><p class="note center">الشاشة الكبيرة انقفلت أو النت فصل.</p><button class="btn wide" id="rj">ادخل من جديد</button>`;$("rj").onclick=()=>location.reload()};
  setTimeout(renderPlayer,50);setInterval(renderPlayer,500);
}
function sendAct(a){room.presence({act:a}).catch(()=>{})}
function hostView(){
  const hs=peers().filter(p=>P(p).role==="host");
  if(!myPeer){const me=peers().find(p=>p.sameTab);if(me)myPeer=me.peer}
  return hs.length?P(hs[0]):null;
}
function renderPlayer(){
  if(ME.lost)return;
  const v=hostView();root.className="wrap narrow";
  const idx=v&&Array.isArray(v.order)?v.order.indexOf(myPeer):-1;
  const c=idx>=0?COLORS[idx%8]:"#a99bd9",f=idx>=0?FACES[idx%8]:"🙂";
  const head=`<div class="phead"><span class="me"><div class="av sm" style="--c:${c}">${f}</div><span>${esc(ST.nick)}</span></span><span class="pill" style="direction:ltr">${esc(ST.code)}</span></div>`;
  if(!v){if(ME.lastKey!=="none"){ME.lastKey="none";root.innerHTML=head+`<div class="emoji">📡</div><p class="big">بانتظار الشاشة الكبيرة…</p>`}return}
  const key=[v.game,v.ph,v.k,v.rvI,idx>=0].join("|");
  if(key===ME.lastKey){
    if(v.ph==="lie"&&$("perr")){const bad=v.bad&&v.bad[myPeer]===ME.n&&ME.n>0;const done=(v.done||[]).includes(myPeer);
      if(bad&&!ME.shownBad){ME.shownBad=true;showLieForm(v,"😅 هذي الإجابة الصحيحة نفسها! اكتب كذبة بدالها.")}
      else if(done&&!ME.shownDone){ME.shownDone=true;$("lieArea").innerHTML=`<div class="emoji">🤫</div><p class="big">تم!</p><p class="note center">كذبتك: «${esc(ME.myLie)}»<br>خلك طبيعي… لا تفضح نفسك.</p>`}}
    if(v.ph==="draw"&&(v.done||[]).includes(myPeer)&&!ME.drawShown){ME.drawShown=true;$("drawArea").innerHTML=`<div class="emoji">🖼️</div><p class="big">وصلت رسمتك!</p><p class="note center">انتظر الباقين يخلّصون.</p>`}
    const t=$("ptl");if(t)t.textContent=v.tl;
    return;
  }
  ME.lastKey=key;
  if(idx<0){root.innerHTML=head+((v.ph==="menu"||v.ph==="lobby")?`<div class="emoji">⏳</div><p class="big">لحظة…</p>`:`<div class="emoji">🍿</div><p class="big">اللعبة بدأت</p><p class="note center">تابع من الشاشة، وتدخل في اللعبة الجاية.</p>`);return}
  const tline=`<p class="note">⏱ باقي <b id="ptl">${v.tl}</b> ثانية</p>`;
  if(v.ph==="menu"){root.innerHTML=head+`<div class="emoji">${f}</div><p class="big">أنت داخل!</p><p class="note center">المضيف يختار اللعبة الحين… 👀</p>`;return}
  if(v.ph==="lobby"){const G=GAMES[v.game];root.innerHTML=head+`<div class="emoji">${G?G.emoji:f}</div><p class="big">${G?G.name:""}</p><p class="note center">${G?esc(G.desc):""}<br>اللعبة بتبدأ قريب، ناظر الشاشة.</p>`;return}
  if(v.ph==="pick"){
    if(v.picker===myPeer){root.innerHTML=head+`<h2 style="font-size:30px">اختر الموضوع 👇</h2>${tline}<div class="col">${(v.cats||[]).map((cc,i)=>`<button class="pbtn" data-i="${i}" style="--o:${OPTC[i]}">${esc(cc)}</button>`).join("")}</div>`;
      root.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{sendAct({k:v.k,pick:+b.dataset.i});root.querySelectorAll("[data-i]").forEach(x=>x.disabled=true)})}
    else root.innerHTML=head+`<div class="emoji">🤔</div><p class="big">${esc(v.nm?.[v.picker]||"لاعب")} يختار الموضوع…</p>`;
    return;
  }

  if(v.game==="sawalif"&&["ask","vote","tally","guess","result"].includes(v.ph)){salPlayer(v,head,f);return}
  if(v.ph==="draw"){
    ME.drawShown=false;const prompt=v.prompts&&v.prompts[myPeer];
    if(!prompt){root.innerHTML=head+`<div class="emoji">🍿</div><p class="big">تفرّج على الباقين</p>`;return}
    root.innerHTML=head+`<div class="drawwhat">ارسم: <b>${esc(prompt)}</b></div>${tline}<div id="drawArea"></div>`;
    drawPad($("drawArea"),v,idx);return;
  }
  const qhtml=v.game==="fabraka"?blankify(v.q||""):esc(v.q||"");
  if(v.ph==="lie"){ME.shownBad=false;ME.shownDone=false;ME.myLie="";
    if(v.ex===myPeer){root.innerHTML=head+`<div class="emoji">😎</div><p class="big">هذي رسمتك!</p><p class="note center">اجلس وتفرّج على الأكاذيب.</p>`;return}
    root.innerHTML=head+`<p class="pq">${qhtml}</p>${tline}<div id="lieArea"></div><p class="err" id="perr"></p>`;
    showLieForm(v,"");return}
  if(v.ph==="choose"){
    if(v.ex===myPeer){root.innerHTML=head+`<div class="emoji">🙈</div><p class="big">لا تساعدهم!</p><p class="note center">خلّهم يخمّنون وش رسمت.</p>`;return}
    ME.ch=null;ME.lk=new Set();const mine=norm(ME.myLie);
    root.innerHTML=head+`<p class="pq">${qhtml}</p>${tline}<h3 style="font-size:24px">وين الحقيقة؟ 🔍</h3><div class="col" id="chs">${(v.opts||[]).map((o,i)=>{const own=mine&&norm(o)===mine;return`<button class="pbtn" data-i="${i}" style="--o:${OPTC[i%OPTC.length]}" ${own?"disabled":""}>${esc(o)}${own?" (كذبتك 😏)":""}</button>`}).join("")}</div>`;
    root.querySelectorAll("#chs [data-i]").forEach(b=>b.onclick=()=>{ME.ch=+b.dataset.i;sendAct({k:v.k,ch:ME.ch,lk:[...ME.lk]});showLikes(v,mine)});
    return;
  }
  if(v.ph==="reveal"||v.ph==="scores"){
    root.innerHTML=head+`<div class="emoji">👀</div><p class="big">ناظر الشاشة!</p><p class="note center">نقاطك: <b>${fmt(v.sc?.[myPeer])}</b></p>`;return}
  if(v.ph==="end"){
    const ids=[...(v.order||[])].sort((a,b)=>(v.sc?.[b]||0)-(v.sc?.[a]||0)),r=ids.indexOf(myPeer)+1,last=r===ids.length&&ids.length>1;
    root.innerHTML=head+`<div class="emoji">${r===1?"👑":last?"🤡":"🎉"}</div><p class="big">${r===1?"أنت البطل!":last?"المرة الجاية لك 💪":"المركز "+fmt(r)}</p><p class="note center">نقاطك: <b>${fmt(v.sc?.[myPeer])}</b></p>`;return}
}

function salPlayer(v,head,f){
  const isOut=v.out===myPeer;
  if(v.ph==="ask"){
    if(!(v.pl||[]).includes(myPeer)){root.innerHTML=head+`<div class="emoji">🍿</div><p class="big">تفرّج هالجولة</p>`;return}
    root.innerHTML=head+`<p class="note center">الموضوع: <b>${esc(v.cat)}</b></p>
      <div class="secret ${isOut?"out":""}" id="sec">${isOut?`<span style="font-size:60px">🕵️</span><b>أنت برا السالفة!</b><span>اسمع زين وحاول تعرف السالفة بدون ما تنكشف</span>`:`<span>السالفة:</span><b>${esc(v.w)}</b><span>اسأل وجاوب بدون ما تفضحها</span>`}</div>
      <p class="note center">اضغط على البطاقة عشان تخفيها عن اللي جنبك 👆</p>
      <button class="btn mint wide" id="rdy">جاهز للتصويت 🗳️</button>`;
    const sec=$("sec"),inner=sec.innerHTML;let hid=false;
    sec.onclick=()=>{hid=!hid;sec.innerHTML=hid?`<b style="font-size:30px">🙈 مخفية</b><span>اضغط عشان تشوف</span>`:inner};
    $("rdy").onclick=()=>{sendAct({k:v.k,ready:true});$("rdy").disabled=true;$("rdy").textContent="تمام، ننتظر الباقين…"};
    return}
  if(v.ph==="vote"){
    if(!(v.pl||[]).includes(myPeer)){root.innerHTML=head+`<div class="emoji">🍿</div><p class="big">تفرّج هالجولة</p>`;return}
    const others=(v.pl||[]).filter(id=>id!==myPeer);
    root.innerHTML=head+`<h2 style="font-size:30px">مين برا السالفة؟ 🕵️</h2><p class="note">⏱ باقي <b id="ptl">${v.tl}</b> ثانية</p>
      <div class="col" id="vts">${others.map((id,i)=>{const j=(v.order||[]).indexOf(id);return`<button class="pbtn" data-v="${esc(id)}" style="--o:${COLORS[j%8]}">${FACES[j%8]} ${esc(v.nm?.[id]||"لاعب")}</button>`}).join("")}</div>`;
    root.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{sendAct({k:v.k,vote:b.dataset.v});$("vts").innerHTML=`<div class="emoji">🗳️</div><p class="big" style="font-size:28px">صوّتت على ${esc(v.nm?.[b.dataset.v]||"")}</p><p class="note center">${isOut?"خلك طبيعي 😏":"ننتظر الباقين…"}</p>`});
    return}
  if(v.ph==="guess"){
    if(!isOut){root.innerHTML=head+`<div class="emoji">🤞</div><p class="big">${esc(v.nm?.[v.out]||"")} يحاول يخمّن…</p>`;return}
    root.innerHTML=head+`<h2 style="font-size:28px">انكشفت! 😅 بس تقدر تعوّض</h2><p class="note">الموضوع: <b>${esc(v.cat)}</b> · وش كانت السالفة؟ ⏱ <b id="ptl">${v.tl}</b></p>
      <div class="col">${(v.opts||[]).map((o,i)=>`<button class="pbtn" data-o="${i}" style="--o:${OPTC[i%OPTC.length]}">${esc(o)}</button>`).join("")}</div>`;
    root.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{sendAct({k:v.k,guess:v.opts[+b.dataset.o]});root.querySelectorAll("[data-o]").forEach(x=>x.disabled=true)});
    return}
  root.innerHTML=head+`<div class="emoji">👀</div><p class="big">ناظر الشاشة!</p><p class="note center">نقاطك: <b>${fmt(v.sc?.[myPeer])}</b></p>`;
}
function showLieForm(v,err){
  const a=$("lieArea");if(!a)return;
  a.innerHTML=`<div class="col"><input type="text" id="lieIn" maxlength="40" placeholder="${v.game==="arsimha"?"اكتب عنوان كذب للرسمة…":"اكتب كذبتك هنا…"}" autocomplete="off"><p class="count" id="cnt">0/40</p><button class="btn coral wide" id="lieBtn">أرسل 🤥</button>
  ${(v.sug||[]).length?`<p class="note">ما جاك إلهام؟ خذ وحدة جاهزة:</p><div class="row">${v.sug.map((s,i)=>`<button class="btn ghost" data-s="${i}">${esc(s)}</button>`).join("")}</div>`:""}</div>`;
  $("perr").textContent=err||"";
  const send=t=>{t=clip(t,40);if(!t)return;ME.n++;ME.myLie=t;ME.shownBad=false;sendAct({k:v.k,lie:t,n:ME.n});
    a.innerHTML=`<p class="big">جاري الإرسال…</p>`;$("perr").textContent=""};
  const inp=$("lieIn");
  inp.oninput=()=>$("cnt").textContent=inp.value.length+"/40";
  $("lieBtn").onclick=()=>send(inp.value);
  inp.onkeydown=e=>{if(e.key==="Enter")send(e.target.value)};
  a.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>send(v.sug[+b.dataset.s]));
  setTimeout(()=>inp.focus(),50);
}
function showLikes(v,mine){
  const box=$("chs");
  box.innerHTML=`<div class="emoji" style="font-size:60px">🤞</div><p class="big" style="font-size:26px">اخترت: «${esc(v.opts[ME.ch])}»</p><p class="note">عجبتك وحدة؟ اعطها 👍</p>`+
   v.opts.map((o,i)=>i===ME.ch||(mine&&norm(o)===mine)?"":`<div class="likerow"><span class="txt">${esc(o)}</span><button class="like" data-l="${i}" aria-pressed="false" aria-label="إعجاب">👍</button></div>`).join("");
  box.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{const i=+b.dataset.l;ME.lk.has(i)?ME.lk.delete(i):ME.lk.add(i);b.setAttribute("aria-pressed",ME.lk.has(i));sendAct({k:v.k,ch:ME.ch,lk:[...ME.lk]})});
}
function drawPad(box,v,idx){
  const myInk=INK[idx%8];
  box.innerHTML=`<div class="col"><canvas class="pad" id="pad"></canvas>
    <div class="tools"><div class="row" style="gap:8px">
      <button class="swatch" data-c="0" style="--c:#1a1033" aria-pressed="true" aria-label="أسود"></button>
      <button class="swatch" data-c="1" style="--c:${myInk}" aria-pressed="false" aria-label="لونك"></button>
      <button class="tool" data-w="1" aria-pressed="true" aria-label="قلم رفيع">✏️</button>
      <button class="tool" data-w="2" aria-pressed="false" aria-label="قلم عريض">🖌️</button>
      <button class="tool" data-c="2" aria-pressed="false" aria-label="ممحاة">🧽</button></div>
      <div class="row" style="gap:8px"><button class="tool" id="undo" aria-label="تراجع">↩️</button><button class="tool" id="clr" aria-label="مسح الكل">🗑️</button></div></div>
    <button class="btn mint wide" id="sendDraw">خلصت! أرسل الرسمة 🎨</button></div>`;
  const cv=$("pad"),strokes=[];let cur=null,c=0,w=1;
  const colorFn=k=>k===2?"#ffffff":k===1?myInk:"#1a1033";
  const redraw=()=>paint(cv,strokes,null,false,colorFn);
  setTimeout(redraw,0);
  const pos=e=>{const r=cv.getBoundingClientRect();return[Math.round((e.clientX-r.left)/r.width*1000),Math.round((e.clientY-r.top)/r.height*1000)]};
  cv.onpointerdown=e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);const[x,y]=pos(e);cur={c,w,p:[x,y]};strokes.push(cur);redraw()};
  cv.onpointermove=e=>{if(!cur)return;const[x,y]=pos(e),p=cur.p,lx=p[p.length-2],ly=p[p.length-1];if(Math.hypot(x-lx,y-ly)<5)return;p.push(x,y);
    const ctx=cv.getContext("2d"),S=cv.width/1000;ctx.strokeStyle=colorFn(cur.c);ctx.lineWidth=(cur.c===2?28:cur.w===2?16:7)*S;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(lx*S,ly*S);ctx.lineTo(x*S,y*S);ctx.stroke()};
  cv.onpointerup=cv.onpointercancel=()=>{cur=null};
  box.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{c=+b.dataset.c;box.querySelectorAll("[data-c]").forEach(x=>x.setAttribute("aria-pressed",x===b))});
  box.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{w=+b.dataset.w;if(c===2){c=0;box.querySelector('[data-c="0"]').setAttribute("aria-pressed","true");box.querySelector('[data-c="2"]').setAttribute("aria-pressed","false")}box.querySelectorAll("[data-w]").forEach(x=>x.setAttribute("aria-pressed",x===b))});
  $("undo").onclick=()=>{strokes.pop();redraw()};
  $("clr").onclick=()=>{strokes.length=0;redraw()};
  $("sendDraw").onclick=()=>{if(!strokes.length){$("sendDraw").textContent="ارسم شي أول 😅";return}
    const sb=$("sendDraw");sb.disabled=true;sb.textContent="جاري الإرسال…";
    api("POST","/rooms/"+ST.code+"/drawings",{strokes}).then(r=>sendAct({k:v.k,draw:r.id}))
      .catch(()=>{sb.disabled=false;sb.textContent="ما وصلت، جرّب مرة ثانية 🔁"})};
}

function fetchDrawing(g,id,drawId){
  g.fetching=g.fetching||{};if(g.fetching[id]===drawId)return;g.fetching[id]=drawId;
  api("GET","/drawings/"+encodeURIComponent(drawId)).then(r=>{const s=cleanStrokes(r.strokes);if(s.length&&H.g===g)g.drawings[id]=s})
    .catch(()=>{if(g.fetching)delete g.fetching[id]});
}
async function boot(){
  root.innerHTML=`<div class="emoji" style="margin-top:20vh">🎉</div><p class="big">لحظة…</p>`;
  const fail=(t,d)=>{root.innerHTML=`<div class="emoji" style="margin-top:20vh">😵</div><p class="big">${esc(t)}</p><p class="note center">${esc(d)}</p>`};
  try{const c=await api("GET","/content");QS=c.questions||[];DRAW=c.prompts||[];WORDS=c.words||{}}
  catch(e){return fail("ما قدرنا نحمّل الألعاب",e.status?"خطأ من السيرفر ("+e.status+"). افتح /api/status لمعرفة السبب.":"تأكد من الإنترنت وحدّث الصفحة.")}
  if(!QS.length)return fail("ما فيه أسئلة في قاعدة البيانات","شغّل الأمر: php artisan db:seed --force");
  landing(CFG.ready?"":"تنبيه: WebSockets مو مربوطة بالتطبيق، اللعب الجماعي ما بيشتغل.");
}
boot();
})();
