/* AI CLASSROOM – app.js */
const SUPABASE_URL = 'https://nbpcnzlwtkscribjvwml.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MyPIS5R71FLH_R0KazZBOg_nvkDsY8w';
const $ = (id) => document.getElementById(id);
const DELIMS = [{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}];

/* ---------- Điều hướng ---------- */
function go(v){
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('on'));
  $(v).classList.add('on'); window.scrollTo(0,0);
  if(v==='forum') initForum();
  if(v==='game' && !$('d1').children.length) newGame();
}

/* ---------- KaTeX: dùng textContent (an toàn) rồi auto-render ---------- */
function show(el, text){
  el.textContent = text;
  const run=()=>{ try{ renderMathInElement(el,{delimiters:DELIMS,throwOnError:false}); }catch(e){} };
  window.renderMathInElement ? run() : setTimeout(run,600);
}
const prev = () => show($('prev'), $('prob').value);
$('prob').addEventListener('input', prev);

/* Thanh ký hiệu (rút gọn từ bảng 4.6) – String.raw giữ nguyên dấu \ */
const SYMS = [
  [String.raw`\frac{a}{b}`,'a/b'],[String.raw`\sqrt{x}`,'√'],['x^{2}','x²'],['x_{i}','xᵢ'],[String.raw`\sum_{i=1}^{n}`,'Σ'],[String.raw`\int_a^b`,'∫'],
  [String.raw`\le`,'≤'],[String.raw`\ge`,'≥'],[String.raw`\ne`,'≠'],[String.raw`\approx`,'≈'],[String.raw`\pm`,'±'],
  [String.raw`P(A\mid B)`,'P(A|B)'],[String.raw`\cap`,'∩'],[String.raw`\cup`,'∪'],[String.raw`\overline{A}`,'Ā'],
  [String.raw`E(X)`,'E(X)'],[String.raw`\operatorname{Var}(X)`,'Var'],[String.raw`\sigma^2`,'σ²'],[String.raw`\bar{x}`,'x̄'],[String.raw`\hat{p}`,'p̂'],
  [String.raw`\alpha`,'α'],[String.raw`\beta`,'β'],[String.raw`\lambda`,'λ'],[String.raw`\mu`,'μ'],[String.raw`\chi^2`,'χ²'],[String.raw`\Phi(z)`,'Φ(z)'],[String.raw`H_0`,'H₀'],[String.raw`H_1`,'H₁']
];
function buildSyms(box, ta, after){
  SYMS.forEach(([tex,label])=>{
    const b=document.createElement('button'); b.textContent=label; b.title=tex;
    b.onclick=()=>{ insertAt(ta,'\\('+tex+'\\)'); after&&after(); };
    box.appendChild(b);
  });
}
function insertAt(ta, s){
  const a=ta.selectionStart??ta.value.length, b=ta.selectionEnd??a;
  ta.value=ta.value.slice(0,a)+s+ta.value.slice(b);
  ta.focus(); ta.selectionStart=ta.selectionEnd=a+s.length;
  ta.dispatchEvent(new Event('input'));
}
buildSyms($('sym'),$('prob'),prev); buildSyms($('sym2'),$('fbody'));

/* ---------- Dấu "=": chỉ nhập phép tính xem kết quả ---------- */
function calc(){
  let s=$('prob').value.trim(); if(!s) return;
  s=s.replace(/\\\(|\\\)|\$/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/√/g,'sqrt').replace(/π/g,'pi')
     .replace(/(\d),(\d)/g,'$1.$2').replace(/=\s*$/,'')
     .replace(/\bC\((\d+),\s*(\d+)\)/g,'combinations($1,$2)').replace(/\bA\((\d+),\s*(\d+)\)/g,'permutations($1,$2)');
  try{
    const r=math.evaluate(s);
    const txt=math.format(r,{precision:12});
    showRes(`${$('prob').value.trim()} = ${txt}`, true);
  }catch(e){ showRes('Chưa tính được phép tính này, bạn kiểm tra lại cú pháp giúp mình nhé (vd: 2*(3+4)^2, sqrt(16), 5!).', true); }
}
function showRes(t, noSpeak){
  const r=$('res'); r.style.display='block'; r.dataset.raw=t; show(r,t); $('ttsBar').style.display='flex';
}

