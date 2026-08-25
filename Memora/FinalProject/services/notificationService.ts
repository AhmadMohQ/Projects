import { Alert, AppState, Platform } from 'react-native';
import { EventEmitter } from 'events';

// Event emitter for managing reminder alerts across the app
export const reminderEventEmitter = new EventEmitter();

// Constant for the reminder event name
export const REMINDER_DUE_EVENT = 'reminderDue';

// Flag to track if we're already showing a native alert
let isShowingNativeAlert = false;

// Interface for reminder data
export interface ReminderAlertData {
  id: string;
  title: string;
  category: string;
}

// Store for scheduled reminders
interface ScheduledReminder {
  id: string;
  title: string;
  category: string;
  scheduledTime: Date;
  timeoutId: NodeJS.Timeout;
}

// Store all scheduled reminders
const scheduledReminders: Record<string, ScheduledReminder> = {};

// Function to show an in-app alert for a reminder
export function showReminderAlert(reminder: ReminderAlertData) {
  // Emit event so any screen can catch and display the alert
  reminderEventEmitter.emit(REMINDER_DUE_EVENT, reminder);
  
  // Show a native alert if event emitter has no listeners as a backup
  setTimeout(() => {
    const hasListeners = reminderEventEmitter.listenerCount(REMINDER_DUE_EVENT) > 0;
    
    if (!hasListeners && AppState.currentState === 'active' && !isShowingNativeAlert) {
      isShowingNativeAlert = true;
      
      Alert.alert(
        `Reminder: ${reminder.title}`,
        `Category: ${reminder.category}`,
        [{ 
          text: 'OK', 
          style: 'default',
          onPress: () => {
            isShowingNativeAlert = false;
          }
        }]
      );
    }
  }, 300);
}

// Schedule a reminder alert
export async function scheduleReminderAlert(
  title: string,
  category: string,
  triggerDate: Date,
  reminderId: string
): Promise<string> {
  try {
    // Generate a unique ID for this alert
    const alertId = `reminder_${reminderId}_${Date.now()}`;
    
    // Calculate milliseconds until trigger
    const now = new Date();
    const msUntilTrigger = Math.max(100, triggerDate.getTime() - now.getTime());
    
    // Schedule the alert
    const timeoutId = setTimeout(() => {
      // Show the reminder alert
      showReminderAlert({
        id: reminderId,
        title,
        category
      });
      
      // Remove from scheduled reminders after triggered
      delete scheduledReminders[alertId];
    }, msUntilTrigger);
    
    // Store the scheduled reminder
    scheduledReminders[alertId] = {
      id: reminderId,
      title,
      category,
      scheduledTime: triggerDate,
      timeoutId
    };
    
    return alertId;
  } catch (error) {
    console.error('Error scheduling reminder alert:', error);
    return '';
  }
}

// Cancel a scheduled reminder alert
export function cancelScheduledAlert(alertId: string): boolean {
  try {
    const scheduledReminder = scheduledReminders[alertId];
    if (scheduledReminder) {
      clearTimeout(scheduledReminder.timeoutId);
      delete scheduledReminders[alertId];
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error canceling reminder alert:', error);
    return false;
  }
}

// Get all scheduled alerts
export function getAllScheduledAlerts(): ScheduledReminder[] {
  return Object.values(scheduledReminders);
}

// Check if an alert is scheduled
export function isAlertScheduled(alertId: string): boolean {
  return alertId in scheduledReminders;
}

// Function to reschedule all alerts (e.g. after app restart)
export function rescheduleStoredAlerts(reminders: any[]) {
  // Clear any existing scheduled alerts
  Object.keys(scheduledReminders).forEach(id => {
    cancelScheduledAlert(id);
  });
  
  // Schedule alerts for reminders in the future
  const now = new Date();
  
  reminders.forEach(reminder => {
    const reminderDate = new Date(reminder.time);
    if (reminderDate > now) {
      scheduleReminderAlert(
        reminder.title,
        reminder.category,
        reminderDate,
        reminder.id
      );
    }
  });
}

// Initialize the reminder service
export function initializeReminderService() {
  // Set maximum listeners
  reminderEventEmitter.setMaxListeners(10);
  
  // Setup app state listener
  AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      // Check for any missed reminders
      const now = new Date();
      const missedReminders = Object.values(scheduledReminders).filter(reminder => {
        const reminderTime = reminder.scheduledTime;
        // Consider reminders missed if they were due in the last 5 minutes
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        return reminderTime >= fiveMinutesAgo && reminderTime <= now;
      });
      
      if (missedReminders.length > 0) {
        missedReminders.forEach(reminder => {
          // Trigger the reminder now
          showReminderAlert({
            id: reminder.id,
            title: reminder.title,
            category: reminder.category
          });
          
          // Remove from scheduled reminders
          const reminderKeys = Object.keys(scheduledReminders).filter(
            key => scheduledReminders[key].id === reminder.id
          );
          reminderKeys.forEach(key => {
            clearTimeout(scheduledReminders[key].timeoutId);
            delete scheduledReminders[key];
          });
        });
      }
    }
  });
  
  return true;
} 