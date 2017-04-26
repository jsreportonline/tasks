const http = require('http')
const manager = require('script-manager')({
  timeout: 10000
})
const path = require('path')
const async = require('async')
const fs = require('fs')
const os = require('os')
// i like docker :D
const addXlsxFiles = (scriptResponse, cb) => {
  let content
  try {
    content = JSON.parse(scriptResponse.content)
  } catch (e) {
    // fallback to original syntax
    return cb()
  }
  async.parallel(content.$files.map((f, i) => (cb) => {
    fs.readFile(f, (err, fcontent) => {
      if (err) {
        return cb(err)
      }

      content.$files[i] = fcontent.toString('base64')
      cb()
    })
  }), (err) => {
    if (err) {
      return cb(err)
    }

    scriptResponse.content = JSON.stringify(content)
    cb()
  })
}

const postProcess = (body, scriptResponse, cb) => {
  if (body.inputs.engine && body.inputs.template.recipe === 'xlsx') {
    return addXlsxFiles(scriptResponse, cb)
  }

  cb()
}

const error = (err, res) => {
  res.statusCode = 400
  res.end(JSON.stringify({
    error: {
      message: err.message,
      stack: err.stack
    }
  }))
}

manager.ensureStarted((err) => {
  if (err) {
    console.error(err)
    throw err
  }

  console.log('starting server')

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

          if (body.inputs.template.recipe === 'xlsx') {
            body.inputs.tasks.allowedModules.push(path.join(__dirname, 'lib', 'fsproxy.js'))
            body.inputs.data.$xlsxModuleDirname = __dirname
            body.inputs.data.$tempDirectory = os.tmpdir()
          }
        }

        manager.execute(body.inputs, body.options, (err, scriptResponse) => {
          res.setHeader('Content-Type', 'application/json')

          if (err) {
            return error(err, res)
          }

          postProcess(body, scriptResponse, (err) => {
            if (err) {
              console.error(err)
              return error(err, res)
            }

            console.log('done')
            res.statusCode = 200
            return res.end(JSON.stringify(scriptResponse))
          })
        })
      } catch (e) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/plain')
        return res.end('Error when executing script ' + e.stack)
      }
    })
  })

  server.listen(process.env.PORT || 3000)
})
