const http = require('http')
const manager = require('script-manager')({
  timeout: 10000
})
const path = require('path')
const _ = require('lodash')
const async = require('async')
const fs = require('fs')
const os = require('os')

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
            if (body.inputs.tasks.allowedModules.indexOf('fsproxy.js') === -1) {
              body.inputs.tasks.allowedModules.push('fsproxy.js')
            }

            if (body.inputs.tasks.allowedModules.indexOf('lodash') === -1) {
              body.inputs.tasks.allowedModules.push('lodash')
            }

            if (body.inputs.tasks.allowedModules.indexOf('xml2js') === -1) {
              body.inputs.tasks.allowedModules.push('xml2js')
            }

            let fsproxyPath = path.join(__dirname, 'lib', 'fsproxy.js')

            if (Array.isArray(body.inputs.tasks.modules)) {
              let depIndex = _.findIndex(body.inputs.tasks.modules, { alias: 'fsproxy.js' })

              if (depIndex !== -1) {
                body.inputs.tasks.modules[0].path = fsproxyPath
              } else {
                body.inputs.tasks.modules.push({
                  alias: 'fsproxy.js',
                  path: fsproxyPath
                })
              }

              depIndex = _.findIndex(body.inputs.tasks.modules, { alias: 'lodash' })

              if (depIndex !== -1) {
                body.inputs.tasks.modules[0].path = require.resolve('lodash')
              } else {
                body.inputs.tasks.modules.push({
                  alias: 'lodash',
                  path: require.resolve('lodash')
                })
              }

              depIndex = _.findIndex(body.inputs.tasks.modules, { alias: 'xml2js' })

              if (depIndex !== -1) {
                body.inputs.tasks.modules[0].path = require.resolve('xml2js')
              } else {
                body.inputs.tasks.modules.push({
                  alias: 'xml2js',
                  path: require.resolve('xml2js')
                })
              }
            } else {
              body.inputs.tasks.modules = [{
                alias: 'fsproxy.js',
                path: fsproxyPath
              }, {
                alias: 'lodash',
                path: require.resolve('lodash')
              }, {
                alias: 'xml2js',
                path: require.resolve('xml2js')
              }]
            }

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
