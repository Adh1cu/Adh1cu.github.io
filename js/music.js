// Music player — slim bar pinned to the very top of the screen.
// The bar owns its own 52px strip; the page is pushed down by the same
// amount (see custom.css), so it never covers the site UI. No dragging:
// a docked top bar has nowhere to go.
// Songs only change when one ends or the user switches manually in the
// playlist.
//
// Playlist source: NetEase playlist 18558256389 《雨》 via the i-meto
// Meting API. Verified 2026-11-07: the mirror only resolves 6 of the 19
// songs to full audio (the other 13 return 404 — most likely VIP or
// otherwise unavailable to a free account, so they are dropped, not
// cracked). The other mirror (injahow) resolves all 19 but only as
// 30-second previews, so it is NOT used. The 6 kept songs are full
// length (220–267s each). 《生命之名》 is one of the 13 that do not
// resolve, so playback now starts from the first playable song
// (The Truth That You Leave) instead.
// The API's auth tokens stay valid for 6+ minutes (verified); the list
// URLs are refreshed every 5 minutes anyway, so a long session never
// runs into a stale link.
// PJAX is enabled, so this script runs once and the player keeps playing
// across page navigation — the song plays from start to finish.
(function () {
  var API = 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=18558256389'
  // NetEase song IDs verified playable in full (2026-11-07).
  var PLAYABLE_IDS = {
    31514884: 1, // The Truth That You Leave — Pianoboy高至豪
    1341912654: 1, // Rainy Blue (蓝色阴雨)
    139774: 1, // The truth that you leave — Pianoboy高至豪
    2038191895: 1, // 诀别书 — 邓垚
    1929438414: 1, // 我的灵魂
    2054862752: 1 // 繁华的寂静（纯音乐） — 凉敛
  }

  var started = false
  var bar = document.getElementById('music-topbar')
  var ap = null

  function songIdFromUrl (url) {
    var m = /[?&]id=(\d+)/.exec(url || '')
    return m ? parseInt(m[1], 10) : 0
  }

  function fetchPlaylist () {
    return fetch(API)
      .then(function (res) { return res.json() })
      .then(function (list) {
        return list
          .filter(function (s) { return PLAYABLE_IDS[songIdFromUrl(s.url)] })
          .map(function (s) {
            return {
              name: s.title,
              artist: s.author,
              url: s.url,
              pic: s.pic,
              lrc: s.lrc
            }
          })
      })
  }

  function refreshUrls () {
    if (!ap) return
    fetchPlaylist()
      .then(function (fresh) {
        fresh.forEach(function (song, i) {
          if (ap.list.audios[i]) ap.list.audios[i].url = song.url
        })
      })
      .catch(function () {})
  }

  function initPlayer (audios) {
    var wrap = document.getElementById('music-player-wrap')
    if (!wrap || !audios.length) return
    ap = new APlayer({
      container: wrap,
      audio: audios,
      loop: 'all',
      order: 'list',
      volume: 0.7,
      mutex: true,
      preload: 'auto',
      listFolded: true,
      listMaxHeight: '340px'
    })
    // Debug/diagnostics handle (the audio element itself is detached).
    window.__musicPlayer = ap
    // Keep the stream fresh: re-fetch URLs every 5 minutes.
    setInterval(refreshUrls, 5 * 60 * 1000)
  }

  function tryPlay () {
    if (started) return
    // Never auto-resume after the user deliberately closed the bar.
    if (bar && bar.classList.contains('closed')) return
    if (!ap || !ap.audio || !ap.audio.paused) return
    var p = ap.audio.play()
    if (p && p.catch) p.catch(function () {})
  }

  function markStarted () {
    if (ap && ap.audio && !ap.audio.paused) {
      started = true
      document.removeEventListener('pointerdown', onInteract)
      document.removeEventListener('keydown', onInteract)
    }
  }

  function onInteract (e) {
    // Taps on the bar itself are handled by APlayer (play/pause toggle);
    // triggering playback here as well would fight with it.
    if (e.target && e.target.closest && e.target.closest('#music-topbar')) return
    tryPlay()
    setTimeout(markStarted, 300)
  }

  document.addEventListener('pointerdown', onInteract)
  document.addEventListener('keydown', onInteract)
  window.addEventListener('load', function () {
    setTimeout(tryPlay, 1500)
  })

  // Close the bar (pauses playback) / bring it back. The 52px strip stays
  // reserved either way, so the page never jumps and nothing is covered.
  var closeBtn = document.getElementById('music-close')
  var showBtn = document.getElementById('music-show')
  if (bar && closeBtn && showBtn) {
    closeBtn.addEventListener('click', function () {
      if (ap && ap.audio && !ap.audio.paused) ap.audio.pause()
      bar.classList.add('closed')
    })
    showBtn.addEventListener('click', function () {
      bar.classList.remove('closed')
    })
  }

  // Build the player from the filtered playlist. One retry if the API
  // is briefly unreachable.
  fetchPlaylist()
    .then(initPlayer)
    .catch(function () {
      setTimeout(function () {
        fetchPlaylist().then(initPlayer).catch(function () {})
      }, 10000)
    })
})()
