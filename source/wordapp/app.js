'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanZh = s => String(s || '').replace(/\\r\\n|\\n|\\r|\r|\n/g, '；').replace(/；{2,}/g, '；');
const DAY = 86400000;
const NEW_PER_DAY = 20;

/* ---------- data ---------- */
let WORDS = [], EXAMPLES = {}, SCENES = [], PHRASES = [], LOOKUP = {};
let WORDMAP = {};   // lower -> word entry (1500 main words)

async function loadJSON(url, fallback) {
  try { const r = await fetch(url); if (!r.ok) throw 0; return await r.json(); }
  catch { return fallback; }
}

/* ---------- persistent state ---------- */
let srs = {}, dayRec = { date: '', introduced: 0 }, favs = [];
try { srs = JSON.parse(localStorage.getItem('bw.srs.v1') || '{}'); } catch {}
try { dayRec = JSON.parse(localStorage.getItem('bw.day.v1') || '{"date":"","introduced":0}'); } catch {}
try { favs = JSON.parse(localStorage.getItem('bw.fav.v1') || '[]'); } catch {}
const favSet = new Set(favs);
function todayStr() { return new Date().toDateString(); }
if (dayRec.date !== todayStr()) { dayRec = { date: todayStr(), introduced: 0 }; persistDay(); }
function persistSrs() { localStorage.setItem('bw.srs.v1', JSON.stringify(srs)); }
function persistDay() { localStorage.setItem('bw.day.v1', JSON.stringify(dayRec)); }
function persistFav() { localStorage.setItem('bw.fav.v1', JSON.stringify([...favSet])); }
function isFav(w) { return favSet.has(w); }
function toggleFav(w) {
  if (favSet.has(w)) favSet.delete(w); else favSet.add(w);
  persistFav(); return favSet.has(w);
}

/* ---------- TTS ---------- */
let rate = parseFloat(localStorage.getItem('bw.rate') || '0.92');
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'en-US') || vs.find(v => v.lang && v.lang.startsWith('en')) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let playingBtn = null;
function clearPlaying() { if (playingBtn) { playingBtn.classList.remove('playing'); playingBtn = null; } }
function speak(text, btn) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); clearPlaying();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; if (voice) u.voice = voice; u.rate = rate;
  if (btn) { btn.classList.add('playing'); playingBtn = btn; u.onend = u.onerror = () => { if (playingBtn === btn) clearPlaying(); }; }
  speechSynthesis.speak(u);
}
let seqToken = 0;
function speakSeq(texts, onIdx) {
  const my = ++seqToken;
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); clearPlaying();
  let i = 0;
  const next = () => {
    if (my !== seqToken) return;
    if (i >= texts.length) { onIdx(-1); return; }
    onIdx(i);
    const u = new SpeechSynthesisUtterance(texts[i]);
    u.lang = 'en-US'; if (voice) u.voice = voice; u.rate = rate;
    i++; u.onend = next; u.onerror = next;
    speechSynthesis.speak(u);
  };
  next();
  return () => { if (my === seqToken) { seqToken++; speechSynthesis.cancel(); onIdx(-1); } };
}
function stopAllSpeech() { seqToken++; if ('speechSynthesis' in window) speechSynthesis.cancel(); clearPlaying(); }

