/* Share bar for posts: iMessage + Telegram, mobile only.
   The bar is injected at the end of the article, just before the
   Muse comment card when one exists. CSS hides it on desktop
   (small screen + coarse pointer only). The language toggle swaps
   #article-container's innerHTML, so a MutationObserver re-ensures
   the bar, same pattern as muse-comment.js. */
(function () {
  'use strict';

  var IM_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.78 1.56 5.24 3.96 6.72L5 22l4.6-2.5c.76.14 1.56.22 2.4.22 5.52 0 10-3.94 10-8.8S17.52 2 12 2z"/></svg>';
  var TG_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';

  function pageUrl() {
    return window.location.href.split('#')[0];
  }

  function pageTitle() {
    var t = document.title || '';
    var i = t.indexOf(' | ');
    return i > 0 ? t.slice(0, i) : t;
  }

  function build() {
    var url = pageUrl();
    var title = pageTitle();
    var body = encodeURIComponent(title + ' ' + url);
    var bar = document.createElement('div');
    bar.className = 'share-bar';
    bar.innerHTML =
      '<span class="share-bar-label">分享</span>' +
      '<a class="share-btn share-imessage" href="sms:?&amp;body=' + body + '">' + IM_SVG + '<span>iMessage</span></a>' +
      '<a class="share-btn share-telegram" href="https://t.me/share/url?url=' + encodeURIComponent(url) + '&amp;text=' + encodeURIComponent(title) + '" target="_blank" rel="noopener">' + TG_SVG + '<span>Telegram</span></a>';
    return bar;
  }

  var ensuring = false;
  function ensure() {
    if (ensuring) return;
    var container = document.getElementById('article-container');
    if (!container) return;
    var existing = container.querySelector('.share-bar');
    var note = container.querySelector('.muse-note-auto');
    if (existing) {
      if (note && existing.nextSibling !== note) {
        container.insertBefore(existing, note);
      }
      return;
    }
    ensuring = true;
    var bar = build();
    if (note) container.insertBefore(bar, note);
    else container.appendChild(bar);
    ensuring = false;
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