/* ---------- Micro: KHÔNG tự ngắt, chỉ dừng khi người dùng bấm ---------- */
const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null, wantMic=false;
const VI_MATH = [
  [/xích[\s-]?ma bình phương|xi ma bình phương|sigma bình phương/gi, String.raw`\sigma^2`],
  [/xích[\s-]?ma|xi ma|sigma/gi, String.raw`\sigma`],[/anpha|an-pha|alpha/gi, String.raw`\alpha`],[/bê ta|beta/gi, String.raw`\beta`],
  [/lam đa|lambda/gi, String.raw`\lambda`],[/muy|mu\b/gi, String.raw`\mu`],[/khi bình phương|chi-square|chi bình/gi, String.raw`\chi^2`],
  [/x gạch ngang|x bar/gi, String.raw`\bar{x}`],[/xác suất của ([A-Z]) với điều kiện ([A-Z])/g, String.raw`P($1\mid $2)`],
  [/xác suất của ([A-Z])/g, 'P($1)'],[/([A-Z]) giao ([A-Z])/g, String.raw`$1\cap $2`],[/([A-Z]) hợp ([A-Z])/g, String.raw`$1\cup $2`],
  [/lớn hơn hoặc bằng/gi, String.raw`\ge`],[/nhỏ hơn hoặc bằng/gi, String.raw`\le`],[/(\w+) bình phương/gi, '$1^2'],
  [/giả thuyết h không/gi, 'H_0'],[/giả thuyết h một/gi, 'H_1'],[/kỳ vọng của ([A-Z])/g, 'E($1)'],[/phương sai của ([A-Z])/g, String.raw`\operatorname{Var}($1)`],
  [/không phẩy (\d+)/gi,'0{,}$1']
];
function normalizeMath(t){
  // Chỉ bọc LaTeX quanh phần nhận ra là ký hiệu; lời dẫn tiếng Việt giữ nguyên
  let changed=false;
  VI_MATH.forEach(([re,tex])=>{ t=t.replace(re,(...m)=>{changed=true; const out=tex.replace(/\$(\d)/g,(_,i)=>m[+i]); return '\\('+out+'\\)';}); });
  return t.replace(/\\\)\s*\\\(/g,' ');
}
function toggleMic(){
  if(!SR){ alert('Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome/Edge (HTTPS) hoặc gõ bàn phím / chụp ảnh đề.'); return; }
  if(wantMic){ wantMic=false; rec&&rec.stop(); setMic(false); return; }
  wantMic=true; startRec(); setMic(true);
}
function startRec(){
  rec=new SR(); rec.lang='vi-VN'; rec.continuous=true; rec.interimResults=true;
  rec.onresult=(e)=>{
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const tr=e.results[i][0].transcript;
      if(e.results[i].isFinal) insertAt($('prob'), normalizeMath(tr.trim())+' '); else interim+=tr;
    }
    $('micSt').textContent='Đang nghe… '+interim;
  };
  rec.onerror=(e)=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed'){ wantMic=false; setMic(false); alert('Bạn chưa cấp quyền micro (cần HTTPS và cho phép micro trong trình duyệt).'); } };
  rec.onend=()=>{ if(wantMic) { try{ startRec(); }catch(e){} } };   // tự bật lại nếu trình duyệt tự ngắt
  rec.start();
}
function setMic(on){ $('micBtn').classList.toggle('on',on); $('micBtn').textContent=on?'⏹ Dừng (đang nghe)':'🎤 Micro'; $('micSt').textContent=on?'Đang nghe…':''; }

