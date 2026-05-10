/**
 * Duck1 - Bluetooth-Internet Relay Messenger
 *
 * Communication flow:
 *   Person A (No Internet) ←— Bluetooth —→ Person B (Relay) ←— Internet —→ Person C (Online)
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E17" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
