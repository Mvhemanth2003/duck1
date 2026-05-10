/**
 * Duck1 Web Demo — Full Communication Simulation
 *
 * Flow: Offline ←BT→ Relay ←Socket.io→ Online
 *
 * Bluetooth is simulated locally (since browsers don't have BLE peripheral mode).
 * Socket.io connections to the backend are REAL.
 */

const SERVER_URL = 'http://localhost:3000';

// State
let relaySocket = null;
let onlineSocket = null;
let isConnected = false;

// DOM references
const elements = {
  // Messages containers
  offlineMessages: document.getElementById('offlineMessages'),
  relayMessages: document.getElementById('relayMessages'),
  onlineMessages: document.getElementById('onlineMessages'),
  // Inputs
  offlineInput: document.getElementById('offlineInput'),
  relayInput: document.getElementById('relayInput'),
  onlineInput: document.getElementById('onlineInput'),
  // Send buttons
  offlineSend: document.getElementById('offlineSend'),
  relaySend: document.getElementById('relaySend'),
  onlineSend: document.getElementById('onlineSend'),
  // Status badges
  offlineBtStatus: document.getElementById('offlineBtStatus'),
  relayBtStatus: document.getElementById('relayBtStatus'),
  relayInetStatus: document.getElementById('relayInetStatus'),
  onlineInetStatus: document.getElementById('onlineInetStatus'),
  onlineRelayStatus: document.getElementById('onlineRelayStatus'),
  offlineStatusBar: document.getElementById('offlineStatusBar'),
  onlineStatusBar: document.getElementById('onlineStatusBar'),
  // Controls
  connectAllBtn: document.getElementById('connectAllBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  controlInfo: document.getElementById('controlInfo'),
};

// =============================================
// Message rendering
// =============================================
function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function addMessage(container, { type = 'received', sender = '', text = '', relayed = false }) {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${type}`;

  let html = '';

  if (type === 'system') {
    html = text;
  } else {
    if (sender && type !== 'sent') {
      html += `<div class="msg-sender">${sender}</div>`;
    }
    if (relayed) {
      html += `<div class="relay-badge">🔄 Relayed via Bluetooth</div>`;
    }
    html += `<div>${text}</div>`;
    html += `<div class="msg-time">${formatTime()}</div>`;
  }

  msgEl.innerHTML = html;
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function systemMsg(container, text) {
  addMessage(container, { type: 'system', text });
}

// =============================================
// Simulated Bluetooth Layer
// =============================================
const BluetoothSimulator = {
  connected: false,

  connect() {
    this.connected = true;
    // Update UI
    elements.offlineBtStatus.textContent = 'BT: Connected';
    elements.offlineBtStatus.classList.add('connected');
    elements.relayBtStatus.textContent = 'BT: Connected';
    elements.relayBtStatus.classList.add('connected');
    elements.offlineSend.disabled = false;
    elements.offlineStatusBar.textContent = '🔗 Bluetooth Connected — Messages relayed through middleman';
    elements.offlineStatusBar.style.background = 'rgba(0, 130, 252, 0.15)';

    systemMsg(elements.offlineMessages, '🔗 Bluetooth connected to Relay device');
    systemMsg(elements.relayMessages, '🔗 Bluetooth connected to Offline user');
  },

  disconnect() {
    this.connected = false;
    elements.offlineBtStatus.textContent = 'BT: Disconnected';
    elements.offlineBtStatus.classList.remove('connected');
    elements.relayBtStatus.textContent = 'BT: Disconnected';
    elements.relayBtStatus.classList.remove('connected');
    elements.offlineSend.disabled = true;
    elements.offlineStatusBar.textContent = '📵 No Internet — Use Bluetooth to connect to Relay';
    elements.offlineStatusBar.style.background = 'rgba(255, 82, 82, 0.1)';
    elements.offlineStatusBar.style.color = '#FF5252';
  },

  // Offline → Relay (simulated BT transfer with delay)
  sendToRelay(message) {
    if (!this.connected) return;

    // Simulate Bluetooth transmission delay (200-500ms)
    const delay = 200 + Math.random() * 300;
    setTimeout(() => {
      // Show on Relay
      addMessage(elements.relayMessages, {
        type: 'received',
        sender: 'Offline User (via BT)',
        text: message,
      });

      // Relay auto-forwards to Online via Socket.io
      if (relaySocket && relaySocket.connected) {
        relaySocket.emit('relay-to-online', {
          content: message,
          senderName: 'Offline User',
        });
        systemMsg(elements.relayMessages, '↪ Forwarded to Online User via Internet');
      }
    }, delay);
  },

  // Relay → Offline (simulated BT transfer with delay)
  sendToOffline(message, senderName) {
    if (!this.connected) return;

    const delay = 200 + Math.random() * 300;
    setTimeout(() => {
      addMessage(elements.offlineMessages, {
        type: 'relayed',
        sender: senderName,
        text: message,
        relayed: true,
      });
    }, delay);
  },
};

// =============================================
// Socket.io connections (REAL)
// =============================================
function connectRelay() {
  return new Promise((resolve) => {
    relaySocket = io(SERVER_URL, { transports: ['websocket'] });

    relaySocket.on('connect', () => {
      relaySocket.emit('register', { role: 'relay', name: 'Relay Device' });
      elements.relayInetStatus.textContent = 'Server: Connected';
      elements.relayInetStatus.classList.add('connected');
      systemMsg(elements.relayMessages, '🌐 Connected to server. Registered as Relay.');
      resolve(true);
    });

    relaySocket.on('connect_error', () => {
      elements.relayInetStatus.textContent = 'Server: Failed';
      systemMsg(elements.relayMessages, '❌ Failed to connect to server');
      resolve(false);
    });

    // Messages from Online user (to forward to Offline via BT)
    relaySocket.on('new-message', (data) => {
      addMessage(elements.relayMessages, {
        type: 'received',
        sender: `${data.senderName} (via Internet)`,
        text: data.content,
      });

      // Forward to Offline user via Bluetooth
      if (data.forOffline && BluetoothSimulator.connected) {
        BluetoothSimulator.sendToOffline(data.content, data.senderName);
        systemMsg(elements.relayMessages, '↪ Forwarded to Offline User via Bluetooth');
      }
    });

    relaySocket.on('user-status', (data) => {
      if (data.role === 'online') {
        systemMsg(elements.relayMessages,
          data.connected
            ? `🌐 ${data.name} (Online User) connected`
            : `🌐 ${data.name} (Online User) disconnected`
        );
      }
    });

    setTimeout(() => resolve(false), 5000);
  });
}

function connectOnline() {
  return new Promise((resolve) => {
    onlineSocket = io(SERVER_URL, { transports: ['websocket'] });

    onlineSocket.on('connect', () => {
      onlineSocket.emit('register', { role: 'online', name: 'Online User' });
      elements.onlineInetStatus.textContent = 'Server: Connected';
      elements.onlineInetStatus.classList.add('connected');
      elements.onlineSend.disabled = false;
      systemMsg(elements.onlineMessages, '🌐 Connected to server. Ready to communicate.');
      resolve(true);
    });

    onlineSocket.on('connect_error', () => {
      elements.onlineInetStatus.textContent = 'Server: Failed';
      systemMsg(elements.onlineMessages, '❌ Failed to connect to server');
      resolve(false);
    });

    // Messages from Offline user (relayed through server)
    onlineSocket.on('new-message', (data) => {
      addMessage(elements.onlineMessages, {
        type: data.relayed ? 'relayed' : 'received',
        sender: data.senderName,
        text: data.content,
        relayed: data.relayed || false,
      });
    });

    onlineSocket.on('user-status', (data) => {
      if (data.role === 'relay') {
        elements.onlineRelayStatus.textContent = data.connected ? 'Relay: Online' : 'Relay: Offline';
        elements.onlineRelayStatus.classList.toggle('connected', data.connected);
        elements.onlineRelayStatus.classList.toggle('badge-inet', data.connected);

        elements.onlineStatusBar.textContent = data.connected
          ? '✅ Relay is online — Messages will reach the Offline user'
          : '⚠️ Relay not connected — Offline user unreachable';
        elements.onlineStatusBar.style.background = data.connected
          ? 'rgba(0, 230, 118, 0.1)'
          : 'rgba(255, 171, 64, 0.1)';
        elements.onlineStatusBar.style.color = data.connected ? '#00E676' : '#FFAB40';

        systemMsg(elements.onlineMessages,
          data.connected
            ? `🔄 ${data.name} (Relay) is now online — Offline users can reach you`
            : `🔄 ${data.name} (Relay) disconnected`
        );
      }
    });

    onlineSocket.on('delivery-status', (data) => {
      systemMsg(elements.onlineMessages,
        data.status === 'pending'
          ? `⏳ Message pending: ${data.reason}`
          : `❌ Delivery failed: ${data.reason}`
      );
    });

    setTimeout(() => resolve(false), 5000);
  });
}

// =============================================
// Connect All
// =============================================
async function connectAll() {
  elements.connectAllBtn.disabled = true;
  elements.controlInfo.textContent = 'Connecting...';

  // 1. Connect Relay to server
  systemMsg(elements.relayMessages, '🔌 Connecting to server...');
  const relayOk = await connectRelay();

  // 2. Connect Online to server
  systemMsg(elements.onlineMessages, '🔌 Connecting to server...');
  const onlineOk = await connectOnline();

  // 3. Simulate Bluetooth connection (after short delay)
  await new Promise(r => setTimeout(r, 500));
  systemMsg(elements.offlineMessages, '🔍 Scanning for Relay device...');
  await new Promise(r => setTimeout(r, 800));
  systemMsg(elements.offlineMessages, '📱 Found "Relay Device" — Connecting...');
  await new Promise(r => setTimeout(r, 600));
  BluetoothSimulator.connect();

  isConnected = true;
  elements.disconnectBtn.disabled = false;
  elements.controlInfo.textContent = relayOk && onlineOk
    ? '✅ All connected! Send messages between any panel.'
    : '⚠️ Some connections failed. Backend server may not be running.';
  elements.controlInfo.style.color = relayOk && onlineOk ? '#00E676' : '#FFAB40';
}

function disconnectAll() {
  if (relaySocket) { relaySocket.disconnect(); relaySocket = null; }
  if (onlineSocket) { onlineSocket.disconnect(); onlineSocket = null; }
  BluetoothSimulator.disconnect();

  elements.relayInetStatus.textContent = 'Server: —';
  elements.relayInetStatus.classList.remove('connected');
  elements.onlineInetStatus.textContent = 'Server: —';
  elements.onlineInetStatus.classList.remove('connected');
  elements.onlineRelayStatus.textContent = 'Relay: —';
  elements.onlineRelayStatus.classList.remove('connected', 'badge-inet');
  elements.onlineSend.disabled = true;

  systemMsg(elements.offlineMessages, '🔌 Disconnected');
  systemMsg(elements.relayMessages, '🔌 Disconnected from all');
  systemMsg(elements.onlineMessages, '🔌 Disconnected');

  isConnected = false;
  elements.connectAllBtn.disabled = false;
  elements.disconnectBtn.disabled = true;
  elements.controlInfo.textContent = 'Disconnected. Click "Connect All" to reconnect.';
  elements.controlInfo.style.color = '';
}

// =============================================
// Send message handlers
// =============================================

// Offline → Relay (via Bluetooth)
function sendFromOffline() {
  const text = elements.offlineInput.value.trim();
  if (!text) return;

  addMessage(elements.offlineMessages, { type: 'sent', text });
  elements.offlineInput.value = '';

  // Send via simulated Bluetooth
  BluetoothSimulator.sendToRelay(text);
}

// Relay → both (via BT to Offline, via Socket.io to Online)
function sendFromRelay() {
  const text = elements.relayInput.value.trim();
  if (!text) return;

  addMessage(elements.relayMessages, { type: 'sent', text });
  elements.relayInput.value = '';

  // Send to Offline via BT
  if (BluetoothSimulator.connected) {
    BluetoothSimulator.sendToOffline(text, 'Relay');
  }

  // Send to Online via Socket.io
  if (relaySocket && relaySocket.connected) {
    relaySocket.emit('send-message', {
      sender: 'relay',
      senderName: 'Relay',
      receiver: 'online',
      content: text,
    });
  }
}

// Online → Relay → Offline (via Socket.io → BT)
function sendFromOnline() {
  const text = elements.onlineInput.value.trim();
  if (!text) return;

  addMessage(elements.onlineMessages, { type: 'sent', text });
  elements.onlineInput.value = '';

  // Send via Socket.io to Relay
  if (onlineSocket && onlineSocket.connected) {
    onlineSocket.emit('online-to-relay', {
      content: text,
      senderName: 'Online User',
    });
  }
}

// =============================================
// Event listeners
// =============================================
elements.connectAllBtn.addEventListener('click', connectAll);
elements.disconnectBtn.addEventListener('click', disconnectAll);

elements.offlineSend.addEventListener('click', sendFromOffline);
elements.relaySend.addEventListener('click', sendFromRelay);
elements.onlineSend.addEventListener('click', sendFromOnline);

// Enter key support
elements.offlineInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendFromOffline(); });
elements.relayInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendFromRelay(); });
elements.onlineInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendFromOnline(); });

// Initial system messages
systemMsg(elements.offlineMessages, '📵 Offline mode — No internet available');
systemMsg(elements.offlineMessages, 'Connect to Relay via Bluetooth to start messaging');
systemMsg(elements.relayMessages, '🔄 Relay mode — Bridge between Offline and Online');
systemMsg(elements.relayMessages, 'Waiting for connections...');
systemMsg(elements.onlineMessages, '🌐 Online mode — Internet connected');
systemMsg(elements.onlineMessages, 'Waiting for server connection...');
