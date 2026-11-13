// Homepage: category cards at the very bottom of the page, below the
// chronological article list. Runs on the homepage only (initial load
// and after PJAX navigation). The old hero carousel is gone (removed
// 2026-11-08); the article list itself is the theme's own #recent-posts,
// same large-card style as the category pages.
(function () {
  // Keep in sync with the posts' front-matter categories. Counts are
  // refreshed from /categories/ when it loads; the numbers here are the
  // fallback. Add a new category here when a fourth one is created.
  var CATEGORIES = [
    { name: '政治经济', icon: '📰', desc: '政治、经济与社会观察', count: 4 },
    { name: '科技分享', icon: '💻', desc: '好用的技术、工具与折腾记录', count: 1 },
    { name: '碎碎念', icon: '💭', desc: '日常随想与心情记录', count: 1 }
  ]

  function isHome () {
    var p = location.pathname
    return p === '/' || p === '/index.html'
  }

  function refreshCategoryCounts (grid) {
    fetch('/categories/')
      .then(function (res) { return res.text() })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html')
        doc.querySelectorAll('.category-list-item').forEach(function (item) {
          var link = item.querySelector('.category-list-link')
          var countEl = item.querySelector('.category-list-count')
          if (!link || !countEl) return
          var name = link.textContent.trim()
          var n = parseInt(countEl.textContent.trim(), 10)
          if (isNaN(n)) return
          var card = grid.querySelector('[data-category="' + name + '"]')
          if (!card) return
          var countSpan = card.querySelector('.cat-count')
          if (countSpan) countSpan.textContent = n > 0 ? n + ' 篇文章' : '即将更新'
          // A category that just got its first post becomes clickable.
          if (n > 0 && card.tagName !== 'A') {
            var a = document.createElement('a')
            a.className = card.className
            a.setAttribute('data-category', name)
            a.href = '/categories/' + encodeURIComponent(name) + '/'
            a.innerHTML = card.innerHTML
            card.parentNode.replaceChild(a, card)
            bindPjaxLinks()
          }
        })
      })
      .catch(function () {})
  }

  function buildCats () {
    var recent = document.getElementById('recent-posts')
    if (!recent) return
    var old = document.getElementById('home-sections')
    if (old) old.remove()

    var wrap = document.createElement('div')
    wrap.id = 'home-sections'

    // Category cards. A category with no posts yet is not a link
    // (its category page does not exist) — it shows 即将更新 instead.
    var catHtml = '<section class="home-section"><h2 class="home-section-title">分类</h2><div class="cat-grid">'
    CATEGORIES.forEach(function (c) {
      var open = c.count > 0
        ? '<a class="cat-card" data-category="' + c.name + '" href="/categories/' + encodeURIComponent(c.name) + '/">'
        : '<div class="cat-card cat-empty" data-category="' + c.name + '">'
      var close = c.count > 0 ? '</a>' : '</div>'
      catHtml += open +
        '<span class="cat-icon">' + c.icon + '</span>' +
        '<h3>' + c.name + '</h3>' +
        '<p class="cat-desc">' + c.desc + '</p>' +
        '<span class="cat-count">' + (c.count > 0 ? c.count + ' 篇文章' : '即将更新') + '</span>' +
        close
    })
    catHtml += '</div></section>'

    wrap.innerHTML = catHtml
    // Inside #recent-posts (a plain block container), after the article
    // list and the pagination: the bottom of the homepage's main column.
    // (Appending it as a sibling of #recent-posts would make it a third
    // flex item of #content-inner's row and squeeze it into a narrow
    // column next to the article list and the sidebar.)
    recent.appendChild(wrap)
    refreshCategoryCounts(wrap.querySelector('.cat-grid'))
    bindPjaxLinks()
  }

  // The theme's PJAX binds click handlers per link at startup, so links
  // added later by this script would otherwise trigger full page loads
  // (and restart the music). pjax.refresh() re-binds them; calling it
  // again on already-bound links is safe (PJAX ignores the duplicate).
  function bindPjaxLinks () {
    if (window.pjax && window.pjax.refresh) {
      window.pjax.refresh()
    } else {
      setTimeout(function () {
        if (window.pjax && window.pjax.refresh) window.pjax.refresh()
      }, 100)
    }
  }

  // Mobile banner subtitle: the bio wraps with two characters dangling
  // alone on the second line. Split it at the last comma into two neat
  // lines (bigger on mobile, see custom.css); on desktop the <br> is
  // hidden by CSS so it stays one line. Runs after the theme's own
  // subtitle script, which sets the plain text first.
  var BIO_TEXT = '自由派，教育改革者，阅历复杂，各种东西都略懂一二'
  var BIO_HTML = '自由派，教育改革者，阅历复杂，<br>各种东西都略懂一二'
  function fixSubtitle () {
    var sub = document.getElementById('subtitle')
    if (sub && sub.textContent.trim() === BIO_TEXT) {
      sub.innerHTML = BIO_HTML
    }
  }

  function renderHome () {
    if (!isHome()) {
      var old = document.getElementById('home-sections')
      if (old) old.remove()
      return
    }
    fixSubtitle()
    if (document.getElementById('home-sections')) return
    buildCats()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHome)
  } else {
    renderHome()
  }
  // Re-render after PJAX navigation (home <-> article).
  document.addEventListener('pjax:complete', renderHome)
})()
