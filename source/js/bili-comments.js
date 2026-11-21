/* Bilibili hot comments for reposted videos.
   A post opts in with: <div class="bili-comments" data-bvid="BV..."></div>
   When the block scrolls near the viewport, the visitor's own browser
   fetches the video's hot comments from Bilibili's public reply API and
   renders them as cards. Read-only; replying still happens on Bilibili.
   Any failure degrades to a plain link card. Nothing is fetched until
   the block is near the screen, so first paint is never affected. */
(function () {
  'use strict';

  /* ---- BV <-> AV (current algorithm, BigInt based) ---- */
  var XOR_CODE = 23442827791579n;
  var MASK_CODE = 2251799813685247n;
  var BASE = 58n;
  var TABLE = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf';
  function bv2av(bvid) {
    var arr = String(bvid).split('');
    var t = arr[3]; arr[3] = arr[9]; arr[9] = t;
    t = arr[4]; arr[4] = arr[7]; arr[7] = t;
    var tmp = 0n;
    for (var i = 3; i < arr.length; i++) {
      tmp = tmp * BASE + BigInt(TABLE.indexOf(arr[i]));
    }
    return Number((tmp & MASK_CODE) ^ XOR_CODE);
  }

  function lang() {
    try { return window.localStorage.getItem('site-lang') === 'en' ? 'en' : 'zh'; }
    catch (e) { return 'zh'; }
  }
  var L = {
    zh: { title: 'B站热评', more: '去 B 站看全部评论', loading: '正在加载 B 站评论…',
          fail: '评论没拉回来，去 B 站直接看吧', open: '打开原视频评论区',
          like: '赞', replies: '条回复', justNow: '刚刚', min: '分钟前', hour: '小时前', day: '天前' },
    en: { title: 'Hot comments on Bilibili', more: 'All comments on Bilibili', loading: 'Loading Bilibili comments…',
          fail: 'Comments failed to load — read them on Bilibili instead', open: 'Open the video page',
          like: 'likes', replies: 'replies', justNow: 'just now', min: ' min ago', hour: ' h ago', day: ' d ago' }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function relTime(ctime, t) {
    var diff = Date.now() / 1000 - ctime;
    if (diff < 60) return t.justNow;
    if (diff < 3600) return Math.floor(diff / 60) + t.min;
    if (diff < 86400) return Math.floor(diff / 3600) + t.hour;
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + t.day;
    var d = new Date(ctime * 1000);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function commentHTML(c, t) {
    var m = c.member || {};
    var msg = esc((c.content && c.content.message) || '').replace(/\n/g, '<br>');
    var meta = [];
    meta.push(relTime(c.ctime, t));
    meta.push(t.like + ' ' + (c.like || 0));
    if (c.rcount) meta.push(c.rcount + ' ' + t.replies);
    var initial = esc((m.uname || '?').charAt(0));
    var avatar = m.avatar
      ? '<img class="bili-c-avatar" src="' + esc(m.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
      : '';
    return '<div class="bili-c-item">' +
      '<div class="bili-c-avatar-wrap"><span class="bili-c-initial">' + initial + '</span>' + avatar + '</div>' +
      '<div class="bili-c-main">' +
        '<div class="bili-c-name">' + esc(m.uname || '') + '</div>' +
        '<div class="bili-c-text">' + msg + '</div>' +
        '<div class="bili-c-meta">' + esc(meta.join('  ·  ')) + '</div>' +
      '</div></div>';
  }

  function renderFallback(box, bvid, t) {
    var url = 'https://www.bilibili.com/video/' + encodeURIComponent(bvid) + '/';
    box.innerHTML =
      '<div class="bili-comments-head"><span class="bili-comments-title">' + esc(t.title) + '</span></div>' +
      '<a class="bili-comments-fallback" href="' + url + '" target="_blank" rel="noopener">' +
      esc(t.fail) + ' · ' + esc(t.open) + ' →</a>';
  }

  function render(box, bvid, list, t) {
    var url = 'https://www.bilibili.com/video/' + encodeURIComponent(bvid) + '/';
    var html = '<div class="bili-comments-head"><span class="bili-comments-title">' + esc(t.title) + '</span>' +
      '<a class="bili-comments-more" href="' + url + '" target="_blank" rel="noopener">' + esc(t.more) + ' →</a></div>';
    for (var i = 0; i < list.length; i++) html += commentHTML(list[i], t);
    box.innerHTML = html;
  }

  function pickList(data) {
    if (!data) return null;
    var seen = {}, out = [];
    var push = function (arr) {
      if (!arr) return;
      for (var i = 0; i < arr.length; i++) {
        var c = arr[i];
        if (c && !seen[c.rpid]) { seen[c.rpid] = 1; out.push(c); }
      }
    };
    push(data.top_replies); push(data.top); push(data.replies);
    return out.length ? out.slice(0, 12) : null;
  }

  function load(box) {
    var bvid = box.getAttribute('data-bvid');
    var t = L[lang()];
    if (!bvid) return;
    box.innerHTML = '<div class="bili-comments-head"><span class="bili-comments-title">' + esc(t.title) + '</span></div>' +
      '<div class="bili-comments-loading">' + esc(t.loading) + '</div>';
    var aid;
    try { aid = bv2av(bvid); } catch (e) { renderFallback(box, bvid, t); return; }
    var main = 'https://api.bilibili.com/x/v2/reply/main?oid=' + aid + '&type=1&mode=3&ps=20';
    var classic = 'https://api.bilibili.com/x/v2/reply?type=1&oid=' + aid + '&sort=2&pn=1&ps=20';
    var opts = { credentials: 'omit', referrerPolicy: 'no-referrer' };
    fetch(main, opts)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = j && j.code === 0 ? pickList(j.data) : null;
        if (list) { render(box, bvid, list, t); return; }
        return fetch(classic, opts).then(function (r) { return r.json(); }).then(function (j2) {
          var list2 = j2 && j2.code === 0 ? pickList(j2.data) : null;
          if (list2) render(box, bvid, list2, t); else renderFallback(box, bvid, t);
        });
      })
      .catch(function () {
        fetch(classic, opts)
          .then(function (r) { return r.json(); })
          .then(function (j2) {
            var list2 = j2 && j2.code === 0 ? pickList(j2.data) : null;
            if (list2) render(box, bvid, list2, t); else renderFallback(box, bvid, t);
          })
          .catch(function () { renderFallback(box, bvid, t); });
      });
  }

  var observer = null;
  function scan() {
    var boxes = document.querySelectorAll('.bili-comments:not([data-bili-state])');
    if (!boxes.length) return;
    if (!('IntersectionObserver' in window)) {
      boxes.forEach(function (b) { b.setAttribute('data-bili-state', 'loading'); load(b); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var b = en.target;
            observer.unobserve(b);
            b.setAttribute('data-bili-state', 'loading');
            load(b);
          }
        });
      }, { rootMargin: '500px 0px' });
    }
    boxes.forEach(function (b) { b.setAttribute('data-bili-state', 'waiting'); observer.observe(b); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else { scan(); }
  document.addEventListener('pjax:complete', scan);
})();
