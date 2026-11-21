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
  const tline=v=>`<p class="note">⏱ باقي <b id="ptl">${Number(v.tl)||0}</b> ثانية</p>`;
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
    // when time runs out, whatever was typed is sent
    K.autoSend(()=>{if(inp.isConnected&&clip(inp.value,max))go()});
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
    timed:["bid"],options:[K.roundsOpt([4,6,9],6,"عدد الأغراض")],
    start(){const pl=[...H.order];H.g={pl,wallet:{},owned:{},items:shuffle(ITEMS.map((_,i)=>i)).slice(0,K.opt("r")),i:-1};
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
      else if(H.ph==="sold"){if(now>H.end){if(g.i===Math.floor(g.items.length/2)-1)C.scores(7);else this.next()}}
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
        root.insertAdjacentHTML("beforeend",`<div class="pq mz-pcard"><span style="font-size:44px">${esc(v.it.e)}</span><b>${esc(v.it.n)}</b><small>${esc(v.it.d)}</small></div>${tline}<div id="mzBox"></div>`);
        this.phoneLive(v,true);return}
      C.watch(root,v,v.ph==="sold"?"🔍":"👀");},
    phoneLive(v,force){if(v.ph!=="bid")return;const box=document.getElementById("mzBox");if(!box)return;const me=K.me(),L=C.L;
      const sig=[v.high,v.leader,v.wallet[me]].join("|");if(!force&&L.sig===sig)return;L.sig=sig;
      const mine=v.wallet[me]||0,lead=v.leader===me;
      box.innerHTML=`<div class="mz-pstat"><span>أعلى سعر: <b>${fmt(v.high)}</b></span><span>${lead?"👑 أنت الأعلى!":v.leader?`${C.pnm(v,v.leader)} الأعلى`:"ابدأ المزاد!"}</span></div>
        <p class="note center">فلوسك: <b>${fmt(mine)}</b> ريال</p>
        <div class="mz-btns">${STEP.map(s=>{const b=(Number(v.high)||0)+s;return`<button class="pbtn" data-b="${b}" style="--o:${K.OPTC[STEP.indexOf(s)]}" ${b>mine||lead?"disabled":""}>+${fmt(s)}<small>${fmt(b)}</small></button>`}).join("")}</div>`;
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
    options:[{key:"dt",label:"وقت الرسم",choices:[["75","دقيقة وربع"],["120","دقيقتين"],["180","٣ دقايق"]],def:"120"}],
    start(){const pl=shuffle(active()),n=pl.length;H.g={pl,steps:Math.min(n,6),s:-1,chains:pl.map(()=>[]),strokes:{},votes:{}};this.step()},
    who(c,s){const g=H.g;return g.pl[(c+s)%g.pl.length]},
    step(){const g=H.g;g.s++;
      if(g.s>=g.steps){g.ci=-1;return this.nextShow()}
      g.got={};H.ph=kindOf(g.s);H.k++;
      setTimer(H.ph==="write0"?50:H.ph==="sketch"?(+K.opt("dt")||120):40);sfx.go();
      H.quip=H.ph==="write0"?"اكتبوا جملة غريبة… كل ما كانت أغرب كان أحسن!":H.ph==="sketch"?"ارسموا الجملة اللي وصلتكم! 🎨":"خمّنوا وش هذي الرسمة؟ 🤔"},
    tick(now){const g=H.g;
      if(["write0","sketch","guessd"].includes(H.ph)){
        g.chains.forEach((ch,c)=>{const id=this.who(c,g.s);if(g.got[id])return;const a=K.act(id);if(!a)return;
          if(H.ph==="sketch"&&K.okDraw(a.draw))g.got[id]={t:"d",id:a.draw,by:id};
          else if(H.ph!=="sketch"&&typeof a.text==="string"&&a.text.trim())g.got[id]={t:"w",x:clip(a.text,60),by:id}});
        const need=g.pl.filter(id=>active().includes(id));
        const all=need.every(id=>g.got[id]);
        // drawings are auto-sent when time runs out: wait a few seconds for them
        if(!all&&H.ph==="sketch"&&(now>H.end||g.forceSkip)){if(!g.graceAt)g.graceAt=now+4500;if(now<g.graceAt)return}
        if(now>H.end||g.forceSkip||all){g.forceSkip=false;g.graceAt=0;
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
        return C.head(H.quip)+`<div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">${big}</span><h2 style="font-size:clamp(32px,calc(var(--sw)*0.046),52px)">${H.ph==="write0"?"كل واحد يكتب جملة غريبة":H.ph==="sketch"?"ارسموا الجملة اللي وصلتكم":"وش هذي الرسمة؟ اكتبوا تخمينكم"}</h2><p class="note" style="font-size:19px">لا أحد يطل على جوال الثاني! 🙈</p></div><div id="dyn" class="still">${this.dyn()}</div>`}
      if(H.ph==="show"){const ch=g.chains[g.ci];return`<h2 style="font-size:clamp(28px,calc(var(--sw)*0.036),44px);text-align:center">سلسلة ${esc(nm(g.pl[g.ci]))} 📜</h2>${this.chainHTML(ch,true)}`}
      if(H.ph==="rate")return C.head(H.quip)+`<div class="opts">${g.chains.map((ch,c)=>`<div class="opt" style="--o:${K.OPTC[c%K.OPTC.length]}">«${esc((ch[0]&&ch[0].x)||"…")}» ← «${esc(((ch.filter(x=>x.t==="w").pop())||{}).x||"…")}»</div>`).join("")}</div><div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="rated"){const ch=g.chains[g.best];return`<div class="col center" style="gap:10px"><h2 style="font-size:clamp(28px,calc(var(--sw)*0.036),44px)">😂 أضحك سلسلة: سلسلة ${esc(nm(g.pl[g.best]))}</h2><p class="note" style="font-size:20px">${fmt(g.count[g.best])} صوت · كل اللي شاركوا فيها +٣٠٠ لكل صوت</p></div>${this.chainHTML(ch,false)}`}
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
        root.insertAdjacentHTML("beforeend",`<h2 style="font-size:26px">وش هذي الرسمة؟ 🤔</h2>${tline}${task&&task.t==="d"?`<div class="frame" style="margin:14px auto;width:min(calc(var(--sw)*0.7),320px)"><canvas id="mkCv"></canvas></div>`:`<div class="pq">${esc(task?task.x:"…")}</div><p class="note">ما وصلت رسمة، اكتب الجملة بأسلوبك 😅</p>`}<div id="mkBox"></div>`);
        if(task&&task.t==="d")api("GET","/drawings/"+encodeURIComponent(task.id)).then(r=>{const j=(v.order||[]).indexOf(task.by);paint(document.getElementById("mkCv"),cleanStrokes(r.strokes),null,false,c=>K.colorOf(c,INK[Math.max(0,j)%8]))}).catch(()=>{});
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
    timed:["argue","judge"],options:[K.roundsOpt([1,2,3],2)],
    start(){H.g={round:0,rounds:K.opt("r"),used:[]};this.newRound()},
    newRound(){const g=H.g;g.round++;if(g.round>g.rounds)return K.finishGame();
      const pl=shuffle(active());g.debates=[];g.sitOut=pl.length%2?pl[pl.length-1]:null;
      for(let i=0;i+1<pl.length;i+=2){let t=shuffle(TOPICS).find(x=>!g.used.includes(x.q+x.a))||pick(TOPICS);g.used.push(t.q+t.a);g.debates.push({t,A:pl[i],B:pl[i+1],args:{}})}
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
      if(H.ph==="argue")return C.head(H.quip)+`<div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">⚖️</span><h2 style="font-size:clamp(32px,calc(var(--sw)*0.046),52px)">المحامين يكتبون حججهم…</h2></div>
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
        const dvGo=()=>{const args=ins.map(i=>clip(i.value,70)).filter(Boolean);if(!args.length){ins[0].focus();return}
          K.sendAct({k:v.k,args});C.sent(document.getElementById("dvBox"),"📜","وصلت حججك!","خلك واثق 😎")};
        document.getElementById("dvSend").onclick=dvGo;K.autoSend(()=>{if(ins[0].isConnected&&ins.some(i=>i.value.trim()))dvGo()});return}
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
    timed:["write","pickv"],options:[K.roundsOpt([3,5,8],5,"عدد الأسطر")],
    start(){H.g={story:[{x:pick(OPENERS),by:null}],round:0,rounds:K.opt("r")};this.next()},
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
      if(H.ph==="story")return`<h2 style="font-size:clamp(30px,calc(var(--sw)*0.04),48px);text-align:center">📖 قصتنا الكاملة</h2>${this.storyHTML(true)}`;
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
    pill(){const g=H.g;return H.ph==="facts"?"":`<span class="pill">${(n=>n===0?"آخر لاعب":n===1?"باقي لاعب واحد":n===2?"باقي لاعبين":n<=10?`باقي ${fmt(n)} لاعبين`:`باقي ${fmt(n)} لاعب`)((g.queue||[]).length)}</span>`},
    render(){const g=H.g;
      if(H.ph==="facts")return C.head(H.quip)+`<div class="col center" style="gap:14px"><span style="font-size:100px;line-height:1">🎭</span><h2 style="font-size:clamp(32px,calc(var(--sw)*0.046),52px)">٢ صح… و١ كذب</h2><p class="note" style="font-size:19px">مثال: «عمري ما ركبت طيارة» · «أخاف من البط» · «أحب الباذنجان»</p></div><div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="spot"||H.ph==="unmask"){const u=H.ph==="unmask";
        const cnt=i=>Object.values(g.picks).filter(p=>p===i).length;
        return(u?"":C.head(H.quip))+`<div class="row" style="justify-content:center">${C.avatar(g.cur,"lg")}<h2 style="font-size:clamp(30px,calc(var(--sw)*0.04),46px)">${esc(nm(g.cur))} يقول:</h2></div>
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
        const tkGo=()=>{const st=ins.map(i=>clip(i.value,70));const e=document.getElementById("tkErr");
          if(st.some(x=>!x))return e.textContent="اكتب الثلاث معلومات كلها.";if(lie<0)return e.textContent="حدد أي وحدة هي الكذبة 🤥";
          K.sendAct({k:v.k,st,lie});C.sent(document.getElementById("tkBox"),"🤫","تم!","لا تفضح نفسك 😏")};
        document.getElementById("tkSend").onclick=tkGo;K.autoSend(()=>{if(ins[0].isConnected&&ins.every(i=>i.value.trim())&&lie>=0)tkGo()});return}
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
  const F="🎬 فيلم أو كرتون",M="📜 مثل شعبي",P="🌍 مكان",E="🍽️ أكل وشرب",J="👷 مهنة",S2="🏅 رياضة",O="🎉 مناسبة أو شي نعرفه";
  const PUZ=[
    {e:"🦁👑",c:F,lic:1,a:"الأسد الملك",alt:["الملك الأسد","lion king","ذا لايون كينج","ليون كينج"]},
    {e:"🧞‍♂️🪔🐒",c:F,lic:1,a:"علاء الدين",alt:["علاءالدين","علاء الدين والمصباح السحري","aladdin"]},
    {e:"🐠🔍",c:F,lic:1,a:"البحث عن نيمو",alt:["نيمو","nemo","finding nemo"]},
    {e:"❄️👸⛄",c:F,lic:1,a:"ملكة الثلج",alt:["فروزن","frozen","ملكة الثلوج","ملكه الثلج"]},
    {e:"🕷️🧑",c:F,lic:1,a:"سبايدرمان",alt:["الرجل العنكبوت","سبايدر مان","spiderman","spider man"]},
    {e:"🐀👨‍🍳🍲",c:F,lic:1,a:"راتاتوي",alt:["رتاتوي","ratatouille","الفار الطباخ"]},
    {e:"🧸🤠🚀",c:F,lic:1,a:"حكاية لعبة",alt:["توي ستوري","toy story","قصة لعبة"]},
    {e:"🐼🥋",c:F,lic:1,a:"كونغ فو باندا",alt:["كونغفو باندا","كونج فو باندا","كنغ فو باندا","kung fu panda"]},
    {e:"🧽🍍🌊",c:F,lic:1,a:"سبونج بوب",alt:["سبونجبوب","spongebob","سبونج بوب سكوير بانتس"]},
    {e:"🐱🐭💥",c:F,lic:1,a:"توم وجيري",alt:["توم و جيري","tom and jerry","توم اند جيري"]},
    {e:"🐢🥷🍕",c:F,lic:1,a:"سلاحف النينجا",alt:["سلاحف نينجا","النينجا","ninja turtles"]},
    {e:"⚽🧒⭐",c:F,lic:1,a:"كابتن ماجد",alt:["الكابتن ماجد","captain majed"]},
    {e:"🎈🏠👴",c:F,lic:1,a:"فوق",alt:["up","أب","البيت الطاير"]},
    {e:"👸🍎😴",c:F,lic:1,a:"سنو وايت",alt:["بياض الثلج","سنووايت","snow white","سنو وايت والاقزام السبعة"]},
    {e:"🦇🦸‍♂️🌃",c:F,lic:1,a:"باتمان",alt:["بات مان","batman","الرجل الوطواط"]},
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
    {e:"👨‍🚒🔥🚒",c:J,a:"رجل إطفاء",alt:["اطفائي","إطفائي","مطافئ","الاطفاء","رجل الاطفاء"]},
    {e:"🧑‍⚕️🩺💉",c:J,a:"طبيب",alt:["دكتور","الطبيب","الدكتور"]},
    {e:"🧑‍🍳🍳🔪",c:J,a:"طباخ",alt:["شيف","الطباخ","طاهي"]},
    {e:"🧑‍✈️✈️",c:J,a:"طيار",alt:["كابتن طيار","الطيار","pilot"]},
    {e:"🧑‍🏫📚✏️",c:J,a:"معلم",alt:["مدرس","أستاذ","استاذ","المعلم","معلمة","مدرسة"]},
    {e:"🧑‍🌾🌾🚜",c:J,a:"مزارع",alt:["فلاح","المزارع"]},
    {e:"🦷🪥😁",c:J,a:"طبيب أسنان",alt:["دكتور اسنان","طبيب اسنان","دكتور أسنان"]},
    {e:"🐪🏁💨",c:S2,a:"سباق الهجن",alt:["سباق الابل","سباق هجن","سباق جمال","الهجن"]},
    {e:"🏊‍♂️💦🏅",c:S2,a:"سباحة",alt:["السباحة"]},
    {e:"🏓🏓",c:S2,a:"تنس طاولة",alt:["تنس الطاولة","بينج بونج","بنج بونج","كرة الطاولة"]},
    {e:"🐎🏇🏆",c:S2,a:"فروسية",alt:["سباق خيل","سباق الخيل","الفروسية","ركوب الخيل"]},
    {e:"🌙🏮🍽️",c:O,a:"رمضان",alt:["شهر رمضان","فطور رمضان","افطار"]},
    {e:"🎁🎈🎂",c:O,a:"عيد ميلاد",alt:["عيد الميلاد","حفلة عيد ميلاد"]},
    {e:"🏖️☀️🩴",c:O,a:"إجازة الصيف",alt:["الصيف","اجازة الصيف","العطلة الصيفية","الاجازة"]},
    {e:"☕🫖🌴",c:O,a:"قهوة وتمر",alt:["القهوة والتمر","قهوة عربية","قهوة و تمر"]},
    {e:"🌧️🌈☀️",c:O,a:"قوس قزح",alt:["قوس المطر"]},
    {e:"🐪👀↩️",c:M,a:"الجمل ما يشوف عوجة رقبته",alt:["الجمل ما يشوف عوج رقبته","الجمل ما يرى عوجة رقبته","الجمل ما يشوف عوجته"]},
    {e:"🍲🥄",c:M,a:"اللي في القدر يطلعه الملاس",alt:["الي في القدر يطلعه الملاس","اللي في الجدر يطلعه الملاس","اللي في القدر يطلعه المغراف"]},
    {e:"✋❌👏",c:M,a:"يد وحدة ما تصفق",alt:["يد واحدة لا تصفق","اليد الوحدة ما تصفق","يد وحده ما تصفق","يد وحدة ماتصفق"]},
    {e:"🛏️📏🦵",c:M,a:"على قد لحافك مد رجولك",alt:["على قد لحافك مد رجليك","مد رجولك على قد لحافك","على قدر لحافك مد رجليك"]},
    {e:"🍇🙅‍♂️🍋",c:M,a:"اللي ما يطول العنب يقول عنه حامض",alt:["الي ما يطول العنب يقول حامض","اللي ما يطول العنب يقول حامض","العنب حامض"]},
    {e:"🚪💨😌",c:M,a:"الباب اللي يجيك منه الريح سده واستريح",alt:["الباب الي يجيك منه الريح سده واستريح","الباب اللي تجيك منه الريح سده واستريح","سده واستريح"]},
    {e:"⏰🐢👍",c:M,a:"كل تأخيرة فيها خيرة",alt:["كل تأخيره فيها خيره","كل تاخيرة فيها خيرة"]},
    {e:"🐦🐦🪶",c:M,a:"الطيور على أشكالها تقع",alt:["الطيور على اشكالها تقع"]},
    {e:"🕌🌴💚",c:P,a:"المدينة المنورة",alt:["المدينة","المدينه المنوره","طيبة"]},
    {e:"🏔️🧀⌚",c:P,a:"سويسرا",alt:["switzerland"]},
    {e:"🌷🚲🧇",c:P,a:"هولندا",alt:["امستردام","netherlands"]},
    {e:"🦘🐨🏄",c:P,a:"أستراليا",alt:["استراليا","australia"]},
    {e:"🍁🏒🫎",c:P,a:"كندا",alt:["canada"]},
    {e:"🐘🛕🍛",c:P,a:"الهند",alt:["india","هند"]},
    {e:"🌳🦜🐆🌧️",c:P,a:"غابات الأمازون",alt:["الامازون","غابة الامازون","امازون","amazon"]},
    {e:"🏜️🐫🌙",c:P,a:"الصحراء",alt:["صحراء","البر","الربع الخالي"]},
    {e:"🍚🍗🔥",c:E,a:"كبسة",alt:["مندي","مضغوط","رز ودجاج","برياني","مظبي"]},
    {e:"🧆🥙",c:E,a:"فلافل",alt:["طعمية","ساندويتش فلافل"]},
    {e:"🍕🍍",c:E,a:"بيتزا بالأناناس",alt:["بيتزا اناناس","بيتزا هاواي","هاواي","بيتزا بالاناناس"]},
    {e:"🥛🍌🧊",c:E,a:"ميلك شيك موز",alt:["ميلك شيك","عصير موز","موز بالحليب","سموذي موز"]},
    {e:"🍩☕",c:E,a:"دونات وقهوة",alt:["دونات","قهوة ودونات","دونت"]},
    {e:"🌽🧈🔥",c:E,a:"ذرة مشوية",alt:["ذرة","عرنوس","كوز ذرة","ذره مشويه"]},
    {e:"🍉🔪🥶",c:E,a:"بطيخ بارد",alt:["بطيخ","بطيخة","حبحب"]},
    {e:"🫓🧀🍯",c:E,a:"خبز بالجبن والعسل",alt:["فطيرة","جبن وعسل","مطبق","فطيرة جبن وعسل"]},
    {e:"🧑‍🔧🚗🔧",c:J,a:"ميكانيكي",alt:["ميكانيك","مصلح سيارات"]},
    {e:"🧑‍🚀🚀🌙",c:J,a:"رائد فضاء",alt:["رائد الفضاء","astronaut"]},
    {e:"💇‍♂️✂️💈",c:J,a:"حلاق",alt:["الحلاق","مزين"]},
    {e:"🕵️🔍🧩",c:J,a:"محقق",alt:["المحقق","مخبر","شرطي سري"]},
    {e:"👷🏗️🧱",c:J,a:"عامل بناء",alt:["بناء","مهندس","مقاول","بنّاء"]},
    {e:"🎨🖌️🖼️",c:J,a:"رسام",alt:["فنان","الرسام"]},
    {e:"🌙🍬👗",c:O,a:"العيد",alt:["عيد","عيد الفطر"]},
    {e:"🎓🎉",c:O,a:"التخرج",alt:["تخرج","حفلة تخرج"]},
    {e:"🏫🎒✏️",c:O,a:"المدرسة",alt:["مدرسة","أول يوم مدرسة","الدراسة","الدوام"]},
    {e:"⛺🔥🌌",c:O,a:"كشتة",alt:["الكشتة","رحلة بر","مخيم","تخييم","طلعة بر"]},
    {e:"📱🔋😱",c:O,a:"البطارية خلصت",alt:["بطارية","شحن","الجوال طفى","البطارية فاضية","خلص الشحن"]},
    {e:"🚗🚗🚗😤",c:O,a:"زحمة",alt:["الزحمة","زحمة سير","زحام"]},
    {e:"🥋🥇",c:S2,a:"كاراتيه",alt:["جودو","تايكوندو","فنون قتالية","كراتيه"]},
    {e:"🏹🎯",c:S2,a:"رماية",alt:["الرماية","سهام","رمي السهام"]},
    {e:"🏐🏖️",c:S2,a:"كرة طائرة شاطئية",alt:["كرة الطائرة","طائرة","فولي بول","كرة شاطئية","الطائرة الشاطئية"]},
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
    timed:["solve"],options:[K.roundsOpt([5,8,12],8,"عدد الألغاز")],
    start(){H.g={list:shuffle(K.own(PUZ)).slice(0,K.opt("r")),i:-1};this.next()},
    next(){const g=H.g;g.i++;if(g.i>=g.list.length)return K.finishGame();
      if(g.i===Math.floor(g.list.length/2)&&!g.mid){g.mid=1;g.i--;return C.scores(6)}
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
      if(H.ph==="answer")return`<div class="reveal" style="padding-top:20px"><div class="em-big" style="font-size:clamp(60px,calc(var(--sw)*0.09),110px)">${g.p.e}</div><div class="answer">${esc(g.p.a)}</div>
        <div class="who">${g.solved.length?g.solved.map((id,i)=>`${C.avatar(id)}<span>${esc(nm(id))}</span><span class="pts">+${fmt(Math.max(400,1000-200*i))}</span>`).join(""):"<span>ولا أحد عرفها! 😅</span>"}</div></div>`;
      if(H.ph==="scores")return C.scoresHTML();
      return""},
    dyn(){const g=H.g;if(H.ph!=="solve")return"";const h=this.hint();
      return`${h?`<p class="em-hint">${esc(h)}</p>`:""}${K.troupe(active(),new Set(g.solved))}`},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);
      if(v.ph==="solve"){root.insertAdjacentHTML("beforeend",`<div class="pq" style="text-align:center"><small>${esc(v.c)}</small><div style="font-size:64px;line-height:1.3">${esc(v.e)}</div></div>${tline}<div id="emBox"></div>`);
        this.form(v);this.phoneLive(v);return}
      C.watch(root,v);},
    form(v,msg){const box=document.getElementById("emBox");if(!box)return;C.L.n=C.L.n||0;
      C.textForm(box,{ph:"وش هو؟",max:50,btn:"جرّب 🎯",onSend:t=>{C.L.n=Date.now();C.L.wait=C.L.n;K.sendAct({k:v.k,ans:t,n:C.L.n});box.innerHTML=`<p class="big">🤔…</p>`}});
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
    timed:["joke"],options:[K.roundsOpt([2,3,5],3)],
    start(){H.g={round:0,rounds:K.opt("r"),used:[]};this.newRound()},
    newRound(){const g=H.g;g.round++;if(g.round>g.rounds)return K.finishGame();
      g.q=shuffle(PROMPTS).find(p=>!g.used.includes(p))||pick(PROMPTS);g.used.push(g.q);g.ans={};
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
/* =====================================================================
   8) إنسان حيوان: one letter, five categories, the group checks the answers
   ===================================================================== */
B.push(K=>{
  const {H,esc,clip,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,norm}=K;
  const C=common(K);
  const CATS=[{n:"إنسان",e:"🧑",h:"اسم شخص"},{n:"مشهور",e:"⭐",h:"صحابي، صحابية، شخصية تاريخية، أو مشهور اليوم",long:"شخص مشهور: صحابي أو صحابية، شخصية تاريخية، أو مشهور حالياً، من زمان أو من اليوم"},{n:"حيوان",e:"🐪",h:""},{n:"نبات",e:"🌴",h:"أو فاكهة وخضار"},{n:"جماد",e:"🪑",h:"أي شي ما يتحرك"},{n:"بلاد",e:"🌍",h:"دولة أو مدينة"}];
  const LETTERS=[..."ابتجحخدرزسشصطعفقكلمنهوي"];
  const ROUNDS=3,FILL=75,STOP_LEFT=10;
  // answers that are the same thing count as one: سمك = سمكة, السمك = سمك
  const same=t=>{let k=norm(t);if(k.length>4&&k.startsWith("ال"))k=k.slice(2);if(k.length>2)k=k.replace(/[هة]$/,"");return k};
  const FAST_PTS=10;
  const fold=w=>String(w||"").trim().replace(/[ًٌٍَُِّْـ]/g,"").replace(/^[إأآٱ]/,"ا");
  // does the word start with the letter? ("ال" is skipped for things, not for people's names)
  function okLetter(w,L,cat){w=fold(w);if(!w)return false;const bare=w.startsWith("ال")&&w.length>3?w.slice(2).replace(/^[إأآٱ]/,"ا"):w;
    if(cat===0)return w[0]===L;if(cat===1)return w[0]===L||bare[0]===L;return bare[0]===L}
  return{
    id:"insan",name:"إنسان حيوان",emoji:"🔤",color:"#2ee6a6",min:2,
    desc:"يطلع حرف، وكل واحد يكتب إنسان ومشهور وحيوان ونبات وجماد وبلاد تبدأ فيه… وأسرع واحد يقول «ستوب»!",
    tags:["٢-٨ لاعبين","كتابة","سرعة"],
    rules:["يطلع حرف عشوائي","اكتب إنسان، مشهور، حيوان، نبات، جماد، بلاد تبدأ بالحرف","«مشهور» = صحابي أو صحابية أو شخصية تاريخية أو مشهور حالياً","أول واحد يخلّص يضغط «ستوب» ويبقى للباقين ١٠ ثواني، وإذا كل أجوبته صح ياخذ ١٠ نقاط زيادة ⚡","تراجعون الأجوبة سوا: ١٠ نقاط للجواب الفريد، ٥ إذا تكرر، ١٥ إذا ما جاوب أحد غيرك"],
    winTitle:"أسرع عقل!",likeTitle:"",
    timed:["fill","check"],options:[K.roundsOpt([2,3,5],3)],
    start(){H.g={round:0,used:[]};this.next()},
    next(){const g=H.g;g.rounds=g.rounds||K.opt("r");g.round++;if(g.round>g.rounds)return K.finishGame();
      g.L=pick(LETTERS.filter(l=>!g.used.includes(l)));g.used.push(g.L);g.pl=active();g.ans={};g.done={};g.stopBy=null;
      H.ph="letter";H.k++;setTimer(4);H.quip="";sfx.go()},
    tick(now){const g=H.g;
      if(H.ph==="letter"){if(now>H.end){H.ph="fill";H.k++;setTimer(FILL);H.quip=pick(["يلا بسرعة! ✍️","أول واحد يخلّص يقول ستوب!","فكّروا… وش يبدأ بهالحرف؟"])}}
      else if(H.ph==="fill"){
        g.pl.forEach(id=>{const a=K.act(id);if(!a||!Array.isArray(a.a))return;const old=g.ans[id]||[];g.ans[id]=CATS.map((_,i)=>clip(a.a[i],30)||old[i]||"");
          if(a.done&&!g.done[id]){g.done[id]=1;sfx.submit();if(!g.stopBy){g.stopBy=id;sfx.tada();if(H.end-now>STOP_LEFT*1000){H.end=now+STOP_LEFT*1000}H.quip="ستوب! ✋ "+nm(id)+" خلّص… باقي لكم ثواني!"}}});
        const live=g.pl.filter(id=>active().includes(id));
        if(now>H.end||g.forceSkip||(live.length&&live.every(id=>g.done[id]))){g.forceSkip=false;g.ci=-1;g.pts={};this.nextCat()}}
      else if(H.ph==="check"){const c=this.cat();
        active().forEach(id=>{const a=K.act(id);if(!a)return;if(Array.isArray(a.rej))c.rej[id]=a.rej.filter(x=>x!==id&&c.list.some(e=>e.id===x));if(a.ok)c.ok[id]=1});
        const live=g.pl.filter(id=>active().includes(id));
        if(now>H.end||g.forceSkip||(live.length&&live.every(id=>c.ok[id]))){g.forceSkip=false;this.score()}}
      else if(H.ph==="catpts"){if(now>H.end)this.nextCat()}
      else if(H.ph==="fast"){if(now>H.end)C.scores(7)}
      else if(H.ph==="scores"){if(now>H.end)this.next()}},
    cat(){return H.g.cats[H.g.ci]},
    nextCat(){const g=H.g;g.ci++;
      if(g.ci===0)g.cats=CATS.map((_,ci)=>({rej:{},ok:{},list:g.pl.map(id=>{const t=((g.ans[id]||[])[ci]||"").trim();return{id,t,bad:t?!okLetter(t,g.L,ci):false}})}));
      if(g.ci>=CATS.length){const f=g.stopBy;
        if(!f)return C.scores(7);
        g.fastOk=g.cats.every(c=>{const e=c.list.find(x=>x.id===f);return e&&e.t&&!e.bad&&!e.out});
        if(g.fastOk){C.add(f,FAST_PTS);sfx.coin();confetti()}else sfx.lie();
        H.ph="fast";H.k++;setTimer(5);return}
      H.ph="check";H.k++;setTimer(25);sfx.swoosh();H.quip="فيه جواب غلط؟ اضغطوا ❌ عليه من جوالاتكم"},
    score(){const g=H.g,c=this.cat(),voters=id=>g.pl.filter(x=>x!==id&&active().includes(x)).length;
      c.list.forEach(e=>{const r=Object.values(c.rej).filter(arr=>arr.includes(e.id)).length;e.r=r;e.out=e.t&&!e.bad&&r>=Math.floor(voters(e.id)/2)+1});
      const valid=c.list.filter(e=>e.t&&!e.bad&&!e.out),groups={};valid.forEach(e=>{const k=same(e.t);(groups[k]=groups[k]||[]).push(e)});
      c.list.forEach(e=>e.p=0);valid.forEach(e=>{e.p=valid.length===1?15:groups[same(e.t)].length>1?5:10;C.add(e.id,e.p)});
      if(valid.some(e=>e.p>0))sfx.coin();H.ph="catpts";H.k++;setTimer(5)},
    doneMap(){const g=H.g;return H.ph==="fill"?g.done:H.ph==="check"?this.cat().ok:null},
    view(v){const g=H.g;if(!g.L)return;v.L=g.L;v.r=g.round;
      if(H.ph==="fill"){v.stop=g.stopBy;v.done=Object.keys(g.done);v.pl=g.pl}
      if(H.ph==="check"){const c=this.cat();v.ci=g.ci;v.list=c.list.map(e=>({id:e.id,t:e.t,bad:e.bad}));v.done=Object.keys(c.ok)}
      if(H.ph==="fast"){v.fast=g.stopBy;v.fastOk=g.fastOk}
      if(["catpts","scores"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">الجولة ${fmt(g.round)} من ${fmt(g.rounds)} · حرف «${esc(g.L||"")}»</span>`},
    // identical answers (after normalizing spelling: hamza, ة/ه, ى/ي, spaces, Persian letters) are grouped
    groups(c){const grp={};c.list.forEach(e=>{if(e.t&&!e.bad){const k=same(e.t);(grp[k]=grp[k]||[]).push(e.id)}});return grp},
    cards(c,pts){const g=H.g,grp=this.groups(c);return`<div class="ih-cards">${c.list.map((e,i)=>{
        const twins=e.t&&!e.bad?grp[same(e.t)].filter(x=>x!==e.id):[];
        const cls=!e.t?"empty":e.bad?"bad":pts&&e.out?"out":pts?(e.p===15?"solo":e.p===5?"dup":"ok"):"";
        const tag=!e.t?"ما كتب شي":e.bad?`ما يبدأ بـ «${esc(g.L)}»`:pts&&e.out?`رفضوه ❌ ${fmt(e.r)}`:"";
        return`<div class="ih-card ${cls}" style="animation-delay:${i*.08}s">${C.avatar(e.id)}<div class="ih-t"><small>${esc(nm(e.id))}</small><b>${esc(e.t||"—")}</b>${tag?`<em>${tag}</em>`:""}${!tag&&twins.length?`<em class="same">🔁 نفس جواب ${twins.map(x=>esc(nm(x))).join("، ")}</em>`:""}</div>${pts?`<span class="ih-p">+${fmt(e.p)}</span>`:(c.rej&&!e.bad&&e.t?`<span class="ih-r" data-x="${esc(e.id)}"></span>`:"")}</div>`}).join("")}</div>`},
    render(){const g=H.g;
      if(H.ph==="letter")return`<div class="col center" style="gap:10px;margin-top:calc(var(--sh)*0.06)"><p class="note" style="font-size:24px">الحرف هو…</p><div class="ih-big" id="ihL">${esc(g.L)}</div></div>`;
      if(H.ph==="fill")return C.head(H.quip)+`<div class="ih-top"><div class="ih-big sm">${esc(g.L)}</div><div class="ih-chips">${CATS.map(c=>`<span>${c.e} ${c.n}</span>`).join("")}</div></div>
        ${g.stopBy?`<div class="ih-stop">✋ ستوب! ${esc(nm(g.stopBy))} خلّص</div>`:""}<div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="check"||H.ph==="catpts"){const c=this.cat(),ct=CATS[g.ci];
        return(H.ph==="check"?C.head(H.quip):"")+`<h2 class="ih-h">${ct.e} ${ct.n} بحرف «${esc(g.L)}»</h2>${ct.long?`<p class="note center" style="font-size:19px">${esc(ct.long)}</p>`:""}${this.cards(c,H.ph==="catpts")}${H.ph==="check"?`<div id="dyn" class="still">${this.dyn()}</div>`:""}`}
      if(H.ph==="fast"){const f=g.stopBy;return`<div class="reveal" style="padding-top:calc(var(--sh)*.05)"><p class="note" style="font-size:24px">⚡ أسرع واحد خلّص:</p>
        <div class="who" style="animation-delay:.2s">${C.avatar(f)}<span>${esc(nm(f))}</span>${g.fastOk?`<span class="pts">+${fmt(FAST_PTS)}</span>`:""}</div>
        <div class="answer" style="font-size:clamp(30px,calc(var(--sw)*.04),48px)">${g.fastOk?"وكل أجوبته صح! 🎉":"بس عنده جواب غلط… ما ياخذ البونص 😅"}</div></div>`}
      if(H.ph==="scores")return C.scoresHTML();
      return""},
    after(){if(H.ph!=="letter")return;const el=document.getElementById("ihL");if(!el)return;const L=H.g.L;let n=0;
      const t=setInterval(()=>{if(!el.isConnected||++n>14){clearInterval(t);el.textContent=L;el.classList.add("land");sfx.tada();return}el.textContent=pick(LETTERS);sfx.tick()},110)},
    dyn(){const g=H.g;
      if(H.ph==="fill")return K.troupe(g.pl,new Set(Object.keys(g.done)));
      if(H.ph==="check"){const c=this.cat();setTimeout(()=>document.querySelectorAll(".ih-r").forEach(el=>{const r=Object.values(c.rej).filter(a=>a.includes(el.dataset.x)).length;el.textContent=r?"❌".repeat(Math.min(r,5)):""}),0);
        return K.troupe(g.pl,new Set(Object.keys(c.ok)))+`<p class="note center">${fmt(Object.keys(c.ok).length)} من ${fmt(g.pl.length)} قالوا تمام · رفض: ${fmt(Object.values(c.rej).reduce((n,a)=>n+a.length,0))}</p>`}
      return""},
    phone(v,{root,tline}){const me=K.me(),L=C.L;C.fresh(v);
      if(v.ph==="letter"){C.watch(root,v,"🎰","الحرف يطلع على الشاشة…","");return}
      if(v.ph==="fast"){C.watch(root,v,v.fast===me?(v.fastOk?"⚡":"😅"):"👀",v.fast===me?(v.fastOk?"أسرع واحد وكل أجوبتك صح! +١٠":"كنت الأسرع بس فيه جواب غلط"):`${C.pnm(v,v.fast)} كان الأسرع`,"");return}
      if(v.ph==="fill"){
        if(v.pl&&!v.pl.includes(me)){C.watch(root,v,"🍿","تدخل في الجولة الجاية","هالجولة بدأت قبل ما توصل");return}
        root.insertAdjacentHTML("beforeend",`<div class="ih-phead"><div class="ih-big xs">${esc(v.L)}</div><div>${tline}<p class="note" id="ihStop"></p></div></div>
          <div class="col" id="ihBox">${CATS.map((c,i)=>`<label class="ih-f"><span>${c.e} ${c.n}${c.h?` <small>(${c.h})</small>`:""}</span><input type="text" class="ih-in" data-i="${i}" maxlength="30" autocomplete="off" placeholder="${esc(v.L)}…"></label>`).join("")}
          <button class="btn coral wide" id="ihDone">خلصت! ستوب ✋</button></div>`);
        const ins=[...root.querySelectorAll(".ih-in")];L.vals=CATS.map(()=>"");
        const push=done=>{K.sendAct({k:v.k,a:L.vals,done:!!done})};
        ins.forEach(inp=>inp.oninput=()=>{L.vals[+inp.dataset.i]=inp.value;clearTimeout(L.t);L.t=setTimeout(()=>push(L.sent),350)});
        ins.forEach((inp,i)=>inp.onkeydown=e=>{if(e.key==="Enter"&&ins[i+1])ins[i+1].focus()});
        document.getElementById("ihDone").onclick=()=>{L.vals=ins.map(x=>x.value);if(L.vals.some(x=>!x.trim())){document.getElementById("ihStop").textContent="عبّ الخانات كلها أول 😅";return}
          L.sent=1;push(true);ins.forEach(x=>x.disabled=true);const b=document.getElementById("ihDone");b.disabled=true;b.textContent="✋ قلت ستوب!"};
        setTimeout(()=>ins[0].focus(),60);this.phoneLive(v);return}
      if(v.ph==="check"){const ct=CATS[v.ci];L.rej=new Set();
        root.insertAdjacentHTML("beforeend",`<h2 style="font-size:26px">${ct.e} ${ct.n} بحرف «${esc(v.L)}»</h2><p class="note">اضغط ❌ على أي جواب غلط</p>${tline}<div class="col" id="ihBox">
          ${(v.list||[]).map(e=>{const same=e.t&&!e.bad?(v.list||[]).filter(x=>x.id!==e.id&&x.t&&!x.bad&&same(x.t)===same(e.t)).length:0;return`<div class="likerow ${e.bad||!e.t?"dim":""}"><span class="txt"><small>${C.pnm(v,e.id)}${e.id===me?" (أنت)":""}</small><br>${esc(e.t||"—")}${e.bad?` <small>· ما يبدأ بالحرف</small>`:""}${same?` <small>· 🔁 مكرر</small>`:""}</span>${e.id!==me&&e.t&&!e.bad?`<button class="like" data-x="${esc(e.id)}" aria-pressed="false" aria-label="رفض">❌</button>`:""}</div>`}).join("")}
          <button class="btn mint wide" id="ihOk">تمام ✅</button></div>`);
        const send=ok=>K.sendAct({k:v.k,rej:[...L.rej],ok:!!ok});
        root.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>{const x=b.dataset.x;L.rej.has(x)?L.rej.delete(x):L.rej.add(x);b.setAttribute("aria-pressed",L.rej.has(x));send(L.ok)});
        document.getElementById("ihOk").onclick=()=>{L.ok=1;send(true);const b=document.getElementById("ihOk");b.disabled=true;b.textContent="تمام، ننتظر الباقين…"};return}
      C.watch(root,v);},
    phoneLive(v){if(v.ph!=="fill")return;const el=document.getElementById("ihStop");if(!el)return;
      if(v.stop&&v.stop!==K.me()&&!C.L.stopShown){C.L.stopShown=1;sfx.tada();el.innerHTML=`<b style="color:var(--coral);font-size:20px">✋ ${C.pnm(v,v.stop)} قال ستوب! بسرعة!</b>`}},
  };
});
/* =====================================================================
   9) لسانك معقود: a sound-alike spelling, everyone races to type the real thing
   ===================================================================== */
B.push(K=>{
  const {H,esc,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,norm,nearTruth}=K;
  const C=common(K);
  const T="🎬 كرتون أو فيلم أو مسلسل أو حكاية",P="📜 مثل",W="💬 عبارة نقولها",X="🏠 أشياء نعرفها";
  const ITEMS=[
    {pic:"👸🏼👠🕛🎃",g:"سِن دِري لا",c:T,a:"سندريلا",alt:["سندرلا"]},
    {pic:"🧞‍♂️🪔🧶🐒",g:"عَ لا ئِد دين",c:T,a:"علاء الدين",alt:["علاءالدين","علا الدين"]},
    {pic:"🦁👑🌅",g:"ألْ أ سَدِلْ مَ لِك",c:T,lic:1,a:"الأسد الملك",alt:["الملك الأسد","الاسد الملك"]},
    {pic:"🐱🏃‍♂️🐭🧀",g:"تو موجي ري",c:T,lic:1,a:"توم وجيري",alt:["توم و جيري"]},
    {pic:"⚽🧒🏻🥅⭐",g:"كاب تِنما جِد",c:T,lic:1,a:"كابتن ماجد",alt:["الكابتن ماجد"]},
    {pic:"🔍🐠🌊",g:"البح ثعَنْ ني مو",c:T,lic:1,a:"البحث عن نيمو",alt:["نيمو"]},
    {pic:"👸🌹🐻‍❄️",g:"الْ جَ مي لَ تُلْ وَحْش",c:T,a:"الجميلة والوحش",alt:["الجميله والوحش"]},
    {pic:"📖🧸🤠",g:"حِكا يَ تِلْ عُبَه",c:T,lic:1,a:"حكاية لعبة",alt:["حكايه لعبه","توي ستوري"]},
    {pic:"🐢🐢🥷🍕",g:"سَ لا حِفُنْ نِنْ جا",c:T,lic:1,a:"سلاحف النينجا",alt:["سلاحف نينجا"]},
    {pic:"🕵️‍♂️🔍👦🏻",g:"الْ مُ حَقْ قِ قُ كو نان",c:T,lic:1,a:"المحقق كونان",alt:["كونان","المحقق كونن"]},
    {pic:"👦🏻👧🏻🏝️",g:"عَدْ نا نُو لي نا",c:T,lic:1,a:"عدنان ولينا",alt:["عدنان و لينا"]},
    {pic:"🚪🏘️👳‍♂️",g:"با بِلْ حا رَه",c:T,lic:1,a:"باب الحارة",alt:["باب الحاره"]},
    {pic:"📺😂🇸🇦",g:"طا شما طاش",c:T,lic:1,a:"طاش ما طاش",alt:["طاش ماطاش"]},
    {pic:"🏝️💰🏴‍☠️🗺️",g:"جَ زي رَ تُلْ كَنْز",c:T,a:"جزيرة الكنز",alt:["جزيره الكنز"]},
    {pic:"👸🏻🍎❄️🪞",g:"سْنُو وا يِت",c:T,a:"سنو وايت",alt:["سنووايت","بياض الثلج"]},
    {pic:"🐯🎭🤼",g:"أنْ نِ مِ رُلْ مُ قَنْ نَع",c:T,lic:1,a:"النمر المقنع",alt:["النمر المقنّع"]},
    {pic:"⏳🔑🚪😊",g:"اصْ صَبْ رُمِفْ تا حُلْ فَرَج",c:P,a:"الصبر مفتاح الفرج",alt:["الصبر مفتاح"]},
    {pic:"🏃‍♂️💨😈",g:"الْ عَجَ لَ تُمِ نَشْ شَيْ طان",c:P,a:"العجلة من الشيطان",alt:["العجله من الشيطان"]},
    {pic:"🦅🔥🍗🤷‍♂️",g:"اللي ما يِعْ رِفِصْ صَقِرْ يِشْ ويه",c:P,a:"اللي ما يعرف الصقر يشويه",alt:["الي ما يعرف الصقر يشويه","اللي ما يعرف الصقر يشويه"]},
    {pic:"🐦✋🌳",g:"عُصْ فو رِنْ فِلْ يَد",c:P,a:"عصفور في اليد",alt:["عصفور باليد","عصفور في اليد خير من عشرة على الشجرة"]},
    {pic:"⏪⌛⚰️",g:"اللي فا تِما ت",c:P,a:"اللي فات مات",alt:["الي فات مات"]},
    {pic:"🐒👁️👩🦌",g:"ألْ قِرْ دِفي عَيْ نِ أمْ مِه غَ زال",c:P,a:"القرد في عين أمه غزال",alt:["القرد بعين امه غزال"]},
    {pic:"🌅☀️☕😊",g:"صَ با حَلْ خِير",c:W,a:"صباح الخير",alt:["صباح الخيرر"]},
    {pic:"📅🎉👨‍👩‍👧‍👦💚",g:"كُلْ لَ عا مِوَنْ تُمْ بِ خير",c:W,a:"كل عام وأنتم بخير",alt:["كل عام وانتم بخير","كل عام وانت بخير"]},
    {pic:"👋🚶‍♂️🛣️",g:"مَ عَسْ سَ لا مَه",c:W,a:"مع السلامة",alt:["مع السلامه"]},
    {pic:"🍽️😋💪",g:"بِلْ هَ نا ئِوَشْ شِ فا",c:W,a:"بالهناء والشفاء",alt:["بالهنا والشفا","بالعافية"]},
    {pic:"🌙🛏️😴",g:"تِصْ بَ حُعْ لا خِير",c:W,a:"تصبح على خير",alt:["تصبحون على خير"]},
    {pic:"🌙🎁🍬👗",g:"عِي دُكْ مُبا رَك",c:W,a:"عيدك مبارك",alt:["عيد مبارك"]},
    {pic:"✈️🏠🤲😊",g:"ألْ حَمْ دُ لِلْ لا عَسْ سَ لا مَه",c:W,a:"الحمد لله على السلامة",alt:["الحمدلله على السلامة","الحمد لله عالسلامة","الحمد لله على السلامه"]},
    {pic:"💪😅👍",g:"يِعْ طي كَلْ عا فْ يَه",c:W,a:"يعطيك العافية",alt:["يعطيك العافيه","الله يعطيك العافية"]},
    {pic:"🚪🤗☕",g:"حَيْ يا كَلْ لا",c:W,a:"حياك الله",alt:["حياك","الله يحييك"]},
    {pic:"🌙🏮🍲",g:"رَ مَ ضا نُكْ رِ يم",c:W,a:"رمضان كريم",alt:["رمضان مبارك"]},
    {pic:"1️⃣0️⃣0️⃣0️⃣🎉🎊",g:"ألْ فَلْ فِ مَبْ روك",c:W,a:"ألف ألف مبروك",alt:["الف الف مبروك","الف مبروك","ألف مبروك"]},
    {pic:"☕🫖🌴",g:"قَهْ وَ تُعَ رَ بي يَه",c:X,a:"قهوة عربية",alt:["قهوه عربيه","القهوة العربية"]},
    {pic:"🍵🌿",g:"شا يِبْ نِ نَعْ ناع",c:X,a:"شاي بالنعناع",alt:["شاي بنعناع","شاي نعناع"]},
    {pic:"⚽👟🥅",g:"كُ رَ تُلْ قَ دَم",c:X,a:"كرة القدم",alt:["كره القدم","كورة القدم","كورة"]},
    {pic:"🧊🚪🍳",g:"ثَلْ لا جَ تُلْ مَطْ بَخ",c:X,a:"ثلاجة المطبخ",alt:["ثلاجه المطبخ","ثلاجة"]},
    {pic:"🍉🔴",g:"بَطْ طي خَ هْ حَمْ را",c:X,a:"بطيخة حمرا",alt:["بطيخه حمرا","بطيخة حمراء"]},
    {pic:"📦🤧🧻",g:"عِلْ بَ تِمْ نا دِيل",c:X,a:"علبة مناديل",alt:["علبه مناديل","مناديل"]},
    {pic:"1️⃣0️⃣0️⃣0️⃣🌙➕🌙📖",g:"ألْ فَ لَيْ لَ تِنْ وَ لَيْ لَه",c:T,a:"ألف ليلة وليلة",alt:["الف ليلة وليلة","ألف ليله وليله"]},
  ];
  const ROUNDS=8,PTS=[10,5,3];
  const ptsFor=i=>i<PTS.length?PTS[i]:1;
  return{
    id:"lisan",name:"لسانك معقود",emoji:"👅",color:"#ff9a3c",min:2,
    desc:"صور توصف جملة أو اسم مشهور… خمّن وش هي واكتبها قبل الكل!",
    tags:["٢-٨ لاعبين","سرعة","ضحك"],
    rules:["تطلع صور على الشاشة توصف جملة أو اسم مشهور","ركّبوا الصور مع بعض… وبعد شوي يطلع تلميح مكتوب","اكتب الكلمة الحقيقية في جوالك بأسرع وقت","الأول ١٠، الثاني ٥، الثالث ٣، وأي أحد يعرفها بعدهم ١"],
    winTitle:"صاحب أسرع لسان!",likeTitle:"",
    timed:["decode"],options:[K.roundsOpt([5,8,12],8,"عدد الكلمات")],
    start(){H.g={list:shuffle(K.own(ITEMS)).slice(0,K.opt("r")),i:-1};this.next()},
    next(){const g=H.g;g.i++;if(g.i>=g.list.length)return K.finishGame();
      if(g.i===Math.floor(g.list.length/2)&&!g.mid){g.mid=1;g.i--;return C.scores(6)}
      g.p=g.list[g.i];g.truths=[g.p.a,...g.p.alt].map(norm);g.solved=[];g.wrong={};g.seen={};g.t0=Date.now();
      H.ph="decode";H.k++;setTimer(35);sfx.tada();H.quip=pick(["وش تقول الصور؟ 🤔","ركّبوا الصور مع بعض… 🧩","مين يعرفها أول؟"])},
    tick(now){const g=H.g;
      if(H.ph==="decode"){active().forEach(id=>{if(g.solved.includes(id))return;const a=K.act(id);if(!a||typeof a.ans!=="string"||g.seen[id]===a.n)return;g.seen[id]=a.n;
          if(nearTruth(a.ans,g.truths)){g.solved.push(id);C.add(id,ptsFor(g.solved.length-1));sfx.coin()}else g.wrong[id]=a.n});
        if(now>H.end||g.forceSkip||(active().length&&active().every(id=>g.solved.includes(id)))){g.forceSkip=false;H.ph="answer";H.k++;setTimer(6);if(g.solved.length){sfx.truth();confetti(60)}else sfx.lie()}}
      else if(H.ph==="answer"){if(now>H.end)this.next()}
      else if(H.ph==="scores"){if(now>H.end)this.next()}},
    doneMap(){const g=H.g;if(H.ph!=="decode")return null;const m={};g.solved.forEach(id=>m[id]=1);return m},
    view(v){const g=H.g;if(H.ph==="decode"){v.gt=g.p.pic||g.p.g;v.c=g.p.c;v.solved=g.solved;v.wrong=g.wrong}if(["answer","scores"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">${fmt(Math.min(g.i+1,g.list.length))} من ${fmt(g.list.length)}</span>`},
    render(){const g=H.g;
      if(H.ph==="decode")return C.head(H.quip)+`<div class="ticket" style="text-align:center"><span class="cat">${esc(g.p.c)}</span><div class="ls-pics">${[...new Intl.Segmenter().segment(g.p.pic||"")].map((x,i)=>`<span style="--i:${i}">${x.segment}</span>`).join("")}</div><div id="lsHint"></div></div><div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="answer")return`<div class="reveal" style="padding-top:20px"><div class="ls-pics sm">${esc(g.p.pic||"")}</div><div class="answer">${esc(g.p.a)}</div>
        <div class="who">${g.solved.length?g.solved.map((id,i)=>`${C.avatar(id)}<span>${esc(nm(id))}</span><span class="pts">+${fmt(ptsFor(i))}</span>`).join(""):"<span>ولا أحد عرفها! 😅</span>"}</div></div>`;
      if(H.ph==="scores")return C.scoresHTML();
      return""},
    dyn(){const g=H.g;if(H.ph!=="decode")return"";
      // after 12 seconds the old odd spelling shows as a hint
      const h=document.getElementById("lsHint");if(h&&!h.dataset.on&&Date.now()-g.t0>12000){h.dataset.on=1;h.innerHTML=`<p class="note">💡 تلميح:</p><div class="ls-big sm">${esc(g.p.g)}</div>`}
      return`<div class="ls-order">${g.solved.map((id,i)=>`<span class="ls-rank">${["🥇","🥈","🥉"][i]||"✅"} ${esc(nm(id))} <b>+${fmt(ptsFor(i))}</b></span>`).join("")}</div>${K.troupe(active(),new Set(g.solved))}`},
    phone(v,{root,tline}){C.fresh(v);
      if(v.ph==="decode"){root.insertAdjacentHTML("beforeend",`<div class="pq" style="text-align:center"><small>${esc(v.c)}</small><div class="ls-big sm">${esc(v.gt)}</div></div><p class="note center">ناظر الصور 🧩 واكتب وش هي</p>${tline}<div id="lsBox"></div>`);
        this.form(v);this.phoneLive(v);return}
      C.watch(root,v);},
    form(v,msg){const box=document.getElementById("lsBox");if(!box)return;C.L.n=C.L.n||0;
      C.textForm(box,{ph:"وش الكلمة الحقيقية؟",max:50,btn:"جرّب 🎯",onSend:t=>{C.L.n=Date.now();C.L.wait=C.L.n;K.sendAct({k:v.k,ans:t,n:C.L.n});box.innerHTML=`<p class="big">🤔…</p>`}});
      if(msg)box.insertAdjacentHTML("afterbegin",`<p class="err">${msg}</p>`)},
    phoneLive(v){if(v.ph!=="decode")return;const me=K.me(),L=C.L,box=document.getElementById("lsBox");if(!box)return;
      if((v.solved||[]).includes(me)){if(!L.ok){L.ok=1;sfx.truth();const r=v.solved.indexOf(me);C.sent(box,["🥇","🥈","🥉"][r]||"✅","صح عليك!","المركز "+fmt(r+1)+" · +"+fmt(ptsFor(r)))}return}
      if(L.wait&&v.wrong&&v.wrong[me]===L.wait){L.wait=0;sfx.lie();this.form(v,"❌ مو هي… قولها مرة ثانية بصوت عالي")}},
  };
});

/* =====================================================================
   10) إكس أو: two teams, everyone votes a square at once every few seconds
   ===================================================================== */
B.push(K=>{
  const {H,esc,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti}=K;
  const C=common(K);
  const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const SYM=["❌","⭕"],TNAME=["فريق إكس","فريق أو"],BOARDS=3,TURN=8;
  const winLine=(b,t)=>LINES.find(l=>l.every(i=>b[i]===t));
  return{
    id:"xo",name:"إكس أو",emoji:"⭕",color:"#4cc2ff",min:2,
    desc:"فريقين، والكل يلعب في نفس الوقت! كل فريق يصوّت على مربعه بسرعة… وإذا اخترتوا نفس المربع: تصادم!",
    tags:["٢-٨ لاعبين","فرق","سرعة"],
    rules:["تنقسمون فريقين: ❌ و ⭕","كل جولة قصيرة، كل واحد يصوّت من جواله على مربع","المربع اللي ياخذ أكثر أصوات في فريقك ينحط… للفريقين في نفس الوقت!","إذا الفريقين اختاروا نفس المربع: تصادم 💥 ويبقى فاضي","٣ لوحات، والفريق اللي يفوز باللوحة كل لاعب فيه ياخذ ٥٠٠"],
    winTitle:"بطل إكس أو!",likeTitle:"",
    timed:["xo"],options:[K.roundsOpt([1,3,5],3,"عدد اللوحات")],
    start(){const pl=shuffle([...H.order]);H.g={team:{},pl,board:-1,wins:[0,0]};pl.forEach((id,i)=>H.g.team[id]=i%2);this.newBoard()},
    newBoard(){const g=H.g;g.boards=g.boards||K.opt("r");g.board++;if(g.board>=g.boards)return K.finishGame();
      g.b=Array(9).fill(null);g.turn=0;g.last=null;g.line=null;g.result=null;this.turn()},
    turn(){const g=H.g;g.turn++;g.votes={};H.ph="xo";H.k++;setTimer(TURN);sfx.pop();
      H.quip=g.turn===1?"يلا! كل فريق يختار مربعه… بسرعة 🏃":pick(["الوقت يطير! ⏱️","تكلموا مع فريقكم… بس بسرعة!","انتبهوا للتصادم 💥"])},
    tick(now){const g=H.g;
      if(H.ph==="xo"){g.pl.forEach(id=>{const a=K.act(id);if(a&&Number.isInteger(a.sq)&&a.sq>=0&&a.sq<9&&g.b[a.sq]===null)g.votes[id]=a.sq});
        const live=g.pl.filter(id=>active().includes(id));
        if(now>H.end||g.forceSkip||(live.length&&live.every(id=>g.votes[id]!==undefined))){g.forceSkip=false;this.place()}}
      else if(H.ph==="xomove"){if(now>H.end){if(g.result)this.endBoard();else this.turn()}}
      else if(H.ph==="xoend"){if(now>H.end)this.newBoard()}},
    pickFor(t){const g=H.g,cnt={};Object.entries(g.votes).forEach(([id,sq])=>{if(g.team[id]===t)cnt[sq]=(cnt[sq]||0)+1});
      const max=Math.max(0,...Object.values(cnt));if(!max)return null;return+pick(Object.keys(cnt).filter(k=>cnt[k]===max))},
    place(){const g=H.g,a=this.pickFor(0),b=this.pickFor(1);g.last={a,b,clash:a!==null&&a===b};
      if(g.last.clash)sfx.lie();else{if(a!==null)g.b[a]=0;if(b!==null)g.b[b]=1;if(a!==null||b!==null)sfx.coin()}
      const w0=winLine(g.b,0),w1=winLine(g.b,1);
      if(w0&&w1){g.result="draw";g.line=w0}else if(w0){g.result=0;g.line=w0}else if(w1){g.result=1;g.line=w1}
      else if(g.b.every(x=>x!==null)||g.turn>=14)g.result="draw";
      H.ph="xomove";H.k++;setTimer(g.result!==null?2.5:2)},
    endBoard(){const g=H.g;if(g.result===0||g.result===1){g.wins[g.result]++;g.pl.forEach(id=>{if(g.team[id]===g.result)C.add(id,500)});sfx.truth();confetti()}else sfx.lie();
      H.ph="xoend";H.k++;setTimer(6)},
    doneMap(){return H.ph==="xo"?H.g.votes:null},
    view(v){const g=H.g;if(!g.b)return;v.b=g.b;v.team=g.team;v.last=g.last;v.result=g.result;v.wins=g.wins;
      if(H.ph==="xo")v.done=Object.keys(g.votes);if(H.ph==="xoend")v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">اللوحة ${fmt(g.board+1)} من ${fmt(g.boards)} · ${fmt(g.wins[0])} - ${fmt(g.wins[1])}</span>`},
    boardHTML(){const g=H.g,L=g.last||{},show=H.ph!=="xo";
      return`<div class="xo-board">${g.b.map((x,i)=>{const isNew=show&&!L.clash&&(i===L.a||i===L.b),clash=show&&L.clash&&i===L.a,inLine=g.line&&g.line.includes(i)&&H.ph!=="xo";
        return`<div class="xo-cell ${x===0?"x":x===1?"o":""} ${isNew?"new":""} ${clash?"clash":""} ${inLine?"line":""}">${x!==null?SYM[x]:clash?"💥":""}</div>`}).join("")}</div>`},
    teamsHTML(){const g=H.g;return`<div class="xo-teams">${[0,1].map(t=>`<div class="xo-team t${t}"><b>${SYM[t]} ${TNAME[t]} <span>${fmt(g.wins[t])}</span></b><div>${g.pl.filter(id=>g.team[id]===t).map(id=>`<span class="xo-m ${H.ph==="xo"&&g.votes[id]!==undefined?"ok":""}">${C.avatar(id)}${esc(nm(id))}</span>`).join("")}</div></div>`).join("")}</div>`},
    render(){const g=H.g;
      if(H.ph==="xo"||H.ph==="xomove"){const L=g.last||{};
        const msg=H.ph==="xomove"?(L.clash?"💥 تصادم! الفريقين اختاروا نفس المربع":g.result===0||g.result===1?`${SYM[g.result]} ${TNAME[g.result]} كمّل خط! 🎉`:g.result==="draw"?"تعادل! 🤝":L.a===null&&L.b===null?"ولا فريق صوّت! 😴":""):"";
        return(H.ph==="xo"?C.head(H.quip):"")+`<div class="xo-wrap">${this.teamsHTML()}${this.boardHTML()}</div>${msg?`<p class="xo-msg">${msg}</p>`:""}<div id="dyn" class="still"></div>`}
      if(H.ph==="xoend"){const r=g.result;return`<div class="reveal" style="padding-top:10px"><div class="xo-wrap small">${this.boardHTML()}</div>
        <div class="stamp ${r==="draw"?"lie":"truth"}" style="position:static">${r==="draw"?"تعادل! 🤝":`فاز ${TNAME[r]} ${SYM[r]}`}</div>
        ${r!=="draw"?`<div class="who">${g.pl.filter(id=>g.team[id]===r).map(id=>`${C.avatar(id)}<span>${esc(nm(id))}</span>`).join("")}<span class="pts">+٥٠٠</span></div>`:""}
        <p class="note" style="font-size:22px">النتيجة: ${SYM[0]} ${fmt(g.wins[0])} - ${fmt(g.wins[1])} ${SYM[1]}</p></div>`}
      return""},
    dyn(){const g=H.g;if(H.ph!=="xo")return"";const t=[0,1].map(x=>g.pl.filter(id=>g.team[id]===x&&g.votes[id]!==undefined).length);
      return`<p class="note center" style="font-size:19px">صوّتوا: ${SYM[0]} ${fmt(t[0])} · ${SYM[1]} ${fmt(t[1])}</p>`},
    phone(v,{root,tline}){const me=K.me(),L=C.L;C.fresh(v);const t=v.team?v.team[me]:undefined;
      if(t===undefined){C.watch(root,v,"🍿","تفرّج هالمرة","");return}
      const head=`<div class="xo-me t${t}">أنت في ${SYM[t]} ${TNAME[t]}</div>`;
      if(v.ph==="xo"){root.insertAdjacentHTML("beforeend",head+`${tline}<p class="note center">اختار مربع لفريقك 👇</p><div class="xo-board phone" id="xoB">${v.b.map((x,i)=>`<button class="xo-cell ${x===0?"x":x===1?"o":""}" data-i="${i}" ${x!==null?"disabled":""}>${x!==null?SYM[x]:""}</button>`).join("")}</div>`);
        root.querySelectorAll("#xoB [data-i]").forEach(b=>b.onclick=()=>{K.sendAct({k:v.k,sq:+b.dataset.i});root.querySelectorAll("#xoB [data-i]").forEach(x=>x.classList.toggle("pick",x===b));sfx.pop()});return}
      if(v.ph==="xomove"){root.insertAdjacentHTML("beforeend",head+`<div class="xo-board phone">${v.b.map(x=>`<div class="xo-cell ${x===0?"x":x===1?"o":""}">${x!==null?SYM[x]:""}</div>`).join("")}</div><p class="big" style="font-size:28px">${v.last&&v.last.clash?"💥 تصادم!":"👀 ناظر الشاشة"}</p>`);return}
      if(v.ph==="xoend"){const r=v.result;C.watch(root,v,r==="draw"?"🤝":r===t?"🏆":"😅",r==="draw"?"تعادل!":r===t?"فاز فريقك!":"المرة الجاية لكم 💪");return}
      C.watch(root,v);},
  };
});
/* =====================================================================
   11) حروف: hexagon letter board, two teams race to answer and connect their sides
   ===================================================================== */
B.push(K=>{
  const {H,esc,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,norm,nearTruth}=K;
  const C=common(K);
  // questions per letter, medium to hard: {q: clue, a: answer, alt: other accepted spellings, c: category}
  const BANK={"ا":[{"q":"أطول نهر في أمريكا الجنوبية","a":"الأمازون","alt":["امازون","نهر الامازون"],"c":"geo"},{"q":"عاصمة إثيوبيا","a":"أديس أبابا","alt":["اديس ابابا","أديس ابابا"],"c":"geo"},{"q":"العالم اللي وضع النظرية النسبية","a":"أينشتاين","alt":["اينشتاين","انشتاين","آينشتاين","البرت اينشتاين"],"c":"phys"},{"q":"الدولة اللي عاصمتها كانبيرا","a":"أستراليا","alt":["استراليا"],"c":"geo"},{"q":"الدولة اللي فازت بكأس العالم ٢٠٢٢","a":"الأرجنتين","alt":["ارجنتين","الارجنتين"],"c":"sport"},{"q":"حيوان بحري عنده ثلاث قلوب وثمان أذرع","a":"أخطبوط","alt":["اخطبوط","الأخطبوط"],"c":"bio"},{"q":"الغزوة اللي صارت سنة ٣ هـ عند الجبل المشهور شمال المدينة","a":"أحد","alt":["احد","غزوة أحد"],"r":1,"c":"rel"},{"q":"الغزوة اللي يسمونها أيضاً غزوة الخندق","a":"الأحزاب","alt":["احزاب","غزوة الأحزاب"],"r":1,"c":"rel"},{"q":"النبي اللي بنى الكعبة مع ابنه إسماعيل","a":"إبراهيم","alt":["ابراهيم","ابراهيم عليه السلام"],"r":1,"c":"rel"},{"q":"الصحابي اللي لقبه «الصدّيق»","a":"أبو بكر","alt":["ابو بكر","ابوبكر","أبو بكر الصديق"],"r":1,"c":"rel"},{"q":"السورة اللي تعدل ثلث القرآن","a":"الإخلاص","alt":["الاخلاص","سورة الإخلاص"],"r":1,"c":"rel"},{"q":"وحدة قياس التيار الكهربائي","a":"أمبير","alt":["امبير","الأمبير"],"c":"phys"},{"q":"الجسيم السالب اللي يدور حول نواة الذرة","a":"إلكترون","alt":["الكترون","الإلكترون"],"c":"phys"},{"q":"الظاهرة اللي تخلي الملعقة تبان مكسورة داخل كاس الماء","a":"انكسار الضوء","alt":["انكسار","الانكسار"],"c":"phys"},{"q":"العضو اللي فيه أصغر عظمة في جسم الإنسان","a":"الأذن","alt":["اذن","أذن","الاذن"],"c":"bio"},{"q":"الهرمون اللي يفرزه البنكرياس وينظّم السكر في الدم","a":"الإنسولين","alt":["انسولين","الانسولين","إنسولين"],"c":"bio"},{"q":"النادي السعودي الملقب بـ «العميد»","a":"الاتحاد","alt":["اتحاد"],"c":"sport"},{"q":"الدولة اللي استضافت أول كأس عالم سنة ١٩٣٠","a":"الأوروغواي","alt":["اوروغواي","الاوروجواي","أوروجواي"],"c":"sport"},{"q":"الشركة اللي أسسها ستيف جوبز","a":"أبل","alt":["ابل","آبل","apple"],"c":"tech"},{"q":"عاصمة كازاخستان","a":"أستانا","alt":["استانا","نور سلطان"],"c":"geo"},{"q":"الدولة اللي عاصمتها كيتو","a":"الإكوادور","alt":["اكوادور","الاكوادور"],"c":"geo"},{"q":"الدولة اللي عاصمتها روما","a":"إيطاليا","alt":["ايطاليا"],"c":"geo"},{"q":"أعلى قمة في العالم","a":"إيفرست","alt":["ايفرست","افرست","جبل ايفرست"],"c":"geo"},{"q":"أطول سلسلة جبال على اليابسة، في أمريكا الجنوبية","a":"الأنديز","alt":["انديز","جبال الانديز"],"c":"geo"},{"q":"القارة المتجمدة في جنوب الأرض","a":"أنتاركتيكا","alt":["انتاركتيكا","انتارتيكا","القارة القطبية الجنوبية"],"c":"geo"},{"q":"الغاز اللي يحمي الأرض من الأشعة فوق البنفسجية","a":"الأوزون","alt":["اوزون","طبقة الاوزون"],"c":"chem"},{"q":"الكوكب اللي يدور وهو مايل على جنبه","a":"أورانوس","alt":["اورانوس"],"c":"space"},{"q":"المدينة اليونانية القديمة اللي تعتبر مهد الديمقراطية","a":"أثينا","alt":["اثينا"],"c":"hist"},{"q":"القائد المقدوني اللي وصلت فتوحاته إلى الهند","a":"الإسكندر","alt":["الاسكندر","الاسكندر المقدوني","اسكندر"],"c":"hist"},{"q":"العالم اللي اكتشف قانون الطفو وصرخ «وجدتها»","a":"أرخميدس","alt":["ارخميدس"],"c":"phys"},{"q":"عدد لاعبي فريق كرة القدم داخل الملعب","a":"أحد عشر","alt":["احد عشر","١١","11","حداش"],"c":"sport"},{"q":"نظام تشغيل جوجل للجوالات","a":"أندرويد","alt":["اندرويد","android"],"c":"tech"},{"q":"الفاكهة اللي لها تاج أخضر وقشرها خشن","a":"أناناس","alt":["اناناس","الاناناس"],"c":"food"},{"q":"المحافظة السعودية اللي فيها أكبر واحة نخيل في العالم","a":"الأحساء","alt":["الاحساء","احساء","الحسا"],"c":"ksa"},{"q":"الصحابي الملقب بـ «أمين هذه الأمة»","a":"أبو عبيدة","alt":["ابو عبيدة","أبو عبيدة بن الجراح","ابوعبيدة"],"c":"rel","r":1},{"q":"النبي اللي يُضرب فيه المثل بالصبر على البلاء","a":"أيوب","alt":["ايوب","أيوب عليه السلام"],"c":"rel","r":1},{"q":"النبي اللي قال الله عنه «ورفعناه مكاناً علياً»","a":"إدريس","alt":["ادريس"],"c":"rel","r":1},{"q":"أقسى مادة طبيعية","a":"الألماس","alt":["الماس","ألماس","الالماس"],"c":"chem"}],"ب":[{"q":"عاصمة البرازيل","a":"برازيليا","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها المنامة","a":"البحرين","alt":["بحرين"],"c":"geo"},{"q":"عاصمة رومانيا","a":"بوخارست","alt":["بوخارست"],"c":"geo"},{"q":"الطير الملوّن اللي يقلّد كلام البشر","a":"ببغاء","alt":["ببغا","الببغاء","ببغاوات"],"c":"bio"},{"q":"اسم عائلة مخترع الهاتف «ألكسندر غراهام …»","a":"بيل","alt":["جراهام بيل","غراهام بيل"],"c":"hist"},{"q":"عملة تايلاند","a":"بات","alt":["البات"],"c":"geo"},{"q":"أول غزوة كبرى في الإسلام، سنة ٢ هـ","a":"بدر","alt":["غزوة بدر"],"r":1,"c":"rel"},{"q":"أطول سورة في القرآن","a":"البقرة","alt":["بقرة","سورة البقرة"],"r":1,"c":"rel"},{"q":"الصحابي اللي كان أول مؤذن في الإسلام","a":"بلال","alt":["بلال بن رباح"],"r":1,"c":"rel"},{"q":"الجسيم الموجب اللي في نواة الذرة","a":"بروتون","alt":["البروتون"],"c":"phys"},{"q":"الأداة اللي فيها إبرة تأشّر دايماً على الشمال","a":"بوصلة","alt":["البوصلة","بوصله"],"c":"phys"},{"q":"الحشرة اللي تنقل مرض الملاريا","a":"بعوض","alt":["بعوضة","البعوض","الناموس"],"c":"bio"},{"q":"العملية اللي يصنع فيها النبات غذاءه من ضوء الشمس","a":"البناء الضوئي","alt":["بناء ضوئي","التمثيل الضوئي"],"c":"bio"},{"q":"المدينة النبطية المنحوتة في الصخر الوردي في الأردن","a":"البتراء","alt":["بترا","البترا","بتراء"],"c":"hist"},{"q":"اللاعب البرازيلي الأسطوري اللي فاز بكأس العالم ٣ مرات","a":"بيليه","alt":["بيلي"],"c":"sport"},{"q":"الموسيقار الألماني اللي ألّف السيمفونية التاسعة وهو أصم","a":"بيتهوفن","alt":["بتهوفن"],"c":"art"},{"q":"لغة البرمجة اللي اسمها اسم ثعبان","a":"بايثون","alt":["python","بايثن"],"c":"tech"},{"q":"الحلا التركي من رقائق العجين والفستق والقطر","a":"بقلاوة","alt":["البقلاوة","بقلاوه"],"c":"food"},{"q":"عاصمة المجر","a":"بودابست","alt":[],"c":"geo"},{"q":"عاصمة صربيا","a":"بلغراد","alt":[],"c":"geo"},{"q":"عاصمة سلوفاكيا","a":"براتيسلافا","alt":["براتسلافا"],"c":"geo"},{"q":"عاصمة بلجيكا","a":"بروكسل","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها الإدارية لاباز","a":"بوليفيا","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها وارسو","a":"بولندا","alt":["بولنده"],"c":"geo"},{"q":"البحر اللي بين السعودية وأفريقيا","a":"البحر الأحمر","alt":["الاحمر","بحر احمر"],"c":"geo"},{"q":"طائر ما يطير ويعيش في القطب الجنوبي","a":"بطريق","alt":["البطريق","بطاريق"],"c":"bio"},{"q":"الطائر اللي يقدر يلف راسه ٢٧٠ درجة","a":"بومة","alt":["البومة","بوم"],"c":"bio"},{"q":"العضو اللي يفرز الإنسولين","a":"البنكرياس","alt":["بنكرياس"],"c":"bio"},{"q":"المدينة اللي فيها «الحدائق المعلقة» من عجائب الدنيا السبع","a":"بابل","alt":[],"c":"hist"},{"q":"عاصمة الدولة العباسية","a":"بغداد","alt":[],"c":"hist"},{"q":"الرسام الإسباني مؤسس المدرسة التكعيبية","a":"بيكاسو","alt":["بابلو بيكاسو"],"c":"art"},{"q":"النادي الإسباني اللي ملعبه «كامب نو»","a":"برشلونة","alt":["برشلونه","البارسا"],"c":"sport"},{"q":"تقنية لاسلكية سميت على اسم ملك دنماركي قديم","a":"بلوتوث","alt":["bluetooth","البلوتوث"],"c":"tech"},{"q":"الحلا المصري من السميد والقطر","a":"بسبوسة","alt":["بسبوسه","البسبوسة","هريسة"],"c":"food"},{"q":"ملكة سبأ اللي ذُكرت قصتها مع سليمان","a":"بلقيس","alt":[],"c":"rel","r":1},{"q":"البيت اللي في السماء السابعة يطوف حوله الملائكة","a":"البيت المعمور","alt":["المعمور"],"c":"rel","r":1}],"ت":[{"q":"عاصمة تايوان","a":"تايبيه","alt":["تايبي","تايبيه"],"c":"geo"},{"q":"النهر اللي يمر في وسط لندن","a":"التايمز","alt":["تايمز","تيمز"],"c":"geo"},{"q":"الدولة اللي عاصمتها أنقرة","a":"تركيا","alt":[],"c":"geo"},{"q":"السفينة اللي غرقت سنة ١٩١٢ بعد ما صدمت جبل جليد","a":"تايتانك","alt":["تيتانيك","تايتانيك","تايتنك"],"c":"hist"},{"q":"الدولة اللي عاصمتها بانكوك","a":"تايلاند","alt":["تايلند"],"c":"geo"},{"q":"الفرعون الصغير اللي اكتشفوا مقبرته كاملة سنة ١٩٢٢","a":"توت عنخ آمون","alt":["توت عنخ امون","توت"],"c":"hist"},{"q":"الغزوة اللي صارت سنة ٩ هـ ويسمونها «غزوة العسرة»","a":"تبوك","alt":["غزوة تبوك"],"r":1,"c":"rel"},{"q":"السورة الوحيدة اللي ما تبدأ بالبسملة","a":"التوبة","alt":["توبة","سورة التوبة","براءة"],"r":1,"c":"rel"},{"q":"الرياضة اللي فيها بطولة «ويمبلدون»","a":"تنس","alt":["التنس","كرة المضرب"],"c":"sport"},{"q":"منصة الفيديوهات القصيرة الصينية المشهورة","a":"تيك توك","alt":["تيكتوك","tiktok"],"c":"tech"},{"q":"السلطة الشامية من البقدونس والبرغل","a":"تبولة","alt":["التبولة","تبوله"],"c":"food"},{"q":"عاصمة ألبانيا","a":"تيرانا","alt":[],"c":"geo"},{"q":"عاصمة إستونيا","a":"تالين","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها دودوما","a":"تنزانيا","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها لومي","a":"توغو","alt":["توجو"],"c":"geo"},{"q":"الدولة اللي عاصمتها انجامينا","a":"تشاد","alt":[],"c":"geo"},{"q":"المنطقة السعودية الشمالية الغربية اللي فيها مشروع نيوم","a":"تبوك","alt":[],"c":"ksa"},{"q":"معدن قوي وخفيف يستخدمونه في الطيارات والمفاصل الصناعية","a":"تيتانيوم","alt":["التيتانيوم"],"c":"chem"},{"q":"أكبر الزواحف الحية في العالم","a":"التمساح","alt":["تمساح","تمساح المياه المالحة"],"c":"bio"},{"q":"أكبر سحلية في العالم","a":"تنين كومودو","alt":["كومودو","تنين"],"c":"bio"},{"q":"أكبر أقمار كوكب زحل","a":"تيتان","alt":[],"c":"space"},{"q":"الضريح الرخامي الأبيض المشهور في الهند","a":"تاج محل","alt":["تاج محل"],"c":"art"},{"q":"الاسم القديم لمنصة X","a":"تويتر","alt":["twitter"],"c":"tech"},{"q":"الفاكهة اللي من أنواعها خلاص وسكري ومجدول","a":"تمر","alt":["التمر","تمور"],"c":"food"},{"q":"مؤلف رواية «الحرب والسلام»","a":"تولستوي","alt":["ليو تولستوي"],"c":"art"},{"q":"الفاكهة اللي أقسم الله فيها مع الزيتون في أول سورة باسمها","a":"التين","alt":["تين"],"c":"rel","r":1},{"q":"الاسم الثاني لسورة المسد","a":"تبّت","alt":["تبت","سورة تبت"],"c":"rel","r":1}],"ث":[{"q":"الحيوان اللي يسمونه «أبو الحصين»","a":"ثعلب","alt":["الثعلب"],"c":"bio"},{"q":"الغاز اللي نطلعه مع الزفير وتمتصه النباتات","a":"ثاني أكسيد الكربون","alt":["ثاني اكسيد الكربون","co2"],"c":"chem"},{"q":"وحدة قياس الزمن الأساسية في النظام الدولي للوحدات","a":"الثانية","alt":["ثانية","ثواني"],"c":"phys"},{"q":"الغار اللي اختبأ فيه النبي ﷺ وأبو بكر في الهجرة","a":"ثور","alt":["غار ثور"],"r":1,"c":"rel"},{"q":"«لكل فعل رد فعل مساوٍ له في المقدار ومعاكس في الاتجاه» هو قانون نيوتن …","a":"الثالث","alt":["ثالث","الثالث لنيوتن"],"c":"phys"},{"q":"مكان في الفضاء جاذبيته قوية لدرجة إن حتى الضوء ما يفلت منه","a":"ثقب أسود","alt":["الثقب الأسود","ثقب اسود"],"c":"space"},{"q":"الحيوانات اللي ترضع صغارها","a":"الثدييات","alt":["ثدييات","ثديات"],"c":"bio"},{"q":"الزاحف اللي ما عنده أرجل ويبدّل جلده","a":"ثعبان","alt":["الثعبان","ثعابين"],"c":"bio"},{"q":"النبات اللي فصوصه لها ريحة قوية","a":"ثوم","alt":["الثوم"],"c":"food"},{"q":"البلدة السعودية على البحر الأحمر اللي فيها جامعة كاوست","a":"ثول","alt":[],"c":"ksa"},{"q":"قوم النبي صالح","a":"ثمود","alt":["قوم ثمود"],"c":"rel","r":1},{"q":"الجهاز اللي يحافظ على درجة حرارة المكيف أو الفرن ثابتة","a":"ثرموستات","alt":["ثيرموستات","منظم الحرارة"],"c":"phys"}],"ج":[{"q":"عاصمة إندونيسيا","a":"جاكرتا","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها تبليسي","a":"جورجيا","alt":[],"c":"geo"},{"q":"أكبر جزيرة في العالم","a":"جرينلاند","alt":["غرينلاند","جرينلند","غرينلند","جرين لاند"],"c":"geo"},{"q":"حيوان يشبه البقر يعيش في المستنقعات ويستخدمونه في الحرث بآسيا","a":"جاموس","alt":["الجاموس"],"c":"bio"},{"q":"المضيق اللي يفصل أوروبا عن أفريقيا","a":"جبل طارق","alt":["مضيق جبل طارق"],"c":"geo"},{"q":"الملَك اللي نزل بالوحي على النبي ﷺ","a":"جبريل","alt":["جبرائيل","جبريل عليه السلام"],"r":1,"c":"rel"},{"q":"الصحابي الملقب بـ «ذو الجناحين» واستشهد في مؤتة","a":"جعفر","alt":["جعفر بن أبي طالب","جعفر الطيار"],"r":1,"c":"rel"},{"q":"وحدة قياس الطاقة في النظام الدولي","a":"جول","alt":["الجول"],"c":"phys"},{"q":"أكبر عضو في جسم الإنسان كله","a":"الجلد","alt":["جلد"],"c":"bio"},{"q":"الرياضة اليابانية اللي فيها رمي الخصم على الأرض بالحزام","a":"جودو","alt":["الجودو"],"c":"sport"},{"q":"الشركة اللي أسسها لاري بيج وسيرجي برين","a":"جوجل","alt":["غوغل","قوقل","google"],"c":"tech"},{"q":"أكلة نجدية من القمح المجروش المطبوخ","a":"جريش","alt":["الجريش"],"c":"food"},{"q":"المدينة السويسرية اللي فيها مقر الصليب الأحمر الدولي","a":"جنيف","alt":[],"c":"geo"},{"q":"الدولة الصغيرة على مضيق باب المندب وعاصمتها بنفس اسمها","a":"جيبوتي","alt":[],"c":"geo"},{"q":"الدولة اللي جاء منها العدّاء يوسين بولت","a":"جامايكا","alt":["جمايكا"],"c":"geo"},{"q":"أكبر دولة عربية وأفريقية مساحة","a":"الجزائر","alt":["جزائر"],"c":"geo"},{"q":"المدينة الملقبة بـ «عروس البحر الأحمر»","a":"جدة","alt":["جده"],"c":"ksa"},{"q":"المنطقة السعودية المشهورة بالمانجو وجزر فرسان","a":"جازان","alt":["جيزان"],"c":"ksa"},{"q":"المدينة الصناعية السعودية على ساحل الخليج العربي","a":"الجبيل","alt":["جبيل"],"c":"ksa"},{"q":"القوة اللي تخلي التفاحة تطيح على الأرض","a":"الجاذبية","alt":["جاذبية"],"c":"phys"},{"q":"مجموعة ذرات مترابطة مع بعض، مثل H₂O","a":"جزيء","alt":["جزيئ","الجزيء","جزئ"],"c":"chem"},{"q":"الحشرة اللي تهاجم المحاصيل في أسراب ضخمة","a":"جراد","alt":["الجراد","جرادة"],"c":"bio"},{"q":"أول إنسان صعد للفضاء سنة ١٩٦١","a":"جاجارين","alt":["غاغارين","يوري جاجارين","يوري غاغارين"],"c":"space"},{"q":"مؤسس الإمبراطورية المغولية","a":"جنكيز خان","alt":["جنكيزخان","جنكيز"],"c":"hist"},{"q":"الأديب العباسي صاحب كتاب «البخلاء»","a":"الجاحظ","alt":["جاحظ"],"c":"art"},{"q":"لغة برمجة اسمها اسم جزيرة إندونيسية","a":"جافا","alt":["java"],"c":"tech"},{"q":"الجبل اللي استوت عليه سفينة نوح","a":"الجودي","alt":["جودي","جبل الجودي"],"c":"rel","r":1},{"q":"القائد الجبار اللي قتله داود","a":"جالوت","alt":[],"c":"rel","r":1}],"ح":[{"q":"الزاحف اللي يغيّر لونه حسب المكان","a":"حرباء","alt":["حرباية","الحرباء","حربا"],"c":"bio"},{"q":"المعدن الأساسي في صناعة الفولاذ","a":"حديد","alt":["الحديد"],"c":"chem"},{"q":"الشاعر العربي اللي صار مضرب المثل في الكرم","a":"حاتم الطائي","alt":["حاتم"],"c":"hist"},{"q":"الاسم العربي لـ DNA","a":"الحمض النووي","alt":["حمض نووي","الحامض النووي"],"c":"bio"},{"q":"المدينة السعودية اللي جنبها جبلا أجا وسلمى","a":"حائل","alt":["حايل"],"c":"ksa"},{"q":"البقول اللي يسوون منه «المتبّل» الأبيض المشهور مع الطحينة","a":"حمص","alt":["الحمص"],"c":"food"},{"q":"الغزوة اللي صارت بعد فتح مكة ضد هوازن","a":"حنين","alt":["غزوة حنين"],"r":1,"c":"rel"},{"q":"الصلح اللي صار بين المسلمين وقريش سنة ٦ هـ","a":"الحديبية","alt":["حديبية","صلح الحديبية"],"r":1,"c":"rel"},{"q":"عم النبي ﷺ الملقب بـ «أسد الله» واستشهد في أحد","a":"حمزة","alt":["حمزة بن عبد المطلب"],"r":1,"c":"rel"},{"q":"اللي تكسره الطيارة لما تسرع وتطلع صوت مثل الانفجار","a":"حاجز الصوت","alt":["حاجز"],"c":"phys"},{"q":"الحرب اللي انتهت سنة ١٩٤٥","a":"الحرب العالمية الثانية","alt":["العالمية الثانية"],"c":"hist"},{"q":"المعركة اللي انتصر فيها صلاح الدين سنة ١١٨٧","a":"حطين","alt":["معركة حطين"],"c":"hist"},{"q":"المدينة السورية المشهورة بقلعتها وصابونها","a":"حلب","alt":[],"c":"geo"},{"q":"المنطقة اليمنية المشهورة بالعسل الدوعني","a":"حضرموت","alt":[],"c":"geo"},{"q":"المدينة السورية المشهورة بالنواعير","a":"حماة","alt":["حماه"],"c":"geo"},{"q":"المحافظة السعودية في الشمال الشرقي اللي اسمها فيه «الباطن»","a":"حفر الباطن","alt":["حفرالباطن"],"c":"ksa"},{"q":"المادة اللي تحوّل ورقة تبّاع الشمس للون الأحمر","a":"حمض","alt":["الحمض","الأحماض","حامض"],"c":"chem"},{"q":"الطاقة اللي تنتقل من الجسم الحار للجسم البارد","a":"الحرارة","alt":["حرارة"],"c":"phys"},{"q":"أكبر حيوان عاش على الأرض","a":"الحوت الأزرق","alt":["حوت","الحوت"],"c":"bio"},{"q":"الكائن اللي يمشي على بطنه ويحمل قوقعته","a":"حلزون","alt":["الحلزون","حلزونة"],"c":"bio"},{"q":"السمكة اللي الذكر فيها هو اللي يحمل الصغار","a":"حصان البحر","alt":["فرس البحر"],"c":"bio"},{"q":"الملك البابلي صاحب أقدم شريعة قوانين مكتوبة","a":"حمورابي","alt":[],"c":"hist"},{"q":"اللاعب الوحيد اللي يحق له يمسك الكورة بيده","a":"حارس المرمى","alt":["الحارس","حارس"],"c":"sport"},{"q":"الغار اللي نزل فيه أول الوحي","a":"حراء","alt":["غار حراء"],"c":"rel","r":1},{"q":"مرضعة النبي ﷺ في البادية","a":"حليمة السعدية","alt":["حليمة"],"c":"rel","r":1}],"خ":[{"q":"عاصمة السودان","a":"الخرطوم","alt":["خرطوم"],"c":"geo"},{"q":"المدينة السعودية اللي يبدأ منها جسر الملك فهد","a":"الخبر","alt":["خبر"],"c":"ksa"},{"q":"الحيوان الثديي الوحيد اللي يطير","a":"خفاش","alt":["الخفاش","وطواط"],"c":"bio"},{"q":"العالم اللي اشتقت من اسمه كلمة Algorithm","a":"الخوارزمي","alt":["خوارزمي"],"c":"hist"},{"q":"المسطّح المائي اللي بين السعودية وإيران","a":"الخليج العربي","alt":["الخليج","خليج"],"c":"geo"},{"q":"الخط الوهمي اللي يقسم الأرض نصفين شمالي وجنوبي","a":"خط الاستواء","alt":["الاستواء"],"c":"geo"},{"q":"الغزوة اللي حفروا فيها حول المدينة بفكرة سلمان الفارسي","a":"الخندق","alt":["خندق","غزوة الخندق"],"r":1,"c":"rel"},{"q":"أول زوجة للنبي ﷺ","a":"خديجة","alt":["خديجه","خديجة بنت خويلد"],"r":1,"c":"rel"},{"q":"الصحابي الملقب بـ «سيف الله المسلول»","a":"خالد بن الوليد","alt":["خالد"],"r":1,"c":"rel"},{"q":"الغزوة اللي فُتحت فيها الحصون شمال المدينة سنة ٧ هـ","a":"خيبر","alt":["غزوة خيبر"],"r":1,"c":"rel"},{"q":"عدد لاعبي فريق كرة السلة داخل الملعب","a":"خمسة","alt":["خمس","٥","5"],"c":"sport"},{"q":"المحافظة السعودية جنوب الرياض المشهورة بالزراعة","a":"الخرج","alt":["خرج"],"c":"ksa"},{"q":"ثاني أكبر مدينة في منطقة عسير","a":"خميس مشيط","alt":["خميس"],"c":"ksa"},{"q":"أصغر وحدة حية في جسم الكائن","a":"خلية","alt":["الخلية","خلايا"],"c":"bio"},{"q":"لما يمر القمر في ظل الأرض ويختفي ضوءه","a":"خسوف","alt":["الخسوف","خسوف القمر"],"c":"space"},{"q":"حيوان صغير يعيش تحت الأرض ويحفر أنفاق","a":"خلد","alt":["الخلد","خُلد"],"c":"bio"},{"q":"العضو اللي تتنفس فيه السمكة","a":"خياشيم","alt":["خيشوم","الخياشيم"],"c":"bio"},{"q":"الفرعون صاحب الهرم الأكبر في الجيزة","a":"خوفو","alt":[],"c":"hist"},{"q":"فاكهة قشرها مخملي ولها نواة كبيرة","a":"خوخ","alt":["الخوخ"],"c":"food"},{"q":"العبد الصالح اللي رافقه موسى في سورة الكهف","a":"الخضر","alt":["خضر"],"c":"rel","r":1},{"q":"اللقب القرآني للنبي ﷺ ومعناه آخر الأنبياء","a":"خاتم النبيين","alt":["خاتم الانبياء","خاتم"],"c":"rel","r":1}],"د":[{"q":"الدولة اللي عاصمتها كوبنهاغن","a":"الدنمارك","alt":["دنمارك","الدانمارك"],"c":"geo"},{"q":"عاصمة قطر","a":"الدوحة","alt":["دوحة","الدوحه"],"c":"geo"},{"q":"الزواحف العملاقة اللي انقرضت قبل ٦٦ مليون سنة","a":"ديناصور","alt":["ديناصورات","الديناصورات"],"c":"bio"},{"q":"عاصمة الدولة السعودية الأولى","a":"الدرعية","alt":["درعية","الدرعيه"],"c":"ksa"},{"q":"حيوان بحري ذكي يتنفس الهواء ويصطاد بالصدى","a":"دلفين","alt":["دولفين","الدلفين","دلافين"],"c":"bio"},{"q":"الرسام اللي رسم الموناليزا","a":"دافنشي","alt":["دا فنشي","ليوناردو دافنشي","دافينشي"],"c":"art"},{"q":"النبي اللي ألان الله له الحديد","a":"داود","alt":["داوود","داود عليه السلام"],"r":1,"c":"rel"},{"q":"المجرة اللي فيها كوكب الأرض","a":"درب التبانة","alt":["درب اللبانة","مجرة درب التبانة"],"c":"space"},{"q":"عاصمة إيرلندا","a":"دبلن","alt":[],"c":"geo"},{"q":"عاصمة السنغال","a":"داكار","alt":["دكار"],"c":"geo"},{"q":"عاصمة بنغلاديش","a":"دكا","alt":["داكا"],"c":"geo"},{"q":"المدينة اللي فيها برج خليفة","a":"دبي","alt":[],"c":"geo"},{"q":"النهر الأوروبي اللي يمر في فيينا وبودابست","a":"الدانوب","alt":["دانوب","نهر الدانوب"],"c":"geo"},{"q":"عاصمة المنطقة الشرقية","a":"الدمام","alt":["دمام"],"c":"ksa"},{"q":"المدينة التاريخية في الجوف اللي فيها قلعة مارد","a":"دومة الجندل","alt":["دومه الجندل"],"c":"ksa"},{"q":"الكائن اللي ينتج الحرير","a":"دودة القز","alt":["دود القز","دودة الحرير"],"c":"bio"},{"q":"العضو اللي يستهلك حوالي ٢٠٪ من طاقة جسمك","a":"الدماغ","alt":["دماغ","المخ"],"c":"bio"},{"q":"المادة المتفجرة اللي اخترعها ألفريد نوبل","a":"ديناميت","alt":["الديناميت"],"c":"hist"},{"q":"واحد من قمري كوكب المريخ (مع فوبوس)","a":"ديموس","alt":["دايموس"],"c":"space"},{"q":"الفيلسوف صاحب جملة «أنا أفكر إذن أنا موجود»","a":"ديكارت","alt":["رينيه ديكارت"],"c":"art"},{"q":"اسم الدوري السعودي للمحترفين","a":"دوري روشن","alt":["روشن"],"c":"sport"},{"q":"الشراب الكثيف الحلو اللي ينطلع من التمر","a":"دبس","alt":["الدبس","دبس التمر"],"c":"food"},{"q":"الصحابي اللي كان جبريل يأتي أحياناً على صورته","a":"دحية الكلبي","alt":["دحية"],"c":"rel","r":1},{"q":"البيت اللي كان المسلمون يجتمعون فيه سراً في أول الدعوة بمكة","a":"دار الأرقم","alt":["دار الارقم بن ابي الارقم"],"c":"rel","r":1}],"ذ":[{"q":"المعدن اللي رمزه الكيميائي Au","a":"ذهب","alt":["الذهب"],"c":"chem"},{"q":"أصغر وحدة في العنصر الكيميائي تحتفظ بخصائصه","a":"ذرة","alt":["الذرة"],"c":"chem"},{"q":"الحيوان اللي يعيش في قطيع ويعوي في الليل","a":"ذئب","alt":["ذيب","الذئب","الذيب"],"c":"bio"},{"q":"RAM في الكمبيوتر اسمها بالعربي: «… الوصول العشوائي»","a":"ذاكرة","alt":["الذاكرة"],"c":"tech"},{"q":"الجزء اللي تستخدمه القطة للتوازن والسمكة للتوجيه","a":"ذيل","alt":["الذيل"],"c":"bio"},{"q":"اللقب اللي ينطلق على عثمان بن عفان لأنه تزوج بنتين للنبي ﷺ","a":"ذو النورين","alt":["ذي النورين"],"r":1,"c":"rel"},{"q":"الحبوب اللي يسوون منها الفشار","a":"ذرة","alt":["الذرة"],"c":"food"},{"q":"تحوّل المادة من صلبة إلى سائلة","a":"ذوبان","alt":["الذوبان","انصهار"],"c":"phys"},{"q":"عدد الاهتزازات في الثانية، ووحدتها الهيرتز","a":"ذبذبة","alt":["ذبذبات","تردد"],"c":"phys"},{"q":"سيف مشهور ارتبط اسمه بعلي بن أبي طالب","a":"ذو الفقار","alt":["ذوالفقار"],"c":"hist"},{"q":"الشهر الهجري اللي فيه الحج","a":"ذو الحجة","alt":["ذي الحجة"],"c":"rel","r":1},{"q":"الشهر الهجري الحادي عشر","a":"ذو القعدة","alt":["ذي القعدة"],"c":"rel","r":1},{"q":"المعركة البحرية الكبيرة بين المسلمين والروم في عهد عثمان","a":"ذات الصواري","alt":[],"c":"rel","r":1}],"ر":[{"q":"عاصمة المغرب","a":"الرباط","alt":["رباط"],"c":"geo"},{"q":"أكبر دولة في العالم مساحة","a":"روسيا","alt":[],"c":"geo"},{"q":"عاصمة لاتفيا","a":"ريغا","alt":["ريجا"],"c":"geo"},{"q":"المعدن الثقيل الرمادي اللي رمزه Pb","a":"رصاص","alt":["الرصاص"],"c":"chem"},{"q":"اللاعب البرتغالي اللي انضم للنصر السعودي سنة ٢٠٢٣","a":"رونالدو","alt":["كريستيانو","كريستيانو رونالدو"],"c":"sport"},{"q":"العضو اللي يتم فيه تبادل الأكسجين في جسمك","a":"الرئة","alt":["رئة","رئتين","الرئتين"],"c":"bio"},{"q":"المدينة اللي استعادها الملك عبدالعزيز سنة ١٩٠٢","a":"الرياض","alt":["رياض"],"c":"ksa"},{"q":"عاصمة آيسلندا","a":"ريكيافيك","alt":["ريكجافيك","ريكيافك"],"c":"geo"},{"q":"الدولة اللي عاصمتها كيغالي","a":"رواندا","alt":[],"c":"geo"},{"q":"العاصمة القديمة للبرازيل، المشهورة بتمثال المسيح على الجبل","a":"ريو دي جانيرو","alt":["ريو","ريودي جانيرو"],"c":"geo"},{"q":"إمارة في الإمارات تحمل اسم «رأس»","a":"رأس الخيمة","alt":["راس الخيمة"],"c":"geo"},{"q":"أكبر صحراء رملية متصلة في العالم","a":"الربع الخالي","alt":["ربع الخالي"],"c":"ksa"},{"q":"المحافظة السعودية على البحر الأحمر شمال جدة","a":"رابغ","alt":[],"c":"ksa"},{"q":"الفصيلة اللي ينتمي لها الأخطبوط والحلزون","a":"رخويات","alt":["الرخويات"],"c":"bio"},{"q":"الغزال الشمالي اللي يجر الزلاجات في الثلج","a":"رنة","alt":["الرنة","الرنه"],"c":"bio"},{"q":"جهاز يكتشف الطيارات والسفن بالموجات","a":"رادار","alt":["الرادار"],"c":"tech"},{"q":"أشهر فراعنة مصر وأطولهم حكماً تقريباً","a":"رمسيس الثاني","alt":["رمسيس"],"c":"hist"},{"q":"النادي الأكثر فوزاً بدوري أبطال أوروبا","a":"ريال مدريد","alt":["الريال","ريال"],"c":"sport"},{"q":"الفاكهة اللي داخلها حبوب حمراء كثيرة","a":"رمان","alt":["الرمان"],"c":"food"},{"q":"بنت النبي ﷺ اللي تزوجها عثمان أولاً","a":"رقية","alt":["رقيه"],"c":"rel","r":1}],"ز":[{"q":"الكوكب المشهور بحلقاته","a":"زحل","alt":["كوكب زحل"],"c":"space"},{"q":"المعدن الوحيد اللي يكون سائل في حرارة الغرفة","a":"زئبق","alt":["زيبق","الزئبق"],"c":"chem"},{"q":"دولة أفريقية عاصمتها هراري","a":"زيمبابوي","alt":["زمبابوي"],"c":"geo"},{"q":"هزة في القشرة الأرضية تنقاس بمقياس ريختر","a":"زلزال","alt":["زلزلة","الزلزال","زلازل"],"c":"geo"},{"q":"الحيوان اللي قلبه يوزن حوالي ١١ كيلو ورقبته فيها ٧ فقرات بس","a":"زرافة","alt":["زرافه","الزرافة"],"c":"bio"},{"q":"المعدن اللي يغلّفون فيه الحديد عشان ما يصدّي","a":"زنك","alt":["الزنك"],"c":"chem"},{"q":"الصحابي اللي جمع القرآن في عهد أبي بكر","a":"زيد بن ثابت","alt":["زيد"],"r":1,"c":"rel"},{"q":"بئر الماء المباركة في مكة","a":"زمزم","alt":["بئر زمزم"],"r":1,"c":"rel"},{"q":"ثاني كوكب عن الشمس، ويسمونه «نجمة الصباح»","a":"الزهرة","alt":["زهرة","كوكب الزهرة"],"c":"space"},{"q":"أكبر مدن سويسرا","a":"زيورخ","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها لوساكا","a":"زامبيا","alt":[],"c":"geo"},{"q":"الجزيرة التنزانية المشهورة بالتوابل","a":"زنجبار","alt":[],"c":"geo"},{"q":"محافظة في منطقة الرياض يقولون عن أهلها «أهل الزلفي»","a":"الزلفي","alt":["زلفي"],"c":"ksa"},{"q":"المادة الشفافة اللي تنصنع من الرمل","a":"زجاج","alt":["الزجاج"],"c":"chem"},{"q":"الحجر الكريم الأخضر","a":"زمرد","alt":["الزمرد"],"c":"chem"},{"q":"الشجرة اللي غصنها رمز للسلام","a":"زيتون","alt":["الزيتون","شجرة الزيتون"],"c":"bio"},{"q":"ملكة تدمر اللي تحدّت الرومان","a":"زنوبيا","alt":[],"c":"hist"},{"q":"الموسيقي اللي نقل الفن والأناقة من بغداد إلى الأندلس","a":"زرياب","alt":[],"c":"art"},{"q":"اللاعب الفرنسي اللي نطح ماتيراتزي في نهائي ٢٠٠٦","a":"زيدان","alt":["زين الدين زيدان"],"c":"sport"},{"q":"العشبة اللي تنخلط بالسمسم وزيت الزيتون على المناقيش","a":"زعتر","alt":["الزعتر"],"c":"food"},{"q":"النبي اللي كفل مريم","a":"زكريا","alt":["زكريا عليه السلام"],"c":"rel","r":1},{"q":"الصحابي الوحيد المذكور اسمه صراحة في القرآن","a":"زيد بن حارثة","alt":["زيد"],"c":"rel","r":1}],"س":[{"q":"الدولة المدينة اللي يسمونها «مدينة الأسد» في آسيا","a":"سنغافورة","alt":["سنغافوره","سنقافورة"],"c":"geo"},{"q":"عاصمة كوريا الجنوبية","a":"سيول","alt":["سول"],"c":"geo"},{"q":"عاصمة تشيلي","a":"سانتياغو","alt":["سانتياجو","سانتياقو"],"c":"geo"},{"q":"الحيوان اللي يعيش أكثر من ١٥٠ سنة ويحمل بيته على ظهره","a":"سلحفاة","alt":["سلحفاه","سلحفا","السلحفاة"],"c":"bio"},{"q":"العنصر اللي تنصنع منه رقائق الكمبيوتر، وعليه اسم وادي في كاليفورنيا","a":"سيليكون","alt":["سليكون","السيليكون"],"c":"tech"},{"q":"عاصمة منطقة الجوف في السعودية","a":"سكاكا","alt":[],"c":"ksa"},{"q":"الصحابي الفارسي اللي أشار بحفر الخندق","a":"سلمان الفارسي","alt":["سلمان"],"r":1,"c":"rel"},{"q":"الصحابي اللي قال له النبي ﷺ «ارمِ فداك أبي وأمي»","a":"سعد بن أبي وقاص","alt":["سعد","سعد بن ابي وقاص"],"r":1,"c":"rel"},{"q":"اللاعب السعودي اللي سجّل هدف الفوز على الأرجنتين في كأس العالم ٢٠٢٢","a":"سالم الدوسري","alt":["سالم","الدوسري"],"c":"sport"},{"q":"أول رائد فضاء عربي، سنة ١٩٨٥","a":"سلطان بن سلمان","alt":["سلطان","الأمير سلطان بن سلمان"],"c":"space"},{"q":"الأكلة اليابانية من الرز والسمك النيء","a":"سوشي","alt":["السوشي"],"c":"food"},{"q":"عاصمة السويد","a":"ستوكهولم","alt":[],"c":"geo"},{"q":"عاصمة البوسنة والهرسك","a":"سراييفو","alt":[],"c":"geo"},{"q":"أكبر مدينة في أستراليا","a":"سيدني","alt":[],"c":"geo"},{"q":"الدولة اللي يلتقي فيها النيل الأبيض والنيل الأزرق","a":"السودان","alt":["سودان"],"c":"geo"},{"q":"الجزيرة اليمنية المشهورة بشجرة دم الأخوين","a":"سقطرى","alt":["سوقطرى"],"c":"geo"},{"q":"القارض اللي يخزّن البندق للشتاء","a":"سنجاب","alt":["السنجاب"],"c":"bio"},{"q":"السمكة اللي ترجع للنهر اللي انولدت فيه عشان تبيض","a":"سلمون","alt":["السلمون"],"c":"bio"},{"q":"المسافة المقطوعة مقسومة على الزمن","a":"السرعة","alt":["سرعة"],"c":"phys"},{"q":"سحابة غاز وغبار في الفضاء تتكون فيها النجوم","a":"سديم","alt":["السديم"],"c":"space"},{"q":"الحضارة اللي اخترعت الكتابة المسمارية في بلاد الرافدين","a":"السومريون","alt":["سومر","السومريين","سومريين"],"c":"hist"},{"q":"الرياضة اللي اشتهر فيها مايكل فيلبس","a":"سباحة","alt":["السباحة"],"c":"sport"},{"q":"الشركة الكورية صاحبة جوالات جالكسي","a":"سامسونج","alt":["سامسونغ","samsung"],"c":"tech"},{"q":"النبي اللي سخّر الله له الريح والجن","a":"سليمان","alt":["سليمان عليه السلام"],"c":"rel","r":1},{"q":"أول شهيدة في الإسلام","a":"سمية","alt":["سمية بنت خياط"],"c":"rel","r":1}],"ش":[{"q":"أكبر مدينة في الصين من حيث السكان","a":"شنغهاي","alt":["شانغهاي","شنقهاي"],"c":"geo"},{"q":"الكاتب الإنجليزي اللي كتب «روميو وجولييت»","a":"شكسبير","alt":["شيكسبير","وليام شكسبير"],"c":"art"},{"q":"المدينة الأمريكية اللي يسمونها «مدينة الرياح»","a":"شيكاغو","alt":["شيكاجو"],"c":"geo"},{"q":"أقرب الحيوانات للإنسان من ناحية الجينات","a":"شمبانزي","alt":["الشمبانزي"],"c":"bio"},{"q":"مدينة سياحية مصرية في جنوب سيناء مشهورة بالغوص","a":"شرم الشيخ","alt":["شرم"],"c":"geo"},{"q":"الشاعر الملقب بـ «أمير الشعراء»","a":"شوقي","alt":["أحمد شوقي","احمد شوقي"],"c":"art"},{"q":"اللحم المشوي على سيخ عمودي ويتقطع شرائح","a":"شاورما","alt":["شاورمة","الشاورما"],"c":"food"},{"q":"الإمارة الملقبة بعاصمة الثقافة في الإمارات","a":"الشارقة","alt":["شارقة"],"c":"geo"},{"q":"المحافظة السعودية في نجران على طرف الربع الخالي","a":"شرورة","alt":[],"c":"ksa"},{"q":"«الحاجز المرجاني العظيم» في أستراليا أكبر نظام من …","a":"الشعاب المرجانية","alt":["شعاب مرجانية","شعب مرجانية"],"c":"bio"},{"q":"الخاصية اللي تخلي الإلكترون سالب والبروتون موجب","a":"الشحنة","alt":["شحنة","الشحنة الكهربائية"],"c":"phys"},{"q":"الجسم اللي يحترق في الغلاف الجوي ونسميه «نجمة ساقطة»","a":"شهاب","alt":["الشهاب","شهب"],"c":"space"},{"q":"الإمبراطور الفرنجي اللي تُوّج إمبراطوراً سنة ٨٠٠م","a":"شارلمان","alt":[],"c":"hist"},{"q":"الراوية اللي تحكي القصص في «ألف ليلة وليلة»","a":"شهرزاد","alt":[],"c":"art"},{"q":"اللعبة اللي فيها «كش ملك»","a":"شطرنج","alt":["الشطرنج"],"c":"sport"},{"q":"أكلة بيض مطبوخ في صلصة الطماط والفلفل","a":"شكشوكة","alt":["شكشوكه"],"c":"food"},{"q":"النبي اللي أُرسل لأهل مدين","a":"شعيب","alt":["شعيب عليه السلام"],"c":"rel","r":1},{"q":"الشهر الهجري اللي قبل رمضان","a":"شعبان","alt":[],"c":"rel","r":1}],"ص":[{"q":"عاصمة اليمن","a":"صنعاء","alt":["صنعا"],"c":"geo"},{"q":"عاصمة بلغاريا","a":"صوفيا","alt":[],"c":"geo"},{"q":"الطير الجارح اللي يستخدمونه في المقناص","a":"صقر","alt":["الصقر","صقور"],"c":"bio"},{"q":"الدولة اللي عاصمتها مقديشو","a":"الصومال","alt":["صومال"],"c":"geo"},{"q":"اللاعب المصري الملقب بـ «الفرعون المصري» في ليفربول","a":"صلاح","alt":["محمد صلاح","مو صلاح"],"c":"sport"},{"q":"العنصر اللي يتركب منه ملح الطعام مع الكلور","a":"صوديوم","alt":["الصوديوم"],"c":"chem"},{"q":"النبي اللي أُرسل لقوم ثمود ومعجزته الناقة","a":"صالح","alt":["صالح عليه السلام"],"r":1,"c":"rel"},{"q":"ارتداد الصوت لما يصطدم بجبل أو جدار","a":"الصدى","alt":["صدى"],"c":"phys"},{"q":"القائد اللي حرر القدس بعد معركة حطين","a":"صلاح الدين","alt":["صلاح الدين الأيوبي","صلاح الدين الايوبي"],"c":"hist"},{"q":"المدينة العُمانية المشهورة بموسم الخريف","a":"صلالة","alt":["صلاله"],"c":"geo"},{"q":"أكبر صحراء حارة في العالم","a":"الصحراء الكبرى","alt":["الصحراء","صحراء"],"c":"geo"},{"q":"أكبر جزيرة في البحر المتوسط","a":"صقلية","alt":["صقليه"],"c":"geo"},{"q":"الطبقة البنية اللي تتكون على الحديد بسبب الرطوبة","a":"صدأ","alt":["الصدأ","صدا"],"c":"chem"},{"q":"النبات اللي يخزن الماء في الصحراء وعليه أشواك","a":"صبار","alt":["الصبار","صبّار"],"c":"bio"},{"q":"الحشرة اللي تقدر تعيش أسبوع بدون رأس","a":"صرصور","alt":["الصرصور","صراصير"],"c":"bio"},{"q":"الموجات اللي ما تقدر تنتقل في الفراغ","a":"الصوت","alt":["صوت"],"c":"phys"},{"q":"أكلة سمك ورز بالبصل المكرمل","a":"صيادية","alt":["الصيادية","صياديه"],"c":"food"},{"q":"الجبل اللي يبدأ منه السعي","a":"الصفا","alt":["صفا"],"c":"rel","r":1},{"q":"الصحابي اللي قال له النبي ﷺ «ربح البيع» لما ترك ماله وهاجر","a":"صهيب الرومي","alt":["صهيب"],"c":"rel","r":1}],"ض":[{"q":"البرمائي اللي يبدأ حياته «شرغوف» في الماء","a":"ضفدع","alt":["ضفدعة","الضفدع"],"c":"bio"},{"q":"سحاب قريب من الأرض يقلّل الرؤية","a":"ضباب","alt":["الضباب"],"c":"geo"},{"q":"الشي اللي سرعته حوالي ٣٠٠ ألف كيلو في الثانية","a":"الضوء","alt":["ضوء","ضو"],"c":"phys"},{"q":"الحيوان اللي صوته يشبه الضحك","a":"ضبع","alt":["الضبع"],"c":"bio"},{"q":"القوة المؤثرة على وحدة المساحة، وتنقاس بالباسكال","a":"الضغط","alt":["ضغط"],"c":"phys"},{"q":"«سن العقل» هو نوع من …","a":"ضرس","alt":["أضراس","الضرس","اضراس"],"c":"bio"},{"q":"الحرف اللي تُنسب له العربية فيقولون «لغة …»","a":"الضاد","alt":["ضاد"],"c":"art"},{"q":"من أسماء الأسد في العربية، ويبدأ بالضاد","a":"ضرغام","alt":["الضرغام"],"c":"art"},{"q":"محافظة ساحلية في منطقة تبوك","a":"ضباء","alt":["ضبا","ضبة"],"c":"ksa"},{"q":"الصلاة اللي وقتها بعد ارتفاع الشمس","a":"الضحى","alt":["ضحى","صلاة الضحى"],"c":"rel","r":1}],"ط":[{"q":"عاصمة ليبيا","a":"طرابلس","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها دوشنبه","a":"طاجيكستان","alt":["طاجكستان"],"c":"geo"},{"q":"المدينة السعودية المشهورة بالورد","a":"الطائف","alt":["طائف","الطايف","طايف"],"c":"ksa"},{"q":"الطير اللي يفتح ريش ذيله الملوّن مثل المروحة","a":"طاووس","alt":["طاوس","الطاووس"],"c":"bio"},{"q":"عاصمة إيران","a":"طهران","alt":[],"c":"geo"},{"q":"الصحابي اللي حمى النبي ﷺ بيده يوم أحد حتى شُلّت","a":"طلحة","alt":["طلحة بن عبيد الله"],"r":1,"c":"rel"},{"q":"المدينة اللي رموا فيها النبي ﷺ بالحجارة لما دعاهم","a":"الطائف","alt":["طائف","الطايف"],"r":1,"c":"rel"},{"q":"الطائر الوحيد اللي يقدر يطير لورا","a":"الطنان","alt":["طنان","الطائر الطنان"],"c":"bio"},{"q":"عاصمة أوزبكستان","a":"طشقند","alt":[],"c":"geo"},{"q":"المدينة المغربية على مضيق جبل طارق","a":"طنجة","alt":["طنجه"],"c":"geo"},{"q":"المحافظة السعودية المشهورة بأنها من أبرد المدن","a":"طريف","alt":[],"c":"ksa"},{"q":"كائن أخضر بسيط يعيش في الماء ويعمل بناء ضوئي","a":"طحلب","alt":["الطحالب","طحالب"],"c":"bio"},{"q":"العضو اللي في يسار البطن ويفلتر الدم","a":"الطحال","alt":["طحال"],"c":"bio"},{"q":"القدرة على بذل شغل، وتنقاس بالجول","a":"الطاقة","alt":["طاقة"],"c":"phys"},{"q":"القائد اللي عبر البحر وفتح الأندلس","a":"طارق بن زياد","alt":["طارق"],"c":"hist"},{"q":"الأديب الملقب بـ «عميد الأدب العربي»","a":"طه حسين","alt":[],"c":"art"},{"q":"اللعبة اللي تتلعب بالأيدي فوق شبكة عالية","a":"الطائرة","alt":["كرة الطائرة","طائرة"],"c":"sport"},{"q":"الصلصة المصنوعة من السمسم المطحون","a":"طحينة","alt":["الطحينة","طحينه"],"c":"food"},{"q":"الملك اللي قاد بني إسرائيل ضد جالوت","a":"طالوت","alt":[],"c":"rel","r":1},{"q":"السورة اللي اسمها حرفين: طاء وهاء","a":"طه","alt":["سورة طه"],"c":"rel","r":1}],"ظ":[{"q":"المحافظة العُمانية اللي فيها مدينة صلالة","a":"ظفار","alt":[],"c":"geo"},{"q":"الجزء الصلب في طرف كل إصبع","a":"ظفر","alt":["أظافر","اظافر","الظفر"],"c":"bio"},{"q":"حيوان رشيق يشبه الغزال","a":"ظبي","alt":["الظبي","ظبية"],"c":"bio"},{"q":"المدينة السعودية اللي فيها مقر أرامكو","a":"الظهران","alt":["ظهران"],"c":"ksa"},{"q":"كلمة عربية قديمة معناها المرضعة","a":"ظئر","alt":["الظئر"],"c":"art"},{"q":"الحيوان اللي يرش رائحة كريهة جداً عشان يدافع عن نفسه","a":"ظربان","alt":["الظربان"],"c":"bio"},{"q":"تأثير «… الاحتباس الحراري» يرفع حرارة الأرض","a":"ظاهرة","alt":["الظاهرة"],"c":"phys"}],"ع":[{"q":"عاصمة الأردن","a":"عمّان","alt":["عمان"],"c":"geo"},{"q":"الدولة اللي عاصمتها مسقط","a":"عمان","alt":["عُمان","سلطنة عمان"],"c":"geo"},{"q":"أقرب كوكب للشمس","a":"عطارد","alt":[],"c":"space"},{"q":"الكائن اللي ينسج بيته من خيوط حرير","a":"عنكبوت","alt":["العنكبوت"],"c":"bio"},{"q":"المنطقة السعودية اللي عاصمتها أبها","a":"عسير","alt":[],"c":"ksa"},{"q":"الآلة الموسيقية اللي يلقبونها «سلطان الآلات العربية»","a":"عود","alt":["العود"],"c":"art"},{"q":"ثالث الخلفاء الراشدين","a":"عثمان","alt":["عثمان بن عفان"],"r":1,"c":"rel"},{"q":"الخليفة الملقب بـ «الفاروق»","a":"عمر","alt":["عمر بن الخطاب"],"r":1,"c":"rel"},{"q":"الدولة اللي فتحت القسطنطينية سنة ١٤٥٣","a":"العثمانية","alt":["الدولة العثمانية","العثمانيين","عثمانية"],"c":"hist"},{"q":"مؤسس المملكة العربية السعودية الحديثة","a":"عبدالعزيز","alt":["عبد العزيز","الملك عبدالعزيز","الملك عبد العزيز","ابن سعود"],"c":"ksa"},{"q":"المدينة اليمنية الساحلية اللي كانت عاصمة الجنوب","a":"عدن","alt":[],"c":"geo"},{"q":"أصغر إمارة في الإمارات مساحة","a":"عجمان","alt":[],"c":"geo"},{"q":"المدينة الفلسطينية الساحلية المشهورة بأسوارها","a":"عكا","alt":["عكّا"],"c":"geo"},{"q":"المحافظة السعودية اللي فيها جبل الفيل ومدائن صالح","a":"العلا","alt":["علا","العُلا"],"c":"ksa"},{"q":"عاصمة منطقة الحدود الشمالية","a":"عرعر","alt":[],"c":"ksa"},{"q":"الكائن اللي يلمع تحت الضوء فوق البنفسجي وفي ذيله سم","a":"عقرب","alt":["العقرب"],"c":"bio"},{"q":"العضو اللي فيه القرنية والشبكية","a":"العين","alt":["عين"],"c":"bio"},{"q":"القطعة الزجاجية اللي في النظارة وتكسر الضوء","a":"عدسة","alt":["العدسة","عدسات"],"c":"phys"},{"q":"«شيخ الشهداء» قائد المقاومة الليبية ضد الإيطاليين","a":"عمر المختار","alt":[],"c":"hist"},{"q":"الشاعر الفارس صاحب المعلقة، وحبيبته عبلة","a":"عنترة","alt":["عنترة بن شداد"],"c":"art"},{"q":"البقول اللي تنطبخ منه الشوربة المشهورة في رمضان","a":"عدس","alt":["العدس"],"c":"food"},{"q":"رابع الخلفاء الراشدين","a":"علي","alt":["علي بن أبي طالب"],"c":"rel","r":1},{"q":"أم المؤمنين بنت أبي بكر","a":"عائشة","alt":["عايشة"],"c":"rel","r":1},{"q":"النبي اللي كلّم الناس وهو في المهد","a":"عيسى","alt":["عيسى عليه السلام"],"c":"rel","r":1},{"q":"اليوم اللي يقف فيه الحجاج على الجبل","a":"عرفة","alt":["يوم عرفة"],"c":"rel","r":1}],"غ":[{"q":"الدولة اللي عاصمتها أكرا","a":"غانا","alt":[],"c":"geo"},{"q":"أكبر القرود حجماً","a":"غوريلا","alt":["جوريلا","غوريللا","الغوريلا"],"c":"bio"},{"q":"المدينة البريطانية اللي يمر فيها خط الطول صفر","a":"غرينتش","alt":["جرينتش","جرينيتش","غرينيتش"],"c":"geo"},{"q":"سفينة تقدر تمشي تحت الماء","a":"غواصة","alt":["غواصه","الغواصة"],"c":"tech"},{"q":"المدينة الأندلسية اللي فيها قصر الحمراء","a":"غرناطة","alt":["غرناطه"],"c":"hist"},{"q":"دولة في أمريكا الوسطى عاصمتها مدينة بنفس اسمها","a":"غواتيمالا","alt":["جواتيمالا"],"c":"geo"},{"q":"الدولة اللي عاصمتها ليبرفيل","a":"الغابون","alt":["غابون","الجابون"],"c":"geo"},{"q":"أصغر دولة في البر الأفريقي","a":"غامبيا","alt":["جامبيا"],"c":"geo"},{"q":"الطائر الأسود المعروف بذكائه","a":"غراب","alt":["الغراب"],"c":"bio"},{"q":"النسيج المرن اللي في الأذن وطرف الأنف","a":"غضروف","alt":["الغضروف","غضاريف"],"c":"bio"},{"q":"تحوّل الماء إلى بخار عند ١٠٠ درجة","a":"الغليان","alt":["غليان"],"c":"phys"},{"q":"الطبقة الغازية اللي تحيط بالأرض","a":"الغلاف الجوي","alt":["غلاف جوي"],"c":"space"},{"q":"زعيم استقلال الهند بالمقاومة السلمية","a":"غاندي","alt":["المهاتما غاندي","جاندي"],"c":"hist"},{"q":"الأديب الألماني مؤلف «فاوست»","a":"غوته","alt":["جوته"],"c":"art"},{"q":"الحلا اللي يذوب في الفم من الطحين والسمن والسكر","a":"غريبة","alt":["الغريبة","غريبه"],"c":"food"},{"q":"السورة اللي تبدأ بـ «هل أتاك حديث …»","a":"الغاشية","alt":["غاشية"],"c":"rel","r":1}],"ف":[{"q":"الدولة اللي عاصمتها هانوي","a":"فيتنام","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها هلسنكي","a":"فنلندا","alt":["فنلنده"],"c":"geo"},{"q":"أسرع حيوان بري","a":"الفهد","alt":["فهد","الشيتا"],"c":"bio"},{"q":"أشهر جبل في اليابان","a":"فوجي","alt":["جبل فوجي"],"c":"geo"},{"q":"العالم اللي تنسب له نظرية المثلث القائم","a":"فيثاغورس","alt":["فيثاغورث"],"c":"phys"},{"q":"العنصر اللي في رأس عود الكبريت","a":"فوسفور","alt":["الفوسفور","الفسفور"],"c":"chem"},{"q":"أول سورة في المصحف","a":"الفاتحة","alt":["فاتحة","سورة الفاتحة"],"r":1,"c":"rel"},{"q":"الحدث اللي دخل فيه النبي ﷺ مكة سنة ٨ هـ","a":"فتح مكة","alt":["الفتح","فتح"],"r":1,"c":"rel"},{"q":"وحدة قياس الجهد الكهربائي","a":"فولت","alt":["الفولت"],"c":"phys"},{"q":"العظمة اللي هي أطول عظمة في جسم الإنسان","a":"الفخذ","alt":["فخذ","عظمة الفخذ"],"c":"bio"},{"q":"الرسام الهولندي صاحب لوحة «ليلة النجوم»","a":"فان جوخ","alt":["فان غوخ","فان كوخ","فانجوخ"],"c":"art"},{"q":"أقراص مقلية من الحمص المطحون","a":"فلافل","alt":["الفلافل","فلافل"],"c":"food"},{"q":"عاصمة النمسا","a":"فيينا","alt":[],"c":"geo"},{"q":"الجزر السعودية في البحر الأحمر التابعة لجازان","a":"فرسان","alt":["جزر فرسان"],"c":"ksa"},{"q":"الدولة اللي عاصمتها مانيلا","a":"الفلبين","alt":["فلبين"],"c":"geo"},{"q":"الدولة اللي فيها أعلى شلال في العالم «إنجل»","a":"فنزويلا","alt":[],"c":"geo"},{"q":"المعدن اللي رمزه الكيميائي Ag","a":"فضة","alt":["الفضة"],"c":"chem"},{"q":"الكائن اللي ما فيه كلوروفيل ومنه المشروم","a":"فطر","alt":["الفطر","فطريات"],"c":"bio"},{"q":"أكبر حيوان بري","a":"الفيل","alt":["فيل"],"c":"bio"},{"q":"المكان الخالي تماماً من الهواء والمادة","a":"فراغ","alt":["الفراغ"],"c":"phys"},{"q":"القمر الأكبر لكوكب المريخ","a":"فوبوس","alt":[],"c":"space"},{"q":"الحضارة اللي ينسبون لها أول أبجدية","a":"الفينيقيون","alt":["فينيقيا","الفينيقيين"],"c":"hist"},{"q":"المطربة اللبنانية الملقبة بـ «جارة القمر»","a":"فيروز","alt":[],"c":"art"},{"q":"سباق السيارات اللي اشتهر فيه لويس هاميلتون","a":"فورمولا ١","alt":["فورمولا","الفورمولا","فورمولا 1"],"c":"sport"},{"q":"الموقع اللي أسسه مارك زوكربيرغ","a":"فيسبوك","alt":["facebook","فيس بوك"],"c":"tech"},{"q":"بنت النبي ﷺ زوجة علي","a":"فاطمة","alt":["فاطمة الزهراء"],"c":"rel","r":1},{"q":"السورة اللي فيها قصة أبرهة","a":"الفيل","alt":["فيل","سورة الفيل"],"c":"rel","r":1},{"q":"من أسماء القرآن، ومعناه اللي يفرّق بين الحق والباطل","a":"الفرقان","alt":["فرقان"],"c":"rel","r":1}],"ق":[{"q":"أكبر بحيرة في العالم","a":"قزوين","alt":["بحر قزوين","بحيرة قزوين"],"c":"geo"},{"q":"الدولة اللي استضافت كأس العالم ٢٠٢٢","a":"قطر","alt":[],"c":"sport"},{"q":"العضو اللي ينبض حوالي ١٠٠ ألف مرة في اليوم","a":"القلب","alt":["قلب"],"c":"bio"},{"q":"سمكة مفترسة هيكلها كله غضاريف","a":"قرش","alt":["القرش","سمك القرش"],"c":"bio"},{"q":"جزيرة في البحر المتوسط عاصمتها نيقوسيا","a":"قبرص","alt":[],"c":"geo"},{"q":"المنطقة السعودية اللي عاصمتها بريدة","a":"القصيم","alt":["قصيم"],"c":"ksa"},{"q":"أول مسجد بُني في الإسلام","a":"قباء","alt":["مسجد قباء"],"r":1,"c":"rel"},{"q":"المدينة الأثرية الفينيقية في تونس","a":"قرطاج","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها بيشكيك","a":"قرغيزستان","alt":["قيرغيزستان"],"c":"geo"},{"q":"المحافظة السعودية الساحلية في الشرقية المشهورة بالنخيل","a":"القطيف","alt":["قطيف"],"c":"ksa"},{"q":"محافظة سعودية في الجوف على حدود الأردن","a":"القريات","alt":["قريات"],"c":"ksa"},{"q":"المادة اللي عكس الحمض وتحوّل تبّاع الشمس للأزرق","a":"قاعدة","alt":["قلوي","القلويات","قلوية"],"c":"chem"},{"q":"الكائن البحري اللي ما عنده دماغ ولا قلب","a":"قنديل البحر","alt":["قنديل"],"c":"bio"},{"q":"يتكون لما ينكسر ضوء الشمس في قطرات المطر","a":"قوس قزح","alt":["قوس المطر"],"c":"phys"},{"q":"الجرم اللي يبعد عن الأرض حوالي ٣٨٤ ألف كيلو","a":"القمر","alt":["قمر"],"c":"space"},{"q":"عاصمة الخلافة الأموية في الأندلس","a":"قرطبة","alt":["قرطبه"],"c":"hist"},{"q":"الشاعر الملقب بـ «مجنون ليلى»","a":"قيس","alt":["قيس بن الملوح"],"c":"art"},{"q":"أكلة نجدية من الخبز الرقيق المقطع في المرق","a":"قرصان","alt":["القرصان","مرقوق"],"c":"food"},{"q":"المشروب اللي ينطبخ من حبوب البن","a":"قهوة","alt":["القهوة","قهوه"],"c":"food"},{"q":"الغني اللي خسف الله به وبداره الأرض","a":"قارون","alt":[],"c":"rel","r":1},{"q":"المدينة اللي فيها المسجد الأقصى","a":"القدس","alt":["قدس","بيت المقدس"],"c":"rel","r":1}],"ك":[{"q":"عاصمة أستراليا","a":"كانبيرا","alt":["كانبرا"],"c":"geo"},{"q":"الدولة اللي عاصمتها أوتاوا","a":"كندا","alt":[],"c":"geo"},{"q":"الحيوان الأسترالي اللي ياكل أوراق الكينا وينام ٢٠ ساعة","a":"كوالا","alt":["الكوالا"],"c":"bio"},{"q":"أعلى جبل في أفريقيا","a":"كليمنجارو","alt":["كلمنجارو","كيليمانجارو","كليمانجارو"],"c":"geo"},{"q":"المستكشف اللي وصل لأمريكا سنة ١٤٩٢","a":"كولومبوس","alt":["كريستوفر كولومبوس","كولمبس"],"c":"hist"},{"q":"أكبر عضو داخلي في جسم الإنسان","a":"الكبد","alt":["كبد"],"c":"bio"},{"q":"البيت اللي رفع قواعده إبراهيم وإسماعيل","a":"الكعبة","alt":["كعبة","الكعبة المشرفة"],"r":1,"c":"rel"},{"q":"خلايا الدم اللي تنقل الأكسجين","a":"كريات الدم الحمراء","alt":["الكريات الحمراء","كريات حمراء","كريات"],"c":"bio"},{"q":"المادة الخضراء في أوراق النبات","a":"كلوروفيل","alt":["الكلوروفيل"],"c":"bio"},{"q":"حيوان أسترالي يحمل صغيره في جيب على بطنه","a":"كنغر","alt":["الكنغر","كنجارو","كانجارو"],"c":"bio"},{"q":"الأكلة الخليجية المشهورة من الرز واللحم والبهارات","a":"كبسة","alt":["الكبسة","كبسه"],"c":"food"},{"q":"عاصمة أفغانستان","a":"كابول","alt":["كابل"],"c":"geo"},{"q":"عاصمة نيبال","a":"كاتماندو","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها هافانا","a":"كوبا","alt":[],"c":"geo"},{"q":"المدينة الجنوب أفريقية اللي فيها «جبل الطاولة»","a":"كيب تاون","alt":["كيبتاون"],"c":"geo"},{"q":"العنصر الأساسي في الألماس والفحم","a":"الكربون","alt":["كربون"],"c":"chem"},{"q":"العنصر الأصفر اللي ريحته مثل البيض الخربان","a":"كبريت","alt":["الكبريت"],"c":"chem"},{"q":"العضو اللي ينقّي الدم ويصنع البول","a":"الكلية","alt":["كلية","كلى","الكلى"],"c":"bio"},{"q":"الثعبان اللي ينفخ رقبته لما يتهدد","a":"كوبرا","alt":["الكوبرا"],"c":"bio"},{"q":"الكتلة مقسومة على الحجم","a":"الكثافة","alt":["كثافة"],"c":"phys"},{"q":"لما يغطي القمر قرص الشمس","a":"كسوف","alt":["الكسوف","كسوف الشمس"],"c":"space"},{"q":"آخر ملكة لمصر البطلمية","a":"كليوباترا","alt":["كليوبترا"],"c":"hist"},{"q":"الرياضة الأكثر شعبية في الهند وباكستان","a":"الكريكيت","alt":["كريكيت","كركيت"],"c":"sport"},{"q":"الحلا اللي فيه جبن وعجينة شعيرية مقرمشة","a":"كنافة","alt":["الكنافة","كنافه"],"c":"food"},{"q":"البهار الأصفر اللي يعطي الأكل لون ذهبي","a":"كركم","alt":["الكركم"],"c":"food"},{"q":"السورة اللي فيها قصة الفتية اللي ناموا ٣٠٩ سنين","a":"الكهف","alt":["كهف","سورة الكهف"],"c":"rel","r":1},{"q":"أقصر سورة في القرآن","a":"الكوثر","alt":["كوثر","سورة الكوثر"],"c":"rel","r":1}],"ل":[{"q":"عاصمة البرتغال","a":"لشبونة","alt":["لشبونه","ليشبونة"],"c":"geo"},{"q":"عاصمة البيرو","a":"ليما","alt":[],"c":"geo"},{"q":"أشهر متحف في باريس، وفيه الموناليزا","a":"اللوفر","alt":["لوفر"],"c":"art"},{"q":"اللي كان أهل الخليج يغوصون عشانه قبل النفط","a":"اللؤلؤ","alt":["لؤلؤ","لولو","اللولو"],"c":"hist"},{"q":"حيوان من أمريكا الجنوبية يشبه الجمل ويتفل","a":"لاما","alt":["اللاما"],"c":"bio"},{"q":"الدولة اللي عاصمتها طرابلس","a":"ليبيا","alt":[],"c":"geo"},{"q":"النبي اللي أُرسل إلى قوم سدوم","a":"لوط","alt":["لوط عليه السلام"],"r":1,"c":"rel"},{"q":"السورة اللي فيها وصايا الأب الحكيم لابنه","a":"لقمان","alt":["سورة لقمان"],"r":1,"c":"rel"},{"q":"الكرات المقلية الحلوة اللي تتغطى بالدبس","a":"لقيمات","alt":["اللقيمات","لقيمة"],"c":"food"},{"q":"المدينة اللي فيها ساعة «بيغ بن»","a":"لندن","alt":[],"c":"geo"},{"q":"دولة أوروبية صغيرة بين فرنسا وألمانيا وبلجيكا وعاصمتها بنفس اسمها","a":"لوكسمبورغ","alt":["لوكسمبورج","لكسمبورغ"],"c":"geo"},{"q":"أكبر مدينة في نيجيريا","a":"لاغوس","alt":["لاجوس"],"c":"geo"},{"q":"محافظة ساحلية سعودية جنوب جدة","a":"الليث","alt":["ليث"],"c":"ksa"},{"q":"المعدن الخفيف اللي في بطاريات الجوالات","a":"الليثيوم","alt":["ليثيوم"],"c":"chem"},{"q":"أنثى الأسد","a":"لبؤة","alt":["لبوة","اللبؤة"],"c":"bio"},{"q":"طائر طويل الرجلين يبني عشه فوق الأعمدة العالية","a":"لقلق","alt":["اللقلق"],"c":"bio"},{"q":"شعاع ضوء مركّز بلون واحد","a":"ليزر","alt":["الليزر"],"c":"phys"},{"q":"الرئيس الأمريكي اللي ألغى العبودية","a":"لينكولن","alt":["ابراهام لينكولن","لنكولن"],"c":"hist"},{"q":"النادي الإنجليزي اللي يلعب فيه محمد صلاح","a":"ليفربول","alt":[],"c":"sport"},{"q":"الشبكة الاجتماعية المهنية للوظائف","a":"لينكدإن","alt":["لينكدان","لينكد إن","linkedin"],"c":"tech"},{"q":"الجبن الطري من اللبن المصفّى","a":"لبنة","alt":["اللبنة","لبنه"],"c":"food"},{"q":"الليلة اللي هي «خير من ألف شهر»","a":"ليلة القدر","alt":["القدر"],"c":"rel","r":1}],"م":[{"q":"عاصمة إسبانيا","a":"مدريد","alt":[],"c":"geo"},{"q":"الكوكب الأحمر","a":"المريخ","alt":["مريخ"],"c":"space"},{"q":"رابع أكبر جزيرة في العالم، وفيها حيوان الليمور","a":"مدغشقر","alt":[],"c":"geo"},{"q":"اللاعب الأرجنتيني اللي فاز بكأس العالم ٢٠٢٢","a":"ميسي","alt":["ليونيل ميسي","مسي"],"c":"sport"},{"q":"عاصمة سلطنة عُمان","a":"مسقط","alt":[],"c":"geo"},{"q":"الأشجار اللي تعيش في الماء المالح على السواحل","a":"مانجروف","alt":["مانغروف","المانجروف","القرم"],"c":"bio"},{"q":"الغزوة ضد الروم سنة ٨ هـ اللي استشهد فيها زيد وجعفر وابن رواحة","a":"مؤتة","alt":["موتة","مؤته"],"r":1,"c":"rel"},{"q":"السورة اللي باسم أم عيسى عليه السلام","a":"مريم","alt":["سورة مريم"],"r":1,"c":"rel"},{"q":"الموقع الأثري النبطي في العُلا، أول موقع سعودي في قائمة اليونسكو","a":"مدائن صالح","alt":["الحجر","مداين صالح"],"c":"hist"},{"q":"اللاعب الفرنسي «كيليان» اللي انتقل لريال مدريد","a":"مبابي","alt":["كيليان مبابي"],"c":"sport"},{"q":"الشاعر اللي قال «الخيل والليل والبيداء تعرفني»","a":"المتنبي","alt":["متنبي","ابو الطيب المتنبي"],"c":"art"},{"q":"الشركة اللي أسسها بيل جيتس","a":"مايكروسوفت","alt":["مايكروسفت","microsoft"],"c":"tech"},{"q":"أكبر كوكب في المجموعة الشمسية","a":"المشتري","alt":["مشتري"],"c":"space"},{"q":"أكلة رز ولحم تنطبخ في حفرة تحت الأرض","a":"مندي","alt":["المندي"],"c":"food"},{"q":"عاصمة الفلبين","a":"مانيلا","alt":[],"c":"geo"},{"q":"الدولة المكونة من جزر وعاصمتها ماليه","a":"المالديف","alt":["مالديف","جزر المالديف"],"c":"geo"},{"q":"المدينة المغربية الملقبة بـ «المدينة الحمراء»","a":"مراكش","alt":[],"c":"geo"},{"q":"ثاني أصغر دولة في العالم","a":"موناكو","alt":[],"c":"geo"},{"q":"العضو اللي يهضم الأكل بالحمض","a":"المعدة","alt":["معدة"],"c":"bio"},{"q":"الجسم اللي يجذب الحديد","a":"مغناطيس","alt":["المغناطيس","مغنطيس"],"c":"phys"},{"q":"نظام فيه مليارات النجوم مثل درب التبانة","a":"مجرة","alt":["المجرة"],"c":"space"},{"q":"الرحالة الإيطالي اللي وصل للصين وكتب عن رحلته","a":"ماركو بولو","alt":[],"c":"hist"},{"q":"الموسيقار النمساوي الطفل المعجزة","a":"موزارت","alt":["موتسارت"],"c":"art"},{"q":"الفنان اللي رسم سقف كنيسة سيستينا","a":"مايكل أنجلو","alt":["مايكل انجلو","ميكيلانجيلو"],"c":"art"},{"q":"سباق جري مسافته حوالي ٤٢ كيلو","a":"ماراثون","alt":["الماراثون","مارثون"],"c":"sport"},{"q":"الفطيرة المحشية باللحم والبيض والكراث","a":"مطبق","alt":["المطبق","مطبّق"],"c":"food"},{"q":"أكلة الرز اللي تنقلب من القدر للصينية","a":"مقلوبة","alt":["المقلوبة","مقلوبه"],"c":"food"},{"q":"النبي اللي كلّمه الله","a":"موسى","alt":["موسى عليه السلام"],"c":"rel","r":1},{"q":"المكان اللي يبيت فيه الحجاج ويجمعون الحصى","a":"مزدلفة","alt":["المزدلفة"],"c":"rel","r":1}],"ن":[{"q":"عاصمة كينيا","a":"نيروبي","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها ويلينغتون","a":"نيوزيلندا","alt":["نيوزلندا","نيوزيلاندا"],"c":"geo"},{"q":"أبعد كوكب عن الشمس","a":"نبتون","alt":["نيبتون"],"c":"space"},{"q":"العالم اللي اكتشف الجاذبية في قصة التفاحة","a":"نيوتن","alt":["اسحاق نيوتن"],"c":"phys"},{"q":"الغاز اللي يشكّل حوالي ٧٨٪ من الهواء","a":"نيتروجين","alt":["النيتروجين"],"c":"chem"},{"q":"الهضبة اللي في وسط الجزيرة العربية","a":"نجد","alt":[],"c":"ksa"},{"q":"النبي اللي بنى السفينة","a":"نوح","alt":["نوح عليه السلام"],"r":1,"c":"rel"},{"q":"السورة اللي فيها قصة سليمان مع الحشرة الصغيرة","a":"النمل","alt":["نمل","سورة النمل"],"r":1,"c":"rel"},{"q":"وحدة قياس القوة في النظام الدولي","a":"نيوتن","alt":["النيوتن"],"c":"phys"},{"q":"أكبر طائر في العالم","a":"نعامة","alt":["النعامة","نعام"],"c":"bio"},{"q":"الإمبراطور الفرنسي اللي انهزم في معركة واترلو","a":"نابليون","alt":["نابليون بونابرت"],"c":"hist"},{"q":"النادي السعودي الملقب بـ «العالمي»","a":"النصر","alt":["نصر"],"c":"sport"},{"q":"الأديب المصري الفائز بجائزة نوبل للأدب","a":"نجيب محفوظ","alt":["نجيب","محفوظ"],"c":"art"},{"q":"أول إنسان مشى على سطح القمر","a":"نيل أرمسترونغ","alt":["ارمسترونغ","أرمسترونغ","نيل ارمسترونج","نيل"],"c":"space"},{"q":"الدولة اللي عاصمتها أوسلو","a":"النرويج","alt":["نرويج"],"c":"geo"},{"q":"الدولة اللي عاصمتها كاتماندو","a":"نيبال","alt":[],"c":"geo"},{"q":"الدولة اللي عاصمتها نيامي","a":"النيجر","alt":["نيجر"],"c":"geo"},{"q":"مشروع المدينة المستقبلية السعودية في تبوك","a":"نيوم","alt":["NEOM"],"c":"ksa"},{"q":"الشلالات المشهورة على حدود كندا وأمريكا","a":"نياجرا","alt":["نياغرا","شلالات نياجرا"],"c":"geo"},{"q":"أطول نهر في أفريقيا","a":"النيل","alt":["نيل","نهر النيل"],"c":"geo"},{"q":"المعدن اللي تنصنع منه الأسلاك الكهربائية","a":"نحاس","alt":["النحاس"],"c":"chem"},{"q":"الغاز اللي يضيء في لوحات المحلات الملونة","a":"نيون","alt":["النيون"],"c":"chem"},{"q":"أكبر القطط البرية في العالم","a":"النمر","alt":["نمر"],"c":"bio"},{"q":"مركز الذرة اللي فيه البروتونات والنيوترونات","a":"النواة","alt":["نواة"],"c":"phys"},{"q":"الملكة الفرعونية المشهورة بتمثالها النصفي الملوّن","a":"نفرتيتي","alt":[],"c":"hist"},{"q":"الشاعر السوري الملقب بـ «شاعر المرأة»","a":"نزار قباني","alt":["نزار"],"c":"art"},{"q":"لاعب التنس الإسباني «ملك الملاعب الترابية»","a":"نادال","alt":["رافاييل نادال","رافائيل نادال"],"c":"sport"},{"q":"منصة الأفلام والمسلسلات الحمراء","a":"نتفليكس","alt":["netflix"],"c":"tech"},{"q":"العشبة اللي تنحط في الشاي وريحتها منعشة","a":"نعناع","alt":["النعناع","نعنع"],"c":"food"},{"q":"ملك الحبشة اللي استقبل المهاجرين المسلمين","a":"النجاشي","alt":["نجاشي"],"c":"rel","r":1}],"ه":[{"q":"عاصمة فنلندا","a":"هلسنكي","alt":[],"c":"geo"},{"q":"عاصمة كوبا","a":"هافانا","alt":[],"c":"geo"},{"q":"أخف عنصر في الكون","a":"هيدروجين","alt":["الهيدروجين"],"c":"chem"},{"q":"أكبر محيط في العالم","a":"المحيط الهادي","alt":["الهادي","الهادئ","هادي","المحيط الهادئ"],"c":"geo"},{"q":"سلسلة الجبال اللي فيها قمة إيفرست","a":"الهيمالايا","alt":["هيمالايا","هملايا","الهملايا"],"c":"geo"},{"q":"الدولة المشهورة بطواحين الهواء وزهور التوليب","a":"هولندا","alt":[],"c":"geo"},{"q":"الحدث اللي بدأ منه التاريخ الإسلامي","a":"الهجرة","alt":["هجرة","الهجرة النبوية"],"r":1,"c":"rel"},{"q":"النبي اللي أُرسل لقوم عاد","a":"هود","alt":["هود عليه السلام"],"r":1,"c":"rel"},{"q":"القائد اللي عبر جبال الألب بالفيلة","a":"هانيبال","alt":["هنيبعل"],"c":"hist"},{"q":"النادي السعودي الملقب بـ «الزعيم»","a":"الهلال","alt":["هلال"],"c":"sport"},{"q":"مؤلف رواية «البؤساء»: فيكتور …","a":"هوغو","alt":["هوجو","فيكتور هوغو","فيكتور هوجو"],"c":"art"},{"q":"المذنّب المشهور اللي يظهر كل ٧٦ سنة تقريباً","a":"هالي","alt":["مذنب هالي"],"c":"space"},{"q":"عاصمة زيمبابوي","a":"هراري","alt":[],"c":"geo"},{"q":"عاصمة فيتنام","a":"هانوي","alt":[],"c":"geo"},{"q":"أكبر مدن محافظة الأحساء","a":"الهفوف","alt":["هفوف"],"c":"ksa"},{"q":"الغاز اللي يخلّي البالونات تطير","a":"هيليوم","alt":["الهيليوم"],"c":"chem"},{"q":"الطائر اللي على راسه تاج من الريش","a":"هدهد","alt":["الهدهد"],"c":"bio"},{"q":"البروتين اللي في الدم وينقل الأكسجين","a":"هيموغلوبين","alt":["الهيموغلوبين","هيموجلوبين"],"c":"bio"},{"q":"وحدة قياس التردد","a":"هيرتز","alt":["الهيرتز","هرتز"],"c":"phys"},{"q":"التلسكوب الفضائي المشهور اللي يدور حول الأرض من ١٩٩٠","a":"هابل","alt":["تلسكوب هابل"],"c":"space"},{"q":"الخليفة العباسي المشهور في قصص ألف ليلة وليلة","a":"هارون الرشيد","alt":["هارون"],"c":"hist"},{"q":"الشاعر الإغريقي صاحب «الإلياذة»","a":"هوميروس","alt":[],"c":"art"},{"q":"الرياضة اللي تتلعب على الجليد بعصا وقرص","a":"هوكي","alt":["الهوكي","هوكي الجليد"],"c":"sport"},{"q":"الأكلة الخليجية من القمح واللحم المهروس","a":"هريس","alt":["الهريس","هريسة"],"c":"food"},{"q":"أم إسماعيل اللي سعت بين الصفا والمروة","a":"هاجر","alt":[],"c":"rel","r":1},{"q":"أخو موسى اللي كان معه في دعوته","a":"هارون","alt":["هارون عليه السلام"],"c":"rel","r":1}],"و":[{"q":"عاصمة بولندا","a":"وارسو","alt":[],"c":"geo"},{"q":"زاحف صحراوي كبير في الجزيرة العربية من فصيلة السحالي","a":"ورل","alt":["الورل"],"c":"geo"},{"q":"الحيوان اللي فوق خشمه قرن كبير","a":"وحيد القرن","alt":["الكركدن"],"c":"bio"},{"q":"أشهر ملعب كرة قدم في لندن","a":"ويمبلي","alt":[],"c":"sport"},{"q":"وحدة قياس القدرة الكهربائية","a":"واط","alt":["الواط","وات"],"c":"phys"},{"q":"اسم شبكة الإنترنت اللاسلكية","a":"واي فاي","alt":["وايفاي","wifi","واي-فاي"],"c":"tech"},{"q":"البلد اللي في بريطانيا وعاصمته كارديف","a":"ويلز","alt":[],"c":"geo"},{"q":"مدينة مغربية قريبة من حدود الجزائر","a":"وجدة","alt":["وجده"],"c":"geo"},{"q":"محافظة ساحلية سعودية في منطقة تبوك","a":"الوجه","alt":["وجه"],"c":"ksa"},{"q":"قط بري في أطراف أذنيه خصل شعر","a":"وشق","alt":["الوشق"],"c":"bio"},{"q":"الوعاء الدموي اللي يرجّع الدم للقلب","a":"وريد","alt":["الوريد","أوردة"],"c":"bio"},{"q":"قوة جذب الأرض للجسم","a":"الوزن","alt":["وزن"],"c":"phys"},{"q":"المعركة اللي انهزم فيها نابليون سنة ١٨١٥","a":"واترلو","alt":[],"c":"hist"},{"q":"أقدم بطولة تنس في العالم","a":"ويمبلدون","alt":["ويمبلدن"],"c":"sport"},{"q":"تطبيق المراسلة الأشهر اللي تملكه شركة ميتا","a":"واتساب","alt":["واتس اب","whatsapp","الواتس"],"c":"tech"},{"q":"أكلة رز ملفوف بأوراق خضراء","a":"ورق عنب","alt":["ورق العنب","دولمة"],"c":"food"},{"q":"السورة اللي تبدأ بـ «إذا وقعت …»","a":"الواقعة","alt":["واقعة","سورة الواقعة"],"c":"rel","r":1}],"ي":[{"q":"عاصمة أرمينيا","a":"يريفان","alt":[],"c":"geo"},{"q":"أطول نهر في آسيا","a":"يانغتسي","alt":["يانجتسي","يانغتسى"],"c":"geo"},{"q":"الدولة اللي عاصمتها أثينا","a":"اليونان","alt":["يونان"],"c":"geo"},{"q":"عملة اليابان","a":"الين","alt":["ين","الين الياباني"],"c":"geo"},{"q":"العنصر المشع اللي يستخدم وقود في المفاعلات النووية","a":"يورانيوم","alt":["اليورانيوم"],"c":"chem"},{"q":"المدينة الصناعية السعودية على البحر الأحمر","a":"ينبع","alt":[],"c":"ksa"},{"q":"النبي اللي ابتلعه الحوت","a":"يونس","alt":["يونس عليه السلام","ذو النون"],"r":1,"c":"rel"},{"q":"السورة اللي فيها «أحسن القصص»","a":"يوسف","alt":["سورة يوسف"],"r":1,"c":"rel"},{"q":"الاسم العربي للكلوروفيل","a":"اليخضور","alt":["يخضور"],"c":"bio"},{"q":"عاصمة الكاميرون","a":"ياوندي","alt":[],"c":"geo"},{"q":"البلد الملقب بـ «بلد الشمس المشرقة»","a":"اليابان","alt":["يابان"],"c":"geo"},{"q":"الدولة الأوروبية اللي تفككت في التسعينات إلى صربيا وكرواتيا وغيرها","a":"يوغوسلافيا","alt":["يوغسلافيا"],"c":"hist"},{"q":"المنطقة التاريخية في نجد اللي كانت فيها الرياض","a":"اليمامة","alt":["يمامة"],"c":"ksa"},{"q":"العنصر اللي يضيفونه للملح عشان الغدة الدرقية","a":"يود","alt":["اليود"],"c":"chem"},{"q":"المرحلة اللي قبل الشرنقة في حياة الفراشة","a":"يرقة","alt":["اليرقة","يرقه","دودة"],"c":"bio"},{"q":"القائد الروماني اللي اغتالوه في مجلس الشيوخ","a":"يوليوس قيصر","alt":["قيصر"],"c":"hist"},{"q":"النادي الإيطالي الملقب بـ «السيدة العجوز»","a":"يوفنتوس","alt":["اليوفي"],"c":"sport"},{"q":"العداء الجامايكي اللي يعتبر أسرع إنسان","a":"يوسين بولت","alt":["بولت","يوسين"],"c":"sport"},{"q":"أشهر موقع فيديوهات في العالم","a":"يوتيوب","alt":["youtube"],"c":"tech"},{"q":"الخضار البرتقالي الكبير اللي ينحفر في هالوين","a":"يقطين","alt":["اليقطين","قرع"],"c":"food"},{"q":"أبو النبي يوسف","a":"يعقوب","alt":["يعقوب عليه السلام"],"c":"rel","r":1},{"q":"النبي اللي ما سُمّي أحد قبله بنفس اسمه","a":"يحيى","alt":["يحيى عليه السلام"],"c":"rel","r":1}]};
  const CATS={"geo":"🌍 جغرافيا","ksa":"🇸🇦 السعودية","chem":"⚗️ كيمياء","phys":"🧲 فيزياء","space":"🔭 الفلك","bio":"🧬 أحياء","hist":"📜 تاريخ","rel":"🕌 دين","sport":"⚽ رياضة","art":"🎨 فن وأدب","tech":"💻 تقنية","food":"🍽️ أكل"};
  // memory of asked questions on this big screen (oldest first)
  const hxId=t=>{let h=5381;for(const ch of t)h=(h*33+ch.charCodeAt(0))|0;return(h>>>0).toString(36)};
  const hxSeen=()=>{try{return JSON.parse(localStorage.getItem("sahra_hx_seen")||"[]")}catch(e){return[]}};
  const hxRemember=id=>{try{const a=hxSeen().filter(x=>x!==id);a.push(id);localStorage.setItem("sahra_hx_seen",JSON.stringify(a.slice(-1500)))}catch(e){}};
  const TEAM=["الأخضر","البرتقالي","البنفسجي"],TC=["#2ee6a6","#ff9a3c","#b892ff"],TE=["🟢","🟠","🟣"];
  // the colours the teams picked in the lobby (names follow the colour)
  const applyCols=cols=>(cols||[]).forEach((c,t)=>{TEAM[t]=c.n;TC[t]=c.c;TE[t]=c.e});
  const LETTER_PTS=10,GEM_PTS=100,BOARD_PTS=200,GEMS=3,WIN_SONG=20; // the win song is ~18.6s
  // two teams: 5×5 hex board, green links right↔left, orange links top↕bottom.
  // three teams: triangle board of 28 hexes (every Arabic letter once), first team whose chain touches all three sides wins.
  const N=5,R=7;
  const geo=nt=>{
    if(nt===3){const cells=[];for(let r=0;r<R;r++)for(let c=0;c<=r;c++)cells.push([r,c]);const at=(r,c)=>r>=0&&r<R&&c>=0&&c<=r?r*(r+1)/2+c:-1;
      return{n:cells.length,rows:[...Array(R).keys()].map(r=>[...Array(r+1).keys()].map(c=>at(r,c))),center:at(4,2),
        nbrs:i=>{const[r,c]=cells[i];return[[r,c-1],[r,c+1],[r-1,c-1],[r-1,c],[r+1,c],[r+1,c+1]].map(([a,b])=>at(a,b)).filter(j=>j>=0)},
        // sides: 0 = right edge (c=r), 1 = left edge (c=0), 2 = bottom row
        sides:i=>{const[r,c]=cells[i];return[c===r,c===0,r===R-1]}}}
    return{n:N*N,rows:[...Array(N).keys()].map(r=>[...Array(N).keys()].map(c=>r*N+c)),center:Math.floor(N*N/2),
      nbrs:i=>{const r=Math.floor(i/N),c=i%N,o=r%2?[[-1,0],[-1,1],[1,0],[1,1]]:[[-1,-1],[-1,0],[1,-1],[1,0]];
        return[[0,-1],[0,1],...o].map(([dr,dc])=>[r+dr,c+dc]).filter(([a,b])=>a>=0&&a<N&&b>=0&&b<N).map(([a,b])=>a*N+b)}}};
  // does team t have a winning chain?
  function won(G,own,nt,t){const seen=new Set();
    for(let s0=0;s0<G.n;s0++){if(own[s0]!==t||seen.has(s0))continue;
      const q=[s0],hit=[false,false,false,false];seen.add(s0);
      while(q.length){const i=q.shift();
        if(nt===3)G.sides(i).forEach((x,k)=>{if(x)hit[k]=true});
        else{const r=Math.floor(i/N),c=i%N;if(c===0)hit[0]=true;if(c===N-1)hit[1]=true;if(r===0)hit[2]=true;if(r===N-1)hit[3]=true}
        G.nbrs(i).forEach(j=>{if(own[j]===t&&!seen.has(j)){seen.add(j);q.push(j)}})}
      if(nt===3?hit[0]&&hit[1]&&hit[2]:t===0?hit[0]&&hit[1]:hit[2]&&hit[3])return true}
    return false}
  // the board, drawn from plain data so phones can draw it too. pick: cells are buttons (data-i)
  // Edges show each team's path: 2 teams = green edges right/left, orange edges top/bottom; 3 teams = every team needs all three sides
  function hexBoard(d,sel,cls,pick,party){const G=geo(d.nt),tag=pick?"button":"div";
    const badges=d.nt===2?`<b class="hx-eb e-r" style="--c:${TC[0]}">${TE[0]}</b><b class="hx-eb e-l" style="--c:${TC[0]}">${TE[0]}</b><b class="hx-eb e-t" style="--c:${TC[1]}">${TE[1]}</b><b class="hx-eb e-b" style="--c:${TC[1]}">${TE[1]}</b>`:"";
    return`<div class="hx-board ${d.nt===3?"tri":""} ${cls||""}" style="--g:${TC[0]};--o:${TC[1]};--p:${TC[2]}">${badges}${G.rows.map((row,r)=>`<div class="hx-row ${d.nt===2&&r%2?"odd":""}">${row.map(i=>{const o=d.own[i],gem=(d.gems||[]).includes(i),num=/^[٠-٩0-9]+$/.test(d.lab[i]);
      return`<${tag} class="hx ${o!==null?"t"+o:""} ${i===sel?"sel":""} ${gem?"gem":""} ${num?"num":""} ${i===party?"party":""}" ${pick?`data-i="${i}" ${o!==null?"disabled":""}`:""}><span>${esc(d.lab[i])}</span>${gem?`<i>💎</i>`:""}</${tag}>`}).join("")}</div>`).join("")}</div>`}
  const goal=(nt,t)=>nt===3?"يوصل الأضلاع الثلاثة":t===0?"يربط يمين ↔ يسار":"يربط فوق ↕ تحت";
  // the win song plays in full, for a gem and for a board win
  const winMusic=()=>K.playSting("huroof_win",sfx.applause);
  // the show host's own voice (private edition): clips cut from episodes of the TV show, listed in index.json
  // {L:{letter:[[file,secs],…]}, correct:[…], wrong:[…], timeup:[…], buzz:[…], gem:[…], gemwin:[…], start:[…], boardwin:[…]}
  const HV={m:null,last:{}};
  const hvLoad=()=>{if(K.commercial||HV.m)return;HV.m={};fetch("/audio/huroof_vo/index.json").then(r=>r.ok?r.json():{}).then(j=>{HV.m=j||{}}).catch(()=>{})};
  // plays a clip of that kind (and letter), never the same one twice in a row; returns its length in seconds (0 = none)
  function hv(cat,L){if(!K.voOn()||!HV.m)return 0;const list=L?(HV.m.L||{})[L]:HV.m[cat];if(!list||!list.length)return 0;
    const key=L?"L"+L:cat,c=list.length>1?list.filter(x=>x[0]!==HV.last[key]):list,x=c[Math.floor(Math.random()*c.length)];
    HV.last[key]=x[0];K.playSting("huroof_vo/"+x[0]);return x[1]}
  return{
    id:"huroof",name:"حروف",emoji:"🔠",color:"#22a052",min:2,
    desc:"لوحة حروف مثل البرنامج المشهور: فريقين أو ثلاثة، تضغطون الجرس وتجاوبون، وتحت بعض الحروف جواهر 💎",
    tags:["٢-٨ لاعبين","فرق","معلومات"],
    rules:["تنقسمون فريقين (أو ثلاثة)، وكل لوحة تبدأ بالحرف اللي في النص","قبل كل سؤال يطلع مجاله: جغرافيا، دين، أحياء، فيزياء، رياضة…","يطلع السؤال للكل، وأول واحد يضغط الجرس 🔔 هو اللي يجاوب","إذا غلط، الفرصة للفريق الثاني، وإذا ما أحد عرف يجي سؤال ثاني بنفس الحرف","الجواب الصح ياخذ الحرف لفريقك (١٠ نقاط)، وتحت بعض الحروف جوهرة 💎 بـ ١٠٠ نقطة","اللي جاوب صح يختار الحرف الجاي","فريقين: الأخضر يربط يمين↔يسار والبرتقالي فوق↕تحت · ثلاث فرق: أول فريق يوصل أضلاع المثلث الثلاثة"],
    winTitle:"بطل الحروف!",likeTitle:"",
    timed:["hq","hans"],
    options:[K.roundsOpt([1,2,3],1,"عدد اللوحات"),{key:"teams",label:"عدد الفرق",choices:[["2","فريقين"],["3","ثلاث فرق"]],def:"2"}],
    teamN(){return K.opt("teams")==="3"&&H.order.length>=3?3:2},
    start(){hvLoad();setTimeout(()=>hv("start"),700);const pl=shuffle([...H.order]),nt=K.opt("teams")==="3"&&pl.length>=3?3:2;
      const cols=K.teamColors(nt);applyCols(cols);
      const g=H.g={pl,nt,cols,team:K.teamsFor(nt,pl),rot:0,cap:[0,0,0],usedQ:[],boards:K.opt("r"),bn:0,wins:[0,0,0],tp:[0,0,0]};
      this.newBoard()},
    newBoard(){const g=H.g,G=geo(g.nt);g.bn++;g.own=Array(G.n).fill(null);g.n=0;g.done=undefined;g.bp=[0,0,0];g.log=[];g.catN={};
      g.letters=g.nt===3?shuffle(Object.keys(BANK)):shuffle(Object.keys(BANK)).slice(0,G.n);
      g.gems=shuffle([...Array(G.n).keys()].filter(i=>i!==G.center)).slice(0,GEMS);g.gemFound=[];
      // about half the cells show a number instead of a letter; its letter is announced before the question
      const hid=shuffle([...Array(G.n).keys()].filter(i=>i!==G.center)).slice(0,Math.round((G.n-1)*.45)).sort((a,b)=>a-b);
      g.num=Array(G.n).fill(0);hid.forEach((i,k)=>g.num[i]=k+1);g.shown=Array(G.n).fill(false);
      g.picker=null;H.quip="أول حرف دايماً من نص اللوحة 🎯";this.ask(G.center)},
    members(t){const g=H.g;return g.pl.filter(id=>g.team[id]===t&&active().includes(id))},
    // who picks next: the player who just answered right, otherwise the next team in turn
    pickStep(by){const g=H.g;let p=by&&active().includes(by)?by:null;
      if(!p){for(let k=0;k<g.nt;k++){const t=(g.rot+k)%g.nt,m=this.members(t);if(m.length){p=m[g.cap[t]++%m.length];g.rot=(t+1)%g.nt;break}}}
      // no time limit on choosing a letter; the big screen has a "random letter" button if needed
      g.picker=p;H.ph="hpick";H.k++;H.end=Date.now()+6*3600e3;sfx.pop();
      H.quip=p?`${nm(p)} يختار الحرف الجاي للفريق ${TEAM[g.team[p]]}`:"اختاروا حرف"},
    // a question for this letter, not asked before in this game, from the category used least on this board (so every board mixes topics)
    // The big screen remembers questions asked in earlier games too, so a question only comes back
    // after most of that letter's questions have been asked. Among the fresh ones: the category used least on this board.
    chooseQ(L){const g=H.g,seen=hxSeen(),list=BANK[L].map(q=>({...q,id:L+":"+hxId(q.q)})),fresh=list.filter(q=>!g.usedQ.includes(q.id)),pool0=fresh.length?fresh:list;
      const never=pool0.filter(q=>!seen.includes(q.id)),rank=q=>seen.indexOf(q.id);
      const pool=never.length?never:pool0.slice().sort((x,y)=>rank(x)-rank(y)).slice(0,Math.max(1,Math.ceil(pool0.length/3)));
      const least=Math.min(...pool.map(q=>g.catN[q.c]||0)),cand=pool.filter(q=>(g.catN[q.c]||0)===least),other=cand.filter(q=>q.c!==g.lastCat),q=pick(other.length?other:cand);
      g.usedQ.push(q.id);g.catN[q.c]=(g.catN[q.c]||0)+1;g.lastCat=q.c;hxRemember(q.id);return q},
    // what a cell shows: its letter, or its number until it has been opened
    lab(i){const g=H.g;return g.num[i]&&!g.shown[i]?fmt(g.num[i]):g.letters[i]},
    labs(){return H.g.letters.map((_,i)=>this.lab(i))},
    ask(cell,retry){const g=H.g,L=g.letters[cell];
      g.wasNum=!retry&&g.num[cell]&&!g.shown[cell]?g.num[cell]:(retry?g.wasNum:0);g.shown[cell]=true;
      g.cell=cell;g.q={L,...this.chooseQ(L)};g.truths=[g.q.a,...g.q.alt].map(norm);g.winner=null;g.locked=[];g.buzzer=null;g.tried=[];
      g.qTry=retry?g.qTry+1:1;H.ph="hcat";H.k++;sfx.swoosh();
      // the host says the letter (after his opening line on the very first question)
      const first=g.n===0&&g.bn===1&&!retry;if(!retry)setTimeout(()=>hv(null,L),first?2600:250);
      setTimer(Math.max(g.wasNum&&!retry?4:3,first?5:0));
      H.quip=g.wasNum&&!retry?`رقم ${fmt(g.wasNum)}… طلع حرف «${L}»! والسؤال في:`:`حرف «${L}»… والسؤال في:`},
    openBuzz(secs){const g=H.g;g.buzzer=null;H.ph="hq";H.k++;setTimer(secs);sfx.tada();
      H.quip=g.locked.length?`الفرصة للفريق ${g.locked.length===g.nt-1?TEAM[[0,1,2].find(t=>t<g.nt&&!g.locked.includes(t))]:"الثاني"}! اضغطوا الجرس 🔔`:"اللي يعرف الجواب يضغط الجرس 🔔"},
    tick(now){const g=H.g;
      if(H.ph==="hpick"){const free=g.own.map((o,i)=>o===null?i:-1).filter(i=>i>=0);if(!free.length)return this.finish(this.leader());
        const a=g.picker&&K.act(g.picker);
        if(a&&Number.isInteger(a.cell)&&g.own[a.cell]===null)return this.ask(a.cell);
        if(g.forceSkip||!g.picker||!active().includes(g.picker)){g.forceSkip=false;this.ask(pick(free))}}
      else if(H.ph==="hq"){
        // first press of the buzzer from a team that hasn't missed yet
        const presses=g.pl.filter(id=>active().includes(id)&&!g.locked.includes(g.team[id])).map(id=>[id,K.act(id)]).filter(([,a])=>a&&a.buzz);
        if(presses.length){presses.sort((x,y)=>(x[1].t||0)-(y[1].t||0));g.buzzer=presses[0][0];H.ph="hans";H.k++;setTimer(7);sfx.coin();
          H.quip=`${nm(g.buzzer)} ضغط الجرس! يلا جاوب ⏱️`;return}
        if(now>H.end||g.forceSkip){g.forceSkip=false;this.swap()}}
      else if(H.ph==="hswap"){if(now>H.end)this.ask(g.cell,true)}
      else if(H.ph==="hcat"){if(now>H.end||g.forceSkip){g.forceSkip=false;this.openBuzz(20)}}
      else if(H.ph==="hans"){const a=K.act(g.buzzer);
        if(a&&typeof a.ans==="string"){g.tried.push({id:g.buzzer,a:a.ans});
          if(nearTruth(a.ans,g.truths)){g.winner=g.buzzer;return this.resolve()}
          return this.miss()}
        if(now>H.end||g.forceSkip||!active().includes(g.buzzer)){g.forceSkip=false;this.miss()}}
      else if(H.ph==="hres"){if(now>H.end){if(g.done!==undefined)return this.finish(g.done);this.pickStep(g.winner)}}
      else if(H.ph==="hend"&&g.forceSkip){g.forceSkip=false;H.end=0}
      else if(H.ph==="hend"){if(now>H.end){if(g.bn<g.boards)this.newBoard();else K.finishGame()}}},
    // wrong answer (or no answer): that team is out for this letter, the others get a chance
    miss(){const g=H.g;sfx.lie();setTimeout(()=>hv("wrong"),300);g.locked.push(g.team[g.buzzer]);
      const left=[...Array(g.nt).keys()].filter(t=>!g.locked.includes(t)&&this.members(t).length);
      if(left.length)this.openBuzz(12);else this.swap()},
    // nobody got it: a new question on the same letter (up to 3 per letter, then move on)
    swap(){const g=H.g;if(!g.tried.length||H.ph==="hq")hv("timeup");if(g.qTry>=3)return this.resolve();g.prevQ=g.q;H.ph="hswap";H.k++;setTimer(4);sfx.swoosh();H.quip=`ولا أحد عرفها… سؤال ثاني بحرف «${g.q.L}»!`},
    resolve(){const g=H.g;g.n++;g.gemNow=false;
      if(g.winner){const t=g.team[g.winner],gem=g.gems.includes(g.cell),pts=gem?GEM_PTS:LETTER_PTS;
        g.own[g.cell]=t;g.tp[t]+=pts;g.bp[t]+=pts;C.add(g.winner,pts);g.gained=pts;
        g.log.push({L:g.q.L,q:g.q.q,a:g.q.a,by:g.winner,t,gem});
        // gem: the host says it's a golden letter, then the whole win song; otherwise "صحيح" and applause
        if(gem){g.gemNow=true;g.gemFound.push(g.cell);const d=hv("gem");g.gemDelay=d?d+.3:0;setTimeout(winMusic,g.gemDelay*1000);confetti()}
        else{hv("correct");setTimeout(sfx.applause,500)}
        if(won(geo(g.nt),g.own,g.nt,t))g.done=t}
      else sfx.lie();
      if(g.done===undefined&&(g.own.every(o=>o!==null)||g.n>=45))g.done=this.leader();
      // a gem: stay on the answer until the whole win song has played, then back to the board
      H.ph="hres";H.k++;setTimer(g.gemNow?WIN_SONG+(g.gemDelay||0):4)},
    // board ended without a chain: the team with most points on this board takes it
    leader(){const g=H.g,b=g.bp.slice(0,g.nt),m=Math.max(...b);return b.filter(x=>x===m).length===1&&m>0?b.indexOf(m):null},
    finish(t){const g=H.g;g.done=t;
      let bd=0;if(t!==null&&t!==undefined){g.wins[t]++;g.tp[t]+=BOARD_PTS;g.pl.forEach(id=>{if(g.team[id]===t)C.add(id,BOARD_PTS)});const d=hv("boardwin");bd=d?d+.3:0;setTimeout(winMusic,bd*1000);sfx.truth();confetti()}
      H.ph="hend";H.k++;setTimer(Math.max(t!==null&&t!==undefined?WIN_SONG+bd:0,Math.min(30,12+g.log.length*1.2)))},
    doneMap(){return null},
    after(){const b=document.getElementById("hxRand");if(b)b.onclick=()=>{H.g.forceSkip=true}},
    view(v){const g=H.g;if(!g.letters)return;v.cols=g.cols;v.lab=this.labs();v.own=g.own;v.team=g.team;v.picker=g.picker;v.nt=g.nt;v.gems=g.gemFound;v.tp=g.tp;
      if(H.ph==="hcat"){v.cat=CATS[g.q.c];v.L=g.q.L;v.num=g.qTry===1?g.wasNum:0;v.cell=g.cell}
      if(H.ph==="hq"){v.q={L:g.q.L,q:g.q.q,c:CATS[g.q.c]};v.locked=g.locked;v.cell=g.cell}
      if(H.ph==="hans"){v.q={L:g.q.L,q:g.q.q};v.buzzer=g.buzzer;v.cell=g.cell}
      if(H.ph==="hres"){v.cell=g.cell;v.win=g.winner;v.gem=g.gemNow;v.ans=g.q.a}
      if(H.ph==="hswap")v.cell=g.cell;
      if(["hres","hend"].includes(H.ph))v.sc=H.sc},
    pill(){const g=H.g;return`<span class="pill">${g.boards>1?`اللوحة ${fmt(g.bn)} من ${fmt(g.boards)} · `:""}${[...Array(g.nt).keys()].map(t=>`${TE[t]} ${fmt(g.tp[t])}`).join(" · ")}</span>`},
    boardHTML(sel,small,extra,party){const g=H.g;return hexBoard({nt:g.nt,own:g.own,lab:this.labs(),gems:g.gemFound},sel,(small?"sm ":"")+(extra||""),false,party)},
    teamsHTML(){const g=H.g,turn=H.ph==="hpick"&&g.picker?g.team[g.picker]:-1;
      return`<div class="hx-teams">${[...Array(g.nt).keys()].map(t=>`<div class="hx-team t${t} ${turn===t?"turn":""}" style="background:${TC[t]}"><b>${TE[t]} ${TEAM[t]} <span class="hx-pts">${fmt(g.tp[t])}</span></b><small>${goal(g.nt,t)}</small><div>${g.pl.filter(id=>g.team[id]===t).map(id=>`<span>${C.avatar(id)}${esc(nm(id))}</span>`).join("")}</div></div>`).join("")}</div>`},
    render(){const g=H.g;
      if(H.ph==="hpick")return`<div class="spread">${K.sayHTML(H.quip)}</div><div class="hx-wrap">${this.teamsHTML()}${this.boardHTML()}</div><div class="row"><button class="btn ghost" id="hxRand">🎲 حرف عشوائي</button></div>`;
      if(H.ph==="hcat"){const c=CATS[g.q.c]||"",e=c.split(" ")[0],n=c.slice(e.length+1);
        return C.head(H.quip)+`<div class="hx-wrap">${this.boardHTML(g.cell,true)}<div class="hx-cat">${g.wasNum&&g.qTry===1?`<div class="hx-flip"><span class="hx-l hx-n">${fmt(g.wasNum)}</span><span class="hx-arrow">←</span><span class="hx-l hx-pop">${esc(g.q.L)}</span></div>`:`<span class="hx-l">${esc(g.q.L)}</span>`}<div class="hx-catcard"><i>${e}</i><b>${esc(n)}</b></div></div></div>`}
      if(H.ph==="hswap")return C.head(H.quip)+`<div class="hx-wrap">${this.boardHTML(g.cell,true)}<div class="reveal"><p class="note" style="font-size:22px">الجواب كان:</p><div class="answer">${esc(g.prevQ.a)}</div><div class="hx-bell">🔄 سؤال جديد بنفس الحرف «${esc(g.q.L)}»</div></div></div>`;
      if(H.ph==="hq"||H.ph==="hans"){const b=H.ph==="hans"?g.buzzer:null;
        return C.head(H.quip)+`<div class="hx-wrap">${this.boardHTML(g.cell,true)}<div class="ticket hx-q"><span class="hx-l">${esc(g.q.L)}</span><div class="hx-ctag">${esc(CATS[g.q.c]||"")}</div><p class="qtext">${esc(g.q.q)}</p><p class="note">الجواب يبدأ بحرف «${esc(g.q.L)}»</p>
          ${b?`<div class="hx-buzzed" style="background:${TC[g.team[b]]}">🔔 ${C.avatar(b)} <b>${esc(nm(b))}</b> يجاوب…</div>`
            :`<div class="hx-bell">🔔 اضغطوا الجرس في جوالاتكم${g.locked.length?` · <span class="hx-out">${g.locked.map(t=>TE[t]).join(" ")} خارج هالسؤال</span>`:""}</div>`}</div></div>`}
      if(H.ph==="hres"){const w=g.winner,t=w?g.team[w]:null;return`<div class="hx-wrap">${g.gemNow?this.boardHTML(-1,false,"gemparty",g.cell):this.boardHTML(g.cell)}<div class="reveal"><div class="answer">${esc(g.q.a)}</div>
        ${g.gemNow?`<div class="hx-gemwin">💎 جوهرة! +${fmt(GEM_PTS)}</div>`:""}
        <div class="who">${w?`${C.avatar(w)}<span>${esc(nm(w))} جاوب صح للفريق ${TEAM[t]}</span><span class="pts">+${fmt(g.gained)}</span>`:"<span>ما أحد عرفها 😅</span>"}</div></div></div>`}
      if(H.ph==="hend"){const t=g.done;return`${t!==null&&t!==undefined?'<div class="hx-flash" aria-hidden="true"></div>':""}<div class="hx-wrap">${this.boardHTML(-1,true,t!==null&&t!==undefined?"lights win-t"+t:"")}<div class="reveal hx-end">
        <div class="hx-win" style="${t===null?"":`background:${TC[t]}`}">${t===null?"تعادل! 🤝":`فاز الفريق ${TEAM[t]}! 🏆`}</div>
        ${t!==null?`<div class="who">${g.pl.filter(id=>g.team[id]===t).map(id=>`${C.avatar(id)}<span>${esc(nm(id))}</span>`).join("")}<span class="pts">+${fmt(BOARD_PTS)}</span></div>`:""}
        <p class="note" style="font-size:22px">النقاط: ${[...Array(g.nt).keys()].map(x=>`${TE[x]} ${fmt(g.tp[x])}`).join(" · ")}</p></div></div>
        ${g.log.length?`<div class="hx-recap"><h3>الأسئلة اللي انجاوبت صح</h3><div class="hx-rlist">${g.log.map((x,i)=>`<div class="hx-r" style="--c:${TC[x.t]};--i:${i}"><span class="hx-rl">${esc(x.L)}</span><div><p>${esc(x.q)}</p><b>${esc(x.a)}${x.gem?" 💎":""}</b></div><small>${C.avatar(x.by)}${esc(nm(x.by))}</small></div>`).join("")}</div></div>`:""}`}
      return""},
    phone(v,{root,tline}){const me=K.me(),t=v.team?v.team[me]:undefined,nt=v.nt||2;C.fresh(v);applyCols(v.cols);
      if(t===undefined){C.watch(root,v,"🍿","تفرّج هالمرة","");return}
      const pathTip=nt===2?`<div class="hx-path">${TE[0]} الأخضر يوصّل اليمين باليسار · ${TE[1]} البرتقالي يوصّل فوق بتحت</div>`:`<div class="hx-path">🔺 كل فريق لازم يوصّل أضلاع المثلث الثلاثة</div>`;
      const board=(pick)=>v.lab?`<div class="hx-phone">${hexBoard({nt,own:v.own,lab:v.lab,gems:v.gems},v.cell,"ph",pick)}${pathTip}</div>`:"";
      const head=`<div class="xo-me" style="background:${TC[t]}">أنت في الفريق ${TEAM[t]} · ${goal(nt,t)}</div>`;
      if(v.ph==="hpick"){
        if(v.picker!==me){root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"🤔",`${C.pnm(v,v.picker)} يختار حرف…`,"");root.insertAdjacentHTML("beforeend",board());return}
        root.insertAdjacentHTML("beforeend",head+`<h2 style="font-size:24px">دورك! اختار حرف أو رقم 👇</h2>${board(true)}`);
        root.querySelectorAll(".hx[data-i]").forEach(b=>b.onclick=()=>{K.sendAct({k:v.k,cell:+b.dataset.i});root.querySelectorAll(".hx[data-i]").forEach(x=>x.disabled=true);b.classList.add("sel")});return}
      if(v.ph==="hq"){const out=(v.locked||[]).includes(t);
        root.insertAdjacentHTML("beforeend",head+`<div class="pq" style="text-align:center"><span class="hx-l sm">${esc(v.q.L)}</span> <small class="hx-ctag">${esc(v.q.c||"")}</small><br>${esc(v.q.q)}</div>${tline}
          ${out?`<p class="big" style="font-size:24px">❌ فريقك جاوب غلط… الفرصة للباقين</p>`:`<button class="hx-buzz" id="hxBuzz" style="--c:${TC[t]}">🔔<span>أعرف الجواب!</span></button>`}`);
        const b=document.getElementById("hxBuzz");if(b)b.onclick=()=>{K.sendAct({k:v.k,buzz:1,t:Date.now()});b.disabled=true;b.classList.add("hit");b.querySelector("span").textContent="ضغطت! ⏳";sfx.pop()};return}
      if(v.ph==="hans"){
        if(v.buzzer===me){root.insertAdjacentHTML("beforeend",head+`<div class="pq" style="text-align:center"><span class="hx-l sm">${esc(v.q.L)}</span><br>${esc(v.q.q)}</div><h2 style="font-size:26px">🔔 أنت أول واحد! عندك ٧ ثواني ⏱️</h2>${tline}<div id="hxBox"></div>`);
          const box=document.getElementById("hxBox");C.textForm(box,{ph:"الجواب يبدأ بـ «"+v.q.L+"»",max:40,btn:"جاوب ⚡",onSend:x=>{K.sendAct({k:v.k,ans:x});box.innerHTML=`<p class="big">🤔…</p>`}});return}
        root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"🔔",`${C.pnm(v,v.buzzer)} يجاوب…`,v.team[v.buzzer]===t?"فريقك! 🤞":"إذا غلط، الفرصة لكم 👀");return}
      if(v.ph==="hcat"){root.insertAdjacentHTML("beforeend",head);C.watch(root,v,(v.cat||"").split(" ")[0]||"❓",`${v.num?`رقم ${fmt(v.num)} ← `:""}حرف «${esc(v.L)}» · ${esc((v.cat||"").split(" ").slice(1).join(" "))}`,"جهّز إصبعك على الجرس 👆");root.insertAdjacentHTML("beforeend",board());return}
      if(v.ph==="hswap"){root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"🔄","سؤال ثاني بنفس الحرف!","جهّز إصبعك على الجرس 👆");root.insertAdjacentHTML("beforeend",board());return}
      if(v.ph==="hres"){C.watch(root,v,v.win===me?(v.gem?"💎":"🎉"):v.win&&v.team[v.win]===t?"💪":"👀",v.win===me?(v.gem?"جوهرة! +١٠٠":"جاوبت صح!"):v.ans?`الجواب: ${esc(v.ans)}`:"ناظر الشاشة!");root.insertAdjacentHTML("beforeend",board());return}
      C.watch(root,v);},
  };
});

/* =====================================================================
   12) ولا كلمة: charades in teams. The actor picks a topic, gets a word on his phone only,
   and acts it out without a word; his team guesses (typed on the phone, or said out loud and
   the actor taps ✅). At least 4 players, an even number, two teams or more.
   ===================================================================== */
B.push(K=>{
  const {H,esc,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,norm,nearTruth,tl}=K;
  const C=common(K);
  const TOPIC={
    film:{e:"🎬",n:"أفلام وكرتون",w:["سندريلا","علاء الدين","الأسد الملك","سبايدرمان","توم وجيري","كابتن ماجد","البحث عن نيمو","سنو وايت","باتمان","سوبرمان","المحقق كونان","سلاحف النينجا"],lic:1},
    prov:{e:"📜",n:"أمثال",w:["الصبر مفتاح الفرج","عصفور في اليد","الوقت كالسيف","القرد في عين أمه غزال","اللي فات مات","يد واحدة ما تصفق","الجار قبل الدار","من جد وجد"]},
    anim:{e:"🐾",n:"حيوانات",w:["فيل","زرافة","قرد","أرنب","بطريق","تمساح","كنغر","ثعبان","دجاجة","حصان","قطة","أخطبوط","فراشة","جمل"]},
    job:{e:"👷",n:"مهن",w:["طبيب أسنان","طيار","طباخ","رجل إطفاء","حلاق","مصور","معلم","رسام","ميكانيكي","سباك","حارس مرمى","رائد فضاء","مذيع"]},
    food:{e:"🍔",n:"أكلات",w:["كبسة","بيتزا","آيسكريم","شاورما","فشار","بطيخ","سمبوسة","معكرونة","لقيمات","موز","فلافل","كيك"]},
    sport:{e:"⚽",n:"رياضة",w:["كرة القدم","سباحة","ملاكمة","تنس","كرة السلة","تزلج","ركوب الخيل","رفع أثقال","بولينغ","كاراتيه","رماية","جري"]},
    home:{e:"🏠",n:"أشياء في البيت",w:["مكنسة","ثلاجة","غسالة","مروحة","ريموت","مخدة","مكوى","سشوار","فرشاة أسنان","مظلة","كاميرا","ساعة منبه"]},
    act:{e:"🏃",n:"أفعال",w:["يطبخ","يسوق سيارة","ينام","يعطس","يرقص","يصلح","يتسلق","يغسل الصحون","يصوّر سيلفي","يلعب بلايستيشن","يكوي","يصيد سمك"]},
    place:{e:"🌍",n:"أماكن",w:["المطار","المستشفى","المدرسة","البحر","السينما","المطبخ","الملعب","حديقة الحيوان","المخيم","البنك","السوق","المسبح"]},
    life:{e:"📱",n:"مواقف يومية",w:["البطارية خلصت","زحمة سير","تأخرت على الدوام","نسيت المفتاح","انقطع النت","أول يوم مدرسة","الأكل حار","شفت صرصور"]}};
  const TEAM=["الأخضر","البرتقالي","البنفسجي","الأزرق"],TC=["#2ee6a6","#ff9a3c","#b892ff","#4cc2ff"],TE=["🟢","🟠","🟣","🔵"];
  const applyCols=cols=>(cols||[]).forEach((c,t)=>{TEAM[t]=c.n;TC[t]=c.c;TE[t]=c.e});
  const topics=()=>Object.keys(TOPIC).filter(k=>!(K.commercial&&TOPIC[k].lic));
  return{
    id:"mumathil",name:"ولا كلمة",emoji:"🤐",color:"#ff7fd0",min:4,
    desc:"مثّل الكلمة لفريقك بدون ولا كلمة! تختار موضوع، تطلع لك كلمة في جوالك بس، وفريقك يخمّن",
    tags:["٤-٨ لاعبين","فرق","تمثيل","ضحك"],
    rules:["لازم ٤ لاعبين أو أكثر وعددكم زوجي، وتنقسمون فرق","الممثل يختار موضوع من جواله، وتطلع له كلمة ما يشوفها غيره","يمثّلها لفريقه بدون كلام ولا أصوات 🤐","فريقه يكتب الجواب في الجوال، أو يقوله بصوت عالي والممثل يضغط ✅"],
    winTitle:"نجوم التمثيل! 🎭",likeTitle:"",
    timed:["wpick","wact"],
    options:[{key:"teams",label:"عدد الفرق",choices:[["2","فريقين"],["3","٣ فرق"],["4","٤ فرق"]],def:"2"},
      {key:"r",label:"كم مرة يمثّل كل فريق",choices:[[2,"٢"],[3,"٣"],[4,"٤"]],def:3},
      {key:"at",label:"وقت التمثيل",choices:[["60","دقيقة"],["90","دقيقة ونص"],["120","دقيقتين"]],def:"90"}],
    teamN(){const n=+K.opt("teams")||2;return Math.max(2,Math.min(n,Math.floor(H.order.length/2)||2))},
    // can't start with fewer than 4, an odd number, or a team of one
    startErr(){const n=H.order.length,t=this.teamN();if(n<4)return"ولا كلمة تحتاج ٤ لاعبين على الأقل";if(n%2)return"لازم يكون عددكم زوجي (الحين "+fmt(n)+") عشان تكون الفرق متساوية";
      if(n/t<2)return"كل فريق لازم يكون فيه لاعبين على الأقل";return""},
    start(){const nt=this.teamN(),pl=[...H.order],cols=K.teamColors(nt);applyCols(cols);
      const g=H.g={nt,pl,cols,team:K.teamsFor(nt,pl),tp:Array(nt).fill(0),turn:0,rounds:+K.opt("r")||3,cap:Array(nt).fill(0),used:[],log:[]};
      g.total=g.rounds*nt;this.nextTurn()},
    members(t){const g=H.g;return g.pl.filter(id=>g.team[id]===t&&active().includes(id))},
    nextTurn(){const g=H.g;if(g.turn>=g.total)return this.finish();
      const t=g.turn%g.nt,mem=this.members(t);if(mem.length<2){g.turn++;return this.nextTurn()}
      g.t=t;g.actor=mem[g.cap[t]++%mem.length];g.turn++;g.word=null;g.ok=null;g.guessN={};g.wrong={};g.skips=1;
      g.offer=shuffle(topics()).slice(0,6);H.ph="wpick";H.k++;setTimer(25);sfx.pop();
      H.quip=`دور ${nm(g.actor)} من الفريق ${TEAM[t]} 🎭 يختار موضوع`},
    newWord(c){const g=H.g,list=TOPIC[c].w.filter(w=>!g.used.includes(w));const w=pick(list.length?list:TOPIC[c].w);g.used.push(w);g.word=w;g.cat=c;g.truths=[norm(w)]},
    tick(now){const g=H.g;
      if(H.ph==="wpick"){const a=K.act(g.actor);let c=a&&typeof a.topic==="string"&&g.offer.includes(a.topic)?a.topic:null;
        if(!c&&(now>H.end||g.forceSkip||!active().includes(g.actor))){g.forceSkip=false;c=pick(g.offer)}
        if(c){this.newWord(c);H.ph="wact";H.k++;g.at=+K.opt("at")||90;setTimer(g.at);g.t0=now;sfx.tada();H.quip=`🤐 ممنوع الكلام! ${nm(g.actor)} يمثّل لفريقه ${TEAM[g.t]}`}}
      else if(H.ph==="wact"){
        // the actor: ✅ (they said it out loud) or skip a hard word (once per turn)
        const a=K.act(g.actor);
        if(a&&a.got&&a.n!==g.gotN){g.gotN=a.n;return this.done(g.actor)}
        if(a&&a.skip&&a.n!==g.skipN&&g.skips>0){g.skipN=a.n;g.skips--;this.newWord(g.cat);H.k++;sfx.swoosh();H.quip="كلمة ثانية! 🔄";return}
        // teammates type their guess
        for(const id of this.members(g.t)){if(id===g.actor)continue;const b=K.act(id);if(!b||typeof b.ans!=="string"||g.guessN[id]===b.n)continue;g.guessN[id]=b.n;
          if(nearTruth(b.ans,g.truths))return this.done(id);g.wrong[id]=b.n}
        if(now>H.end||g.forceSkip||!active().includes(g.actor)){g.forceSkip=false;this.done(null)}}
      else if(H.ph==="wres"){if(now>H.end){if(g.turn%g.nt===0&&g.turn<g.total){H.ph="wscore";H.k++;setTimer(6);return}this.nextTurn()}}
      else if(H.ph==="wscore"){if(now>H.end)this.nextTurn()}},
    // guessed (by who) or time is up; faster = more points
    done(by){const g=H.g,el=(Date.now()-g.t0)/1000;g.ok=by;
      if(by){const p=Math.round((100+100*Math.max(0,1-el/g.at))/10)*10;g.gain=p;g.tp[g.t]+=p;sfx.truth();confetti(60);H.quip=`${by===g.actor?"عرفوها!":nm(by)+" عرفها!"} 🎉 +${fmt(p)} للفريق ${TEAM[g.t]}`}
      else{g.gain=0;sfx.lie();H.quip="خلص الوقت! ⏰"}
      g.log.push({w:g.word,t:g.t,ok:!!by});H.ph="wres";H.k++;setTimer(6)},
    finish(){const g=H.g;g.pl.forEach(id=>H.sc[id]=g.tp[g.team[id]]||0);K.finishGame()},
    doneMap(){return null},
    view(v){const g=H.g;if(!g.pl)return;v.cols=g.cols;v.team=g.team;v.t=g.t;v.actor=g.actor;v.nt=g.nt;
      if(H.ph==="wpick")v.offer=g.offer.map(k=>[k,TOPIC[k].e,TOPIC[k].n]);
      if(H.ph==="wact"){v.word=g.word;v.cat=TOPIC[g.cat].e+" "+TOPIC[g.cat].n;v.skips=g.skips;v.wrong=g.wrong}
      if(H.ph==="wres"){v.word=g.word;v.ok=g.ok;v.gain=g.gain}},
    pill(){const g=H.g;return`<span class="pill">${[...Array(g.nt).keys()].map(t=>`${TE[t]} ${fmt(g.tp[t])}`).join(" · ")} · الدور ${fmt(Math.min(g.turn,g.total))} من ${fmt(g.total)}</span>`},
    teamsHTML(){const g=H.g;return`<div class="wl-teams">${[...Array(g.nt).keys()].map(t=>`<div class="wl-team ${t===g.t&&H.ph!=="wscore"?"on":""}" style="--c:${TC[t]}"><b>${TE[t]} ${TEAM[t]}</b><span>${fmt(g.tp[t])}</span><div>${g.pl.filter(id=>g.team[id]===t).map(id=>`<i class="${id===g.actor&&t===g.t?"act":""}">${esc(nm(id))}</i>`).join("")}</div></div>`).join("")}</div>`},
    render(){const g=H.g;
      if(H.ph==="wpick")return C.head(H.quip)+`<div class="col center"><div class="wl-actor" style="--c:${TC[g.t]}">${C.avatar(g.actor,"lg")}<b>${esc(nm(g.actor))}</b></div>
        <div class="wl-topics">${g.offer.map(k=>`<span>${TOPIC[k].e} ${TOPIC[k].n}</span>`).join("")}</div><p class="note" style="font-size:20px">📱 يختار الموضوع من جواله</p></div>${this.teamsHTML()}`;
      if(H.ph==="wact")return C.head(H.quip)+`<div class="col center"><div class="wl-zip">🤐</div><div class="wl-cat">${TOPIC[g.cat].e} ${TOPIC[g.cat].n}</div>
        <div class="wl-actor" style="--c:${TC[g.t]}">${C.avatar(g.actor,"lg")}<b>${esc(nm(g.actor))} يمثّل</b></div>
        <p class="note" style="font-size:20px">الفريق ${TEAM[g.t]}: اكتبوا الجواب في الجوال أو قولوه بصوت عالي 🗣️</p><div id="dyn" class="still">${this.dyn()}</div></div>${this.teamsHTML()}`;
      if(H.ph==="wres")return`<div class="reveal" style="padding-top:20px"><p class="note" style="font-size:24px">الكلمة كانت:</p><div class="answer">${esc(g.word)}</div>
        <div class="stamp ${g.ok?"truth":"lie"}">${g.ok?`عرفوها! +${fmt(g.gain)}`:"ما لحقوا ⏰"}</div></div>${this.teamsHTML()}`;
      if(H.ph==="wscore")return`<div class="spread"><h2 style="font-size:46px">🏁 النتيجة</h2></div>${this.teamsHTML()}`;
      return""},
    dyn(){const g=H.g;if(H.ph!=="wact")return"";const n=Object.keys(g.wrong).length;return n?`<p class="note">🤔 ${fmt(n)} تخمين غلط…</p>`:""},
    phone(v,{root,tline}){const me=K.me(),mt=v.team?v.team[me]:undefined;C.fresh(v);applyCols(v.cols);
      if(mt===undefined){C.watch(root,v,"🍿","تفرّج هالمرة","");return}
      const head=`<div class="xo-me" style="background:${TC[mt]}">أنت في الفريق ${TEAM[mt]}</div>`;
      if(v.ph==="wpick"){
        if(v.actor!==me){root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"🎭",`${C.pnm(v,v.actor)} يختار موضوع…`,mt===v.t?"جهّز نفسك تخمّن! 👀":"");return}
        root.insertAdjacentHTML("beforeend",head+`<h2 style="font-size:26px">دورك تمثّل! اختار موضوع 👇</h2><div class="wl-pick">${v.offer.map(([k,e,n])=>`<button class="pbtn" data-tp="${k}"><span style="font-size:30px">${e}</span> ${esc(n)}</button>`).join("")}</div>`);
        root.querySelectorAll("[data-tp]").forEach(b=>b.onclick=()=>{K.sendAct({k:v.k,topic:b.dataset.tp});root.querySelectorAll("[data-tp]").forEach(x=>x.disabled=true)});return}
      if(v.ph==="wact"){
        if(v.actor===me){root.insertAdjacentHTML("beforeend",head+`<p class="note center">${esc(v.cat)} · مثّلها بدون كلام 🤐</p><div class="wl-word">${esc(v.word)}</div>${tline}
          <button class="btn coral wide" id="wGot" style="font-size:24px">✅ قالوها صح!</button>${v.skips>0?`<button class="btn ghost wide" id="wSkip">🔄 صعبة؟ غيّرها (مرة وحدة)</button>`:""}`);
          const n=()=>Date.now();document.getElementById("wGot").onclick=e=>{K.sendAct({k:v.k,got:1,n:n()});e.target.disabled=true};
          const sk=document.getElementById("wSkip");if(sk)sk.onclick=()=>{K.sendAct({k:v.k,skip:1,n:n()});sk.disabled=true};return}
        if(mt===v.t){root.insertAdjacentHTML("beforeend",head+`<h2 style="font-size:24px">${C.pnm(v,v.actor)} يمثّل لكم! وش هي؟ 🤔</h2><p class="note center">${esc(v.cat)}</p>${tline}<div id="wBox"></div>`);this.form(v);return}
        root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"🤐",`${C.pnm(v,v.actor)} يمثّل لفريقه`,"ممنوع تساعدونهم 😄");return}
      if(v.ph==="wres"){root.insertAdjacentHTML("beforeend",head);C.watch(root,v,v.ok?"🎉":"⏰",v.ok?"عرفوها!":"خلص الوقت",`الكلمة: ${esc(v.word||"")}`);return}
      root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"🏁","ناظر النتيجة!","");},
    form(v,msg){const box=document.getElementById("wBox");if(!box)return;
      C.textForm(box,{ph:"اكتب تخمينك…",max:40,btn:"خمّن 🎯",onSend:t=>{const n=Date.now();C.L.wait=n;K.sendAct({k:v.k,ans:t,n});box.innerHTML=`<p class="big">🤔…</p>`}});
      if(msg)box.insertAdjacentHTML("afterbegin",`<p class="err">${msg}</p>`)},
    phoneLive(v){if(v.ph!=="wact"||v.actor===K.me())return;const L=C.L;if(L.wait&&v.wrong&&v.wrong[K.me()]===L.wait){L.wait=0;sfx.lie();this.form(v,"❌ لا… جرّب ثاني")}},
  };
});

