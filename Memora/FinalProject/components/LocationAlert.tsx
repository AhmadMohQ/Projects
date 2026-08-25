import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { locationEventEmitter, LOCATION_EVENTS, LocationBasedReminder } from '../services/locationService';

export default function LocationAlert() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<LocationBasedReminder | null>(null);
  const [pendingReminders, setPendingReminders] = useState<LocationBasedReminder[]>([]);

  useEffect(() => {
    // Function to handle location-based reminder alerts
    const handleLocationReminder = (reminder: LocationBasedReminder) => {
      console.log('Location reminder triggered:', reminder);
      // Vibrate the device to get attention
      Vibration.vibrate([0, 500, 200, 500]);

      if (visible) {
        // If already showing an alert, queue this one
        setPendingReminders(prev => [...prev, reminder]);
      } else {
        // Otherwise show it immediately
        setCurrentReminder(reminder);
        setVisible(true);
      }
    };

    // Listen for location events
    locationEventEmitter.on(LOCATION_EVENTS.ENTERED_REGION, handleLocationReminder);

    // Clean up on unmount
    return () => {
      locationEventEmitter.off(LOCATION_EVENTS.ENTERED_REGION, handleLocationReminder);
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
          {/* Map Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="location" size={32} color="white" />
          </View>

          {/* Reminder Content */}
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              Location Reminder
            </Text>
            <Text style={[styles.reminderText, { color: colors.text }]}>
              {currentReminder.title}
            </Text>
            {currentReminder.address && (
              <Text style={[styles.addressText, { color: colors.secondaryText }]}>
                {currentReminder.address}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleClose}
            >
              <Text style={styles.buttonText}>Got it</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertBox: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  reminderText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 