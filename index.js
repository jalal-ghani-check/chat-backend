/**
 * Server files don't run in the browser so we can freely use ES6 syntax
 * here without using any special dependencies such as babel/webpack
 */
 let exp = require('express');
 let app =  require('express')();
 let querystring = require('querystring');
 
 let http = require('http').Server(app);
//  app.use(cors())
 
 app.use('/style', exp.static(__dirname + '/style'))
 let io = require('socket.io')(http, {
  cors: {
    origin: "http://gz-games.herokuapp.com", // ToDo: change for production
    methods: ["GET", "POST"]
  }
}); // including socket.io
 app.get('/', (req, res) => {
   res.sendFile(__dirname + '/index.html'); // sending html file in response
 })
 
 
 http.listen(4000, () => {
   console.log('listening @ 4000');
 })
  
 /**
  * when socket connection is established
  */
 io.on('connection', (socket) => {
   
   /**
    * following method is crucial for maintaining list of online people in the channel
    */
 
   let host = socket.handshake.headers.host;
     socket.emit('on-connect', true)
   console.log("hosts: " + host)
 
     
     socket.on('send-message', (data) => {
        console.log('message contents: ', data);
         socket.broadcast.emit('on-message-receive', data)
     })
               
               
               
   socket.on('loggedIn', (id) => {
     if(id) {
       users[id] = socket.id
       let arr = {}
       arr[id] = socket.id
       userIds.push(id)
       socketIds.push(socket.id)
       socketUser[socket.id] = id
 
 
     }
     const uniqueSet = new Set(userIds)
     const backtoarray = [...uniqueSet]
 
     socket.broadcast.emit('updateParticipantsOnline', backtoarray)
     socket.emit('updateParticipantsOnline', backtoarray)
   })
 
   /**
    * When socket connection disconnects, following method will be called
    */
   socket.on('disconnect', () => {
     console.log('disconnected')
     id = socketUser[socket.id]
 
     // let index = null
     console.log('***userId***', id)
     for(let i = 0; i < userIds.length; i++) {
       if(userIds[i] == id) {
         userIds.splice(i, 1)
         break
       }
     }
 
     delete(socketUser[socket.id])
   })
 
 
 })