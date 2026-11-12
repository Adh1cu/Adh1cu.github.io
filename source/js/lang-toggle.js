// Bilingual mode (zh / en) for the whole blog.
// - A language button is injected into the settings panel
//   (#rightside-config-hide), next to Reading Mode and Dark Mode.
//   It shows "EN" while the site is Chinese, "中" while it is English.
// - UI strings: exact-match text replacement. Originals are saved in a
//   WeakMap so switching back restores the exact Chinese text.
// - Post titles / excerpts: swapped from /i18n/titles.json by URL slug.
// - Article body (post pages): fetched from /i18n/<slug>.json and swapped
//   in; the original HTML is kept in memory and restored on switch-back.
// - Language persists in localStorage ('site-lang'). Default: zh.
// - Re-applies after PJAX navigation and once more after a short delay
//   (catches async bits such as the homepage category-count refresh).
// - New posts become bilingual automatically once their
//   source/i18n/<slug>.json exists (plus a titles.json entry).
(function () {
  'use strict'

  var LANG_KEY = 'site-lang'
  var lang = 'zh'
  try {
    lang = window.localStorage.getItem(LANG_KEY) || 'zh'
  } catch (e) { /* private mode */ }
  if (lang !== 'en' && lang !== 'zh') lang = 'zh'

  // ---- exact Chinese UI string -> English ----
  var UI = {
    // nav / menus
    '首页': 'Home', '归档': 'Archives', '标签': 'Tags', '分类': 'Categories',
    // categories
    '政治经济': 'Politics & Economics', '科技分享': 'Tech', '碎碎念': 'Musings',
    // homepage category cards (built by home.js)
    '政治、经济与社会观察': 'Politics, economics, and social commentary',
    '好用的技术、工具与折腾记录': 'Useful tech, tools, and tinkering notes',
    '日常随想与心情记录': 'Everyday thoughts and moments',
    '即将更新': 'Coming soon',
    // site
    'Adh1cu 的博客': "Adh1cu's Blog",
    '偶尔分享搞机科技，生活琐事': 'Occasional posts on tech tinkering and everyday life',
    // announcement (donation) card
    '公告': 'Announcements',
    '如果这里的内容对你有帮助，欢迎打赏支持 ☕': 'If anything here has been helpful, feel free to buy me a coffee ☕',
    'Aptos 网络': 'Aptos Network',
    '复制地址': 'Copy Address',
    // sidebar cards
    '最新文章': 'Recent Posts', '网站信息': 'Site Info',
    '文章数目 :': 'Posts :', '本站总字数 :': 'Total Words :',
    '本站访客数 :': 'Visitors :', '本站总浏览量 :': 'Total Views :',
    '查看更多': 'View More', '目录': 'Contents',
    // post meta
    '发表于': 'Published', '更新于': 'Updated',
    '总字数:': 'Words:', '阅读时长:': 'Reading Time:',
    '浏览量:': 'Views:', '评论数:': 'Comments:',
    // copyright block
    '文章作者:': 'Author:', '文章链接:': 'Link:', '版权声明:': 'Copyright:',
    '本博客所有文章除特别声明外，均采用 ': 'All posts on this blog are licensed under ',
    ' 许可协议。转载请注明来源 ': ' unless otherwise noted. Please credit ',
    '！': '!',
    // related / prev-next
    '相关推荐': 'Related Posts', '上一篇': 'Previous', '下一篇': 'Next',
    // search
    '搜索': 'Search', '数据加载中': 'Loading…',
    // footer
    '框架': 'Framework', '主题': 'Theme',
    // misc
    '页面未找到': 'Page Not Found', '返回首页': 'Back to Home',
    '全部文章': 'All Posts', '加载中...': 'Loading…'
  }

  // tag names (exact match only; article bodies are excluded from the walk)
  var TAGS = {
    '1962': '1962', 'A股': 'A-Shares', 'FlClash': 'FlClash',
    'K型分化': 'K-Shaped Divergence', '中期选举': 'Midterm Elections',
    '中美关系': 'U.S.-China Relations', '中药': 'Chinese Medicine',
    '乒乓球': 'Table Tennis', '买车': 'Buying a Car', '人物': 'People',
    '体育': 'Sports', '健康': 'Health', '兴奋剂': 'Doping',
    '内卷': 'Involution', '医保': 'Health Insurance', '医疗': 'Healthcare',
    '华人': 'Chinese Diaspora', '历史': 'History', '历史记忆': 'Historical Memory',
    '右翼': 'The Right', '回忆录': 'Memoir', '墨尔本': 'Melbourne',
    '外交': 'Diplomacy', '外企': 'Foreign Companies', '外卖员': 'Delivery Riders',
    '契约精神': 'Contract Culture', '就业': 'Jobs', '投资': 'Investing',
    '拜登': 'Biden', '指数基金': 'Index Funds', '援非': 'Aid to Africa',
    '政治': 'Politics', '教育': 'Education', '文字': 'Words',
    '日本': 'Japan', '服从性': 'Obedience', '民族主义': 'Nationalism',
    '民营经济': 'Private Sector', '民间投资': 'Private Investment',
    '消费': 'Consumption', '深层政府': 'Deep State', '电瓶车': 'E-Bikes',
    '看病贵': 'Costly Healthcare', '社会': 'Society',
    '科学上网': 'VPN', '童年': 'Childhood', '经济': 'Economy',
    '经济学': 'Economics', '美国': 'United States', '美股': 'U.S. Stocks',
    '肝损伤': 'Liver Damage', '英伟达': 'NVIDIA', '财阀': 'Chaebol',
    '货币战争': 'Currency Wars', '身份认同': 'Identity',
    '通货膨胀': 'Inflation', '逻辑': 'Logic', '韩国': 'South Korea',
    '马家军': 'Ma Family Army', '魔法': 'VPN', '黄亚生': 'Yasheng Huang',
    '黄仁勋': 'Jensen Huang'
  }
  Object.keys(TAGS).forEach(function (k) { UI[k] = TAGS[k] })

  // title attributes / placeholders
  var ATTRS = {
    '阅读模式': 'Reading Mode', '日间和夜间模式切换': 'Toggle Dark Mode',
    '回到顶部': 'Back to Top', '设置': 'Settings',
    '单栏和双栏切换': 'Toggle Sidebar', '目录': 'Table of Contents',
    '收起播放器': 'Hide Player', '打开播放器': 'Show Player',
    '搜索文章': 'Search posts'
  }

  var savedText = new WeakMap() // text node -> original Chinese
  var savedAttr = new WeakMap() // element -> { attrName: original }

  var titlesPromise = null
  var articleState = { slug: null, originalHTML: null, loaded: null, notified: false }
  var savedSubtitleHTML = null
  var savedCopyOnclick = null
  var savedDocTitle = null
  var savedDocTitlePath = null
  var delayedTimer = null

  var COPY_ADDR = '0xf7f328515e2045c469c7fadb256be4976c80e61cdd2f5e0b5a650ffbccfd5486'
  var COPY_ONCLICK_EN = "navigator.clipboard.writeText('" + COPY_ADDR + "').then(()=>{this.textContent='Copied ✓';setTimeout(()=>this.textContent='Copy Address',2000)})"

  function isPostPage () {
    return !!document.getElementById('article-container')
  }

  function currentSlug () {
    var m = window.location.pathname.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^\/]+)\/?$/)
    return m ? m[1] : null
  }

  // ---------- toggle button ----------
  function ensureButton () {
    var hide = document.getElementById('rightside-config-hide')
    if (!hide || document.getElementById('lang-toggle')) return
    var btn = document.createElement('button')
    btn.id = 'lang-toggle'
    btn.type = 'button'
    btn.setAttribute('data-no-i18n', 'true')
    btn.addEventListener('click', function () {
      setLang(lang === 'en' ? 'zh' : 'en')
    })
    hide.appendChild(btn)
    updateButton()
  }

  function updateButton () {
    var btn = document.getElementById('lang-toggle')
    if (!btn) return
    btn.textContent = lang === 'en' ? '中' : 'EN'
    btn.title = lang === 'en' ? '切换到中文' : 'Switch to English'
  }

  // ---------- chrome text ----------
  function walkTextNodes (fn) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT
        var p = node.parentElement
        if (!p) return NodeFilter.FILTER_REJECT
        if (p.closest('#article-container, script, style, noscript, [data-no-i18n]')) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    nodes.forEach(fn)
  }

  function applyChromeText () {
    walkTextNodes(function (node) {
      if (lang === 'en') {
        if (savedText.has(node)) return
        var t = node.nodeValue
        var key = t.trim()
        var rep = UI[key]
        if (rep !== undefined) {
          savedText.set(node, t)
          node.nodeValue = t.replace(key, rep)
          return
        }
        // number + unit patterns, scoped to where they actually occur
        var p = node.parentElement
        if (p && p.closest('#post-meta')) {
          var m1 = t.match(/(\d+)\s*分钟/)
          if (m1) {
            savedText.set(node, t)
            node.nodeValue = t.replace(/(\d+)\s*分钟/, '$1 min')
          }
        } else if (p && p.closest('#home-sections')) {
          var m2 = t.match(/(\d+)\s*篇文章/)
          if (m2) {
            savedText.set(node, t)
            node.nodeValue = t.replace(/(\d+)\s*篇文章/, function (_, n) { return n === '1' ? '1 post' : n + ' posts' })
          }
        }
      } else {
        if (savedText.has(node)) {
          node.nodeValue = savedText.get(node)
          savedText.delete(node)
        }
      }
    })
  }

  function applyChromeAttrs () {
    document.querySelectorAll('button[title], a[title], input[placeholder]').forEach(function (el) {
      if (el.closest('[data-no-i18n]')) return
      ;['title', 'placeholder'].forEach(function (attr) {
        var v = el.getAttribute(attr)
        if (!v || ATTRS[v] === undefined) return
        if (lang === 'en') {
          var saved = savedAttr.get(el) || {}
          if (!(attr in saved)) {
            saved[attr] = v
            savedAttr.set(el, saved)
          }
          el.setAttribute(attr, ATTRS[v])
        } else {
          var s = savedAttr.get(el)
          if (s && attr in s) {
            el.setAttribute(attr, s[attr])
            delete s[attr]
          }
        }
      })
    })
  }

  // ---------- homepage subtitle ----------
  var SUBTITLE_EN = 'Liberal, education reformer, widely experienced,<br>knows a little about a lot of things'
  function applySubtitle () {
    var sub = document.getElementById('subtitle')
    if (!sub) return
    if (lang === 'en') {
      if (sub.textContent.indexOf('Liberal') !== -1) return
      if (sub.textContent.indexOf('自由派') !== -1) {
        savedSubtitleHTML = sub.innerHTML
        sub.innerHTML = SUBTITLE_EN
      }
    } else if (savedSubtitleHTML) {
      sub.innerHTML = savedSubtitleHTML
      savedSubtitleHTML = null
    }
  }

  // ---------- donation copy button ----------
  function applyCopyButton () {
    var btn = document.querySelector('.announcement_content button')
    if (!btn) return
    if (lang === 'en') {
      if (savedCopyOnclick === null) {
        savedCopyOnclick = btn.getAttribute('onclick')
        btn.setAttribute('onclick', COPY_ONCLICK_EN)
      }
    } else if (savedCopyOnclick !== null) {
      btn.setAttribute('onclick', savedCopyOnclick)
      savedCopyOnclick = null
    }
  }

  // ---------- titles / excerpts by slug ----------
  function getTitles () {
    if (!titlesPromise) {
      titlesPromise = fetch('/i18n/titles.json')
        .then(function (r) { return r.ok ? r.json() : {} })
        .catch(function () { return {} })
    }
    return titlesPromise
  }

  function applyTitles () {
    getTitles().then(function (map) {
      if (!map || !Object.keys(map).length) return
      // title elements
      document.querySelectorAll(
        'h1.post-title, .article-title, .info-item-2, ' +
        '.article-sort-item-title, #aside-content .aside-list-item a.title'
      ).forEach(function (el) {
        var a = el.closest ? el.closest('a[href]') : null
        var href = (a && a.getAttribute('href')) || el.getAttribute('href')
        var slug = href ? slugFromHref(href) : null
        if (!slug && el.tagName === 'H1') slug = currentSlug()
        if (!slug || !map[slug]) return
        if (lang === 'en') {
          var textNode = null
          el.childNodes.forEach(function (n) {
            if (n.nodeType === 3 && n.nodeValue.trim()) textNode = n
          })
          if (!textNode || savedText.has(textNode)) return
          savedText.set(textNode, textNode.nodeValue)
          textNode.nodeValue = map[slug].title_en
          var link = el.tagName === 'A' ? el : a
          if (link && link.getAttribute('title')) {
            var s = savedAttr.get(link) || {}
            if (!('title' in s)) {
              s.title = link.getAttribute('title')
              savedAttr.set(link, s)
            }
            link.setAttribute('title', map[slug].title_en)
          }
        } else {
          el.childNodes.forEach(function (n) {
            if (n.nodeType === 3 && savedText.has(n)) {
              n.nodeValue = savedText.get(n)
              savedText.delete(n)
            }
          })
          var link2 = el.tagName === 'A' ? el : (el.closest ? el.closest('a[href]') : null)
          if (link2) {
            var s2 = savedAttr.get(link2)
            if (s2 && 'title' in s2) {
              link2.setAttribute('title', s2.title)
              delete s2.title
            }
          }
        }
      })
      // excerpt elements
      document.querySelectorAll('.recent-post-item .content, .info-2 .info-item-1').forEach(function (el) {
        var card = el.closest('.recent-post-item, a.pagination-related')
        var link = card ? card.querySelector('.article-title') || card : null
        var href = link ? link.getAttribute('href') : null
        var slug = href ? slugFromHref(href) : null
        if (!slug || !map[slug] || !map[slug].excerpt_en) return
        if (lang === 'en') {
          var textNode = null
          el.childNodes.forEach(function (n) {
            if (n.nodeType === 3 && n.nodeValue.trim()) textNode = n
          })
          if (!textNode || savedText.has(textNode)) return
          savedText.set(textNode, textNode.nodeValue)
          textNode.nodeValue = map[slug].excerpt_en
        } else {
          el.childNodes.forEach(function (n) {
            if (n.nodeType === 3 && savedText.has(n)) {
              n.nodeValue = savedText.get(n)
              savedText.delete(n)
            }
          })
        }
      })
    })
  }

  function slugFromHref (href) {
    var m = href && href.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^\/]+)\/?$/)
    return m ? m[1] : null
  }

  // ---------- article body ----------
  function applyArticle () {
    var slug = currentSlug()
    if (!slug || !isPostPage()) return
    var container = document.getElementById('article-container')
    if (!container) return
    if (articleState.slug !== slug) {
      articleState = { slug: slug, originalHTML: null, loaded: null, notified: false }
    }
    if (lang === 'en') {
      if (articleState.originalHTML === null) {
        articleState.originalHTML = container.innerHTML
      }
      if (articleState.loaded) {
        container.innerHTML = articleState.loaded.body_en
      } else {
        fetch('/i18n/' + slug + '.json')
          .then(function (r) { return r.ok ? r.json() : null })
          .then(function (data) {
            if (!data) {
              if (!articleState.notified) {
                articleState.notified = true
                if (window.btf && btf.snackbarShow) {
                  btf.snackbarShow('English version coming soon')
                }
              }
              return
            }
            articleState.loaded = data
            if (lang === 'en' && articleState.slug === currentSlug()) {
              container.innerHTML = data.body_en
            }
          })
          .catch(function () { /* stay in Chinese */ })
      }
    } else if (articleState.originalHTML !== null) {
      container.innerHTML = articleState.originalHTML
      articleState.originalHTML = null
      articleState.loaded = null
    }
  }

  // ---------- document title ----------
  function applyDocTitle () {
    if (lang === 'en') {
      if (savedDocTitle === null || savedDocTitlePath !== window.location.pathname) {
        savedDocTitle = document.title
        savedDocTitlePath = window.location.pathname
      }
      var slug = currentSlug()
      if (slug) {
        getTitles().then(function (map) {
          if (map[slug]) document.title = map[slug].title_en + " | Adh1cu's Blog"
        })
      } else {
        var parts = document.title.split(' | ').map(function (part) {
          var p = part.trim()
          if (UI[p] !== undefined) return UI[p]
          var out = p
          Object.keys(UI).forEach(function (k) {
            if (out.indexOf(k) !== -1) out = out.split(k).join(UI[k])
          })
          return out
        })
        document.title = parts.join(' | ')
      }
    } else if (savedDocTitle !== null) {
      document.title = savedDocTitle
      savedDocTitle = null
      savedDocTitlePath = null
    }
  }

  // ---------- main ----------
  function apply (isDelayed) {
    ensureButton()
    updateButton()
    applyChromeText()
    applyChromeAttrs()
    applySubtitle()
    applyCopyButton()
    applyTitles()
    applyArticle()
    applyDocTitle()
    if (!isDelayed) {
      clearTimeout(delayedTimer)
      delayedTimer = setTimeout(function () { apply(true) }, 800)
    }
  }

  function setLang (l) {
    if (l !== 'en' && l !== 'zh') return
    lang = l
    try { window.localStorage.setItem(LANG_KEY, l) } catch (e) { /* ignore */ }
    apply(false)
  }

  function init () {
    ensureButton()
    if (lang === 'en') apply(false)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
  document.addEventListener('pjax:complete', function () { apply(false) })
})()
