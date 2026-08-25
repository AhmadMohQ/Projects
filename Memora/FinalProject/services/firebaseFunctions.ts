// services/firebaseFunctions.ts
import { collection, addDoc, doc, deleteDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { scheduleReminderAlert, cancelScheduledAlert } from './notificationService';
import { DEFAULT_GEOFENCE_RADIUS } from './locationService';
import { Alert } from 'react-native';

// Function to add a reminder to Firestore
export const addReminderToFirestore = async (
  reminder: { 
    title: string; 
    time: Date; 
    category: string; 
    date?: Date;
    latitude?: number;
    longitude?: number;
    radius?: number;
    locationId?: string;
    triggerOnEnter?: boolean;
    triggerOnExit?: boolean;
    address?: string;
  }
) => {
  try {
    console.log("Adding reminder:", reminder.title);
    console.log("Time:", reminder.time);
    console.log("Date:", reminder.date);
    
    // For alerts, we need both time and date - properly combine them
    const reminderDateTime = new Date();
    
    // Set the date part from the date picker (or use time's date if not provided)
    if (reminder.date) {
      reminderDateTime.setFullYear(reminder.date.getFullYear());
      reminderDateTime.setMonth(reminder.date.getMonth());
      reminderDateTime.setDate(reminder.date.getDate());
    }
    
    // Set the time part from the time picker
    reminderDateTime.setHours(reminder.time.getHours());
    reminderDateTime.setMinutes(reminder.time.getMinutes());
    reminderDateTime.setSeconds(0);
    reminderDateTime.setMilliseconds(0);
    
    console.log("Combined DateTime:", reminderDateTime.toLocaleString());
    
    // Don't schedule if the date is in the past
    const now = new Date();
    const isInFuture = reminderDateTime > now;
    
    if (!isInFuture) {
      console.warn("Reminder date is in the past:", reminderDateTime.toLocaleString());
    }
    
    // Create the document data
    const reminderData: any = {
      title: reminder.title,
      time: reminderDateTime.toISOString(), // Store as ISO string with full date and time
      category: reminder.category,
      createdAt: new Date().toISOString(),
      alertId: null // Will be updated after scheduling
    };

    // Add location data if this is a location-based reminder
    if (reminder.category === 'Location Reminder' && reminder.latitude && reminder.longitude) {
      reminderData.latitude = reminder.latitude;
      reminderData.longitude = reminder.longitude;
      reminderData.radius = reminder.radius || DEFAULT_GEOFENCE_RADIUS;
      reminderData.locationId = reminder.locationId || 'custom';
      reminderData.triggerOnEnter = reminder.triggerOnEnter !== false; // default true
      reminderData.triggerOnExit = reminder.triggerOnExit || false;
      reminderData.address = reminder.address || '';
      reminderData.isActive = true;
    }
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'reminders'), reminderData);
    console.log('Reminder added with ID:', docRef.id);
    
    // Schedule alert if the reminder is in the future and is not a location-based reminder
    if (isInFuture && reminder.category !== 'Location Reminder') {
      console.log("Scheduling notification for:", reminderDateTime.toLocaleString());
      
      const alertId = await scheduleReminderAlert(
        reminder.title,
        reminder.category,
        reminderDateTime,
        docRef.id
      );
      
      // Update the document with the alert ID
      if (alertId) {
        await updateDoc(doc(db, 'reminders', docRef.id), {
          alertId: alertId
        });
        console.log("Updated reminder with alertId:", alertId);
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding reminder:', error);
    return null;
  }
};

// Function to remove a reminder from Firestore by its document ID
export const removeReminderFromFirestore = async (reminderId: string, alertId?: string) => {
  try {
    // If alert ID is provided, cancel the alert
    if (alertId) {
      cancelScheduledAlert(alertId);
    }
    
    // Delete the document
    await deleteDoc(doc(db, 'reminders', reminderId));
    console.log('Reminder deleted with ID:', reminderId);
    return true;
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return false;
  }
};

// Function to load and reschedule all active reminders
export const loadAndRescheduleReminders = async () => {
  try {
    // Get all reminders
    const remindersSnapshot = await getDocs(collection(db, 'reminders'));
    const reminders = remindersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Process reminders
    const now = new Date();
    let rescheduledCount = 0;
    
    for (const reminder of reminders) {
      // Skip location reminders as they're handled by location service
      if (reminder.category === 'Location Reminder') continue;
      
      const reminderTime = new Date(reminder.time);
      
      // Only schedule future reminders
      if (reminderTime > now) {
        const alertId = await scheduleReminderAlert(
          reminder.title,
          reminder.category,
          reminderTime,
          reminder.id
        );
        
        // Update the alert ID if it changed
        if (alertId && alertId !== reminder.alertId) {
          await updateDoc(doc(db, 'reminders', reminder.id), {
            alertId: alertId
          });
          rescheduledCount++;
        }
      }
    }
    
    console.log(`Rescheduled ${rescheduledCount} reminders`);
    return reminders;
  } catch (error) {
    console.error('Error loading reminders:', error);
    return [];
  }
};

// Function to add a saved location to Firestore
export const addSavedLocationToFirestore = async (
  location: {
    name: string;
    latitude: number;
    longitude: number;
    radius?: number;
    address?: string;
  }
) => {
  try {
    const locationData = {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius || DEFAULT_GEOFENCE_RADIUS,
      address: location.address || '',
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'savedLocations'), locationData);
    console.log('Location saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving location:', error);
    return null;
  }
};