/* ---------- OCR: AI thị giác (LaTeX) → dự phòng Tesseract ---------- */
let stream=null;
async function openCam(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    $('vid').srcObject=stream; $('vid').style.display='block'; $('vid').play(); $('snap').style.display='inline-block';
  }catch(e){ $('ocrSt').textContent='Không mở được camera (cần HTTPS + cấp quyền). Mình mở chọn ảnh thay thế.'; $('file').click(); }
}
function snap(){
  const v=$('vid'), c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight;
  c.getContext('2d').drawImage(v,0,0); stream.getTracks().forEach(t=>t.stop());
  $('vid').style.display='none'; $('snap').style.display='none';
  c.toBlob(b=>ocrFile(b),'image/jpeg',.9);
}
document.addEventListener('paste',e=>{ const f=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/')); if(f&&$('solve').classList.contains('on')) ocrFile(f); });
async function toSmallJpeg(blob){
  const img=await createImageBitmap(blob), k=Math.min(1,1400/Math.max(img.width,img.height));
  const c=document.createElement('canvas'); c.width=img.width*k; c.height=img.height*k; c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',.85);
}
async function ocrFile(f){
  if(!f) return; const st=$('ocrSt'); st.textContent='Đang đọc đề từ ảnh…';
  const dataUrl=await toSmallJpeg(f); let text='';
  try{
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'ocr',image:dataUrl.split(',')[1]})});
    const j=await r.json(); if(j.text) text=j.text;
  }catch(e){}
  if(!text){
    try{ const {data}=await Tesseract.recognize(dataUrl,'vie+eng'); text=data.text.trim(); st.textContent='Đọc bằng OCR cơ bản: công thức có thể sai, bạn hãy kiểm tra và sửa.'; }
    catch(e){ st.textContent='Không đọc được ảnh. Hãy chụp lại (đủ sáng, thẳng, trọn trang).'; return; }
  } else st.textContent='Đã đọc đề. Hãy kiểm tra lại các chỗ mờ (dấu, số mũ, chỉ số) trước khi giải.';
  if(!text.trim()){ st.textContent='Ảnh không có nội dung đọc được. Hãy chụp lại.'; return; }
  insertAt($('prob'), text+'\n');
}

/* ---------- Gọi AI qua Netlify Function (không lộ API key) ---------- */
async function callAI(payload){
  const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const j=await r.json(); if(!r.ok||!j.text) throw new Error(j.error||'Lỗi máy chủ AI'); return j.text;
}
async function solve(){
  const t=$('prob').value.trim(); if(!t) return;
  showRes('Đang giải…');
  try{ showRes(await callAI({mode:'solve',messages:[{role:'user',content:t}]})); }
  catch(e){ showRes('Chưa kết nối được AI ('+e.message+'). Bạn vẫn có thể bấm “＝ Tính” cho phép tính số. Xem README để cài ANTHROPIC_API_KEY.'); }
}

/* ---------- Chatbot ---------- */
const hist=[];
function addMsg(role,text){
  const d=document.createElement('div'); d.className='msg '+(role==='user'?'me':'bot'); show(d,text);
  if(role!=='user'){ const b=document.createElement('button'); b.textContent='🔊'; b.style.cssText='padding:2px 8px;display:block;margin-top:4px'; b.onclick=()=>speak(text); d.appendChild(b); }
  $('msgs').appendChild(d); $('msgs').scrollTop=1e9; return d;
}
async function ask(){
  const t=$('cin').value.trim(); if(!t) return; $('cin').value=''; speechSynthesis.cancel();
  addMsg('user',t); hist.push({role:'user',content:t});
  const w=addMsg('bot','đang trả lời...');
  try{ const a=await callAI({mode:'chat',messages:hist.slice(-20)}); hist.push({role:'assistant',content:a}); w.remove(); addMsg('bot',a); }
  catch(e){ w.remove(); addMsg('bot','Mình chưa kết nối được máy chủ AI: '+e.message); }
}
addMsg('bot','Chào bạn! Mình là bạn học toán của bạn đây. Bạn cần mình giúp gì nào?');

