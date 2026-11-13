'use strict';
/* ================= helpers ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s == null? '': s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
function toast(msg, ms) {
const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), ms || 2600);
}
const store = {
get(k, d) { try { const v = localStorage.getItem(k); return v? JSON.parse(v): d;} catch (e) { return d;}},
set(k, v) { try { localStorage.setItem(k, JSON.stringify(v));} catch (e) {}}
};

/* ================= icons (SF Symbols paths) ================= */
const P = {
gear: '<path d="M12 15.75A3.75 3.75 0 1 1 12 8.25a3.75 3.75 0 0 1 0 7.5Zm9.3-2.06a.75.75 0 0 0-.53-.92l-2.1-.5a7.6 7.6 0 0 0-.62-1.49l1.28-1.76a.75.75 0 0 0-.1-1L17.6 5.9a.75.75 0 0 0-1-.1l-1.76 1.28a7.6 7.6 0 0 0-1.49-.62l-.5-2.1a.75.75 0 0 0-.92-.53h-2.36a.75.75 0 0 0-.92.53l-.5 2.1a7.6 7.6 0 0 0-1.49.62L4.9 5.8a.75.75 0 0 0-1.1L1.77 8.02a.75.75 0 0 0-.1 1l1.28 1.76a7.6 7.6 0 0 0-.62 1.49l-2.1.5a.75.75 0 0 0-.53.92v2.36c0.35.25.66.53.92l2.1.5c.15.53.36 1.03.62 1.49L1.67 20.7a.75.75 0 0 0.1 1l2.13 2.12a.75.75 0 0 0 1.1l1.76-1.28c.46.26.96.47 1.49.62l.5 2.1c.08.35.47.53.92.53h2.36c.45 0.84-.18.92-.53l.5-2.1a7.6 7.6 0 0 0 1.49-.62l1.76 1.28a.75.75 0 0 0 1-.1l2.13-2.12a.75.75 0 0 0.1-1l-1.28-1.76c.26-.46.47-.96.62-1.49l2.1-.5a.75.75 0 0 0.53-.92Z" transform="scale(0.92) translate(1 1)"/>',
back: '<path d="M14.9 4.6a.9.9 0 0 1 0 1.27L8.77 12l6.13 6.13a.9.9 0 1 1-1.27 1.27l-6.77-6.76a.9.9 0 0 1 0-1.28l6.77-6.76a.9.9 0 0 1 1.27 0Z"/>',
speaker: '<path d="M3 9.75v4.5c0.41.34.75.75.75H7.5l5.03 4.19c.62.52 1.47.07 1.47-.72V5.53c0-.79-.85-1.24-1.47-.72L7.5 9H3.75A.75.75 0 0 0 3 9.75Zm13.28-4.9a.75.75 0 0 1 1.06 0c1.6 1.6 2.41 3.72 2.41 5.9s-.8 4.3-2.41 5.9a.75.75 0 1 1-1.06-1.06c1.32-1.32 2-2.96 2-4.84s-.68-3.52-2-4.84a.75.75 0 0 1 0-1.06ZM15.1 8a.75.75 0 0 1 1.06 0c.86.86 1.34 2 1.34 3.25s-.48 2.39-1.34 3.25a.75.75 0 1 1-1.06-1.06c.58-.58.84-1.37.84-2.19S15.68 9.64 15.1 9.06a.75.75 0 0 1 0-1.06Z" transform="translate(0 -1)"/>',
globe: '<path d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5ZM9.62 4.12c-.9.39-1.86 1.3-2.6 2.83H4.6a8.28 8.28 0 0 1 5.02-2.83ZM4.6 17.05h2.42c.74 1.53 1.7 2.44 2.6 2.83a8.28 8.28 0 0 1-5.02-2.83Zm2.8 0h3.85v3.34c-1.04-.18-2.5-1.1-3.85-3.34Zm0-6.42V7.52h3.85v3.11Zm0 1.5h3.85V15.4H7.4Zm-3.98-.75c0-1.03.17-2.02.48-2.94h2.7v3.19H3.47c-.03 0-.05-.13-.05-.25Zm.48 4.18a8.3 8.3 0 0 1-.43-2.22H6.6v3.05Zm12.68-8.61c-.74-1.53-1.7-2.44-2.6-2.83a8.28 8.28 0 0 1 5.02 2.83Zm-3.33.57v3.11h3.85a8.3 8.3 0 0 0-.69-3.11Zm3.85 4.56h-3.85V8.97h3.16c.31.92.48 1.91.48 2.94 0.12-.02.25-.05.25Zm-3.85 1.32h3.6a8.3 8.3 0 0 1-.43 2.22h-3.17Zm0 7c1.04-.18 2.5-1.1 3.85-3.34h-3.85Zm-1.5-16.6v3.72H8.73c1.35-2.24 2.81-3.16 3.85-3.16Zm0 16.6v-3.34H8.73c1.35 2.24 2.81 3.16 3.85 3.34Z" transform="scale(0.96) translate(0.5 0.5)"/>',
trash: '<path d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h1.5A2.25 2.25 0 0 1 15 3.75H21a.75.75 0 0 1 0 1.5h-.63l-.86 12.88A2.25 2.25 0 0 1 17.27 20.25H6.73a2.25 2.25 0 0 1-2.24-2.12L3.63 5.25H3a.75.75 0 0 1 0-1.5Zm3.75 0v-.75a.75.75 0 0 0-.75-.75h-.75a.75.75 0 0 0-.75.75v.75ZM8.63 8.06a.75.75 0 0 0-.68.81l.5 7.5a.75.75 0 1 0 1.5-.1l-.5-7.5a.75.75 0 0 0-.82-.71Zm6.74 0a.75.75 0 0 0-.82.71l-.5 7.5a.75.75 0 1 0 1.5.1l.5-7.5a.75.75 0 0 0-.68-.81Z"/>'
};
function icon(name) { return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + (P[name] || '') + '</svg>';}

