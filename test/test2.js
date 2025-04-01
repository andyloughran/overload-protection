var protect = require('..')

var delay = 50
var instance = protect('http')

var start = Date.now()
console.log(start)
while (Date.now() - start <= delay) { }
console.log(Date.now())
setImmediate(function () {
  console.log(instance.eventLoopDelay)
  console.log(instance.eventLoopDelay > delay)
  instance.stop()
})
