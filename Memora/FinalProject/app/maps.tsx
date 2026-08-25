import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Switch,
  FlatList,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import LocationAlert from '../components/LocationAlert';
import { 
  initializeLocationService, 
  startLocationTracking, 
  getCurrentLocation,
  setHomeLocation,
  geocodeAddress,
  reverseGeocodeLocation,
  getFormattedAddress,
  DEFAULT_GEOFENCE_RADIUS
} from '../services/locationService';
import { useLocationReminders, useSavedLocations } from '../services/locationHooks';
import { 
  addReminderToFirestore, 
  addSavedLocationToFirestore,
  deleteSavedLocation,
  updateReminderActiveStatus
} from '../services/firebaseFunctions';
import { 
  CAMPUS_LOCATIONS, 
  LOCATION_THRESHOLD,
  startCampusLocationChecking,
  stopCampusLocationChecking
} from '../services/campusLocations';
import { useReminders } from '../services/firebaseListeners';

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switchLabel: {
    fontSize: 16,
  },
  addButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderAddress: {
    fontSize: 12,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationCoords: {
    fontSize: 12,
    marginTop: 2,
  },
  locationPurpose: {
    fontSize: 14,
    fontWeight: '600',
  },
  monitoringButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  monitoringButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    margin: 10,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    maxHeight: 200,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    width: '100%',
    marginBottom: 12,
  },
  monitoringFloatingButton: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  monitoringFloatingButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  locationsList: {
    flex: 1,
  },
});

