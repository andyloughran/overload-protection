'use strict'

var http = require('http')
var restify = require('restify')

var protection = require('../../..')

function block (n) {
  while (n--) { JSON.parse(JSON.stringify(require('../../../package.json'))) }
}

test('sends 503 when event loop is overloaded, per maxEventLoopDelay', function (done) {
  var protect = protection('restify', {
    maxEventLoopDelay: 1
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    var req = http.get('http://localhost:3000')
    block(50000)
    req.on('response', function (res) {
      expect(res.statusCode).toBe(503)
      protect.stop()
      server.close()
      done()
    }).end()
  })
})

test('sends 503 when heap used threshold is passed, as per maxHeapUsedBytes', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxHeapUsedBytes: 40
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('sends 503 when heap used threshold is passed, as per maxRssBytes', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('sends Retry-After header as per clientRetrySecs', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    clientRetrySecs: 22
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        expect(res.headers['retry-after']).toBe('22')
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('does not set Retry-After header when clientRetrySecs is 0', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    clientRetrySecs: 0
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        expect('retry-after' in res.headers).toBe(false)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('errorPropagationMode:false (default)', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })
  server.use(function () {
    done.fail()
  })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('errorPropagationMode:true', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })
  server.use(function (err, req, res, next) {
    expect(err).toBeTruthy()
    expect(err.statusCode).toBe(503)
    res.end('err message')
  })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('in default mode, production:false leads to high detail client response message', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    production: false,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        res.once('data', function (msg) {
          msg = msg.toString()
          expect(msg).toBe('Server experiencing heavy load: (rss)')
          server.close()
          protect.stop()
          process.memoryUsage = memoryUsage
          done()
        })
      }).end()
    }, 6)
  })
})

test('in default mode, production:true leads to standard 503 client response message', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    production: true,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        res.once('data', function (msg) {
          msg = msg.toString()
          expect(msg).toBe('Service Unavailable')
          server.close()
          protect.stop()
          process.memoryUsage = memoryUsage
          done()
        })
      }).end()
    }, 6)
  })
})

test('in errorPropagationMode production:false sets expose:true on error object', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    production: false,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })
  server.use(function (err, req, res, next) {
    expect(err).toBeTruthy()
    expect(err.expose).toBe(true)
    res.end('err message')
  })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('in errorPropagationMode production:true sets expose:false on error object', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    production: true,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })
  server.use(function (err, req, res, next) {
    expect(err).toBeTruthy()
    expect(err.expose).toBe(false)
    res.end('err message')
  })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }).end()
    }, 6)
  })
})

test('resumes usual operation once load pressure is reduced under threshold', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        expect(res.statusCode).toBe(503)
        process.memoryUsage = function () {
          return {
            rss: 10,
            heapTotal: 9999,
            heapUsed: 999,
            external: 99
          }
        }
        setTimeout(function () {
          http.get('http://localhost:3000').on('response', function (res) {
            expect(res.statusCode).toBe(200)
            server.close()
            protect.stop()
            process.memoryUsage = memoryUsage
            done()
          })
        }, 6)
      }).end()
    }, 6)
  })
})

test('if logging option is a string, when overloaded, writes log message using req.log as per level in string', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    logging: 'warn'
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(function (req, res, next) {
    req.log = {
      warn: function (msg) {
        expect(msg).toBe('Server experiencing heavy load: (rss)')
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        done()
      }
    }
    next()
  })
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})

test('if logging option is a function, when overloaded calls the function with heavy load message', function (done) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('restify', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    logging: function (msg) {
      expect(msg).toBe('Server experiencing heavy load: (rss)')
      server.close()
      protect.stop()
      process.memoryUsage = memoryUsage
      done()
    }
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})

test('if logStatsOnReq is true and if logging option is a string, writes log message using req.log as per level in string for every request', function (done) {
  var protect = protection('restify', {
    logging: 'info',
    logStatsOnReq: true
  })
  expect.assertions(1)
  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(function (req, res, next) {
    req.log = {
      info: function (msg) {
        expect(Object.keys(msg)).toEqual([
          'overload',
          'eventLoopOverload',
          'heapUsedOverload',
          'rssOverload',
          'eventLoopDelay',
          'maxEventLoopDelay',
          'maxHeapUsedBytes',
          'maxRssBytes'
        ])
        server.close()
        protect.stop()
        done()
      }
    }
    next()
  })
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })
  server.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})

test('if logStatsOnReq is true and logging option is a function, calls the function with stats on every request', function (done) {
  var protect = protection('restify', {
    logStatsOnReq: true,
    logging: function (msg) {
      expect(Object.keys(msg)).toEqual([
        'overload',
        'eventLoopOverload',
        'heapUsedOverload',
        'rssOverload',
        'eventLoopDelay',
        'maxEventLoopDelay',
        'maxHeapUsedBytes',
        'maxRssBytes'
      ])
      server.close()
      protect.stop()
      done()
    }
  })

  var server = restify.createServer({name: 'myapp', version: '1.0.0'})
  server.use(protect)
  server.get('/', function (req, res) { res.end('content') })

  server.listen(3001, function () {
    setTimeout(function () {
      http.get('http://localhost:3001').end()
    }, 6)
  })
})
