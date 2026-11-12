'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY = 86400000;
const NEW_PER_DAY = 20;

let WORDS = [], EXAMPLES = {}, SCENES = [], WORDMAP = {};
let rate = parseFloat(localStorage.getItem('bw.rate') || '0.92');

/* ---------- 数据 ---------- */
async function loadData(){
  const [w, e, s] = await Promise.all([
    fetch('data/words.json').then(r => r.json()),
    fetch('data/examples.json').then(r => r.json()).catch(() => ({})),
    fetch('data/scenes.json').then(r => r.json()),
  ]);
  WORDS = w; EXAMPLES = e; SCENES = s;
  WORDS.forEach(x => WORDMAP[x.w.toLowerCase()] = x);
}

/* ---------- SRS 存储 ---------- */
const srs = JSON.parse(localStorage.getItem('bw.srs.v1') || '{}');
const saveSRS = () => localStorage.setItem('bw.srs.v1', JSON.stringify(srs));
function dayKey(){ return new Date().toDateString(); }
function dayState(){
  let d = JSON.parse(localStorage.getItem('bw.day.v1') || 'null');
  if (!d || d.date !== dayKey()) d = { date: dayKey(), introduced: 0, finished: 0 };
  return d;
}
const saveDay = d => localStorage.setItem('bw.day.v1', JSON.stringify(d));
function grade(word, g){
  const now = Date.now();
  const cur = srs[word] || { r: 0, iv: 0, due: 0 };
  if (g === 'again'){ cur.iv = 0; cur.due = now + 10 * 60000; }
  else if (g === 'hard'){ cur.iv = cur.iv === 0 ? 1 : Math.max(1, Math.round(cur.iv * 14) / 10); cur.due = now + cur.iv * DAY; cur.r++; }
  else { cur.iv = cur.iv === 0 ? 2.5 : Math.round(cur.iv * 22) / 10; cur.due = now + cur.iv * DAY; cur.r++; }
  srs[word] = cur; saveSRS();
}
const dueWords = () => Object.keys(srs).filter(w => (srs[w].due || 0) <= Date.now());
const newWordsPool = () => WORDS.filter(x => !srs[x.w]).map(x => x.w);

/* ---------- 朗读 ---------- */
let voiceUS = null;
function pickVoice(){
  const vs = speechSynthesis.getVoices();
  voiceUS = vs.find(v => v.lang === 'en-US') || vs.find(v => v.lang && v.lang.startsWith('en')) || null;
}
if ('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let speakingEl = null;
function speak(text, btn){
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; if (voiceUS) u.voice = voiceUS; u.rate = rate;
  if (btn){ speakingEl = btn; btn.classList.add('playing'); u.onend = u.onerror = () => btn.classList.remove('playing'); }
  speechSynthesis.speak(u);
}
$('#rateToggle').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  rate = parseFloat(b.dataset.rate); localStorage.setItem('bw.rate', rate);
  $$('#rateToggle button').forEach(x => x.classList.toggle('on', x === b));
});
$$('#rateToggle button').forEach(x => x.classList.toggle('on', parseFloat(x.dataset.rate) === rate));

