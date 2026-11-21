/* سهرة: party games. Host screen + phone controller, synced over Laravel Reverb. */
(()=>{
const CFG=window.SAHRA||{};
let QS=[],DRAW=[],WORDS={},TOPICS=[];

/* ================= helpers ================= */
const COLORS=["#ff4f6d","#ffcc33","#2ee6a6","#4cc2ff","#b98cff","#ff9a3c","#ff7fd0","#a8e05f"];
const INK=["#ff4f6d","#e0a800","#13b884","#1e9be0","#8f5ae8","#f07b12","#e8489f","#6aab1f"];
const FACES=["🦊","🐸","🐼","🐵","🦁","🐙","🐷","🐨"];
const OPTC=["#ffcc33","#4cc2ff","#2ee6a6","#ff9a3c","#b98cff","#ff7fd0","#a8e05f","#ff8a8a","#7fe0ff","#ffd98a"];
const MAXP=8,T_REVEAL=5200;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clip=(s,n)=>String(s??"").replace(/\s+/g," ").trim().slice(0,n);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const AV_COUNT=10;
// "p:3" = picture 3, "u:<id>" = uploaded selfie
/* word filter: bad nicknames are refused, bad words in typed answers become ★★★ */
const BW=CFG.badWords||{any:[],whole:[]};
const normT=t=>String(t??"").toLowerCase().replace(/[\u064B-\u065F\u0670\u0640\u200B-\u200F]/g,"").replace(/[أإآٱ]/g,"ا")
  .replace(/[ةىؤئگڤپچ]/g,c=>({"ة":"ه","ى":"ي","ؤ":"و","ئ":"ي","گ":"ك","ڤ":"ف","پ":"ب","چ":"ج"}[c]))
  .replace(/[013457@$!]/g,c=>({"0":"o","1":"i","3":"e","4":"a","5":"s","7":"t","@":"a","$":"s","!":"i"}[c])).replace(/(.)\1{2,}/gu,"$1");
const BW_ANY=(BW.any||[]).map(normT).filter(Boolean),BW_WHOLE=new Set((BW.whole||[]).map(normT));
function hasBad(t){const out=[];let run="";
  for(const tok of normT(t).split(/[^\p{L}]+/u).filter(Boolean)){if([...tok].length===1){run+=tok;continue}if(run.length>1)out.push(run);run="";out.push(tok)}
  if(run.length>1)out.push(run);
  return out.some(k=>BW_ANY.some(w=>k.includes(w))||BW_WHOLE.has(k)||BW_WHOLE.has(k.replace(/^(وال|ال|يا|و)/u,"")))}
const _fc=new Map();
function filterText(t){if(typeof t!=="string"||t.length<2||/^[\w:.\-]{10,}$/.test(t))return t;if(_fc.has(t))return _fc.get(t);
  let r=t.split(/(\s+)/).map(w=>/\S/.test(w)&&hasBad(w)?"★★★":w).join("");if(hasBad(r))r="★★★";
  if(_fc.size>2000)_fc.clear();_fc.set(t,r);return r}
const cleanAct=a=>a==null?a:typeof a==="string"?filterText(a):Array.isArray(a)?a.map(cleanAct):typeof a==="object"?Object.fromEntries(Object.entries(a).map(([k,v])=>[k,cleanAct(v)])):a;
if(CFG.debug)window.__F={hasBad,filterText};
const okAv=a=>typeof a==="string"&&(/^p:([1-9]|10)$/.test(a)||/^u:[0-9A-Za-z]{10,40}$/.test(a));
const avSrc=a=>a.startsWith("p:")?"/img/av/"+a.slice(2)+".svg":(CFG.api||"/api")+"/avatars/"+a.slice(2);
const avImg=(a,fallback)=>okAv(a)?`<img class="avimg" src="${avSrc(a)}" alt="">`:fallback;
const FUN_NAMES=["بطريق مستعجل","قطوة نعسانة","فلافل خارقة","دبدوب زعلان","سمبوسة طايرة","جمل رايق","بطة مهايطة","زرافة فضولية","نملة مجتهدة","ثعلب ذكي","بطيخة سعيدة","أسد مرتاح","كنغر نطاط","بومة سهرانة","موزة مستعجلة","صقر سريع","تمرة لذيذة","ديناصور لطيف","فراولة معصبة","حلزون رياضي"];
const fmt=n=>(n||0).toLocaleString("ar-EG");
function norm(s){
  s=String(s??"").replace(/ی/g,"ي").replace(/ک/g,"ك").replace(/ۀ/g,"ه"); // Persian keyboard letters
  s=String(s||"").toLowerCase().replace(/[ً-ٰٟـ]/g,"")
   .replace(/[إأآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و").replace(/ئ/g,"ي")
   .replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
  return s.split(/[^\p{L}\p{N}.]+/u).filter(Boolean).map(w=>w.length>3&&w.startsWith("ال")?w.slice(2):w).join("");
}
function lev(a,b){let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]}
// true when a typed lie is the real answer or close enough to it (typos, extra/missing letters)
function nearTruth(t,truths){const n=norm(t);if(!n)return false;
  return truths.some(x=>{if(!x)return false;if(n===x)return true;if(/^[0-9.]+$/.test(x)||/^[0-9.]+$/.test(n))return false;
    const L=Math.max(n.length,x.length),S=Math.min(n.length,x.length);
    if(S>=3&&(x.includes(n)||n.includes(x))&&S/L>=.6)return true;
    return L>=5&&lev(n,x)<=(L>=8?Math.floor(L*.2):1)})}
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

let ST={nick:"",code:"",voice:false,vo:true,mus:true,hcode:"",av:"",selfie:""};
try{Object.assign(ST,JSON.parse(localStorage.getItem("fabraka")||"{}"))}catch(e){}
const saveST=()=>{try{localStorage.setItem("fabraka",JSON.stringify(ST))}catch(e){}};
const randCode=()=>Array.from({length:4},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random()*24)]).join("");

/* ================= sound, voice, confetti ================= */
let ac=null;
function initAudio(){try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();ac.resume();loadFx()}catch(e){}}
function beep(f,d=.12,type="triangle",v=.2,delay=0,f2){if(!ac)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d+.05)}
// Recorded sound effects (public/audio/sfx_*.mp3, made by tools/make_sfx.py); the synth beeps are the fallback.
const FX={},FX_KEYS=["whoosh","pop","tada","join","submit","tick","trombone","sparkle","coin","applause","swoosh"];
function loadFx(){if(ac)FX_KEYS.forEach(k=>{if(!(k in FX)){FX[k]=null;loadAudio("sfx_"+k).then(b=>{if(b)FX[k]=b})}})}
function playFx(k,fb,vol=.8,delay=0){if(!ac)return;const b=FX[k];if(!b){fb&&fb();loadFx();return}
  try{const src=ac.createBufferSource(),g=ac.createGain();src.buffer=b;g.gain.value=vol;src.connect(g).connect(ac.destination);src.start(ac.currentTime+delay)}catch(e){}}
const sfx={
  join:()=>playFx("join",()=>{beep(520,.1,"square",.08);beep(780,.15,"square",.08,.08)},.7),
  tick:()=>playFx("tick",()=>beep(1300,.05,"square",.05),.6),
  lie:()=>playFx("trombone",()=>beep(400,.5,"sawtooth",.12,0,120),.75),
  truth:()=>playFx("sparkle",()=>[523,659,784,1046,1318].forEach((f,i)=>beep(f,.22,"triangle",.16,i*.08)),.85),
  submit:()=>playFx("submit",()=>beep(500,.12,"sine",.12,0,900),.7),
  pop:()=>playFx("pop",null,.35),
  tada:()=>playFx("tada",()=>sfx.drum(),.8),
  coin:(d=0)=>playFx("coin",()=>beep(1318,.2,"square",.06,d),.5,d),
  swoosh:()=>playFx("swoosh",null,.5),
  applause:()=>playFx("applause",null,.6),
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
/* ================= category themes: colors + emoji pattern backgrounds ================= */
const THEMES={
  "حيوانات":{e:"🐾",i:["🦁","🐘","🦒","🐧","🐙","🦘"],a:"#2f8f4e",b:"#0d3a1f"},
  "تاريخ غريب":{e:"🏺",i:["🏛️","⚔️","📜","👑","🏺","🛡️"],a:"#a36a2c",b:"#3f230c"},
  "أكل وشرب":{e:"🍕",i:["🍔","🍩","🍉","🌮","🍟","☕"],a:"#e0631c",b:"#6b1804"},
  "جسم الإنسان":{e:"🫀",i:["🧠","🦴","👁️","🫁","🦷","💪"],a:"#d23a68",b:"#520b23"},
  "علوم وفضاء":{e:"🚀",i:["🪐","⭐","🔭","🌙","☄️","🧪"],a:"#3443a8",b:"#060a2a"},
  "دول ومدن":{e:"🌍",i:["🗺️","🏙️","🗼","🕌","🏝️","✈️"],a:"#1592ad",b:"#06303d"},
  "عادات وقوانين":{e:"📜",i:["⚖️","🎎","🧧","🎉","🍜","🌹"],a:"#9b3fb5",b:"#33083f"},
  "كلمات وأصلها":{e:"🔤",i:["✍️","📖","🔤","💬","🖋️","📚"],a:"#5a52e0",b:"#1a1747"},
  "شركات واختراعات":{e:"💡",i:["⚙️","💡","🔧","📱","🤖","🔋"],a:"#14998c",b:"#03302c"},
  "رياضة وألعاب":{e:"⚽",i:["🏀","🎾","🏆","🎮","⛳","🏸"],a:"#22a052",b:"#04290f"},
  "سبيستون":{e:"🪐",i:["🪐","🚀","⭐","📺","🌙","☄️"],a:"#1f8fd6",b:"#071b3d"},
  "أفلام ومسلسلات":{e:"🎬",i:["🎬","🍿","🎥","📽️","🎞️","⭐"],a:"#c4302b",b:"#2a0606"},
  "ديزني":{e:"🏰",i:["🏰","👑","✨","🧚","🪄","🐭"],a:"#7a4fd6",b:"#1c0d45"},
  "أغاني الأفلام":{e:"🎵",i:["🎵","🎤","🎶","🎧","🎼","🎹"],a:"#e0457b",b:"#3a0619"},
  "أكلات":{e:"🍛",i:["🍛","🥙","🍢","🫓","🍮","🥘"],a:"#e0631c",b:"#6b1804"},
  "أماكن":{e:"📍",i:["🏥","🏫","🎡","🏖️","🏕️","🏬"],a:"#1592ad",b:"#06303d"},
  "مهن":{e:"👷",i:["👨‍⚕️","👩‍🏫","👨‍🍳","👮","👨‍🚒","🧑‍✈️"],a:"#c08a12",b:"#3d2104"},
  "أشياء في البيت":{e:"🛋️",i:["🛋️","🛏️","📺","🧹","🪞","🕰️"],a:"#c2286b",b:"#4a0620"},
  "دول":{e:"🌍",i:["🗺️","🏙️","🗼","🕌","🏝️","✈️"],a:"#1592ad",b:"#06303d"},
  "رياضات وألعاب":{e:"⚽",i:["🏀","🎾","🏆","🎮","⛳","🏸"],a:"#22a052",b:"#04290f"},
  "المدرسة":{e:"🎒",i:["📚","✏️","📐","🎒","🧮","🏫"],a:"#2f62e6",b:"#121f4f"},
  "فواكه وخضار":{e:"🍉",i:["🍎","🍌","🥕","🍇","🍊","🥒"],a:"#7bb31a",b:"#1a2e05"},
  "مواصلات":{e:"🚗",i:["🚗","✈️","🚆","🚲","🚢","🚁"],a:"#5b6b82",b:"#0c1324"},
};
function theme(n){return THEMES[n]||{e:"✨",i:["✨","❓","🎲","⭐","💡","🎉"],a:"#5b47b8",b:"#1b1244"}}
function themePattern(t){
  const cells=t.i.map((e,k)=>{const x=(k%3)*80+40,y=Math.floor(k/3)*120+60+(k%2)*28,r=((k*37)%40)-20;
    return`<text x='${x}' y='${y}' font-size='46' text-anchor='middle' dominant-baseline='middle' opacity='.2' transform='rotate(${r} ${x} ${y})'>${e}</text>`}).join("");
  return`url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>${cells}</svg>`)}")`;
}
// Full-screen category background with a soft crossfade.
function setThemeBg(name){
  const el=$("themebg");if(!el)return;name=name||"";
  if(el.dataset.n===name)return;el.dataset.n=name;
  [...el.children].forEach(c=>{c.classList.remove("on");setTimeout(()=>c.remove(),900)});
  if(!name)return;const t=theme(name),layer=document.createElement("div");layer.className="tlayer";
  layer.style.backgroundImage=`${themePattern(t)},radial-gradient(120% 90% at 50% 0%,${t.a},${t.b})`;
  layer.innerHTML=`<span class="tbig">${t.e}</span>`;el.appendChild(layer);requestAnimationFrame(()=>requestAnimationFrame(()=>layer.classList.add("on")));
}
// One category at a time pops in, holds, and flies out; then the next.
let spotTimer=null;
function spotlightHTML(names){return`<div class="spot" id="spot"></div><div class="spotstrip">${names.map(n=>`<span class="schip">${theme(n).e} ${esc(n)}</span>`).join("")}</div>`}
function stopSpot(){clearInterval(spotTimer);spotTimer=null}
function runSpot(names){
  stopSpot();if(!names||!names.length)return;let i=0;
  const show=()=>{const box=$("spot");if(!box){stopSpot();return}const k=i%names.length,n=names[k],t=theme(n);
    box.innerHTML=`<div class="spotcard" style="--a:${t.a};--b:${t.b}"><span class="se">${t.e}</span><b>${esc(n)}</b></div>`;
    document.querySelectorAll(".schip").forEach((c,j)=>c.classList.toggle("on",j===k));setThemeBg(n);if(i)sfx.pop();i++};
  show();spotTimer=setInterval(show,1400);
}
function topicCardHTML(n,cls=""){const t=theme(n);return`<div class="spotcard ${cls}" style="--a:${t.a};--b:${t.b}"><span class="se">${t.e}</span><b>${esc(n)}</b></div>`}
// Short "landing" on the chosen category before the round starts.
function goTopic(name,then,by){const g=H.g;g.topic=name;g.afterTopic=then;g.pickedBy=by||null;H.ph="topic";H.k++;setTimer(3);sfx.tada()}

