import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { LocationBasedReminder, SavedLocation } from './locationService';

// Custom hook for location-based reminders
export const useLocationReminders = () => {
  const [reminders, setReminders] = useState<LocationBasedReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      // Create a query for location reminders - without orderBy to avoid index requirement
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('category', '==', 'Location Reminder')
      );

      // Subscribe to the query
      const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
        const remindersList: LocationBasedReminder[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.latitude && data.longitude) {
            remindersList.push({
              id: doc.id,
              title: data.title,
              category: data.category,
              locationId: data.locationId || 'custom',
              latitude: data.latitude,
              longitude: data.longitude,
              radius: data.radius,
              isActive: data.isActive !== false, // default to active if not specified
              triggerOnEnter: data.triggerOnEnter !== false, // default to true
              triggerOnExit: data.triggerOnExit || false,
              address: data.address || ''
            });
          }
        });
        
        // Sort the reminders here instead of in the query
        remindersList.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Newest first
        });
        
        setReminders(remindersList);
        setLoading(false);
      }, (err) => {
        console.error('Error getting location reminders:', err);
        setError(err.message);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up location reminders listener:', err);
      setError('Failed to load location reminders');
      setLoading(false);
      return () => {};
    }
  }, []);

  return { reminders, loading, error };
};

// Custom hook for saved locations
export const useSavedLocations = () => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      // Create a query for saved locations - without orderBy to avoid index requirement
      const locationsQuery = query(
        collection(db, 'savedLocations')
      );

      // Subscribe to the query
      const unsubscribe = onSnapshot(locationsQuery, (snapshot) => {
        const locationsList: SavedLocation[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          locationsList.push({
            id: doc.id,
            name: data.name,
            latitude: data.latitude,
            longitude: data.longitude,
            radius: data.radius,
            address: data.address || '',
            createdAt: data.createdAt
          });
        });
        
        // Sort the locations here instead of in the query
        locationsList.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Newest first
        });
        
        setLocations(locationsList);
        setLoading(false);
      }, (err) => {
        console.error('Error getting saved locations:', err);
        setError(err.message);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up saved locations listener:', err);
      setError('Failed to load saved locations');
      setLoading(false);
      return () => {};
    }
  }, []);

  return { locations, loading, error };
}; 