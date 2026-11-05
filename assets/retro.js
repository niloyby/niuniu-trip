/* Optional travel-desktop interactions, layered over the existing itinerary. */
const memoryKey = 'bear-penguin-desktop-v1';
let travelMemory = { favorites: {}, visited: {} };
try {
  const value = JSON.parse(localStorage.getItem(memoryKey) || '{}');
  if (value && typeof value === 'object') {
    for (const field of ['favorites', 'visited']) {
      if (value[field] && typeof value[field] === 'object' && !Array.isArray(value[field])) travelMemory[field] = value[field];
    }
  }
} catch (_) { /* Private browsing can disable storage. The page remains usable. */ }
let toastTimer;
let onlyFavorites = false;
let routeSelection = 0;
let routeDay = -1;
let helloCount = 0;

function notifyTravel(message) {
  const target = $('#toast');
  target.textContent = message;
  target.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => target.classList.remove('visible'), 3200);
}
function saveTravelMemory() {
  try { localStorage.setItem(memoryKey, JSON.stringify(travelMemory)); return true; }
  catch (_) { return false; }
}
function stopKey(day, index) { return day.date + '|' + index + '|' + day.stops[index][1]; }
function allTravelStops() {
  return days.flatMap((day, di) => day.stops.map((stop, index) => ({ day, di, stop, index, key: stopKey(day, index) })));
}
function updateTravelPassport() {
  if (!days.length) return;
  const all = allTravelStops();
  const visited = all.filter(s => travelMemory.visited[s.key] === true).length;
  const favorites = all.filter(s => travelMemory.favorites[s.key] === true).length;
  $('#visitedCount').textContent = visited + ' / ' + all.length + ' 站回憶';
  $('#favoriteCount').textContent = '♡ ' + favorites + ' 個收藏';
  $('#stampSlots').innerHTML = days.map((day, di) => {
    const count = day.stops.filter((_, i) => travelMemory.visited[stopKey(day, i)] === true).length;
    return '<div class="stamp-slot ' + (count ? 'collected' : '') + '" title="DAY ' + (di + 1) + '：已蓋 ' + count + ' 站" aria-label="第 ' + (di + 1) + ' 天，已蓋 ' + count + ' 站">' + (count ? day.emoji : '✧') + '<span>DAY ' + (di + 1) + '</span></div>';
  }).join('');
  $('#albumDays').innerHTML = days.map((day, di) => {
    const count = day.stops.filter((_, i) => travelMemory.visited[stopKey(day, i)] === true).length;
    return '<div class="album-day"><div class="stamp-slot ' + (count ? 'collected' : '') + '" aria-hidden="true">' + (count ? day.emoji : '✧') + '<span>DAY ' + (di + 1) + '</span></div><div><h3>' + esc(day.title) + '</h3><p>' + esc(day.date) + ' · 已蓋 ' + count + ' / ' + day.stops.length + ' 站</p></div></div>';
  }).join('');
  const savedStops = all.filter(s => travelMemory.favorites[s.key] === true);
  $('#favoriteNotes').innerHTML = savedStops.length ? savedStops.map(s => '<div class="favorite-note"><span><small>DAY ' + (s.di + 1) + ' · ' + esc(s.stop[0]) + '</small><br>' + esc(s.stop[1]) + '</span><button type="button" data-jump-day="' + s.di + '" data-jump-stop="' + s.index + '">查看行程 ↗</button></div>').join('') : '<p>還沒有口袋景點。到「行程」按下 ♡ 收藏，把想去的地方收進來。</p>';
}
function filterTravelStops() {
  if (!days.length) return;
  const query = $('#stopSearch').value.trim().toLocaleLowerCase();
  let visible = 0;
  $('#stops').querySelectorAll('.stop').forEach((card, i) => {
    const key = stopKey(days[current], i);
    const match = days[current].stops[i][1].toLocaleLowerCase().includes(query) && (!onlyFavorites || travelMemory.favorites[key] === true);
    card.classList.toggle('hidden', !match);
    if (match) visible++;
  });
  $('#stopResult').textContent = visible + ' / ' + days[current].stops.length + ' 站' + (onlyFavorites ? ' · 我的收藏' : ' · 點 ♡ 收藏，點 ✿ 蓋下到訪章');
  let empty = $('#stops .empty-state');
  if (!visible && !empty) {
    empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = onlyFavorites ? '今天還沒有符合條件的收藏。可以關閉收藏篩選再找找。' : '這一天找不到這個地點，換個關鍵字或日期試試。';
    $('#stops').append(empty);
  } else if (visible && empty) empty.remove();
}
function enhanceTravelStops() {
  if (!days.length) return;
  $('#stops').querySelectorAll('.stop').forEach((card, i) => {
    const key = stopKey(days[current], i);
    const favorite = travelMemory.favorites[key] === true;
    const visited = travelMemory.visited[key] === true;
    card.id = 'stop-' + i;
    card.classList.toggle('visited', visited);
    if (!card.querySelector('.stop-actions')) {
      const actions = document.createElement('div');
      actions.className = 'stop-actions';
      actions.innerHTML = '<button type="button" data-memory-action="favorites" data-stop="' + i + '"></button><button type="button" class="visit-button" data-memory-action="visited" data-stop="' + i + '"></button>';
      card.querySelector('.stop-card').append(actions);
    }
    const favoriteButton = card.querySelector('[data-memory-action=favorites]');
    favoriteButton.setAttribute('aria-pressed', String(favorite));
    favoriteButton.setAttribute('aria-label', (favorite ? '取消收藏：' : '收藏：') + days[current].stops[i][1]);
    favoriteButton.textContent = favorite ? '♥ 已收藏' : '♡ 收藏';
    const visitButton = card.querySelector('[data-memory-action=visited]');
    visitButton.setAttribute('aria-pressed', String(visited));
    visitButton.setAttribute('aria-label', (visited ? '取消到訪章：' : '蓋到訪章：') + days[current].stops[i][1]);
    visitButton.textContent = visited ? '✿ 已蓋章' : '✿ 到訪蓋章';
  });
  filterTravelStops();
  updateTravelPassport();
  drawTravelRoute();
}

