import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useReminders } from '../services/firebaseListeners';
import { 
  startCampusLocationChecking, 
  stopCampusLocationChecking,
  campusLocationEmitter,
  CAMPUS_LOCATION_EVENTS,
  CAMPUS_LOCATIONS
} from '../services/campusLocations';

// Component to handle campus location monitoring
export default function CampusLocationMonitor() {
  // Get all reminders
  const { reminders, loading } = useReminders();
  
  // Start monitoring when component mounts
  useEffect(() => {
    // Only start if reminders are loaded
    if (!loading && reminders.length > 0) {
      console.log('Starting campus location monitoring with', reminders.length, 'reminders');
      
      // Start monitoring
      startCampusLocationChecking(reminders);
      
      // Set up listener for location events (optional, we already show alerts in the service)
      campusLocationEmitter.on(
        CAMPUS_LOCATION_EVENTS.ENTERED_CAMPUS_LOCATION,
        (data) => {
          console.log(`Entered ${data.location.name} with ${data.reminders.length} matching reminders`);
          // You could do additional handling here if needed
        }
      );
      
      // Clean up on unmount
      return () => {
        stopCampusLocationChecking();
        campusLocationEmitter.removeAllListeners(CAMPUS_LOCATION_EVENTS.ENTERED_CAMPUS_LOCATION);
      };
    }
  }, [reminders, loading]);
  
  // This component doesn't render anything visible
  return null;
} 