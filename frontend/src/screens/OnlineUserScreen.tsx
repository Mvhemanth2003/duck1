import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../utils/constants';
import SocketService from '../services/SocketService';
import ChatBubble from '../components/ChatBubble';
import MessageInput from '../components/MessageInput';
import type { ChatMessage, RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnlineUser'>;
  route: RouteProp<RootStackParamList, 'OnlineUser'>;
};

const OnlineUserScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userName } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [relayConnected, setRelayConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const flatListRef = useRef<FlatList>(null);

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

  const connectToServer = useCallback(async () => {
    setIsConnecting(true);

    const connected = await SocketService.connect();
    setIsConnected(connected);

    if (connected) {
      // Register as online user
      SocketService.register('online', userName);

      // Listen for incoming messages
      SocketService.onMessage((message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
      });

      // Listen for user status changes
      SocketService.onUserStatus((status) => {
        if (status.role === 'relay') {
          setRelayConnected(status.connected);

          const statusMsg: ChatMessage = {
            id: `status-${Date.now()}`,
            sender: 'relay',
            senderName: 'System',
            content: status.connected
              ? `🔄 ${status.name} (Relay) is now online — Offline users can reach you`
              : `🔄 ${status.name} (Relay) disconnected — Offline users cannot reach you`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, statusMsg]);
        }
      });

      // Listen for delivery status
      SocketService.onDeliveryStatus((status) => {
        const statusMsg: ChatMessage = {
          id: `delivery-${Date.now()}`,
          sender: 'relay',
          senderName: 'System',
          content:
            status.status === 'pending'
              ? `⏳ Message pending: ${status.reason}`
              : `❌ Delivery failed: ${status.reason}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, statusMsg]);
      });

      addSystemMessage(
        '🌐 Connected to server. You can now receive messages from Offline users (via Relay).',
      );
    } else {
      addSystemMessage(
        '❌ Failed to connect to server. Please check your internet connection.',
      );
    }

    setIsConnecting(false);
  }, [userName, addSystemMessage]);

  useEffect(() => {
    connectToServer();

    return () => {
      SocketService.disconnect();
    };
  }, [connectToServer]);

  const handleSendMessage = (content: string) => {
    const myMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'online',
      senderName: userName,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, myMessage]);

    // Send to relay (who will forward via Bluetooth to offline user)
    SocketService.onlineToRelay(content, userName);
  };

  const handleRetry = () => {
    setMessages([]);
    connectToServer();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>🌐 Online Mode</Text>
          <Text style={styles.headerSubtitle}>
            {userName} — Internet connected
          </Text>
        </View>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isConnected ? COLORS.success : COLORS.error,
            },
          ]}
        />
      </View>

      {/* Connection status bar */}
      <View style={styles.statusPanel}>
        <View style={[styles.statusCard, isConnected && styles.statusCardActive]}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: isConnected ? COLORS.internet : COLORS.error },
            ]}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Server</Text>
            <Text style={styles.statusValue}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <View style={[styles.statusCard, relayConnected && styles.statusCardActive]}>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: relayConnected
                  ? COLORS.primary
                  : COLORS.textMuted,
              },
            ]}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Relay</Text>
            <Text style={styles.statusValue}>
              {relayConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Info bar */}
      <View
        style={[
          styles.infoBar,
          relayConnected
            ? styles.infoBarConnected
            : styles.infoBarDisconnected,
        ]}>
        <Text
          style={[
            styles.infoText,
            relayConnected
              ? styles.infoTextConnected
              : styles.infoTextDisconnected,
          ]}>
          {relayConnected
            ? '✅ Relay is online — Messages will reach the Offline user'
            : '⚠️ Relay not connected — Offline user unreachable'}
        </Text>
      </View>

      {/* Chat messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble message={item} isMine={item.sender === 'online'} />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            {isConnecting ? (
              <>
                <ActivityIndicator color={COLORS.internet} size="large" />
                <Text style={styles.emptyChatText}>
                  Connecting to server...
                </Text>
              </>
            ) : !isConnected ? (
              <>
                <Text style={styles.emptyChatIcon}>❌</Text>
                <Text style={styles.emptyChatText}>
                  Could not connect to server
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyChatIcon}>💬</Text>
                <Text style={styles.emptyChatText}>
                  Send a message to the Offline user.{'\n'}It will be relayed
                  through the middleman via Bluetooth.
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* Message input */}
      <MessageInput
        onSend={handleSendMessage}
        placeholder="Type message (via Internet → Relay → BT)..."
        accentColor={COLORS.internet}
        disabled={!isConnected}
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
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    padding: 12,
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
    marginRight: 10,
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
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
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
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.internet,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  infoBarConnected: {
    backgroundColor: COLORS.internetGlow,
  },
  infoBarDisconnected: {
    backgroundColor: 'rgba(255, 171, 64, 0.1)',
  },
  infoTextConnected: {
    color: COLORS.internet,
  },
  infoTextDisconnected: {
    color: COLORS.warning,
  },
});

export default OnlineUserScreen;
