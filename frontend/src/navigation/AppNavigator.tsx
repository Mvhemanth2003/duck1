import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

import RoleSelectScreen from '../screens/RoleSelectScreen';
import OfflineUserScreen from '../screens/OfflineUserScreen';
import RelayScreen from '../screens/RelayScreen';
import OnlineUserScreen from '../screens/OnlineUserScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="RoleSelect"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0A0E17' },
        }}>
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="OfflineUser" component={OfflineUserScreen} />
        <Stack.Screen name="Relay" component={RelayScreen} />
        <Stack.Screen name="OnlineUser" component={OnlineUserScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
