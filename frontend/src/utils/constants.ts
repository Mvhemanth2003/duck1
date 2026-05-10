// BLE Service and Characteristic UUIDs for Duck1 Messenger
export const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
export const BLE_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abd';

// Backend server URL — change this to your machine's IP when running on device
export const SERVER_URL = 'http://10.0.2.2:3000'; // Android emulator localhost
// export const SERVER_URL = 'http://192.168.x.x:3000'; // Use your actual IP for physical devices

// App colors - Premium dark theme
export const COLORS = {
  // Primary palette
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  primaryDark: '#4A42D4',

  // Accent
  accent: '#00D9FF',
  accentGlow: 'rgba(0, 217, 255, 0.15)',

  // Semantic
  success: '#00E676',
  warning: '#FFAB40',
  error: '#FF5252',
  info: '#40C4FF',

  // Bluetooth
  bluetooth: '#0082FC',
  bluetoothGlow: 'rgba(0, 130, 252, 0.2)',

  // Internet/Socket
  internet: '#00E676',
  internetGlow: 'rgba(0, 230, 118, 0.2)',

  // Backgrounds
  bgDark: '#0A0E17',
  bgCard: '#111827',
  bgCardLight: '#1A2332',
  bgElevated: '#1F2937',
  bgInput: '#151D2B',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Borders
  border: '#1E293B',
  borderLight: '#334155',

  // Message bubbles
  bubbleSent: '#6C63FF',
  bubbleSentText: '#FFFFFF',
  bubbleReceived: '#1A2332',
  bubbleReceivedText: '#F1F5F9',
  bubbleRelayed: '#1E3A5F',
  bubbleRelayedText: '#7DD3FC',
};

// Role configurations
export const ROLE_CONFIG = {
  offline: {
    title: 'Offline User',
    subtitle: 'No Internet — Uses Bluetooth',
    icon: '📵',
    color: COLORS.bluetooth,
    description: 'Connect via Bluetooth to the Relay device to send messages',
  },
  relay: {
    title: 'Relay Bridge',
    subtitle: 'Bluetooth + Internet',
    icon: '🔄',
    color: COLORS.primary,
    description: 'Bridge between Offline and Online users',
  },
  online: {
    title: 'Online User',
    subtitle: 'Internet Connected',
    icon: '🌐',
    color: COLORS.internet,
    description: 'Communicate via the internet through the server',
  },
};
