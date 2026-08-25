import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { calculateDistance, requestLocationPermissions, getCurrentLocation } from './locationService';
import { EventEmitter } from 'events';

// Import types
import type { ReminderData } from '../services/firebaseListeners';

// Use ReminderData as our Reminder type
type Reminder = ReminderData;

// Event emitter for campus location events
export const campusLocationEmitter = new EventEmitter();

// Event types
export const CAMPUS_LOCATION_EVENTS = {
  ENTERED_CAMPUS_LOCATION: 'enteredCampusLocation',
};

// Distance threshold for considering a user near a location (in meters)
export const LOCATION_THRESHOLD = 100;

// Check interval (in milliseconds)
export const CHECK_INTERVAL = 10000; // 10 seconds

// Define campus locations
export const CAMPUS_LOCATIONS = [
  {
    id: 'library',
    name: 'Library',
    latitude: 45.382047,
    longitude: -75.699505,
    purpose: 'Study'
  },
  {
    id: 'cafeteria',
    name: 'Cafeteria',
    latitude: 45.387037,
    longitude: -75.697444,
    purpose: 'Eat'
  },
  {
    id: 'gym',
    name: 'Gym',
    latitude: 45.386383,
    longitude: -75.693221,
    purpose: 'Exercise'
  }
];

// Track if user was already near each location to prevent duplicate alerts
const wasNearLocation: Record<string, boolean> = {
  library: false,
  cafeteria: false,
  gym: false
};

// Variable to store the interval ID
let campusIntervalId: ReturnType<typeof setInterval> | null = null;

// Track when we last showed an alert for each location
const lastAlertShown: Record<string, number> = {
  library: 0,
  cafeteria: 0,
  gym: 0
};

// Minimum time between alerts for the same location (60 seconds)
const MIN_ALERT_INTERVAL = 60000;

// Track the last known reminders we've processed to detect new ones
let lastProcessedReminders: Record<string, boolean> = {};

// Reset the reminder tracking when location changes or new reminders are added
export const resetReminderTracking = () => {
  lastProcessedReminders = {};
  for (const locationId in lastAlertShown) {
    lastAlertShown[locationId] = 0;
  }
  console.log('[Campus Locations] Reset reminder tracking');
};

// Function to check if a user is near a campus location
export const isNearCampusLocation = (
  userLocation: Location.LocationObject,
  locationId: string
): boolean => {
  const location = CAMPUS_LOCATIONS.find(loc => loc.id === locationId);
  if (!location) return false;

  const distance = calculateDistance(
    userLocation.coords.latitude,
    userLocation.coords.longitude,
    location.latitude,
    location.longitude
  );

  return distance <= LOCATION_THRESHOLD;
};

// Check for location-based reminders that match campus locations
export const checkRemindersForCampusLocations = (
  userLocation: Location.LocationObject,
  reminders: any[]
) => {
  // Process each campus location
  CAMPUS_LOCATIONS.forEach(location => {
    const isNearby = isNearCampusLocation(userLocation, location.id);
    
    // Check if user just entered this location (wasn't near before)
    if (isNearby && !wasNearLocation[location.id]) {
      // Mark as near to prevent duplicate notifications
      wasNearLocation[location.id] = true;
      
      // Find reminders that match this location's purpose
      const matchingReminders = reminders.filter(reminder => 
        reminder.title.toLowerCase().includes(location.purpose.toLowerCase()) ||
        reminder.category === 'Location Reminder'
      );
      
      if (matchingReminders.length > 0) {
        // Emit location entry event
        campusLocationEmitter.emit(CAMPUS_LOCATION_EVENTS.ENTERED_CAMPUS_LOCATION, {
          location,
          reminders: matchingReminders
        });
        
        // Show a notification to the user
        matchingReminders.forEach(reminder => {
          Alert.alert(
            `You're near the ${location.name}`,
            `Don't forget to: ${reminder.title}`,
            [{ text: 'OK', style: 'default' }]
          );
        });
      }
    } 
    // Reset the location status when user leaves
    else if (!isNearby && wasNearLocation[location.id]) {
      wasNearLocation[location.id] = false;
    }
  });
};

// Find reminders that match a campus location's purpose
const findMatchingReminders = (reminders: Reminder[], location: typeof CAMPUS_LOCATIONS[0]): Reminder[] => {
  return reminders.filter(reminder => 
    // Only match reminders that specifically contain the location purpose in the title
    reminder.title.toLowerCase().includes(location.purpose.toLowerCase())
  );
};