export default function MapsScreen() {
  const { colors, theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 45.4215, // Ottawa default
    longitude: -75.6972,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'reminder' | 'location'>('reminder');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Selected location for creating reminder or saving
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  
  // New reminder details
  const [newReminder, setNewReminder] = useState({
    title: '',
    radius: DEFAULT_GEOFENCE_RADIUS.toString(),
    triggerOnEnter: true,
    triggerOnExit: false,
  });
  
  // New saved location details
  const [newSavedLocation, setNewSavedLocation] = useState({
    name: '',
    radius: DEFAULT_GEOFENCE_RADIUS.toString(),
  });
  
  // Get location reminders and saved locations from firestore
  const { reminders: locationReminders, loading: remindersLoading } = useLocationReminders();
  const { locations: savedLocations, loading: locationsLoading } = useSavedLocations();
  
  // Add this to the MapScreen component
  const [isCampusMonitoringActive, setIsCampusMonitoringActive] = useState(false);
  const { reminders: campusReminders } = useReminders();
  
  // Initialize location services
  useEffect(() => {
    const setupLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === 'granted') {
        setLoading(true);
        try {
          // Initialize location service
          await initializeLocationService();
          
          // Get current location
          const location = await getCurrentLocation();
          if (location) {
            setCurrentLocation(location);
            setRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
            
            // Set as home location
            await setHomeLocation(location);
          }
        } catch (error) {
          console.error('Error setting up location:', error);
          Alert.alert('Error', 'Failed to get your location.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    setupLocation();
  }, []);
  
  // Request location permission
  const requestLocationPermission = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === 'granted') {
        // Get current location
        const location = await getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
          
          // Start location tracking
          await startLocationTracking();
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Could not request location permission.');
    } finally {
      setLoading(false);
    }
  };
  
  // Center map on current location
  const centerOnCurrentLocation = async () => {
    if (!currentLocation) {
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } else {
      mapRef.current?.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };
  
  // Search for a location
  const searchLocation = async () => {
    if (!searchText.trim()) return;
    
    setLoading(true);
    try {
      const result = await geocodeAddress(searchText);
      if (result) {
        // Animate map to search result
        mapRef.current?.animateToRegion({
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        
        // Get address for the location
        const address = await reverseGeocodeLocation(result.latitude, result.longitude);
        
        // Set selected location
        setSelectedLocation({
          latitude: result.latitude,
          longitude: result.longitude,
          address: address ? getFormattedAddress(address) : undefined,
        });
      } else {
        Alert.alert('Not Found', 'Could not find the location you searched for.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search for location.');
    } finally {
      setLoading(false);
    }
  };
  
  // Open the add reminder modal
  const openAddReminderModal = (latitude: number, longitude: number) => {
    setModalType('reminder');
    setSelectedLocation({ latitude, longitude });
    
    // Get address for the selected location
    reverseGeocodeLocation(latitude, longitude).then(address => {
      if (address) {
        setSelectedLocation(prev => ({
          ...prev!,
          address: getFormattedAddress(address),
        }));
      }
    });
    
    setModalVisible(true);
  };
  
  // Open the save location modal
  const openSaveLocationModal = (latitude: number, longitude: number) => {
    setModalType('location');
    setSelectedLocation({ latitude, longitude });
    
    // Get address for the selected location
    reverseGeocodeLocation(latitude, longitude).then(address => {
      if (address) {
        setSelectedLocation(prev => ({
          ...prev!,
          address: getFormattedAddress(address),
        }));
        
        // Set default name based on address
        if (address.name) {
          setNewSavedLocation(prev => ({
            ...prev,
            name: address.name || '',
          }));
        }
      }
    });
    
    setModalVisible(true);
  };
  
  // Handle map long press to add reminder
  const handleMapLongPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    
    // Show action menu
    Alert.alert(
      'Add at this location',
      'What would you like to do?',
      [
        {
          text: 'Add Reminder',
          onPress: () => openAddReminderModal(coordinate.latitude, coordinate.longitude),
        },
        {
          text: 'Save Location',
          onPress: () => openSaveLocationModal(coordinate.latitude, coordinate.longitude),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };
  
  // Handle adding a reminder
  const addReminder = async () => {
    if (!selectedLocation) return;
    if (!newReminder.title.trim()) {
      Alert.alert('Error', 'Please enter a reminder title.');
      return;
    }
    
    const radius = parseInt(newReminder.radius);
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Error', 'Please enter a valid radius.');
      return;
    }
    
    setLoading(true);
    try {
      await addReminderToFirestore({
        title: newReminder.title,
        category: 'Location Reminder',
        time: new Date(), // Required field but not used for location reminders
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius,
        triggerOnEnter: newReminder.triggerOnEnter,
        triggerOnExit: newReminder.triggerOnExit,
        address: selectedLocation.address,
      });
      
      // Reset form
      setNewReminder({
        title: '',
        radius: DEFAULT_GEOFENCE_RADIUS.toString(),
        triggerOnEnter: true,
        triggerOnExit: false,
      });
      
      setModalVisible(false);
      Alert.alert('Success', 'Location reminder added successfully!');
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle saving a location
  const saveLocation = async () => {
    if (!selectedLocation) return;
    if (!newSavedLocation.name.trim()) {
      Alert.alert('Error', 'Please enter a name for this location.');
      return;
    }
    
    const radius = parseInt(newSavedLocation.radius);
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Error', 'Please enter a valid radius.');
      return;
    }
    
    setLoading(true);
    try {
      await addSavedLocationToFirestore({
        name: newSavedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius,
        address: selectedLocation.address,
      });
      
      // Reset form
      setNewSavedLocation({
        name: '',
        radius: DEFAULT_GEOFENCE_RADIUS.toString(),
      });
      
      setModalVisible(false);
      Alert.alert('Success', 'Location saved successfully!');
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Failed to save location.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to toggle campus location monitoring
  const toggleCampusMonitoring = async () => {
    if (isCampusMonitoringActive) {
      stopCampusLocationChecking();
      setIsCampusMonitoringActive(false);
    } else {
      const success = await startCampusLocationChecking(campusReminders);
      setIsCampusMonitoringActive(success);
    }
  };
  
  // Render loading screen
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }
  
  // Render permission request screen
  if (locationPermissionStatus !== 'granted') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.permissionContainer}>
          <Ionicons name="location-outline" size={64} color={colors.primary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Location Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.secondaryText }]}>
            This feature needs access to your location to track and notify you of location-based reminders.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestLocationPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Location Alert Component */}
      <LocationAlert />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Location Reminders</Text>
        <View style={styles.headerRight}>
          <ThemeToggle />
        </View>
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: theme === 'dark' ? '#333' : '#f0f0f0',
            color: colors.text,
          }]}
          placeholder="Search for a location..."
          placeholderTextColor={colors.secondaryText}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={searchLocation}
        />
        <TouchableOpacity 
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={searchLocation}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onLongPress={handleMapLongPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* Render campus locations */}
          {CAMPUS_LOCATIONS.map(location => (
            <React.Fragment key={`campus-${location.id}`}>
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title={location.name}
                description={location.purpose}
                pinColor={
                  location.id === 'library' ? '#9C27B0' : // Purple for library
                  location.id === 'cafeteria' ? '#FF9800' : // Orange for cafeteria
                  '#8BC34A' // Light green for gym
                }
              />
              <Circle
                center={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                radius={LOCATION_THRESHOLD}
                strokeWidth={2}
                strokeColor="rgba(255, 152, 0, 0.5)"
                fillColor="rgba(255, 152, 0, 0.2)"
              />
            </React.Fragment>
          ))}
          
          {/* Render location reminders */}
          {locationReminders.map(reminder => (
            <React.Fragment key={reminder.id}>
              <Marker
                coordinate={{
                  latitude: reminder.latitude,
                  longitude: reminder.longitude,
                }}
                title={reminder.title}
                pinColor={reminder.isActive ? '#2196F3' : '#9E9E9E'}
              />
              <Circle
                center={{
                  latitude: reminder.latitude,
                  longitude: reminder.longitude,
                }}
                radius={reminder.radius}
                strokeWidth={2}
                strokeColor={reminder.isActive ? 'rgba(33, 150, 243, 0.5)' : 'rgba(158, 158, 158, 0.5)'}
                fillColor={reminder.isActive ? 'rgba(33, 150, 243, 0.2)' : 'rgba(158, 158, 158, 0.2)'}
              />
            </React.Fragment>
          ))}
          
          {/* Render saved locations */}
          {savedLocations.map(location => (
            <React.Fragment key={location.id}>
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title={location.name}
                pinColor="#4CAF50"
              />
              <Circle
                center={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                radius={location.radius || DEFAULT_GEOFENCE_RADIUS}
                strokeWidth={2}
                strokeColor="rgba(76, 175, 80, 0.5)"
                fillColor="rgba(76, 175, 80, 0.2)"
              />
            </React.Fragment>
          ))}
          
          {/* Show selected location if any */}
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              pinColor="#F44336"
            />
          )}
        </MapView>
        
        {/* Center on user button */}
        <TouchableOpacity
          style={[styles.centerButton, { backgroundColor: colors.card }]}
          onPress={centerOnCurrentLocation}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color={colors.primary} 
          />
        </TouchableOpacity>

        {/* Floating monitoring button */}
        <TouchableOpacity
          style={[
            styles.monitoringFloatingButton,
            {
              backgroundColor: isCampusMonitoringActive ? colors.error : colors.primary,
            },
          ]}
          onPress={toggleCampusMonitoring}
        >
          <Ionicons 
            name={isCampusMonitoringActive ? "stop-circle-outline" : "navigate-outline"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.monitoringFloatingButtonText}>
            {isCampusMonitoringActive ? 'Stop Monitoring' : 'Start Monitoring'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Add Reminder/Location Modal */}
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
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {modalType === 'reminder' ? 'Add Location Reminder' : 'Save Location'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.sheetCancel, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            {/* Modal Body */}
            <ScrollView contentContainerStyle={styles.sheetBody}>
              {/* Show address if available */}
              {selectedLocation?.address && (
                <View style={styles.addressContainer}>
                  <Ionicons name="location" size={20} color={colors.secondaryText} />
                  <Text style={[styles.addressText, { color: colors.secondaryText }]}>
                    {selectedLocation.address}
                  </Text>
                </View>
              )}
              
              {/* Reminder Form */}
              {modalType === 'reminder' && (
                <>
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
                    onChangeText={(text) => setNewReminder(prev => ({ ...prev, title: text }))}
                  />
                  
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.border,
                        backgroundColor: theme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                        color: colors.text,
                        marginTop: 8,
                      },
                    ]}
                    placeholder="Radius (meters)"
                    placeholderTextColor={colors.secondaryText}
                    value={newReminder.radius}
                    onChangeText={(text) => setNewReminder(prev => ({ ...prev, radius: text }))}
                    keyboardType="numeric"
                  />
                  
                  <View style={styles.switchContainer}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>
                      Alert when entering area
                    </Text>
                    <Switch
                      value={newReminder.triggerOnEnter}
                      onValueChange={(value) => setNewReminder(prev => ({ ...prev, triggerOnEnter: value }))}
                      thumbColor={newReminder.triggerOnEnter ? colors.primary : colors.secondaryText}
                      trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    />
                  </View>
                  
                  <View style={styles.switchContainer}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>
                      Alert when exiting area
                    </Text>
                    <Switch
                      value={newReminder.triggerOnExit}
                      onValueChange={(value) => setNewReminder(prev => ({ ...prev, triggerOnExit: value }))}
                      thumbColor={newReminder.triggerOnExit ? colors.primary : colors.secondaryText}
                      trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={addReminder}
                  >
                    <Text style={styles.addButtonText}>Add Reminder</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Save Location Form */}
              {modalType === 'location' && (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.border,
                        backgroundColor: theme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                        color: colors.text,
                      },
                    ]}
                    placeholder="Location Name"
                    placeholderTextColor={colors.secondaryText}
                    value={newSavedLocation.name}
                    onChangeText={(text) => setNewSavedLocation(prev => ({ ...prev, name: text }))}
                  />
                  
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.border,
                        backgroundColor: theme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                        color: colors.text,
                        marginTop: 8,
                      },
                    ]}
                    placeholder="Radius (meters)"
                    placeholderTextColor={colors.secondaryText}
                    value={newSavedLocation.radius}
                    onChangeText={(text) => setNewSavedLocation(prev => ({ ...prev, radius: text }))}
                    keyboardType="numeric"
                  />
                  
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={saveLocation}
                  >
                    <Text style={styles.addButtonText}>Save Location</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Campus Locations Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Campus Locations</Text>
        <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
          You'll receive reminders when you're within {LOCATION_THRESHOLD}m of these locations
        </Text>
        
        <View style={styles.divider} />
        
        <ScrollView style={styles.locationsList}>
          {CAMPUS_LOCATIONS.map((location) => (
            <View key={location.id} style={[styles.locationItem, { borderBottomColor: colors.border }]}>
              <Ionicons 
                name={
                  location.id === 'library' ? 'book-outline' : 
                  location.id === 'cafeteria' ? 'restaurant-outline' : 
                  'fitness-outline'
                } 
                size={22} 
                color={colors.primary} 
              />
              <View style={styles.locationInfo}>
                <Text style={[styles.locationName, { color: colors.text }]}>
                  {location.name}
                </Text>
              </View>
              <Text style={[styles.locationPurpose, { color: colors.primary }]}>
                {location.purpose}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
} 