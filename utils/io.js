// const mongoose = require('mongoose')
const { list } = require('emoji-json-list')

console.log(list[Math.floor(Math.random() * list.length)][0])

var users = []

const managerRoundTimer = (io, timeLeft) => {
  return new Promise((resolve, reject) => {
    io.emit('ServerMessage', 'Manager Round started.')
    var timer = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timer)
        consola.log(`Manager timer finished.`)
        io.emit('ServerMessage', 'Manager Round ended.')
        resolve()
      }
      io.emit('ServerTimer', timeLeft)
      consola.log(`Emitted ServerTimer = ${timeLeft}`)
      timeLeft -= 1
    }, 1000)
  })
}

module.exports = function (server) {
  const io = require('socket.io')(server, {
    cors: {
      origin: 'http://localhost:8080',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', async (socket) => {
    consola.log(`New websocket client: ${socket.id}`)
    users.push(socket.id)
    socket.emit('ServerIdentify', socket.id)
    consola.log(`Current users connected: ${users}`)

    if (users.length === 2) {
      consola.log(`${users.length} users now connected, starting timer...`)
      await managerRoundTimer(io, 60)
    }

    socket.on('ClientPing', () => {
      consola.log(`${socket.id} pinged us at ${Date.now().toString(2)}!`)
      // Let everyone enjoy!
      const hi = `Hiii ${list[Math.floor(Math.random() * list.length)][0]}`
      consola.log(`Saying hi to everyone with ${hi}.`)
      io.emit('ServerPing', hi)
    })

    socket.on('disconnect', () => {
      consola.log(`Websocket client ${socket.id} disconnected.`)
      users = users.filter(v => v !== socket.id)
      consola.log(`Current users connected: ${users}`)
    })
  })
}