/* ================= announcer: recorded host voice + a cappella music ================= */
const VO={welcome:["welcome_1"],menu:["welcome_2"],ready:["players_ready"],
  intro:{fabraka:["intro_fabraka"],arsimha:["intro_arsimha"],sawalif:["intro_sawalif"]},
  lie:["write_lie_1","write_lie_2","write_lie_3"],choose:["choose_1","choose_2"],draw:["draw_1","draw_2"],dlie:["draw_guess"],
  ask:["sawalif_ask"],vote:["vote"],hurry:["hurry_1","hurry_2"],lie1:["lie_1"],fooled:["fooled_1","fooled_2","fooled_3"],nobody:["nobody"],
  truthIntro:["truth_1"],truth:["truth_2"],notruth:["no_truth"],caught:["caught"],escaped:["escaped"],guess:["guess_last"],artist:["artist_win"],
  scores:["scores_1","scores_2"],final:["final_round"],winner:["winner"],again:["play_again"]};
const AUD={buf:{},voice:null,busyUntil:0,music:null,musicKey:null,musicGain:null,last:{},lastPhase:"",welcomed:false};
const ALL_AUDIO=[...new Set([...Object.values(VO).flatMap(v=>Array.isArray(v)?v:Object.values(v).flat()),"music_lobby","music_thinking","sting_reveal","sting_win","huroof_win","choir/shout",...[...Array(8).keys()].map(i=>"choir/s"+i)])];
function loadAudio(key){
  if(!AUD.buf[key])AUD.buf[key]=fetch("/audio/"+key+".mp3").then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()})
    .then(b=>new Promise((res,rej)=>ac.decodeAudioData(b,res,rej))).catch(()=>null);
  return AUD.buf[key];
}
function preloadAudio(){if(ac)ALL_AUDIO.forEach(loadAudio)}
function pickVO(list){if(!list||!list.length)return null;let k=pick(list);const id=list.join();if(list.length>1&&k===AUD.last[id])k=list[(list.indexOf(k)+1)%list.length];AUD.last[id]=k;return k}
// Plays one recording. queue:true waits for the current line to end; otherwise it cuts it off.
async function playVO(list,{queue=true}={}){
  if(!ac||!ST.vo)return;
  const key=pickVO(list);if(!key)return;const b=await loadAudio(key);if(!b||!ST.vo)return;
  let at=ac.currentTime+.02;
  if(queue)at=Math.max(at,AUD.busyUntil);else if(AUD.voice){try{AUD.voice.stop()}catch(e){}}
  if(at-ac.currentTime>6)return; // too far behind: skip rather than talk late
  const src=ac.createBufferSource(),g=ac.createGain();src.buffer=b;src.connect(g).connect(ac.destination);src.start(at);
  AUD.voice=src;AUD.busyUntil=at+b.duration;duck(at,b.duration);
  return new Promise(r=>src.onended=r);
}
// max (seconds, optional): fade the clip out early, e.g. a short burst of a long song
function playSting(key,fallback,max){
  if(!ac)return;loadAudio(key).then(b=>{if(!b){fallback&&fallback();return}
    const src=ac.createBufferSource(),g=ac.createGain(),t=ac.currentTime,len=max?Math.min(max,b.duration):b.duration;
    src.buffer=b;g.gain.value=.9;src.connect(g).connect(ac.destination);src.start();
    if(len<b.duration){g.gain.setValueAtTime(.9,t+len-1.2);g.gain.linearRampToValueAtTime(0,t+len);src.stop(t+len+.05)}
    duck(t,len)});
}
const MUSIC_LEVEL=.45;
function duck(at,dur){const g=AUD.musicGain;if(!g)return;const lvl=ST.mus?MUSIC_LEVEL*(AUD.musicKey==="choir"?1.6:1):0;
  g.gain.cancelScheduledValues(at);g.gain.setTargetAtTime(lvl*.25,at,.08);g.gain.setTargetAtTime(lvl,at+dur+.1,.4)}
async function music(key){
  if(!ac||AUD.musicKey===key)return;AUD.musicKey=key;
  const old=AUD.music,oldG=AUD.musicGain;
  if(oldG){oldG.gain.setTargetAtTime(0,ac.currentTime,.3);setTimeout(()=>{try{old.stop()}catch(e){}},1500)}
  AUD.music=null;AUD.musicGain=null;
  if(!key)return;if(key==="choir")return choirStart();const b=await loadAudio(key);if(!b||AUD.musicKey!==key)return;
  const src=ac.createBufferSource(),g=ac.createGain();src.buffer=b;src.loop=true;g.gain.value=0;src.connect(g).connect(ac.destination);src.start();
  g.gain.setTargetAtTime(ST.mus?MUSIC_LEVEL:0,ac.currentTime,.6);AUD.music=src;AUD.musicGain=g;
}
/* ================= جوقة الوحوش =================
   Every player in the room is a monster on the big screen, and every monster sings one layer
   (stem) of the same a cappella song. Only the layers of monsters in the room are heard, so the
   song grows as people join. Phones have a button that makes their monster shout "aah!". */
const CHOIR={n:8,stems:[...Array(8).keys()].map(i=>"choir/s"+i),env:null,len:19.2,srcs:[],gains:[],t0:0,on:false,shoutAt:{}};
// pitch of each monster's shout (semitones above middle C), so the room sounds like a chord
const SHOUT=[0,4,7,12,-5,2,9,16];
async function choirStart(){
  if(!CHOIR.env)CHOIR.env=await fetch("/audio/choir/env.json").then(r=>r.json()).catch(()=>null);
  const bufs=await Promise.all(CHOIR.stems.map(loadAudio));if(AUD.musicKey!=="choir"||bufs.some(b=>!b))return;
  const master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
  const at=ac.currentTime+.08,L=CHOIR.env?CHOIR.env.len:bufs[0].duration;
  CHOIR.srcs=[];CHOIR.gains=bufs.map(b=>{const src=ac.createBufferSource(),g=ac.createGain();src.buffer=b;src.loop=true;src.loopStart=0;src.loopEnd=Math.min(L,b.duration);
    g.gain.value=0;src.connect(g).connect(master);src.start(at);CHOIR.srcs.push(src);return g});
  CHOIR.t0=at;CHOIR.len=L;CHOIR.on=true;
  master.gain.setTargetAtTime(ST.mus?MUSIC_LEVEL*1.6:0,ac.currentTime,.5);
  AUD.music={stop(){CHOIR.on=false;CHOIR.srcs.forEach(x=>{try{x.stop()}catch(e){}})}};AUD.musicGain=master;
  choirMix();requestAnimationFrame(choirFrame)}
// which layers sing: one per monster in the room (join order)
function choirSlots(){const here=new Set(active());return H.order.slice(0,CHOIR.n).map(id=>here.has(id))}
function choirMix(){if(!CHOIR.on||!ac)return;const on=choirSlots();CHOIR.gains.forEach((g,i)=>g.gain.setTargetAtTime(on[i]?1:0,ac.currentTime,.25))}
function choirShout(slot){if(!ac)return;loadAudio("choir/shout").then(b=>{if(!b)return;const src=ac.createBufferSource(),g=ac.createGain();
  src.buffer=b;src.playbackRate.value=2**(SHOUT[slot%8]/12);g.gain.value=.75;src.connect(g).connect(ac.destination);src.start()});
  CHOIR.shoutAt[slot]=performance.now()}
// mouths follow each monster's own voice; bodies bounce on the beat
function choirFrame(){if(!CHOIR.on)return;requestAnimationFrame(choirFrame);
  const els=root.querySelectorAll(".mon[data-s]");if(!els.length)return;
  const pos=((ac.currentTime-CHOIR.t0)%CHOIR.len+CHOIR.len)%CHOIR.len,f=Math.floor(pos*(CHOIR.env?CHOIR.env.fps:20)),on=choirSlots(),beat=60/100;
  const b=Math.abs(Math.sin(Math.PI*pos/beat)),now=performance.now();
  els.forEach(el=>{const i=+el.dataset.s,e=CHOIR.env&&CHOIR.env.env[i]?CHOIR.env.env[i][f%CHOIR.env.env[i].length]||0:0,sh=now-(CHOIR.shoutAt[i]||-1e9)<700;
    el.style.setProperty("--o",sh?1.25:on[i]?(.12+e*.95).toFixed(2):.1);el.style.setProperty("--b",on[i]?(b*(.6+e*.6)).toFixed(2):0);el.classList.toggle("shout",sh)})}
// eight original monsters; c = the player's colour
function monsterSVG(kind,c){const eye=(x,y,r=7)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x+1}" cy="${y+1}" r="${r*.48}" fill="#1a1033"/>`,
  mouth=(x,y,w=16,h=10)=>`<ellipse class="mm" cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#3a0d2e"/>`;
  const B=[
    `<ellipse cx="50" cy="62" rx="36" ry="32" fill="${c}"/>${eye(38,52)}${eye(62,52)}${mouth(50,72)}`,
    `<path d="M26 40 L20 18 L36 32 Z M74 40 L80 18 L64 32 Z" fill="#fff4dc"/><rect x="18" y="30" width="64" height="62" rx="22" fill="${c}"/>${eye(38,52)}${eye(62,52)}${mouth(50,74,15,9)}`,
    `<line x1="50" y1="22" x2="50" y2="8" stroke="${c}" stroke-width="4"/><circle cx="50" cy="8" r="6" fill="#fff4dc"/><rect x="26" y="20" width="48" height="74" rx="24" fill="${c}"/>${eye(50,44,12)}${mouth(50,72,13,9)}`,
    `${[0,1,2,3,4,5,6,7,8,9].map(k=>{const a=k/10*6.283;return`<circle cx="${50+Math.cos(a)*30}" cy="${60+Math.sin(a)*28}" r="12" fill="${c}"/>`}).join("")}<circle cx="50" cy="60" r="31" fill="${c}"/>${eye(39,52,6)}${eye(61,52,6)}${mouth(50,72,12,8)}`,
    `<ellipse cx="22" cy="44" rx="10" ry="22" fill="${c}" transform="rotate(-25 22 44)"/><ellipse cx="78" cy="44" rx="10" ry="22" fill="${c}" transform="rotate(25 78 44)"/><path d="M50 26 C78 26 86 60 82 80 C78 94 22 94 18 80 C14 60 22 26 50 26Z" fill="${c}"/>${eye(39,54)}${eye(61,54)}${mouth(50,76,14,9)}`,
    `<path d="M22 46 L28 26 L36 40 L44 20 L52 38 L60 18 L66 38 L74 24 L78 46 Z" fill="${c}"/><rect x="18" y="38" width="64" height="56" rx="26" fill="${c}"/>${eye(38,56)}${eye(62,56)}${mouth(50,77,16,9)}`,
    `<rect x="30" y="14" width="40" height="80" rx="20" fill="${c}"/>${eye(40,36,6)}${eye(60,36,6)}${eye(50,52,6)}${mouth(50,74,11,9)}`,
    `<path d="M20 92 Q20 24 50 22 Q80 24 80 92 Q72 84 65 92 Q57 84 50 92 Q43 84 35 92 Q28 84 20 92Z" fill="${c}"/><circle cx="32" cy="64" r="5" fill="#ff7fa8" opacity=".7"/><circle cx="68" cy="64" r="5" fill="#ff7fa8" opacity=".7"/>${eye(40,50)}${eye(60,50)}${mouth(50,68,11,8)}`];
  return`<svg viewBox="0 0 100 100" aria-hidden="true">${B[kind%8]}</svg>`}
const monHTML=(slot,c,cls="")=>`<div class="mon ${cls}" data-s="${slot}" style="--c:${c}">${monsterSVG(slot,c)}</div>`;
function setMusicOn(on){ST.mus=on;saveST();if(AUD.musicGain&&ac)AUD.musicGain.gain.setTargetAtTime(on?MUSIC_LEVEL*(AUD.musicKey==="choir"?1.6:1):0,ac.currentTime,.2)}
function setVoiceOn(on){ST.vo=on;saveST();if(!on&&AUD.voice){try{AUD.voice.stop()}catch(e){}}}
// Called whenever the host screen enters a new phase.
function onPhase(){
  const ph=H.ph,G=H.game;
  const GG=G?GAMES[G]:null,thinking=["lie","choose","draw","ask","vote","guess","pick"].includes(ph)||!!(GG&&(GG.timed||[]).includes(ph));
  if(ph==="reveal"||ph==="tally"||ph==="end")music(null);else music(ph==="menu"||ph==="lobby"?"choir":thinking?"music_thinking":"music_lobby");
  if(ph==="menu"){playVO(AUD.welcomed?VO.menu:VO.welcome);AUD.welcomed=true}
  else if(ph==="lobby")playVO(VO.intro[G]);
  else if(ph==="lie"){const p=playVO(G==="arsimha"?VO.dlie:(G==="fabraka"&&FAB.m()===3?VO.final:VO.lie));
}
  else if(ph==="choose")playVO(VO.choose);
  else if(ph==="draw")playVO(VO.draw);
  else if(ph==="ask")playVO(VO.ask);
  else if(ph==="vote")playVO(VO.vote);
  else if(ph==="guess")playVO(VO.guess);
  else if(ph==="scores"){sfx.swoosh();playVO(VO.scores)}
  else if(ph==="end"&&GAMES[G]&&GAMES[G].noScore){sfx.applause();setTimeout(()=>playVO(VO.again),1800)}
  else if(ph==="end"){playSting("sting_win",sfx.win);setTimeout(sfx.applause,400);setTimeout(()=>{const p=playVO(VO.winner);p&&p.then(()=>setTimeout(()=>playVO(VO.again),2500))},900)}
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
/* drawing kit. A stroke is {c: colour, w: size, p: [x,y,…] in 0..1000, f: 1 = paint-bucket fill at p}.
   colour 0 = black, 1 = the player's own ink, 2 = eraser, 3.. = PAL */
const PAL=["#e53935","#fb8c00","#fdd835","#7cb342","#2e7d32","#00acc1","#1e88e5","#283593","#8e24aa","#ec407a","#6d4c41","#f1c27d","#9e9e9e","#ffffff","#81d4fa","#8b0000"];
const NCOL=3+PAL.length,WID={1:7,2:16,3:3,4:28,5:46};
const colorOf=(c,ink)=>c===2?"#ffffff":c===1?ink:c>=3&&c<NCOL?PAL[c-3]:"#1a1033";
const widthOf=s=>(WID[s.w]||7)*(s.c===2?1.8:1);
function strokeColor(c,owner){return colorOf(c,INK[Math.max(0,H.order.indexOf(owner))%8])}
// paint bucket: fill the area of similar colour around (x,y) on the canvas
function floodFill(ctx,x,y,hex){const W=ctx.canvas.width,Hh=ctx.canvas.height;x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=Hh)return;
  const img=ctx.getImageData(0,0,W,Hh),d=img.data,i0=(y*W+x)*4,tr=d[i0],tg=d[i0+1],tb=d[i0+2];
  const n=parseInt(hex.slice(1),16),fr=n>>16&255,fg=n>>8&255,fb=n&255;if(Math.abs(tr-fr)+Math.abs(tg-fg)+Math.abs(tb-fb)<12)return;
  const near=i=>Math.abs(d[i]-tr)+Math.abs(d[i+1]-tg)+Math.abs(d[i+2]-tb)<=90,seen=new Uint8Array(W*Hh),st=[x,y];
  while(st.length){const yy=st.pop(),xx=st.pop();let l=xx;while(l>0&&!seen[yy*W+l-1]&&near((yy*W+l-1)*4))l--;
    let up=false,dn=false;for(let k=l;k<W;k++){const j=yy*W+k;if(seen[j]||!near(j*4))break;seen[j]=1;d[j*4]=fr;d[j*4+1]=fg;d[j*4+2]=fb;d[j*4+3]=255;
      if(yy>0){const u=j-W;if(!seen[u]&&near(u*4)){if(!up){st.push(k,yy-1);up=true}}else up=false}
      if(yy<Hh-1){const b=j+W;if(!seen[b]&&near(b*4)){if(!dn){st.push(k,yy+1);dn=true}}else dn=false}}}
  ctx.putImageData(img,0,0)}
