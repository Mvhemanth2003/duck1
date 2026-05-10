const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Track connected users by role
const connectedUsers = {
  relay: null,   // Socket ID of the relay user
  online: null,  // Socket ID of the online user
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duck1_messenger')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.log('❌ MongoDB connection error:', err.message));

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/connected-users', (req, res) => {
  res.json({
    relay: connectedUsers.relay !== null,
    online: connectedUsers.online !== null,
  });
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  // User registers their role
  socket.on('register', (data) => {
    const { role, name } = data;
    console.log(`📝 User registered: ${name} as ${role} (${socket.id})`);

    if (role === 'relay' || role === 'online') {
      connectedUsers[role] = socket.id;
      socket.role = role;
      socket.userName = name;

      // Join a room based on role
      socket.join(role);

      // Notify all clients about connection status
      io.emit('user-status', {
        role,
        connected: true,
        name,
      });

      console.log(`✅ ${role} user connected: ${name}`);
    }
  });

  // Relay sends a message from offline user to online user
  socket.on('relay-to-online', async (data) => {
    console.log(`📨 Relay forwarding message to online: "${data.content}"`);

    const message = new Message({
      sender: 'offline',
      senderName: data.senderName || 'Offline User',
      receiver: 'online',
      content: data.content,
      relayedAt: new Date(),
    });

    try {
      await message.save();
    } catch (err) {
      console.log('Error saving message:', err.message);
    }

    // Forward to online user
    if (connectedUsers.online) {
      io.to(connectedUsers.online).emit('new-message', {
        id: message._id?.toString() || Date.now().toString(),
        sender: 'offline',
        senderName: data.senderName || 'Offline User',
        content: data.content,
        timestamp: message.timestamp,
        relayed: true,
      });
      console.log('✅ Message delivered to online user');
    } else {
      console.log('⚠️ Online user not connected, message saved for later');
      // Notify relay that online user is not available
      socket.emit('delivery-status', {
        messageId: message._id?.toString(),
        status: 'pending',
        reason: 'Online user not connected',
      });
    }
  });

  // Online user sends message to offline user (via relay)
  socket.on('online-to-relay', async (data) => {
    console.log(`📨 Online user sending to offline via relay: "${data.content}"`);

    const message = new Message({
      sender: 'online',
      senderName: data.senderName || 'Online User',
      receiver: 'offline',
      content: data.content,
    });

    try {
      await message.save();
    } catch (err) {
      console.log('Error saving message:', err.message);
    }

    // Forward to relay
    if (connectedUsers.relay) {
      io.to(connectedUsers.relay).emit('new-message', {
        id: message._id?.toString() || Date.now().toString(),
        sender: 'online',
        senderName: data.senderName || 'Online User',
        content: data.content,
        timestamp: message.timestamp,
        forOffline: true,
      });
      console.log('✅ Message delivered to relay for offline user');
    } else {
      console.log('⚠️ Relay not connected');
      socket.emit('delivery-status', {
        messageId: message._id?.toString(),
        status: 'failed',
        reason: 'Relay not connected',
      });
    }
  });

  // Direct messages between relay and online
  socket.on('send-message', async (data) => {
    console.log(`📨 Direct message from ${data.sender}: "${data.content}"`);

    const message = new Message({
      sender: data.sender,
      senderName: data.senderName,
      receiver: data.receiver,
      content: data.content,
    });

    try {
      await message.save();
    } catch (err) {
      console.log('Error saving message:', err.message);
    }

    const targetSocket = connectedUsers[data.receiver];
    if (targetSocket) {
      io.to(targetSocket).emit('new-message', {
        id: message._id?.toString() || Date.now().toString(),
        sender: data.sender,
        senderName: data.senderName,
        content: data.content,
        timestamp: message.timestamp,
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${socket.id}`);

    if (socket.role) {
      connectedUsers[socket.role] = null;

      io.emit('user-status', {
        role: socket.role,
        connected: false,
        name: socket.userName,
      });

      console.log(`❌ ${socket.role} user disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Duck1 Relay Server running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://0.0.0.0:${PORT}\n`);
});
