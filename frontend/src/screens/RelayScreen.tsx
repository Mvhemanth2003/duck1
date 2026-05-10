import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../utils/constants';
import BluetoothService from '../services/BluetoothService';
import SocketService from '../services/SocketService';
import ChatBubble from '../components/ChatBubble';
import MessageInput from '../components/MessageInput';
import type { ChatMessage, RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Relay'>;
  route: RouteProp<RootStackParamList, 'Relay'>;
};

const RelayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userName } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [btConnected, setBtConnected] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [onlineUserConnected, setOnlineUserConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Refs to track latest connection state inside callbacks
  const btConnectedRef = useRef(false);
  const serverConnectedRef = useRef(false);

  const addSystemMessage = useCallback((content: string) => {
    const msg: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'relay',
      senderName: 'System',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const initializeRelay = useCallback(async () => {
    setIsConnecting(true);

    // Connect to the backend server via Socket.io
    const connected = await SocketService.connect();
    setServerConnected(connected);
    serverConnectedRef.current = connected;

    if (connected) {
      // Register as relay
      SocketService.register('relay', userName);

      // Listen for messages from online user (to forward to offline via BLE)
      SocketService.onMessage((message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);

        // If the message is destined for offline user, forward via Bluetooth
        if (message.forOffline && btConnectedRef.current) {
          const payload = JSON.stringify({
            sender: message.sender,
            senderName: message.senderName,
            content: message.content,
            relayed: true,
          });
          BluetoothService.sendMessage(payload);

          // Add relay notification
          const relayNotif: ChatMessage = {
            id: `relay-${Date.now()}`,
            sender: 'relay',
            senderName: 'System',
            content: '↪ Forwarded to Offline User via Bluetooth',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, relayNotif]);
        }
      });

      // Listen for user status changes
      SocketService.onUserStatus((status) => {
        if (status.role === 'online') {
          setOnlineUserConnected(status.connected);
          const statusMsg: ChatMessage = {
            id: `status-${Date.now()}`,
            sender: 'relay',
            senderName: 'System',
            content: status.connected
              ? `🌐 ${status.name} (Online User) connected`
              : `🌐 ${status.name} (Online User) disconnected`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, statusMsg]);
        }
      });

      addSystemMessage('🌐 Connected to server. Registered as Relay.');
    } else {
      addSystemMessage('❌ Failed to connect to server. Check your internet.');
    }

    // Set up BLE message listener (for messages from offline user)
    BluetoothService.onMessage((rawMessage: string) => {
      try {
        const parsed = JSON.parse(rawMessage);
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: parsed.sender || 'offline',
          senderName: parsed.senderName || 'Offline User',
          content: parsed.content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMsg]);

        // Forward to online user via server
        if (serverConnectedRef.current) {
          SocketService.relayToOnline(parsed.content, parsed.senderName || 'Offline User');

          const relayNotif: ChatMessage = {
            id: `relay-${Date.now()}`,
            sender: 'relay',
            senderName: 'System',
            content: '↪ Forwarded to Online User via Internet',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, relayNotif]);
        }
      } catch {
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'offline',
          senderName: 'Offline User',
          content: rawMessage,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    });

    setIsConnecting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, addSystemMessage]);

  useEffect(() => {
    initializeRelay();

    return () => {
      SocketService.disconnect();
      BluetoothService.disconnect();
    };
  }, [initializeRelay]);

  const handleScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);

    try {
      await BluetoothService.scanForDevices((device) => {
        setDiscoveredDevices((prev) => {
          if (prev.find((d) => d.id === device.id)) return prev;
          return [...prev, { id: device.id, name: device.name || 'Unknown' }];
        });
      });
    } catch (error: any) {
      Alert.alert('Bluetooth Error', error.message);
      setIsScanning(false);
    }
  };

  const handleBtConnect = async (device: any) => {
    setIsScanning(false);
    BluetoothService.stopScan();

    const success = await BluetoothService.connectToDevice(device);
    if (success) {
      setBtConnected(true);
      btConnectedRef.current = true;
      setDiscoveredDevices([]);
      addSystemMessage(`🔗 Bluetooth connected to ${device.name}`);
    } else {
      Alert.alert('Connection Failed', 'Could not connect via Bluetooth.');
    }
  };

  const handleSendMessage = async (content: string) => {
    const myMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'relay',
      senderName: userName,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, myMessage]);

    // Send to both bluetooth and server
    if (btConnected) {
      const btPayload = JSON.stringify({
        sender: 'relay',
        senderName: userName,
        content,
      });
      await BluetoothService.sendMessage(btPayload);
    }

    if (serverConnected) {
      SocketService.sendMessage('relay', userName, 'online', content);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>🔄 Relay Bridge</Text>
          <Text style={styles.headerSubtitle}>{userName} — Bridging connections</Text>
        </View>
      </View>

      {/* Connection status panels */}
      <View style={styles.statusPanel}>
        {/* Bluetooth status */}
        <View style={[styles.statusCard, btConnected && styles.statusCardActive]}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: btConnected ? COLORS.bluetooth : COLORS.error },
            ]}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Bluetooth</Text>
            <Text style={styles.statusValue}>
              {btConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          {!btConnected && (
            <TouchableOpacity
              style={styles.miniButton}
              onPress={handleScan}
              disabled={isScanning}>
              <Text style={styles.miniButtonText}>
                {isScanning ? '...' : 'Scan'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Server status */}
        <View style={[styles.statusCard, serverConnected && styles.statusCardActive]}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: serverConnected ? COLORS.internet : COLORS.error },
            ]}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Server</Text>
            <Text style={styles.statusValue}>
              {serverConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        {/* Online user status */}
        <View style={[styles.statusCard, onlineUserConnected && styles.statusCardActive]}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: onlineUserConnected ? COLORS.success : COLORS.textMuted },
            ]}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Online User</Text>
            <Text style={styles.statusValue}>
              {onlineUserConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Discovered devices (when scanning) */}
      {discoveredDevices.length > 0 && (
        <View style={styles.deviceList}>
          {discoveredDevices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceCard}
              onPress={() => handleBtConnect(device)}>
              <Text style={styles.deviceEmoji}>📱</Text>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceConnect}>Connect</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Relay flow indicator */}
      <View style={styles.flowBar}>
        <Text style={styles.flowText}>
          📵 Offline ← BT →{' '}
          <Text style={styles.flowHighlight}>
            YOU (Relay)
          </Text>{' '}
          ← WiFi → 🌐 Online
        </Text>
      </View>

      {/* Chat messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble message={item} isMine={item.sender === 'relay'} />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>🔄</Text>
            <Text style={styles.emptyChatText}>
              {isConnecting
                ? 'Connecting to server...'
                : 'Waiting for messages to relay...'}
            </Text>
            {isConnecting && (
              <ActivityIndicator
                color={COLORS.primary}
                style={styles.loadingIndicator}
              />
            )}
          </View>
        }
      />

      {/* Message input */}
      <MessageInput
        onSend={handleSendMessage}
        placeholder="Send as Relay..."
        accentColor={COLORS.primary}
        disabled={!btConnected && !serverConnected}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backText: {
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusPanel: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  statusCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusCardActive: {
    borderColor: COLORS.borderLight,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusValue: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  miniButton: {
    backgroundColor: COLORS.bluetooth,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  deviceList: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  deviceName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  deviceConnect: {
    fontSize: 12,
    color: COLORS.bluetooth,
    fontWeight: '700',
  },
  flowBar: {
    backgroundColor: COLORS.bgCard,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  flowText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyChatText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  flowHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  loadingIndicator: {
    marginTop: 12,
  },
});

export default RelayScreen;
