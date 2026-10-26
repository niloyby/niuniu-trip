let days=[];
const $=q=>document.querySelector(q);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let spots={};
let hints=[];
let packing={};
let current=0;
function category(name){if(/機場/.test(name))return ['✈️','機場','#e7e0f4'];if(/酒店|飯店/.test(name))return ['🏡','住宿','#f8d9d3'];if(/站$/.test(name))return ['🚉','交通','#dbecd6'];if(/肉|鰻|檸檬|Pomme|焼肉/.test(name))return ['🍡','美食','#f9e0b4'];if(/店|PARCO|伊勢丹|大丸|Mall|商店街|任天堂/.test(name))return ['🛍️','購物','#e8e1f8'];return ['⛩️','景點','#dbeefa'];}
function duration(d){const [h,m]=d.split(':').map(Number);return h===0&&m===0?'轉乘或經過':(h?h+' 小時 ':'')+(m?m+' 分鐘':'');}
function draw(){const d=days[current];$('#dateRail').innerHTML=days.map((e,i)=>'<button type="button" class="day-button '+(i===current?'selected':'')+'" data-day="'+i+'" aria-pressed="'+(i===current)+'"><small>DAY '+(i+1)+'</small><strong>'+e.date.slice(5).replace('-','/')+'</strong><span class="dow">週'+e.dow+'</span></button>').join('');
$('#dateRail').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{current=Number(b.dataset.day);draw();}));
$('#dayTitle').innerHTML='<div class="day-icon">'+esc(d.emoji)+'</div><div><span>DAY '+(current+1)+' / 4 · '+esc(d.date)+'</span><h3>'+esc(d.title)+'</h3><p>慢慢走，把美好的風景收進心裡 ♡</p></div>';
$('#stops').innerHTML=d.stops.map((s,i)=>{const [time,name,len]=s;const [em,tag,bg]=category(name);const map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name);return '<article class="stop" style="--index:'+i+'"><span class="stop-time">'+esc(time)+'</span><span class="stop-dot"></span><div class="stop-card '+(spots[name]?'warning':'')+'"><div class="stop-name">'+em+' '+esc(name)+'</div><div class="stop-metas"><span class="chip" style="background:'+bg+'">'+tag+'</span><span class="stop-length">⏱ '+duration(len)+'</span><a class="maplink" href="'+map+'" target="_blank" rel="noopener noreferrer">地圖 ↗</a></div>'+(spots[name]?'<div class="warning-text">⚠ '+esc(spots[name])+'</div>':'')+'</div></article>'}).join('');
$('#dayHint').textContent=hints[current];}
const tabs=['trip','flight','prep'];
function showTab(t){tabs.forEach(x=>{$('#view-'+x).classList.toggle('hidden',x!==t);document.querySelector('[data-tab='+x+']').setAttribute('aria-selected',String(x===t));});}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
let saved={};try{saved=JSON.parse(localStorage.getItem('bearcow-v3-checks')||'{}')}catch(e){}
function refreshProgress(){const total=Object.values(packing).reduce((a,b)=>a+b.length,0);const n=Object.values(saved).filter(Boolean).length;$('#progressPercent').textContent=Math.round(n*100/total)+'%';$('#progressBar').style.width=(n/total*100)+'%';}
function setupChecklist(){
$('#checkList').innerHTML=Object.entries(packing).map(([name,arr],i)=>'<div class="checks paper"><h3>'+name+'</h3>'+arr.map((label,j)=>'<label class="checkitem"><input type="checkbox" data-check="'+i+'-'+j+'" '+(saved[i+'-'+j]?'checked':'')+'><span>'+esc(label)+'</span></label>').join('')+'</div>').join('');
document.querySelectorAll('[data-check]').forEach(ch=>ch.addEventListener('change',()=>{saved[ch.dataset.check]=ch.checked;try{localStorage.setItem('bearcow-v3-checks',JSON.stringify(saved))}catch(e){}refreshProgress();}));
}
const motionButton=$('#motionSwitch');const motionLabel=$('#motionStatus');let preferredReduced=false;try{preferredReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
// Preserve accessibility without silently making the page seem broken: announce state and show a visible override.
let animEnabled=!preferredReduced;
try{const val=localStorage.getItem('bearcow-v3-motion');if(val!==null)animEnabled=val==='on'}catch(e){}
function refreshMotion(){document.body.classList.toggle('motion-on',animEnabled);motionButton.setAttribute('aria-pressed',String(animEnabled));motionButton.textContent=animEnabled?'✨ 關閉動畫':'✨ 開啟動畫';motionLabel.textContent=animEnabled?'動畫正在播放｜看小熊揮手、火車晃動':'動畫目前關閉'+(preferredReduced?'（偵測到系統減少動態效果）':'')+'｜按右側開啟';}
motionButton.addEventListener('click',()=>{animEnabled=!animEnabled;try{localStorage.setItem('bearcow-v3-motion',animEnabled?'on':'off')}catch(e){}refreshMotion();draw();});
const today=Date.now();const start=Date.parse('2026-10-30T06:55:00+08:00');if(today<start)$('#dayCount').textContent=Math.ceil((start-today)/86400000)+' 天';
refreshMotion();
async function loadItinerary(){
  try {
    // Cache bypass keeps schedule edits visible without rebuilding CSS/JS.
    const response=await fetch('./data/itinerary.json?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const payload=await response.json();
    if(!Array.isArray(payload.days)||payload.days.length!==4||
       payload.days.some(d=>!Array.isArray(d.stops)||!d.date))throw new Error('行程資料格式不符');
    days=payload.days;
    spots=payload.spots||{};
    hints=payload.hints||[];
    packing=payload.packing||{};
    setupChecklist();
    draw();
    refreshProgress();
  }catch(error){
    console.error('Failed to load itinerary:',error);
    $('#dayTitle').innerHTML='<div>⚠ 行程載入失敗</div>';
    $('#dayHint').textContent='請重新整理頁面；若仍無法載入，請檢查 data/itinerary.json。';
  }
}
loadItinerary();