function drawTravelRoute() {
  if (!days.length) return;
  const day = days[current];
  if (routeDay !== current) { routeDay = current; routeSelection = 0; }
  $('#routeDays').innerHTML = days.map((d, di) => '<button type="button" class="retro-button" data-route-day="' + di + '" aria-pressed="' + (di === current) + '">DAY ' + (di + 1) + ' · ' + d.date.slice(5).replace('-', '/') + '</button>').join('');
  $('#routeTitle').textContent = 'DAY ' + (current + 1) + ' / ' + day.title;
  const cols = matchMedia('(max-width:760px)').matches ? 2 : 3;
  $('#routeBoard').innerHTML = day.stops.map((stop, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 ? cols - i % cols : i % cols + 1;
    const direction = (i + 1) % cols === 0 ? '↓' : row % 2 ? '←' : '→';
    return '<button type="button" class="route-node" style="grid-row:' + (row + 1) + ';grid-column:' + col + '" data-route-stop="' + i + '" aria-pressed="' + (routeSelection === i) + '"><span class="route-number">' + (i + 1) + '</span><small>' + esc(stop[0]) + ' · ' + esc(category(stop[1])[1]) + '</small><strong>' + esc(stop[1]) + '</strong>' + (i < day.stops.length - 1 ? '<span class="route-connector" data-direction="' + direction + '" aria-hidden="true">' + direction + '</span>' : '') + '</button>';
  }).join('');
  updateRouteDetail();
}
function updateRouteDetail() {
  const day = days[current];
  const stop = day.stops[routeSelection];
  const [time, name, len] = stop;
  const map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name);
  let previousLink = '';
  if (routeSelection > 0) {
    const params = new URLSearchParams({ api: '1', origin: day.stops[routeSelection - 1][1], destination: name });
    previousLink = '<a href="https://www.google.com/maps/dir/?' + esc(params.toString()) + '" target="_blank" rel="noopener noreferrer">從上一站規劃交通 ↗</a>';
  }
  $('#routeDetail').innerHTML = '<small>STOP ' + (routeSelection + 1) + ' / ' + day.stops.length + '</small><h4>' + esc(name) + '</h4><p>' + esc(time) + ' · ' + esc(duration(len)) + '</p>' + (routeNotes[name] ? '<p>' + esc(routeNotes[name]) + '</p>' : '') + (spots[name] ? '<p>⚠ ' + esc(spots[name]) + '</p>' : '') + '<div class="route-detail-links"><button type="button" class="retro-button" data-jump-day="' + current + '" data-jump-stop="' + routeSelection + '">查看行程卡 ↗</button><a href="' + esc(map) + '" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>' + previousLink + '</div>';
  $('#routeBoard').querySelectorAll('[data-route-stop]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.routeStop) === routeSelection)));
}

