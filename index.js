/**
 * Server files don't run in the browser so we can freely use ES6 syntax
 * here without using any special dependencies such as babel/webpack
 */
 let exp = require('express');
 let app =  require('express')();
 let querystring = require('querystring');
 
 let http = require('http').Server(app);
 const cors = require('cors');
 const axios = require('axios');
//  app.use(cors())
 
 app.use('/style', exp.static(__dirname + '/style'))
 let io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:3000", // ToDo: change for production
    methods: ["GET", "POST"]
  }
}); // including socket.io
 app.get('/', (req, res) => {
   res.sendFile(__dirname + '/index.html'); // sending html file in response
 })
 
 
 http.listen(4000, () => {
   console.log('listening @ 3000');
 })
 let users = {}
 let userIds = []
 let socketIds = []
 let socketUser = []
 
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
 
   /*let endpointMap = {
     'localhost:3000': 'http://cake-chat-app:80/',
     'social.courseticket.com': 'https://social.courseticket.com/',
     'social.tadarab.org': 'https://social.tadarab.org/',
     'social0w.sajil.org': 'https://social0w.sajil.org/',
   };*/
   let phpChatApiEndpoint = 'http://devlocal.police-system.co/'; // change for production
 
   console.log("Selected cake chat app end point : " + phpChatApiEndpoint)
 

   socket.on('ping', (data) => {
    console.log('ping')
    console.log(data)
    socket.emit('pong', ['ping', 'pong'])
  })
     
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
 
       console.log('userIds: ', userIds)
       console.log('socketIds: ', socketIds)
 
 
     }
     const uniqueSet = new Set(userIds)
     const backtoarray = [...uniqueSet]
     console.log('unique val: ', backtoarray)
 
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
 
   /**
    * Whenever a user leaves chat, following method is called we update (online) users array.
    */
   socket.on('left', (id) => {
 
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
     // delete(users[index])
 
     let sockIndex = socketIds.indexOf(socket.id)
     if ( sockIndex > -1) {
       socketIds.splice(sockIndex, 1)
     }
 
     console.log('------------------------------------')
     console.log('remaining socketIds: ', socketIds)
     console.log('remaining userIds: ', userIds)
 
     io.sockets.connected[socket.id].disconnect();
 
     const uniqueSet = new Set(userIds)
     const backtoarray = [...uniqueSet]
     console.log('unique val: ', backtoarray)
     console.log('users online: ', backtoarray)
     socket.broadcast.emit('updateParticipantsOnline', backtoarray)
   })
 
   /**
    * Leaving chat i.e. kind of signing out
    */
   socket.on('leaving', (room) => {
     console.log('leave: ', room)
     socket.leave(room)
   })
 
   socket.on('mounted', (data) => {
     socket.broadcast.emit('mounted', data)
   })
 
   socket.on('get-chat-channels', (data) => {
     console.log("2019-12-20 000: " + phpChatApiEndpoint + 'api/v2/users/' + data.userId + '/channels/');
     console.log("2019-12-20 000 data.accessToken: " + data.accessToken);
 
     axios({
       method: 'get',
       url: phpChatApiEndpoint + 'api/v2/users/' + data.userId + '/channels/',
       headers: {
         'Authorization': data.accessToken
       }
     })
       .then(function (response) {
           console.log("2019-12-20 155")
           console.log(response)
         data['response'] = response.status
         data['totalUnreadCount'] = response.data.totalUnreadCount
         data['chatChannels'] = response.data.channels
 
         if(response.status) {
           socket.emit('get-chat-channels', data)
         }
 
       })
       .catch(function (ex) {
         console.log('------------------------------------------------------------------------ 20191220 165')
         console.log(ex)
         console.log('------------------------------------------------------------------------ 20191220 167')
         // in case of error, returning empty array
         const errorMessage = {
           baseUrl: phpChatApiEndpoint,
           status: ex.response !== undefined ? ex.response.status : 'Error status not received.',
           route: 'api/v2/users/' + data.userId + '/channels/',
           message: 'Error on getting chat channels',
           errorDetails: ex.response !== undefined ? ex.response.data : 'Error data not received.',
         }
         console.log(errorMessage)
         socket.emit('get-chat-channels', errorMessage)
         socket.emit('on-socket-error', errorMessage)
       });
   })
 
   socket.on('get-chat-messages', (data) => {
 
     axios({
       method: 'get',
       // to send proper time variable
       url: phpChatApiEndpoint + 'api/v2/channels/' + data.channelId + '/messages?id=' + data.userId + '&offset=0&limit=10',
       headers: {
         'Authorization' : data.accessToken,
         'Content-Type' : 'application/json'
       }
     })
       .then(function (response) {
         data['response'] = response.status
         data['chat'] = response.data
         if(response.status == 200) {
           socket.emit('receive-chat-messages', data)
         }
 
       })
       .catch(function (ex) {
         let errorMessage = {
           baseUrl: phpChatApiEndpoint,
           status: ex.response.status,
           route: 'api/v2/channels/' + data.channelId + '/messages?id=' + data.userId + '&offset=0&limit=10',
           message: 'Error on getting chat messages from DB',
           errorDetails: ex.response.data
         }
         socket.emit('receive-chat-messages', [])
         socket.emit('on-socket-error', errorMessage)
       });
 
   })
 
   socket.on('chat-message', (room, data) => {
     socket.emit('update-pending-status')
     let chatData = data
     axios.post(phpChatApiEndpoint + 'api/v2/channels/' + data.channel_id + '/messages/',
       querystring.stringify({
         'sender_external_id' : data.sender_external_id,
         'text' : data.text,
         'access_token' : data.access_token
       }))
       .then(function (response) {
         // We are using channelId for unique room identifier.
         socket.broadcast.emit('updateUnreadCounter', room)
         socket.broadcast.to(room).emit('chat-message', chatData)
         if(response.data.warnings) {
           socket.emit('on-socket-warn', response.data.warnings)
         }
       })
       .catch(function (ex) {
         const errorMessage = {
           baseUrl: phpChatApiEndpoint,
           status: ex.response.status,
           route: 'api/v2/channels/' + data.channel_id + '/messages/',
           message: 'Error on sending a message',
           errorDetails: ex.response.data
         }
         socket.emit('message-not-sent')
         socket.emit('on-socket-error', errorMessage)
       });
   })
 
   socket.on('get-channels-participants', (data) => {
 
     axios({
       method: 'get',
       url: phpChatApiEndpoint + 'api/v2/channels/' + data.channelId + '/members?id=' + data.userId,
       headers: {
         Authorization: data.accessToken
       }
     })
       .then(function (response) {
 
 
         data['response'] = response.status
         data['channelsParticipants'] = response.data.participants
         if(response.status == 200) {
           socket.emit('receiver-channels-participants', data)
         }
       })
       .catch(function (ex) {
 
         const errorMessage = {
           baseUrl: phpChatApiEndpoint,
           status: ex.response.status,
           route: 'api/v2/channels/' + data.channelId + '/members?id=' + data.userId,
           message: 'Error on getting channel participants',
           errorDetails: ex.response.data
         }
         socket.emit('receiver-channels-participants', [])
         socket.emit('on-socket-error', errorMessage)
 
       });
 
   })
 
   socket.on('remove-channel-participants', (data) => {
     axios({
       method: 'delete',
       headers: {
         'Content-Type' : 'application/json',
         'Authorization' : data.accessToken
       },
       url: phpChatApiEndpoint + 'api/v2/channels/' + data.channelId + '/members/' +  data.participantId + '?id=' + data.userId,
     })
       .then(function (response) {
         data['response'] = response.status
         data['channelsParticipants'] = response.data.participants
         socket.broadcast.emit('leave-room-on-ban', {roomId: data.channelId, userId: data.participantId})
         socket.emit('update-on-channels-participant-removal', data)
       })
       .catch(function (ex) {
         const errorMessage = {
           baseUrl: phpChatApiEndpoint,
           status: ex.response.status,
           route: 'api/v2/channels/' + data.channelId + '/members/' +  data.participantId + '?id=' + data.userId,
           message: 'Error on removing channel participants',
           errorDetails: ex.response.data
         }
         socket.emit('update-on-channels-participant-removal', {'removeError' : true})
         socket.emit('on-socket-error', errorMessage)
       });
 
   })
 
   socket.on('disconnect-me', () => {
     console.log('user disconnected on ban')
     socket.disconnect()
   })
 
   /**
    * When someone is typing message
    */
   socket.on('typing', (room, data) => {
     socket.broadcast.to(room).emit('typing', data)
   })
 
   /**
    * When someone stops typing message
    */
   socket.on('stopTyping', (room, data) => {
     socket.broadcast.to(room).emit('stopTyping', data)
   })
 
   socket.on('joining', (room) => {
     console.log('joined: ', room)
     console.log('/////////// ids on join ////////////////')
     console.log(socketIds)
     socket.join(room)
   })
 
 })