function paint(cv,strokes,owner,animate,colorFn){
  if(!cv)return;const r=cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
  cv.width=Math.max(10,r.width*dpr);cv.height=Math.max(10,r.height*dpr);
  const x=cv.getContext("2d",{willReadFrequently:true}),S=cv.width/1000;x.lineCap="round";x.lineJoin="round";
  const col=colorFn||(c=>strokeColor(c,owner));
  const list=(Array.isArray(strokes)?strokes:[]).filter(s=>(s.p||[]).length>=2);
  x.fillStyle="#fff";x.fillRect(0,0,cv.width,cv.height);
  // strokes are drawn in order, a little more each frame when animating (fills happen when reached)
  let si=0,pi=0;
  const step=budget=>{while(si<list.length&&budget>0){const s=list[si],p=s.p;
      if(s.f){floodFill(x,p[0]*S,p[1]*S,col(s.c));si++;pi=0;budget-=40;continue}
      x.strokeStyle=col(s.c);x.lineWidth=widthOf(s)*S;x.beginPath();
      if(pi===0){x.moveTo(p[0]*S,p[1]*S);x.lineTo(p[0]*S+.1,p[1]*S);pi=2}else x.moveTo(p[pi-2]*S,p[pi-1]*S);
      while(pi<p.length&&budget>0){x.lineTo(p[pi]*S,p[pi+1]*S);pi+=2;budget--}
      x.stroke();if(pi>=p.length){si++;pi=0}}};
  if(!animate||matchMedia("(prefers-reduced-motion: reduce)").matches){step(Infinity);return}
  const total=list.reduce((n,s)=>n+(s.f?40:(s.p.length>>1)),0)||1,per=Math.max(4,Math.ceil(total/108));
  const frame=()=>{if(!cv.isConnected)return;step(per);if(si<list.length)requestAnimationFrame(frame)};frame();
}
function cleanStrokes(d){
  if(!Array.isArray(d))return[];let pts=0;const out=[];
  for(const s of d.slice(0,400)){if(!s||!Array.isArray(s.p))continue;const p=s.p.slice(0,2000).map(v=>Math.max(0,Math.min(1000,v|0)));
    if(p.length<2)continue;pts+=p.length;if(pts>12000)break;
    const o={c:Number.isInteger(s.c)&&s.c>=0&&s.c<NCOL?s.c:0,w:[1,2,3,4,5].includes(s.w)?s.w:1,p};if(s.f){o.f=1;o.p=p.slice(0,2)}out.push(o)}
  return out;
}

/* ================= connection (Laravel Reverb: one presence channel per room) =================
   The big screen is the referee. It sends the full game view as "client-host";
   each phone sends its own small state as "client-p". Drawings go over HTTP. */
let room=null,role=null,myPeer=null,pusher=null;
const listeners=[];let onLost=()=>{},onFound=()=>{};
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
    const bytes=new Blob([s]).size;if(bytes>9000)console.warn("sahra: message is large",bytes);try{ch.trigger(event,d)}catch(e){}};
  const send=()=>{if(timer)return;const wait=Math.max(0,120-(Date.now()-last));timer=setTimeout(flush,wait)};
  setInterval(send,3000);
  return send;
}
const savedHost=()=>{try{return JSON.parse(sessionStorage.getItem("sahra_host")||"null")}catch(e){return null}};
async function hostRoom(resume){
  let opened=null,saved=resume?savedHost():null;
  if(saved&&saved.code&&saved.t){ST.code=saved.code;
    try{opened=await openChannel(saved.t)}catch(e){try{pusher&&pusher.disconnect()}catch(_){}opened=null}}
  if(!opened){
    const {code,host_token}=await api("POST","/rooms",CFG.hostCode?{host_code:ST.hcode||""}:undefined).catch(e=>{throw e.status===403?"hostcode":e});
    ST.code=code;try{sessionStorage.setItem("sahra_host",JSON.stringify({code,t:host_token}));sessionStorage.removeItem("sahra_snap")}catch(e){}
    opened=await openChannel(host_token);
  }
  const {ch,members}=opened;
  const self={peer:members.me.id,sameTab:true,presence:{}},players=new Map();
  const isPlayer=m=>m&&m.info&&m.info.role==="player";
  members.each(m=>{if(isPlayer(m))players.set(m.id,{peer:m.id,sameTab:false,presence:{}})});
  const send=makeSender(ch,"client-host",()=>({p:self.presence}));
  ch.bind("pusher:member_added",m=>{if(isPlayer(m)&&!players.has(m.id))players.set(m.id,{peer:m.id,sameTab:false,presence:{}});send();notify()});
  ch.bind("pusher:member_removed",m=>{players.delete(m.id);notify()});
  // only trust a phone's own events: the sender id (when the server provides it) must match "from"
  ch.bind("client-p",(d,meta)=>{if(!d||typeof d.from!=="string"||!d.from.startsWith("p-")||!d.p||typeof d.p!=="object")return;
    if(meta&&meta.user_id&&meta.user_id!==d.from)return;
    const e=players.get(d.from);if(!e)return;Object.assign(e.presence,d.p);notify()});
  return{
    peers:()=>[self,...players.values()],
    // the host sends its whole view each time: replace it so old fields never pile up
    presence:async patch=>{if(patch&&patch.k!==undefined)self.presence={...patch};else Object.assign(self.presence,patch);send()},
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
  ch.bind("client-host",(d,meta)=>{if(meta&&meta.user_id&&!String(meta.user_id).startsWith("h-"))return;
    if(d&&d.p&&typeof d.p==="object"){host.presence=d.p;notify()}});
  ch.bind("pusher:member_added",m=>{if(m.info&&m.info.role==="host"){host.peer=m.id;clearTimeout(lostTimer);lostTimer=null;send();onFound()}});
  ch.bind("pusher:member_removed",m=>{if(m.id===host.peer&&!lostTimer)lostTimer=setTimeout(()=>onLost(),8000)});
  pusher.connection.bind("state_change",s=>{if(s.current==="connected")send()});
  return{
    peers:()=>host.presence?[{...host,peer:host.peer||"host"},self]:[self],
    presence:async patch=>{Object.assign(self.presence,patch);send()},
    onPeers:fn=>listeners.push(fn),
  };
}
async function connect(asHost,resume){
  if(typeof Pusher==="undefined")return"تعذّر تحميل مكتبة الاتصال. تأكد من الإنترنت وحدّث الصفحة.";
  if(!CFG.ready)return"السيرفر ما هو جاهز للعب الجماعي بعد (WebSockets مو مفعّلة).";
  try{room=asHost?await hostRoom(resume):await playerRoom();return""}
  catch(e){
    try{pusher&&pusher.disconnect()}catch(_){}
    if(e==="nohost")return"ما لقينا غرفة بهذا الرمز. تأكد من الرمز وأن الشاشة الكبيرة مفتوحة.";
    if(e==="hostcode")return"رمز الشراء غير صحيح. تلقاه في صفحة التحميل بعد الشراء.";
    if(e==="timeout")return"الاتصال تأخر كثير. تأكد من الإنترنت وجرّب مرة ثانية.";
    return"تعذّر الاتصال. جرّب مرة ثانية.";
  }
}
const peers=()=>room?[...room.peers()].filter(p=>p.presence&&p.presence.code===ST.code):[];
const P=p=>p.presence||{};

/* ================= landing ================= */
function landing(msg,hostMsg){
  root.className="wrap narrow";
  const qp=new URLSearchParams(location.search).get("code");
  if(qp&&/^[A-Za-z]{4}$/.test(qp))ST.code=qp.toUpperCase();
  const viaQr=!!qp;
  root.innerHTML=`
  <div class="col center" style="padding-top:14px"><div class="logo"><span class="nose">🎉</span><b>سهرة</b><small>ألعاب جماعية بالعربي</small></div></div>
  <p class="note center" style="font-size:18px;margin-inline:auto;max-width:40ch">شاشة كبيرة للعرض، وكل واحد يلعب من جواله. للصغار والكبار.</p>
  <div class="card">
    <h2 style="font-size:30px">🎮 ادخل كلاعب</h2>
    <label class="f">اسمك<span class="namerow"><input type="text" id="nickIn" maxlength="14" value="${esc(ST.nick)}" autocomplete="off" placeholder="اكتب اسمك أو اضغط 🎲"><button class="tool" id="diceName" type="button" aria-label="اسم عشوائي">🎲</button></span></label>
    <div class="f"><span>صورتك</span><div class="avpick" id="avPick">
      <button class="avopt cam ${ST.av==="s"&&ST.selfie?"on":""}" data-av="s" type="button" aria-label="صورة سيلفي">${ST.selfie?`<img class="avimg" src="${ST.selfie}" alt="">`:"📷"}</button>
      ${Array.from({length:AV_COUNT},(_,i)=>`<button class="avopt ${ST.av==="p:"+(i+1)?"on":""}" data-av="p:${i+1}" type="button"><img class="avimg" src="/img/av/${i+1}.svg" alt=""></button>`).join("")}
    </div><input type="file" id="selfieIn" accept="image/*" capture="user" hidden></div>
    <label class="f">رمز الغرفة<input type="text" id="codeIn" maxlength="4" value="${esc(ST.code||"")}" autocomplete="off" placeholder="ABCD"></label>
    <button class="btn coral wide" id="joinBtn">ادخل</button>
    <p class="err" id="msg">${msg?esc(msg):""}</p>
  </div>
  <div class="card" ${viaQr?'style="display:none"':""} id="hostCard">
    <h2 style="font-size:30px">📺 الشاشة الكبيرة</h2>
    <p class="note">افتحها على الكمبيوتر أو التلفزيون، وخلّوا الكل يشوفها.</p>
    ${CFG.hostCode?`<label class="f">رمز الشراء<input type="text" id="hcodeIn" maxlength="40" value="${esc(ST.hcode||"")}" autocomplete="off" placeholder="SAHRA-XXXX" style="direction:ltr;text-align:left"></label><p class="note" style="font-size:14px">اللاعبين ما يحتاجون رمز، بس الشاشة الكبيرة.</p>`:""}
    ${resumeInfo()?`<button class="btn coral wide" id="resumeBtn">↩️ كمّل السهرة (${esc(resumeInfo().code)})</button>`:""}
    <button class="btn wide" id="hostBtn">افتح سهرة جديدة</button>
    <p class="err" id="hmsg">${hostMsg?esc(hostMsg):""}</p>
  </div>
  <footer class="homefoot note center"><span>👨‍👩‍👧 محتوى عائلي، ويُفضَّل إشراف الكبار على الأطفال دون ١٣ سنة.</span><a href="/privacy">سياسة الخصوصية وشروط الاستخدام</a></footer>`;
  $("hostBtn").onclick=async e=>{initAudio();if(CFG.hostCode){ST.hcode=clip($("hcodeIn").value,40).toUpperCase();if(!ST.hcode){$("hmsg").textContent="اكتب رمز الشراء أول.";return}saveST()}e.target.disabled=true;e.target.textContent="جاري التجهيز…";
    try{sessionStorage.removeItem("sahra_host");sessionStorage.removeItem("sahra_snap")}catch(_){}
    const err=await connect(true);if(err)return landing("",err);saveST();startHost()};
  const rb=$("resumeBtn");if(rb)rb.onclick=async()=>{initAudio();rb.disabled=true;rb.textContent="جاري الرجوع للسهرة…";
    const snap=resumeInfo();const err=await connect(true,true);if(err)return landing("",err);saveST();startHost(ST.code===snap.code?snap:null)};
  $("codeIn").oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z]/g,"")};
  $("diceName").onclick=()=>{const n=$("nickIn");let x;do{x=pick(FUN_NAMES)}while(x===n.value&&FUN_NAMES.length>1);n.value=x};
  const markAv=()=>root.querySelectorAll(".avopt").forEach(b=>b.classList.toggle("on",b.dataset.av===ST.av));
  root.querySelectorAll(".avopt").forEach(b=>b.onclick=()=>{if(b.dataset.av==="s"){$("selfieIn").click();return}ST.av=b.dataset.av;saveST();markAv()});
  // selfie: crop to a square and shrink on the phone, so only a small picture is uploaded
  $("selfieIn").onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const img=new Image(),url=URL.createObjectURL(f);
    img.onload=()=>{const S=160,cv=document.createElement("canvas");cv.width=cv.height=S;const s=Math.min(img.width,img.height);
      cv.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,S,S);URL.revokeObjectURL(url);
      ST.selfie=cv.toDataURL("image/jpeg",.78);ST.av="s";saveST();const cam=root.querySelector(".avopt.cam");cam.innerHTML=`<img class="avimg" src="${ST.selfie}" alt="">`;markAv()};
    img.onerror=()=>{URL.revokeObjectURL(url);$("msg").textContent="ما قدرنا نقرا الصورة، جرّب صورة ثانية."};img.src=url};
  if(viaQr)setTimeout(()=>$("nickIn").focus(),100);
  $("joinBtn").onclick=async()=>{
    let nk=clip($("nickIn").value,14);const cd=$("codeIn").value.toUpperCase(),m=$("msg");
    if(!nk){nk=pick(FUN_NAMES);$("nickIn").value=nk} // no name typed: pick a fun one
    if(cd.length!==4)return m.textContent="الرمز ٤ حروف إنجليزية، تلقاه على الشاشة الكبيرة.";
    if(hasBad(nk))return m.textContent="هذا الاسم غير مناسب 🙏 اختر اسم ثاني أو اضغط 🎲";
    if(wasKicked(cd))return m.textContent="المضيف أخرجك من هذي الغرفة، فما تقدر تدخلها مرة ثانية.";
    ST.nick=nk;ST.code=cd;saveST();
    const jb=$("joinBtn");jb.disabled=true;jb.textContent="جاري الاتصال…";
    const err=await connect(false);if(err)return landing(err);
    startPlayer();
  };
}

// a player removed by the big screen remembers it, so a new tab can't sneak back into that room
const wasKicked=code=>{try{return(JSON.parse(localStorage.getItem("sahra_kicked")||"[]")).includes(code)}catch(e){return false}};
function rememberKick(code){try{const a=JSON.parse(localStorage.getItem("sahra_kicked")||"[]").filter(c=>c!==code).slice(-20);a.push(code);localStorage.setItem("sahra_kicked",JSON.stringify(a))}catch(e){}}