// Check if there are new reminders that haven't been processed yet
const hasNewReminders = (reminders: Reminder[]): boolean => {
  let hasNew = false;
  
  reminders.forEach(reminder => {
    if (!lastProcessedReminders[reminder.id]) {
      hasNew = true;
      // Mark as processed
      lastProcessedReminders[reminder.id] = true;
    }
  });
  
  return hasNew;
};

// Show an alert for a campus location and matching reminder
const showCampusLocationAlert = (location: typeof CAMPUS_LOCATIONS[0], reminders: Reminder[]): void => {
  // Create a single message with all reminder titles
  let message = `You have ${reminders.length} ${reminders.length === 1 ? 'reminder' : 'reminders'} here:`;
  
  // Add each reminder as a bullet point
  reminders.forEach(reminder => {
    message += `\n• ${reminder.title}`;
  });
  
  // Show only one alert with all reminders
  Alert.alert(
    `You're near the ${location.name}`,
    message,
    [{ text: 'OK', style: 'default' }]
  );
};

// Start checking for campus locations
export const startCampusLocationChecking = async (
  reminders: Reminder[]
): Promise<boolean> => {
  try {
    console.log('[Campus Locations] Starting campus location checking');

    // Clear any existing interval
    stopCampusLocationChecking();

    // Request permissions
    const hasPermission = await requestLocationPermissions();

    if (!hasPermission && !global._mockLocation) {
      console.warn('[Campus Locations] Location permission denied and no mock location available');
      Alert.alert(
        'Location Permission Required',
        'Location monitoring requires permission to access your location.'
      );
      return false;
    }

    // Reset location tracking state
    for (const locationId in wasNearLocation) {
      wasNearLocation[locationId] = false;
    }
    
    // Reset reminder tracking to ensure new reminders are detected
    resetReminderTracking();

    // Set up the interval to check location
    campusIntervalId = setInterval(async () => {
      // Get current location
      const location = await getCurrentLocation();
      
      if (!location) {
        console.warn('[Campus Locations] Could not get current location');
        return;
      }
      
      // Log if this is a mock location
      if (global._mockLocation) {
        console.log('[Campus Locations] Using mock location for campus checks:', 
          global._mockLocation.latitude, 
          global._mockLocation.longitude
        );
      }

      // Current time for throttling alerts
      const currentTime = Date.now();

      // Check each campus location
      CAMPUS_LOCATIONS.forEach(campusLocation => {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          campusLocation.latitude,
          campusLocation.longitude
        );
        
        console.log(`[Campus Locations] Distance to ${campusLocation.name}: ${distance.toFixed(2)}m`);
        
        const isNearby = distance <= LOCATION_THRESHOLD;
        const wasNear = wasNearLocation[campusLocation.id];
        
        // Update the wasNear status for this location
        wasNearLocation[campusLocation.id] = isNearby;
        
        // Only process alerts when at the location
        if (isNearby) {
          // Find relevant reminders for this location
          const matchingReminders = findMatchingReminders(reminders, campusLocation);
          
          if (matchingReminders.length > 0) {
            console.log(`[Campus Locations] Found ${matchingReminders.length} matching reminders for ${campusLocation.name}`);
            
            // Check if we have new reminders or if we're entering the location
            const hasNew = hasNewReminders(matchingReminders);
            const isEntering = !wasNear;
            
            // Show alert if we're entering the location or if we have new reminders
            if (isEntering || hasNew) {
              console.log(`[Campus Locations] Showing alert for ${campusLocation.name} - ${isEntering ? 'entering location' : 'new reminders'}`);
              
              // Update the last alert time
              lastAlertShown[campusLocation.id] = currentTime;
              
              // Show a single alert with all matching reminders
              showCampusLocationAlert(campusLocation, matchingReminders);
            } else {
              // Only show repeated alerts if enough time has passed
              const timeSinceLastAlert = currentTime - (lastAlertShown[campusLocation.id] || 0);
              if (timeSinceLastAlert > MIN_ALERT_INTERVAL) {
                console.log(`[Campus Locations] Showing repeated alert for ${campusLocation.name}`);
                
                // Update the last alert time
                lastAlertShown[campusLocation.id] = currentTime;
                
                // Show a single alert with all matching reminders
                showCampusLocationAlert(campusLocation, matchingReminders);
              } else {
                console.log(`[Campus Locations] Skipping alert for ${campusLocation.name} - too soon since last alert (${timeSinceLastAlert}ms)`);
              }
            }
          }
        }
      });
    }, CHECK_INTERVAL);

    return true;
  } catch (error) {
    console.error('[Campus Locations] Error starting campus location checks:', error);
    return false;
  }
};

// Stop checking for campus locations
export const stopCampusLocationChecking = () => {
  if (campusIntervalId) {
    clearInterval(campusIntervalId);
    campusIntervalId = null;
  }
}; 