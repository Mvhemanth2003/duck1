import React, { useState, useEffect, useRef } from 'react';
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
import ChatBubble from '../components/ChatBubble';
import MessageInput from '../components/MessageInput';
import type { ChatMessage, RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OfflineUser'>;
  route: RouteProp<RootStackParamList, 'OfflineUser'>;
};

const OfflineUserScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userName } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [connectedDeviceName, setConnectedDeviceName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Set up BLE message listener
    BluetoothService.onMessage((rawMessage: string) => {
      try {
        const parsed = JSON.parse(rawMessage);
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: parsed.sender || 'relay',
          senderName: parsed.senderName || 'Relay',
          content: parsed.content,
          timestamp: new Date(),
          relayed: parsed.relayed || false,
        };
        setMessages((prev) => [...prev, newMsg]);
      } catch {
        // Plain text message
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'relay',
          senderName: 'Relay',
          content: rawMessage,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    });

    return () => {
      BluetoothService.disconnect();
    };
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);

    try {
      await BluetoothService.scanForDevices((device) => {
        setDiscoveredDevices((prev) => {
          // Avoid duplicates
          if (prev.find((d) => d.id === device.id)) return prev;
          return [...prev, { id: device.id, name: device.name || 'Unknown' }];
        });
      });
    } catch (error: any) {
      Alert.alert('Bluetooth Error', error.message);
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: any) => {
    setIsScanning(false);
    BluetoothService.stopScan();

    const success = await BluetoothService.connectToDevice(device);
    if (success) {
      setIsConnected(true);
      setConnectedDeviceName(device.name || 'Unknown Device');
      setDiscoveredDevices([]);

      // Send welcome message
      const welcomeMsg: ChatMessage = {
        id: 'system-connect',
        sender: 'relay',
        senderName: 'System',
        content: `Connected to ${device.name}. You can now send messages!`,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    } else {
      Alert.alert('Connection Failed', 'Could not connect to the device. Try again.');
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add to local messages
    const myMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'offline',
      senderName: userName,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, myMessage]);

    // Send via Bluetooth
    const payload = JSON.stringify({
      sender: 'offline',
      senderName: userName,
      content,
      timestamp: new Date().toISOString(),
    });

    const sent = await BluetoothService.sendMessage(payload);
    if (!sent) {
      Alert.alert('Send Failed', 'Could not send message via Bluetooth.');
    }
  };

  const handleDisconnect = async () => {
    await BluetoothService.disconnect();
    setIsConnected(false);
    setConnectedDeviceName('');
    setMessages([]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>📵 Offline Mode</Text>
          <Text style={styles.headerSubtitle}>
            {isConnected
              ? `Connected to ${connectedDeviceName}`
              : 'Not connected'}
          </Text>
        </View>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isConnected ? COLORS.success : COLORS.error },
          ]}
        />
      </View>

      {/* Connection status bar */}
      <View
        style={[
          styles.statusBar,
          isConnected
            ? styles.statusBarConnected
            : styles.statusBarDisconnected,
        ]}>
        <Text
          style={[
            styles.statusText,
            isConnected
              ? styles.statusTextConnected
              : styles.statusTextDisconnected,
          ]}>
          {isConnected
            ? '🔗 Bluetooth Connected — Messages relayed through middleman'
            : '📵 No Internet — Use Bluetooth to connect to Relay'}
        </Text>
      </View>

      {/* Main content */}
      {!isConnected ? (
        <View style={styles.connectSection}>
          {/* Scan button */}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScan}
            disabled={isScanning}
            activeOpacity={0.7}>
            {isScanning ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.scanButtonIcon}>🔍</Text>
            )}
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning for Relay...' : 'Scan for Relay Device'}
            </Text>
          </TouchableOpacity>

          {/* Discovered devices */}
          {discoveredDevices.length > 0 && (
            <View style={styles.deviceList}>
              <Text style={styles.deviceListTitle}>Nearby Devices</Text>
              {discoveredDevices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={styles.deviceCard}
                  onPress={() => handleConnect(device)}
                  activeOpacity={0.7}>
                  <View style={styles.deviceIcon}>
                    <Text style={styles.deviceIconText}>📱</Text>
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceId}>{device.id}</Text>
                  </View>
                  <Text style={styles.connectText}>Connect</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How it works</Text>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Make sure the Relay device is nearby with Bluetooth on
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Tap "Scan" to find the Relay device
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Connect and start chatting — the Relay will forward your messages to
                the Online user via internet
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Chat messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble message={item} isMine={item.sender === 'offline'} />
            )}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatIcon}>💬</Text>
                <Text style={styles.emptyChatText}>
                  Start a conversation! Your messages will be relayed via Bluetooth.
                </Text>
              </View>
            }
          />

          {/* Message input */}
          <MessageInput
            onSend={handleSendMessage}
            placeholder="Type message (via Bluetooth)..."
            accentColor={COLORS.bluetooth}
          />

          {/* Disconnect button */}
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}>
            <Text style={styles.disconnectText}>Disconnect Bluetooth</Text>
          </TouchableOpacity>
        </>
      )}
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
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  connectSection: {
    flex: 1,
    padding: 20,
  },
  scanButton: {
    backgroundColor: COLORS.bluetooth,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: COLORS.bluetooth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonIcon: {
    fontSize: 20,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deviceList: {
    marginTop: 20,
  },
  deviceListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bluetoothGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconText: {
    fontSize: 20,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deviceId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  connectText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.bluetooth,
  },
  instructions: {
    marginTop: 30,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 12,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  disconnectButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  disconnectText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBarConnected: {
    backgroundColor: COLORS.bluetoothGlow,
  },
  statusBarDisconnected: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  statusTextConnected: {
    color: COLORS.bluetooth,
  },
  statusTextDisconnected: {
    color: COLORS.error,
  },
});

export default OfflineUserScreen;