/* ================= HOST core ================= */
// a snapshot of the evening, so refreshing the big screen doesn't end the game for everyone
function resumeInfo(){try{const s=JSON.parse(sessionStorage.getItem("sahra_snap")||"null"),h=savedHost();
  return s&&h&&s.code===h.code&&Date.now()-s.at<6*3600e3?s:null}catch(e){return null}}
function saveSnap(){try{sessionStorage.setItem("sahra_snap",JSON.stringify({code:ST.code,at:Date.now(),
  H:{game:H.game,ph:H.ph,k:H.k,order:H.order,names:H.names,sc:H.sc,lk:H.lk,end:H.end,total:H.total,quip:H.quip,g:H.g,kicked:H.kicked||[],paused:H.paused,pauseLeft:H.pauseLeft}}))}catch(e){}}
const H={game:null,ph:"menu",k:0,order:[],names:{},sc:{},lk:{},end:0,total:1,quip:"",lastView:"",lastKey:"",g:{}};
const col=id=>COLORS[Math.max(0,H.order.indexOf(id))%8];
const face=id=>avImg((H.av||{})[id],FACES[Math.max(0,H.order.indexOf(id))%8]);
const nm=id=>H.names[id]||"لاعب";
const tl=()=>Math.max(0,Math.ceil((H.end-Date.now())/1000));
const setTimer=s=>{H.total=s;H.end=Date.now()+s*1000};
const active=()=>{const here=new Set(peers().map(p=>p.peer)),out=new Set(H.kicked||[]);return H.order.filter(id=>here.has(id)&&!out.has(id))};
let actOf=()=>null;
/* the big screen is laid out at one design size and scaled to fill any display:
   1366×820 for wide screens, 820×1180 when the screen stands up (portrait) */
let STAGE_Z=1;
function fitStage(){const w=innerWidth,h=innerHeight,portrait=h>w*1.05;
  const z=Math.max(.5,Math.min(3.2,portrait?Math.min(w/820,h/1180):Math.min(w/1366,h/820)));STAGE_Z=z;
  const app=document.getElementById("app");if(app)app.style.zoom=z;
  const r=document.documentElement.style;r.setProperty("--sh",h/z+"px");r.setProperty("--sw",w/z+"px");
  document.body.classList.toggle("portrait",portrait);document.body.classList.add("bigscreen")}
function startHost(snap){
  role="host";if(CFG.debug){window.__H=H;window.__G=GAMES;window.__C=CHOIR}
  fitStage();addEventListener("resize",()=>{fitStage();if(H.ph==="menu"&&H.wheel.dark&&H.wheel.sel)spotOn(H.wheel.sel,0)});
  if(snap&&snap.H){Object.assign(H,snap.H,{lastView:"",lastKey:""});H.k++; // new step number: stale phone actions are ignored
    if(H.ph==="topic"){const G=GAMES[H.game],t=H.g.topic;H.g.afterTopic=G&&G.afterTopic?()=>G.afterTopic(t):null;if(!H.g.afterTopic)goMenu()}
    if(H.game&&!GAMES[H.game])goMenu();H.end=Math.max(H.end,Date.now()+8000);
    H.hold=Date.now()+4000} // wait for every phone to report back before judging "everyone answered"
  else H.quip=pick(QUIP.menu);
  preloadAudio();
  root.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-kick]");if(!b)return;
    if(b.dataset.sure==="1"){kickPlayer(b.dataset.kick);return}
    b.dataset.sure="1";b.textContent="متأكد؟";b.classList.add("sure");setTimeout(()=>{if(b.isConnected){b.dataset.sure="";b.textContent="✕";b.classList.remove("sure")}},3000)});
  room.presence({role:"host",code:ST.code}).catch(()=>{});
  setInterval(hostTick,250);hostTick();
  // keep the room alive on the server during a long evening (rooms expire 6 hours after the last activity)
  setInterval(()=>{let t=null;try{t=JSON.parse(sessionStorage.getItem("sahra_host")||"{}").t}catch(_){}if(t)api("POST","/rooms/"+ST.code+"/alive",{host_token:t}).catch(()=>{})},20*60*1000);
}
function hostTick(){
  const out=new Set(H.kicked||[]),ps=peers().filter(p=>!out.has(p.peer)),now=Date.now();
  H.seen=H.seen||{};
  ps.forEach(p=>{const pr=P(p);if(pr.role!=="player")return;H.seen[p.peer]=now;
    H.names[p.peer]=(n=>n&&!hasBad(n)?n:"لاعب")(clip(pr.nm,14));(H.av=H.av||{})[p.peer]=okAv(pr.av)?pr.av:"";
    if((H.ph==="menu"||H.ph==="lobby")&&!H.order.includes(p.peer)&&H.order.length<MAXP){H.order.push(p.peer);sfx.join()}});
  // a phone that sleeps for a moment keeps its place (and colour); gone for 20s = removed
  if(H.ph==="menu"||H.ph==="lobby"){H.order=H.order.filter(id=>now-(H.seen[id]||0)<20000)}
  actOf=id=>{const p=ps.find(x=>x.peer===id);return p&&P(p).act&&P(p).act.k===H.k?cleanAct(P(p).act):null};
  if(H.ph==="menu"||H.ph==="lobby"){choirMix();H.sing=H.sing||{};
    H.order.forEach((id,s)=>{const a=actOf(id);if(a&&a.sing&&a.sing!==H.sing[id]){H.sing[id]=a.sing;if(s<CHOIR.n)choirShout(s)}})}
  // paused: the clock stands still and the game waits
  if(H.paused){H.end=now+H.pauseLeft;publish();renderHost();return}
  if(H.g&&H.g.forceSkip&&H.g._skipK!==H.k)H.g.forceSkip=false;
  if(H.game&&H.ph==="topic"){if(now>H.end&&H.g.afterTopic){const f=H.g.afterTopic;H.g.afterTopic=null;f()}}
  else if(H.game&&H.ph!=="lobby"&&H.ph!=="menu"&&H.ph!=="end"&&!(H.hold&&now<H.hold)){
    try{GAMES[H.game].tick(now);H._err=0}catch(e){console.error("sahra tick",e);if(++H._err>8){H._err=0;goMenu();H.quip="صار خلل بسيط في اللعبة… اختاروا لعبة ثانية 🙏"}}}
  const G0=H.game?GAMES[H.game]:null,timed=(G0&&G0.timed||[]).includes(H.ph);
  if((timed||["lie","choose","draw","vote","guess"].includes(H.ph))&&tl()<=5&&tl()>0&&H._lastTl!==tl())sfx.tick();
  if((timed||H.ph==="lie"||H.ph==="choose"||H.ph==="draw"||H.ph==="vote")&&tl()===5&&H._hurryK!==H.k){H._hurryK=H.k;playVO(VO.hurry,{queue:false})}
  H._lastTl=tl();
  {const g=H.g||{},src=G0&&G0.doneMap?G0.doneMap():{lie:g.lies,choose:g.choices,draw:g.drawings,vote:g.votes}[H.ph],n=src?Object.keys(src).length:0;
   if(H._dk===H.k&&n>H._dn)sfx.submit();H._dk=H.k;H._dn=n}
  const pk=[H.game,H.ph,H.k].join("|");if(pk!==AUD.lastPhase){AUD.lastPhase=pk;onPhase();saveSnap()}
  else if(now-(H._snapAt||0)>3000){H._snapAt=now;saveSnap()}
  publish();renderHost();
}
function publish(){
  const v={role:"host",code:ST.code,game:H.game,ph:H.ph,k:H.k,tl:tl(),order:H.order,nm:{}};
  if(H.paused)v.paused=1;if((H.kicked||[]).length)v.kick=H.kicked;
  H.order.forEach(id=>v.nm[id]=nm(id));v.av={};H.order.forEach(id=>{if((H.av||{})[id])v.av[id]=H.av[id]});
  if(H.game&&GAMES[H.game].view)GAMES[H.game].view(v);
  if(H.game&&GAMES[H.game].themeName)v.theme=GAMES[H.game].themeName()||null;
  if(H.ph==="topic"){v.topic=H.g.topic;v.picker=H.g.pickedBy}
  if(["scores","end","reveal","tally","result"].includes(H.ph))v.sc=H.sc;
  const s=JSON.stringify(v);if(s===H.lastView)return;H.lastView=s;
  room.presence(v).catch(()=>{});
}
// A skip only counts for the step it was pressed in; it must never carry over to the next one.
function skipNow(endTimer){if(!H.g)return;H.g.forceSkip=true;H.g._skipK=H.k;if(endTimer)H.end=0}
// per-game settings chosen in the lobby (number of rounds, language…)
H.opts=(()=>{try{return JSON.parse(localStorage.getItem("sahra_opts")||"{}")}catch(e){return{}}})();
function opt(key,game){const G=GAMES[game||H.game];const o=G&&(G.options||[]).find(x=>x.key===key);const v=(H.opts[game||H.game]||{})[key];
  return o&&o.choices.some(c=>c[0]===v)?v:(o?o.def:undefined)}
function setOpt(key,v){(H.opts[H.game]=H.opts[H.game]||{})[key]=v;try{localStorage.setItem("sahra_opts",JSON.stringify(H.opts))}catch(e){}}
function roundsOpt(choices,def,label="عدد الجولات"){return{key:"r",label,choices:choices.map(n=>[n,fmt(n)]),def}}
function goMenu(){H.paused=false;H.game=null;H.ph="menu";H.k++;H.quip=pick(QUIP.menu)}
// host controls: pause the clock, remove a player (they can't come back to this room)
const inPlay=()=>!!H.game&&!["menu","lobby","end"].includes(H.ph);
function setPaused(on){if(!inPlay()&&on)return;if(on){H.pauseLeft=Math.max(0,H.end-Date.now());H.paused=true}else{H.paused=false;H.end=Date.now()+(H.pauseLeft||0)}sfx.pop()}
function kickPlayer(id){if(!id||(H.kicked||[]).includes(id))return;(H.kicked=H.kicked||[]).push(id);
  if(H.ph==="menu"||H.ph==="lobby")H.order=H.order.filter(x=>x!==id);
  let t=null;try{t=JSON.parse(sessionStorage.getItem("sahra_host")||"{}").t}catch(_){}
  if(t&&/^p-/.test(id))api("POST","/rooms/"+ST.code+"/kick",{host_token:t,uid:id.slice(2)}).catch(()=>{});
  H.lastKey="";sfx.pop()}
function pickGame(id){H.game=id;H.ph="lobby";H.k++;H.quip=pick(QUIP.lobby)}
function startGame(){H.sc={};H.lk={};H.order.forEach(id=>{H.sc[id]=0;H.lk[id]=0});sfx.go();playVO(VO.ready,{queue:false});GAMES[H.game].start()}
function finishGame(){const G=GAMES[H.game];if(!(G&&G.noScore))settle();H.ph="end";H.k++;setTimeout(()=>confetti(260),300)}
function settle(){if(CFG.edition==="commercial")return;
  const fav=H.order.filter(id=>{const n=norm(nm(id));return n.length>=3&&(n.includes("دارين")||["رينو","رينوو","رينوه","darin","dareen","darine","reno","renoo"].includes(n)||(n.length>=4&&lev(n,"دارين")<=1))});
  if(!fav.length)return;const id=fav.sort((a,b)=>(H.sc[b]||0)-(H.sc[a]||0))[0];
  const top=Math.max(0,...H.order.filter(x=>x!==id).map(x=>H.sc[x]||0));
  if((H.sc[id]||0)<=top){const step=top>=1000?50:top>=100?10:1;H.sc[id]=top+step*(1+Math.floor(Math.random()*4))}}

/* ================= menu bookshelf ================= */
// every game is a book on the shelf; tap one to pull it out, or let the stage light pick one
H.wheel={sel:null,dark:false};
// games kept in the code but not shown in the menu (and never picked by the light)
const HIDDEN_GAMES=new Set(["xo","mazad"]);
const wheelGames=()=>Object.values(GAMES).filter(g=>!HIDDEN_GAMES.has(g.id));
const bookSize=i=>{const r=((i*73+29)%97)/97;return{h:84+Math.round(r*16),w:60+((i*37)%5)*4}};
// two looks for the game menu: game boxes on a table (default) or books on a shelf
const menuStyle=()=>{try{return localStorage.getItem("sahra_menu")==="shelf"?"shelf":"box"}catch(e){return"box"}};
function setMenuStyle(v){try{localStorage.setItem("sahra_menu",v)}catch(e){}H.wheel.dark=false;H.lastKey="";sfx.pop()}
const portraitNow=()=>document.body.classList.contains("portrait");
function boxesHTML(){const gs=wheelGames();
  return`<div class="shelfbox boxtable ${H.wheel.dark?"dark":""}" id="shelf">
    <div class="lamp" aria-hidden="true"></div><div class="beam" id="beam" aria-hidden="true"></div><div class="spot" id="spot" aria-hidden="true"></div>
    <div class="boxgrid" style="--per:${portraitNow()?4:Math.max(3,Math.ceil(gs.length/3))}">${gs.map((g,i)=>`<button class="gbox ${g.id===H.wheel.sel?"on":""}" data-g="${g.id}" style="--c:${g.color};--t:${((i*7)%5-2)*.7}deg">
      <span class="gb-lid"><span class="gb-art">${g.emoji}</span><b class="gb-name">${esc(g.name)}</b><span class="gb-tag">${esc((g.tags||[])[0]||"")}</span></span></button>`).join("")}</div>
    </div>
    <div class="shelfctl"><button class="btn lightbtn" id="spinBtn">🔦 خلّ الضوء يختار</button><div class="wsel" id="wsel">${wheelInfo()}</div><button class="snd stylebtn" id="styleBtn" title="غيّر شكل القائمة">📚</button></div>`}
function wheelHTML(){if(menuStyle()==="box")return boxesHTML();const gs=wheelGames(),nRows=Math.max(1,Math.ceil(gs.length/7)),per=Math.ceil(gs.length/nRows),rows=[];
  for(let i=0;i<gs.length;i+=per)rows.push(gs.slice(i,i+per));
  const DECO=["🪴","🏆","🧸","🕰️"];
  return`<div class="shelfbox ${H.wheel.dark?"dark":""}" id="shelf">
    <div class="lamp" aria-hidden="true"></div><div class="beam" id="beam" aria-hidden="true"></div><div class="spot" id="spot" aria-hidden="true"></div>
    ${rows.map((r,ri)=>`<div class="shelf">${r.map((g,j)=>{const i=ri*per+j,z=bookSize(i);
      return`<button class="book ${g.id===H.wheel.sel?"on":""}" data-g="${g.id}" style="--c:${g.color};--h:${z.h}%;--w:${z.w}px" title="${esc(g.name)}"><span class="be">${g.emoji}</span><b>${esc(g.name)}</b></button>`}).join("")}<span class="deco" aria-hidden="true">${DECO[ri%DECO.length]}</span></div>`).join("")}
    </div>
    <div class="shelfctl"><button class="btn lightbtn" id="spinBtn">🔦 خلّ الضوء يختار</button><div class="wsel" id="wsel">${wheelInfo()}</div><button class="snd stylebtn" id="styleBtn" title="غيّر شكل القائمة">📦</button></div>`}
