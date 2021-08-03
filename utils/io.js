const e = require('cors');
const { list } = require('emoji-json-list')
const randomEmoji = () => list[Math.floor(Math.random() * list.length)][0];
consola.log(randomEmoji())

class Conversation {
  topic = '';
  participantsSet = new Set();

  constructor(topic) {
    this.topic = topic;
  }

  get participants() {
    return Array.from(this.participantsSet);
  }

  addParticipant(userid) {
    this.participantsSet.add(userid);
  }

  removeParticipant(userid) {
    this.participantsSet.delete(userid);
  }

  hasParticipant(userid) {
    return this.participantsSet.has(userid);
  }
}

// What's a collection of conversations, including the participants, called?
class Symposium {
  conversations = [];
  participantsSet = new Set();

  constructor() {
    this.conversations = [
      new Conversation('meaning of life'),
      new Conversation('cats'),
      new Conversation('42')
    ];
  }

  get participants() {
    return Array.from(this.participantsSet);
  }

  get topics() {
    return this.conversations.map(c => c.topic);
  }

  addTopic(topic) {
    if(this.topics.indexOf(topic) < 0) {
      consola.log(`Creating topic "${topic}"...`)
      this.conversations = [...this.conversations, new Conversation(topic)];
    } else {
      consola.log(`Got a request to create topic "${topic}" when it already exists! Ignoring it.`);
    }
  }

  removeTopic(topic) {
    consola.log(`Got a request to remove topic "${topic}", seeing if we have that one...`)
    for(let i = 0; i < this.conversations.length; i++) {
      if(this.conversations[i].topic === topic) {
        consola.log(`Found the topic at index ${i}.`)
        this.conversations.splice(i, 1);
        break;
      }
    }
    consola.log(`Remaining conversation topics: ${this.topics}`);
  }

  addParticipant(userid) {
    this.participantsSet.add(userid);
  }

  removeParticipant(userid) {
    this.participantsSet.delete(userid);
    this.conversations.map(conversation => conversation.removeParticipant(userid));
  }

  addParticipantToConversation(userid, topic) {
    const matchedConversations = this.conversations.filter(c => c.topic === topic);
    if(matchedConversations.length === 1) {
      matchedConversations[0].addParticipant(userid);
    }
  }

  removeParticipantFromConversation(userid, topic) {
    const matchedConversations = this.conversations.filter(c => c.topic === topic);
    if(matchedConversations.length === 1) {
      matchedConversations[0].removeParticipant(userid);
    }
  }

  participantsTopics(userid) {
    let theirTopics = [];
    this.conversations.map(conversation => {
      if(conversation.hasParticipant(userid)) {
        theirTopics = [...theirTopics, conversation.topic];
      }
    });
    return theirTopics;
  }
};

// const managerRoundTimer = (io, timeLeft) => {
//   return new Promise((resolve, reject) => {
//     io.emit('server:message', 'Manager Round started.')
//     var timer = setInterval(() => {
//       if (timeLeft <= 0) {
//         clearInterval(timer)
//         consola.log(`Manager timer finished.`)
//         io.emit('server:message', 'Manager Round ended.')
//         resolve()
//       }
//       io.emit('server:timer', timeLeft)
//       consola.log(`Emitted ServerTimer = ${timeLeft}`)
//       timeLeft -= 1
//     }, 1000)
//   })
// }

module.exports = function (server) {
  const io = require('socket.io')(server, {
    cors: {
      origin: 'http://localhost:8080',
      methods: ['GET', 'POST']
    }
  })

  const symposium = new Symposium();

  io.on('connection', async (socket) => {
    consola.log(`New websocket client: ${socket.id}`);
    symposium.addParticipant(socket.id);
    socket.emit('server:conversation:list:personal', symposium.participantsTopics(socket.id));
    socket.emit('server:conversation:list:all', symposium.topics);
    socket.emit('server:identify', socket.id)
    consola.log(`Current users connected: ${symposium.participants}`);

    // if (symposium.participants.length === 2) {
    //   consola.log(`${symposium.participants.length} users now connected, starting timer...`);
    //   await managerRoundTimer(io, 60);
    // }

    socket.on('client:ping', () => {
      consola.log(`${socket.id} pinged us at ${Date.now().toString(2)}!`);
      // Let everyone enjoy!
      const hi = `Hiii ${randomEmoji()}`;
      consola.log(`Saying hi to everyone with ${hi}.`);
      io.emit('server:ping', hi);
    });

    socket.on('client:conversation:join', (topic) => {
      consola.log(`${socket.id} wants to join conversation ${topic}.`);
      socket.join(topic);
      symposium.addParticipantToConversation(socket.id, topic);
      socket.emit('server:conversation:list:personal', symposium.participantsTopics(socket.id));
    });

    socket.on('client:conversation:leave', (topic) => {
      consola.log(`${socket.id} wants to leave conversation ${topic}.`);
      socket.leave(topic);
      symposium.removeParticipantFromConversation(socket.id, topic);
      socket.emit('server:conversation:list:personal', symposium.participantsTopics(socket.id));
    });

    socket.on('client:conversation:create', (topic) => {
      consola.log(`${socket.id} wants to create topic ${topic}.`);
      symposium.addTopic(topic);
      io.emit('server:conversation:list:all', symposium.topics);
    });

    socket.on('client:conversation:remove', (topic) => {
      consola.log(`${socket.id} wants to remove topic "${topic}".`);
      symposium.removeTopic(topic);
      io.emit('server:conversation:list:all', symposium.topics);
      symposium.participants.map(userid => {
        consola.log(`Notifying ${userid} that the conversation "${topic}" no longer exists.`)
        io.to(userid).emit('server:conversation:list:personal', symposium.participantsTopics(userid));
      });
    });

    socket.on('disconnect', () => {
      consola.log(`Websocket client ${socket.id} disconnected.`);
      symposium.removeParticipant(socket.id);
      consola.log(`Current users connected: ${symposium.participants}`);
      consola.log(`Current topics: symposium.topics`);
    });
  })
}