/* ---------- 背词会话 ---------- */
let queue = [], qi = 0, sessionNew = 0, sessionTotal = 0, failedOnce = new Set();
function refreshToday(){
  const due = dueWords().length;
  const d = dayState();
  const left = Math.max(0, NEW_PER_DAY - d.introduced);
  $('#dueCount').textContent = due + left > 0 ? `${due} 复习 + ${left} 新词` : '全部完成 🎉';
  $('#newLeft').textContent = left + ' 个';
  const total = NEW_PER_DAY + due;
  $('#todayBar').style.width = total ? Math.min(100, Math.round(d.finished / total * 100)) + '%' : '100%';
}
function startSession(){
  const d = dayState();
  const reviews = dueWords();
  const news = newWordsPool().slice(0, Math.max(0, NEW_PER_DAY - d.introduced));
  queue = [...reviews.map(w => ({ w, kind: '复习' })), ...news.map(w => ({ w, kind: '新词' }))];
  qi = 0; sessionNew = news.length; sessionTotal = queue.length; failedOnce = new Set();
  $('#doneArea').classList.add('hidden');
  if (!queue.length){ showDone(0, 0); return; }
  $('#startBtn').textContent = '继续学习';
  $('.today').classList.add('hidden');
  $('#cardArea').classList.remove('hidden');
  showCard();
}
function current(){ return queue[qi]; }
function showCard(){
  const item = current(); if (!item){ finishSession(); return; }
  const w = WORDMAP[item.w.toLowerCase()] || { w: item.w };
  $('#cardPos').textContent = `${qi + 1} / ${queue.length}`;
  $('#cardKind').textContent = item.kind;
  $('#cWord').textContent = w.w;
  $('#cPhon').textContent = w.ph || '';
  $('#cCover').classList.remove('hidden');
  $('#cBody').classList.add('hidden');
}
$('#revealBtn').addEventListener('click', () => {
  const item = current(); const w = WORDMAP[item.w.toLowerCase()] || { w: item.w };
  $('#cZh').textContent = w.zh || '';
  $('#cEn').textContent = w.en || '';
  const exs = EXAMPLES[item.w.toLowerCase()] || [];
  $('#cExamples').innerHTML = exs.length ? exs.map(x => `
    <div class="ex"><div class="tx"><div class="e">${esc(x.en)}</div><div class="z">${esc(x.zh)}</div></div>
    <button class="speak" data-say="${esc(x.en)}">🔊</button></div>`).join('')
    : '<div class="z">（暂无例句）</div>';
  $('#cCover').classList.add('hidden');
  $('#cBody').classList.remove('hidden');
});
$('#cSpeak').addEventListener('click', e => speak($('#cWord').textContent, e.currentTarget));
document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say, b);
});
$$('.grades button').forEach(b => b.addEventListener('click', () => {
  const item = current(); const g = b.dataset.g;
  const isNew = item.kind === '新词';
  grade(item.w, g);
  const d = dayState();
  if (isNew && !item.counted){ d.introduced++; item.counted = true; }
  if (g === 'again' && !failedOnce.has(item.w + qi)){ failedOnce.add(item.w + qi); queue.push({ w: item.w, kind: '错词重练', counted: true }); }
  else d.finished++;
  saveDay(d);
  qi++; showCard(); refreshToday();
}));
function finishSession(){
  $('#cardArea').classList.add('hidden');
  $('.today').classList.remove('hidden');
  showDone(sessionTotal, sessionNew);
}
function showDone(total, news){
  $('#doneSub').textContent = total ? `本轮共 ${total} 个词，其中新词 ${news} 个。错词已在本轮末尾重练。` : '今天没有到期词，新词额度也用完了，明天见。';
  $('#doneArea').classList.remove('hidden');
  refreshToday(); renderStats();
}
$('#startBtn').addEventListener('click', startSession);
$('#againBtn').addEventListener('click', startSession);

