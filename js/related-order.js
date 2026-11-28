// Post page: move the related-posts block ABOVE the prev/next navigation,
// so readers see related recommendations first while scrolling down.
// Runs on load and after PJAX navigation. No-op on pages without either block.
(function () {
  function moveRelated () {
    var related = document.querySelector('.relatedPosts')
    var nav = document.querySelector('nav#pagination.pagination-post')
    if (!related || !nav) return
    if (related.nextElementSibling === nav) return // already above
    nav.parentNode.insertBefore(related, nav)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveRelated)
  } else {
    moveRelated()
  }
  document.addEventListener('pjax:complete', moveRelated)
})()
