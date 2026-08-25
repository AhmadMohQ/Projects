import { Alert, Vibration, Platform } from 'react-native';
import { EventEmitter } from 'events';

// Event emitter for sensor alerts
export const sensorEventEmitter = new EventEmitter();

// Constants for sensor events
export const SENSOR_ALERT_EVENT = 'sensorAlert';
export const MOTION_DETECTED_EVENT = 'motionDetected';
export const ULTRASONIC_ALERT_EVENT = 'ultrasonicAlert';

let SENSOR_PI_IP = "10.0.0.189"; // Pi address

// Interface for sensor alert data
export interface SensorAlertData {
  timestamp: string;
  type: 'motion' | 'ultrasonic';
  distance?: number;
}

// Variables to store polling timers
let sensorPollingTimer: NodeJS.Timeout | null = null;
let isSensorPolling = false;

// Function to show sensor alert
export function showSensorAlert(type: 'motion' | 'ultrasonic' = 'ultrasonic', distance?: number) {
  // Create sensor alert data
  const alertData: SensorAlertData = {
    timestamp: new Date().toISOString(),
    type,
    distance
  };
  
  // Vibrate the device when sensor is triggered
  try {
    Vibration.vibrate([0, 500, 200, 500]);
  } catch (error) {
    console.error('Vibration error:', error);
  }
  
  // Emit the event for the UI component
  sensorEventEmitter.emit(SENSOR_ALERT_EVENT, alertData);
  sensorEventEmitter.emit(
    type === 'motion' ? MOTION_DETECTED_EVENT : ULTRASONIC_ALERT_EVENT, 
    alertData
  );
  
  // Also show a native alert
  const title = type === 'motion' ? 'Motion Detection Alert' : 'Proximity Alert';
  const message = type === 'motion' 
    ? `Movement detected at ${new Date().toLocaleTimeString()}`
    : `Object detected at ${distance ? distance.toFixed(1) + ' cm' : 'close range'} at ${new Date().toLocaleTimeString()}`;
    
  Alert.alert(
    title,
    message,
    [{ text: 'OK', style: 'default' }]
  );
}

// Function to poll ultrasonic sensor status
export async function pollSensorStatus(): Promise<void> {
  try {
    const response = await fetch(`http://${SENSOR_PI_IP}:5002/sensor_status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      return;
    }
    
    const data = await response.json();
    
    // Check for trigger - either the triggered flag is true OR distance is less than 5cm
    const isTriggered = data.triggered === true || (data.distance !== undefined && data.distance < 5);
    
    if (isTriggered) {
      showSensorAlert('ultrasonic', data.distance);
    }
  } catch (error) {
    console.error('Error polling sensor:', error);
  }
}

// Function to start sensor polling
export function startSensorPolling(): void {
  if (isSensorPolling) return;
  
  isSensorPolling = true;
  
  // Poll immediately
  pollSensorStatus();
  
  // Setup interval polling every 1 second
  sensorPollingTimer = setInterval(() => {
    pollSensorStatus();
  }, 1000);
}

// Function to stop sensor polling
export function stopSensorPolling(): void {
  if (sensorPollingTimer) {
    clearInterval(sensorPollingTimer);
    sensorPollingTimer = null;
  }
  isSensorPolling = false;
}

// Initialize the sensor service
export function initializeSensorService(cameraPiIp?: string, sensorPiIp?: string): void {
  // If IP addresses are provided, update the constant
  if (sensorPiIp) {
    SENSOR_PI_IP = sensorPiIp;
  }
  
  // Set maximum listeners
  sensorEventEmitter.setMaxListeners(20);
  
  // Start sensor polling
  startSensorPolling();
}

// Clean shutdown of sensor services
export function shutdownSensorService(): void {
  stopSensorPolling();
} 