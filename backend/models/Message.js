const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    enum: ['offline', 'relay', 'online'],
  },
  senderName: {
    type: String,
    required: true,
  },
  receiver: {
    type: String,
    required: true,
    enum: ['offline', 'relay', 'online'],
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  relayedAt: {
    type: Date,
    default: null,
  },
  delivered: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Message', messageSchema);