/* ================= LLM config ================= */
const PROVIDERS = {
openai: { name: 'OpenAI', base: 'https://api.openai.com/v1', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1']},
deepseek: { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner']},
custom: { name: '自定义', base: '', models: []}
};
let cfg = store.get('bw.llm.v1', null);
if (!cfg ||!cfg.provider) cfg = { provider: 'openai', base: PROVIDERS.openai.base, key: '', model: 'gpt-4o-mini'};
function saveCfg() { store.set('bw.llm.v1', cfg);}
function hasKey() { return!!(cfg.key && cfg.key.trim() && cfg.base && cfg.base.trim() && cfg.model && cfg.model.trim());}
function endpoint() {
let b = (cfg.base || '').trim().replace(/\/+$/, '');
if (b.endsWith('/chat/completions')) return b;
return b + '/chat/completions';
}
async function llm(messages, opts) {
opts = opts || {};
const ctl = new AbortController();
const timer = setTimeout(() => ctl.abort(), opts.timeout || 60000);
try {
const res = await fetch(endpoint(), {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key.trim()},
body: JSON.stringify({ model: cfg.model.trim(), messages: messages, temperature: opts.temperature!= null? opts.temperature: 0.7}),
signal: ctl.signal
});
const data = await res.json().catch(() => null);
if (!res.ok) {
const m = data && data.error && (data.error.message || data.error.code) || ('HTTP ' + res.status);
throw new Error(m);
}
const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
if (!text) throw new Error('接口没有返回内容');
return text;
} catch (e) {
if (e.name === 'AbortError') throw new Error('请求超时，请重试');
if (e instanceof TypeError) throw new Error('连不上接口：检查地址、网络，或该接口不支持浏览器直连（CORS）');
throw e;
} finally { clearTimeout(timer);}
}

/* ================= prompts ================= */
const SYS_ROLE = [
'You are an English speaking-practice roleplay partner for a Chinese learner (English level: CET-4; use simple words and short sentences).',
'The user gives you a scenario. You play the counterpart (officer, landlord, clerk, customer, coworker, etc.). The user plays themselves.',
'',
'Your FIRST reply must use exactly this structure:',
'\u3010场景\u3011<1-2 sentences in Chinese: the setting and who you are>',
'\u3010任务\u3011<the user\'s concrete goal(s), one line in Chinese>',
'====',
'<your opening line in English, in character>',
'',
'Rules for every reply:',
'- Stay in character. Natural, simple English: short sentences, common words. Usually 1-3 sentences.',
'- Keep the scene moving toward the user\'s task. Ask questions, react realistically.',
'- If the user\'s last message has grammar or word-choice mistakes, begin your reply with ONE line in this exact format:',
'✎ <the corrected version of their sentence>（<a very short note in Chinese>）',
'then continue in character from the next line. If there are no real mistakes, do not add the ✎ line. Do not over-correct tiny issues.',
'- Never break character to lecture. No long explanations.',
'- When the user\'s task is clearly accomplished, wrap up the scene naturally in character.'
].join('\n');
const SYS_HINT = 'You help a Chinese learner of English during a roleplay. Based on the scenario and conversation, suggest ONE natural, simple English sentence the learner can say next. Reply in exactly this format:\n<the English sentence>\n|<its Chinese meaning>\nNothing else.';
const SYS_TRANSLATE = 'Translate the user\'s English text into natural, clear Chinese. Output only the translation.';
const SYS_SUMMARY = [
'You are reviewing an English roleplay practice session for a Chinese learner. Reply in Chinese, in exactly this structure:',
'\u3010完成情况\u3011<did the user achieve the scenario goal? 1-2 sentences>',
'\u3010纠错汇总\u3011<up to 5 items, one per line, format: 原句 → 改句（简注）. If none, write 无>',
'\u3010一句话\u3011<one short encouraging comment>',
'Keep it brief and concrete.'
].join('\n');

/* ================= sessions ================= */
let sessions = store.get('bw.scenes.v1', []);
let cur = null; // current session object
let busy = false;
function saveSessions() { store.set('bw.scenes.v1', sessions.slice(0, 30));}
function apiMessages(s) {
const ms = [{ role: 'system', content: SYS_ROLE}, { role: 'user', content: 'Scenario: ' + s.scenario + '\nStart the roleplay now.'}];
s.msgs.forEach(m => ms.push({ role: m.r === 'u'? 'user': 'assistant', content: m.t}));
return ms;
}
function displayParts(m) {
if (m.r === 'u') return { text: m.t};
let t = m.t, setup = null, fix = null;
if (t.indexOf('====') >= 0) {
const head = t.split('====')[0];
const rest = t.slice(t.indexOf('====') + 4).replace(/^\s+/, '');
const sm = head.match(/\u3010场景\u3011\s*([\s\S]*?)(?=\u3010任务\u3011|$)/);
const tm = head.match(/\u3010任务\u3011\s*([\s\S]*)$/);
setup = { scene: sm? sm[1].trim(): '', task: tm? tm[1].trim(): ''};
t = rest;
}
const lines = t.split('\n');
if (lines[0] && lines[0].trim().indexOf('✎') === 0) {
fix = lines[0].trim().replace(/^✎\s*/, '');
t = lines.slice(1).join('\n').replace(/^\s+/, '');
}
return { setup: setup, fix: fix, text: t};
}
function plainTranscript(s) {
return s.msgs.map(m => {
const p = displayParts(m);
return (m.r === 'u'? 'Me: ': 'Partner: ') + p.text;
}).join('\n');
}

/* ================= views ================= */
function show(view) {
['home', 'chat', 'summary', 'settings'].forEach(v => $('view-' + v).classList.toggle('hidden', v!== view));
$('topbar').style.display = (view === 'chat')? 'none': '';
window.scrollTo(0, 0);
}

/* ---- home ---- */
function renderHome() {
$('keyBanner').classList.toggle('hidden', hasKey());
const wrap = $('historyWrap'), list = $('historyList');
if (!sessions.length) { wrap.classList.add('hidden'); list.innerHTML = ''; return;}
wrap.classList.remove('hidden');
list.innerHTML = sessions.map(s => {
const turns = s.msgs.filter(m => m.r === 'u').length;
const d = new Date(s.ts);
const ds = (d.getMonth() + 1) + '月' + d.getDate() + '日';
return '<div class="hist-item" data-id="' + s.id + '"><div class="hist-tx"><div class="hist-t">' + esc(s.scenario) + '</div>' +
'<div class="hist-s">' + ds + ' · 对话 ' + turns + ' 轮' + (s.summary? ' · 已小结': '') + '</div></div>' +
'<button class="hist-del" data-del="' + s.id + '" aria-label="删除">' + icon('trash') + '</button></div>';
}).join('');
list.querySelectorAll('.hist-item').forEach(el => {
el.addEventListener('click', e => {
if (e.target.closest('[data-del]')) return;
openSession(el.getAttribute('data-id'));
});
});
list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', e => {
e.stopPropagation();
sessions = sessions.filter(s => s.id!== b.getAttribute('data-del'));
saveSessions(); renderHome();
}));
}

