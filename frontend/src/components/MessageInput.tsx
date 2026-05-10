import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { COLORS } from '../utils/constants';

interface MessageInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  accentColor?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  accentColor = COLORS.primary,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
          editable={!disabled}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: accentColor },
            (!text.trim() || disabled) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}>
          <View style={styles.sendIcon}>
            <View style={styles.arrow} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.bgDark,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.bgInput,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 100,
    paddingVertical: 8,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
  sendIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    transform: [{ rotate: '90deg' }],
  },
});

export default MessageInput;
