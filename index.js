const app = require('express')()
const server = require('http').createServer(app)
const consola = require('consola')
require('./utils/io')(server)
require('dotenv').config()

server.listen(3080, () => {
  consola.ready({
    message: `Server listening on port 3080`,
    badge: true,
  })
})