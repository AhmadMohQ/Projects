import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Alert, 
  Switch, 
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Vibration,
  Image,
  ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';
import SensorAlert from '../components/SensorAlert';
import { useFocusEffect } from 'expo-router';
import { 
  startSensorPolling as startSensorMonitoring, 
  stopSensorPolling as stopSensorMonitoring,
  showSensorAlert
} from '../services/sensorService';

// Update the default IP to match your Raspberry Pi's IP
// IMPORTANT: Update this to your actual Raspberry Pi's IP
const RASPBERRY_PI_IP = '10.0.0.189'; // Update this with your actual Raspberry Pi IP
const RASPBERRY_PI_PORT = '5000';

// Add constants for ultrasonic sensor
const ULTRASONIC_SENSOR_PORT = '5002';
const DISTANCE_THRESHOLD = 5; // cm - threshold for alerts

// Custom HTML to embed the stream directly - this can help bypass CORS issues
const getStreamHTML = (streamUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .status {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 12px;
    }
    .error {
      color: white;
      text-align: center;
      font-family: Arial, sans-serif;
    }
  </style>
</head>
<body>
  <img src="${streamUrl}" onerror="handleError()" onload="handleLoad()" />
  <div id="status" class="status">Connecting...</div>
  
  <script>
    let connectionAttempts = 0;
    const maxAttempts = 5;
    let loadSuccessful = false;
    
    function handleLoad() {
      loadSuccessful = true;
      document.getElementById('status').innerHTML = 'Connected';
      setTimeout(() => {
        document.getElementById('status').style.display = 'none';
      }, 3000);
      window.ReactNativeWebView.postMessage('STREAM_LOADED');
    }
    
    function handleError() {
      connectionAttempts++;
      if (connectionAttempts < maxAttempts) {
        document.getElementById('status').innerHTML = 'Reconnecting... (' + connectionAttempts + '/' + maxAttempts + ')';
        setTimeout(() => {
          document.querySelector('img').src = "${streamUrl}?" + new Date().getTime();
        }, 2000);
      } else {
        document.body.innerHTML = '<div class="error"><h3>Connection Failed</h3><p>Could not connect to the camera stream</p></div>';
        window.ReactNativeWebView.postMessage('STREAM_ERROR');
      }
    }
    
    // Check connection status regularly
    setInterval(() => {
      if (!loadSuccessful) {
        window.ReactNativeWebView.postMessage('STREAM_LOADING');
      }
    }, 1000);
  </script>
</body>
</html>
`;

type FetchError = Error & {
  name: string;
};

export default function SecurityScreen() {
  const { colors, theme } = useTheme();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [securityActive, setSecurityActive] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [cameraIpAddress, setCameraIpAddress] = useState(RASPBERRY_PI_IP);
  const [cameraPort, setCameraPort] = useState(RASPBERRY_PI_PORT);
  const [sensorIpAddress, setSensorIpAddress] = useState(RASPBERRY_PI_IP);
  const [sensorPort, setSensorPort] = useState(ULTRASONIC_SENSOR_PORT);
  const [showSettings, setShowSettings] = useState(false);
  const webViewRef = useRef(null);
  
  // Add ultrasonic sensor states
  const [distance, setDistance] = useState<number | null>(null);
  const [isSensorConnected, setIsSensorConnected] = useState(false);
  const [sensorTriggered, setSensorTriggered] = useState(false);
  
  // Polling intervals
  let motionCheckInterval: NodeJS.Timeout | null = null;
  let sensorPollInterval: NodeJS.Timeout | null = null;
  
  const startStream = () => {
    // Connect to your Raspberry Pi camera stream
    const url = `http://${cameraIpAddress}:${cameraPort}/stream`;
    setStreamUrl(url);
    setIsMonitoring(true);
    setIsLoading(true);
    setLoadingFailed(false);
    
    // Try to get server info
    fetchServerInfo();
  };
  
  const fetchServerInfo = async () => {
    try {
      const response = await fetch(`http://${cameraIpAddress}:${cameraPort}/info`);
      const data = await response.json();
      setServerInfo(data);
    } catch (error) {
      console.error("Failed to fetch server info:", error);
    }
  };
  
  const stopStream = () => {
    setStreamUrl('');
    setIsMonitoring(false);
    setIsLoading(false);
    setLoadingFailed(false);
    setServerInfo(null);
    
    // When stopping the stream, also disable security mode
    if (securityActive) {
      setSecurityActive(false);
      stopSensorMonitoring();
    }
  };
  
  // Save IP address and port settings
  const saveSettings = () => {
    setShowSettings(false);
    
    // Restart camera if it's active
    if (isMonitoring) {
      stopStream();
      setTimeout(() => startStream(), 500);
    }
    
    // Restart sensor if it's connected
    if (isSensorConnected) {
      stopSensorPolling();
      setTimeout(() => startSensorPolling(), 500);
    }
  };
  
  // Update toggleSecurity to only handle motion detection
  const toggleSecurity = (value: boolean) => {
    setSecurityActive(value);
    if (value) {
      // Start motion detection monitoring mode
      startPollingMotionDetection();
      Alert.alert('Motion Detection Enabled', 'You will be notified when motion is detected on the camera.');
      
      // Test alert after 5 seconds to verify alerts are working
      if (__DEV__) {
        console.log('Setting up test alert for development mode');
        setTimeout(() => {
          if (securityActive) {
            console.log('Triggering test motion alert');
            showSensorAlert('motion');
          }
        }, 5000);
      }
    } else {
      // Stop motion detection monitoring mode
      stopPollingMotionDetection();
      console.log('Motion Detection Disabled: Polling stopped');
    }
  };
  
  // Function to show the motion alert - extracted to be called independently
  const showMotionAlert = () => {
    console.log("Motion detected! Showing alert.");
    
    // Add vibration
    try {
      Vibration.vibrate([0, 500, 200, 500]);
    } catch (e) {
      console.log("Vibration error:", e);
    }

    // Show alert with more options
    Alert.alert(
      "⚠️ Motion Detected!",
      "Movement was detected on your security camera.",
      [
        { 
          text: "View Camera", 
          onPress: () => {
            if (!isMonitoring) {
              startStream();
            }
          },
          style: "default"
        },
        { 
          text: "Dismiss", 
          style: "cancel" 
        }
      ],
      { cancelable: true }
    );
  };
  
  const startPollingMotionDetection = () => {
    // Stop any existing interval
    stopPollingMotionDetection();
    
    console.log(`Starting motion detection polling for ${cameraIpAddress}:${cameraPort}`);
    
    // Create a variable to track the last detected motion state
    let lastMotionState = false;
    
    // Check for motion detection every 2 seconds (more frequent checks)
    motionCheckInterval = setInterval(async () => {
      try {
        // Double check security mode is still active
        if (!securityActive) {
          console.log('Security mode was disabled: Stopping motion detection polling');
          stopPollingMotionDetection();
          return;
        }
        
        const url = `http://${cameraIpAddress}:${cameraPort}/motion_status`;
        console.log(`Checking motion at: ${url}`);
        
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Motion data received:', JSON.stringify(data));
          
          // Only alert if motion is newly detected
          if (data.motion_detected && !lastMotionState) {
            showMotionAlert();
          }
          
          // Update the last motion state
          lastMotionState = data.motion_detected;
        } catch (error) {
          const fetchError = error as FetchError;
          console.error("Fetch error:", fetchError.message);
          if (fetchError.name === 'AbortError') {
            console.log("Request timed out");
          }
          
          // Don't update lastMotionState on errors to retry on next interval
        }
      } catch (error) {
        console.error("Error in motion detection loop:", error);
      }
    }, 2000); // Check every 2 seconds
    
    console.log('Motion detection interval started:', motionCheckInterval);
  };
  
  const stopPollingMotionDetection = () => {
    if (motionCheckInterval) {
      console.log('Stopping motion detection polling: clearing interval');
      clearInterval(motionCheckInterval);
      motionCheckInterval = null;
    } else {
      console.log('Motion detection polling was already stopped');
    }
  };
  
  // Update the pollUltrasonicSensor function to add timeout and better error handling
  const pollUltrasonicSensor = async () => {
    try {
      console.log(`Polling ultrasonic sensor at http://${sensorIpAddress}:${sensorPort}/sensor_status`);
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`http://${sensorIpAddress}:${sensorPort}/sensor_status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sensor data:', JSON.stringify(data));
        setDistance(data.distance);
        setSensorTriggered(data.triggered || (data.distance !== undefined && data.distance < DISTANCE_THRESHOLD));
        setIsSensorConnected(true);
      } else {
        console.error('Sensor returned error status:', response.status);
        setIsSensorConnected(false);
      }
    } catch (error) {
      const fetchError = error as FetchError;
      console.error('Error polling ultrasonic sensor:', fetchError.message);
      
      if (fetchError.name === 'AbortError') {
        console.log("Sensor request timed out after 3 seconds");
      }
      
      setIsSensorConnected(false);
    }
  };
  
  // Redefine sensor polling functions
  const startSensorPolling = () => {
    // Use the imported function, but also start our own UI polling
    console.log(`Starting sensor polling for ${sensorIpAddress}:${sensorPort}`);
    
    // Start our own polling for UI updates
    pollUltrasonicSensor();
    sensorPollInterval = setInterval(pollUltrasonicSensor, 1000);
  };
  
  const stopSensorPolling = () => {
    console.log('Stopping ultrasonic sensor polling');
    
    // Stop our own polling
    if (sensorPollInterval) {
      clearInterval(sensorPollInterval);
      sensorPollInterval = null;
      setIsSensorConnected(false);
      setSensorTriggered(false);
    }
  };
  
  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    const { data } = event.nativeEvent;
    
    switch (data) {
      case 'STREAM_LOADED':
        setIsLoading(false);
        break;
      case 'STREAM_ERROR':
        setIsLoading(false);
        setLoadingFailed(true);
        break;
      case 'STREAM_LOADING':
        setIsLoading(true);
        break;
    }
  };
  
  // Add an effect to watch securityActive state
  useEffect(() => {
    // When securityActive changes to false, ensure polling is stopped
    if (!securityActive) {
      stopPollingMotionDetection();
    }
  }, [securityActive]);
  
  // Add an initialization effect at the end of your component
  useEffect(() => {
    // Define a ping function to check if each device is reachable
    const checkDevicesConnection = async () => {
      try {
        // Check camera
        setIsLoading(true);
        const cameraTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        try {
          await Promise.race([
            fetch(`http://${cameraIpAddress}:${cameraPort}/info`).then(res => {
              console.log('Camera ping successful');
              // Don't auto-start camera, user should do that explicitly
            }),
            cameraTimeout
          ]);
        } catch (error) {
          console.log('Camera ping failed:', error);
        }
        setIsLoading(false);
        
        // Check ultrasonic sensor
        try {
          await Promise.race([
            fetch(`http://${sensorIpAddress}:${sensorPort}/sensor_status`).then(res => {
              console.log('Sensor ping successful');
              // Don't auto-start sensor
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
        } catch (error) {
          console.log('Sensor ping failed:', error);
        }
      } catch (error) {
        console.error('Error during device check:', error);
      }
    };
    
    // Run the check
    checkDevicesConnection();
    
    // Return cleanup function
    return () => {
      stopPollingMotionDetection();
      stopSensorPolling();
    };
  }, []);  // Empty dependency array = only run once on mount
  
  // Add a focus effect to handle tab changes
  useFocusEffect(
    React.useCallback(() => {
      // This runs when the screen is focused
      console.log('Security tab focused');
      
      // Return a cleanup function that runs when screen is unfocused
      return () => {
        console.log('Security tab unfocused');
        
        // If security mode was active, warn the user it's being disabled
        if (securityActive) {
          // Disable security mode but don't show the alert (user switched tabs)
          setSecurityActive(false);
          stopPollingMotionDetection();
        }
      };
    }, [securityActive])
  );
  
  // Add a manual test button to the UI
  const triggerTestAlert = () => {
    if (securityActive) {
      console.log('Manually triggering test alert');
      showSensorAlert('motion');
    } else {
      Alert.alert('Security Mode Disabled', 'Please enable security mode first to test alerts.');
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Add SensorAlert component */}
      <SensorAlert />
      
      {/* Header with title and theme toggle */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Security</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemeToggle />
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Pi Camera Section */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="videocam" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pi Camera
            </Text>
          </View>

          {isMonitoring ? (
            <View style={styles.streamContainer}>
              <WebView
                ref={webViewRef}
                source={{ html: getStreamHTML(streamUrl) }}
                style={styles.stream}
                onMessage={(event) => {
                  const message = event.nativeEvent.data;
                  if (message === 'STREAM_ERROR') {
                    setLoadingFailed(true);
                    setIsLoading(false);
                  } else if (message === 'STREAM_LOADED') {
                    setIsLoading(false);
                    setLoadingFailed(false);
                  }
                }}
              />
              {isLoading && (
                <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>
                    Connecting to camera...
                  </Text>
                </View>
              )}
              {loadingFailed && (
                <View style={[styles.errorOverlay, { backgroundColor: colors.background }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    Failed to connect to camera
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={startStream}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="videocam-outline" size={80} color={colors.secondaryText} />
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                Start monitoring to view the camera feed
              </Text>
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.startButton,
                { backgroundColor: isMonitoring ? colors.error : colors.primary }
              ]}
              onPress={isMonitoring ? stopStream : startStream}
            >
              <Text style={styles.buttonText}>
                {isMonitoring ? 'Stop Camera' : 'Start Camera'}
              </Text>
            </TouchableOpacity>

            {isMonitoring && (
              <View style={styles.securityModeContainer}>
                <Text style={[styles.securityModeText, { color: colors.text }]}>
                  Motion Detection
                </Text>
                <Switch
                  value={securityActive}
                  onValueChange={toggleSecurity}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.card}
                />
              </View>
            )}

            {/* Test button for development mode */}
            {__DEV__ && securityActive && (
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: colors.error, marginTop: 16 }]}
                onPress={triggerTestAlert}
              >
                <Text style={styles.buttonText}>Test Alert</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.deviceInfoContainer}>
            <Text style={[styles.deviceInfoText, { color: colors.secondaryText }]}>
              Connected to: {cameraIpAddress}:{cameraPort}
            </Text>
          </View>
        </View>

        {/* Ultrasonic Sensor Section */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="radio-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Ultrasonic Sensor
            </Text>
          </View>

          {isSensorConnected ? (
            <View style={styles.sensorDataContainer}>
              <View style={styles.distanceDisplay}>
                <Text style={[styles.distanceValue, { 
                  color: sensorTriggered ? colors.error : colors.text,
                  fontSize: sensorTriggered ? 48 : 36
                }]}>
                  {distance !== null ? distance : '--'}
                </Text>
                <Text style={[styles.distanceUnit, { color: colors.secondaryText }]}>cm</Text>
              </View>
              
              {sensorTriggered && (
                <View style={[styles.alertBadge, { backgroundColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                  <Text style={styles.alertBadgeText}>ALERT</Text>
                </View>
              )}
              
              <Text style={[styles.sensorStatusDescription, { color: colors.secondaryText }]}>
                {sensorTriggered 
                  ? 'Object detected nearby! Distance below threshold.'
                  : 'Monitoring distance. No objects detected.'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.sensorPlaceholder}>
              <Ionicons name="radio-outline" size={64} color={colors.secondaryText} />
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                Sensor disconnected or unavailable
              </Text>
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.startButton, { 
                backgroundColor: isSensorConnected ? colors.error : colors.primary 
              }]}
              onPress={isSensorConnected ? stopSensorPolling : startSensorPolling}
            >
              <Text style={styles.buttonText}>
                {isSensorConnected ? 'Stop Sensor' : 'Start Sensor'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.deviceInfoContainer}>
            <Text style={[styles.deviceInfoText, { color: colors.secondaryText }]}>
              Connected to: {sensorIpAddress}:{sensorPort}
            </Text>
          </View>
        </View>

        {/* How To Use Panel */}
        <View style={[styles.infoPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoPanelTitle, { color: colors.text }]}>How to Use:</Text>
          <Text style={[styles.infoPanelText, { color: colors.secondaryText }]}>
            1. Configure each device's IP and port in Settings.
          </Text>
          <Text style={[styles.infoPanelText, { color: colors.secondaryText }]}>
            2. Start the Camera to view the Pi Camera feed.
          </Text>
          <Text style={[styles.infoPanelText, { color: colors.secondaryText }]}>
            3. Enable Motion Detection to receive motion alerts.
          </Text>
          <Text style={[styles.infoPanelText, { color: colors.secondaryText }]}>
            4. Start the Sensor to monitor distance from the ultrasonic sensor.
          </Text>
          <Text style={[styles.infoPanelText, { color: colors.secondaryText }]}>
            5. You'll receive alerts when objects are within {DISTANCE_THRESHOLD}cm of the sensor.
          </Text>
        </View>
      </ScrollView>
      
      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Device Settings</Text>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.inputBg }]}
                onPress={() => setShowSettings(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pi Camera Settings</Text>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Camera IP Address</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={cameraIpAddress}
              onChangeText={setCameraIpAddress}
              placeholder="e.g., 192.168.1.100"
              placeholderTextColor={colors.placeholderText}
              keyboardType="default"
              autoCapitalize="none"
            />
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Camera Port</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={cameraPort}
              onChangeText={setCameraPort}
              placeholder="5000"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
            />

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Ultrasonic Sensor Settings</Text>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Sensor IP Address</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={sensorIpAddress}
              onChangeText={setSensorIpAddress}
              placeholder="e.g., 192.168.1.101"
              placeholderTextColor={colors.placeholderText}
              keyboardType="default"
              autoCapitalize="none"
            />
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Sensor Port</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={sensorPort}
              onChangeText={setSensorPort}
              placeholder="5002"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowSettings(false)}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveSettings}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    marginRight: 8,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  placeholderContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deviceInfoContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  deviceInfoText: {
    fontSize: 12,
  },
  sensorDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  distanceDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  distanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  distanceUnit: {
    fontSize: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  alertBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  sensorStatusDescription: {
    textAlign: 'center',
    fontSize: 14,
  },
  sensorPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    marginBottom: 16,
  },
  startButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  securityModeText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
  },
  infoPanel: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoPanelText: {
    fontSize: 14,
    marginBottom: 4,
  },
  testButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  streamContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  stream: {
    flex: 1,
    backgroundColor: '#000',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
}); 