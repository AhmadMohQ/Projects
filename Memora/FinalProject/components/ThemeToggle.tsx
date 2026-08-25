import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ThemeToggle() {
  const { toggleTheme, theme } = useTheme();

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: theme === 'dark' ? '#FFFFFF33' : '#00000033' }
      ]} 
      onPress={toggleTheme}
    >
      <Ionicons 
        name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} 
        size={24} 
        color={theme === 'light' ? '#333' : '#FFF'} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