// Function to get all saved locations
export const getSavedLocations = async () => {
  try {
    const locationsSnapshot = await getDocs(collection(db, 'savedLocations'));
    const locations = locationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return locations;
  } catch (error) {
    console.error('Error getting saved locations:', error);
    return [];
  }
};

// Function to delete a saved location
export const deleteSavedLocation = async (locationId: string) => {
  try {
    await deleteDoc(doc(db, 'savedLocations', locationId));
    console.log('Location deleted with ID:', locationId);
    return true;
  } catch (error) {
    console.error('Error deleting location:', error);
    return false;
  }
};

// Function to update location-based reminder's active status
export const updateReminderActiveStatus = async (reminderId: string, isActive: boolean) => {
  try {
    await updateDoc(doc(db, 'reminders', reminderId), {
      isActive: isActive
    });
    console.log(`Reminder ${reminderId} ${isActive ? 'activated' : 'deactivated'}`);
    return true;
  } catch (error) {
    console.error('Error updating reminder status:', error);
    return false;
  }
};

// Add a utility function to create an immediate test reminder
export const createImmediateTestReminder = async () => {
  try {
    // Create a date 1 minute in the future
    const testTime = new Date();
    testTime.setSeconds(testTime.getSeconds() + 60);
    
    // Create a reminder data object
    const reminderData = {
      title: 'Test Reminder (1 min)',
      time: testTime.toISOString(),
      category: 'Test Reminder',
      createdAt: new Date().toISOString(),
      alertId: null
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'reminders'), reminderData);
    
    // Schedule the alert
    const alertId = await scheduleReminderAlert(
      reminderData.title,
      reminderData.category,
      testTime,
      docRef.id
    );
    
    if (alertId) {
      // Update the document with the alert ID
      await updateDoc(doc(db, 'reminders', docRef.id), {
        alertId: alertId
      });
      
      // Confirm to user
      Alert.alert(
        'Test Reminder Created',
        `A test reminder has been scheduled for ${testTime.toLocaleTimeString()}`,
        [{ text: 'OK', style: 'default' }]
      );
      
      return docRef.id;
    }
  } catch (error) {
    console.error('Error creating test reminder:', error);
    Alert.alert('Error', 'Failed to create test reminder');
    return null;
  }
};