/* ---- chat ---- */
function renderMsgs() {
const box = $('msgList');
box.innerHTML = cur.msgs.map((m, i) => {
const p = displayParts(m);
if (m.r === 'u') return '<div class="msg me"><div class="msg-col"><div class="bubble">' + esc(p.text) + '</div></div></div>';
let h = '<div class="msg ai"><div class="msg-col">';
if (p.setup) {
h += '<div class="setup-card">' +
(p.setup.scene? '<div class="sc-row"><span class="setup-tag">场景</span>' + esc(p.setup.scene) + '</div>': '') +
(p.setup.task? '<div class="sc-row"><span class="setup-tag">任务</span>' + esc(p.setup.task) + '</div>': '') + '</div>';
}
if (p.fix) h += '<div class="fix-chip"><span class="fx">✎ 纠错</span>' + esc(p.fix) + '</div>';
if (p.text) {
h += '<div class="bubble">' + esc(p.text) + '</div>';
h += '<div class="msg-tools">' +
'<button class="tool-btn" data-speak="' + i + '">' + icon('speaker') + '朗读</button>' +
'<button class="tool-btn" data-tr="' + i + '">' + icon('globe') + '翻译</button></div>';
if (cur.tr && cur.tr[i]) h += '<div class="translation">' + esc(cur.tr[i]) + '</div>';
}
return h + '</div></div>';
}).join('') + (busy? '<div class="msg ai"><div class="msg-col"><div class="bubble typing"><i></i><i></i><i></i></div></div></div>': '');
box.querySelectorAll('[data-speak]').forEach(b => b.addEventListener('click', () => {
const p = displayParts(cur.msgs[+b.getAttribute('data-speak')]);
speak(p.text);
}));
box.querySelectorAll('[data-tr]').forEach(b => b.addEventListener('click', () => translateMsg(+b.getAttribute('data-tr'))));
box.scrollTop = box.scrollHeight;
}
function openSession(id) {
cur = sessions.find(s => s.id === id) || null;
if (!cur) return;
if (!cur.tr) cur.tr = {};
$('chatTitle').textContent = cur.scenario;
$('hintBar').classList.add('hidden');
show('chat'); renderMsgs();
setTimeout(() => $('msgInput').focus(), 60);
}
async function startSession(scenario) {
if (!hasKey()) { toast('先去设置里填 API key'); show('settings'); renderSettings(); return;}
cur = { id: Date.now().toString(36), scenario: scenario, ts: Date.now(), msgs: [], tr: {}, summary: null};
sessions.unshift(cur); saveSessions();
$('chatTitle').textContent = scenario;
$('hintBar').classList.add('hidden');
show('chat');
busy = true; renderMsgs();
try {
const text = await llm(apiMessages(cur), { temperature: 0.7});
cur.msgs.push({ r: 'a', t: text}); saveSessions();
} catch (e) {
toast('开局失败：' + e.message, 3600);
sessions = sessions.filter(s => s.id!== cur.id); saveSessions();
cur = null; show('home'); renderHome();
} finally { busy = false; if (cur) renderMsgs();}
}
async function sendUser(text) {
if (!cur || busy) return;
cur.msgs.push({ r: 'u', t: text}); saveSessions();
busy = true; renderMsgs();
try {
const reply = await llm(apiMessages(cur), { temperature: 0.7});
cur.msgs.push({ r: 'a', t: reply}); saveSessions();
} catch (e) {
cur.msgs.pop(); saveSessions();
toast('发送失败：' + e.message, 3600);
$('msgInput').value = text;
} finally { busy = false; renderMsgs();}
}
async function translateMsg(i) {
if (!cur || busy) return;
if (cur.tr[i]) { delete cur.tr[i]; saveSessions(); renderMsgs(); return;}
const p = displayParts(cur.msgs[i]);
busy = true;
try {
const zh = await llm([{ role: 'system', content: SYS_TRANSLATE}, { role: 'user', content: p.text}], { temperature: 0.2, timeout: 30000});
cur.tr[i] = zh.trim(); saveSessions();
} catch (e) { toast('翻译失败：' + e.message, 3200);}
finally { busy = false; renderMsgs();}
}
let hintText = '';
async function askHint() {
if (!cur || busy) return;
busy = true; renderMsgs();
try {
const out = await llm([
{ role: 'system', content: SYS_HINT},
{ role: 'user', content: 'Scenario: ' + cur.scenario + '\n\nConversation so far:\n' + plainTranscript(cur) + '\n\nWhat can I say next?'}
], { temperature: 0.5, timeout: 30000});
const parts = out.split('\n').map(s => s.trim()).filter(Boolean);
hintText = (parts[0] || '').replace(/^["“]|["”]$/g, '');
const zh = (parts.find(l => l.indexOf('|') === 0) || '').replace(/^\|\s*/, '');
$('hintEn').textContent = hintText;
$('hintZh').textContent = zh;
$('hintBar').classList.remove('hidden');
} catch (e) { toast('提示失败：' + e.message, 3200);}
finally { busy = false; renderMsgs();}
}
async function endSession() {
if (!cur || busy) return;
show('summary');
$('summaryBody').textContent = '正在生成小结…';
try {
const out = await llm([
{ role: 'system', content: SYS_SUMMARY},
{ role: 'user', content: 'Scenario: ' + cur.scenario + '\n\nTranscript:\n' + plainTranscript(cur)}
], { temperature: 0.4, timeout: 45000});
cur.summary = out.trim(); saveSessions();
$('summaryBody').textContent = cur.summary;
} catch (e) {
$('summaryBody').textContent = '小结生成失败：' + e.message + '\n\n对话已经保存在「最近演练」里，可以随时回来继续。';
}
}

