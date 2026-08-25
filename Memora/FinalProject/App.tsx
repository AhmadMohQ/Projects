import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import { LogBox, View, Button, Text, Vibration } from 'react-native';
import './global';
import SimpleAlert from './components/SimpleAlert';

// Ignore specific warnings that aren't relevant
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Constants.platform.ios.model',
  'EventEmitter.removeListener'
]);

const PI_IP_ADDRESS = '10.0.0.189';
const SENSOR_PORT = 5002;

// Main App component
export default function App() {
  // State for alerts
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [sensorPolling, setSensorPolling] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  
  // Start/stop polling
  const togglePolling = () => {
    if (sensorPolling) {
      // Stop polling
      setSensorPolling(false);
    } else {
      // Start polling
      setSensorPolling(true);
    }
  };
  
  // Function to directly poll the ultrasonic sensor
  const pollSensor = async () => {
    if (!sensorPolling) return;
    
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`http://${PI_IP_ADDRESS}:${SENSOR_PORT}/sensor_status`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setDistance(data.distance);
        
        // Check if object is within 5cm
        if (data.triggered === true || (data.distance !== undefined && data.distance < 5)) {
          // Only show alert if not already showing
          if (!alertVisible) {
            // Vibrate phone
            Vibration.vibrate([0, 500, 200, 500]);
            
            // Show alert
            setAlertMessage(`Object detected at ${data.distance.toFixed(1)} cm!`);
            setAlertVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Error polling sensor:', error);
    }
    
    // Continue polling if enabled
    if (sensorPolling) {
      setTimeout(pollSensor, 1000); // Poll every second
    }
  };
  
  // Start polling when sensorPolling state changes
  useEffect(() => {
    if (sensorPolling) {
      pollSensor();
    }
  }, [sensorPolling]);
  
  // Start polling when component mounts
  useEffect(() => {
    setSensorPolling(true);
    
    // Clean up when unmounting
    return () => {
      setSensorPolling(false);
    };
  }, []);
  
  // Handle closing the alert
  const handleCloseAlert = () => {
    setAlertVisible(false);
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar />
        
        {/* Simple Alert Component */}
        <SimpleAlert
          visible={alertVisible}
          message={alertMessage}
          onClose={handleCloseAlert}
        />
        
        {/* Main app content */}
        <View style={{ 
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold',
            marginBottom: 30,
          }}>
            Ultrasonic Sensor Monitoring
          </Text>
          
          {/* Display current distance */}
          <Text style={{ 
            fontSize: 36, 
            fontWeight: 'bold',
            marginBottom: 40,
            color: distance && distance < 5 ? '#FF3B30' : '#333',
          }}>
            {distance !== null ? `${distance.toFixed(1)} cm` : 'Connecting...'}
          </Text>
          
          {/* Display connection status */}
          <Text style={{
            fontSize: 16,
            marginBottom: 20,
            color: sensorPolling ? 'green' : 'red',
          }}>
            Status: {sensorPolling ? 'Connected' : 'Disconnected'}
          </Text>
          
          {/* Toggle connection button */}
          <Button
            title={sensorPolling ? "Disconnect Sensor" : "Connect Sensor"}
            onPress={togglePolling}
            color={sensorPolling ? "#FF3B30" : "#007AFF"}
          />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
} 