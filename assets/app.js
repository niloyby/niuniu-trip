let days=[];
const $=q=>document.querySelector(q);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let spots={};
let hints=[];
let packing={};
let flights=[];
let reservations=[];
let shopping={};
let teaNotes=[];
let routeNotes={};
let railSchedules=[];

let current=0;
function category(name){
  if(/OTS|休息站/.test(name))return ['🚗','交通','#dbecd6'];
  if(/機場|空港/.test(name))return ['✈️','機場','#e7e0f4'];
  if(/酒店|飯店|生活公寓/.test(name))return ['🏡','住宿','#f8d9d3'];
  if(/唐吉訶德|PARCO|COSTCO|好市多|GU |UNIQLO|mont-bell|迪斐世|3COINS|Cocoroar|FLAVOR DESIGN/.test(name))return ['🛍️','購物','#e8e1f8'];
  if(/Chaboo|Isshin|Sweets|Torikawahakata|Kitchen|魚市場|燒肉|hoppepan|Coffee|星巴克|ダイニング|拉麵|蝦蝦飯|Burgers|豬排|Sushi|抹茶|鬆餅/.test(name))return ['🍡','美食','#f9e0b4'];
  return ['🌴','景點','#dbeefa'];
}
function stopTime(day,index){
  let offset=0;
  for(let i=1;i<=index;i++)if(day.stops[i][0]<day.stops[i-1][0])offset++;
  return (offset===1?'隔日 ':offset>1?'第 '+(offset+1)+' 日 ':'')+day.stops[index][0];
}
function paintJourney(){
  const now=Date.now(),start=Date.parse(days[0].date+'T00:00:00+09:00');
  const end=Date.parse(days[days.length-1].date+'T00:00:00+09:00')+86400000;
  $('#dayCount').textContent=days.length+' 天 '+(days.length-1)+' 夜';
  $('#journeyStatus').textContent=now<start?'還有 '+Math.ceil((start-now)/86400000)+' 天出發':now<end?'旅行進行中':'旅行日記';
}
function duration(d){const [h,m]=d.split(':').map(Number);return h===0&&m===0?'不安排停留':(h?h+' 小時 ':'')+(m?m+' 分鐘':'');}

function googleWalkingLink(segment){
  const q={api:'1',origin:segment.origin,destination:segment.destination,travelmode:'walking'};
  const params=new URLSearchParams(q);
  if(segment.waypoints&&segment.waypoints.length)params.set('waypoints',segment.waypoints.join('|'));
  return 'https://www.google.com/maps/dir/?'+params.toString();
}
function renderWalkingRoute(day){
  const target=$('#walkingRoute');
  if(!target)return;
  if(!day.walkingRoute){target.innerHTML='';target.classList.add('hidden');return;}
  const route=day.walkingRoute;
  target.classList.remove('hidden');
  target.innerHTML='<div class="walk-heading">🚶 '+esc(route.title)+'</div>'+
    '<p class="walk-subtitle">'+esc(route.subtitle)+'</p>'+
    '<div class="walk-legs">'+route.segments.map(s=>'<a class="walk-leg" href="'+esc(googleWalkingLink(s))+'" target="_blank" rel="noopener noreferrer"><b>'+esc(s.label)+'</b><span>'+esc(s.description)+'</span><span class="walk-map">Google Maps 步行導航 ↗</span></a>').join('')+'</div>';
}

