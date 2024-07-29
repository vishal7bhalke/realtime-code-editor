const path = require('path');
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server);

const usersocketmap = {};

function getallconnectedclients(roomid) {
  return Array.from(io.sockets.adapter.rooms.get(roomid) || []).map((socketid) => {
    return {
      socketid,
      user: usersocketmap[socketid],
    };
  });
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', ({ roomid, user }) => {
    usersocketmap[socket.id] = user;
    socket.join(roomid);
    const clients = getallconnectedclients(roomid);
    clients.forEach(({ socketid }) => {
      io.to(socketid).emit('joined', {
        clients,
        user,
        socketid: socket.id,
      });
    });
  });

  socket.on('code_change', ({ roomid, code }) => {
    console.log("in");
    socket.in(roomid).emit('code_change', { code });
  });

  socket.on('sync_code', ({ code, socketid }) => {
    socket.in(socketid).emit('code_change', { code });
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];

    rooms.forEach((roomid) => {
      socket.broadcast.to(roomid).emit('disconnected', {
        socketid: socket.id,
        user: usersocketmap[socket.id],
      });
    });

    // Remove the user from the map after emitting the event
    delete usersocketmap[socket.id];
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
