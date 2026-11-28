// Mascot: Yani Neko （尼古喵喵） in the bottom-left corner.
// Click her for a random line; close button hides her, the paw button brings her back.
(function () {
  var lines = [
    '喵~ 你来啦',
    '好困……让我再躺会儿',
    '今天也要摸鱼，喵',
    '别戳我，晒太阳呢',
    '写博客比上班强，喵',
    '饿了，有吃的吗',
    '喵喵喵~',
    '躺平也是一种生活态度'
  ]

  var mascot = document.createElement('div')
  mascot.id = 'yani-mascot'
  mascot.innerHTML =
    '<div class="mascot-bubble" id="mascot-bubble"></div>' +
    '<img src="/img/yani-neko.png" alt="尼古喵喵" draggable="false">' +
    '<button class="mascot-close" id="mascot-close" title="收起">×</button>'
  document.body.appendChild(mascot)

  var showBtn = document.createElement('button')
  showBtn.id = 'mascot-show'
  showBtn.title = '叫出尼古喵喵'
  showBtn.textContent = '🐱'
  document.body.appendChild(showBtn)

  var bubble = document.getElementById('mascot-bubble')
  var hideTimer = null

  function say (text) {
    bubble.textContent = text
    bubble.classList.add('show')
    clearTimeout(hideTimer)
    hideTimer = setTimeout(function () {
      bubble.classList.remove('show')
    }, 3000)
  }

  function randomLine () {
    return lines[Math.floor(Math.random() * lines.length)]
  }

  mascot.addEventListener('click', function (e) {
    if (e.target.id === 'mascot-close') return
    say(randomLine())
  })

  document.getElementById('mascot-close').addEventListener('click', function (e) {
    e.stopPropagation()
    mascot.style.display = 'none'
    showBtn.style.display = 'flex'
  })

  showBtn.addEventListener('click', function () {
    mascot.style.display = 'block'
    showBtn.style.display = 'none'
    say(randomLine())
  })

  // Greet shortly after the page loads
  setTimeout(function () {
    say('喵~ 你来啦')
  }, 1200)
})()
