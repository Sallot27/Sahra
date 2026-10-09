/* سهرة: beta games. Each entry receives the kit (K) from sahra.js and returns a game object.
   Host side: start(), tick(now), render(), dyn(), after(), view(v), timed[], doneMap().
   Phone side: phone(v, ctx) on every new phase/step, phoneLive(v) on live updates. */
(function(){
const B=window.SAHRA_BETA=window.SAHRA_BETA||[];

/* ---------- shared bits ---------- */
function common(K){
  const {H,esc,clip,fmt,pick,setTimer,ringHTML,sayHTML,boardHTML,QUIP}=K;
  const L={k:null}; // phone-side state for the current step
  const fresh=v=>{const id=v.game+"|"+v.ph+"|"+v.k;if(L.k!==id){for(const x in L)delete L[x];L.k=id;return true}return false};
  const scores=(secs=7)=>{H.ph="scores";H.k++;setTimer(secs);H.quip=pick(QUIP.scores)};
  const scoresHTML=()=>`<div class="spread"><h2 style="font-size:46px">🏁 الترتيب</h2>${ringHTML()}</div>${sayHTML(H.quip)}${boardHTML()}`;
  const head=(quip)=>`<div class="spread">${sayHTML(quip)}${ringHTML()}</div>`;
  const add=(id,p)=>{H.sc[id]=(H.sc[id]||0)+p};
  const avatar=(id,cls="sm")=>`<div class="av ${cls}" style="--c:${K.col(id)}">${K.face(id)}</div>`;
  const pnm=(v,id)=>esc((v.nm&&v.nm[id])||"لاعب");
  const tline=v=>`<p class="note">⏱ باقي <b id="ptl">${v.tl}</b> ثانية</p>`;
  const watch=(root,v,emoji="👀",title="ناظر الشاشة!",note)=>{root.insertAdjacentHTML("beforeend",`<div class="emoji">${emoji}</div><p class="big">${esc(title)}</p>${note!==undefined?`<p class="note center">${note}</p>`:v.sc?`<p class="note center">نقاطك: <b>${fmt(v.sc[K.me()])}</b></p>`:""}`)};
  // one-line text box + send button; onSend returns false to keep the form
  function textForm(box,{ph,max=60,btn="أرسل ✍️",value="",dice,onSend}){
    box.innerHTML=`<div class="col"><input type="text" class="bt-in" maxlength="${max}" placeholder="${esc(ph)}" autocomplete="off" value="${esc(value)}">
      <div class="spread"><p class="count bt-cnt">${value.length}/${max}</p>${dice?`<button class="tool bt-dice" aria-label="فكرة عشوائية">🎲</button>`:""}</div>
      <button class="btn coral wide bt-send">${btn}</button></div>`;
    const inp=box.querySelector(".bt-in"),cnt=box.querySelector(".bt-cnt");
    inp.oninput=()=>cnt.textContent=inp.value.length+"/"+max;
    const go=()=>{const t=clip(inp.value,max);if(!t){inp.focus();return}onSend(t)};
    box.querySelector(".bt-send").onclick=go;inp.onkeydown=e=>{if(e.key==="Enter")go()};
    if(dice)box.querySelector(".bt-dice").onclick=()=>{inp.value=dice();inp.oninput()};
    setTimeout(()=>inp.focus(),60);
  }
  function choices(box,items,onPick){
    box.innerHTML=`<div class="col">${items.map((it,i)=>`<button class="pbtn" data-i="${i}" style="--o:${it.c||K.OPTC[i%K.OPTC.length]}" ${it.off?"disabled":""}>${it.html||esc(it.t)}</button>`).join("")}</div>`;
    box.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>onPick(items[+b.dataset.i],+b.dataset.i));
  }
  const sent=(box,emoji,title,note="")=>{box.innerHTML=`<div class="emoji">${emoji}</div><p class="big">${esc(title)}</p>${note?`<p class="note center">${note}</p>`:""}`};
  return{L,fresh,scores,scoresHTML,head,add,avatar,pnm,tline,watch,textForm,choices,sent};
}

/* =====================================================================
   1) مزاد الخردة: auction of weird items with hidden real values
   ===================================================================== */
B.push(K=>{
  const {H,esc,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,playSting}=K;
  const C=common(K);
  const START=2000,ITEMS_PER_GAME=6,STEP=[50,100,250,500];
  const ITEMS=[
    {e:"🥾",n:"فردة جزمة لبسها أسد",d:"يقول البايع إن الأسد لبسها في السيرك… والفردة الثانية ضاعت",v:40},
    {e:"📺",n:"ريموت يغيّر مزاج أخوك",d:"فيه زر واحد بس، مكتوب عليه «اهدأ»",v:1800},
    {e:"🧦",n:"جوارب جدّي المحظوظة",d:"ما انغسلت من ١٩٨٧ عشان ما يروح الحظ",v:10},
    {e:"🗺️",n:"خريطة كنز بألوان شمعية",d:"عليها علامة X كبيرة… في حديقة الجيران",v:2200},
    {e:"🍪",n:"آخر بسكوتة في العلبة",d:"الكل يبيها، ولا أحد يعترف إنه أكل الباقي",v:300},
    {e:"🦆",n:"بطة مطاط بطلة سباحة",d:"البايع يحلف إنها فازت بسباق في البانيو",v:150},
    {e:"🏆",n:"كأس بطولة الحارة ٢٠٠٩",d:"مكتوب عليه بالخط العريض: «المركز الرابع»",v:90},
    {e:"🪑",n:"كرسي جلس عليه ملك",d:"الملك كان عمره ٦ سنين، وكان ملك الحفلة",v:400},
    {e:"🎩",n:"قبعة ساحر فاضية",d:"الأرنب طلع منها… وما رجع",v:1200},
    {e:"📦",n:"صندوق مكتوب عليه «لا تفتح»",d:"يتحرك أحياناً… هذا طبيعي؟",v:2600},
    {e:"🥫",n:"علبة هواء من جبال الألب",d:"تفتحها وتتنفس… وخلاص",v:5},
    {e:"🦖",n:"سن ديناصور (أو حصاة)",d:"البايع متأكد بنسبة ٥٠٪",v:2000},
    {e:"📻",n:"راديو ما يشغّل إلا نشرة الطقس",d:"والطقس دائماً: «حار»",v:60},
    {e:"🧸",n:"دبدوب يحفظ أسرار العائلة",d:"عنده ٤٠ سنة خبرة في السكوت",v:700},
    {e:"🪥",n:"فرشاة أسنان تغني",d:"تغني أغنية وحدة بس… طول عمرها",v:350},
    {e:"🔑",n:"مفتاح ما أحد يدري لوين",d:"ممكن لقصر… وممكن لدرج المطبخ",v:1500},
    {e:"🍉",n:"بطيخة مضمونة حمرا",d:"معها شهادة ضمان مختومة من البقالة",v:800},
    {e:"🖼️",n:"لوحة رسمها قط",d:"تحفة فنية… أو قط مشى على الألوان",v:1100},
    {e:"🧲",n:"مغناطيس الريموتات الضايعة",d:"تحطه في الصالة وتطلع لك كل الريموتات",v:2400},
    {e:"🎈",n:"بالونة عيد ميلاد عمرها سنة",d:"وللحين منفوخة! كيف؟ ما ندري",v:250},
    {e:"🍳",n:"مقلاة ما يلصق فيها شي",d:"حتى الأكل… يطير منها",v:20},
    {e:"💍",n:"خاتم لقيناه في كيس شيبس",d:"ممكن ألماس… وممكن جائزة الكيس",v:2800},
    {e:"🐟",n:"سمكة ذهبية تقول نكت",d:"نفس النكتة كل ٣ ثواني",v:600},
    {e:"🧳",n:"شنطة ضايعة من المطار",d:"مقفلة، وما ندري وش داخلها",v:1900},
  ];
  const worth=id=>{const g=H.g;return(g.wallet[id]||0)+(g.owned[id]||[]).reduce((n,i)=>n+ITEMS[i].v,0)};
  const sync=()=>{const g=H.g;g.pl.forEach(id=>H.sc[id]=worth(id))};
  return{
    id:"mazad",name:"مزاد الخردة",emoji:"🔨",color:"#ff9a3c",min:2,
    desc:"تزايدون على أغرض غريبة. بعضها كنز وبعضها خردة… ومحد يدري إلا بعد ما تشتري!",
    tags:["٢-٨ لاعبين","مزايدة","ضحك"],
    rules:["كل واحد معه ٢٬٠٠٠ ريال وهمية","يطلع غرض غريب، وتزايدون عليه من جوالاتكم","بعد البيع ينكشف سعره الحقيقي: كنز ولا خردة؟","يفوز اللي فلوسه + قيمة أغراضه أكثر"],
    winTitle:"تاجر السهرة!",likeTitle:"",
    timed:["bid"],
    start(){const pl=active();H.g={pl,wallet:{},owned:{},items:shuffle(ITEMS.map((_,i)=>i)).slice(0,ITEMS_PER_GAME),i:-1};
      pl.forEach(id=>{H.g.wallet[id]=START;H.g.owned[id]=[]});sync();this.next()},
    next(){const g=H.g;g.i++;if(g.i>=g.items.length){sync();return K.finishGame()}
      g.item=g.items[g.i];g.high=0;g.leader=null;g.bids=[];H.ph="bid";H.k++;setTimer(20);
      H.quip=pick(["مين يبدأ؟ السعر مفتوح!","لا تخلّونه يروح بسعر رخيص… أو خلّوه؟","فرصة العمر… يمكن"]);sfx.go()},
    tick(now){const g=H.g;
      if(H.ph==="bid"){
        g.pl.forEach(id=>{const a=K.act(id);if(!a||!Number.isInteger(a.bid))return;
          if(a.bid>g.high&&a.bid>=g.high+50&&a.bid<=g.wallet[id]){g.high=a.bid;g.leader=id;g.bids.unshift({id,b:a.bid});sfx.coin();
            if(H.end-now<6000)H.end=now+6000}});
        if(now>H.end||g.forceSkip){g.forceSkip=false;this.sell()}}
      else if(H.ph==="sold"){if(now>H.end){if(g.i===2)C.scores(7);else this.next()}}
      else if(H.ph==="scores"){if(now>H.end)this.next()}},
    sell(){const g=H.g,it=ITEMS[g.item];
      if(g.leader){g.wallet[g.leader]-=g.high;g.owned[g.leader].push(g.item)}
      sync();g.deal=!g.leader?"none":it.v>=g.high*1.5?"gem":it.v<g.high?"junk":"fair";
      H.ph="sold";H.k++;setTimer(8);playSting("sting_reveal",sfx.drum);
      setTimeout(()=>{if(g.deal==="gem"||(!g.leader&&it.v>=1500)){sfx.truth();confetti()}else if(g.deal==="junk")sfx.lie();else sfx.coin()},1700)},
    doneMap(){return null},
    view(v){const g=H.g;
      if(H.ph==="bid"){const it=ITEMS[g.item];v.it={e:it.e,n:it.n,d:it.d};v.high=g.high;v.leader=g.leader;v.wallet=g.wallet;v.left=g.items.length-g.i}
      if(["sold","scores"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">الغرض ${fmt(g.i+1)} من ${fmt(g.items.length)}</span>`},
    card(it,extra=""){return`<div class="ticket mz-card"><span class="mz-e">${it.e}</span><div><h2 class="mz-n">${esc(it.n)}</h2><p class="mz-d">${esc(it.d)}</p></div>${extra}</div>`},
    dyn(){const g=H.g;if(H.ph!=="bid")return"";
      return`<div class="mz-high">${g.leader?`${C.avatar(g.leader)}<span>${esc(nm(g.leader))}</span><b>${fmt(g.high)} ريال</b>`:`<span class="note" style="font-size:22px">ما أحد زايد للحين… 🦗</span>`}</div>
      <div class="mz-wallets">${g.pl.map(id=>`<span class="mz-w ${id===g.leader?"lead":""}">${C.avatar(id)}${fmt(g.wallet[id])}</span>`).join("")}</div>`},
    render(){const g=H.g,it=ITEMS[g.item];
      if(H.ph==="bid")return C.head(H.quip)+this.card(it)+`<div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="sold"){const w=g.leader;
        const label={gem:"كنز! 💎",junk:"خردة! 🤡",fair:"صفقة عادية 🤝",none:it.v>=1500?"راح عليكم! 😱":"أحسن إنكم ما اشتريتوها 😅"}[g.deal];
        return`<div class="col" style="gap:18px">${this.card(it)}
          <div class="reveal"><div class="who">${w?`${C.avatar(w)}<span>${esc(nm(w))} اشتراها بـ ${fmt(g.high)} ريال</span>`:`<span>ما أحد اشتراها</span>`}</div>
          <p class="note" style="font-size:22px;animation:fade .3s 1.2s both">قيمتها الحقيقية:</p>
          <div class="answer" style="animation-delay:1.5s">${fmt(it.v)} ريال</div>
          <div class="stamp ${g.deal==="gem"||g.deal==="fair"?"truth":"lie"}" style="animation-delay:1.9s">${label}</div></div></div>`}
      if(H.ph==="scores")return C.scoresHTML();
      return""},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);
      if(v.ph==="bid"){
        root.insertAdjacentHTML("beforeend",`<div class="pq mz-pcard"><span style="font-size:44px">${v.it.e}</span><b>${esc(v.it.n)}</b><small>${esc(v.it.d)}</small></div>${tline}<div id="mzBox"></div>`);
        this.phoneLive(v,true);return}
      C.watch(root,v,v.ph==="sold"?"🔍":"👀");},
    phoneLive(v,force){if(v.ph!=="bid")return;const box=document.getElementById("mzBox");if(!box)return;const me=K.me(),L=C.L;
      const sig=[v.high,v.leader,v.wallet[me]].join("|");if(!force&&L.sig===sig)return;L.sig=sig;
      const mine=v.wallet[me]||0,lead=v.leader===me;
      box.innerHTML=`<div class="mz-pstat"><span>أعلى سعر: <b>${fmt(v.high)}</b></span><span>${lead?"👑 أنت الأعلى!":v.leader?`${C.pnm(v,v.leader)} الأعلى`:"ابدأ المزاد!"}</span></div>
        <p class="note center">فلوسك: <b>${fmt(mine)}</b> ريال</p>
        <div class="mz-btns">${STEP.map(s=>{const b=v.high+s;return`<button class="pbtn" data-b="${b}" style="--o:${K.OPTC[STEP.indexOf(s)]}" ${b>mine||lead?"disabled":""}>+${fmt(s)}<small>${fmt(b)}</small></button>`}).join("")}</div>`;
      box.querySelectorAll("[data-b]").forEach(b=>b.onclick=()=>{K.sendAct({k:v.k,bid:+b.dataset.b});box.querySelectorAll("[data-b]").forEach(x=>x.disabled=true)})},
  };
});

/* =====================================================================
   2) الجملة المكسورة: telephone with sentences and drawings
   ===================================================================== */
B.push(K=>{
  const {H,esc,clip,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,api,paint,cleanStrokes,INK}=K;
  const C=common(K);
  const STARTERS=["قطوة تسوق طيارة","جدتي تلعب بلايستيشن","زرافة عالقة في المصعد","بطريق يبيع آيسكريم في الصحراء","فيل يحاول يختبي ورا شجرة صغيرة","سمكة تتمرن في النادي","ديناصور يشرب شاي مع أصحابه","طماطة خايفة من السكين","كتكوت لابس نظارة شمسية في البحر","روبوت يبكي لأن الواي فاي فصل","أسد عنده حساسية من الشعر","بطة تقدم نشرة الأخبار","سحابة تمطر عصير","ثلاجة تهرب من البيت","قرد يصلّح سيارة","موزة تتزلج على الثلج","حلزون مستعجل يبي يلحق الباص","جمل يسوي يوقا","بيتزا تطير بجناحات","ولد يحاول يصيد غيمة بشبكة"];
  const kindOf=s=>s===0?"write0":s%2===1?"sketch":"guessd";
  function lastItem(ch){for(let j=ch.length-1;j>=0;j--){const it=ch[j];if(it.t==="w"||it.id)return it}return null}
  return{
    id:"maksoora",name:"الجملة المكسورة",emoji:"📞",color:"#a8e05f",min:3,
    desc:"تكتب جملة، اللي بعدك يرسمها، واللي بعده يخمّن الرسمة… وتشوفون كيف تخربت!",
    tags:["٣-٨ لاعبين","رسم وكتابة","ضحك"],
    rules:["كل واحد يكتب جملة غريبة","تنتقل الجملة للي بعدك ويرسمها","اللي بعده يشوف الرسمة بس ويكتب وش فهم","بالأخير نشوف كل سلسلة من أولها لآخرها 😂"],
    winTitle:"ملك الفوضى!",likeTitle:"",
    timed:["write0","sketch","guessd","rate"],
    start(){const pl=shuffle(active()),n=pl.length;H.g={pl,steps:Math.min(n,6),s:-1,chains:pl.map(()=>[]),strokes:{},votes:{}};this.step()},
    who(c,s){const g=H.g;return g.pl[(c+s)%g.pl.length]},
    step(){const g=H.g;g.s++;
      if(g.s>=g.steps){g.ci=-1;return this.nextShow()}
      g.got={};H.ph=kindOf(g.s);H.k++;
      setTimer(H.ph==="write0"?50:H.ph==="sketch"?75:40);sfx.go();
      H.quip=H.ph==="write0"?"اكتبوا جملة غريبة… كل ما كانت أغرب كان أحسن!":H.ph==="sketch"?"ارسموا الجملة اللي وصلتكم! 🎨":"خمّنوا وش هذي الرسمة؟ 🤔"},
    tick(now){const g=H.g;
      if(["write0","sketch","guessd"].includes(H.ph)){
        g.chains.forEach((ch,c)=>{const id=this.who(c,g.s);if(g.got[id])return;const a=K.act(id);if(!a)return;
          if(H.ph==="sketch"&&typeof a.draw==="string")g.got[id]={t:"d",id:a.draw,by:id};
          else if(H.ph!=="sketch"&&typeof a.text==="string"&&a.text.trim())g.got[id]={t:"w",x:clip(a.text,60),by:id}});
        const need=g.pl.filter(id=>active().includes(id));
        if(now>H.end||g.forceSkip||need.every(id=>g.got[id])){g.forceSkip=false;
          g.chains.forEach((ch,c)=>{const id=this.who(c,g.s);ch.push(g.got[id]||(H.ph==="sketch"?{t:"d",id:null,by:id}:{t:"w",x:"(ما كتب شي 🤐)",by:id}))});
          if(H.ph==="sketch")g.chains.forEach(ch=>{const it=ch[ch.length-1];if(it.id)this.fetch(it.id)});
          this.step()}}
      else if(H.ph==="show"){if(now>H.end)this.nextShow()}
      else if(H.ph==="rate"){
        g.pl.forEach(id=>{const a=K.act(id);if(a&&Number.isInteger(a.v)&&g.chains[a.v]&&a.v!==g.pl.indexOf(id))g.votes[id]=a.v});
        if(now>H.end||g.forceSkip||g.pl.filter(id=>active().includes(id)).every(id=>g.votes[id]!==undefined)){g.forceSkip=false;this.award()}}
      else if(H.ph==="rated"){if(now>H.end)K.finishGame()}},
    fetch(id){const g=H.g;api("GET","/drawings/"+encodeURIComponent(id)).then(r=>{g.strokes[id]=cleanStrokes(r.strokes);if(H.ph==="show"&&this.after)this.after()}).catch(()=>{})},
    nextShow(){const g=H.g;g.ci++;if(g.ci>=g.chains.length){g.votes={};H.ph="rate";H.k++;setTimer(25);H.quip="أي سلسلة أضحكتكم أكثر؟ صوّتوا! 😂";return}
      H.ph="show";H.k++;setTimer(Math.round(g.chains[g.ci].length*2.6+5));H.quip="";sfx.swoosh()},
    award(){const g=H.g,count=g.chains.map(()=>0);Object.values(g.votes).forEach(c=>count[c]++);
      g.count=count;g.chains.forEach((ch,c)=>{const ids=new Set(ch.map(it=>it.by));ids.forEach(id=>C.add(id,200+count[c]*300))});
      g.best=count.indexOf(Math.max(...count));H.ph="rated";H.k++;setTimer(8);sfx.truth();confetti()},
    doneMap(){const g=H.g;return["write0","sketch","guessd"].includes(H.ph)?g.got:H.ph==="rate"?g.votes:null},
    view(v){const g=H.g;
      if(["write0","sketch","guessd"].includes(H.ph)){v.task={};g.chains.forEach((ch,c)=>{const id=this.who(c,g.s);const p=lastItem(ch);v.task[id]=p?(p.t==="w"?{t:"w",x:p.x}:{t:"d",id:p.id,by:p.by}):null});v.done=Object.keys(g.got)}
      if(H.ph==="rate"){v.opts=g.chains.map((ch,c)=>({c,x:(ch[0]&&ch[0].x)||"…",own:g.pl[c]}));v.done=Object.keys(g.votes)}
      if(H.ph==="rated")v.sc=H.sc},
    pill(){const g=H.g;return H.ph==="show"?`<span class="pill">السلسلة ${fmt(g.ci+1)} من ${fmt(g.chains.length)}</span>`:g.s>=0&&g.s<g.steps?`<span class="pill">الخطوة ${fmt(g.s+1)} من ${fmt(g.steps)}</span>`:""},
    chainHTML(ch,anim){return`<div class="mk-chain">${ch.map((it,i)=>`<div class="mk-item ${anim?"anim":""}" style="--d:${(i*2.4).toFixed(1)}s">
        <div class="mk-by">${C.avatar(it.by)}<span>${esc(nm(it.by))}</span></div>
        ${it.t==="w"?`<div class="mk-text">${esc(it.x)}</div>`:it.id?`<div class="mk-frame"><canvas data-dr="${esc(it.id)}" data-by="${esc(it.by)}"></canvas></div>`:`<div class="mk-text muted">(ما رسم شي 🫥)</div>`}</div>`).join(`<span class="mk-arrow">←</span>`)}</div>`},
    render(){const g=H.g;
      if(["write0","sketch","guessd"].includes(H.ph)){const big=H.ph==="write0"?"✍️":H.ph==="sketch"?"🖍️":"🤔";
        return C.head(H.quip)+`<div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">${big}</span><h2 style="font-size:clamp(32px,4.6vw,52px)">${H.ph==="write0"?"كل واحد يكتب جملة غريبة":H.ph==="sketch"?"ارسموا الجملة اللي وصلتكم":"وش هذي الرسمة؟ اكتبوا تخمينكم"}</h2><p class="note" style="font-size:19px">لا أحد يطل على جوال الثاني! 🙈</p></div><div id="dyn" class="still">${this.dyn()}</div>`}
      if(H.ph==="show"){const ch=g.chains[g.ci];return`<h2 style="font-size:clamp(28px,3.6vw,44px);text-align:center">سلسلة ${esc(nm(g.pl[g.ci]))} 📜</h2>${this.chainHTML(ch,true)}`}
      if(H.ph==="rate")return C.head(H.quip)+`<div class="opts">${g.chains.map((ch,c)=>`<div class="opt" style="--o:${K.OPTC[c%K.OPTC.length]}">«${esc((ch[0]&&ch[0].x)||"…")}» ← «${esc(((ch.filter(x=>x.t==="w").pop())||{}).x||"…")}»</div>`).join("")}</div><div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="rated"){const ch=g.chains[g.best];return`<div class="col center" style="gap:10px"><h2 style="font-size:clamp(28px,3.6vw,44px)">😂 أضحك سلسلة: سلسلة ${esc(nm(g.pl[g.best]))}</h2><p class="note" style="font-size:20px">${fmt(g.count[g.best])} صوت · كل اللي شاركوا فيها +٣٠٠ لكل صوت</p></div>${this.chainHTML(ch,false)}`}
      return""},
    after(){const g=H.g,anim=H.ph==="show";document.querySelectorAll("canvas[data-dr]").forEach(cv=>{const s=g.strokes[cv.dataset.dr];if(!s||cv.dataset.ok)return;cv.dataset.ok=1;
      const it=cv.closest(".mk-item"),d=anim&&it?parseFloat(it.style.getPropertyValue("--d"))||0:0;
      setTimeout(()=>{if(cv.isConnected)paint(cv,s,cv.dataset.by,anim)},d*1000+300)})},
    dyn(){const g=H.g;
      if(["write0","sketch","guessd"].includes(H.ph))return K.troupe(g.pl,new Set(Object.keys(g.got)));
      if(H.ph==="rate")return K.troupe(g.pl,new Set(Object.keys(g.votes)));
      return""},
    phone(v,{root,tline,idx}){const me=K.me();C.fresh(v);
      if(["write0","sketch","guessd"].includes(v.ph)){
        const task=v.task&&v.task[me];
        if(v.task&&!(me in v.task)){C.watch(root,v,"🍿","تفرّج هالجولة","");return}
        if(v.ph==="write0"){root.insertAdjacentHTML("beforeend",`<h2 style="font-size:28px">اكتب جملة غريبة ✍️</h2><p class="note">بيرسمها اللي بعدك… خلّها مضحكة!</p>${tline}<div id="mkBox"></div>`);
          C.textForm(document.getElementById("mkBox"),{ph:"مثلاً: بطريق يبيع آيسكريم في الصحراء",max:60,dice:()=>pick(STARTERS),onSend:t=>{K.sendAct({k:v.k,text:t});C.sent(document.getElementById("mkBox"),"📨","وصلت!","ننتظر الباقين…")}});return}
        if(v.ph==="sketch"){root.insertAdjacentHTML("beforeend",`<div class="drawwhat">ارسم: <b>${esc(task&&task.t==="w"?task.x:"أي شي يعجبك 😅")}</b></div>${tline}<div id="drawArea"></div>`);
          K.drawPad(document.getElementById("drawArea"),v,idx);return}
        root.insertAdjacentHTML("beforeend",`<h2 style="font-size:26px">وش هذي الرسمة؟ 🤔</h2>${tline}${task&&task.t==="d"?`<div class="frame" style="margin:14px auto;width:min(70vw,320px)"><canvas id="mkCv"></canvas></div>`:`<div class="pq">${esc(task?task.x:"…")}</div><p class="note">ما وصلت رسمة، اكتب الجملة بأسلوبك 😅</p>`}<div id="mkBox"></div>`);
        if(task&&task.t==="d")api("GET","/drawings/"+encodeURIComponent(task.id)).then(r=>{const j=(v.order||[]).indexOf(task.by);paint(document.getElementById("mkCv"),cleanStrokes(r.strokes),null,false,c=>c===2?"#fff":c===1?INK[Math.max(0,j)%8]:"#1a1033")}).catch(()=>{});
        C.textForm(document.getElementById("mkBox"),{ph:"اكتب وش فهمت من الرسمة…",max:60,onSend:t=>{K.sendAct({k:v.k,text:t});C.sent(document.getElementById("mkBox"),"📨","وصل تخمينك!","")}});return}
      if(v.ph==="rate"){root.insertAdjacentHTML("beforeend",`<h2 style="font-size:28px">أضحك سلسلة؟ 😂</h2>${tline}<div id="mkBox"></div>`);
        const box=document.getElementById("mkBox");
        C.choices(box,(v.opts||[]).map(o=>({t:"«"+o.x+"»",off:o.own===me,val:o.c})),it=>{K.sendAct({k:v.k,v:it.val});C.sent(box,"🗳️","تم التصويت!","")});return}
      C.watch(root,v,v.ph==="show"?"📺":"👀");},
    phoneLive(v){if(v.ph==="sketch"&&(v.done||[]).includes(K.me())&&!C.L.drawn){C.L.drawn=1;const a=document.getElementById("drawArea");if(a)C.sent(a,"🖼️","وصلت رسمتك!","انتظر الباقين يخلّصون.")}},
  };
});

/* =====================================================================
   3) محامي الشيطان: defend a silly side, the others judge
   ===================================================================== */
B.push(K=>{
  const {H,esc,clip,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,playSting}=K;
  const C=common(K);
  const TOPICS=[
    {q:"الأناناس على البيتزا",a:"إبداع 🍍",b:"جريمة 🚫"},{q:"وش أهم؟",a:"النوم 😴",b:"الأكل 🍔"},
    {q:"مين أحسن؟",a:"القطط 🐱",b:"الكلاب 🐶"},{q:"المشروب الرسمي للسهرة",a:"الشاي 🍵",b:"القهوة ☕"},
    {q:"أحلى فصل",a:"الصيف ☀️",b:"الشتاء ❄️"},{q:"لو تقدر تختار قوة خارقة",a:"تطير 🦅",b:"تختفي 👻"},
    {q:"تعيش أسبوع بدون…",a:"جوال 📵",b:"حلويات 🍬"},{q:"العشاء الليلة",a:"كبسة 🍚",b:"بيتزا 🍕"},
    {q:"مين أحسن في البيت؟",a:"الأخ الكبير 🧔",b:"الأخ الصغير 👶"},{q:"الواجبات المدرسية",a:"لازم تنلغى ✂️",b:"لازم تبقى 📚"},
    {q:"الطلعة الجاية",a:"البحر 🌊",b:"البر 🏜️"},{q:"لو رجعت الديناصورات",a:"فكرة حلوة 🦖",b:"كارثة 😱"},
    {q:"لو تقدر",a:"تكلّم الحيوانات 🐒",b:"تتكلم كل اللغات 🌍"},{q:"الكيك",a:"شوكولاتة 🍫",b:"فانيلا 🍦"},
    {q:"أسلوب الحياة",a:"تصحى بدري 🐓",b:"تسهر 🦉"},{q:"السفر",a:"بالطيارة ✈️",b:"بالسيارة 🚗"},
    {q:"المطر",a:"أجمل شي 🌧️",b:"يخرّب الطلعات ☔"},{q:"الكرتون",a:"للصغار بس 👶",b:"للكل 👴"},
    {q:"لو صرت حيوان",a:"أسد 🦁",b:"قطوة بيت 🐈"},{q:"البيض",a:"مسلوق 🥚",b:"مقلي 🍳"},
    {q:"الآيسكريم في الشتاء",a:"عادي جداً 🍦",b:"جنون 🥶"},{q:"تعيش في",a:"قصر لحالك 🏰",b:"بيت صغير مع أصحابك 🏠"},
    {q:"أفضل اختراع",a:"المكيف ❄️",b:"الواي فاي 📶"},{q:"الأفلام",a:"تضحّك 😂",b:"تخوّف 👻"},
  ];
  return{
    id:"muhami",name:"محامي الشيطان",emoji:"⚖️",color:"#b98cff",min:3,
    desc:"تاخذ جهة في نقاش سخيف وتدافع عنها بكل جدية… والباقين يحكمون!",
    tags:["٣-٨ لاعبين","كتابة","نقاش"],
    rules:["كل اثنين ياخذون موضوع، كل واحد في جهة","كل واحد يكتب حجتين يدافع فيها عن جهته","تطلع الحجج على الشاشة، والباقين يصوتون للأقنع","كل صوت = ٢٥٠ نقطة، والفايز ياخذ ٥٠٠ زيادة"],
    winTitle:"أعظم محامي!",likeTitle:"",
    timed:["argue","judge"],
    start(){H.g={round:0,rounds:2,used:new Set()};this.newRound()},
    newRound(){const g=H.g;g.round++;if(g.round>g.rounds)return K.finishGame();
      const pl=shuffle(active());g.debates=[];g.sitOut=pl.length%2?pl[pl.length-1]:null;
      for(let i=0;i+1<pl.length;i+=2){let t=shuffle(TOPICS).find(x=>!g.used.has(x.q+x.a))||pick(TOPICS);g.used.add(t.q+t.a);g.debates.push({t,A:pl[i],B:pl[i+1],args:{}})}
      g.di=-1;H.ph="argue";H.k++;setTimer(80);sfx.go();H.quip="كل واحد يدافع عن جهته… حتى لو هو مو مقتنع 😏"},
    tick(now){const g=H.g;
      if(H.ph==="argue"){g.debates.forEach(d=>[d.A,d.B].forEach(id=>{const a=K.act(id);if(a&&Array.isArray(a.args)&&!d.args[id])d.args[id]=a.args.slice(0,2).map(x=>clip(x,70)).filter(Boolean)}));
        const need=g.debates.flatMap(d=>[d.A,d.B]).filter(id=>active().includes(id));
        if(now>H.end||g.forceSkip||need.every(id=>g.debates.some(d=>d.args[id]))){g.forceSkip=false;this.nextDebate()}}
      else if(H.ph==="judge"){const d=g.debates[g.di];
        active().forEach(id=>{if(id===d.A||id===d.B)return;const a=K.act(id);if(a&&(a.side==="A"||a.side==="B"))d.votes[id]=a.side});
        const voters=active().filter(id=>id!==d.A&&id!==d.B);
        if(now>H.end||g.forceSkip||(now>g.minEnd&&voters.length&&voters.every(id=>d.votes[id]))){g.forceSkip=false;this.verdict()}}
      else if(H.ph==="verdict"){if(now>H.end)this.nextDebate()}
      else if(H.ph==="scores"){if(now>H.end)this.newRound()}},
    nextDebate(){const g=H.g;g.di++;if(g.di>=g.debates.length)return C.scores(7);
      const d=g.debates[g.di];d.votes={};H.ph="judge";H.k++;setTimer(35);g.minEnd=Date.now()+11000;sfx.swoosh();H.quip=pick(["اسمعوا الطرفين… وبعدين احكموا!","المحكمة منعقدة ⚖️","مين أقنعكم أكثر؟"])},
    verdict(){const g=H.g,d=g.debates[g.di],va=Object.values(d.votes).filter(s=>s==="A").length,vb=Object.values(d.votes).filter(s=>s==="B").length;
      d.va=va;d.vb=vb;C.add(d.A,va*250);C.add(d.B,vb*250);d.win=va>vb?"A":vb>va?"B":null;if(d.win)C.add(d.win==="A"?d.A:d.B,500);
      H.ph="verdict";H.k++;setTimer(7);playSting("sting_reveal",sfx.drum);setTimeout(()=>{if(d.win){sfx.truth();confetti()}else sfx.lie()},1500)},
    doneMap(){const g=H.g;if(H.ph==="argue"){const m={};g.debates.forEach(d=>Object.keys(d.args).forEach(id=>m[id]=1));return m}if(H.ph==="judge")return g.debates[g.di].votes;return null},
    view(v){const g=H.g;
      if(H.ph==="argue"){v.roles={};g.debates.forEach(d=>{v.roles[d.A]={q:d.t.q,side:d.t.a,vs:d.t.b,op:d.B};v.roles[d.B]={q:d.t.q,side:d.t.b,vs:d.t.a,op:d.A}});v.done=Object.keys(this.doneMap())}
      if(H.ph==="judge"){const d=g.debates[g.di];v.d={q:d.t.q,a:d.t.a,b:d.t.b,A:d.A,B:d.B};v.done=Object.keys(d.votes)}
      if(["verdict","scores"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">الجولة ${fmt(g.round)} من ${fmt(g.rounds)}</span>`},
    side(d,X,cls,delay){const id=d[X],args=d.args[id]||[];
      return`<div class="dv-side ${cls}"><div class="dv-who">${C.avatar(id,"")}<div><b>${esc(nm(id))}</b><span>${esc(X==="A"?d.t.a:d.t.b)}</span></div></div>
        ${(args.length?args:["(سكت ولا قال شي 🤐)"]).map((x,i)=>`<p class="dv-arg" style="${delay===null?"animation:none":`animation-delay:${delay+i*4}s`}">«${esc(x)}»</p>`).join("")}
        ${d.va!==undefined?`<div class="dv-votes">${fmt(X==="A"?d.va:d.vb)} صوت</div>`:""}</div>`},
    render(){const g=H.g;
      if(H.ph==="argue")return C.head(H.quip)+`<div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">⚖️</span><h2 style="font-size:clamp(32px,4.6vw,52px)">المحامين يكتبون حججهم…</h2></div>
        <div class="dv-list">${g.debates.map(d=>`<div class="dv-mini"><b>${esc(d.t.q)}</b><span>${esc(nm(d.A))}: ${esc(d.t.a)}</span><span>ضد</span><span>${esc(nm(d.B))}: ${esc(d.t.b)}</span></div>`).join("")}</div>
        <div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="judge"||H.ph==="verdict"){const d=g.debates[g.di],v=H.ph==="verdict";
        return(v?"":C.head(H.quip))+`<div class="ticket" style="text-align:center;padding:18px"><span class="cat">القضية ${fmt(g.di+1)}</span><p class="qtext">${esc(d.t.q)}</p></div>
        <div class="dv-grid ${v?"done":""}">${this.side(d,"A","a",v?null:.6)}<div class="dv-vs">ضد</div>${this.side(d,"B","b",v?null:2.6)}</div>
        ${v?`<div class="stamp ${d.win?"truth":"lie"}" style="position:static;margin:10px auto 0;display:block;width:max-content">${d.win?`فاز ${esc(nm(d.win==="A"?d.A:d.B))}! 🏆`:"تعادل! 🤝"}</div>`:`<div id="dyn" class="still">${this.dyn()}</div>`}`}
      if(H.ph==="scores")return C.scoresHTML();
      return""},
    dyn(){const g=H.g;
      if(H.ph==="argue"){const all=g.debates.flatMap(d=>[d.A,d.B]);return K.troupe(all,new Set(Object.keys(this.doneMap())))}
      if(H.ph==="judge"){const d=g.debates[g.di];const voters=active().filter(id=>id!==d.A&&id!==d.B);return K.troupe(voters,new Set(Object.keys(d.votes)))}
      return""},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);
      if(v.ph==="argue"){const r=v.roles&&v.roles[me];
        if(!r){C.watch(root,v,"🍿","أنت القاضي هالجولة","استعد تحكم بين المحامين 😎");return}
        root.insertAdjacentHTML("beforeend",`<div class="pq" style="text-align:center"><small>${esc(r.q)}</small><br><b style="font-size:28px">أنت مع: ${esc(r.side)}</b><br><small>وخصمك ${C.pnm(v,r.op)} مع: ${esc(r.vs)}</small></div>${tline}
          <div id="dvBox" class="col"><input type="text" class="dv-in" maxlength="70" placeholder="الحجة الأولى…" autocomplete="off"><input type="text" class="dv-in" maxlength="70" placeholder="الحجة الثانية (اختياري)…" autocomplete="off"><button class="btn coral wide" id="dvSend">قدّم الحجج ⚖️</button></div>`);
        const ins=[...root.querySelectorAll(".dv-in")];setTimeout(()=>ins[0].focus(),60);
        document.getElementById("dvSend").onclick=()=>{const args=ins.map(i=>clip(i.value,70)).filter(Boolean);if(!args.length){ins[0].focus();return}
          K.sendAct({k:v.k,args});C.sent(document.getElementById("dvBox"),"📜","وصلت حججك!","خلك واثق 😎")};return}
      if(v.ph==="judge"){const d=v.d;
        if(me===d.A||me===d.B){C.watch(root,v,"🤞","قضيتك على الشاشة!","لا تأثر على القضاة 😏");return}
        root.insertAdjacentHTML("beforeend",`<h2 style="font-size:26px">${esc(d.q)}</h2><p class="note">مين أقنعك أكثر؟ اقرا الحجج على الشاشة</p>${tline}<div id="dvBox"></div>`);
        const box=document.getElementById("dvBox");
        C.choices(box,[{t:C.pnm(v,d.A)+": "+d.a,val:"A",c:"#ffcc33",html:`${esc((v.nm&&v.nm[d.A])||"")}<br><small>${esc(d.a)}</small>`},{t:"",val:"B",c:"#4cc2ff",html:`${esc((v.nm&&v.nm[d.B])||"")}<br><small>${esc(d.b)}</small>`}],it=>{K.sendAct({k:v.k,side:it.val});C.sent(box,"⚖️","تم الحكم!","")});return}
      C.watch(root,v);},
  };
});

/* =====================================================================
   4) اكمل القصة: build a story line by line, best line wins
   ===================================================================== */
B.push(K=>{
  const {H,esc,clip,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti}=K;
  const C=common(K);
  const OPENERS=["في يوم من الأيام، صحى أبو فهد ولقى في غرفته زرافة تشرب شاي.","كان فيه بطريق يحلم يصير طيّار.","فتحت الثلاجة… ولقيت مدينة كاملة داخلها.","جدتي قررت فجأة تشارك في سباق سيارات.","القطوة اللي في بيتنا طلعت تتكلم إنجليزي.","في الرحلة المدرسية، الباص قرر يطير.","وصلتني رسالة من كائن فضائي يبي وصفة الكبسة.","اكتشفت إن ظلّي له رأي ثاني في كل شي.","الريموت اختفى… وصار التلفزيون يختار القنوات بنفسه.","صحيت الصبح ولقيت كل الناس يمشون على أيديهم.","طلب أخوي الصغير بيتزا… ووصلت مع ديناصور.","في نص الاختبار، القلم قرر يكتب لحاله."];
  return{
    id:"qissa",name:"اكمل القصة",emoji:"📖",color:"#7fe0ff",min:3,
    desc:"قصة تبدأ بجملة، وكل جولة تكتبون السطر الجاي وتختارون الأضحك… والقصة تخرب أكثر وأكثر!",
    tags:["٣-٨ لاعبين","كتابة","قصة جماعية"],
    rules:["تطلع بداية قصة غريبة","كل واحد يكتب السطر اللي بعده","تصوتون على أحلى سطر، ويدخل القصة","بالأخير نقرا القصة كاملة 📖"],
    winTitle:"أعظم مؤلف!",likeTitle:"",
    timed:["write","pickv"],
    start(){H.g={story:[{x:pick(OPENERS),by:null}],round:0,rounds:5};this.next()},
    next(){const g=H.g;g.round++;if(g.round>g.rounds){H.ph="story";H.k++;setTimer(Math.round(g.story.length*2.2+8));H.quip="";sfx.go();return}
      g.lines={};H.ph="write";H.k++;setTimer(50);sfx.go();H.quip=g.round===g.rounds?"آخر سطر! اكتبوا النهاية 🎬":pick(["وش صار بعدها؟ ✍️","كمّلوا… وخلّوها أغرب!","القصة تحتاج لفّة غير متوقعة"])},
    tick(now){const g=H.g;
      if(H.ph==="write"){active().forEach(id=>{const a=K.act(id);if(a&&typeof a.text==="string"&&a.text.trim()&&!g.lines[id])g.lines[id]=clip(a.text,90)});
        if(now>H.end||g.forceSkip||(active().length&&active().every(id=>g.lines[id]))){g.forceSkip=false;
          g.opts=shuffle(Object.entries(g.lines).map(([by,x])=>({by,x})));g.votes={};
          if(!g.opts.length){g.story.push({x:"…وفجأة صار شي ما أحد توقعه!",by:null});return this.next()}
          if(g.opts.length===1){g.win=g.opts[0];g.story.push(g.win);C.add(g.win.by,500);H.ph="added";H.k++;setTimer(5);return}
          H.ph="pickv";H.k++;setTimer(25);H.quip="أي سطر أحلى؟ صوّتوا من جوالاتكم"}}
      else if(H.ph==="pickv"){active().forEach(id=>{const a=K.act(id);if(a&&Number.isInteger(a.v)&&g.opts[a.v]&&g.opts[a.v].by!==id)g.votes[id]=a.v});
        if(now>H.end||g.forceSkip||(active().length&&active().every(id=>g.votes[id]!==undefined||!g.opts.some(o=>o.by!==id)))){g.forceSkip=false;this.pickWinner()}}
      else if(H.ph==="added"){if(now>H.end)this.next()}
      else if(H.ph==="story"){if(now>H.end)K.finishGame()}},
    pickWinner(){const g=H.g,cnt=g.opts.map(()=>0);Object.values(g.votes).forEach(i=>cnt[i]++);g.cnt=cnt;
      g.opts.forEach((o,i)=>C.add(o.by,cnt[i]*100));const max=Math.max(...cnt),tops=g.opts.filter((_,i)=>cnt[i]===max);
      g.win=pick(tops);C.add(g.win.by,500);g.story.push(g.win);H.ph="added";H.k++;setTimer(7);sfx.truth();confetti(80)},
    doneMap(){const g=H.g;return H.ph==="write"?g.lines:H.ph==="pickv"?g.votes:null},
    view(v){const g=H.g;if(!g.story)return;v.last=g.story[g.story.length-1].x;v.r=g.round;v.rr=g.rounds;
      if(H.ph==="pickv")v.opts=g.opts.map(o=>({x:o.x,own:o.by}));
      if(["write","pickv"].includes(H.ph))v.done=Object.keys(this.doneMap()||{});
      if(["added","story"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return g.round<=g.rounds?`<span class="pill">السطر ${fmt(g.round)} من ${fmt(g.rounds)}</span>`:""},
    storyHTML(anim,hi){const g=H.g;return`<div class="ticket qs-story">${g.story.map((s,i)=>`<span class="qs-line ${anim?"anim":""} ${hi&&i===g.story.length-1?"hi":""}" style="--d:${(i*2.2).toFixed(1)}s">${esc(s.x)}${s.by?` <small>(${esc(nm(s.by))})</small>`:""}</span>`).join(" ")}</div>`},
    render(){const g=H.g;
      if(H.ph==="write"){const tail=g.story.slice(-2);return C.head(H.quip)+`<div class="ticket qs-story">${g.story.length>2?"<span class=\"note\">…</span> ":""}${tail.map(s=>`<span class="qs-line">${esc(s.x)}</span>`).join(" ")} <span class="blank">&nbsp;</span></div><div id="dyn" class="still">${this.dyn()}</div>`}
      if(H.ph==="pickv")return C.head(H.quip)+`<div class="ticket qs-story"><span class="qs-line">${esc(g.story[g.story.length-1].x)}</span> <span class="blank">&nbsp;</span></div><div class="opts">${g.opts.map((o,i)=>`<div class="opt" style="--o:${K.OPTC[i%K.OPTC.length]};animation-delay:${i*.08}s">${esc(o.x)}</div>`).join("")}</div><div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="added")return`<h2 style="font-size:40px;text-align:center">✨ دخل القصة:</h2><div class="reveal"><div class="answer">${esc(g.win.x)}</div><div class="who">${C.avatar(g.win.by)}<span>${esc(nm(g.win.by))}</span><span class="pts">+٥٠٠</span></div></div>`;
      if(H.ph==="story")return`<h2 style="font-size:clamp(30px,4vw,48px);text-align:center">📖 قصتنا الكاملة</h2>${this.storyHTML(true)}`;
      return""},
    dyn(){const g=H.g;const m=this.doneMap();return m?K.troupe(active(),new Set(Object.keys(m))):""},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);
      if(v.ph==="write"){root.insertAdjacentHTML("beforeend",`<p class="note">آخر سطر في القصة:</p><div class="pq">${esc(v.last)}</div><h2 style="font-size:26px">${v.r===v.rr?"اكتب النهاية 🎬":"وش صار بعدها؟ ✍️"}</h2>${tline}<div id="qsBox"></div>`);
        C.textForm(document.getElementById("qsBox"),{ph:"اكتب السطر الجاي…",max:90,onSend:t=>{K.sendAct({k:v.k,text:t});C.sent(document.getElementById("qsBox"),"📨","وصل سطرك!","")}});return}
      if(v.ph==="pickv"){root.insertAdjacentHTML("beforeend",`<h2 style="font-size:26px">أي سطر أحلى؟</h2>${tline}<div id="qsBox"></div>`);
        const box=document.getElementById("qsBox");C.choices(box,(v.opts||[]).map((o,i)=>({t:o.x+(o.own===me?" (سطرك)":""),off:o.own===me,val:i})),it=>{K.sendAct({k:v.k,v:it.val});C.sent(box,"🗳️","تم!","")});return}
      C.watch(root,v,v.ph==="story"?"📖":"👀");},
  };
});

/* =====================================================================
   5) صح ولا كذب عنّي: two truths and a lie about yourself
   ===================================================================== */
B.push(K=>{
  const {H,esc,clip,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,playSting}=K;
  const C=common(K);
  return{
    id:"sahkidb",name:"صح ولا كذب عنّي",emoji:"🎭",color:"#ff7fd0",min:3,
    desc:"اكتب شيئين صح عنك وكذبة وحدة… وشوف مين يعرفك صدق!",
    tags:["٣-٨ لاعبين","تعارف","مناسبة للعائلة"],
    rules:["كل واحد يكتب ٣ معلومات عن نفسه: ٢ صح و١ كذب","تطلع معلومات كل لاعب على الشاشة","الباقين يحاولون يكتشفون الكذبة","+٥٠٠ إذا عرفتها، و+٣٠٠ لك عن كل واحد انخدع"],
    winTitle:"أذكى واحد في الجلسة!",likeTitle:"",
    timed:["facts","spot"],
    start(){H.g={subs:{}};H.ph="facts";H.k++;setTimer(100);sfx.go();H.quip="اكتبوا شيئين صح عنكم وكذبة وحدة… خلّوها صعبة!"},
    tick(now){const g=H.g;
      if(H.ph==="facts"){active().forEach(id=>{const a=K.act(id);if(!a||g.subs[id]||!Array.isArray(a.st)||a.st.length!==3||![0,1,2].includes(a.lie))return;
          const st=a.st.map(x=>clip(x,70));if(st.some(x=>!x))return;g.subs[id]={st,lie:a.lie}});
        if(now>H.end||g.forceSkip||(active().length&&active().every(id=>g.subs[id]))){g.forceSkip=false;g.queue=shuffle(Object.keys(g.subs));this.nextP()}}
      else if(H.ph==="spot"){active().forEach(id=>{if(id===g.cur)return;const a=K.act(id);if(a&&[0,1,2].includes(a.pick))g.picks[id]=a.pick});
        const v=active().filter(id=>id!==g.cur);if(now>H.end||g.forceSkip||(v.length&&v.every(id=>g.picks[id]!==undefined))){g.forceSkip=false;this.unmask()}}
      else if(H.ph==="unmask"){if(now>H.end)this.nextP()}},
    nextP(){const g=H.g;if(!g.queue||!g.queue.length)return K.finishGame();
      g.cur=g.queue.shift();const s=g.subs[g.cur],ord=shuffle([0,1,2]);g.show=ord.map(i=>s.st[i]);g.lieAt=ord.indexOf(s.lie);g.picks={};
      H.ph="spot";H.k++;setTimer(30);sfx.swoosh();H.quip=pick(["وحدة من هذي كذبة… أي وحدة؟ 🤔","تعرفونه زين؟ نشوف!","لا تصدقون كل شي تسمعونه 😏"])},
    unmask(){const g=H.g;let fooled=0;Object.entries(g.picks).forEach(([id,p])=>{if(p===g.lieAt)C.add(id,500);else fooled++});C.add(g.cur,fooled*300);g.fooled=fooled;
      H.ph="unmask";H.k++;setTimer(8);playSting("sting_reveal",sfx.drum);setTimeout(()=>{sfx.lie();if(Object.values(g.picks).some(p=>p===g.lieAt))confetti(80)},1500)},
    doneMap(){const g=H.g;return H.ph==="facts"?g.subs:H.ph==="spot"?g.picks:null},
    view(v){const g=H.g;if(H.ph==="spot"){v.cur=g.cur;v.show=g.show}if(H.ph==="facts")v.done=Object.keys(g.subs);if(H.ph==="unmask")v.sc=H.sc},
    pill(){const g=H.g;return H.ph==="facts"?"":`<span class="pill">باقي ${fmt((g.queue||[]).length)} لاعبين</span>`},
    render(){const g=H.g;
      if(H.ph==="facts")return C.head(H.quip)+`<div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">🎭</span><h2 style="font-size:clamp(32px,4.6vw,52px)">٢ صح… و١ كذب</h2><p class="note" style="font-size:19px">مثال: «عمري ما ركبت طيارة» · «أخاف من البط» · «أحب الباذنجان»</p></div><div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="spot"||H.ph==="unmask"){const u=H.ph==="unmask";
        const cnt=i=>Object.values(g.picks).filter(p=>p===i).length;
        return(u?"":C.head(H.quip))+`<div class="row" style="justify-content:center">${C.avatar(g.cur,"lg")}<h2 style="font-size:clamp(30px,4vw,46px)">${esc(nm(g.cur))} يقول:</h2></div>
        <div class="col tk-list">${g.show.map((x,i)=>`<div class="opt tk-st ${u?(i===g.lieAt?"lie":"ok"):""}" style="--o:${K.OPTC[i]};animation-delay:${i*.15}s"><span>${esc(x)}</span>${u?`<b class="tk-tag">${i===g.lieAt?"كذبة! 🤥":"صح ✅"}</b><small>${fmt(cnt(i))} 👆</small>`:""}</div>`).join("")}</div>
        ${u?`<div class="who" style="justify-content:center">${g.fooled?`<span>انخدع ${fmt(g.fooled)}</span><span class="pts">+${fmt(g.fooled*300)}</span>`:"<span>ما خدع أحد 😅</span>"}</div>`:`<div id="dyn" class="still">${this.dyn()}</div>`}`}
      return""},
    dyn(){const g=H.g;if(H.ph==="facts")return K.troupe(active(),new Set(Object.keys(g.subs)));if(H.ph==="spot")return K.troupe(active().filter(id=>id!==g.cur),new Set(Object.keys(g.picks)));return""},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);
      if(v.ph==="facts"){root.insertAdjacentHTML("beforeend",`<h2 style="font-size:26px">اكتب ٣ معلومات عنك</h2><p class="note">اثنين صح وحدة كذب، وحدد الكذبة 🤥</p>${tline}
        <div id="tkBox" class="col">${[0,1,2].map(i=>`<div class="tk-row"><input type="text" class="tk-in" maxlength="70" placeholder="معلومة ${["أولى","ثانية","ثالثة"][i]}…" autocomplete="off"><button class="tk-lie" data-l="${i}" aria-pressed="false">🤥</button></div>`).join("")}
        <p class="note">اضغط 🤥 جنب الكذبة</p><button class="btn coral wide" id="tkSend">أرسل 🎭</button><p class="err" id="tkErr"></p></div>`);
        let lie=-1;const ins=[...root.querySelectorAll(".tk-in")];
        root.querySelectorAll(".tk-lie").forEach(b=>b.onclick=()=>{lie=+b.dataset.l;root.querySelectorAll(".tk-lie").forEach(x=>x.setAttribute("aria-pressed",x===b))});
        document.getElementById("tkSend").onclick=()=>{const st=ins.map(i=>clip(i.value,70));const e=document.getElementById("tkErr");
          if(st.some(x=>!x))return e.textContent="اكتب الثلاث معلومات كلها.";if(lie<0)return e.textContent="حدد أي وحدة هي الكذبة 🤥";
          K.sendAct({k:v.k,st,lie});C.sent(document.getElementById("tkBox"),"🤫","تم!","لا تفضح نفسك 😏")};return}
      if(v.ph==="spot"){if(v.cur===me){C.watch(root,v,"😇","هذي معلوماتك!","خلك طبيعي… لا تضحك 😐");return}
        root.insertAdjacentHTML("beforeend",`<h2 style="font-size:26px">وين الكذبة؟ 🔍</h2><p class="note">عن ${C.pnm(v,v.cur)}</p>${tline}<div id="tkBox"></div>`);
        const box=document.getElementById("tkBox");C.choices(box,(v.show||[]).map((x,i)=>({t:x,val:i})),it=>{K.sendAct({k:v.k,pick:it.val});C.sent(box,"🤞","اخترت!","«"+esc(it.t)+"»")});return}
      C.watch(root,v);},
  };
});

/* =====================================================================
   6) الإيموجي الغامض: guess the movie/proverb/place from emojis
   ===================================================================== */
B.push(K=>{
  const {H,esc,clip,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,norm,nearTruth}=K;
  const C=common(K);
  const F="🎬 فيلم أو كرتون",M="📜 مثل شعبي",P="🌍 مكان",E="🍽️ أكل وشرب";
  const PUZ=[
    {e:"🦁👑",c:F,a:"الأسد الملك",alt:["الملك الأسد","lion king","ذا لايون كينج","ليون كينج"]},
    {e:"🧞‍♂️🪔🐒",c:F,a:"علاء الدين",alt:["علاءالدين","علاء الدين والمصباح السحري","aladdin"]},
    {e:"🐠🔍",c:F,a:"البحث عن نيمو",alt:["نيمو","nemo","finding nemo"]},
    {e:"❄️👸⛄",c:F,a:"ملكة الثلج",alt:["فروزن","frozen","ملكة الثلوج","ملكه الثلج"]},
    {e:"🕷️🧑",c:F,a:"سبايدرمان",alt:["الرجل العنكبوت","سبايدر مان","spiderman","spider man"]},
    {e:"🐀👨‍🍳🍲",c:F,a:"راتاتوي",alt:["رتاتوي","ratatouille","الفار الطباخ"]},
    {e:"🧸🤠🚀",c:F,a:"حكاية لعبة",alt:["توي ستوري","toy story","قصة لعبة"]},
    {e:"🐼🥋",c:F,a:"كونغ فو باندا",alt:["كونغفو باندا","كونج فو باندا","كنغ فو باندا","kung fu panda"]},
    {e:"🧽🍍🌊",c:F,a:"سبونج بوب",alt:["سبونجبوب","spongebob","سبونج بوب سكوير بانتس"]},
    {e:"🐱🐭💥",c:F,a:"توم وجيري",alt:["توم و جيري","tom and jerry","توم اند جيري"]},
    {e:"🐢🥷🍕",c:F,a:"سلاحف النينجا",alt:["سلاحف نينجا","النينجا","ninja turtles"]},
    {e:"⚽🧒⭐",c:F,a:"كابتن ماجد",alt:["الكابتن ماجد","captain majed"]},
    {e:"🎈🏠👴",c:F,a:"فوق",alt:["up","أب","البيت الطاير"]},
    {e:"👸🍎😴",c:F,a:"سنو وايت",alt:["بياض الثلج","سنووايت","snow white","سنو وايت والاقزام السبعة"]},
    {e:"🦇🦸‍♂️🌃",c:F,a:"باتمان",alt:["بات مان","batman","الرجل الوطواط"]},
    {e:"🐦✋🌳",c:M,a:"عصفور في اليد خير من عشرة على الشجرة",alt:["عصفور في اليد","عصفور باليد خير من عشرة على الشجرة","عصفور في اليد ولا عشرة على الشجرة","عصفور باليد ولا عشرة على الشجرة"]},
    {e:"⏰🗡️",c:M,a:"الوقت كالسيف",alt:["الوقت كالسيف ان لم تقطعه قطعك","الوقت سيف","الوقت مثل السيف"]},
    {e:"🐒👁️👩🦌",c:M,a:"القرد في عين أمه غزال",alt:["القرد بعين امه غزال","القرد في عين امه غزال"]},
    {e:"⏳🔑",c:M,a:"الصبر مفتاح الفرج",alt:["الصبر مفتاح"]},
    {e:"🤐🥇",c:M,a:"السكوت من ذهب",alt:["اذا كان الكلام من فضة فالسكوت من ذهب","السكوت ذهب","الصمت من ذهب"]},
    {e:"🪨🐦🐦",c:M,a:"ضرب عصفورين بحجر",alt:["عصفورين بحجر","عصفورين بحجر واحد","ضرب عصفورين بحجر واحد"]},
    {e:"🍞🧂",c:M,a:"عيش وملح",alt:["بيننا عيش وملح","العيش والملح","خبز وملح"]},
    {e:"🗼🥐",c:P,a:"باريس",alt:["paris","فرنسا"]},
    {e:"🗽🍎🏙️",c:P,a:"نيويورك",alt:["new york","نيو يورك"]},
    {e:"🍕🛵🏛️",c:P,a:"إيطاليا",alt:["روما","italy","ايطاليا"]},
    {e:"🏯🍣🗻",c:P,a:"اليابان",alt:["طوكيو","japan"]},
    {e:"🐼🧱🥢",c:P,a:"الصين",alt:["china","بكين"]},
    {e:"🐪🔺🔺",c:P,a:"مصر",alt:["الاهرامات","الأهرام","egypt","القاهرة"]},
    {e:"🧀🍔",c:E,a:"تشيز برجر",alt:["برجر بالجبن","cheeseburger","تشيزبرجر","برقر جبن","تشيز برقر"]},
    {e:"🥔🍟",c:E,a:"بطاطس مقلية",alt:["بطاطس","فرايز","بطاطا مقلية","فرنش فرايز","french fries"]},
    {e:"🍫🥛",c:E,a:"حليب بالشوكولاتة",alt:["حليب شوكولاتة","شوكولاتة بالحليب","حليب شوكولا","ميلك شوكليت"]},
    {e:"🌽💥🎬",c:E,a:"فشار",alt:["بوب كورن","popcorn","فشار السينما","بوشار"]},
  ];
  const ROUNDS=8;
  return{
    id:"emoji",name:"الإيموجي الغامض",emoji:"🧩",color:"#ffcc33",min:2,
    desc:"فيلم أو مثل أو مكان مكتوب بالإيموجي بس… مين يعرفه أسرع؟",
    tags:["٢-٨ لاعبين","سرعة","مناسبة للأطفال"],
    rules:["تطلع إيموجيات على الشاشة","اكتب وش تقصد بأسرع وقت","أول واحد يعرف ياخذ نقاط أكثر","تقدر تجرّب أكثر من مرة"],
    winTitle:"ملك الإيموجي!",likeTitle:"",
    timed:["solve"],
    start(){H.g={list:shuffle(PUZ).slice(0,ROUNDS),i:-1};this.next()},
    next(){const g=H.g;g.i++;if(g.i>=g.list.length)return K.finishGame();
      if(g.i===4&&!g.mid){g.mid=1;g.i--;return C.scores(6)}
      g.p=g.list[g.i];g.truths=[g.p.a,...g.p.alt].map(norm);g.solved=[];g.wrong={};g.seen={};g.t0=Date.now();
      H.ph="solve";H.k++;setTimer(30);sfx.tada();H.quip=pick(["وش هذا؟ 🤔","اكتبوا بسرعة!","سهلة… ولا؟"])},
    tick(now){const g=H.g;
      if(H.ph==="solve"){active().forEach(id=>{if(g.solved.includes(id))return;const a=K.act(id);if(!a||typeof a.ans!=="string"||g.seen[id]===a.n)return;g.seen[id]=a.n;
          if(nearTruth(a.ans,g.truths)){g.solved.push(id);const pts=Math.max(400,1000-200*(g.solved.length-1));C.add(id,pts);sfx.coin()}else{g.wrong[id]=a.n}});
        if(now>H.end||g.forceSkip||(active().length&&active().every(id=>g.solved.includes(id)))){g.forceSkip=false;H.ph="answer";H.k++;setTimer(6);g.solved.length?sfx.truth():sfx.lie()}}
      else if(H.ph==="answer"){if(now>H.end)this.next()}
      else if(H.ph==="scores"){if(now>H.end)this.next()}},
    doneMap(){const g=H.g;if(H.ph!=="solve")return null;const m={};g.solved.forEach(id=>m[id]=1);return m},
    hint(){const g=H.g,el=Date.now()-g.t0;if(el<12000)return"";const w=g.p.a.split(" ");return w.map(x=>[...x].map((ch,i)=>i===0?ch:"_").join(" ")).join("   ")},
    view(v){const g=H.g;if(H.ph==="solve"){v.e=g.p.e;v.c=g.p.c;v.solved=g.solved;v.wrong=g.wrong}if(["answer","scores"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">اللغز ${fmt(Math.min(g.i+1,g.list.length))} من ${fmt(g.list.length)}</span>`},
    render(){const g=H.g;
      if(H.ph==="solve")return C.head(H.quip)+`<div class="ticket" style="text-align:center"><span class="cat">${esc(g.p.c)}</span><div class="em-big">${g.p.e}</div><div id="dyn" class="still">${this.dyn()}</div></div>`;
      if(H.ph==="answer")return`<div class="reveal" style="padding-top:20px"><div class="em-big" style="font-size:clamp(60px,9vw,110px)">${g.p.e}</div><div class="answer">${esc(g.p.a)}</div>
        <div class="who">${g.solved.length?g.solved.map((id,i)=>`${C.avatar(id)}<span>${esc(nm(id))}</span><span class="pts">+${fmt(Math.max(400,1000-200*i))}</span>`).join(""):"<span>ولا أحد عرفها! 😅</span>"}</div></div>`;
      if(H.ph==="scores")return C.scoresHTML();
      return""},
    dyn(){const g=H.g;if(H.ph!=="solve")return"";const h=this.hint();
      return`${h?`<p class="em-hint">${esc(h)}</p>`:""}${K.troupe(active(),new Set(g.solved))}`},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);
      if(v.ph==="solve"){root.insertAdjacentHTML("beforeend",`<div class="pq" style="text-align:center"><small>${esc(v.c)}</small><div style="font-size:64px;line-height:1.3">${v.e}</div></div>${tline}<div id="emBox"></div>`);
        this.form(v);this.phoneLive(v);return}
      C.watch(root,v);},
    form(v,msg){const box=document.getElementById("emBox");if(!box)return;C.L.n=C.L.n||0;
      C.textForm(box,{ph:"وش هو؟",max:50,btn:"جرّب 🎯",onSend:t=>{C.L.n++;C.L.wait=C.L.n;K.sendAct({k:v.k,ans:t,n:C.L.n});box.innerHTML=`<p class="big">🤔…</p>`}});
      if(msg)box.insertAdjacentHTML("afterbegin",`<p class="err">${msg}</p>`)},
    phoneLive(v){if(v.ph!=="solve")return;const me=K.me(),L=C.L,box=document.getElementById("emBox");if(!box)return;
      if((v.solved||[]).includes(me)){if(!L.ok){L.ok=1;sfx.truth();C.sent(box,"✅","صح عليك!","المركز "+fmt(v.solved.indexOf(me)+1))}return}
      if(L.wait&&v.wrong&&v.wrong[me]===L.wait){L.wait=0;sfx.lie();this.form(v,"❌ مو هي… جرّب مرة ثانية")}},
  };
});

