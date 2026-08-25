// services/firebaseListeners.ts
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { rescheduleStoredAlerts } from './notificationService';

export type ReminderData = {
  id: string;
  title: string;
  time: string;
  category: string;
  alertId?: string;
  createdAt?: string;
};

// Custom hook to subscribe to real-time updates of reminders
export const useReminders = () => {
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      // Create a query with ordering by time
      const remindersQuery = query(
        collection(db, 'reminders'),
        orderBy('time', 'asc') // Sort by time in ascending order
      );

      // Subscribe to the "reminders" collection in Firestore
      const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
        const remindersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ReminderData[];
        
        // Update reminders state
        setReminders(remindersList);
        
        // Reschedule alerts based on latest data
        rescheduleStoredAlerts(remindersList);
        
        setLoading(false);
      }, (err) => {
        console.error('Error getting reminders:', err);
        setError(err.message);
        setLoading(false);
      });

      return unsubscribe; // Cleanup subscription on unmount
    } catch (err) {
      console.error('Error setting up listener:', err);
      setError('Failed to load reminders');
      setLoading(false);
      return () => {}; // Return empty function as a fallback
    }
  }, []);

  return { reminders, loading, error };
};
