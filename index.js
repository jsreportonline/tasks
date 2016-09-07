const http = require('http')
const manager = require('script-manager')()
const path = require('path')

manager.ensureStarted((err) => {
  if (err) {
    console.error(err)
    throw err
  }

  const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
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
        console.log('running request')

        const body = JSON.parse(data)

        body.options.execModulePath = path.join(__dirname, 'scripts', path.basename(body.options.execModulePath))

        if (body.inputs.engine) {
          body.inputs.engine = path.join(__dirname, 'scripts', path.basename(body.inputs.engine))
        }

        manager.execute(body.inputs, body.options, (err, scriptResponse) => {
          console.log('request finished ' + err)
          if (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'text/plain')
            return res.end('Error when executing script ' + err.stack)
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(scriptResponse))
        })
      } catch (e) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/plain')
        return res.end('Error when executing script ' + e.stack)
      }
    })
  })

  server.listen(3000)
})