/* ---- TTS ---- */
function speak(text) {
if (!text) return;
try {
speechSynthesis.cancel();
const u = new SpeechSynthesisUtterance(text);
u.lang = 'en-US'; u.rate = 0.92;
const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.indexOf('en-US') === 0) || speechSynthesis.getVoices().find(v => v.lang && v.lang.indexOf('en') === 0);
if (v) u.voice = v;
speechSynthesis.speak(u);
} catch (e) {}
}

/* ---- settings ---- */
function renderSettings() {
const row = $('providerRow');
row.innerHTML = Object.keys(PROVIDERS).map(k => '<button class="chip' + (cfg.provider === k? ' on': '') + '" data-p="' + k + '">' + PROVIDERS[k].name + '</button>').join('');
row.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
cfg.provider = b.getAttribute('data-p');
const p = PROVIDERS[cfg.provider];
if (cfg.provider!== 'custom') { cfg.base = p.base; if (p.models.length) cfg.model = p.models[0];}
saveCfg(); renderSettings();
}));
$('baseInput').value = cfg.base || '';
$('keyInput').value = cfg.key || '';
$('modelInput').value = cfg.model || '';
$('modelList').innerHTML = (PROVIDERS[cfg.provider].models || []).map(m => '<option value="' + m + '">').join('');
$('testStatus').textContent = ''; $('testStatus').className = 'test-status';
}
function bindSettings() {
$('baseInput').addEventListener('input', e => { cfg.base = e.target.value; saveCfg();});
$('keyInput').addEventListener('input', e => { cfg.key = e.target.value; saveCfg();});
$('modelInput').addEventListener('input', e => { cfg.model = e.target.value; saveCfg();});
$('testBtn').addEventListener('click', async () => {
const st = $('testStatus');
if (!hasKey()) { st.textContent = '请先把地址、key 和模型填完整'; st.className = 'test-status bad'; return;}
st.textContent = '测试中…'; st.className = 'test-status';
try {
await llm([{ role: 'user', content: 'Say hi in one word.'}], { temperature: 0, timeout: 30000});
st.textContent = '连接成功，可以开始演练了'; st.className = 'test-status ok';
} catch (e) {
st.textContent = '连接失败：' + e.message; st.className = 'test-status bad';
}
});
}

