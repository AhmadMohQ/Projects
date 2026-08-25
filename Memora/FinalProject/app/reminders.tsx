import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { addReminderToFirestore, removeReminderFromFirestore, loadAndRescheduleReminders, createImmediateTestReminder } from '../services/firebaseFunctions';
import { useReminders } from '../services/firebaseListeners';
import { Ionicons } from '@expo/vector-icons';
import ReminderAlert from '../components/ReminderAlert';
import { initializeReminderService, showReminderAlert } from '../services/notificationService';
import SensorAlert from '../components/SensorAlert';
import { CAMPUS_LOCATIONS } from '../services/campusLocations';
import { resetReminderTracking } from '../services/campusLocations';

const categories = [
  'Household Reminder',
  'Location Reminder',
  'Time-based Reminder',
  'Event Reminder',
  'Task Reminder',
];

export default function RemindersScreen() {
  const { colors, theme } = useTheme();
  // We'll use our custom hook to fetch reminders in real time from Firestore
  const { reminders: firestoreReminders, loading, error } = useReminders();
  const [modalVisible, setModalVisible] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    time: new Date(),
    date: new Date(),
    category: categories[0],
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);

  // Initialize the reminder alert service
  useEffect(() => {
    // Load and reschedule any existing reminders
    loadAndRescheduleReminders();
  }, []);

  // Create a test reminder that will fire soon
  const createTestReminder = () => {
    Alert.alert(
      'Create Test Reminder',
      'This will create a reminder that will trigger in 1 minute. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: async () => {
            await createImmediateTestReminder();
          }
        }
      ]
    );
  };

  // Function to handle adding a new reminder (both locally and to Firestore)
  const handleAddReminder = async () => {
    if (!newReminder.title) {
      Alert.alert('Error', 'Please enter a reminder title');
      return;
    }

    // Combine the date and time for the reminder
    const reminderDate = new Date(newReminder.date);
    const reminderTime = new Date(newReminder.time);
    
    console.log('Creating new reminder:');
    console.log('- Title:', newReminder.title);
    console.log('- Category:', newReminder.category);
    console.log('- Date:', reminderDate.toLocaleDateString());
    console.log('- Time:', reminderTime.toLocaleTimeString());
    
    const combinedDateTime = new Date(
      reminderDate.getFullYear(),
      reminderDate.getMonth(),
      reminderDate.getDate(),
      reminderTime.getHours(),
      reminderTime.getMinutes()
    );
    
    console.log('- Combined:', combinedDateTime.toLocaleString());
    
    // Check if reminder is in the past
    if (combinedDateTime < new Date()) {
      Alert.alert(
        'Past Reminder', 
        'This reminder is set for a time in the past. Are you sure you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: async () => {
              await addReminderToFirebase();
            }
          }
        ]
      );
    } else {
      await addReminderToFirebase();
    }
    
    // Function to add reminder to Firebase
    async function addReminderToFirebase() {
      try {
        // Call our Firebase function to add reminder
        await addReminderToFirestore({
          ...newReminder,
          time: new Date(newReminder.time),
          date: new Date(newReminder.date)
        });
        
        // Reset campus location reminder tracking to ensure new reminders trigger alerts
        resetReminderTracking();
        
        setModalVisible(false);
        // Reset fields
        setNewReminder({
          title: '',
          time: new Date(),
          date: new Date(),
          category: categories[0],
        });
        setShowCategoryList(false);
        
        console.log('Reminder added successfully');
      } catch (error) {
        console.error('Error adding reminder:', error);
        Alert.alert('Error', 'Failed to add reminder. Please try again.');
      }
    }
  };

  // Function to handle deletion of a reminder from Firestore
  const handleRemoveReminder = async (id: string, alertId?: string) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => await removeReminderFromFirestore(id, alertId)
        }
      ]
    );
  };

  const onChangeTime = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setNewReminder((prev) => ({ ...prev, time: selectedDate }));
    }
  };

  const onChangeDate = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewReminder((prev) => ({ ...prev, date: selectedDate }));
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if a reminder is past due
  const isPastDue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Render each reminder from Firestore
  const renderReminderItem = ({ item }: { item: any }) => (
    <View 
      style={[
        styles.reminderCard, 
        { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          borderLeftColor: isPastDue(item.time) ? colors.error : colors.primary,
          borderLeftWidth: 5
        }
      ]}
    >
      <View style={styles.reminderContent}>
        <Text style={[styles.reminderTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.reminderDetails, { color: colors.secondaryText }]}>
          {formatDate(item.time)}
        </Text>
        <View style={styles.reminderCategory}>
          <Ionicons 
            name={item.category.includes('Household') ? 'home-outline' : 
                 item.category.includes('Location') ? 'location-outline' :
                 item.category.includes('Event') ? 'calendar-outline' :
                 item.category.includes('Task') ? 'checkmark-circle-outline' : 'time-outline'} 
            size={14} 
            color={colors.secondaryText} 
            style={styles.categoryIcon}
          />
          <Text style={[styles.categoryText, { color: colors.secondaryText }]}>
            {item.category}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => handleRemoveReminder(item.id, item.alertId)} 
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={22} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  // Add this function to your RemindersScreen component
  const createCampusLocationReminder = (locationId: string) => {
    const location = CAMPUS_LOCATIONS.find(loc => loc.id === locationId);
    if (!location) return;
    
    // Create a reminder with the location's purpose
    setNewReminder({
      ...newReminder,
      title: location.purpose,
      category: 'Location Reminder'
    });
    
    // Show modal
    setModalVisible(true);
  };

  // Show loading indicator while fetching reminders
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading reminders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Add the reminder alert component */}
      <ReminderAlert />
      
      {/* Add the sensor alert component */}
      <SensorAlert />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>My Reminders</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={createTestReminder}
            style={styles.testButton}
          >
            <Ionicons name="alarm-outline" size={24} color="#fff" />
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
          <ThemeToggle />
        </View>
      </View>

      {/* Display error message if there was an error loading reminders */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Display reminders from Firestore */}
      {!error && firestoreReminders.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="notifications-outline" size={64} color={colors.secondaryText} />
          <Text style={[styles.emptyStateText, { color: colors.text }]}>No Reminders Yet</Text>
          <Text style={[styles.emptyStateSubtext, { color: colors.secondaryText }]}>
            Tap the "+" button to create a new reminder.
          </Text>
        </View>
      ) : (
        <FlatList
          data={firestoreReminders}
          renderItem={renderReminderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.remindersList}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal for Adding a Reminder */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>New Reminder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.sheetCancel, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetBody}>
              {/* Title Input */}
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: theme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                    color: colors.text,
                  },
                ]}
                placeholder="Reminder Title"
                placeholderTextColor={colors.secondaryText}
                value={newReminder.title}
                onChangeText={(text) =>
                  setNewReminder((prev) => ({ ...prev, title: text }))
                }
              />

              {/* Date Picker */}
              <TouchableOpacity
                style={[styles.timePickerButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.timePickerText, { color: colors.text }]}>
                  Select Date: {newReminder.date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={newReminder.date}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                  themeVariant={theme}
                  minimumDate={new Date()}
                />
              )}

              {/* Time Picker */}
              <TouchableOpacity
                style={[styles.timePickerButton, { backgroundColor: colors.buttonBackground, marginTop: 10 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.timePickerText, { color: colors.text }]}>
                  Select Time: {newReminder.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={newReminder.time}
                  mode="time"
                  display="default"
                  is24Hour={false}
                  onChange={onChangeTime}
                  themeVariant={theme}
                />
              )}

              {/* Category Selection */}
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
                Category: {newReminder.category}
              </Text>
              <TouchableOpacity
                style={[styles.categoryButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => setShowCategoryList(!showCategoryList)}
              >
                <Text style={[styles.categoryButtonText, { color: colors.text }]}>
                  {showCategoryList ? 'Hide Categories' : 'Choose Category'}
                </Text>
              </TouchableOpacity>
              {showCategoryList && (
                <View
                  style={[
                    styles.categoryListContainer,
                    { backgroundColor: theme === 'dark' ? '#252525' : '#f9f9f9' },
                  ]}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.categoryItem}
                      onPress={() => {
                        setNewReminder((prev) => ({ ...prev, category: cat }));
                        setShowCategoryList(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryItemText,
                          { color: colors.text },
                          cat === newReminder.category && {
                            fontWeight: '700',
                            color: colors.primary,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Add this section in your modal, before the category selection */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                  Campus Location Presets
                </Text>
                <View style={styles.presetButtons}>
                  {CAMPUS_LOCATIONS.map(location => (
                    <TouchableOpacity
                      key={location.id}
                      style={[styles.presetButton, { backgroundColor: colors.primary }]}
                      onPress={() => createCampusLocationReminder(location.id)}
                    >
                      <Text style={styles.presetButtonText}>
                        {location.name}: {location.purpose}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Add Button */}
              <TouchableOpacity
                style={[styles.addReminderButton, { backgroundColor: colors.primary }]}
                onPress={handleAddReminder}
              >
                <Text style={styles.addReminderButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remindersList: {
    padding: 16,
    paddingBottom: 80, // Extra padding at the bottom for FAB
  },
  reminderCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderDetails: {
    fontSize: 14,
    marginBottom: 6,
  },
  reminderCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#FF0000',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sheetCancel: {
    fontSize: 16,
  },
  sheetBody: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  timePickerButton: {
    padding: 12,
    borderRadius: 8,
  },
  timePickerText: {
    fontSize: 16,
  },
  categoryButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  categoryListContainer: {
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  categoryItemText: {
    fontSize: 16,
  },
  addReminderButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addReminderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  testButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    margin: 4,
  },
  presetButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },
}); 