function draw(){const d=days[current];$('#dateRail').innerHTML=days.map((e,i)=>'<button type="button" class="day-button '+(i===current?'selected':'')+'" data-day="'+i+'" aria-pressed="'+(i===current)+'"><small>DAY '+(i+1)+'</small><strong>'+e.date.slice(5).replace('-','/')+'</strong><span class="dow">週'+e.dow+'</span></button>').join('');
$('#dateRail').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{current=Number(b.dataset.day);draw();}));
$('#dayTitle').innerHTML='<div class="day-icon">'+esc(d.emoji)+'</div><div><span>DAY '+(current+1)+' / '+days.length+' · '+esc(d.date)+'</span><h3>'+esc(d.title)+'</h3><p>'+esc(d.party)+' · '+esc(d.transport)+'</p><p>'+esc(current===days.length-1?'今日退房：':'今晚住宿：')+esc(d.hotel.name)+'</p></div>';
$('#stops').innerHTML=d.stops.map((s,i)=>{const [time,name,len]=s;const [em,tag,bg]=category(name);const map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name);return '<article class="stop" style="--index:'+i+'"><span class="stop-time">'+esc(stopTime(d,i))+'</span><span class="stop-dot"></span><div class="stop-card '+(spots[name]?'warning':'')+'"><div class="stop-name">'+em+' '+esc(name)+'</div><div class="stop-metas"><span class="chip" style="background:'+bg+'">'+tag+'</span><span class="stop-length">⏱ '+duration(len)+'</span><a class="maplink" href="'+map+'" target="_blank" rel="noopener noreferrer">地圖 ↗</a></div>'+(spots[name]?'<div class="warning-text">⚠ '+esc(spots[name])+'</div>':'')+(routeNotes[name]?'<div class="route-extra">🛍️ '+esc(routeNotes[name])+'</div>':'')+(reservations.some(r=>r.date===d.date&&r.place===name)?'<div class="reservation-pill">🍋 已訂位 · '+esc(reservations.find(r=>r.date===d.date&&r.place===name).time)+'</div>':'')+'</div></article>'}).join('');
$('#dayHint').textContent=hints[current];renderWalkingRoute(d);document.dispatchEvent(new Event('itineraryrender'));}
const tabs=['trip','flight','route','prep','notes','backup'];
tabs.forEach(t=>{const button=document.querySelector('[data-tab='+t+']');button.setAttribute('role','tab');button.id='tab-'+t;button.setAttribute('aria-controls','view-'+t);const panel=$('#view-'+t);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+t);});
function showTab(t){if(!tabs.includes(t))return;tabs.forEach(x=>{$('#view-'+x).classList.toggle('hidden',x!==t);document.querySelector('[data-tab='+x+']').setAttribute('aria-selected',String(x===t));document.querySelector('[data-tab='+x+']').tabIndex=x===t?0:-1;});}
document.querySelectorAll('[data-tab]').forEach(b=>{b.tabIndex=b.dataset.tab==='trip'?0:-1;b.addEventListener('click',()=>showTab(b.dataset.tab));b.addEventListener('keydown',event=>{const order=Array.from(document.querySelectorAll('[data-tab]'));let i=order.indexOf(b);if(event.key==='ArrowRight')i=(i+1)%order.length;else if(event.key==='ArrowLeft')i=(i+order.length-1)%order.length;else if(event.key==='Home')i=0;else if(event.key==='End')i=order.length-1;else return;event.preventDefault();showTab(order[i].dataset.tab);order[i].focus();});});
let saved={};try{const value=JSON.parse(localStorage.getItem('okinawa-squad-20261119-checks')||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch(e){}
function refreshProgress(){const entries=Object.values(packing);const total=entries.reduce((a,b)=>a+b.length,0);const n=entries.reduce((count,items,i)=>count+items.filter((_,j)=>saved[i+'-'+j]===true).length,0);const percent=total?Math.round(n*100/total):0;$('#progressPercent').textContent=percent+'%';$('#progressBar').style.width=percent+'%';}
function setupChecklist(){
$('#checkList').innerHTML=Object.entries(packing).map(([name,arr],i)=>'<div class="checks paper"><h3>'+name+'</h3>'+arr.map((label,j)=>'<label class="checkitem"><input type="checkbox" data-check="'+i+'-'+j+'" '+(saved[i+'-'+j]?'checked':'')+'><span>'+esc(label)+'</span></label>').join('')+'</div>').join('');
document.querySelectorAll('[data-check]').forEach(ch=>ch.addEventListener('change',()=>{saved[ch.dataset.check]=ch.checked;try{localStorage.setItem('okinawa-squad-20261119-checks',JSON.stringify(saved))}catch(e){}refreshProgress();}));
}
const motionButton=$('#motionSwitch');const motionLabel=$('#motionStatus');let preferredReduced=false;try{preferredReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
// Preserve accessibility without silently making the page seem broken: announce state and show a visible override.
let animEnabled=!preferredReduced;
try{const val=localStorage.getItem('bearcow-v3-motion');if(val!==null)animEnabled=val==='on'}catch(e){}
function refreshMotion(){document.body.classList.toggle('motion-on',animEnabled);motionButton.setAttribute('aria-pressed',String(animEnabled));motionButton.textContent=animEnabled?'✨ 關閉動畫':'✨ 開啟動畫';motionLabel.textContent=animEnabled?'動畫正在播放｜五人揮手、沖繩小巴出發':'動畫目前關閉'+(preferredReduced?'（偵測到系統減少動態效果）':'')+'｜按右側開啟';}
motionButton.addEventListener('click',()=>{animEnabled=!animEnabled;try{localStorage.setItem('bearcow-v3-motion',animEnabled?'on':'off')}catch(e){}refreshMotion();if(days.length)draw();});
refreshMotion();

function noteLink(href,label){
  if(!href)return '';
  return '<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>';
}

function paintTravelInfo(payload){
  $('#flightCards').innerHTML=flights.map(f=>'<article class="paper section-card"><small>'+esc(f.date)+' · '+esc(f.party)+'</small><h3>'+esc(f.airline)+' '+esc(f.number)+'</h3><p>'+esc(f.departure)+' '+esc(f.from)+' → '+esc(f.arrival)+' '+esc(f.to)+'</p></article>').join('');
  $('#hotelCards').innerHTML=(payload.hotels||[]).map(h=>'<article class="paper section-card"><small>'+esc(h.checkIn)+' 入住 → '+esc(h.checkOut)+' 退房 · '+h.nights+' 晚</small><h3>🏡 '+esc(h.name)+'</h3>'+(h.address?'<p>'+esc(h.address)+'</p>':'')+noteLink('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(h.query),'住宿地圖')+'</article>').join('');
  $('#backupCards').innerHTML=(payload.backupStops||[]).map(s=>'<article class="paper section-card"><small>備選 · 參考停留 '+esc(duration(s.duration))+'</small><h3>'+esc(s.name)+'</h3>'+noteLink('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.name+' 沖繩'),'景點地圖')+'</article>').join('');
}

async function loadItinerary(){
  try {
    // Cache bypass keeps schedule edits visible without rebuilding CSS/JS.
    const response=await fetch('./data/itinerary.json?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const payload=await response.json();
    if(!Array.isArray(payload.days)||payload.days.length===0||
       payload.days.some(d=>!Array.isArray(d.stops)||!d.date))throw new Error('行程資料格式不符');
    days=payload.days;
    spots=payload.spots||{};
    hints=payload.hints||[];
    packing=payload.packing||{};
    flights=payload.flights||[];
    reservations=payload.reservations||[];
    shopping=payload.shopping||{};
    teaNotes=payload.teaNotes||[];
    routeNotes=payload.routeNotes||{};
    railSchedules=payload.railSchedules||[];
    paintJourney();
    paintTravelInfo(payload);
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