/* ================= wire up ================= */
function init() {
$('gearBtn').innerHTML = icon('gear');
$('chatBack').innerHTML = icon('back');
$('setBack').innerHTML = icon('back');
$('gearBtn').addEventListener('click', () => { renderSettings(); show('settings');});
$('setBack').addEventListener('click', () => { show('home'); renderHome();});
$('bannerGo').addEventListener('click', () => { renderSettings(); show('settings');});
$('chatBack').addEventListener('click', () => { show('home'); renderHome();});
$('startBtn').addEventListener('click', () => {
const v = $('sceneInput').value.trim();
if (!v) { toast('先写一个想练的场景'); $('sceneInput').focus(); return;}
$('sceneInput').value = '';
startSession(v);
});
const doSend = () => {
const v = $('msgInput').value.trim();
if (!v) return;
$('msgInput').value = '';
$('hintBar').classList.add('hidden');
sendUser(v);
};
$('sendBtn').addEventListener('click', doSend);
$('msgInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSend();});
$('hintBtn').addEventListener('click', askHint);
$('hintClose').addEventListener('click', () => $('hintBar').classList.add('hidden'));
$('hintSpeak').addEventListener('click', () => speak(hintText));
$('hintUse').addEventListener('click', () => { $('msgInput').value = hintText; $('msgInput').focus(); $('hintBar').classList.add('hidden');});
$('endBtn').addEventListener('click', endSession);
$('sumHome').addEventListener('click', () => { show('home'); renderHome();});
$('sumAgain').addEventListener('click', () => { show('home'); renderHome(); setTimeout(() => $('sceneInput').focus(), 60);});
bindSettings();
renderHome();
show('home');
}
document.addEventListener('DOMContentLoaded', init);
