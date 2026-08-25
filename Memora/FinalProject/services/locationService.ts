import * as Location from 'expo-location';
import { EventEmitter } from 'events';
import { Alert, AppState } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Constants
export const LOCATION_EVENTS = {
  ENTERED_REGION: 'enteredRegion',
  LEFT_REGION: 'leftRegion',
  LOCATION_UPDATED: 'locationUpdated',
  ERROR: 'locationError'
};
export const DEFAULT_GEOFENCE_RADIUS = 500;
export const locationEventEmitter = new EventEmitter();

// Current location state
let currentLocation: Location.LocationObject | null = null;
let locationSubscription: Location.LocationSubscription | null = null;
let isMonitoring = false;
let homeLocation: Location.LocationObject | null = null;

// Types
export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius?: number;
  address?: string;
  createdAt?: string;
}

export interface LocationBasedReminder {
  id: string;
  title: string;
  category: string;
  locationId: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
  address?: string;
  createdAt?: string;
  lastNearby?: boolean;
}

// Get stored location-based reminders
export const getLocationReminders = async (): Promise<LocationBasedReminder[]> => {
  try {
    const remindersRef = collection(db, 'reminders');
    const q = query(remindersRef, where('category', '==', 'Location Reminder'));
    const snapshot = await getDocs(q);
    
    const reminders: LocationBasedReminder[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.latitude && data.longitude) {
        reminders.push({
          id: doc.id,
          title: data.title,
          category: data.category,
          locationId: data.locationId || 'custom',
          latitude: data.latitude,
          longitude: data.longitude,
          radius: data.radius || DEFAULT_GEOFENCE_RADIUS,
          isActive: data.isActive !== false, // default to active if not specified
          triggerOnEnter: data.triggerOnEnter !== false, // default to true
          triggerOnExit: data.triggerOnExit || false
        });
      }
    });
    
    return reminders;
  } catch (error) {
    console.error('Error getting location reminders:', error);
    return [];
  }
};

// Request location permissions - with enhanced error handling
export const requestLocationPermissions = async (): Promise<boolean> => {
  // If we're using a mock location, skip permission checks
  if (global._mockLocation) {
    console.log('[Location Service] Using mock location - skipping permission checks');
    return true;
  }
  
  try {
    // Get foreground permission
    const foregroundPermission = await Location.requestForegroundPermissionsAsync()
      .catch(error => {
        console.warn('[Location Service] Foreground permission request failed:', error.message);
        return { granted: false };
      });
    
    if (!foregroundPermission.granted) {
      console.warn('[Location Service] Foreground location permission not granted');
      return false;
    }
    
    // Try to get background permission if needed
    try {
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      return backgroundPermission.granted;
    } catch (error) {
      // This will often fail in development mode, which is okay
      console.warn('[Location Service] Background permission request failed:', error.message);
      // Return true anyway since we have foreground permissions
      return true;
    }
  } catch (error) {
    console.error('[Location Service] Error requesting location permissions:', error);
    // If permissions fail but we have mock location, we can still proceed
    return !!global._mockLocation;
  }
};

// Set home location
export const setHomeLocation = async (location?: Location.LocationObject | null): Promise<Location.LocationObject | null> => {
  try {
    if (!location) {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }
      
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
    }
    
    homeLocation = location;
    return homeLocation;
  } catch (error) {
    console.error('Error setting home location:', error);
    return null;
  }
};

// Calculate distance between two locations (in meters)
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // distance in meters
};

// Check if a location is within radius of another
export const isLocationNearby = (
  location: Location.LocationObject,
  targetLat: number,
  targetLon: number,
  radius: number = DEFAULT_GEOFENCE_RADIUS
): boolean => {
  const distance = calculateDistance(
    location.coords.latitude,
    location.coords.longitude,
    targetLat,
    targetLon
  );
  
  return distance <= radius;
};

// Process location update against all reminders
export const processLocationUpdate = async (location: Location.LocationObject) => {
  try {
    // Store current location
    currentLocation = location;
    
    // Get all location-based reminders
    const reminders = await getLocationReminders();
    
    // Check each reminder for proximity
    reminders.forEach(reminder => {
      if (!reminder.isActive) return;
      
      const wasNearby = reminder.lastNearby || false;
      const isNearby = isLocationNearby(
        location, 
        reminder.latitude, 
        reminder.longitude, 
        reminder.radius
      );
      
      // Update last nearby status
      reminder.lastNearby = isNearby;
      
      // Trigger events based on entry/exit
      if (!wasNearby && isNearby && reminder.triggerOnEnter) {
        // Entered the region
        locationEventEmitter.emit(LOCATION_EVENTS.ENTERED_REGION, reminder);
        
        // Show alert for entered region
        setTimeout(() => {
          if (AppState.currentState === 'active') {
            Alert.alert(
              'Location Reminder',
              `You're near ${reminder.title}`,
              [{ text: 'OK', style: 'default' }]
            );
          }
        }, 100);
      } else if (wasNearby && !isNearby && reminder.triggerOnExit) {
        // Left the region
        locationEventEmitter.emit(LOCATION_EVENTS.LEFT_REGION, reminder);
      }
    });
    
    // Emit general location update event
    locationEventEmitter.emit(LOCATION_EVENTS.LOCATION_UPDATED, location);
    
  } catch (error) {
    console.error('Error processing location update:', error);
    locationEventEmitter.emit(LOCATION_EVENTS.ERROR, error);
  }
};

