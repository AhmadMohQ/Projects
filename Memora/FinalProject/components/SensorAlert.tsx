import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { 
  sensorEventEmitter, 
  SENSOR_ALERT_EVENT, 
  MOTION_DETECTED_EVENT,
  ULTRASONIC_ALERT_EVENT,
  SensorAlertData,
  showSensorAlert
} from '../services/sensorService';

// Debug flag - set to true to show test alerts on component mount
const DEBUG_MODE = false;

export default function SensorAlert() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [alertTime, setAlertTime] = useState<string>('');
  const [alertType, setAlertType] = useState<'motion' | 'ultrasonic'>('ultrasonic');
  const [distance, setDistance] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);

  // Listen for sensor alert events
  useEffect(() => {
    console.log('SensorAlert component mounted');
    
    // Mark component as ready
    setIsReady(true);
    
    // Function to handle any sensor alert
    const handleSensorAlert = (data: SensorAlertData) => {
      console.log('Received sensor alert:', JSON.stringify(data));
      
      // Set the alert time from the timestamp
      const date = new Date(data.timestamp);
      setAlertTime(date.toLocaleTimeString());
      
      // Set the alert type and distance if available
      setAlertType(data.type);
      setDistance(data.distance ? `${data.distance.toFixed(1)} cm` : undefined);
      
      // Show the alert
      setVisible(true);
      
      // Vibrate the device
      try {
        Vibration.vibrate([0, 400, 200, 400]);
      } catch (error) {
        console.error('Vibration error:', error);
      }
    };

    // Listen for all sensor alert events
    sensorEventEmitter.addListener(SENSOR_ALERT_EVENT, handleSensorAlert);
    sensorEventEmitter.addListener(MOTION_DETECTED_EVENT, handleSensorAlert);
    sensorEventEmitter.addListener(ULTRASONIC_ALERT_EVENT, handleSensorAlert);
    
    // Log the current listener count
    console.log(`SENSOR_ALERT_EVENT listeners: ${sensorEventEmitter.listenerCount(SENSOR_ALERT_EVENT)}`);
    console.log(`MOTION_DETECTED_EVENT listeners: ${sensorEventEmitter.listenerCount(MOTION_DETECTED_EVENT)}`);
    console.log(`ULTRASONIC_ALERT_EVENT listeners: ${sensorEventEmitter.listenerCount(ULTRASONIC_ALERT_EVENT)}`);

    // Debug mode - show a test alert after component mounts
    if (DEBUG_MODE) {
      setTimeout(() => {
        console.log('Triggering test alert');
        showSensorAlert('ultrasonic', 3.5);
      }, 5000);
    }
    
    // Clean up on unmount
    return () => {
      console.log('SensorAlert component unmounting, removing listeners');
      sensorEventEmitter.removeListener(SENSOR_ALERT_EVENT, handleSensorAlert);
      sensorEventEmitter.removeListener(MOTION_DETECTED_EVENT, handleSensorAlert);
      sensorEventEmitter.removeListener(ULTRASONIC_ALERT_EVENT, handleSensorAlert);
    };
  }, []);

  // Handle the close action for the alert
  const handleClose = () => {
    console.log('Closing sensor alert');
    setVisible(false);
  };

  // Show a loading indicator when the component is initializing
  if (!isReady) {
    return null;
  }
  
  if (!visible) {
    return null;
  }
  
  // Get the appropriate icon and color based on alert type
  const getAlertIcon = () => {
    if (alertType === 'motion') {
      return {
        name: "videocam",
        color: "#E53935" 
      };
    } else {
      return {
        name: "radio-outline",
        color: "#FF9800"
      };
    }
  };
  
  const alertIcon = getAlertIcon();
  
  // Get the appropriate title and details based on alert type
  const getAlertContent = () => {
    if (alertType === 'motion') {
      return {
        title: "Motion Detected",
        details: `Movement was detected on your security camera at ${alertTime}`
      };
    } else {
      return {
        title: "Proximity Alert",
        details: `Object detected ${distance ? `at ${distance}` : 'nearby'} at ${alertTime}`
      };
    }
  };
  
  const alertContent = getAlertContent();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={[styles.alertBox, { backgroundColor: colors.card }]}>
          {/* Alert Icon */}
          <View style={[styles.iconContainer, { backgroundColor: alertIcon.color }]}>
            <Ionicons 
              name={alertIcon.name} 
              size={32} 
              color="white" 
            />
          </View>

          {/* Alert Content */}
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {alertContent.title}
            </Text>
            <Text style={[styles.details, { color: colors.secondaryText }]}>
              {alertContent.details}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: alertIcon.color }]}
            onPress={handleClose}
          >
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  alertBox: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  details: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 