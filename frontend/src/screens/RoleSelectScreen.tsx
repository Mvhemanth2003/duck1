import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { COLORS, ROLE_CONFIG } from '../utils/constants';
import type { UserRole, RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoleSelect'>;
};

const RoleSelectScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setShowNameInput(true);
  };

  const handleContinue = () => {
    if (!userName.trim() || !selectedRole) return;

    const name = userName.trim();
    if (selectedRole === 'offline') {
      navigation.navigate('OfflineUser', { userName: name });
    } else if (selectedRole === 'relay') {
      navigation.navigate('Relay', { userName: name });
    } else {
      navigation.navigate('OnlineUser', { userName: name });
    }
  };

  const roles: UserRole[] = ['offline', 'relay', 'online'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDark} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appIcon}>🦆</Text>
        <Text style={styles.title}>Duck1</Text>
        <Text style={styles.subtitle}>Bluetooth-Internet Relay Messenger</Text>
      </View>

      {/* Connection diagram */}
      <View style={styles.diagram}>
        <View style={styles.diagramNode}>
          <Text style={styles.diagramEmoji}>📵</Text>
          <Text style={styles.diagramLabel}>Offline</Text>
        </View>
        <View style={styles.diagramLine}>
          <Text style={styles.diagramLineText}>— BT —</Text>
        </View>
        <View style={styles.diagramNode}>
          <Text style={styles.diagramEmoji}>🔄</Text>
          <Text style={styles.diagramLabel}>Relay</Text>
        </View>
        <View style={styles.diagramLine}>
          <Text style={styles.diagramLineText}>— WiFi —</Text>
        </View>
        <View style={styles.diagramNode}>
          <Text style={styles.diagramEmoji}>🌐</Text>
          <Text style={styles.diagramLabel}>Online</Text>
        </View>
      </View>

      {/* Role cards */}
      <View style={styles.cardsContainer}>
        {roles.map((role) => {
          const config = ROLE_CONFIG[role];
          const isSelected = selectedRole === role;

          return (
            <TouchableOpacity
              key={role}
              style={[
                styles.card,
                isSelected && {
                  borderColor: config.color,
                  backgroundColor: `${config.color}10`,
                },
              ]}
              onPress={() => handleRoleSelect(role)}
              activeOpacity={0.7}>
              {/* Glow indicator for selected */}
              {isSelected && (
                <View
                  style={[styles.glowDot, { backgroundColor: config.color }]}
                />
              )}

              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{config.icon}</Text>
                <View style={styles.cardTitles}>
                  <Text style={styles.cardTitle}>{config.title}</Text>
                  <Text style={styles.cardSubtitle}>{config.subtitle}</Text>
                </View>
              </View>

              <Text style={styles.cardDescription}>{config.description}</Text>

              {/* Connection type badges */}
              <View style={styles.badges}>
                {role === 'offline' && (
                  <View style={[styles.badge, { backgroundColor: COLORS.bluetoothGlow }]}>
                    <Text style={[styles.badgeText, { color: COLORS.bluetooth }]}>
                      Bluetooth
                    </Text>
                  </View>
                )}
                {role === 'relay' && (
                  <>
                    <View style={[styles.badge, { backgroundColor: COLORS.bluetoothGlow }]}>
                      <Text style={[styles.badgeText, { color: COLORS.bluetooth }]}>
                        Bluetooth
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: COLORS.internetGlow }]}>
                      <Text style={[styles.badgeText, { color: COLORS.internet }]}>
                        Internet
                      </Text>
                    </View>
                  </>
                )}
                {role === 'online' && (
                  <View style={[styles.badge, { backgroundColor: COLORS.internetGlow }]}>
                    <Text style={[styles.badgeText, { color: COLORS.internet }]}>
                      Internet
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Name input + Continue */}
      {showNameInput && (
        <View style={styles.nameSection}>
          <TextInput
            style={styles.nameInput}
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            maxLength={20}
          />

          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: selectedRole
                  ? ROLE_CONFIG[selectedRole].color
                  : COLORS.primary,
              },
              !userName.trim() && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!userName.trim()}
            activeOpacity={0.8}>
            <Text style={styles.continueText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  diagram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  diagramNode: {
    alignItems: 'center',
  },
  diagramEmoji: {
    fontSize: 24,
  },
  diagramLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  diagramLine: {
    marginHorizontal: 6,
  },
  diagramLineText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  glowDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitles: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nameSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  nameInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  continueButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default RoleSelectScreen;
