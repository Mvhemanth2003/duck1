import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
  isMine: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isMine }) => {
  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isMine ? styles.myMessage : styles.theirMessage]}>
      {/* Sender name */}
      {!isMine && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}

      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isMine ? styles.myBubble : styles.theirBubble,
          message.relayed && styles.relayedBubble,
        ]}>
        {/* Relay indicator */}
        {message.relayed && (
          <View style={styles.relayBadge}>
            <Text style={styles.relayBadgeText}>🔄 Relayed via Bluetooth</Text>
          </View>
        )}

        <Text
          style={[
            styles.messageText,
            isMine ? styles.myText : styles.theirText,
            message.relayed && styles.relayedText,
          ]}>
          {message.content}
        </Text>

        <Text
          style={[
            styles.timestamp,
            isMine ? styles.myTimestamp : styles.theirTimestamp,
          ]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
    marginLeft: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  myBubble: {
    backgroundColor: COLORS.bubbleSent,
    borderBottomRightRadius: 6,
  },
  theirBubble: {
    backgroundColor: COLORS.bubbleReceived,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  relayedBubble: {
    backgroundColor: COLORS.bubbleRelayed,
    borderColor: 'rgba(0, 130, 252, 0.3)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myText: {
    color: COLORS.bubbleSentText,
  },
  theirText: {
    color: COLORS.bubbleReceivedText,
  },
  relayedText: {
    color: COLORS.bubbleRelayedText,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  theirTimestamp: {
    color: COLORS.textMuted,
  },
  relayBadge: {
    backgroundColor: 'rgba(0, 130, 252, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  relayBadgeText: {
    fontSize: 10,
    color: COLORS.bluetooth,
    fontWeight: '600',
  },
});

export default ChatBubble;
