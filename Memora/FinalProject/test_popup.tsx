import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { showSensorAlert } from './services/sensorService';

export default function TestPopup() {
  const showTestAlert = () => {
    console.log('Showing test alert via native Alert');
    Alert.alert(
      'Test Alert',
      'This is a test alert using React Native Alert',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const showUltrasonicAlert = () => {
    console.log('Triggering ultrasonic sensor alert');
    showSensorAlert('ultrasonic', 3.5);
  };

  const showMotionAlert = () => {
    console.log('Triggering motion detection alert');
    showSensorAlert('motion');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test</Text>
      <Text style={styles.description}>
        This screen lets you test different types of notifications to verify they're working correctly.
      </Text>

      <View style={styles.buttonContainer}>
        <Button 
          title="Test Native Alert" 
          onPress={showTestAlert} 
          color="#2196F3"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Test Ultrasonic Alert" 
          onPress={showUltrasonicAlert} 
          color="#4CAF50"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Test Motion Alert" 
          onPress={showMotionAlert} 
          color="#FF9800"
        />
      </View>

      <Text style={styles.note}>
        If alerts appear when pressing these buttons but not when using your sensors, 
        the issue is with sensor connection, not the notification system.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  buttonContainer: {
    width: '80%',
    marginVertical: 10,
  },
  note: {
    marginTop: 40,
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
  },
}); 