document.addEventListener('itineraryrender', enhanceTravelStops);
$('#stopSearch').addEventListener('input', filterTravelStops);
$('#onlyFavorites').addEventListener('click', () => {
  onlyFavorites = !onlyFavorites;
  $('#onlyFavorites').setAttribute('aria-pressed', String(onlyFavorites));
  $('#onlyFavorites').textContent = onlyFavorites ? '♥ 已篩選收藏' : '♡ 只看收藏';
  filterTravelStops();
});
$('#stops').addEventListener('click', event => {
  const button = event.target.closest('[data-memory-action]');
  if (!button || !days.length) return;
  const key = stopKey(days[current], Number(button.dataset.stop));
  const field = button.dataset.memoryAction;
  const value = travelMemory[field][key] !== true;
  if (value) travelMemory[field][key] = true; else delete travelMemory[field][key];
  const persisted = saveTravelMemory();
  enhanceTravelStops();
  notifyTravel(persisted ? field === 'favorites' ? value ? '♡ 收進口袋名單了！' : '已取消收藏' : value ? '✿ 喀嚓！又收集了一站回憶。' : '已收回這一站的印章' : '這次已記住；瀏覽器無法儲存，關閉後不會保留。');
});
$('#routeDays').addEventListener('click', event => {
  const button = event.target.closest('[data-route-day]');
  if (!button) return;
  current = Number(button.dataset.routeDay);
  $('#stopSearch').value = '';
  draw();
  // Keep keyboard focus on the chosen date after the controls are repainted.
  $('#routeDays [data-route-day="' + current + '"]').focus();
});
$('#routeBoard').addEventListener('click', event => {
  const button = event.target.closest('[data-route-stop]');
  if (!button) return;
  routeSelection = Number(button.dataset.routeStop);
  updateRouteDetail();
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-jump-day]');
  if (!button || !days.length) return;
  current = Number(button.dataset.jumpDay);
  const index = Number(button.dataset.jumpStop);
  $('#stopSearch').value = '';
  onlyFavorites = false;
  $('#onlyFavorites').setAttribute('aria-pressed', 'false');
  $('#onlyFavorites').textContent = '♡ 只看收藏';
  draw();
  showTab('trip');
  const card = $('#stop-' + index);
  card.setAttribute('tabindex', '-1');
  card.scrollIntoView({ behavior: animEnabled ? 'smooth' : 'instant', block: 'center' });
  card.focus({ preventScroll: true });
});
matchMedia('(max-width:760px)').addEventListener('change', drawTravelRoute);

let nightMode = false;
try { nightMode = localStorage.getItem('bear-penguin-theme') === 'night'; } catch (_) {}
function paintTravelTheme() {
  document.documentElement.dataset.theme = nightMode ? 'night' : 'day';
  $('#themeSwitch').textContent = nightMode ? '☀' : '☾';
  $('#themeSwitch').setAttribute('aria-pressed', String(nightMode));
  $('#themeSwitch').setAttribute('aria-label', nightMode ? '切換日間模式' : '切換夜間模式');
  document.querySelector('meta[name=theme-color]').content = nightMode ? '#263f50' : '#7f9eb0';
}
$('#themeSwitch').addEventListener('click', () => {
  nightMode = !nightMode;
  try { localStorage.setItem('bear-penguin-theme', nightMode ? 'night' : 'day'); } catch (_) {}
  paintTravelTheme();
});
paintTravelTheme();

const passportDialog = $('#passportDialog');
$('#openPassport').addEventListener('click', () => { if (!passportDialog.open) passportDialog.showModal(); });
$('#closePassport').addEventListener('click', () => passportDialog.close());
passportDialog.addEventListener('click', event => {
  if (event.target !== passportDialog) return;
  const rect = passportDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) passportDialog.close();
});
$('#greetMascots').addEventListener('click', () => {
  helloCount++;
  const greetings = ['小熊：車票帶好了嗎？我們出發囉！', '企鵝：揮揮小翅膀，今天也要一起玩 ♡', '粉色列車已到站，請帶著好心情上車！', '隱藏彩蛋：少冰的焙茶拿鐵，準備好了 🍵'];
  notifyTravel(greetings[(helloCount - 1) % greetings.length]);
  if (!animEnabled) return;
  const scene = $('#greetMascots');
  scene.classList.add('hello');
  for (let i = 0; i < 5; i++) {
    const heart = document.createElement('span');
    heart.className = 'hello-heart';
    heart.textContent = i % 2 ? '✧' : '♡';
    heart.style.setProperty('--x', (25 + i * 12) + '%');
    heart.style.animationDelay = (i * 0.05) + 's';
    heart.setAttribute('aria-hidden', 'true');
    scene.append(heart);
    setTimeout(() => heart.remove(), 1600);
  }
  setTimeout(() => scene.classList.remove('hello'), 1600);
});
$('#backToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: animEnabled ? 'smooth' : 'instant' }));
if (days.length) enhanceTravelStops();