/* ---------- tappable words ---------- */
function tokenize(en) {
  return esc(en).replace(/[A-Za-z][A-Za-z'\-]*/g, m => `<span class="w" data-w="${encodeURIComponent(m.toLowerCase())}">${m}</span>`);
}
document.addEventListener('click', e => {
  const w = e.target.closest('.w');
  if (w) { e.stopPropagation(); openSheet(decodeURIComponent(w.dataset.w)); }
});

/* ---------- word detail sheet ---------- */
let sheetTarget = null; // headword to star
function resolveWord(raw) {
  const t = String(raw || '').toLowerCase().trim();
  if (!t) return null;
  if (WORDMAP[t]) { const e = WORDMAP[t]; return { head: t, ph: e.ph, zh: e.zh, en: e.en, main: true }; }
  const lk = LOOKUP[t];
  if (lk) return { head: lk.to || t, shown: t, ph: lk.ph, zh: lk.zh, en: '', main: false };
  return { head: t, ph: '', zh: '', en: '', main: false };
}
function openSheet(raw) {
  const r = resolveWord(raw); if (!r) return;
  sheetTarget = r.head;
  $('#shWord').textContent = r.head;
  $('#shPh').textContent = r.ph ? '/' + r.ph + '/' : '';
  const toEl = $('#shTo');
  if (r.shown && r.shown !== r.head) { toEl.textContent = `你点的是 “${r.shown}”，这是它的原形`; toEl.classList.remove('hidden'); }
  else toEl.classList.add('hidden');
  $('#shZh').textContent = cleanZh(r.zh) || '暂无释义（可能是不规则变化或专有名词）';
  $('#shEn').textContent = r.en || '';
  const exs = r.main ? (EXAMPLES[r.head] || []) : [];
  $('#shExamples').innerHTML = exs.length
    ? '<div class="ex-list">' + exs.map(x => `<div class="ex"><div class="tx"><div class="e">${tokenize(x.en)}</div><div class="z">${esc(x.zh)}</div></div><button class="speak-btn sm" data-speak="${esc(x.en)}" type="button">🔊</button></div>`).join('') + '</div>'
    : '';
  bindSpeak($('#shExamples'));
  updateSheetStar();
  $('#shSpeak').onclick = e => speak(r.head, e.currentTarget);
  $('#sheetWrap').classList.remove('hidden');
}
function updateSheetStar() {
  const b = $('#shStar');
  const on = sheetTarget && isFav(sheetTarget);
  b.textContent = on ? '★' : '☆'; b.classList.toggle('on', !!on);
}
$('#shStar').addEventListener('click', () => {
  if (!sheetTarget) return;
  toggleFav(sheetTarget); updateSheetStar(); syncCardStar(); renderCollection();
});
$('#shClose').addEventListener('click', () => $('#sheetWrap').classList.add('hidden'));
$('#sheetBackdrop').addEventListener('click', () => $('#sheetWrap').classList.add('hidden'));

/* speak buttons rendered dynamically: <button data-speak="text"> */
function bindSpeak(root) {
  root.querySelectorAll('[data-speak]').forEach(b => {
    b.onclick = e => { e.stopPropagation(); speak(b.dataset.speak, b); };
  });
}

/* ---------- SRS ---------- */
function applyGrade(key, g) {
  const now = Date.now();
  let e = srs[key]; const isNew = !e;
  if (!e) e = srs[key] = { r: 0, iv: 0, due: now };
  if (g === 'again') { e.r = 0; e.iv = 0; e.due = now + 10 * 60000; }
  else if (g === 'hard') { e.r += 1; e.iv = Math.max(1, e.iv ? e.iv * 1.4 : 1); e.due = now + e.iv * DAY; }
  else { e.r += 1; e.iv = e.iv ? e.iv * 2.2 : 2.5; e.due = now + e.iv * DAY; }
  persistSrs(); return isNew;
}
function dueItems() {
  const now = Date.now(), out = [];
  for (const [key, e] of Object.entries(srs)) {
    if (e.due > now) continue;
    if (key.startsWith('w:')) { const w = key.slice(2); if (WORDMAP[w]) out.push({ t: 'w', word: w, due: e.due }); }
    else if (key.startsWith('p:')) {
      const rest = key.slice(2), cut = rest.lastIndexOf(':');
      const pack = PHRASES.find(p => p.id === rest.slice(0, cut));
      const idx = +rest.slice(cut + 1);
      if (pack && pack.phrases[idx]) out.push({ t: 'p', pack, idx, due: e.due });
    }
  }
  return out.sort((a, b) => a.due - b.due);
}
function unlearnedWords() { return WORDS.filter(w => !srs['w:' + w.w.toLowerCase()]); }
function quotaLeft() { return Math.max(0, NEW_PER_DAY - dayRec.introduced); }

/* ---------- session engine ---------- */
let S = null; // {origin, title, queue, idx, counts, total}
function startSession(origin, items, title) {
  stopAllSpeech();
  S = { origin, title, queue: items.slice(), idx: 0, counts: { again: 0, hard: 0, good: 0 }, total: items.length };
  showView('session');
  $('#sessionDone').classList.add('hidden');
  $('#cardBox').classList.remove('hidden');
  if (!S.queue.length) { finishSession(); return; }
  renderCard();
}
function sessionKey(item) { return item.t === 'w' ? 'w:' + item.word : 'p:' + item.pack.id + ':' + item.idx; }
function currentItem() { return S.queue[S.idx]; }
function syncCardStar() {
  const b = $('#cardStar');
  if (!S || !currentItem() || currentItem().t !== 'w') { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  const on = isFav(currentItem().word);
  b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on);
}
$('#cardStar').addEventListener('click', () => {
  const it = currentItem(); if (!it || it.t !== 'w') return;
  toggleFav(it.word); syncCardStar(); updateSheetStar(); renderCollection();
});
function renderCard() {
  const it = currentItem(); if (!it) return finishSession();
  $('#cardPos').textContent = (S.idx + 1) + ' / ' + S.queue.length;
  $('#sessBar').style.width = (S.total ? Math.round(S.idx / S.queue.length * 100) : 0) + '%';
  $('#gradeRow').classList.add('hidden');
  syncCardStar();
  const box = $('#cardBox');
  if (it.t === 'w') {
    const e = WORDMAP[it.word];
    box.innerHTML = `<div class="card glass">
      <div class="kick">单词 WORD</div>
      <div class="word-top"><div><div class="w-word">${esc(e.w)}</div><div class="ph">${e.ph ? '/' + esc(e.ph) + '/' : ''}</div></div>
      <button class="speak-btn" data-speak="${esc(e.w)}" type="button">🔊</button></div>
      <div id="coverArea"><div class="cover">先想一想：它是什么意思？<br><button class="btn primary" id="revealBtn" type="button">显示释义</button></div></div>
      <div id="backArea" class="hidden">
        <div class="zh">${esc(cleanZh(e.zh))}</div>
        ${e.en ? `<div class="en-def">${esc(e.en)}</div>` : ''}
        ${(EXAMPLES[it.word] || []).length ? '<div class="ex-list">' + EXAMPLES[it.word].map(x => `<div class="ex"><div class="tx"><div class="e">${tokenize(x.en)}</div><div class="z">${esc(x.zh)}</div></div><button class="speak-btn sm" data-speak="${esc(x.en)}" type="button">🔊</button></div>`).join('') + '</div>' : ''}
      </div></div>`;
  } else {
    const p = it.pack.phrases[it.idx];
    box.innerHTML = `<div class="card glass">
      <div class="kick">短语 PHRASE · ${esc(it.pack.title)}</div>
      <div class="word-top"><div><div class="p-word">${tokenize(p.en)}</div></div>
      <button class="speak-btn" data-speak="${esc(p.en)}" type="button">🔊</button></div>
      <div id="coverArea"><div class="cover">先想一想：中文是什么意思？<br><button class="btn primary" id="revealBtn" type="button">显示释义</button></div></div>
      <div id="backArea" class="hidden">
        <div class="zh">${esc(p.zh)}</div>
        <div class="ex-list"><div class="ex"><div class="tx"><div class="e">${tokenize(p.ex.en)}</div><div class="z">${esc(p.ex.zh)}</div></div><button class="speak-btn sm" data-speak="${esc(p.ex.en)}" type="button">🔊</button></div></div>
      </div></div>`;
  }
  bindSpeak(box);
  $('#revealBtn').onclick = () => {
    $('#coverArea').classList.add('hidden');
    $('#backArea').classList.remove('hidden');
    $('#gradeRow').classList.remove('hidden');
  };
}
$$('#gradeRow .grade').forEach(b => b.addEventListener('click', () => {
  if (!S) return;
  const it = currentItem(); const g = b.dataset.g;
  S.counts[g]++;
  const isNew = applyGrade(sessionKey(it), g);
  if (isNew && it.t === 'w' && (S.origin === 'learn' || S.origin === 'collection')) {
    dayRec.introduced++; persistDay();
  }
  if (g === 'again' && !it._rq) { it._rq = true; S.queue.push(it); }
  S.idx++;
  if (S.idx >= S.queue.length) finishSession(); else renderCard();
}));
function finishSession() {
  stopAllSpeech();
  $('#cardBox').classList.add('hidden');
  $('#gradeRow').classList.add('hidden');
  $('#cardStar').classList.add('hidden');
  $('#sessBar').style.width = '100%';
  $('#cardPos').textContent = '';
  const d = $('#sessionDone');
  d.classList.remove('hidden');
  $('#doneTitle').textContent = S && S.total ? S.title + '，学完了' : '暂时没有内容';
  $('#doneStats').textContent = S && S.total
    ? `共 ${S.total} 个 · 认识 ${S.counts.good} · 模糊 ${S.counts.hard} · 不认识 ${S.counts.again}（不认识的已安排 10 分钟后复习）`
    : '去 Learn 学点新内容，这里就会有复习任务了。';
}
$('#doneBtn').addEventListener('click', () => { const o = S ? S.origin : 'learn'; S = null; switchTab(o); });
$('#quitSession').addEventListener('click', () => { const o = S ? S.origin : 'learn'; S = null; stopAllSpeech(); switchTab(o); });

/* ---------- views & tabs ---------- */
function showView(name) {
  ['learn', 'review', 'collection', 'session'].forEach(v => $('#view-' + v).classList.toggle('hidden', v !== name));
  $$('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  window.scrollTo(0, 0);
}
function switchTab(name) {
  stopAllSpeech();
  showView(name);
  if (name === 'learn') renderLearnHome();
  if (name === 'review') renderReview();
  if (name === 'collection') renderCollection();
}
$$('.tabbar button').forEach(b => b.addEventListener('click', () => { S = null; switchTab(b.dataset.tab); }));

/* ---------- Learn home ---------- */
function renderLearnHome() {
  const left = Math.min(quotaLeft(), unlearnedWords().length);
  $('#newLeft').textContent = left;
  $('#dueBadge').textContent = dueItems().length;
  $('#todayBar').style.width = Math.min(100, dayRec.introduced / NEW_PER_DAY * 100) + '%';
}
$('#hubVocab').addEventListener('click', () => {
  const items = unlearnedWords().slice(0, quotaLeft()).map(w => ({ t: 'w', word: w.w.toLowerCase() }));
  startSession('learn', items, '今日单词');
});
$('#hubScenario').addEventListener('click', () => {
  $('#learnHome').classList.add('hidden');
  $('#phraseSection').classList.add('hidden');
  $('#scenarioSection').classList.remove('hidden');
  renderSceneList(); window.scrollTo(0, 0);
});
$('#hubPhrase').addEventListener('click', () => {
  $('#learnHome').classList.add('hidden');
  $('#scenarioSection').classList.add('hidden');
  $('#phraseSection').classList.remove('hidden');
  renderPhraseList(); window.scrollTo(0, 0);
});
$('#scBack').addEventListener('click', backToLearnHome);
$('#phBack').addEventListener('click', backToLearnHome);
function backToLearnHome() {
  stopAllSpeech();
  $('#scenarioSection').classList.add('hidden');
  $('#phraseSection').classList.add('hidden');
  $('#learnHome').classList.remove('hidden');
  window.scrollTo(0, 0);
}

/* search */
$('#searchInput').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  const box = $('#searchResults');
  if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const hits = [];
  for (const w of WORDS) { if (w.w.toLowerCase().startsWith(q)) hits.push(w); if (hits.length >= 20) break; }
  if (hits.length < 20) for (const w of WORDS) { const lw = w.w.toLowerCase(); if (!lw.startsWith(q) && lw.includes(q)) { hits.push(w); if (hits.length >= 20) break; } }
  box.innerHTML = hits.length
    ? hits.map(w => `<button class="result-row" data-word="${esc(w.w.toLowerCase())}" type="button"><span><span class="rw">${esc(w.w)}</span><div class="rz">${esc(cleanZh(w.zh).slice(0, 42))}</div></span><span class="tag">${esc(w.tag || '')}</span></button>`).join('')
    : '<div class="result-row"><span class="rz">没找到这个词</span></div>';
  box.classList.remove('hidden');
  box.querySelectorAll('[data-word]').forEach(b => b.onclick = () => openSheet(b.dataset.word));
});

/* ---------- Scenario ---------- */
let curScene = null, stopSeq = null, zhHidden = false;
function renderSceneList() {
  $('#sceneDetail').classList.add('hidden');
  const list = $('#sceneList');
  list.classList.remove('hidden');
  list.innerHTML = SCENES.map((s, i) => `<button class="scene-item glass" data-i="${i}" type="button"><span class="ic">${esc(s.icon)}</span><span><div class="tt">${esc(s.title)}</div><div class="ss">${esc(s.sub)}</div></span><span class="cnt">${s.sentences.length} 句 ›</span></button>`).join('');
  list.querySelectorAll('.scene-item').forEach(b => b.onclick = () => openScene(+b.dataset.i));
}
function openScene(i) {
  curScene = SCENES[i]; zhHidden = false;
  $('#hideZhBtn').textContent = '遮住中文自测';
  $('#sceneList').classList.add('hidden');
  $('#sceneDetail').classList.remove('hidden');
  renderSentences(); window.scrollTo(0, 0);
}
function renderSentences() {
  const list = $('#sentList');
  list.innerHTML = curScene.sentences.map((s, i) => `<div class="sent glass" data-i="${i}"><span class="n">${i + 1}</span><div class="tx"><div class="e">${tokenize(s.en)}</div><div class="z" ${zhHidden ? 'style="visibility:hidden"' : ''}>${esc(s.zh)}</div></div><button class="speak-btn sm" data-speak="${esc(s.en)}" type="button">🔊</button></div>`).join('');
  bindSpeak(list);
}
$('#hideZhBtn').addEventListener('click', () => {
  zhHidden = !zhHidden;
  $('#hideZhBtn').textContent = zhHidden ? '显示中文' : '遮住中文自测';
  renderSentences();
});
$('#playAllBtn').addEventListener('click', () => {
  if (stopSeq) { stopSeq(); stopSeq = null; $('#playAllBtn').textContent = '▶ 整场连读'; return; }
  const rows = $$('#sentList .sent');
  $('#playAllBtn').textContent = '⏸ 停止连读';
  stopSeq = speakSeq(curScene.sentences.map(s => s.en), i => {
    rows.forEach(r => r.classList.toggle('now', +r.dataset.i === i));
    if (i >= 0 && rows[i]) rows[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (i === -1) { stopSeq = null; $('#playAllBtn').textContent = '▶ 整场连读'; }
  });
});

/* ---------- Phrase ---------- */
let curPack = null;
function renderPhraseList() {
  $('#phraseDetail').classList.add('hidden');
  const list = $('#phraseList');
  list.classList.remove('hidden');
  list.innerHTML = PHRASES.map((p, i) => {
    const learned = p.phrases.filter((_, j) => srs['p:' + p.id + ':' + j]).length;
    return `<button class="scene-item glass" data-i="${i}" type="button"><span class="ic">${esc(p.icon)}</span><span><div class="tt">${esc(p.title)}</div><div class="ss">${esc(p.sub)}</div></span><span class="cnt">${learned ? '已学 ' + learned + '/' : ''}${p.phrases.length} 句 ›</span></button>`;
  }).join('');
  list.querySelectorAll('.scene-item').forEach(b => b.onclick = () => openPack(+b.dataset.i));
}
function openPack(i) {
  curPack = PHRASES[i];
  $('#phraseList').classList.add('hidden');
  $('#phraseDetail').classList.remove('hidden');
  const rows = $('#phraseRows');
  rows.innerHTML = curPack.phrases.map(p => `<div class="phrase-row glass"><div class="row-flex"><div class="tx"><div class="pe">${tokenize(p.en)}</div><div class="pz">${esc(p.zh)}</div></div><button class="speak-btn sm" data-speak="${esc(p.en)}" type="button">🔊</button></div><div class="px">${tokenize(p.ex.en)}<div class="pxz">${esc(p.ex.zh)}</div></div></div>`).join('');
  bindSpeak(rows);
  window.scrollTo(0, 0);
}
$('#learnPackBtn').addEventListener('click', () => {
  if (!curPack) return;
  startSession('learn', curPack.phrases.map((_, j) => ({ t: 'p', pack: curPack, idx: j })), '短语 · ' + curPack.title);
});

/* ---------- Review ---------- */
function fmtTime(ts) {
  return new Date(ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function renderReview() {
  const due = dueItems();
  const dw = due.filter(d => d.t === 'w').length, dp = due.length - dw;
  $('#reviewCount').textContent = due.length;
  $('#reviewSub').textContent = due.length ? `个到期要复习（单词 ${dw} · 短语 ${dp}）` : '现在没有到期的复习 🎉';
  $('#reviewStart').disabled = !due.length;
  let next = Infinity;
  for (const e of Object.values(srs)) if (e.due < next) next = e.due;
  $('#nextDueHint').textContent = !isFinite(next) ? '还没开始学：先去 Learn 学第一组词吧。'
    : due.length ? '' : '下一个复习：' + fmtTime(next);
  const keys = Object.keys(srs);
  $('#statWords').textContent = keys.filter(k => k.startsWith('w:')).length;
  $('#statPhrases').textContent = keys.filter(k => k.startsWith('p:')).length;
  $('#statMastered').textContent = Object.values(srs).filter(e => e.r >= 3 && e.iv >= 7).length;
  $('#statFav').textContent = favSet.size;
}
$('#reviewStart').addEventListener('click', () => startSession('review', dueItems(), '复习'));
$('#resetBtn').addEventListener('click', () => {
  if (!confirm('确定要清空全部学习进度和收藏吗？')) return;
  srs = {}; persistSrs();
  dayRec = { date: todayStr(), introduced: 0 }; persistDay();
  favSet.clear(); persistFav();
  renderReview(); renderLearnHome(); renderCollection();
  alert('已清空。');
});

/* ---------- Collection ---------- */
function renderCollection() {
  const list = $('#favList');
  const words = [...favSet].sort();
  $('#favEmpty').classList.toggle('hidden', words.length > 0);
  $('#favLearnBtn').disabled = !words.length;
  $('#favLearnBtn').textContent = words.length ? `学习收藏词（${words.length}）` : '学习收藏词';
  list.innerHTML = words.map(w => {
    const r = resolveWord(w) || { ph: '', zh: '' };
    return `<div class="fav-row glass" data-word="${esc(w)}"><div class="tx"><div class="fw">${esc(w)}</div><div class="fz">${esc(cleanZh(r.zh).slice(0, 40))}</div></div><button class="speak-btn sm" data-speak="${esc(w)}" type="button">🔊</button><button class="star-btn on" data-unfav="${esc(w)}" type="button">★</button></div>`;
  }).join('');
  bindSpeak(list);
  list.querySelectorAll('[data-unfav]').forEach(b => b.onclick = e => { e.stopPropagation(); toggleFav(b.dataset.unfav); renderCollection(); syncCardStar(); updateSheetStar(); });
  list.querySelectorAll('.fav-row').forEach(r => r.onclick = () => openSheet(r.dataset.word));
}
$('#favLearnBtn').addEventListener('click', () => {
  const items = [...favSet].sort().filter(w => WORDMAP[w]).map(w => ({ t: 'w', word: w }));
  startSession('collection', items, '收藏词');
});

/* ---------- rate toggle ---------- */
function renderRate() {
  $('#rateSlow').classList.toggle('on', rate < 0.85);
  $('#rateNorm').classList.toggle('on', rate >= 0.85);
}
$('#rateSlow').addEventListener('click', () => { rate = 0.75; localStorage.setItem('bw.rate', rate); renderRate(); });
$('#rateNorm').addEventListener('click', () => { rate = 0.92; localStorage.setItem('bw.rate', rate); renderRate(); });

/* ---------- boot ---------- */
(async function init() {
  [WORDS, EXAMPLES, SCENES, PHRASES, LOOKUP] = await Promise.all([
    loadJSON('data/words.json', []), loadJSON('data/examples.json', {}),
    loadJSON('data/scenes.json', []), loadJSON('data/phrases.json', []),
    loadJSON('data/lookup.json', {}),
  ]);
  WORDS.forEach(w => { WORDMAP[w.w.toLowerCase()] = w; });
  renderRate(); renderLearnHome();
})();