// Start location tracking
export const startLocationTracking = async (foregroundOnly: boolean = false): Promise<boolean> => {
  try {
    // If we're using mock location, just return true
    if (global._mockLocation) {
      console.log('[Location Service] Using mock location - skipping real tracking');
      isMonitoring = true;
      return true;
    }
    
    // Check if we already have a subscription
    if (locationSubscription) {
      console.log('[Location Service] Location tracking already active');
      return true;
    }
    
    // Request permissions if not already granted
    const permissionGranted = await requestLocationPermissions();
    if (!permissionGranted) {
      console.warn('[Location Service] Location permission not granted for tracking');
      return false;
    }
    
    // Start watching position
    try {
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // minimum change (in meters) to trigger update
          timeInterval: 5000    // minimum time to wait between updates (ms)
        },
        (location) => {
          // Update current location
          currentLocation = location;
          
          // Emit location updated event
          locationEventEmitter.emit(LOCATION_EVENTS.LOCATION_UPDATED, location);
          
          // Process the location update against reminders
          processLocationUpdate(location).catch(error => {
            console.error('[Location Service] Error processing location update:', error);
          });
        }
      );
      
      isMonitoring = true;
      console.log('[Location Service] Location tracking started');
      return true;
    } catch (error) {
      console.error('[Location Service] Error watching position:', error);
      // If tracking fails but we have mock location, return true anyway
      if (global._mockLocation) {
        isMonitoring = true;
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('[Location Service] Error starting location tracking:', error);
    return false;
  }
};

// Stop monitoring location
export const stopLocationTracking = async (): Promise<void> => {
  if (locationSubscription) {
    await locationSubscription.remove();
    locationSubscription = null;
  }
  isMonitoring = false;
};

// Get current location
export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    // Check if we have a mock location set
    if (global._mockLocation) {
      console.log('[Location Service] Using mock location:', global._mockLocation);
      // Return a simulated location object with the mock coordinates
      return {
        coords: {
          latitude: global._mockLocation.latitude,
          longitude: global._mockLocation.longitude,
          altitude: 0,
          accuracy: 5,
          altitudeAccuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now()
      };
    }
    
    // Otherwise get the real location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return null;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in getCurrentLocation:', error);
    return null;
  }
};

// Get current location or last known location
export const getLocation = async (): Promise<Location.LocationObject | null> => {
  if (currentLocation) return currentLocation;
  return await getCurrentLocation();
};

// Convert address to coordinates
export const geocodeAddress = async (address: string): Promise<Location.LocationGeocodedLocation | null> => {
  try {
    const results = await Location.geocodeAsync(address);
    if (results.length > 0) {
      return results[0];
    }
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

// Convert coordinates to address
export const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number
): Promise<Location.LocationGeocodedAddress | null> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude
    });
    
    if (results.length > 0) {
      return results[0];
    }
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
};

// Get formatted address
export const getFormattedAddress = (address: Location.LocationGeocodedAddress): string => {
  const parts = [];
  
  if (address.name) parts.push(address.name);
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.region) parts.push(address.region);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
};

// Initialize the location service
export const initializeLocationService = async (): Promise<void> => {
  try {
    // Request permissions - but continue even if they fail
    try {
      await requestLocationPermissions();
    } catch (error) {
      console.warn('Error requesting permissions but continuing:', error);
    }
    
    // Get initial location
    try {
      const location = await getCurrentLocation();
      if (location) {
        currentLocation = location;
        
        // If we don't have a home location yet, set it
        if (!homeLocation) {
          homeLocation = location;
        }
      }
    } catch (error) {
      console.warn('Error getting initial location:', error);
    }
    
    // Process initial location with reminders
    if (currentLocation) {
      try {
        await processLocationUpdate(currentLocation);
      } catch (error) {
        console.warn('Error processing initial location:', error);
      }
    }
    
    // Start location tracking - but don't fail if it doesn't work
    try {
      await startLocationTracking();
    } catch (error) {
      console.warn('Could not start location tracking but continuing:', error);
    }
    
    // Setup app state listener to restart tracking when app comes to foreground
    AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && !isMonitoring) {
        startLocationTracking().catch(error => {
          console.warn('Error restarting location tracking:', error);
        });
      }
    });
  } catch (error) {
    console.error('Error initializing location service:', error);
  }
}; 