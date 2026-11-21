// Article cards: the whole card opens the article. The theme only links
// the cover image and the title, so tapping the excerpt, the date or an
// empty part of the card did nothing. This binds a click handler on each
// .recent-post-item (homepage + category/tag pages, which share the same
// card style): a tap on anything that is not already a link or button
// opens the article by "clicking" the card's own title link, so the
// theme's PJAX navigation (and the music bar) keep working exactly as if
// the title had been tapped.
//
// Mobile scrolling is untouched: navigation runs on the `click` event,
// and a swipe/scroll does not produce a click. As a safety net, a touch
// that moves more than a few pixels sets a flag that suppresses the next
// click, so a scroll can never be mistaken for a tap. No touch handler
// here calls preventDefault, and no CSS touch-action is changed, so
// scrolling stays fully native.
(function () {
  var MOVE_LIMIT = 10 // px; a touch that moves more than this is a scroll, not a tap

  var touchStartX = 0
  var touchStartY = 0
  var touchMoved = false
  var suppressClick = false

  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0]
    touchStartX = t.clientX
    touchStartY = t.clientY
    touchMoved = false
  }, { passive: true })

  document.addEventListener('touchmove', function (e) {
    var t = e.touches[0]
    if (Math.abs(t.clientX - touchStartX) > MOVE_LIMIT ||
        Math.abs(t.clientY - touchStartY) > MOVE_LIMIT) {
      touchMoved = true
    }
  }, { passive: true })

  document.addEventListener('touchend', function () {
    if (touchMoved) {
      suppressClick = true
      // The (suppressed) click, if the browser fires one, arrives right
      // after touchend; clear the flag shortly after so later taps work.
      setTimeout(function () { suppressClick = false }, 350)
    }
  }, { passive: true })

  function onCardClick (e) {
    if (suppressClick) {
      suppressClick = false
      return
    }
    // A tap on a real link or button keeps its own action (title, cover,
    // category tag, ...). Only taps on the rest of the card navigate.
    if (e.target.closest('a, button')) return
    var card = e.currentTarget
    var link = card.querySelector('.article-title') ||
               card.querySelector('.post_cover a')
    if (!link) return
    // "Click" the card's own title link: the theme's PJAX handler takes
    // it from here (music keeps playing); if PJAX is ever unavailable
    // the link's normal navigation still opens the article.
    link.click()
  }

  function bindCards () {
    document.querySelectorAll('.recent-post-item').forEach(function (card) {
      if (card.dataset.cardClickBound) return
      card.dataset.cardClickBound = '1'
      card.addEventListener('click', onCardClick)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCards)
  } else {
    bindCards()
  }
  // Re-bind after PJAX navigation (home <-> article <-> category).
  document.addEventListener('pjax:complete', bindCards)
})()
