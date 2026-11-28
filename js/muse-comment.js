/* Muse comment card, appended to the very end of every post.
   Comment texts live in /data/muse-comments.json, keyed by post slug
   (same data-driven pattern as the Bilibili hot comments). The card
   reuses the .muse-note styles from custom.css. Posts whose body
   already carries a hand-written Muse card (the Hilbert post) have
   no entry in the JSON, so nothing is added there.
   The language toggle swaps #article-container's innerHTML, which can
   wipe the injected card or restore a stale one, so a
   MutationObserver re-ensures the card with the current language. */
(function () {
  'use strict';

  function lang() {
    try { return window.localStorage.getItem('site-lang') === 'en' ? 'en' : 'zh'; }
    catch (e) { return 'zh'; }
  }
  var SUB = { zh: '来自 Muse 的评论', en: 'A comment from Claude' };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function slug() {
    var parts = window.location.pathname.split('/').filter(function (p) { return p; });
    return parts.length ? parts[parts.length - 1] : '';
  }

  var cache = null;
  var loading = false;
  var waiters = [];

  function withData(cb) {
    if (cache) { cb(cache); return; }
    waiters.push(cb);
    if (loading) return;
    loading = true;
    fetch('/data/muse-comments.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (d) { cache = d || {}; })
      .catch(function () { cache = {}; })
      .then(function () {
        var w = waiters; waiters = [];
        w.forEach(function (f) { f(cache); });
      });
  }

  function cardHTML(text, lg) {
    return '<div class="muse-note-head">' +
      '<img class="muse-note-avatar" src="/img/muse-avatar.jpg" alt="Muse">' +
      '<div><div class="muse-note-name">Muse<span class="muse-note-badge">AI</span></div>' +
      '<div class="muse-note-sub">' + esc(SUB[lg]) + '</div></div></div>' +
      '<p class="muse-note-text">' + esc(text) + '</p>';
  }

  var ensuring = false;
  function ensure() {
    if (ensuring) return;
    var container = document.getElementById('article-container');
    if (!container) return;
    var s = slug();
    if (!s) return;
    withData(function (data) {
      var entry = data[s];
      var existing = container.querySelector('.muse-note-auto');
      if (!entry) { return; }
      var lg = lang();
      var text = entry[lg] || entry.zh || '';
      if (!text) return;
      if (existing && existing.getAttribute('data-lang') === lg) return;
      ensuring = true;
      if (existing) existing.remove();
      var card = document.createElement('div');
      card.className = 'muse-note muse-note-auto';
      card.setAttribute('data-lang', lg);
      card.innerHTML = cardHTML(text, lg);
      container.appendChild(card);
      ensuring = false;
    });
  }

  var observer = null;
  function watch() {
    var container = document.getElementById('article-container');
    if (!container || observer) return;
    observer = new MutationObserver(function () { ensure(); });
    observer.observe(container, { childList: true });
  }

  function init() { ensure(); watch(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
  document.addEventListener('pjax:complete', function () { observer = null; init(); });
})();