/* =====================================================================
   7) لا تضحك: write the funniest answer, the others react 😂 / 😐
   ===================================================================== */
B.push(K=>{
  const {H,esc,clip,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti}=K;
  const C=common(K);
  const PROMPTS=["أغرب شي ممكن تلقاه في ثلاجة جدتك","اسم مطعم أكيد ما أحد بيدخله","أسوأ هدية عيد ميلاد ممكن تجيك","لو القطط تتكلم، أول جملة بتقولها","شي ما تبي تسمعه من الكابتن وأنت في الطيارة","أسوأ اسم ممكن تسمّي فيه سمكتك","وش يقول الديناصور لما يشوف دجاجة؟","اختراع جديد يحل مشكلة ما أحد طلب حلها","أغرب سبب ممكن تتأخر فيه عن المدرسة","شي تقوله لو صحيت ولقيت نفسك قطوة","عنوان أغنية عن البطاطس","شي ما لازم تقوله في مقابلة وظيفة","أسوأ نصيحة ممكن تعطيها لأخوك الصغير","وش يفكر فيه الكنب طول اليوم؟","رسالة تكتبها لنفسك بعد ٢٠ سنة","أسوأ مكان تحط فيه مفتاح البيت","وش آخر شي قاله الريموت قبل ما يضيع؟","اسم جديد ومضحك للبيتزا","شي يسويه الفيل لما يكون زعلان","لو المدرسة فيها مادة جديدة غريبة، وش اسمها؟","أغرب سبب لزعل الثلاجة","وش يقول الكرسي لما أحد يجلس عليه؟","أكلة جديدة ما أحد يبي يذوقها","أسوأ وقت تعطس فيه","شي تقوله الغيمة قبل ما تمطر"];
  return{
    id:"latidhak",name:"لا تضحك",emoji:"😂",color:"#ff4f6d",min:3,
    desc:"اكتب أضحك جواب، والكل يحكم من جواله: 😂 ولا 😐؟",
    tags:["٣-٨ لاعبين","كتابة","ضحك"],
    rules:["يطلع سؤال غريب، وكل واحد يكتب أضحك جواب","تطلع الأجوبة وحدة وحدة بدون أسماء","الباقين يضغطون 😂 أو 😐","كل 😂 = ٢٠٠ نقطة لصاحب الجواب"],
    winTitle:"ملك الضحك!",likeTitle:"",
    timed:["joke"],
    start(){H.g={round:0,rounds:3,used:new Set()};this.newRound()},
    newRound(){const g=H.g;g.round++;if(g.round>g.rounds)return K.finishGame();
      g.q=shuffle(PROMPTS).find(p=>!g.used.has(p))||pick(PROMPTS);g.used.add(g.q);g.ans={};
      H.ph="joke";H.k++;setTimer(60);sfx.go();H.quip=pick(["خلّوهم يضحكون!","الجواب الجدّي ممنوع 😂","فكّروا بأغرب جواب"])},
    tick(now){const g=H.g;
      if(H.ph==="joke"){active().forEach(id=>{const a=K.act(id);if(a&&typeof a.text==="string"&&a.text.trim()&&!g.ans[id])g.ans[id]=clip(a.text,80)});
        if(now>H.end||g.forceSkip||(active().length&&active().every(id=>g.ans[id]))){g.forceSkip=false;g.queue=shuffle(Object.keys(g.ans));g.best=null;this.nextA()}}
      else if(H.ph==="laugh"){active().forEach(id=>{if(id===g.cur)return;const a=K.act(id);if(a&&(a.r===1||a.r===0)){if(g.react[id]!==a.r){g.react[id]=a.r;if(a.r===1)sfx.pop()}}});
        if(now>H.end){const l=Object.values(g.react).filter(r=>r===1).length;C.add(g.cur,l*200);if(!g.best||l>g.best.l)g.best={id:g.cur,l};this.nextA()}}
      else if(H.ph==="best"){if(now>H.end)C.scores(7)}
      else if(H.ph==="scores"){if(now>H.end)this.newRound()}},
    nextA(){const g=H.g;if(!g.queue.length){if(g.best&&g.best.l>0){H.ph="best";H.k++;setTimer(6);sfx.truth();confetti()}else C.scores(7);return}
      g.cur=g.queue.shift();g.react={};H.ph="laugh";H.k++;setTimer(9);sfx.swoosh()},
    doneMap(){const g=H.g;return H.ph==="joke"?g.ans:null},
    view(v){const g=H.g;v.q=g.q;if(H.ph==="laugh"){v.cur=g.cur;v.a=g.ans[g.cur]}if(["best","scores"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">الجولة ${fmt(g.round)} من ${fmt(g.rounds)}</span>`},
    render(){const g=H.g;
      if(H.ph==="joke")return C.head(H.quip)+`<div class="ticket" style="text-align:center"><span class="cat">السؤال</span><p class="qtext">${esc(g.q)}</p></div><div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="laugh")return`<div class="spread"><p class="note" style="font-size:20px">${esc(g.q)}</p>${K.ringHTML()}</div><div class="reveal"><div class="answer lt-ans">${esc(g.ans[g.cur])}</div><div id="dyn" class="still">${this.dyn()}</div>
        <div class="who" style="animation-delay:5.5s">${C.avatar(g.cur)}<span>${esc(nm(g.cur))}</span></div></div>`;
      if(H.ph==="best")return`<div class="reveal" style="padding-top:20px"><p class="note" style="font-size:22px">😂 أضحك جواب في الجولة:</p><div class="answer">${esc(g.ans[g.best.id])}</div><div class="who">${C.avatar(g.best.id)}<span>${esc(nm(g.best.id))}</span><span class="pts">${fmt(g.best.l)} 😂</span></div></div>`;
      if(H.ph==="scores")return C.scoresHTML();
      return""},
    dyn(){const g=H.g;
      if(H.ph==="joke")return K.troupe(active(),new Set(Object.keys(g.ans)));
      if(H.ph==="laugh"){const l=Object.values(g.react).filter(r=>r===1).length,s=Object.values(g.react).filter(r=>r===0).length;
        return`<div class="lt-meter"><span class="lt-l">${"😂".repeat(Math.max(1,Math.min(l,8)))}<b>${fmt(l)}</b></span><span class="lt-s">${"😐".repeat(Math.max(1,Math.min(s,8)))}<b>${fmt(s)}</b></span></div><p class="note center">اضغطوا 😂 أو 😐 من جوالاتكم</p>`}
      return""},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);
      if(v.ph==="joke"){root.insertAdjacentHTML("beforeend",`<div class="pq">${esc(v.q)}</div><h2 style="font-size:26px">اكتب أضحك جواب 😂</h2>${tline}<div id="ltBox"></div>`);
        C.textForm(document.getElementById("ltBox"),{ph:"جوابك…",max:80,onSend:t=>{K.sendAct({k:v.k,text:t});C.sent(document.getElementById("ltBox"),"😏","وصل!","ننتظر الباقين…")}});return}
      if(v.ph==="laugh"){if(v.cur===me){C.watch(root,v,"🙈","هذا جوابك!","لا تضحك على نفسك 😂");return}
        root.insertAdjacentHTML("beforeend",`<div class="pq">${esc(v.a)}</div><div class="lt-btns"><button class="lt-b" data-r="1">😂</button><button class="lt-b" data-r="0">😐</button></div>`);
        root.querySelectorAll(".lt-b").forEach(b=>b.onclick=()=>{K.sendAct({k:v.k,r:+b.dataset.r});root.querySelectorAll(".lt-b").forEach(x=>x.setAttribute("aria-pressed",x===b))});return}
      C.watch(root,v);},
  };
});
})();
