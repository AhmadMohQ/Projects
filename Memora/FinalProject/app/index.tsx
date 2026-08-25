// app/index.tsx
import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { loadAndRescheduleReminders } from '../services/firebaseFunctions';

export default function Index() {
  // Initialize services when the app starts
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load and reschedule reminders
        await loadAndRescheduleReminders();
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };
    
    initialize();
  }, []);

  // Redirect to the reminders screen
  return <Redirect href="/reminders" />;
}