/* ---------- 查词 ---------- */
$('#dictInput').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  const box = $('#dictResults'); $('#dictDetail').innerHTML = '';
  if (!q){ box.innerHTML = ''; return; }
  const starts = [], contains = [];
  for (const x of WORDS){
    const lw = x.w.toLowerCase();
    if (lw.startsWith(q)) starts.push(x);
    else if (lw.includes(q)) contains.push(x);
    if (starts.length >= 20) break;
  }
  const res = [...starts, ...contains].slice(0, 20);
  box.innerHTML = res.length ? '' : '<div class="empty">词库里暂时没有这个词</div>';
  res.forEach(x => {
    const el = document.createElement('button');
    el.className = 'result-item glass';
    el.innerHTML = `<div><div class="rw">${esc(x.w)}</div><div class="rz">${esc((x.zh || '').slice(0, 26))}</div></div>${x.tag ? `<span class="tagchip">${esc(x.tag.toUpperCase())}</span>` : ''}`;
    el.addEventListener('click', () => showWordDetail(x));
    box.appendChild(el);
  });
});
function exHtml(word){
  const exs = EXAMPLES[word.toLowerCase()] || [];
  if (!exs.length) return '';
  return `<div class="examples">${exs.map(x => `
    <div class="ex"><div class="tx"><div class="e">${esc(x.en)}</div><div class="z">${esc(x.zh)}</div></div>
    <button class="speak" data-say="${esc(x.en)}">🔊</button></div>`).join('')}</div>`;
}
function showWordDetail(x){
  $('#dictDetail').innerHTML = `
    <div class="card glass" style="margin-top:12px">
      <div class="word-row"><div><div class="word" style="font-size:30px">${esc(x.w)}</div>
      <div class="phon">${esc(x.ph || '')}</div></div>
      <button class="speak big" id="dSpeak">🔊</button></div>
      <div class="zh">${esc(x.zh || '')}</div>
      <div class="en">${esc(x.en || '')}</div>
      ${exHtml(x.w)}
    </div>`;
  $('#dSpeak').addEventListener('click', e => speak(x.w, e.currentTarget));
  $('#dictDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 场景 ---------- */
let curScene = null, playing = false;
function renderScenes(){
  const box = $('#sceneList'); box.innerHTML = '';
  SCENES.forEach(sc => {
    const el = document.createElement('button');
    el.className = 'scene-item glass';
    el.innerHTML = `<div class="ic">${sc.icon}</div><div><div class="tt">${esc(sc.title)}</div><div class="ss">${esc(sc.sub)}</div></div><div class="cnt">${sc.sentences.length} 句</div>`;
    el.addEventListener('click', () => openScene(sc));
    box.appendChild(el);
  });
}
function openScene(sc){
  curScene = sc; stopPlay();
  $('#sceneList').classList.add('hidden');
  $('#sceneDetail').classList.remove('hidden');
  $('#sdTitle').textContent = `${sc.icon} ${sc.title}`;
  $('#sdSub').textContent = sc.sub;
  const box = $('#sdSentences'); box.innerHTML = '';
  sc.sentences.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'sent glass'; el.id = 'sent' + i;
    el.innerHTML = `<div class="n">${i + 1}</div><div class="tx"><div class="e">${esc(s.en)}</div><div class="z">${esc(s.zh)}</div></div><button class="speak" data-say="${esc(s.en)}">🔊</button>`;
    box.appendChild(el);
  });
  window.scrollTo({ top: 0 });
}
$('#sceneBack').addEventListener('click', () => {
  stopPlay();
  $('#sceneDetail').classList.add('hidden');
  $('#sceneList').classList.remove('hidden');
});
$('#hideZhBtn').addEventListener('click', e => {
  const box = $('#sdSentences'); const hide = !box.classList.contains('hidezh');
  box.classList.toggle('hidezh', hide);
  box.querySelectorAll('.z').forEach(z => z.style.visibility = hide ? 'hidden' : '');
  e.currentTarget.textContent = hide ? '显示中文' : '遮住中文自测';
});
function stopPlay(){ playing = false; speechSynthesis.cancel(); $$('.sent.now').forEach(x => x.classList.remove('now')); $('#playAllBtn').textContent = '▶ 整场连读'; }
$('#playAllBtn').addEventListener('click', () => {
  if (playing){ stopPlay(); return; }
  if (!curScene) return;
  playing = true; $('#playAllBtn').textContent = '⏸ 停止连读';
  let i = 0;
  const next = () => {
    if (!playing) return;
    if (i >= curScene.sentences.length){ stopPlay(); return; }
    $$('.sent.now').forEach(x => x.classList.remove('now'));
    const el = $('#sent' + i); if (el){ el.classList.add('now'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    const u = new SpeechSynthesisUtterance(curScene.sentences[i].en);
    u.lang = 'en-US'; if (voiceUS) u.voice = voiceUS; u.rate = rate;
    u.onend = u.onerror = () => { i++; next(); };
    speechSynthesis.speak(u);
  };
  speechSynthesis.cancel(); next();
});

/* ---------- 进度 ---------- */
function renderStats(){
  const keys = Object.keys(srs);
  $('#stLearned').textContent = keys.length;
  $('#stMastered').textContent = keys.filter(w => srs[w].r >= 3 && srs[w].iv >= 7).length;
  $('#stScenes').textContent = SCENES.length;
}
$('#resetBtn').addEventListener('click', () => {
  if (confirm('确定清空全部学习进度？')){ ['bw.srs.v1', 'bw.day.v1'].forEach(k => localStorage.removeItem(k)); location.reload(); }
});

/* ---------- 标签页 ---------- */
$$('.tabbar button').forEach(b => b.addEventListener('click', () => {
  stopPlay();
  $$('.tabbar button').forEach(x => x.classList.toggle('on', x === b));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  $('.title').textContent = { learn: '背词', dict: '查词', scenes: '场景', me: '进度' }[b.dataset.tab];
  if (b.dataset.tab === 'me') renderStats();
  if (b.dataset.tab === 'learn') refreshToday();
  window.scrollTo({ top: 0 });
}));

/* ---------- 启动 ---------- */
loadData().then(() => { refreshToday(); renderScenes(); renderStats(); })
  .catch(() => { $('#dueCount').textContent = '数据加载失败'; });