/* ---------- Đọc tiếng Việt: chuẩn hóa công thức thành lời ---------- */
const GREEK={alpha:'an-pha',beta:'bê-ta',gamma:'gam-ma',delta:'đen-ta',epsilon:'ép-xi-lon',varepsilon:'ép-xi-lon',theta:'thê-ta',lambda:'lam-đa',mu:'muy',nu:'nuy',pi:'pi',rho:'rô',sigma:'xích-ma',Sigma:'tổng',tau:'tau',phi:'phi',varphi:'phi',chi:'khi',omega:'ô-mê-ga',Phi:'phi'};
function mathToViet(s, inMath){
  s=s.replace(/\{,\}/g,' phẩy ').replace(/(\d),(\d)/g,'$1 phẩy $2').replace(/(\d)\.(\d)/g,'$1 phẩy $2');
  s=s.replace(/\bP\(/g,' xác suất của (').replace(/\bE\(/g,' kỳ vọng của (');
  if(inMath) s=s.replace(/\s*-\s*/g,' trừ ');
  s=s.replace(/\\sqrt\[(\w+)\]\{([^{}]*)\}/g,' căn bậc $1 của $2 ').replace(/\\sqrt\{([^{}]*)\}/g,' căn bậc hai của $1 ');
  s=s.replace(/\\bar\{(\w+)\}/g,' $1 gạch ngang ').replace(/\\hat\{(\\?\w+)\}/g,' $1 mũ ').replace(/\\overline\{(\w+)\}/g,' phần bù của $1 ');
  for(let i=0;i<4;i++) s=s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,' $1 trên $2 hết phân số ');
  s=s.replace(/\\sum_\{?([^{}^ ]*)\}?\^\{?([^{}\s]*)\}?/g,' tổng từ $1 đến $2 của ').replace(/\\int_\{?(\w+)\}?\^\{?(\w+)\}?/g,' tích phân từ $1 đến $2 của ');
  const sym={'\\mid':' với điều kiện ','\\cap':' giao ','\\cup':' hợp ','\\le':' nhỏ hơn hoặc bằng ','\\ge':' lớn hơn hoặc bằng ','\\ne':' khác ','\\approx':' xấp xỉ ','\\pm':' cộng trừ ','\\times':' nhân ','\\cdot':' nhân ','\\infty':' vô cùng ','\\sim':' có phân phối ','\\to':' tiến tới ','\\int':' tích phân ','\\sum':' tổng ','\\operatorname{Var}':' phương sai của '};
  Object.keys(sym).sort((a,b)=>b.length-a.length).forEach(k=>{ s=s.split(k).join(sym[k]); });
  s=s.replace(/\\([A-Za-z]+)/g,(m,n)=>' '+(GREEK[n]||n)+' ');
  s=s.replace(/\^\{?2\}?/g,' bình phương ').replace(/\^\{?3\}?/g,' lập phương ').replace(/\^\{([^{}]*)\}/g,' mũ $1 ').replace(/\^(\w)/g,' mũ $1 ');
  s=s.replace(/H_\{?0\}?/g,' H không ').replace(/H_\{?1\}?/g,' H một ');
  s=s.replace(/_\{([^{}]*)\}/g,' chỉ số $1 ').replace(/_(\w)/g,' chỉ số $1 ');
  const uni={'μ':'muy','σ':'xích-ma','α':'an-pha','β':'bê-ta','λ':'lam-đa','χ':'khi','Φ':'phi','φ':'phi','π':'pi','θ':'thê-ta','²':' bình phương','³':' lập phương','≤':' nhỏ hơn hoặc bằng ','≥':' lớn hơn hoặc bằng ','≠':' khác ','≈':' xấp xỉ ','√':' căn bậc hai của ','∑':' tổng ','∫':' tích phân ','∩':' giao ','∪':' hợp ','∣':' với điều kiện ','₀':' không','₁':' một','₂':' hai','±':' cộng trừ ','×':' nhân ','÷':' chia ','=':' bằng ','+':' cộng ','>':' lớn hơn ','<':' nhỏ hơn '};
  s=s.replace(/[μσαβλχΦφπθ²³≤≥≠≈√∑∫∩∪∣₀₁₂±×÷=+<>]/g,c=>uni[c]);
  s=s.replace(/(\w)\s*\/\s*(\w)/g,'$1 trên $2').replace(/\//g,' trên ').replace(/(\d)%/g,'$1 phần trăm').replace(/(^|\s)-(\d)/g,'$1âm $2');
  return s.replace(/[(){}\[\]]/g,' ');
}
function cleanForSpeech(t){
  t=t.replace(/```[\s\S]*?```/g,' ').replace(/\\\[([\s\S]*?)\\\]/g,(_,m)=>' '+mathToViet(m,true)+' ').replace(/\\\(([\s\S]*?)\\\)/g,(_,m)=>' '+mathToViet(m,true)+' ').replace(/\$([^$]+)\$/g,(_,m)=>' '+mathToViet(m,true)+' ');
  t=t.replace(/[*_#>`~|]/g,' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,' ');
  return mathToViet(t).replace(/\s+/g,' ').trim();
}
function pickVoice(prefix){ return speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith(prefix)); }
function speak(raw){
  if(!('speechSynthesis' in window)){ alert('Trình duyệt chưa hỗ trợ đọc văn bản.'); return; }
  speechSynthesis.cancel();
  const text=cleanForSpeech(raw||'');
  // Tách câu; từ tiếng Anh (chuỗi chữ ASCII ≥3 ký tự) đọc bằng giọng en-US
  text.split(/(?<=[.!?;:])\s+/).filter(Boolean).forEach(sent=>{
    sent.split(/(\b[A-Za-z]{3,}(?:\s+[A-Za-z]{3,})*\b)/).filter(p=>p.trim()).forEach(part=>{
      const en=/^[A-Za-z\s]+$/.test(part), u=new SpeechSynthesisUtterance(part);
      u.lang=en?'en-US':'vi-VN'; const v=pickVoice(en?'en':'vi'); if(v) u.voice=v; u.rate=1; speechSynthesis.speak(u);
    });
  });
  if(!pickVoice('vi')) console.warn('Thiết bị chưa có giọng tiếng Việt; hãy cài giọng vi-VN trong cài đặt hệ điều hành.');
}
speechSynthesis.onvoiceschanged=()=>{};
window.addEventListener('beforeunload',()=>speechSynthesis.cancel());

/* ---------- Game: Cosmic Dice Rush (xúc xắc SVG/CSS có chấm thật) ---------- */
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function drawDie(el,n){ el.innerHTML=''; for(let i=0;i<9;i++){ const p=document.createElement('i'); if(!PIPS[n].includes(i)) p.className='off'; el.appendChild(p); } }
const G={pos:0,turn:0,max:12,goal:90,counts:{},busy:false,over:false};
function newGame(){
  Object.assign(G,{pos:0,turn:0,counts:{},busy:false,over:false});
  $('guess').innerHTML=''; for(let s=2;s<=12;s++) $('guess').add(new Option(s,s,false,s===7));
  drawDie($('d1'),1); drawDie($('d2'),1); $('rollBtn').disabled=false; $('gmsg').textContent='Chọn dự đoán rồi tung xúc xắc!'; renderG();
}
function renderG(){
  $('gst').textContent=`Lượt còn: ${G.max-G.turn} | Quãng đường: ${G.pos}/${G.goal}`;
  const t=$('track'); t.innerHTML=''; const cells=18, at=Math.min(cells-1,Math.floor(G.pos/(G.goal/cells)));
  for(let i=0;i<cells;i++){ const c=document.createElement('div'); c.className='cell'+(i===at?' ship':''); c.textContent=i===at?'🚀':i===cells-1?'🏁':''; t.appendChild(c); }
}
function roll(){
  if(G.busy||G.over) return; G.busy=true; $('rollBtn').disabled=true;
  const guess=+$('guess').value; $('d1').classList.add('roll'); $('d2').classList.add('roll');
  const iv=setInterval(()=>{drawDie($('d1'),1+Math.floor(Math.random()*6));drawDie($('d2'),1+Math.floor(Math.random()*6));},80);
  setTimeout(()=>{
    clearInterval(iv); const a=1+Math.floor(Math.random()*6), b=1+Math.floor(Math.random()*6), s=a+b;
    drawDie($('d1'),a); drawDie($('d2'),b); $('d1').classList.remove('roll'); $('d2').classList.remove('roll');
    G.turn++; G.counts[s]=(G.counts[s]||0)+1; const ok=s===guess, move=s+(ok?5:0); G.pos=Math.min(G.goal,G.pos+move);
    let msg=`Tung được ${a} + ${b} = ${s}. ${ok?'Đoán đúng! +5 bonus.':'Chưa trúng dự đoán '+guess+'.'} Tàu tiến ${move}.\n\n`;
    msg+='Tần suất thực nghiệm so với lý thuyết (sau '+G.turn+' lượt):\n';
    for(let k=2;k<=12;k++){ const th=(6-Math.abs(k-7))/36, em=(G.counts[k]||0)/G.turn; msg+=`Tổng ${String(k).padStart(2)}: thực nghiệm ${(em*100).toFixed(1).padStart(5)}% | lý thuyết ${(th*100).toFixed(1).padStart(5)}%\n`; }
    if(G.pos>=G.goal){ G.over=true; msg+='\n🏆 CHIẾN THẮNG! Bạn đã tới đích.'; addStars(3); }
    else if(G.turn>=G.max){ G.over=true; msg+='\n💥 Hết lượt, chưa tới đích. Thử lại nhé!'; }
    msg+='\n\nKiến thức: P(tổng = 7) = 6/36 = 1/6 là cao nhất; càng tung nhiều, tần suất thực nghiệm càng gần xác suất lý thuyết (luật số lớn).';
    $('gmsg').textContent=msg; G.busy=false; $('rollBtn').disabled=G.over; renderG();
  },750);
}
function addStars(n){ try{ localStorage.setItem('stars',(+(localStorage.getItem('stars')||0)+n)); }catch(e){} }  // chỉ gọi 1 lần khi G.over chuyển true

/* ---------- Diễn đàn: Supabase thời gian thực ---------- */
let sb=null, forumReady=false;
function myHandle(){
  let h=null; try{ h=localStorage.getItem('handle'); }catch(e){}
  if(!h){ const n=(prompt('Chọn tên của bạn (chữ thường, không dấu):','')||'banhoc').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,16)||'banhoc';
    h='@'+n+'#'+(1000+Math.floor(Math.random()*9000)); try{ localStorage.setItem('handle',h); }catch(e){} }
  return h;
}
function initForum(){
  $('who').textContent=myHandle();
  if(forumReady) return;
  if(!window.supabase){ $('fstat').textContent='Đang tải thư viện Supabase…'; setTimeout(initForum,800); return; }
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY); forumReady=true; loadPosts();
  sb.channel('posts').on('postgres_changes',{event:'*',schema:'public',table:'posts'},loadPosts).subscribe();
}
async function loadPosts(){
  const {data,error}=await sb.from('posts').select('*').order('created_at',{ascending:false}).limit(50);
  if(error){ $('fstat').textContent='Chưa đọc được dữ liệu diễn đàn: '+error.message+' (đã chạy supabase/schema.sql chưa?)'; return; }
  $('fstat').textContent=''; const box=$('posts'); box.innerHTML='';
  data.forEach(p=>{ const d=document.createElement('div'); d.className='card post';
    const h=document.createElement('b'); h.textContent=p.title; const m=document.createElement('div'); m.className='mono'; m.style.opacity=.7; m.textContent=`${p.author} · ${new Date(p.created_at).toLocaleString('vi-VN')}`;
    const body=document.createElement('div'); body.style.whiteSpace='pre-wrap'; show(body,p.body); d.append(h,m,body); box.appendChild(d); });
}
async function post(){
  const title=$('ftitle').value.trim(), body=$('fbody').value.trim(); if(!title||!body) return alert('Bạn nhập tiêu đề và nội dung giúp mình nhé.');
  const {error}=await sb.from('posts').insert({title,body,author:myHandle()});
  if(error) return alert('Đăng bài chưa được: '+error.message);
  $('ftitle').value=''; $('fbody').value='';
}
$('who').textContent='';
