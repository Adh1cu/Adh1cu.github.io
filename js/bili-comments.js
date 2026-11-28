/* Bilibili hot comments for reposted videos.
   A post opts in with: <div class="bili-comments" data-bvid="BV..."></div>
   Bilibili blocks cross-origin API calls from other sites (403 on any
   request carrying a foreign Origin/Referer), so comments are NOT
   fetched from Bilibili by the browser. A scheduled GitHub Action
   refreshes same-origin snapshots at /data/bili-comments/<bvid>.json
   every 6 hours; this script renders the snapshot when the block
   scrolls near the viewport. Read-only; replying happens on Bilibili.
   Any failure degrades to a plain link card. */
(function () {
  'use strict';

  function lang() {
    try { return window.localStorage.getItem('site-lang') === 'en' ? 'en' : 'zh'; }
    catch (e) { return 'zh'; }
  }
  var L = {
    zh: { title: 'B站热评', more: '去 B 站看全部评论', loading: '正在加载 B 站评论…',
          fail: '评论没拉回来，去 B 站直接看吧', open: '打开原视频评论区',
          like: '赞', replies: '条回复', updated: '更新于 ', justNow: '刚刚',
          min: '分钟前', hour: '小时前', day: '天前' },
    en: { title: 'Hot comments on Bilibili', more: 'All comments on Bilibili', loading: 'Loading Bilibili comments…',
          fail: 'Comments failed to load — read them on Bilibili instead', open: 'Open the video page',
          like: 'likes', replies: 'replies', updated: 'Updated ', justNow: 'just now',
          min: ' min ago', hour: ' h ago', day: ' d ago' }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function relTime(ts, t) {
    var diff = Date.now() / 1000 - ts;
    if (diff < 60) return t.justNow;
    if (diff < 3600) return Math.floor(diff / 60) + t.min;
    if (diff < 86400) return Math.floor(diff / 3600) + t.hour;
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + t.day;
    var d = new Date(ts * 1000);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function commentHTML(c, t) {
    var msg = esc(c.message || '').replace(/\n/g, '<br>');
    var meta = [];
    meta.push(relTime(c.ctime, t));
    meta.push(t.like + ' ' + (c.like || 0));
    if (c.rcount) meta.push(c.rcount + ' ' + t.replies);
    var initial = esc((c.uname || '?').charAt(0));
    var avatar = c.avatar
      ? '<img class="bili-c-avatar" src="' + esc(c.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
      : '';
    return '<div class="bili-c-item">' +
      '<div class="bili-c-avatar-wrap"><span class="bili-c-initial">' + initial + '</span>' + avatar + '</div>' +
      '<div class="bili-c-main">' +
        '<div class="bili-c-name">' + esc(c.uname || '') + '</div>' +
        '<div class="bili-c-text">' + msg + '</div>' +
        '<div class="bili-c-meta">' + esc(meta.join('  ·  ')) + '</div>' +
      '</div></div>';
  }

  function videoURL(bvid) {
    return 'https://www.bilibili.com/video/' + encodeURIComponent(bvid) + '/';
  }

  function renderFallback(box, bvid, t) {
    box.innerHTML =
      '<div class="bili-comments-head"><span class="bili-comments-title">' + esc(t.title) + '</span></div>' +
      '<a class="bili-comments-fallback" href="' + videoURL(bvid) + '" target="_blank" rel="noopener">' +
      esc(t.fail) + ' · ' + esc(t.open) + ' →</a>';
  }

  function render(box, bvid, data, t) {
    var html = '<div class="bili-comments-head"><span class="bili-comments-title">' + esc(t.title) + '</span>' +
      '<a class="bili-comments-more" href="' + videoURL(bvid) + '" target="_blank" rel="noopener">' + esc(t.more) + ' →</a></div>';
    var list = data.comments || [];
    for (var i = 0; i < list.length; i++) html += commentHTML(list[i], t);
    if (data.fetched_at) {
      html += '<div class="bili-c-meta bili-comments-updated">' + esc(t.updated + relTime(data.fetched_at, t)) + '</div>';
    }
    box.innerHTML = html;
  }

  function load(box) {
    var bvid = box.getAttribute('data-bvid');
    var t = L[lang()];
    if (!bvid) return;
    box.innerHTML = '<div class="bili-comments-head"><span class="bili-comments-title">' + esc(t.title) + '</span></div>' +
      '<div class="bili-comments-loading">' + esc(t.loading) + '</div>';
    fetch('/data/bili-comments/' + encodeURIComponent(bvid) + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (data) {
        if (data && data.comments && data.comments.length) render(box, bvid, data, t);
        else renderFallback(box, bvid, t);
      })
      .catch(function () { renderFallback(box, bvid, t); });
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
