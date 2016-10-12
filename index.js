const http = require('http')
const manager = require('script-manager')()
const path = require('path')

var start = new Date().getTime()
manager.ensureStarted((err) => {
  if (err) {
    console.error(err)
    throw err
  }

  console.log('starting server')

  const server = http.createServer((req, res) => {
    console.log('received request ' + req.method + ' +' + (new Date().getTime() - start))

    if (req.method === 'GET') {
      console.log('ping')
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/plain')
      return res.end('OK')
    }

    var data = ''
    req.on('data', function (chunk) {
      if (chunk) {
        data += chunk.toString()
      }
    })

    req.on('end', function () {
      try {
        console.log('running request ' + ' +' + (new Date().getTime() - start) + data.substring(0, 20))

        const body = JSON.parse(data)

        body.options.execModulePath = path.join(__dirname, 'scripts', path.basename(body.options.execModulePath))

        if (body.inputs.engine) {
          body.inputs.engine = path.join(__dirname, 'scripts', path.basename(body.inputs.engine))
        }

        manager.execute(body.inputs, body.options, (err, scriptResponse) => {
          console.log('request finished ' + ' +' + (new Date().getTime() - start))
          if (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'text/plain')
            return res.end('Error when executing script ' + err.message)
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(scriptResponse))
        })
      } catch (e) {
        console.log('should not really get here')
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/plain')
        return res.end('Error when executing script ' + e.stack)
      }
    })
  })

  server.listen(3000)
})