/* =====================================================================
   13) شكلي إذا: a situation, everyone answers with a reaction picture. No points, just laughs.
   ===================================================================== */
B.push(K=>{
  const {H,esc,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti}=K;
  const C=common(K);
  const SCN=window.SHAKLI_SCENARIOS||["طلبت من المطعم وجاني الطلب غلط"],CHATS=(window.SHAKLI_CHATS||[]).filter(c=>c&&c.f&&c.m),COUNT=window.SHAKLI_MEME_COUNT||38,HAND=5;
  // cards 1..COUNT are the drawn ones; 1001+ are the owner's own pictures (not in the commercial edition)
  const EXTRA=K.commercial?[]:(window.SHAKLI_EXTRA||[]).filter(f=>/^[\w.-]+\.(gif|png|jpe?g|webp|svg)$/i.test(f));
  // 2001+ are well-known memes loaded straight from imgflip (private edition only)
  const WEB=K.commercial?[]:(window.SHAKLI_WEB||[]).filter(u=>/^https:\/\/i\.imgflip\.com\/\w+\.(jpg|png)$/.test(u));
  const PICS=EXTRA.map((_,i)=>1001+i).concat(WEB.map((_,i)=>2001+i));
  // with real pictures available the drawn cards are left out
  const ALL=PICS.length>=12?PICS:[...Array(COUNT).keys()].map(i=>i+1).concat(PICS);
  const src=id=>{id=Number(id)||1;return id>2000&&WEB[id-2001]?WEB[id-2001]:id>1000&&EXTRA[id-1001]?"/img/memes/extra/"+EXTRA[id-1001]:"/img/memes/"+Math.min(Math.max(1,id),COUNT)+".svg"};
  const img=(id,cls="")=>`<img class="sk-img ${cls}" src="${src(id)}" alt="">`;
  return{
    id:"shakli",name:"شكلي إذا",emoji:"🤳",color:"#ff7fd0",min:2,noScore:true,
    desc:"يطلع موقف، وكل واحد يرد عليه بصورة من بطاقاته… بدون نقاط، بس ضحك 😂",
    tags:["٢-٨ لاعبين","بدون نقاط","ضحك"],
    rules:["كل واحد معه ٥ صور مضحكة في جواله","يطلع موقف مثل: «شكلي إذا طلبت من المطعم وجاني الطلب غلط»","كل واحد يختار الصورة اللي توصف شكله","تطلع الصور على الشاشة وحدة وحدة… واضحكوا!"],
    winTitle:"",likeTitle:"",
    timed:["spick","sturn"],
    options:[K.roundsOpt([5,8,12],8,"عدد المواقف"),{key:"mode",label:"طريقة الاختيار",choices:[["all","الكل مع بعض"],["turns","بالدور"]],def:"all"},
      {key:"kind",label:"نوع المواقف",choices:[["mix","مواقف + رسائل"],["scn","مواقف بس"],["chat","رسائل جوال بس"]],def:"mix"}],
    // the situations for this game: plain ones, phone messages, or a mix
    pool(){const k=K.opt("kind"),s=SCN.map(x=>({t:"s",x})),c=CHATS.map(x=>({t:"c",f:x.f,m:x.m,n:x.note||""}));
      if(k==="chat"&&c.length)return shuffle(c);if(k==="scn"||!c.length)return shuffle(s);
      const a=shuffle(s),b=shuffle(c),out=[];while(a.length||b.length){if(b.length&&(out.length%2||!a.length))out.push(b.pop());else out.push(a.pop())}return out},
    start(){const pl=shuffle([...H.order]),g=H.g={pl,rounds:K.opt("r"),mode:K.opt("mode"),round:0,deck:[],hands:{},scn:this.pool(),history:[]};
      pl.forEach(id=>{g.hands[id]=[];for(let i=0;i<HAND;i++)g.hands[id].push(this.draw(g.hands[id]))});this.next()},
    // next card from a shuffled deck, never one already in the hand
    draw(hand){const g=H.g;for(let t=0;t<ALL.length*2;t++){if(!g.deck.length)g.deck=shuffle([...ALL]);const c=g.deck.pop();if(!hand.includes(c))return c}return 1},
    next(){const g=H.g;g.round++;if(g.round>g.rounds)return K.finishGame();
      g.s=g.scn[(g.round-1)%g.scn.length];g.picks={};g.shown=[];g.ti=0;
      if(g.mode==="turns"){g.turnOrder=g.pl.filter(id=>active().includes(id));this.turn()}
      else{H.ph="spick";H.k++;setTimer(30);sfx.tada();H.quip=pick(["اختاروا الصورة اللي تمثلكم 😂","وش يكون شكلك؟","فكروا… بس لا تطولون"])}},
    turn(){const g=H.g;g.cur=g.turnOrder[g.ti];if(!g.cur)return this.gallery();H.ph="sturn";H.k++;setTimer(20);sfx.pop();H.quip=""},
    tick(now){const g=H.g;
      const take=id=>{const a=K.act(id);if(!a||!Number.isInteger(a.card)||g.picks[id])return;const hand=g.hands[id]||[];if(!hand.includes(a.card))return;
        g.picks[id]=a.card;hand.splice(hand.indexOf(a.card),1,this.draw(hand));sfx.submit()};
      if(H.ph==="spick"){g.pl.forEach(take);const live=g.pl.filter(id=>active().includes(id));
        if(now>H.end||g.forceSkip||(live.length&&live.every(id=>g.picks[id]))){g.forceSkip=false;g.order=g.pl.filter(id=>g.picks[id]);g.ri=-1;this.reveal()}}
      else if(H.ph==="sshow"){if(now>H.end)this.reveal()}
      else if(H.ph==="sturn"){take(g.cur);if(g.picks[g.cur]||now>H.end||g.forceSkip||!active().includes(g.cur)){g.forceSkip=false;
          if(g.picks[g.cur]){H.ph="sturnshow";H.k++;setTimer(4);sfx.swoosh()}else{g.ti++;this.turn()}}}
      else if(H.ph==="sturnshow"){if(now>H.end){g.shown.push(g.cur);g.ti++;this.turn()}}
      else if(H.ph==="sall"){if(now>H.end)this.next()}},
    reveal(){const g=H.g;g.ri++;if(g.ri>=g.order.length)return this.gallery();g.cur=g.order[g.ri];H.ph="sshow";H.k++;setTimer(4);sfx.swoosh();sfx.pop()},
    gallery(){const g=H.g;g.history.push({s:g.s,picks:{...g.picks}});H.ph="sall";H.k++;setTimer(Object.keys(g.picks).length?7:3);if(Object.keys(g.picks).length)confetti(50)},
    doneMap(){const g=H.g;return H.ph==="spick"?g.picks:null},
    view(v){const g=H.g;if(!g.hands)return;v.s=g.s;v.hands=g.hands;v.pl=g.pl;v.cur=g.cur;v.done=Object.keys(g.picks||{});v.r=g.round;v.rr=g.rounds},
    pill(){const g=H.g;return`<span class="pill">الموقف ${fmt(Math.min(g.round,g.rounds))} من ${fmt(g.rounds)}</span>`},
    scnHTML(small){return this.itemHTML(H.g.s,small)},
    itemHTML(it,small){if(it&&it.t==="c")return`<div class="sk-chat ${small?"sm":""}"><div class="sk-chat-top">📱 رسالة من <b>${esc(it.f)}</b></div>
        <div class="sk-bubble">${esc(it.m)}<small>✓✓</small></div>${it.n?`<p class="sk-note">(${esc(it.n)})</p>`:""}<p class="sk-ask">شكلي إذا جاتني هالرسالة…</p></div>`;
      return`<div class="sk-scn ${small?"sm":""}"><span>شكلي إذا…</span><b>${esc(it&&it.t==="s"?it.x:String(it||""))}</b></div>`},
    text(it){return it&&it.t==="c"?`${it.f}: «${it.m}»`:it&&it.x||""},
    slots(showPics){const g=H.g;return`<div class="sk-slots">${g.pl.map(id=>{const c=g.picks[id],open=showPics==="all"?!!c:showPics&&showPics.includes(id);
      return`<div class="sk-slot ${c?"in":""} ${g.cur===id&&H.ph!=="sall"?"cur":""}">${open?img(c):`<div class="sk-back">${c?"✅":"🤔"}</div>`}<div class="sk-who">${C.avatar(id)}<span>${esc(nm(id))}</span></div></div>`}).join("")}</div>`},
    render(){const g=H.g;
      if(H.ph==="spick")return this.scnHTML()+`<div id="dyn" class="still">${this.dyn()}</div>`;
      if(H.ph==="sshow"||H.ph==="sturnshow"){const id=g.cur;return this.scnHTML(true)+`<div class="sk-stage"><div class="sk-big" style="--c:${K.col(id)}">${img(g.picks[id],"big")}</div><div class="sk-name">${C.avatar(id,"lg")}<span>${esc(nm(id))}</span></div></div>`}
      if(H.ph==="sturn")return this.scnHTML()+`<div class="sk-turn">${C.avatar(g.cur,"lg")}<h2>دور ${esc(nm(g.cur))} يختار… 🤔</h2></div>${this.slots(g.shown)}`;
      if(H.ph==="sall")return this.scnHTML(true)+(Object.keys(g.picks).length?this.slots("all"):`<p class="big center">ما أحد اختار شي 😴</p>`);
      return""},
    dyn(){const g=H.g;return H.ph==="spick"?this.slots(false):""},
    endHTML(){const g=H.g,h=g.history||[];const best=h.slice(-4);
      return`<div class="col center" style="gap:6px"><span style="font-size:80px;line-height:1">😂</span><div class="winner">ضحكنا للين ما قدرنا!</div><p class="note" style="font-size:20px">${fmt(h.length)} مواقف، وكل واحد بيّن شكله</p></div>
        <div class="sk-recap">${best.map(r=>`<div class="sk-rc"><p>${r.s&&r.s.t==="c"?"📱 ":"شكلي إذا… "}<b>${esc(this.text(r.s))}</b></p><div class="sk-rcp">${Object.entries(r.picks).map(([id,c])=>`<div>${img(c)}<span>${esc(nm(id))}</span></div>`).join("")}</div></div>`).join("")}</div>`},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);const hand=(v.hands||{})[me];
      if(!hand){C.watch(root,v,"🍿","تفرّج هالمرة","");return}
      const it=v.s||{},scn=it.t==="c"?`<div class="sk-chat sm"><div class="sk-chat-top">📱 رسالة من <b>${esc(it.f)}</b></div><div class="sk-bubble">${esc(it.m)}</div>${it.n?`<p class="sk-note">(${esc(it.n)})</p>`:""}</div>`
        :`<div class="pq"><small>شكلي إذا…</small><br><b>${esc(it.x||"")}</b></div>`;
      const cards=()=>{root.insertAdjacentHTML("beforeend",`${scn}${tline}<p class="note center">اختار الصورة اللي تمثّلك 👇</p><div class="sk-hand" id="skHand">${hand.map(c=>`<button class="sk-card" data-c="${Number(c)}">${img(c)}</button>`).join("")}</div>`);
        root.querySelectorAll(".sk-card").forEach(b=>b.onclick=()=>{K.sendAct({k:v.k,card:+b.dataset.c});root.querySelectorAll(".sk-card").forEach(x=>{x.disabled=true;x.classList.toggle("on",x===b)});sfx.pop();
          const n=document.createElement("p");n.className="big";n.textContent="✅ تم! ناظر الشاشة";root.appendChild(n)})};
      if(v.ph==="spick"){if((v.done||[]).includes(me)){root.insertAdjacentHTML("beforeend",scn);C.watch(root,v,"✅","اخترت! ناظر الشاشة","");return}cards();return}
      if(v.ph==="sturn"){if(v.cur===me){cards();return}root.insertAdjacentHTML("beforeend",scn);C.watch(root,v,"⏳",`دور ${(v.nm&&v.nm[v.cur])||""} يختار…`,"");return}
      root.insertAdjacentHTML("beforeend",scn);C.watch(root,v,"😂","ناظر الشاشة!","");},
  };
});
/* =====================================================================
   14) كأس العلم: a palace quiz. The players start in the courtyard, the big gate opens, and a long
   path of doors leads to the ruler's room. On each turn one player walks to his next door and knocks;
   a guard for that room's subject comes out with a question. Right = the guard nods and the player
   goes through; wrong = he shakes his head and the others get a chance to steal the step.
   Whoever reaches the ruler first (or is furthest at the end) gets «كأس العلم».
   Player characters: DiceBear «Lorelei» (CC0), bundled in /js/vendor/dicebear-lorelei.js.
   Guards and the ruler: our own drawings.
   ===================================================================== */