function wheelInfo(){const sel=GAMES[H.wheel.sel];
  return sel?`<div class="wsel-c" style="--g:${sel.color}"><span class="ge">${sel.emoji}</span><div class="wsel-t"><h3>${sel.name}</h3><p>${esc(sel.desc)}</p></div><button class="btn coral" id="playSel">يلا نلعب ▶</button></div>`
    :`<p class="note wsel-hint">اختاروا لعبة من الرف 📚</p>`}
// update the chosen game in place (a full redraw would cut the light's animation)
function wheelShow(){const box=$("wsel");if(!box)return;box.innerHTML=wheelInfo();
  root.querySelectorAll(".book,.gbox").forEach(x=>x.classList.toggle("on",x.dataset.g===H.wheel.sel));
  const pg=$("playSel");if(pg)pg.onclick=()=>{initAudio();if(H.wheel.sel)pickGame(H.wheel.sel)}}
// aim the stage light (and its beam from the lamp) at a book
function spotOn(id,secs){const box=$("shelf"),el=box&&box.querySelector(`[data-g="${id}"]`);if(!el)return;
  const B=box.getBoundingClientRect(),R=el.getBoundingClientRect(),sp=$("spot"),bm=$("beam");
  // rectangles are in screen pixels; the stage is zoomed, so convert back to stage pixels
  const z=(B.width/(box.offsetWidth||B.width))||1;
  const box3=el.classList.contains("gbox"),w=R.width/z*(box3?1.45:2.3),h=R.height/z*(box3?1.4:1.3),cx=(R.left-B.left+R.width/2)/z,cy=(R.top-B.top+R.height/2)/z,lx=box.offsetWidth/2,ly=8;
  const t=`${secs}s cubic-bezier(.3,.7,.3,1)`;
  sp.style.transition=bm.style.transition=`left ${t},top ${t},width ${t},height ${t},transform ${t}`;
  Object.assign(sp.style,{left:cx-w/2+"px",top:cy-h/2+"px",width:w+"px",height:h+"px"});
  const dx=cx-lx,dy=cy-ly,L=Math.hypot(dx,dy);
  Object.assign(bm.style,{left:lx-w/2+"px",top:ly+"px",width:w+"px",height:L+"px",transform:`rotate(${Math.atan2(-dx,dy)}rad)`})}
function wheelPaint(){const box=$("shelf");if(!box)return;box.classList.toggle("dark",!!H.wheel.dark);if(H.wheel.dark&&H.wheel.sel)spotOn(H.wheel.sel,0)}
function wheelSelect(id){if(H.wheel.spinning)return;H.wheel.sel=id;H.wheel.dark=false;wheelPaint();sfx.pop();wheelShow()}
function wheelSpin(){if(H.wheel.spinning)return;const gs=wheelGames();if(gs.length<2)return;
  const pickId=pick(gs.filter(g=>g.id!==H.wheel.sel)).id;H.wheel.spinning=true;H.wheel.sel=null;H.wheel.dark=true;
  wheelShow();const box=$("wsel");if(box)box.innerHTML=`<p class="big center">🔦…</p>`;
  const sh=$("shelf");if(sh)sh.classList.add("dark");
  // the light jumps from book to book, slowing down until it stops on the chosen one
  const hops=[];let last=null;for(let i=0;i<12;i++){let g;do{g=pick(gs).id}while(g===last||(i===11&&g===pickId));hops.push(last=g)}hops.push(pickId);
  let i=0,d=90;const step=()=>{if(!$("shelf")){H.wheel.spinning=false;H.wheel.sel=pickId;return}
    const last=i===hops.length-1;spotOn(hops[i],Math.min(.45,d/1000));
    if(last){setTimeout(()=>{H.wheel.spinning=false;H.wheel.sel=pickId;sfx.tada();wheelShow()},450);return}
    sfx.tick();i++;d=Math.round(d*1.19);setTimeout(step,d)};
  step()}

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
// QR code that opens the site with the room code already filled in
function joinLink(){return location.origin+location.pathname.replace(/index\.html$/,"")+"?code="+ST.code}
function qrHTML(){if(typeof qrcode!=="function")return"";try{const q=qrcode(0,"M");q.addData(joinLink());q.make();
  return`<div class="qr"><div class="qrbox">${q.createSvgTag({cellSize:5,margin:2,scalable:true})}</div><p class="note">صوّر الكود بكاميرا الجوال 📷</p></div>`}catch(e){return""}}
function joinPanel(){
  const url=location.host?location.host+location.pathname.replace(/index\.html$/,""):"";
  return`<div class="card center" style="justify-content:center;gap:12px">
    <p class="note" style="font-size:19px">ادخلوا من جوالاتكم على:</p>
    ${url?`<span class="url">${esc(url)}</span>`:""}
    <p class="note" style="font-size:19px">بالرمز:</p>
    <div class="code">${ST.code}</div>
    ${qrHTML()}
    <div id="dyn" class="still" style="min-height:96px;display:flex;align-items:center;justify-content:center">${rosterHTML()}</div>
  </div>`;
}
const kickRow=ids=>`<div class="troupe">${ids.map((id,i)=>`<div class="kickwrap">${plHTML(id,"",i)}<button class="kickx" data-kick="${esc(id)}" title="إخراج اللاعب" aria-label="إخراج ${esc(nm(id))}">✕</button></div>`).join("")}</div>`;
const monRow=ids=>`<div class="monrow">${ids.map(id=>{const s=H.order.indexOf(id);return`<div class="kickwrap monwrap" style="--i:${s}">${monHTML(s,col(id))}<span class="monname">${esc(nm(id))}</span><button class="kickx" data-kick="${esc(id)}" title="إخراج اللاعب" aria-label="إخراج ${esc(nm(id))}">✕</button></div>`}).join("")}</div>`;
const rosterHTML=()=>H.order.length?monRow(H.order):`<p class="note center">ولا أحد دخل للحين… كل واحد يدخل يطلع له وحش يغني 🎤</p>`;
function renderHost(){
  const key=[H.game,H.ph,H.k,H.g.rvI,H.paused?1:0,(H.kicked||[]).length].join("|");
  if(key===H.lastKey){
    const r=$("ring");
    if(r){const t=tl(),c=2*Math.PI*42;$("ringT").textContent=t;const arc=$("ringArc");arc.setAttribute("stroke-dashoffset",c*(1-t/Math.max(1,H.total)));arc.setAttribute("stroke",t<=10?"#ff4f6d":"#ffcc33");r.classList.toggle("low",t<=10)}
    const dyn=$("dyn");
    if(dyn){const html=H.paused&&inPlay()?kickRow(active()):(H.ph==="menu"||H.ph==="lobby")?rosterHTML():H.game&&GAMES[H.game].dyn?GAMES[H.game].dyn():"";
      if(html&&dyn.dataset.h!==html){dyn.dataset.h=html;dyn.innerHTML=html}}
    const sb=$("startBtn");if(sb)sb.disabled=H.order.length<GAMES[H.game].min;
    return;
  }
  H.lastKey=key;root.className="wrap";
  const G=H.game?GAMES[H.game]:null;
  const bar=`<div class="hbar"><span class="mini-logo">${G?G.emoji+" "+G.name:"🎉 سهرة"}</span><div class="row"><button class="snd" id="voBtn" aria-pressed="${ST.vo}" title="صوت المقدّم">🎤</button><button class="snd" id="musBtn" aria-pressed="${ST.mus}" title="الموسيقى">🎵</button>${G&&G.pill&&!["lobby","end"].includes(H.ph)?G.pill():""}${inPlay()?`<button class="snd" id="pauseBtn" title="${H.paused?"كمّل":"وقّف مؤقتاً"}">${H.paused?"▶️":"⏸️"}</button>`:""}<span class="pill" style="direction:ltr">${ST.code}</span></div></div>`;
  let body="";
  if(H.paused&&inPlay()){
    body=`<div class="pausebox card center"><div style="font-size:90px;line-height:1">⏸️</div><h2 style="font-size:54px;color:var(--sun)">اللعبة متوقفة</h2>
      <p class="note" style="font-size:19px">الوقت واقف، وكل شي بيكمل من نفس المكان.</p>
      <button class="btn coral" id="resumeGame" style="font-size:26px">▶ كمّلوا اللعب</button>
      <div class="col center" style="margin-top:10px"><p class="note">تبي تُخرج أحد؟ اضغط ✕ مرتين:</p><div id="dyn" class="still">${kickRow(active())}</div></div>
      <button class="btn ghost" id="menuBtn">↩ أنهِ اللعبة وارجع للقائمة</button></div>`;
  }else if(H.ph==="menu"){
    body=`<div class="spread">${sayHTML(H.quip)}</div>
    <div class="lobby ${menuStyle()==="box"?"menu-box":""}">
      <div class="col center">${wheelHTML()}</div>
      ${joinPanel()}
    </div>`;
  }else if(H.ph==="lobby"){
    body=`<div class="lobby">
      <div class="card" style="justify-content:space-between">
        <div class="row lobhead"><span class="lobemoji">${G.emoji}</span><div style="flex:1;min-width:0"><h2 class="lobtitle">${G.name}${G.beta?' <span class="betatag">تجريبية</span>':""}</h2><p class="note" style="font-size:18px">${esc(G.desc)}</p></div></div>
        <div class="col lobrules">${G.rules.map(r=>`<p>• ${esc(r)}</p>`).join("")}</div>
        ${(G.options||[]).map(o=>`<div class="optrow"><span>${esc(o.label)}</span><div class="seg">${o.choices.map(([v,l])=>`<button class="segb" data-ok="${esc(o.key)}" data-ov="${esc(String(v))}" aria-pressed="${opt(o.key)===v}">${esc(l)}</button>`).join("")}</div></div>`).join("")}
        <div class="col">
          <button class="btn coral wide" id="startBtn" ${H.order.length<G.min?"disabled":""}>يلا نبدأ!</button>
          <div class="spread"><button class="btn ghost" id="menuBtn">↩ قائمة الألعاب</button>
          </div>
          <p class="note">من ${fmt(G.min)} إلى ${fmt(MAXP)} لاعبين. تقدر تلعب من نفس الكمبيوتر بفتح الرابط في تبويب ثانٍ.</p>
        </div>
      </div>
      ${joinPanel()}
    </div>`;
  }else if(H.ph==="end"&&G.noScore){
    // games without points end on a recap instead of a winner
    body=G.endHTML()+`<div class="row" style="justify-content:center"><button class="btn coral" id="againBtn">نلعب مرة ثانية</button><button class="btn" id="menuBtn">لعبة ثانية</button></div>`;
  }else if(H.ph==="end"){
    const ids=[...H.order].sort((a,b)=>(H.sc[b]||0)-(H.sc[a]||0)),w=ids[0];
    const fav=[...H.order].sort((a,b)=>(H.lk[b]||0)-(H.lk[a]||0))[0];
    body=`<div class="col center" style="gap:8px"><span class="crown">👑</span><div class="av lg" style="--c:${col(w)}">${face(w)}</div><div class="winner">${esc(nm(w))} ${esc(G.winTitle)}</div>
    ${fav&&H.lk[fav]?`<p class="bubble" style="margin-top:8px">😂 ${esc(G.likeTitle)}: ${esc(nm(fav))} (${fmt(H.lk[fav])} 👍)</p>`:""}</div>
    ${boardHTML()}
    <div class="row" style="justify-content:center"><button class="btn coral" id="againBtn">نفس اللعبة مرة ثانية</button><button class="btn" id="menuBtn">لعبة ثانية</button></div>`;
  }else if(H.ph==="topic"){
    body=`<div class="landing"><p class="lbl">الموضوع</p>${topicCardHTML(H.g.topic,"land")}${H.g.pickedBy?`<p class="note" style="font-size:20px">اختاره ${esc(nm(H.g.pickedBy))}</p>`:""}</div>`;
  }else body=G.render();
  const skip=!H.paused&&(["pick","lie","choose","scores","draw","ask","vote","guess"].includes(H.ph)||(G&&(G.timed||[]).includes(H.ph)))&&!(H.game==="sawalif"&&H.ph==="ask")?`<div class="row"><button class="btn ghost" id="skipBtn">تخطَّ الوقت ⏭</button></div>`:"";
  root.innerHTML=bar+body+skip;
  root.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{initAudio();wheelSelect(b.dataset.g)});
  const sp=$("spinBtn");if(sp)sp.onclick=()=>{initAudio();wheelSpin()};
  const stb=$("styleBtn");if(stb)stb.onclick=()=>{if(!H.wheel.spinning)setMenuStyle(menuStyle()==="box"?"shelf":"box")};
  const pg=$("playSel");if(pg)pg.onclick=()=>{initAudio();if(H.wheel&&H.wheel.sel)pickGame(H.wheel.sel)};
  root.querySelectorAll("[data-ok]").forEach(b=>b.onclick=()=>{const o=(G.options||[]).find(x=>x.key===b.dataset.ok);const c=o&&o.choices.find(c=>String(c[0])===b.dataset.ov);
    if(c){setOpt(o.key,c[0]);root.querySelectorAll(`[data-ok="${o.key}"]`).forEach(x=>x.setAttribute("aria-pressed",x===b));sfx.pop()}});
  if(H.ph==="menu")wheelPaint();
  const sb=$("startBtn");if(sb)sb.onclick=()=>{initAudio();if(H.order.length>=G.min)startGame()};
  const mb=$("menuBtn");if(mb)mb.onclick=goMenu;
  const pb=$("pauseBtn");if(pb)pb.onclick=()=>setPaused(!H.paused);
  const rg=$("resumeGame");if(rg)rg.onclick=()=>setPaused(false);
  const vb=$("voBtn");if(vb)vb.onclick=()=>{setVoiceOn(!ST.vo);vb.setAttribute("aria-pressed",ST.vo)};
  const mu=$("musBtn");if(mu)mu.onclick=()=>{setMusicOn(!ST.mus);mu.setAttribute("aria-pressed",ST.mus)};
  const ab=$("againBtn");if(ab)ab.onclick=()=>pickGame(H.game);
  const kb=$("skipBtn");if(kb)kb.onclick=()=>{if(Date.now()-(H._skipAt||0)<1500)return;H._skipAt=Date.now();kb.disabled=true;skipNow(true)};
  if(G&&G.after)G.after();
  if(H.ph==="pick"&&G&&G.spotNames)runSpot(G.spotNames());
  else{stopSpot();setThemeBg(H.ph==="topic"?H.g.topic:(G&&G.themeName?G.themeName():null))}
}

