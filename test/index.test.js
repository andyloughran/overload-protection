'use strict'
var protect = require('..')

test('throws if framework is unspecified', function () {
  expect(function () {
    protect()
  }).toThrow()
})

test('throws if framework is not supported', function () {
  expect(function () {
    protect('not a thing')
  }).toThrow()
})

test('throws if all thresholds are disabled (set to 0)', function () {
  expect(function () {
    protect('http', {
      eventLoopDelay: 0,
      maxRssBytes: 0,
      maxHeapUsedBytes: 0
    })
  }).toThrow()
})

test('throws if logStatsOnReq is true but logging is false', function () {
  expect(function () {
    protect('http', {
      logStatsOnReq: true
    })
  }).toThrow()
})

test('instance.stop ceases sampling', function (done) {
  var sI = global.setInterval
  var cI = global.clearInterval
  var mock = {unref: function () { return mock }}
  global.setInterval = function () { return mock }
  global.clearInterval = function (ref) {
    expect(ref).toBe(mock)
    global.setInterval = sI
    global.clearInterval = cI
    done()
  }
  var instance = protect('http')
  instance.stop()
})

test('sampleInterval option sets the sample rate', function (done) {
  var sI = global.setInterval
  var cI = global.clearInterval
  var sampleRate = 88
  var mock = {unref: function () { return mock }}
  global.setInterval = function (fn, n) {
    expect(n).toBe(sampleRate)
    return mock
  }
  global.clearInterval = function (ref) {
    expect(ref).toBe(mock)
    global.setInterval = sI
    global.clearInterval = cI
    done()
  }
  var instance = protect('http', {
    sampleInterval: sampleRate
  })
  instance.stop()
})

test('exposes maxEventLoopDelay option on instance', function () {
  var value = 9999
  var instance = protect('http', {
    maxEventLoopDelay: value
  })
  expect(instance.maxEventLoopDelay).toBe(value)
  instance.stop()
})

test('exposes maxHeapUsedBytes option on instance', function () {
  var value = 9999
  var instance = protect('http', {
    maxHeapUsedBytes: value
  })
  expect(instance.maxHeapUsedBytes).toBe(value)
  instance.stop()
})

test('exposes maxRssBytes option on instance', function () {
  var value = 9999
  var instance = protect('http', {
    maxRssBytes: value
  })
  expect(instance.maxRssBytes).toBe(value)
  instance.stop()
})

test('instance.eventLoopDelay indicates the delay between samples', function (done) {
  var delay = 50
  var instance = protect('http')
  var start = Date.now()
  // "sleep" with while blocking is imprecise, particularly in turbofan,
  // throwing in a Buffer.alloc to compensate
  while (Date.now() - start <= delay) { Buffer.alloc(12400) }
  // Any function passed as the setImmediate() argument is a callback that's executed in the next iteration of the event loop.
  setImmediate(function () {
    expect(instance.eventLoopDelay < delay).toBe(true)
    instance.stop()
    done()
  })
})

test('instance.eventLoopOverload is true when maxEventLoopDelay threshold is breached', function (done) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  // Any function passed as the setImmediate() argument is a callback that's executed in the next iteration of the event loop.
  setImmediate(function () {
    expect(instance.eventLoopOverload).toBe(true)
    instance.stop()
    done()
  })
})

test('instance.eventLoopOverload is false when returning under maxEventLoopDelay threshold', function (done) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    setTimeout(function () {
      expect(instance.eventLoopOverload).toBe(false)
      instance.stop()
      done()
    }, 10)
  })
})

test('instance.eventLoopOverload is always false when maxEventLoopDelay is 0 (maxHeapUsedBytes enabled)', function (done) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxHeapUsedBytes: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    expect(instance.eventLoopOverload).toBe(false)
    instance.stop()
    done()
  })
})

test('instance.eventLoopOverload is always false when maxEventLoopDelay is 0 (maxRssBytes enabled)', function (done) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    expect(instance.eventLoopOverload).toBe(false)
    instance.stop()
    done()
  })
})

test('instance.overload is true if instance.eventLoopOverload is true', function (done) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 1
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    expect(instance.eventLoopOverload).toBe(true)
    expect(instance.overload).toBe(instance.eventLoopOverload)
    instance.stop()
    done()
  })
})

test('instance.heapUsedOverload is true when maxHeapUsedBytes threshold is breached', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    expect(instance.heapUsedOverload).toBe(true)
    process.memoryUsage = memoryUsage
    instance.stop()
    done()
  }, 6)
})

test('instance.heapUsedOverload is false when returning under maxHeapUsedBytes threshold', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    process.memoryUsage = function () {
      return {
        rss: 99999,
        heapTotal: 9999,
        heapUsed: 2,
        external: 99
      }
    }
    setTimeout(function () {
      expect(instance.heapUsedOverload).toBe(false)
      process.memoryUsage = memoryUsage
      instance.stop()
      done()
    }, 6)
  }, 6)
})

test('instance.heapUsedOverload is always false when maxHeapUsedBytes is 0', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 0
  })
  setTimeout(function () {
    expect(instance.heapUsedOverload).toBe(false)
    process.memoryUsage = memoryUsage
    instance.stop()
    done()
  }, 6)
})

test('instance.overload is true if instance.heapUsedOverload is true', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    expect(instance.heapUsedOverload).toBe(true)
    expect(instance.overload).toBe(instance.heapUsedOverload)
    instance.stop()
    process.memoryUsage = memoryUsage
    done()
  }, 6)
})

test('instance.rssOverload is true when maxRssBytes threshold is breached', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxRssBytes: 10
  })
  setTimeout(function () {
    expect(instance.rssOverload).toBe(true)
    process.memoryUsage = memoryUsage
    instance.stop()
    done()
  }, 6)
})

test('instance.rssOverload is false when returning under maxRssBytes threshold', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    process.memoryUsage = function () {
      return {
        rss: 2,
        heapTotal: 9999,
        heapUsed: 2,
        external: 99
      }
    }
    setTimeout(function () {
      expect(instance.rssOverload).toBe(false)
      instance.stop()
      process.memoryUsage = memoryUsage
      done()
    }, 6)
  }, 6)
})

test('instance.rssOverload is always false when maxRssBytes is 0', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxRssBytes: 0
  })
  setTimeout(function () {
    expect(instance.rssOverload).toBe(false)
    instance.stop()
    process.memoryUsage = memoryUsage
    done()
  }, 6)
})

test('instance.overload is true if instance.rssOverload is true', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxRssBytes: 10
  })
  setTimeout(function () {
    expect(instance.rssOverload).toBe(true)
    expect(instance.overload).toBe(instance.rssOverload)
    instance.stop()
    process.memoryUsage = memoryUsage
    done()
  }, 6)
})

if (Object.setPrototypeOf) {
  test('Supports legacy JS (__proto__)', function () {
    var setPrototypeOf = Object.setPrototypeOf
    delete Object.setPrototypeOf
    var instance = protect('http')
    // overload wouldn't be in instance if __proto__ wasn't set
    expect('overload' in instance).toBe(true)
    Object.setPrototypeOf = setPrototypeOf
  })
}

if (!Object.setPrototypeOf) {
  test('Supports modern/future JS (Object.setPrototypeOf)', function () {
    Object.setPrototypeOf = function (o, proto) {
      o.__proto__ = proto // eslint-disable-line
    }
    var instance = protect('http')
    // overload wouldn't be in instance if __proto__ wasn't set
    expect('overload' in instance).toBe(true)
    delete Object.setPrototypeOf
  })
}
