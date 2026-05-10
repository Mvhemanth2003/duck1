export interface ChatMessage {
  id: string;
  sender: 'offline' | 'relay' | 'online';
  senderName: string;
  content: string;
  timestamp: Date;
  relayed?: boolean;
  forOffline?: boolean;
  delivered?: boolean;
}

export interface UserStatus {
  role: string;
  connected: boolean;
  name: string;
}

export type UserRole = 'offline' | 'relay' | 'online';

export type RootStackParamList = {
  RoleSelect: undefined;
  OfflineUser: { userName: string };
  Relay: { userName: string };
  OnlineUser: { userName: string };
};