/* ================= BLUFF ENGINE (shared by فبركة and ارسمها) ================= */
// g.truth, g.alts, g.decoys, g.ex (artist who can't play this item)
function bluffLie(g,secs){g.lies={};g.bad={};H.ph="lie";H.k++;setTimer(secs);sfx.go()}
function bluffTickLie(g,now){
  const truths=[g.truth,...(g.alts||[])].map(norm);
  H.order.forEach(id=>{if(id===g.ex)return;const a=actOf(id);if(!a||typeof a.lie!=="string"||(g.lies[id]&&g.lies[id].n===a.n)||g.bad[id]===a.n)return;
    const t=clip(a.lie,40);if(!t)return;
    if(nearTruth(t,truths)){g.bad[id]=a.n;return}
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
  g.rvI=0;g.nextAt=Date.now()+stepLen(g);H.ph="reveal";H.k++;bluffFx(g);
}
const TRUTH_DELAY=3600;
const stepLen=g=>{const s=g.rv[g.rvI];return s&&s.t?T_REVEAL+TRUTH_DELAY:T_REVEAL};
function bluffFx(g){const s=g.rv[g.rvI];if(!s)return;
  if(s.t){ // "والحقيقة هي…" first, then the truth appears
    playVO(VO.truthIntro,{queue:false});
    setTimeout(()=>{sfx.truth();if(s.f.length){confetti();sfx.coin(.9)}
      playVO(s.f.length?(g.ex&&s.ap?VO.artist:VO.truth):VO.notruth,{queue:false})},TRUTH_DELAY+800);
    return}
  playSting("sting_reveal",sfx.drum);
  setTimeout(()=>{sfx.lie();if(s.f.length)sfx.coin(2.3);const p=playVO(VO.lie1,{queue:false});if(s.f.length&&p)p.then(()=>playVO(VO.fooled))},1600);
  if(!s.f.length)setTimeout(()=>playVO(VO.nobody),2400);
}
function bluffTickReveal(g,now){if(now<=g.nextAt)return false;g.rvI++;if(g.rvI>=g.rv.length)return true;g.nextAt=now+stepLen(g);bluffFx(g);return false}
function bluffView(g,v){
  if(H.ph==="lie"){v.done=Object.keys(g.lies);v.bad=g.bad;v.ex=g.ex||null}
  if(H.ph==="choose"){v.opts=g.opts.map(o=>o.t);v.done=Object.keys(g.choices);v.ex=g.ex||null}
  if(H.ph==="reveal")v.rvI=g.rvI;
}
function bluffRevealHTML(g,stageHTML){
  const s=g.rv[g.rvI],o=g.opts[s.o];
  const fooled=s.f.length?s.f.map((id,i)=>plHTML(id,"",i)).join(""):`<span class="note" style="font-size:20px">ما أحد اختارها!</span>`;
  let who;
  if(s.t)who=s.f.length?`<span>${s.f.map(id=>esc(nm(id))).join("، ")} عرفوها</span><span class="pts">+${fmt(s.p)}</span>${g.ex&&s.ap?`<span>· ${esc(nm(g.ex))} الرسام</span><span class="pts">+${fmt(s.ap)}</span>`:""}`:`<span>ولا أحد عرفها!</span>`;
  else who=o.a.length?`${o.a.map(id=>`<div class="av sm" style="--c:${col(id)}">${face(id)}</div>`).join("")}<span>كذبة ${o.a.map(id=>esc(nm(id))).join(" و")}</span><span class="pts">+${fmt(s.p)}</span>`:`<span>كذبة من عندنا 😏</span>`;
  return`<div class="col ${s.t?"late":""}" style="gap:20px">`+stageHTML(s.t)+`<div class="reveal ${g.ex?"tight":""}">
      <div class="answer">${esc(o.t)}</div>
      <div class="fooled">${s.t?(s.f.length?fooled:""):`<span class="note" style="font-size:19px">صدّقها:</span>${fooled}`}</div>
      <div class="stamp ${s.t?"truth":"lie"}">${s.t?"الحقيقة!":"كذبة!"}</div>
      <div class="who">${who}</div>
      <div class="quip">🎤 ${esc(s.q)}</div>
    </div></div>`;
}
function bluffDyn(g){
  if(H.ph==="lie")return troupe(H.order,new Set(Object.keys(g.lies)),g.ex);
  if(H.ph==="choose")return troupe(H.order,new Set(Object.keys(g.choices)),g.ex);
  return"";
}
const optsHTML=g=>`<div class="opts">${g.opts.map((o,i)=>`<div class="opt" dir="auto" style="--o:${OPTC[i%OPTC.length]};animation-delay:${i*.08}s">${esc(o.t)}</div>`).join("")}</div>`;

/* ================= GAME: فبركة ================= */
// question multipliers: first part ×1, then ×2, and the last «الفبركة الأخيرة» ×3
const fabSteps=n=>{const a=Math.ceil((n-1)/2),b=n-1-a;return[...Array(a).fill(1),...Array(b).fill(2),3]};
const FAB={
  id:"fabraka",name:"فبركة",emoji:"🤥",color:"#ffcc33",min:2,
  desc:"حقائق غريبة لدرجة إنها تبدو كذب. اكتب كذبة تخدع أصحابك واكتشف الحقيقة.",
  tags:["٢-٨ لاعبين","كتابة","١٥ دقيقة"],
  rules:["تطلع حقيقة غريبة فيها فراغ","كل واحد يكتب كذبة مقنعة تكمّل الفراغ","تختارون وش الحقيقة بين الأكاذيب","تاخذ نقاط إذا عرفت الحقيقة، أو إذا انخدعوا بكذبتك"],
  winTitle:"أكبر مفبرك!",likeTitle:"أظرف كذّاب",
  used:new Set((()=>{try{return JSON.parse(localStorage.getItem("fabraka_used")||"[]")}catch(e){return[]}})()),
  okLang(q){return opt("lang")==="both"||q.l!=="en"},
  topics(){const have=new Set(QS.filter(q=>this.okLang(q)).map(q=>q.t));return[...TOPICS.filter(t=>have.has(t)),...[...have].filter(t=>!TOPICS.includes(t))]},
  fresh(topic){const inT=QS.map((_,i)=>i).filter(i=>(!topic||QS[i].t===topic)&&this.okLang(QS[i]));let pool=inT.filter(i=>!this.used.has(QS[i].id));
    if(!pool.length){inT.forEach(i=>this.used.delete(QS[i].id));pool=inT}
    // «عربي + English»: about half the questions in each language
    if(opt("lang")==="both"){const want=Math.random()<.5?"en":"ar";return shuffle(pool).sort((x,y)=>((QS[x].l==="en")===(want==="en")?0:1)-((QS[y].l==="en")===(want==="en")?0:1))}
    return shuffle(pool)},
  choose(t,by){goTopic(t,()=>this.afterTopic(t),by)},
  afterTopic(t){const f=this.fresh(t);if(!f.length)return this.next();this.lie(f[0])},
  mark(i){this.used.add(QS[i].id);try{localStorage.setItem("fabraka_used",JSON.stringify([...this.used]))}catch(e){}},
  start(){H.g={step:-1};this.next()},
  options:[roundsOpt([4,7,10],7,"عدد الأسئلة"),{key:"lang",label:"لغة الأسئلة",choices:[["ar","عربي فقط"],["both","عربي + English"]],def:"ar"}],
  m(){const s=H.g.steps||fabSteps(7);return s[Math.max(0,H.g.step)]||1},
  next(){const g=H.g;g.step++;H.k++;
    if(!g.steps)g.steps=fabSteps(opt("r"));if(g.step>=g.steps.length)return finishGame();
    if(this.m()===3){H.quip=pick(QUIP.final);return this.choose(pick(this.topics()))}
    const act=active();g.picker=act[g.step%Math.max(1,act.length)]||null;g.pick=this.topics();
    H.ph="pick";H.quip=pick(QUIP.pick);setTimer(20)},
  lie(qi){const g=H.g,q=QS[qi];this.mark(qi);g.q=qi;g.truth=q.a;g.alts=q.alt;g.decoys=q.d;g.ex=null;
    bluffLie(g,60);if(this.m()!==3)H.quip=pick(QUIP.lie)},
  tick(now){const g=H.g;
    if(H.ph==="pick"){const a=g.picker&&actOf(g.picker);
      if(a&&Number.isInteger(a.pick)&&g.pick[a.pick]!==undefined)this.choose(g.pick[a.pick],g.picker);
      else if(!g.picker||!active().includes(g.picker)||now>H.end||g.forceSkip){g.forceSkip=false;this.choose(pick(g.pick))}}
    else if(H.ph==="lie"){if(bluffTickLie(g,now)){bluffChoose(g,30);H.quip=pick(QUIP.choose)}}
    else if(H.ph==="choose"){if(bluffTickChoose(g,now))bluffReveal(g,this.m(),0)}
    else if(H.ph==="reveal"){if(bluffTickReveal(g,now)){H.ph="scores";H.k++;setTimer(8);H.quip=pick(QUIP.scores)}}
    else if(H.ph==="scores"){if(now>H.end)this.next()}},
  view(v){const g=H.g;v.m=this.m();
    if(H.ph==="pick"){v.picker=g.picker;v.cats=g.pick}
    if(H.ph==="lie"||H.ph==="choose"){v.q=QS[g.q].q;v.ql=QS[g.q].l||"ar"}
    bluffView(g,v)},
  pill(){const m=this.m();return`<span class="pill ${m===3?"x":""}">${m===3?"الفبركة الأخيرة":m===2?"الجولة الثانية":"الجولة الأولى"}${m>1?` · ×${fmt(m)}`:""}</span>`},
  spotNames(){return H.g.pick},
  themeName(){const g=H.g;return["lie","choose","reveal"].includes(H.ph)&&QS[g.q]?QS[g.q].t:null},
  ticket(fill){const q=QS[H.g.q];return`<div class="ticket" ${fill!==undefined?'style="animation:none"':""}><span class="cat">${theme(q.t).e} ${esc(q.t)}</span><p class="qtext" dir="${q.l==="en"?"ltr":"rtl"}">${blankify(q.q,fill?q.a:"")}</p></div>`},
  render(){const g=H.g;
    if(H.ph==="pick")return`<div class="spread"><div class="row"><div class="av lg" style="--c:${col(g.picker)}">${face(g.picker)}</div><h2 style="font-size:clamp(30px,calc(var(--sw)*0.04),46px)">${esc(nm(g.picker))} يختار الموضوع…</h2></div>${ringHTML()}</div>
      ${spotlightHTML(g.pick)}`;
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
  // drawing time on the phones, picked in the lobby
  options:[roundsOpt([1,2,3],2),{key:"dt",label:"وقت الرسم",choices:[["90","دقيقة ونص"],["150","دقيقتين ونص"],["240","٤ دقايق"]],def:"150"}],
  start(){H.g={round:0,rounds:opt("r")};this.newRound()},
  newRound(){const g=H.g;g.round++;
    let pool=DRAW.filter(p=>!this.used.has(p));if(pool.length<H.order.length+6){this.used.clear();pool=[...DRAW]}
    pool=shuffle(pool);g.prompts={};active().forEach(id=>{const p=pool.pop();g.prompts[id]=p;this.used.add(p)});
    g.drawings={};g.queue=[];H.ph="draw";H.k++;setTimer(+opt("dt")||150);H.quip=pick(QUIP.draw);sfx.go()},
  nextDrawing(){const g=H.g;
    if(!g.queue.length){H.ph="scores";H.k++;setTimer(8);H.quip=pick(QUIP.scores);return}
    g.ex=g.queue.shift();g.truth=g.prompts[g.ex];g.alts=[];
    const others=Object.values(g.prompts).filter(p=>p!==g.truth);
    g.decoys=shuffle([...others,...shuffle(DRAW.filter(p=>!Object.values(g.prompts).includes(p))).slice(0,4)]).slice(0,6);
    bluffLie(g,45);H.quip=pick(QUIP.dlie)},
  tick(now){const g=H.g;
    if(H.ph==="draw"){
      H.order.forEach(id=>{const a=actOf(id);if(a&&typeof a.draw==="string"&&/^[0-9A-Za-z]{10,40}$/.test(a.draw)&&!g.drawings[id])fetchDrawing(g,id,a.draw)});
      const need=active().filter(id=>g.prompts[id]);
      const all=need.length&&need.every(id=>g.drawings[id]);
      // when time is up, phones auto-send what they drew: give the uploads a few seconds
      if(!all&&(now>H.end||g.forceSkip)){if(!g.graceAt)g.graceAt=now+4500;if(now<g.graceAt)return}
      if(all||now>H.end||g.forceSkip){g.forceSkip=false;g.graceAt=0;
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
  pill(){const g=H.g;return`<span class="pill ${g.round>1?"x":""}">الجولة ${fmt(g.round)} من ${fmt(g.rounds)}${g.round>1?` · ×${fmt(g.round)}`:""}</span>`},
  frame(small){const g=H.g;return`<div class="col center"><div class="frame ${small?"small":""}"><canvas id="art"></canvas></div><div class="artist"><div class="av sm" style="--c:${col(g.ex)}">${face(g.ex)}</div>رسمة ${esc(nm(g.ex))}</div></div>`},
  render(){const g=H.g;
    if(H.ph==="draw")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="col center" style="gap:18px"><span style="font-size:110px;line-height:1">🖍️</span><h2 style="font-size:clamp(34px,calc(var(--sw)*0.05),56px)">كل واحد يرسم موضوعه السري بجواله</h2><p class="note" style="font-size:19px">لا تخلون أحد يشوف جوالكم!</p></div>
      <div id="dyn" class="still">${troupe(H.order,new Set(Object.keys(g.drawings)))}</div>`;
    if(H.ph==="lie")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="easel">${this.frame()}<div class="col" style="justify-content:center;gap:18px"><h2 style="font-size:clamp(30px,calc(var(--sw)*0.04),48px)">وش هذي الرسمة؟ 🤔</h2><p style="font-weight:700;font-size:20px">اكتبوا عنوان يقنع الكل إنه هو اللي كان يرسمه ${esc(nm(g.ex))}.</p><div id="dyn" class="still">${bluffDyn(g)}</div></div></div>`;
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
  options:[roundsOpt([3,5,8],5)],
  start(){H.g={round:0,rounds:opt("r")};this.next()},
  next(){const g=H.g;g.round++;H.k++;
    if(g.round>g.rounds)return finishGame();
    const act=active();g.picker=act[(g.round-1)%Math.max(1,act.length)]||null;
    g.cats=Object.keys(WORDS).filter(c=>(WORDS[c]||[]).length>=2);if(!g.cats.length)return finishGame();
    H.ph="pick";setTimer(20);H.quip="مين بيختار الموضوع؟ 🤔"},
  afterTopic(c){this.begin(c)},
  begin(cat){const g=H.g,act=active();g.cat=cat;g.word=pick(WORDS[cat]);g.out=pick(act);g.players=[...act];
    const ring=shuffle(act);g.pairs=[];for(let r=0;r<2;r++)ring.forEach((id,i)=>g.pairs.push([id,ring[(i+1)%ring.length]]));
    g.rvI=0;g.pairAt=Date.now()+20000;g.ready={};H.ph="ask";H.k++;setTimer(180);sfx.go();
    H.quip=pick(["كل واحد يسأل سؤال ذكي… لا تفضحون السالفة!","اللي برا السالفة الحين يعرق 😅","ركّزوا في الأجوبة… فيه واحد يألّف"])},
  tick(now){const g=H.g;
    if(H.ph==="pick"){const a=g.picker&&actOf(g.picker);
      if(a&&Number.isInteger(a.pick)&&g.cats[a.pick]){const c=g.cats[a.pick];goTopic(c,()=>this.afterTopic(c),g.picker)}
      else if(!g.picker||!active().includes(g.picker)||now>H.end||g.forceSkip){g.forceSkip=false;const c=pick(g.cats);goTopic(c,()=>this.afterTopic(c))}}
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
  vote(){const g=H.g;g.votes={};H.ph="vote";H.k++;setTimer(40);sfx.go();H.quip="مين برا السالفة؟ صوّتوا من جوالاتكم 🗳️"},
  tally(){const g=H.g,count={};Object.values(g.votes).forEach(t=>count[t]=(count[t]||0)+1);g.count=count;
    const max=Math.max(0,...Object.values(count)),tops=Object.keys(count).filter(id=>count[id]===max);
    g.caught=max>0&&tops.length===1&&tops[0]===g.out;
    Object.entries(g.votes).forEach(([id,t])=>{if(t===g.out&&id!==g.out)H.sc[id]=(H.sc[id]||0)+500});
    if(!g.caught)H.sc[g.out]=(H.sc[g.out]||0)+1500;
    H.ph="tally";H.k++;setTimer(7);playSting("sting_reveal",sfx.drum);setTimeout(()=>{g.caught?sfx.truth():sfx.lie();playVO(g.caught?VO.caught:VO.escaped,{queue:false})},1600);
    if(g.caught)setTimeout(()=>confetti(),1700)},
  guess(){const g=H.g;g.opts=shuffle([g.word,...shuffle(WORDS[g.cat].filter(w=>w!==g.word)).slice(0,7)]);g.guessed=null;
    H.ph="guess";H.k++;setTimer(25);H.quip="فرصته الأخيرة… إذا عرف السالفة ياخذ نقاط!"},
  result(){const g=H.g;g.right=g.guessed===g.word;if(g.right)H.sc[g.out]=(H.sc[g.out]||0)+1000;
    H.ph="result";H.k++;setTimer(8);sfx.truth()},
  view(v){const g=H.g;v.m=g.round;
    if(H.ph==="pick"){v.picker=g.picker;v.cats=g.cats}
    if(["ask","vote"].includes(H.ph)){v.cat=g.cat;v.w=g.word;v.out=g.out;v.pl=g.players}
    if(H.ph==="ask"){v.ready=Object.keys(g.ready)}
    if(H.ph==="vote"){v.done=Object.keys(g.votes)}
    if(H.ph==="guess"){v.out=g.out;v.opts=g.opts;v.cat=g.cat}
    if(["tally","result","scores"].includes(H.ph))v.sc=H.sc},
  pill(){const g=H.g;return`<span class="pill">الجولة ${fmt(g.round)} من ${fmt(g.rounds)}</span>`},
  spotNames(){return H.g.cats},
  themeName(){return["ask","vote","tally","guess","result"].includes(H.ph)?H.g.cat:null},
  render(){const g=H.g;
    if(H.ph==="pick")return`<div class="spread"><div class="row"><div class="av lg" style="--c:${col(g.picker)}">${face(g.picker)}</div><h2 style="font-size:clamp(30px,calc(var(--sw)*0.04),46px)">${esc(nm(g.picker))} يختار الموضوع…</h2></div>${ringHTML()}</div>
      ${spotlightHTML(g.cats)}`;
    if(H.ph==="ask"){const [a,b]=g.pairs[g.rvI]||[];
      return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="ticket" style="text-align:center"><span class="cat">الموضوع: ${esc(g.cat)}</span><p class="qtext">الكل يعرف السالفة… إلا واحد 🕵️</p></div>
      <div class="pair" id="pairBox"><div class="pl" style="width:auto"><div class="av lg" style="--c:${col(a)}">${face(a)}</div><span style="font-size:24px">${esc(nm(a))}</span></div>
        <span class="arrow">يسأل ←</span>
        <div class="pl" style="width:auto"><div class="av lg" style="--c:${col(b)}">${face(b)}</div><span style="font-size:24px">${esc(nm(b))}</span></div></div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="nextQ">السؤال التالي ⏭</button><button class="btn coral" id="toVote">خلّصنا، يلا نصوّت 🗳️</button></div>
      <div id="dyn" class="still">${this.dyn()}</div>`}
    if(H.ph==="vote")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">🗳️</span><h2 style="font-size:clamp(34px,calc(var(--sw)*0.05),56px)">مين برا السالفة؟</h2></div>
      <div id="dyn" class="still">${this.dyn()}</div>`;
    if(H.ph==="tally"){
      const tro=g.players.map((id,i)=>`<div class="pl" style="--i:${i};position:relative"><div class="av lg" style="--c:${col(id)}">${face(id)}${g.count[id]?`<span class="vote-n">${fmt(g.count[id])}</span>`:""}</div><span>${esc(nm(id))}</span></div>`).join("");
      return`<h2 style="font-size:40px;text-align:center">نتيجة التصويت</h2><div class="troupe">${tro}</div>
      <div class="reveal"><div class="row" style="justify-content:center;animation:fade .3s 1.2s both"><div class="av lg" style="--c:${col(g.out)}">${face(g.out)}</div><span style="font-family:var(--display);font-size:clamp(30px,calc(var(--sw)*0.04),48px)">${esc(nm(g.out))} كان برا السالفة!</span></div>
      <div class="stamp ${g.caught?"truth":"lie"}">${g.caught?"انكشف!":"هرب منكم!"}</div>
      <div class="who">${g.caught?"<span>اللي صوّتوا صح</span><span class=\"pts\">+٥٠٠</span>":`<span>${esc(nm(g.out))}</span><span class="pts">+١٬٥٠٠</span>`}</div></div>`}
    if(H.ph==="guess")return`<div class="spread">${sayHTML(H.quip)}${ringHTML()}</div>
      <div class="row" style="justify-content:center"><div class="av lg" style="--c:${col(g.out)}">${face(g.out)}</div><h2 style="font-size:clamp(30px,calc(var(--sw)*0.04),46px)">${esc(nm(g.out))} يحاول يخمّن السالفة…</h2></div>
      <div class="opts">${g.opts.map((o,i)=>`<div class="opt" style="--o:${OPTC[i%OPTC.length]};animation-delay:${i*.06}s">${esc(o)}</div>`).join("")}</div>`;
    if(H.ph==="result")return`<div class="reveal" style="padding-top:20px"><p class="note" style="font-size:22px">السالفة كانت:</p><div class="answer">${esc(g.word)}</div>
      ${g.caught?`<div class="stamp ${g.right?"truth":"lie"}">${g.right?"عرفها!":"ما عرفها"}</div><div class="who"><div class="av sm" style="--c:${col(g.out)}">${face(g.out)}</div><span>${esc(nm(g.out))} ${g.guessed?`خمّن «${esc(g.guessed)}»`:"ما لحق يخمّن"}</span>${g.right?'<span class="pts">+١٬٠٠٠</span>':""}</div>`:`<div class="quip" style="animation-delay:.6s">🎤 ${esc(nm(g.out))} ضحك عليكم كلكم 😂</div>`}</div>`;
    if(H.ph==="scores")return`<div class="spread"><h2 style="font-size:46px">🏁 الترتيب</h2>${ringHTML()}</div>${sayHTML(H.quip)}${boardHTML()}`;
    return""},
  after(){const g=H.g;
    const n=$("nextQ");if(n)n.onclick=()=>{if(g.rvI<g.pairs.length-1){g.rvI++;g.pairAt=Date.now()+20000;sfx.join()}};
    const t=$("toVote");if(t)t.onclick=()=>{t.disabled=true;skipNow(false)}},
  dyn(){const g=H.g;
    if(H.ph==="ask"){const r=new Set(Object.keys(g.ready));return troupe(g.players,r)+`<p class="note center">اللي ضغطوا «جاهز للتصويت»: ${fmt(r.size)} من ${fmt(g.players.length)}</p>`}
    if(H.ph==="vote")return troupe(g.players,new Set(Object.keys(g.votes)));
    return""},
};
const GAMES={fabraka:FAB,arsimha:DRW,sawalif:SAL};
/* Beta games live in /js/sahra-beta.js and plug in through this kit. */
const KIT={H,ME:null,esc,clip,pick,fmt,norm,nearTruth,shuffle,$,sfx,playSting,playVO,VO,confetti,setTimer,tl,active,nm,col,face,
  act:id=>actOf(id),plHTML,troupe,ringHTML,sayHTML,boardHTML,finishGame,QUIP,OPTC,COLORS,FACES,INK,theme,paint,cleanStrokes,api,colorOf,
  sendAct:a=>sendAct(a),drawPad:(b,v,i)=>drawPad(b,v,i),autoSend:f=>{ME.autoSend=f},me:()=>myPeer,code:()=>ST.code,
  commercial:CFG.edition==="commercial",avImg,opt:k=>opt(k),roundsOpt,okDraw:x=>typeof x==="string"&&/^[0-9A-Za-z]{10,40}$/.test(x),
  // drops items that use other companies' titles/characters in the commercial edition
  own:list=>CFG.edition==="commercial"?list.filter(x=>!x.lic):list};
(window.SAHRA_BETA||[]).forEach(make=>{try{const g=make(KIT);if(g&&g.id&&!GAMES[g.id])GAMES[g.id]={more:true,...g}}catch(e){console.error("sahra beta",e)}});
addEventListener("resize",()=>{if(role==="host"&&H.game==="arsimha"&&$("art"))paint($("art"),H.g.drawings[H.g.ex],H.g.ex,false)});

/* ================= PLAYER ================= */
const ME={n:0,myLie:"",lastKey:"",ch:null,lk:new Set()};
function startPlayer(){
  role="player";
  const myAv=ST.av&&ST.av.startsWith("p:")?ST.av:"";
  room.presence({role:"player",code:ST.code,nm:ST.nick,av:myAv,act:null}).catch(()=>{});
  if(ST.av==="s"&&ST.selfie)api("POST","/rooms/"+ST.code+"/avatars",{image:ST.selfie}).then(r=>room.presence({av:"u:"+r.id})).catch(()=>{});
  room.onPeers(()=>renderPlayer());
  onFound=()=>{if(ME.lost){ME.lost=false;ME.lastKey="";renderPlayer()}};
  onLost=()=>{ME.lost=true;root.innerHTML=`<div class="emoji">🔌</div><p class="big">انقطع الاتصال</p><p class="note center">الشاشة الكبيرة انقفلت أو النت فصل.<br>إذا رجعت بنرجعك تلقائياً 🔄</p><button class="btn wide" id="rj">ادخل من جديد</button>`;$("rj").onclick=()=>location.reload()};
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
  setThemeBg(v?(v.ph==="topic"?v.topic:v.theme):null);
  const idx=v&&Array.isArray(v.order)?v.order.indexOf(myPeer):-1;
  const c=idx>=0?COLORS[idx%8]:"#a99bd9",f=avImg(v&&v.av&&v.av[myPeer],idx>=0?FACES[idx%8]:"🙂");
  const head=`<div class="phead"><span class="me"><div class="av sm" style="--c:${c}">${f}</div><span>${esc(ST.nick)}</span></span><span class="pill" style="direction:ltr">${esc(ST.code)}</span></div>`;
  if(!v){if(ME.lastKey!=="none"){ME.lastKey="none";root.innerHTML=head+`<div class="emoji">📡</div><p class="big">بانتظار الشاشة الكبيرة…</p>`}return}
  if(myPeer&&Array.isArray(v.kick)&&v.kick.includes(myPeer)){ME.lost=true;rememberKick(ST.code);try{pusher&&pusher.disconnect()}catch(_){}
    root.innerHTML=`<div class="emoji">🚪</div><p class="big">تم إخراجك من الغرفة</p><p class="note center">المضيف أخرجك من هذي السهرة.</p><a class="btn wide" href="/" style="text-align:center;text-decoration:none">الصفحة الرئيسية</a>`;return}
  if(v.paused){if(ME.lastKey!=="paused"){ME.lastKey="paused";root.innerHTML=head+`<div class="emoji">⏸️</div><p class="big">اللعبة متوقفة</p><p class="note center">استريحوا شوي… بنكمل من نفس المكان 😌</p>`}return}
  const key=[v.game,v.ph,v.k,v.rvI,idx>=0].join("|");
  if(key===ME.lastKey){
    if(v.ph==="lie"&&$("perr")){const bad=v.bad&&v.bad[myPeer]===ME.n&&ME.n>0;const done=(v.done||[]).includes(myPeer);
      if(bad&&!ME.shownBad){ME.shownBad=true;showLieForm(v,"",true)}
      else if(done&&!ME.shownDone){ME.shownDone=true;$("lieArea").innerHTML=`<div class="emoji">🤫</div><p class="big">تم!</p><p class="note center">كذبتك: «${esc(ME.myLie)}»<br>خلك طبيعي… لا تفضح نفسك.</p>`}}
    if(v.ph==="draw"&&(v.done||[]).includes(myPeer)&&!ME.drawShown){ME.drawShown=true;$("drawArea").innerHTML=`<div class="emoji">🖼️</div><p class="big">وصلت رسمتك!</p><p class="note center">انتظر الباقين يخلّصون.</p>`}
    const t=$("ptl");if(t)t.textContent=Number(v.tl)||0;
    if(ME.padSend&&ME.padK===v.k&&v.tl<=3)ME.padSend();
    // time is up: send whatever the player typed, they don't have to press the button
    if(ME.autoSend&&v.tl<=1){const f=ME.autoSend;ME.autoSend=null;try{f()}catch(e){}}
    const Gl=GAMES[v.game];if(Gl&&Gl.phoneLive&&idx>=0)Gl.phoneLive(v);
    return;
  }
  ME.lastKey=key;ME.padSend=null;ME.autoSend=null;
  if(idx<0){root.innerHTML=head+((v.ph==="menu"||v.ph==="lobby")?((v.order||[]).length>=MAXP?`<div class="emoji">🙈</div><p class="big">الغرفة ممتلئة</p><p class="note center">فيها ${fmt(MAXP)} لاعبين. تقدر تتفرج وتدخل لما يطلع أحد.</p>`:`<div class="emoji">⏳</div><p class="big">لحظة…</p>`):`<div class="emoji">🍿</div><p class="big">اللعبة بدأت</p><p class="note center">تابع من الشاشة، وتدخل في اللعبة الجاية.</p>`);return}
  const tline=`<p class="note">⏱ باقي <b id="ptl">${Number(v.tl)||0}</b> ثانية</p>`;
  const myMon=()=>{const s=(v.order||[]).indexOf(myPeer);return s<0?"":`<div class="mymon">${monHTML(s,COLORS[s%8],"big")}<button class="btn sing" id="singBtn">🎤 غنّ!</button><p class="note center">وحشك يغني على الشاشة الكبيرة 🎶</p></div>`};
  const wireSing=()=>{const b=$("singBtn");if(b)b.onclick=()=>{sendAct({k:v.k,sing:Date.now()});const m=root.querySelector(".mymon .mon");if(m){m.classList.remove("shout");void m.offsetWidth;m.classList.add("shout")}}};
  if(v.ph==="menu"){root.innerHTML=head+`<p class="big">أنت داخل!</p>${myMon()}<p class="note center">المضيف يختار اللعبة الحين… 👀</p>`;wireSing();return}
  if(v.ph==="lobby"){const G=GAMES[v.game];root.innerHTML=head+`<p class="big">${G?G.emoji+" "+G.name:""}</p><p class="note center">${G?esc(G.desc):""}<br>اللعبة بتبدأ قريب، ناظر الشاشة.</p>${myMon()}`;wireSing();return}
  if(v.ph==="pick"){
    if(v.picker===myPeer){root.innerHTML=head+`<h2 style="font-size:30px">اختر الموضوع 👇</h2>${tline}<div class="tgrid">${(v.cats||[]).map((cc,i)=>{const t=theme(cc);return`<button class="pbtn tbtn" data-i="${i}" style="--a:${t.a};--b:${t.b}"><span>${t.e}</span>${esc(cc)}</button>`}).join("")}</div>`;
      root.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{sendAct({k:v.k,pick:+b.dataset.i});root.querySelectorAll("[data-i]").forEach(x=>x.disabled=true)})}
    else root.innerHTML=head+`<div class="emoji">🤔</div><p class="big">${esc(v.nm?.[v.picker]||"لاعب")} يختار الموضوع…</p>`;
    return;
  }

  if(v.ph==="topic"){root.innerHTML=head+`<div class="landing" style="margin-top:calc(var(--sh)*0.06)"><p class="lbl">الموضوع</p>${topicCardHTML(v.topic,"land")}${v.picker?`<p class="note center">اختاره ${esc(v.nm?.[v.picker]||"")}</p>`:""}</div>`;return}
  if(v.game==="sawalif"&&["ask","vote","tally","guess","result"].includes(v.ph)){salPlayer(v,head,f);return}
  {const Gp=GAMES[v.game];if(Gp&&Gp.phone&&v.ph!=="end"){root.innerHTML=head;Gp.phone(v,{root,head,tline,idx,me:myPeer});return}}
  if(v.ph==="draw"){
    ME.drawShown=false;const prompt=v.prompts&&v.prompts[myPeer];
    if(!prompt){root.innerHTML=head+`<div class="emoji">🍿</div><p class="big">تفرّج على الباقين</p>`;return}
    root.innerHTML=head+`<div class="drawwhat">ارسم: <b>${esc(prompt)}</b></div>${tline}<div id="drawArea"></div>`;
    drawPad($("drawArea"),v,idx);return;
  }
  const qhtml=v.game==="fabraka"?blankify(v.q||""):esc(v.q||"");
  if(v.ph==="lie"){ME.shownBad=false;ME.shownDone=false;ME.myLie="";
    if(v.ex===myPeer){root.innerHTML=head+`<div class="emoji">😎</div><p class="big">هذي رسمتك!</p><p class="note center">اجلس وتفرّج على الأكاذيب.</p>`;return}
    root.innerHTML=head+`<p class="pq" dir="auto">${qhtml}</p>${tline}<div id="lieArea"></div><p class="err" id="perr"></p>`;
    showLieForm(v,"");return}
  if(v.ph==="choose"){
    if(v.ex===myPeer){root.innerHTML=head+`<div class="emoji">🙈</div><p class="big">لا تساعدهم!</p><p class="note center">خلّهم يخمّنون وش رسمت.</p>`;return}
    ME.ch=null;ME.lk=new Set();const mine=norm(ME.myLie);
    root.innerHTML=head+`<p class="pq" dir="auto">${qhtml}</p>${tline}<h3 style="font-size:24px">وين الحقيقة؟ 🔍</h3><div class="col" id="chs">${(v.opts||[]).map((o,i)=>{const own=mine&&norm(o)===mine;return`<button class="pbtn" data-i="${i}" style="--o:${OPTC[i%OPTC.length]}" ${own?"disabled":""}>${esc(o)}${own?" (كذبتك 😏)":""}</button>`}).join("")}</div>`;
    root.querySelectorAll("#chs [data-i]").forEach(b=>b.onclick=()=>{ME.ch=+b.dataset.i;sendAct({k:v.k,ch:ME.ch,lk:[...ME.lk]});showLikes(v,mine)});
    return;
  }
  if(v.ph==="reveal"||v.ph==="scores"){
    root.innerHTML=head+`<div class="emoji">👀</div><p class="big">ناظر الشاشة!</p><p class="note center">نقاطك: <b>${fmt(v.sc?.[myPeer])}</b></p>`;return}
  if(v.ph==="end"&&GAMES[v.game]&&GAMES[v.game].noScore){root.innerHTML=head+`<div class="emoji">😂</div><p class="big">ضحكنا للين ما قدرنا!</p><p class="note center">ناظروا الشاشة 👀</p>`;return}
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
      <div class="col" id="vts">${others.map((id,i)=>{const j=(v.order||[]).indexOf(id);return`<button class="pbtn" data-v="${esc(id)}" style="--o:${COLORS[j%8]}">${avImg(v.av&&v.av[id],FACES[j%8]).replace('class="avimg"','class="avimg inl"')} ${esc(v.nm?.[id]||"لاعب")}</button>`}).join("")}</div>`;
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
function showLieForm(v,err,found){
  const a=$("lieArea");if(!a)return;
  if(found)sfx.truth();
  a.innerHTML=(found?`<div class="found"><div class="emoji">🎉</div><p class="big">مبروك! لقيت الإجابة الصحيحة</p><p class="note center">بس لا تقولها لأحد 🤫 الحين اكتب كذبة واضحك عليهم 😈</p></div>`:"")+`<div class="col"><input type="text" id="lieIn" dir="auto" maxlength="40" placeholder="${v.game==="arsimha"?"اكتب عنوان كذب للرسمة…":v.ql==="en"?"Write your lie in English…":"اكتب كذبتك هنا…"}" autocomplete="off"><p class="count" id="cnt">0/40</p><button class="btn coral wide" id="lieBtn">أرسل 🤥</button></div>`;
  $("perr").textContent=err||"";
  const send=t=>{t=clip(t,40);if(!t)return;ME.n=Date.now();ME.myLie=t;ME.shownBad=false;sendAct({k:v.k,lie:t,n:ME.n});
    a.innerHTML=`<p class="big">جاري الإرسال…</p>`;$("perr").textContent=""};
  const inp=$("lieIn");
  inp.oninput=()=>$("cnt").textContent=inp.value.length+"/40";
  $("lieBtn").onclick=()=>send(inp.value);
  ME.autoSend=()=>{if(inp.isConnected&&inp.value.trim())send(inp.value)};
  inp.onkeydown=e=>{if(e.key==="Enter")send(e.target.value)};
  setTimeout(()=>inp.focus(),50);
}
function showLikes(v,mine){
  const box=$("chs");
  box.innerHTML=`<div class="emoji" style="font-size:60px">🤞</div><p class="big" style="font-size:26px">اخترت: «${esc(v.opts[ME.ch])}»</p><p class="note">عجبتك وحدة؟ اعطها 👍</p>`+
   v.opts.map((o,i)=>i===ME.ch||(mine&&norm(o)===mine)?"":`<div class="likerow"><span class="txt">${esc(o)}</span><button class="like" data-l="${i}" aria-pressed="false" aria-label="إعجاب">👍</button></div>`).join("");
  box.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{const i=+b.dataset.l;ME.lk.has(i)?ME.lk.delete(i):ME.lk.add(i);b.setAttribute("aria-pressed",ME.lk.has(i));sendAct({k:v.k,ch:ME.ch,lk:[...ME.lk]})});
}
function drawPad(box,v,idx){
  const myInk=INK[idx%8],COLS=[0,1,...PAL.map((_,i)=>i+3)];
  box.innerHTML=`<div class="col dkit">
    <button class="btn mint wide" id="sendDraw">خلصت! أرسل الرسمة 🎨</button>
    <canvas class="pad" id="pad"></canvas>
    <div class="dk-row dk-cols">${COLS.map(k=>`<button class="swatch sm" data-c="${k}" style="--c:${colorOf(k,myInk)}" aria-pressed="${k===0}" aria-label="لون"></button>`).join("")}</div>
    <div class="dk-row"><div class="dk-sizes">${[3,1,2,4,5].map(w=>`<button class="tool dk-w" data-w="${w}" aria-pressed="${w===1}" aria-label="حجم القلم"><i style="--s:${Math.max(4,Math.round(WID[w]*.55))}px"></i></button>`).join("")}</div></div>
    <div class="dk-row"><button class="tool" data-t="pen" aria-pressed="true" aria-label="قلم">✏️</button><button class="tool" data-t="fill" aria-pressed="false" aria-label="تعبئة">🪣</button><button class="tool" data-t="erase" aria-pressed="false" aria-label="ممحاة">🧽</button>
      <span class="dk-gap"></span><button class="tool" id="undo" aria-label="تراجع">↩️</button><button class="tool" id="clr" aria-label="مسح الكل">🗑️</button></div></div>`;
  const cv=$("pad"),strokes=[];let cur=null,c=0,w=1,tool="pen";
  const colorFn=k=>colorOf(k,myInk);
  const redraw=()=>paint(cv,strokes,null,false,colorFn);
  setTimeout(redraw,0);
  const pos=e=>{const r=cv.getBoundingClientRect();return[Math.round((e.clientX-r.left)/r.width*1000),Math.round((e.clientY-r.top)/r.height*1000)]};
  cv.onpointerdown=e=>{e.preventDefault();const[x,y]=pos(e);
    if(tool==="fill"){strokes.push({c,w:1,f:1,p:[x,y]});const S=cv.width/1000;floodFill(cv.getContext("2d",{willReadFrequently:true}),x*S,y*S,colorFn(c));return}
    cv.setPointerCapture(e.pointerId);cur={c:tool==="erase"?2:c,w,p:[x,y]};strokes.push(cur);
    const ctx=cv.getContext("2d"),S=cv.width/1000;ctx.fillStyle=colorFn(cur.c);ctx.beginPath();ctx.arc(x*S,y*S,widthOf(cur)*S/2,0,7);ctx.fill()};
  cv.onpointermove=e=>{if(!cur)return;const[x,y]=pos(e),p=cur.p,lx=p[p.length-2],ly=p[p.length-1];if(Math.hypot(x-lx,y-ly)<4)return;p.push(x,y);
    const ctx=cv.getContext("2d"),S=cv.width/1000;ctx.strokeStyle=colorFn(cur.c);ctx.lineWidth=widthOf(cur)*S;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(lx*S,ly*S);ctx.lineTo(x*S,y*S);ctx.stroke()};
  cv.onpointerup=cv.onpointercancel=()=>{cur=null};
  const press=(sel,b)=>box.querySelectorAll(sel).forEach(x=>x.setAttribute("aria-pressed",x===b));
  box.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{c=+b.dataset.c;press("[data-c]",b);if(tool==="erase"){tool="pen";press("[data-t]",box.querySelector('[data-t="pen"]'))}});
  box.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{w=+b.dataset.w;press("[data-w]",b);if(tool==="fill"){tool="pen";press("[data-t]",box.querySelector('[data-t="pen"]'))}});
  box.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{tool=b.dataset.t;press("[data-t]",b)});
  $("undo").onclick=()=>{strokes.pop();redraw()};
  let clrT=0;$("clr").onclick=()=>{const b=$("clr");if(Date.now()-clrT<2500){strokes.length=0;redraw();b.textContent="🗑️";clrT=0;return}clrT=Date.now();b.textContent="متأكد؟";setTimeout(()=>{if(b.isConnected)b.textContent="🗑️"},2500)};
  let sending=false,sent=false;
  const send=auto=>{const sb=$("sendDraw");if(sending||sent)return;
    if(!strokes.length){if(!auto&&sb)sb.textContent="ارسم شي أول 😅";return}
    sending=true;if(sb){sb.disabled=true;sb.textContent=auto?"⏰ خلص الوقت… نرسل رسمتك":"جاري الإرسال…"}
    api("POST","/rooms/"+ST.code+"/drawings",{strokes}).then(r=>{sent=true;sendAct({k:v.k,draw:r.id})})
      .catch(()=>{if(sb&&sb.isConnected){sb.disabled=false;sb.textContent="ما وصلت، جرّب مرة ثانية 🔁"}})
      .finally(()=>{sending=false})};
  $("sendDraw").onclick=()=>send(false);
  // time is almost up: send whatever is on the pad so the drawing isn't lost
  ME.padK=v.k;ME.padSend=()=>{if(cv.isConnected)send(true)};
}

function fetchDrawing(g,id,drawId){
  g.fetching=g.fetching||{};if(g.fetching[id]===drawId)return;g.fetching[id]=drawId;
  api("GET","/drawings/"+encodeURIComponent(drawId)).then(r=>{const s=cleanStrokes(r.strokes);if(s.length&&H.g===g)g.drawings[id]=s})
    .catch(()=>{if(g.fetching)delete g.fetching[id]});
}
async function boot(){
  root.innerHTML=`<div class="emoji" style="margin-top:calc(var(--sh)*0.2)">🎉</div><p class="big">لحظة…</p>`;
  const fail=(t,d)=>{root.innerHTML=`<div class="emoji" style="margin-top:calc(var(--sh)*0.2)">😵</div><p class="big">${esc(t)}</p><p class="note center">${esc(d)}</p>`};
  try{const c=await api("GET","/content");QS=c.questions||[];DRAW=c.prompts||[];WORDS=c.words||{};TOPICS=c.topics||[]}
  catch(e){return fail("ما قدرنا نحمّل الألعاب",e.status?"خطأ من السيرفر ("+e.status+"). افتح /api/status لمعرفة السبب.":"تأكد من الإنترنت وحدّث الصفحة.")}
  if(!QS.length)return fail("ما فيه أسئلة في قاعدة البيانات","شغّل الأمر: php artisan db:seed --force");
  landing(CFG.ready?"":"تنبيه: WebSockets مو مربوطة بالتطبيق، اللعب الجماعي ما بيشتغل.");
}
boot();
})();
