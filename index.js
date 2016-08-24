const http = require('http')
const manager = require('script-manager')()
const path = require('path')

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    return res.end('OK')
  }

  var data = ''
  req.on('data', function (chunk) {
    data += chunk.toString()
  })

  req.on('end', function () {
    manager.ensureStarted((err) => {
      if (err) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/plain')
        return res.end('Error when starting script manager ' + err.stack)
      }

      const body = JSON.parse(data)

      body.options.execModulePath = path.join(__dirname, 'scripts', path.basename(body.options.execModulePath))
      body.inputs.engine = path.join(__dirname, 'scripts', path.basename(body.inputs.engine))

      console.log(JSON.stringify(body))

      manager.execute(body.inputs, body.options, (err, scriptResponse) => {
        if (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/plain')
          return res.end('Error when executing script ' + err.stack)
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify(scriptResponse))
      })
    })
  })
})

server.listen(3000)
