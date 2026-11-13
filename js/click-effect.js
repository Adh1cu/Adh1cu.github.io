// Click effect: each click pops up one of the 12 Core Socialist Values words
// （社会主义核心价值观， 24 characters in total), cycling in order, floating up
// and fading out with a random colour.
(function () {
  var words = ['富强', '民主', '文明', '和谐', '自由', '平等', '公正', '法治', '爱国', '敬业', '诚信', '友善']
  var idx = 0

  function randomColor () {
    var r = Math.floor(Math.random() * 200)
    var g = Math.floor(Math.random() * 200)
    var b = Math.floor(Math.random() * 200)
    return 'rgb(' + r + ',' + g + ',' + b + ')'
  }

  document.addEventListener('click', function (e) {
    var word = words[idx]
    idx = (idx + 1) % words.length

    var span = document.createElement('span')
    span.textContent = word
    span.className = 'click-effect-word'
    span.style.left = e.clientX + 'px'
    span.style.top = (e.clientY - 20) + 'px'
    span.style.color = randomColor()
    document.body.appendChild(span)

    setTimeout(function () {
      span.remove()
    }, 1500)
  })
})()