B.push(K=>{
  const {H,esc,fmt,pick,shuffle,setTimer,active,nm,sfx,confetti,tl}=K;
  const C=common(K);
  // room = the subject; each has its own guard
  const CAT={
    isl:{e:"📖",n:"إسلامية",room:"دار الحكمة",g:"الحكيم"},
    sci:{e:"🩺",n:"علمية",room:"المختبر",g:"الدكتور"},
    his:{e:"📜",n:"تاريخية",room:"قاعة التاريخ",g:"المؤرّخ"},
    geo:{e:"🧭",n:"جغرافيا",room:"غرفة الخرائط",g:"المستكشف"},
    gen:{e:"🎩",n:"عامة",room:"صالة الألغاز",g:"أبو الفوازير"}};
  const OPT=[{c:"#ff5a6e",s:"▲"},{c:"#3fa9ff",s:"◆"},{c:"#ffc534",s:"●"},{c:"#38d39f",s:"■"}];
  const TEAM=["الأخضر","البرتقالي"],TC=["#2ee6a6","#ff9a3c"],TE=["🟢","🟠"];
  const applyCols=cols=>(cols||[]).forEach((c,t)=>{TEAM[t]=c.n;TC[t]=c.c;TE[t]=c.e});
  const st=k=>K.playSting("ikh/"+k);
  const bank=()=>window.IKH_BANK||{};
  const SEEN="sahra_ikh_seen";
  const seen=()=>{try{return JSON.parse(localStorage.getItem(SEEN)||"[]")}catch(e){return[]}};
  const remember=id=>{try{const s=seen().filter(x=>x!==id);s.push(id);localStorage.setItem(SEEN,JSON.stringify(s.slice(-600)))}catch(e){}};
  const qid=(c,q)=>c+":"+[...q].reduce((h,ch)=>(h*33+ch.charCodeAt(0))>>>0,5381).toString(36);

  /* ---------- characters ---------- */
  const AV={};
  const avatar=seed=>{if(AV[seed])return AV[seed];let s="";try{s=window.SAHRA_AVATAR?window.SAHRA_AVATAR(seed,{backgroundColor:["transparent"]}):""}catch(e){}
    return AV[seed]=s||`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ffd9b3"/><circle cx="36" cy="46" r="6" fill="#222"/><circle cx="64" cy="46" r="6" fill="#222"/><path d="M34 64 Q50 78 66 64" stroke="#222" stroke-width="5" fill="none"/></svg>`};
  // a walking player: DiceBear head on a little tunic in the player's (or team's) colour
  const charHTML=(seed,c,label,cls="")=>`<div class="kc ${cls}" style="--c:${c}"><div class="kc-head">${avatar(seed)}</div><div class="kc-body"><i class="kc-arm a1"></i><i class="kc-arm a2"></i></div><div class="kc-legs"><i></i><i></i></div>${label?`<span class="kc-name">${esc(label)}</span>`:""}</div>`;
  // guards: one per subject, each with its own idle gesture; .yes = nods, .no = shakes his head
  const skin="#f3c89a",ink="#2b1d14";
  const face=(x=0)=>`<circle cx="${60+x}" cy="52" r="26" fill="${skin}"/><circle cx="${50+x}" cy="50" r="3.6" fill="${ink}"/><circle cx="${70+x}" cy="50" r="3.6" fill="${ink}"/><path class="gd-mouth" d="M${50+x} 63 Q${60+x} 70 ${70+x} 63" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const GUARD={
    // the wise man: white thobe, red-and-white shemagh, beard, a book; idle: strokes his beard
    isl:`<g class="gd-body"><path d="M28 168 Q30 100 60 96 Q90 100 92 168Z" fill="#f4f1ea"/><rect x="40" y="118" width="40" height="30" rx="4" fill="#3d6b4f"/><rect x="43" y="121" width="34" height="24" rx="2" fill="#e8dcc0"/><line x1="60" y1="121" x2="60" y2="145" stroke="#3d6b4f" stroke-width="2"/></g>
      <g class="gd-head">${face()}<path d="M40 60 Q42 92 60 94 Q78 92 80 60 Q72 74 60 74 Q48 74 40 60Z" fill="#9a9a9a"/><path d="M30 50 Q32 18 60 18 Q88 18 90 50 L94 92 Q84 70 80 46 Q60 38 40 46 Q36 70 26 92Z" fill="#fff"/><path d="M34 40 Q60 26 86 40" stroke="#d33" stroke-width="5" fill="none" stroke-dasharray="6 5"/><rect x="34" y="24" width="52" height="8" rx="4" fill="#222"/></g>
      <g class="gd-arm idle-beard"><path d="M86 120 Q100 104 74 90" stroke="#f4f1ea" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="72" cy="88" r="6" fill="${skin}"/></g>`,
    // the doctor: lab coat, stethoscope, round glasses; idle: pushes his glasses up
    sci:`<g class="gd-body"><path d="M26 168 Q28 100 60 96 Q92 100 94 168Z" fill="#fff"/><path d="M60 98 L50 168 M60 98 L70 168" stroke="#dde3ea" stroke-width="3"/><rect x="50" y="98" width="20" height="18" fill="#7ec8e3"/><path d="M48 104 Q44 136 60 138 Q76 136 72 104" stroke="#444" stroke-width="3" fill="none"/><circle cx="60" cy="140" r="5" fill="#888"/><rect x="72" y="120" width="12" height="4" rx="1" fill="#e44"/></g>
      <g class="gd-head">${face()}<path d="M34 46 Q36 22 60 22 Q84 22 86 46 Q74 34 60 34 Q46 34 34 46Z" fill="#5b3a24"/><circle cx="50" cy="50" r="8" fill="none" stroke="#222" stroke-width="2.5"/><circle cx="70" cy="50" r="8" fill="none" stroke="#222" stroke-width="2.5"/><line x1="58" y1="50" x2="62" y2="50" stroke="#222" stroke-width="2.5"/></g>
      <g class="gd-arm idle-glasses"><path d="M88 124 Q98 96 76 62" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="74" cy="58" r="6" fill="${skin}"/></g>`,
    // the historian: brown robe, fez, monocle, a scroll; idle: unrolls the scroll
    his:`<g class="gd-body"><path d="M28 168 Q30 100 60 96 Q90 100 92 168Z" fill="#7a4a2a"/><rect x="56" y="98" width="8" height="70" fill="#c9a227"/></g>
      <g class="gd-head">${face()}<path d="M40 70 Q60 84 80 70 Q78 80 60 82 Q42 80 40 70Z" fill="#ddd"/><path d="M42 30 L46 10 L74 10 L78 30Z" fill="#b5262c"/><line x1="60" y1="10" x2="70" y2="0" stroke="#222" stroke-width="2"/><circle cx="70" cy="50" r="8" fill="none" stroke="#c9a227" stroke-width="2.5"/></g>
      <g class="gd-arm idle-scroll"><path d="M30 124 Q20 110 34 100" stroke="#7a4a2a" stroke-width="12" fill="none" stroke-linecap="round"/><g class="gd-scroll"><rect x="14" y="78" width="40" height="30" rx="3" fill="#f3e2b3"/><line x1="20" y1="88" x2="48" y2="88" stroke="#a98a4f" stroke-width="2"/><line x1="20" y1="96" x2="44" y2="96" stroke="#a98a4f" stroke-width="2"/><rect x="10" y="74" width="6" height="38" rx="3" fill="#c9a227"/><rect x="52" y="74" width="6" height="38" rx="3" fill="#c9a227"/></g></g>`,
    // the explorer: khaki shirt, safari hat, binoculars; idle: looks through the binoculars
    geo:`<g class="gd-body"><path d="M28 168 Q30 100 60 96 Q90 100 92 168Z" fill="#c8b07a"/><rect x="38" y="120" width="14" height="14" rx="2" fill="#a8925e"/><rect x="68" y="120" width="14" height="14" rx="2" fill="#a8925e"/><path d="M44 100 L60 120 L76 100" stroke="#8a6d3b" stroke-width="3" fill="none"/></g>
      <g class="gd-head">${face()}<ellipse cx="60" cy="32" rx="40" ry="9" fill="#d8c58f"/><path d="M38 32 Q40 12 60 12 Q80 12 82 32Z" fill="#e6d6a3"/><rect x="38" y="26" width="44" height="5" fill="#8a6d3b"/></g>
      <g class="gd-arm idle-binoc"><path d="M86 126 Q100 100 80 74" stroke="#c8b07a" stroke-width="12" fill="none" stroke-linecap="round"/><g class="gd-binoc"><rect x="44" y="40" width="12" height="18" rx="4" fill="#333"/><rect x="64" y="40" width="12" height="18" rx="4" fill="#333"/><rect x="54" y="46" width="12" height="6" fill="#555"/></g></g>`,
    // the riddle master: purple suit, bow tie, top hat; idle: tips his hat
    gen:`<g class="gd-body"><path d="M26 168 Q28 100 60 96 Q92 100 94 168Z" fill="#6a3fb5"/><path d="M60 98 L46 168 M60 98 L74 168" stroke="#4c2a8a" stroke-width="3"/><path d="M50 102 L60 108 L50 114Z M70 102 L60 108 L70 114Z" fill="#ffcc33"/><circle cx="60" cy="130" r="3" fill="#ffcc33"/><circle cx="60" cy="145" r="3" fill="#ffcc33"/></g>
      <g class="gd-head">${face()}<path d="M44 66 Q50 60 56 66 M64 66 Q70 60 76 66" stroke="${ink}" stroke-width="3" fill="none"/><g class="gd-hat"><rect x="38" y="24" width="44" height="6" rx="3" fill="#222"/><rect x="44" y="0" width="32" height="26" rx="3" fill="#222"/><rect x="44" y="18" width="32" height="5" fill="#ffcc33"/></g></g>
      <g class="gd-arm idle-hat"><path d="M88 124 Q102 96 84 70" stroke="#6a3fb5" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="82" cy="66" r="6" fill="${skin}"/></g>`};
  const guardHTML=(c,mood="")=>`<div class="kg kg-${c} ${mood}"><svg viewBox="0 0 120 170" aria-hidden="true">${GUARD[c]}</svg></div>`;
  // the ruler on his throne, with the cup
  const rulerSVG=`<g class="kr"><rect x="-34" y="-6" width="68" height="62" rx="10" fill="#b8860b"/><rect x="-28" y="-30" width="56" height="34" rx="12" fill="#c0392b"/>
    <path d="M-22 60 Q-20 14 0 12 Q20 14 22 60Z" fill="#2c3e8f"/><circle cx="0" cy="0" r="15" fill="${skin}"/><path d="M-12 6 Q0 22 12 6 Q8 18 0 19 Q-8 18 -12 6Z" fill="#444"/>
    <circle cx="-5" cy="-2" r="2" fill="${ink}"/><circle cx="5" cy="-2" r="2" fill="${ink}"/><path d="M-13 -12 L-13 -26 L-6 -18 L0 -30 L6 -18 L13 -26 L13 -12Z" fill="#ffd34d" stroke="#b8860b" stroke-width="1.5"/></g>`;

  /* ---------- the palace board ---------- */
  const VW=760,VH=700,GATE={x:380,y:600},THRONE={x:380,y:70};
  // station i (1..L) along a long winding path from the gate to the throne; 0 = the courtyard
  const station=(i,L)=>{if(i<=0)return{x:GATE.x,y:GATE.y+46};if(i>L)return{x:THRONE.x,y:THRONE.y+64};const t=i/(L+1);return{x:380+250*Math.sin(t*Math.PI*3.2),y:560-t*450}};
  const approach=(i,L)=>{const a=station(i-1,L),b=station(i,L);return{x:a.x+(b.x-a.x)*.72,y:a.y+(b.y-a.y)*.72+14}};
  function pathD(L){const pts=[];for(let k=0;k<=(L+1)*6;k++){const i=k/6;const p=i<=0?{x:GATE.x,y:GATE.y}:i>L?{x:THRONE.x,y:THRONE.y+64}:(()=>{const t=i/(L+1);return{x:380+250*Math.sin(t*Math.PI*3.2),y:560-t*450}})();pts.push(p)}
    return"M"+pts.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")}
  function palaceSVG(g,{gate="open",hi=-1}={}){const L=g.L;
    const doors=g.st.map((s,k)=>{const i=k+1,p=station(i,L);return`<g class="kd ${s.gold?"gold":""} ${hi===i?"hi":""}" transform="translate(${p.x.toFixed(1)} ${(p.y-30).toFixed(1)})">
      <rect x="-24" y="-30" width="48" height="58" rx="6" fill="#e9d3a6" stroke="#b08d57" stroke-width="2"/>
      <path d="M-16 26 L-16 -6 Q-16 -22 0 -22 Q16 -22 16 -6 L16 26Z" class="kd-leaf" fill="${s.gold?"#f2c230":"#9a5a2b"}" stroke="${s.gold?"#9c6b00":"#5e3313"}" stroke-width="2.5"/>
      <circle cx="9" cy="8" r="2.6" fill="#ffd34d"/><text x="0" y="-36" text-anchor="middle" font-size="20">${CAT[s.c].e}</text><text x="0" y="6" text-anchor="middle" font-size="13" font-weight="800" fill="#fff8e1">${fmt(i)}</text></g>`}).join("");
    return`<svg class="kp-svg" viewBox="0 0 ${VW} ${VH}" aria-hidden="true">
      <defs><linearGradient id="kpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a7a"/><stop offset="1" stop-color="#e98f6d"/></linearGradient>
      <linearGradient id="kpWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dfb5"/><stop offset="1" stop-color="#e0c08a"/></linearGradient></defs>
      <rect width="${VW}" height="${VH}" rx="26" fill="url(#kpSky)"/>
      <circle cx="660" cy="70" r="26" fill="#fff3c4" opacity=".9"/>
      <!-- palace -->
      <rect x="40" y="110" width="680" height="470" rx="14" fill="url(#kpWall)" stroke="#c49a5c" stroke-width="4"/>
      ${[60,180,300,420,540,660].map(x=>`<rect x="${x}" y="96" width="40" height="20" fill="#e8cf9e" stroke="#c49a5c" stroke-width="3"/>`).join("")}
      <rect x="18" y="60" width="66" height="530" rx="10" fill="#ecd3a2" stroke="#c49a5c" stroke-width="4"/><path d="M18 64 Q51 0 84 64Z" fill="#2d8f6f"/><circle cx="51" cy="10" r="6" fill="#ffd34d"/>
      <rect x="676" y="60" width="66" height="530" rx="10" fill="#ecd3a2" stroke="#c49a5c" stroke-width="4"/><path d="M676 64 Q709 0 742 64Z" fill="#2d8f6f"/><circle cx="709" cy="10" r="6" fill="#ffd34d"/>
      ${[160,300,440].map(y=>`<path d="M36 ${y} Q51 ${y-20} 66 ${y} L66 ${y+34} L36 ${y+34}Z M694 ${y} Q709 ${y-20} 724 ${y} L724 ${y+34} L694 ${y+34}Z" fill="#5a3d8a" opacity=".55"/>`).join("")}
      <!-- the ruler's room -->
      <path d="M290 150 L290 40 Q380 -30 470 40 L470 150Z" fill="#c0392b" stroke="#8e2a20" stroke-width="4"/><path d="M300 150 L300 46 Q380 -14 460 46 L460 150Z" fill="#f6e3b8"/>
      <g transform="translate(${THRONE.x} 96)">${rulerSVG}</g>
      <g class="kp-cup" transform="translate(${THRONE.x+50} 112)"><path d="M-12 -18 L12 -18 L9 -2 Q0 6 -9 -2Z" fill="#ffd34d" stroke="#b8860b" stroke-width="2"/><rect x="-3" y="2" width="6" height="8" fill="#ffd34d"/><rect x="-9" y="10" width="18" height="5" rx="2" fill="#b8860b"/></g>
      <text x="${THRONE.x}" y="168" text-anchor="middle" font-size="17" font-weight="800" fill="#7a2a1a">غرفة الحاكم 🏆</text>
      <!-- the long path -->
      <path d="${pathD(L)}" fill="none" stroke="#b9a27c" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${pathD(L)}" fill="none" stroke="#d8c39b" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${pathD(L)}" fill="none" stroke="#c4ab80" stroke-width="2" stroke-dasharray="10 12"/>
      ${doors}
      <!-- the courtyard and the big gate -->
      <rect x="0" y="600" width="${VW}" height="100" rx="0" fill="#8fbf6a"/><rect x="0" y="600" width="${VW}" height="10" fill="#7aa858"/>
      <g transform="translate(110 650)"><ellipse cx="0" cy="18" rx="44" ry="12" fill="#6fa0c8"/><rect x="-6" y="-14" width="12" height="30" fill="#c9b48a"/><circle cx="0" cy="-18" r="10" fill="#9fd0f0"/></g>
      ${[640,700].map(x=>`<g transform="translate(${x} 640)"><rect x="-4" y="-10" width="8" height="50" fill="#8a5a2b"/><path d="M0 -12 Q-30 -30 -40 -6 M0 -12 Q30 -30 40 -6 M0 -12 Q-14 -40 -30 -36 M0 -12 Q14 -40 30 -36" stroke="#3b8f3b" stroke-width="8" fill="none" stroke-linecap="round"/></g>`).join("")}
      <g class="kp-gate ${gate}" transform="translate(${GATE.x} ${GATE.y})">
        <path d="M-80 10 L-80 -70 Q0 -140 80 -70 L80 10Z" fill="#c49a5c" stroke="#8a6a3a" stroke-width="4"/>
        <path d="M-62 10 L-62 -62 Q0 -116 62 -62 L62 10Z" fill="#2a1a0e"/>
        <g class="kp-gl"><path d="M-62 10 L-62 -62 Q-32 -96 0 -100 L0 10Z" fill="#8a4f22" stroke="#5e3313" stroke-width="3"/><circle cx="-10" cy="-30" r="4" fill="#ffd34d"/></g>
        <g class="kp-gr"><path d="M62 10 L62 -62 Q32 -96 0 -100 L0 10Z" fill="#8a4f22" stroke="#5e3313" stroke-width="3"/><circle cx="10" cy="-30" r="4" fill="#ffd34d"/></g>
        <text x="0" y="-108" text-anchor="middle" font-size="16" font-weight="800" fill="#5e3313">البوابة الكبيرة</text></g>
    </svg>`}
  const pct=p=>`left:${(p.x/VW*100).toFixed(2)}%;top:${(p.y/VH*100).toFixed(2)}%`;

  /* ---------- story lines ---------- */
  const STORY={
    gate:["وصل المتسابقون إلى ساحة القصر… وانفتحت البوابة الكبيرة! 🏰 الطريق طويل إلى غرفة الحاكم، واللي يوصل أول ياخذ كأس العلم 🏆"],
    walk:["{n} مشى في الطريق إلى باب «{r}» وطرق الباب: طق طق طق… 🚪","وقف {n} قدام باب «{r}» وطرق الباب بقوة! 🚪","تقدّم {n} بخطوات واثقة إلى «{r}»… طق طق 🚪"],
    guard:["انفتح الباب وطلع {g} وقال: «يا {n}، عندي لك فزورة… جاوبها وتدخل!»","طلع {g} من «{r}» وقال: «أهلاً يا {n}! ما تعدّي إلا إذا عرفت هذا السؤال»","فتح {g} الباب وقال: «تفضّل يا {n}… بس جاوب أول!»"],
    yes:["هزّ {g} راسه موافق 😄 ودخل {n} إلى «{r}»!","«صح عليك!» قال {g}، وفتح الباب لـ {n} 🎉"],
    no:["هزّ {g} راسه: لا لا لا 🙅‍♂️ الفرصة للبقية!","«أوه! قريبة» قال {g}… مين يعرفها من الباقين؟"],
    steal:["{s} عرفها! 👏 {g} سمح له يتقدّم خطوة","ما شاء الله! {s} جاوب صح وتقدّم في الطريق"],
    none:["ولا أحد عرفها… {g} قفل الباب وقال: «الجواب: {a}»"],
    win:["وصل {n} إلى غرفة الحاكم، وسلّمه الحاكم كأس العلم 🏆 مبروك!"]};
  const tell=(k,o)=>pick(STORY[k]).replace(/\{(\w)\}/g,(_,x)=>o[x]===undefined?"":o[x]);

  return{
    id:"ikhtabir",name:"كأس العلم",emoji:"🏆",color:"#e8a33d",min:2,
    desc:"قصر كبير وطريق طويل إلى غرفة الحاكم! كل واحد يطرق باب، ويطلع له حارس الغرفة بسؤال… اللي يوصل للحاكم أول ياخذ كأس العلم",
    tags:["٢-٨ لاعبين","معلومات","قصة","مناسبة للعائلة"],
    rules:["تبدأون في ساحة القصر، وتنفتح لكم البوابة الكبيرة","كل دور، لاعب يمشي لبابه الجاي ويطرقه، ويطلع له حارس الغرفة بسؤال","إذا جاوب صح يدخل ويتقدّم، وإذا غلط الفرصة للباقين يسرقون الخطوة","الباب الذهبي ✨ خطوتين! واللي يوصل غرفة الحاكم ياخذ كأس العلم 🏆"],
    winTitle:"بطل كأس العلم! 🏆",likeTitle:"",
    timed:["kq","ksteal"],
    options:[K.roundsOpt([10,15,20],15,"عدد الأسئلة"),{key:"mode",label:"طريقة اللعب",choices:[["solo","فردي"],["team","فريقين"]],def:"solo"},
      {key:"qt",label:"وقت السؤال",choices:[["15","١٥ ثانية"],["20","٢٠ ثانية"],["30","٣٠ ثانية"]],def:"20"},
      {key:"vib",label:"اهتزاز الجوال",choices:[["1","شغّال"],["0","مطفّي"]],def:"1"}],
    teamN(){return K.opt("mode")==="team"?2:0},
    start(){const team=K.opt("mode")==="team"&&H.order.length>=2,pl=[...H.order];
      const cols=team?K.teamColors(2):null;if(cols)applyCols(cols);
      const g=H.g={team,pl,cols,tm:team?K.teamsFor(2,pl):{},total:K.opt("r"),qn:0,used:[],turn:0,pos:{},pts:{}};
      g.movers=team?["t0","t1"]:pl.slice();g.movers.forEach(m=>{g.pos[m]=0;g.pts[m]=0});
      // a long path: about as many doors as one player could open, never shorter than 6
      g.L=Math.max(6,Math.min(12,Math.ceil(g.total/g.movers.length)+3));
      const cs=Object.keys(CAT);g.st=[...Array(g.L).keys()].map(i=>({c:cs[(i+Math.floor(Math.random()*5))%5],gold:false}));
      shuffle([...Array(g.L-1).keys()].slice(1)).slice(0,Math.max(1,Math.floor(g.L/5))).forEach(i=>g.st[i].gold=true);
      H.ph="kgate";H.k++;setTimer(5);g.story=tell("gate",{});st("open");setTimeout(()=>st("open"),600)},
    moverOf(id){const g=H.g;return g.team?"t"+g.tm[id]:id},
    label(m){const g=H.g;return m[0]==="t"&&g.team?`الفريق ${TEAM[+m[1]]}`:nm(m)},
    mColor(m){const g=H.g;return m[0]==="t"&&g.team?TC[+m[1]]:K.col(m)},
    nextTurn(){const g=H.g;if(g.qn>=g.total)return this.finish();
      const a=g.pl.filter(id=>active().includes(id));if(!a.length)return this.finish();
      let id;if(g.team){const t=g.turn%2,mem=a.filter(x=>g.tm[x]===t);id=mem.length?mem[Math.floor(g.turn/2)%mem.length]:a[0]}else id=a[g.turn%a.length];g.turn++;
      const m=this.moverOf(id),i=g.pos[m]+1,s=g.st[Math.min(i,g.L)-1];
      g.kn=id;g.km=m;g.door=i;g.cat=s.c;g.gold=s.gold;g.from=null;
      H.ph="kwalk";H.k++;setTimer(4);g.story=tell("walk",{n:nm(id),r:CAT[s.c].room});setTimeout(()=>st("knock"),2300)},
    chooseQ(c){const g=H.g,list=(bank()[c]||[]).map(q=>({q,id:qid(c,q[0])})).filter(x=>!g.used.includes(x.id)),s=seen();
      if(!list.length)return null;const late=g.qn>=Math.ceil(g.total/3),fit=list.filter(x=>late||x.q[6]<=2),pool0=fit.length?fit:list;
      const never=pool0.filter(x=>!s.includes(x.id)),pool=never.length?never:pool0.slice().sort((a,b)=>s.indexOf(a.id)-s.indexOf(b.id)).slice(0,Math.max(1,Math.ceil(pool0.length/3)));
      const x=pick(pool);g.used.push(x.id);remember(x.id);return x.q},
    guard(){const g=H.g;let c=g.cat,q=this.chooseQ(c);for(const o of shuffle(Object.keys(CAT))){if(q)break;q=this.chooseQ(o);if(q)c=o}
      if(!q)return this.finish();g.cat=c;g.qn++;
      const order=shuffle([0,1,2,3]);g.q={t:q[0],o:order.map(k=>q[1+k]),cor:order.indexOf(0),f:q[5]};
      g.ans=null;g.st2={};g.stAt={};g.lock=[];g.thief=null;
      H.ph="kguard";H.k++;setTimer(4);st("open");g.story=tell("guard",{n:nm(g.kn),g:CAT[c].g,r:CAT[c].room})},
    ask(){const g=H.g;H.ph="kq";H.k++;g.qt=+K.opt("qt")||20;setTimer(g.qt);g.t0=Date.now();g.lastTick=99;sfx.tada();
      g.story=`سؤال ${CAT[g.cat].g} لـ ${nm(g.kn)}${g.team?` (الفريق ${TEAM[g.tm[g.kn]]})`:""}${g.gold?" · ✨ باب ذهبي: خطوتين!":""}`},
    // move a mover forward and give points: 100 a step, up to 50 more for speed
    advance(m,speed){const g=H.g,steps=g.gold?2:1,old=g.pos[m];g.from={m,p:old};g.pos[m]=Math.min(g.L+1,old+steps);
      const p=steps*100+Math.round(50*speed/10)*10;g.pts[m]+=p;
      (g.team?g.pl.filter(id=>this.moverOf(id)===m):[m]).forEach(id=>C.add(id,p));return p},
    judge(){const g=H.g;const a=g.ans;
      if(a&&a.a===g.q.cor){const sp=Math.max(0,1-(a.t-g.t0)/(g.qt*1000));g.gain=this.advance(g.km,sp);g.res="yes";
        st("ding");setTimeout(sfx.applause,450);confetti(g.gold?140:60);g.story=tell("yes",{g:CAT[g.cat].g,n:nm(g.kn),r:CAT[g.cat].room})+` ${g.q.f}`;
        H.ph="kres";H.k++;setTimer(7);return}
      g.res="no";g.wrongA=a?a.a:null;st(a?"boop":"timeup");
      const thieves=g.pl.filter(id=>active().includes(id)&&this.moverOf(id)!==g.km);
      if(!thieves.length){g.story=tell("none",{g:CAT[g.cat].g,a:g.q.o[g.q.cor]})+` ${g.q.f}`;H.ph="kres";H.k++;setTimer(7);return}
      g.story=tell("no",{g:CAT[g.cat].g});H.ph="ksteal";H.k++;setTimer(10);g.t1=Date.now();g.lastTick=99},
    tick(now){const g=H.g;
      if(H.ph==="kgate"){if(now>H.end)this.nextTurn()}
      else if(H.ph==="kwalk"){if(now>H.end)this.guard()}
      else if(H.ph==="kguard"){if(now>H.end)this.ask()}
      else if(H.ph==="kq"){const a=K.act(g.kn);
        if(!g.ans&&a&&Number.isInteger(a.a)&&a.a>=0&&a.a<4){g.ans={a:a.a,t:Math.min(now,Math.max(g.t0,+a.t||now))};sfx.pop();return this.judge()}
        
        if(now>H.end||g.forceSkip||!active().includes(g.kn)){g.forceSkip=false;this.judge()}}
      else if(H.ph==="ksteal"){
        // the first right answer from the others steals the step; a wrong answer is out
        const cand=g.pl.filter(id=>active().includes(id)&&this.moverOf(id)!==g.km&&!g.lock.includes(id));
        cand.map(id=>[id,K.act(id)]).filter(([,a])=>a&&Number.isInteger(a.a)&&a.a>=0&&a.a<4).sort((x,y)=>(+x[1].t||0)-(+y[1].t||0)).forEach(([id,a])=>{
          if(g.thief||g.lock.includes(id))return;
          if(a.a===g.q.cor){g.thief=id}else{g.lock.push(id);if(g.team)g.pl.forEach(x=>{if(this.moverOf(x)===this.moverOf(id)&&!g.lock.includes(x))g.lock.push(x)})}});
        if(g.thief){const sp=Math.max(0,1-(now-g.t1)/10000);g.gain=this.advance(this.moverOf(g.thief),sp);g.res="steal";st("ding");setTimeout(sfx.applause,400);
          g.story=tell("steal",{s:nm(g.thief),g:CAT[g.cat].g})+` ${g.q.f}`;H.ph="kres";H.k++;setTimer(7);return}
        
        const still=g.pl.filter(id=>active().includes(id)&&this.moverOf(id)!==g.km&&!g.lock.includes(id));
        if(now>H.end||g.forceSkip||!still.length){g.forceSkip=false;g.res="none";g.story=tell("none",{g:CAT[g.cat].g,a:g.q.o[g.q.cor]})+` ${g.q.f}`;H.ph="kres";H.k++;setTimer(6)}}
      else if(H.ph==="kres"){if(now>H.end){const w=g.movers.find(m=>g.pos[m]>g.L);if(w)return this.finish(w);this.nextTurn()}}
      else if(H.ph==="kwin"){if(now>H.end)K.finishGame()}},
    // the winner (first to the ruler, or furthest; points break ties) walks up and gets the cup
    finish(w){const g=H.g;w=w||g.movers.slice().sort((a,b)=>(g.pos[b]-g.pos[a])||(g.pts[b]-g.pts[a]))[0];
      g.winner=w;g.from={m:w,p:g.pos[w]};g.pos[w]=g.L+1;
      if(g.team)g.pl.forEach(id=>{H.sc[id]=g.pts[this.moverOf(id)]+(this.moverOf(id)===w?1:0)});
      else if(w&&(H.sc[w]||0)<=Math.max(0,...g.pl.filter(x=>x!==w).map(x=>H.sc[x]||0)))H.sc[w]=Math.max(0,...g.pl.filter(x=>x!==w).map(x=>H.sc[x]||0))+10;
      H.ph="kwin";H.k++;setTimer(8);st("win");setTimeout(()=>confetti(220),1800);g.story=tell("win",{n:w?this.label(w):""});H.quip=g.story},
    doneMap(){const g=H.g;if(H.ph==="kq"&&g.kn)return{[g.kn]:g.ans?1:0};return null},
    view(v){const g=H.g;if(!g.st)return;v.cols=g.cols;v.teamOn=g.team;v.tm=g.tm;v.vib=K.opt("vib")!=="0";v.kn=g.kn;v.km=g.km;v.story=g.story;
      v.pos=g.pos;v.L=g.L;v.myM=null;
      if(["kq","ksteal"].includes(H.ph)){v.gold=g.gold;v.wrongA=g.wrongA;v.lock=g.lock}
      if(H.ph==="kres"){v.res=g.res;v.cor=g.q.cor;v.corT=g.q.o[g.q.cor];v.thief=g.thief;v.gain=g.gain;v.ansA=g.ans?g.ans.a:null}},
    pill(){const g=H.g;return`<span class="pill">السؤال ${fmt(Math.max(1,g.qn))} من ${fmt(g.total)}</span>`},
    // where each mover stands this phase (the knocker waits in front of his door)
    spot(m){const g=H.g,L=g.L;if(["kwalk","kguard","kq","ksteal"].includes(H.ph)&&m===g.km)return approach(Math.min(g.door,L),L);return station(g.pos[m],L)},
    tokens(){const g=H.g;const groups={};g.movers.forEach(m=>{const k=["kwalk","kguard","kq","ksteal"].includes(H.ph)&&m===g.km?"k":g.pos[m];(groups[k]=groups[k]||[]).push(m)});
      return g.movers.map(m=>{const k=["kwalk","kguard","kq","ksteal"].includes(H.ph)&&m===g.km?"k":g.pos[m],grp=groups[k],i=grp.indexOf(m),n=grp.length;
        const p=this.spot(m),dx=(i-(n-1)/2)*30,dy=(i%2)*10,q={x:p.x+dx,y:p.y+dy};
        const seed=g.team?TEAM[+m[1]]+"team":nm(m)+m.slice(-3),walk=H.ph==="kwalk"&&m===g.km||H.ph==="kres"&&g.from&&g.from.m===m||H.ph==="kwin"&&m===g.winner;
        return`<div class="kt ${walk?"walk":""} ${m===g.km&&H.ph!=="kres"?"me":""}" data-m="${esc(m)}" data-x="${q.x.toFixed(1)}" data-y="${q.y.toFixed(1)}" style="${pct(q)}">${charHTML(seed,this.mColor(m),this.label(m))}</div>`}).join("")},
    board(){const g=H.g;const hi=["kwalk","kguard","kq","ksteal","kres"].includes(H.ph)?Math.min(g.door,g.L):-1;
      return`<div class="kp"><div class="kp-in">${palaceSVG(g,{gate:H.ph==="kgate"?"opening":"open",hi})}<div class="kp-tok">${this.tokens()}</div></div></div>`},
    side(inner){const g=H.g;return`<div class="ks"><div class="ks-story">${esc(g.story||"")}</div>${inner||""}</div>`},
    render(){const g=H.g;
      const wrap=inner=>`<div class="kwrap">${this.board()}${this.side(inner)}</div>`;
      const opts=(cls)=>`<div class="ik-opts kq-opts">${g.q.o.map((o,i)=>`<div class="ik-opt ${cls?cls(i):""}" style="--o:${OPT[i].c};--i:${i}"><span class="ik-shape">${OPT[i].s}</span><b>${esc(o)}</b></div>`).join("")}</div>`;
      const ranking=()=>`<div class="ks-rank">${g.movers.slice().sort((a,b)=>(g.pos[b]-g.pos[a])||(g.pts[b]-g.pts[a])).map(m=>`<div style="--c:${this.mColor(m)}"><b>${esc(this.label(m))}</b><span>🚪 ${fmt(Math.min(g.pos[m],g.L))}/${fmt(g.L)}</span></div>`).join("")}</div>`;
      if(H.ph==="kgate")return wrap(`<div class="ks-big">🏰</div>${ranking()}`);
      if(H.ph==="kwalk")return wrap(`<div class="ks-big kn-knock">🚪</div><p class="ks-room">${CAT[g.cat].e} ${CAT[g.cat].room}${g.gold?" · ✨ ذهبي":""}</p>${ranking()}`);
      if(H.ph==="kguard")return wrap(`${guardHTML(g.cat,"enter")}<p class="ks-room">${CAT[g.cat].g} · ${CAT[g.cat].n}</p>`);
      if(H.ph==="kq"||H.ph==="ksteal"){const steal=H.ph==="ksteal";
        return wrap(`<div class="ks-qrow">${guardHTML(g.cat,"idle")}<div id="dyn" class="still">${this.dyn()}</div></div><p class="ik-qt kq-qt">${esc(g.q.t)}</p>${opts(i=>steal&&i===g.wrongA?"bad":"")}
          ${steal?`<p class="ks-steal">🔔 الفرصة للبقية! أول واحد يجاوب صح يسرق الخطوة</p>`:""}`)}
      if(H.ph==="kres"){const yes=g.res==="yes"||g.res==="steal";
        return wrap(`<div class="ks-qrow">${guardHTML(g.cat,yes?"yes":"no")}<div class="ks-gain">${yes?`<b>+${fmt(g.gain)}</b><span>${g.gold?"✨ خطوتين":"خطوة"} لـ ${esc(g.res==="steal"?nm(g.thief):this.label(g.km))}</span>`:"<b>🙅‍♂️</b>"}</div></div>
          <p class="ik-qt kq-qt">${esc(g.q.t)}</p>${opts(i=>i===g.q.cor?(g.wrongA!==null&&g.wrongA!==undefined?"cor late":"cor"):i===g.wrongA?"bad":"dim")}`)}
      if(H.ph==="kwin")return wrap(`<div class="ks-big kn-cup">🏆</div>${ranking()}`);
      return""},
    dyn(){const g=H.g;if(H.ph!=="kq"&&H.ph!=="ksteal")return"";const t=tl();return`<div class="ik-timer ${t<=5?"hot":""}"><b>${fmt(t)}</b><small>ثانية</small></div>`},
    // characters walk from where they stood to where they stand now
    after(){const g=H.g;if(!g||!g.st)return;const box=document.querySelector(".kp-tok");if(!box)return;this._xy=this._xy||{};
      box.querySelectorAll(".kt").forEach(el=>{const m=el.dataset.m,x=+el.dataset.x,y=+el.dataset.y,o=this._xy[m];this._xy[m]={x,y};
        if(o&&(Math.abs(o.x-x)>1||Math.abs(o.y-y)>1)&&el.animate){el.classList.add("walk");
          const a=el.animate([{left:(o.x/VW*100)+"%",top:(o.y/VH*100)+"%"},{left:(x/VW*100)+"%",top:(y/VH*100)+"%"}],{duration:Math.min(2600,600+Math.hypot(o.x-x,o.y-y)*6),easing:"ease-in-out"});
          a.onfinish=()=>el.classList.remove("walk");if(Math.hypot(o.x-x,o.y-y)>20)st("steps")}})},
    phone(v,{root,tline}){const me=K.me();C.fresh(v);applyCols(v.cols);if(!v.pos){C.watch(root,v);return}
      const myM=v.teamOn&&v.tm?"t"+v.tm[me]:me,myPos=v.pos[myM]||0;
      const head=`<div class="xo-me" style="background:${v.teamOn&&v.tm?TC[v.tm[me]]:K.col(me)}">${v.teamOn&&v.tm?`الفريق ${TEAM[v.tm[me]]} · `:""}🚪 ${fmt(Math.min(myPos,v.L))} من ${fmt(v.L)}</div>`;
      const vib=p=>{if(v.vib)try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
      const story=v.story?`<p class="ks-pstory">${esc(v.story)}</p>`:"";
      const pad=(dis)=>`<div class="ik-pad">${OPT.map((o,i)=>`<button class="ik-pb" data-a="${i}" style="--o:${o.c}" ${dis===i?"disabled":""}><span>${o.s}</span></button>`).join("")}</div>`;
      const wire=()=>root.querySelectorAll(".ik-pb").forEach(b=>b.onclick=()=>{const a=+b.dataset.a;K.sendAct({k:v.k,a,t:Date.now()});vib(15);
        root.querySelector(".ik-pad").outerHTML=`<div class="ik-chosen" style="--o:${OPT[a].c}"><span>${OPT[a].s}</span><p>تم! ننتظر الحارس…</p></div>`});
      if(v.ph==="kq"){
        if(v.kn===me){root.insertAdjacentHTML("beforeend",head+`${v.gold?`<p class="ik-goldtag">✨ باب ذهبي: خطوتين!</p>`:""}<h2 style="font-size:24px">أنت طرقت الباب! جاوب الحارس 👇</h2><p class="note center">ناظر السؤال على الشاشة واختار اللون</p>${tline}${pad()}`);wire();return}
        root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"🚪",`دور ${C.pnm(v,v.kn)}…`,"جهّز نفسك! إذا غلط، الفرصة لك تسرق الخطوة 👀");return}
      if(v.ph==="ksteal"){const mine=myM===v.km||(v.lock||[]).includes(me);
        if(mine){root.insertAdjacentHTML("beforeend",head);C.watch(root,v,"⏳",myM===v.km?"الفرصة للبقية…":"خلاص، جاوبت","");return}
        root.insertAdjacentHTML("beforeend",head+`<h2 style="font-size:24px">🔔 الفرصة لك! أسرع واحد يجاوب صح</h2>${tline}${pad(v.wrongA)}`);wire();return}
      if(v.ph==="kres"){const mineTurn=v.kn===me,stole=v.thief===me,won=(mineTurn&&v.res==="yes")||stole;
        if(won){root.insertAdjacentHTML("beforeend",`<div class="ik-res good"><div class="ik-mark">✓</div><p class="big">${stole?"سرقت الخطوة!":"دخلت الغرفة!"}</p><div class="ik-count">+${fmt(v.gain||0)}</div></div>`);vib(40)}
        else if(mineTurn){root.insertAdjacentHTML("beforeend",`<div class="ik-res ${v.ansA===null||v.ansA===undefined?"none":"bad"}"><div class="ik-mark ${v.ansA===null||v.ansA===undefined?"ik-hour":""}">${v.ansA===null||v.ansA===undefined?"⏳":"✗"}</div><p class="big">${v.ansA===null||v.ansA===undefined?"خلص الوقت!":"ولا يهمك، الجاية لك!"}</p><p class="note center">الجواب: ${esc(v.corT||"")}</p></div>`);vib([40,70,40])}
        else{root.insertAdjacentHTML("beforeend",head+story);C.watch(root,v,v.res==="none"?"🙅‍♂️":"👏","ناظر القصر!",`الجواب: ${esc(v.corT||"")}`)}
        return}
      root.insertAdjacentHTML("beforeend",head+story);C.watch(root,v,v.ph==="kwin"?"🏆":v.ph==="kguard"?"💂":"🏰","ناظر القصر!","");},
  };
});
})();
