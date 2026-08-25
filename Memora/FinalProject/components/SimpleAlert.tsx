import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Props for the SimpleAlert component
interface SimpleAlertProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

// Simple alert component that appears at the top of the screen
export default function SimpleAlert({ visible, message, onClose }: SimpleAlertProps) {
  if (!visible) return null;
  
  return (
    <View style={styles.container}>
      <View style={styles.alertBox}>
        <Ionicons name="alert-circle" size={24} color="#FF3B30" style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-circle" size={24} color="#555" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
  },
  alertBox: {
    width: width - 40,
    backgroundColor: '#FFF9FA',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: '#FF3B30',
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    padding: 5,
  }
}); 