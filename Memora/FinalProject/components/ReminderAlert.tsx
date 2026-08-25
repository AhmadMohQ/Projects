import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { reminderEventEmitter, REMINDER_DUE_EVENT, ReminderAlertData } from '../services/notificationService';

export default function ReminderAlert() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<ReminderAlertData | null>(null);
  const [pendingReminders, setPendingReminders] = useState<ReminderAlertData[]>([]);

  // Listen for reminder events
  useEffect(() => {
    // Handle Android back button to prevent dismissing the alert accidentally
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        return true; // Prevent default behavior
      }
      return false;
    });

    // Function to handle new reminder alerts
    const handleReminderDue = (reminder: ReminderAlertData) => {
      // Vibrate the device with a stronger pattern to get attention
      try {
        if (Platform.OS === 'android') {
          // Stronger pattern for Android
          Vibration.vibrate([0, 500, 200, 500]);
        } else {
          // For iOS, which might have different vibration behavior
          Vibration.vibrate([0, 500]);
        }
      } catch (error) {
        console.error('Vibration error:', error);
      }

      if (visible) {
        // If already showing an alert, queue this one
        setPendingReminders(prev => [...prev, reminder]);
      } else {
        // Otherwise show it immediately
        setCurrentReminder(reminder);
        setVisible(true);
      }
    };

    // Listen for reminder events
    reminderEventEmitter.on(REMINDER_DUE_EVENT, handleReminderDue);

    // Clean up on unmount
    return () => {
      reminderEventEmitter.off(REMINDER_DUE_EVENT, handleReminderDue);
      backHandler.remove();
    };
  }, [visible]);

  // Handle the close action for the alert
  const handleClose = () => {
    setVisible(false);
    setCurrentReminder(null);

    // Show next reminder if any are pending
    setTimeout(() => {
      if (pendingReminders.length > 0) {
        const next = pendingReminders[0];
        const remaining = pendingReminders.slice(1);
        setPendingReminders(remaining);
        setCurrentReminder(next);
        setVisible(true);
        
        // Vibrate again for the next reminder
        Vibration.vibrate([0, 300]);
      }
    }, 300);
  };

  if (!visible || !currentReminder) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={[styles.alertBox, { backgroundColor: colors.card }]}>
          {/* Reminder Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Ionicons 
              name={currentReminder.category.includes('Household') ? 'home' : 
                   currentReminder.category.includes('Location') ? 'location' :
                   currentReminder.category.includes('Event') ? 'calendar' :
                   currentReminder.category.includes('Task') ? 'checkmark-circle' : 'time'} 
              size={32} 
              color="white" 
            />
          </View>

          {/* Reminder Content */}
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {currentReminder.title}
            </Text>
            <Text style={[styles.category, { color: colors.secondaryText }]}>
              {currentReminder.category}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleClose}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  alertBox: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 