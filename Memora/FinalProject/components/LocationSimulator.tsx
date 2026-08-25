import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { CAMPUS_LOCATIONS } from '../services/campusLocations';
import { useNavigation, usePathname } from 'expo-router';

// Define a global mock location variable that can be accessed from the location service
declare global {
  var _mockLocation: { latitude: number; longitude: number } | null;
}

// Set up the initial global variable if it doesn't exist
if (global._mockLocation === undefined) {
  global._mockLocation = null;
}

// Component for simulating locations
export default function LocationSimulator() {
  const [visible, setVisible] = useState(false);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const pathname = usePathname();
  
  // Only show the simulator on the maps tab
  const isMapTab = pathname === '/maps';
  
  // Function to simulate being at a campus location
  const simulateLocation = (locationId: string) => {
    const location = CAMPUS_LOCATIONS.find(loc => loc.id === locationId);
    if (!location) return;
    
    // Set the global mock location
    global._mockLocation = {
      latitude: location.latitude,
      longitude: location.longitude
    };
    
    setActiveLocation(locationId);
    Alert.alert('Location Simulated', `You are now at ${location.name}`);
  };
  
  // Function to reset location to device's actual location
  const resetLocation = () => {
    global._mockLocation = null;
    setActiveLocation(null);
    Alert.alert('Location Reset', 'Using real device location now');
  };
  
  // When component mounts, check for existing mock location
  useEffect(() => {
    if (global._mockLocation) {
      // Find which location it matches
      const location = CAMPUS_LOCATIONS.find(
        loc => 
          Math.abs(loc.latitude - global._mockLocation!.latitude) < 0.0001 && 
          Math.abs(loc.longitude - global._mockLocation!.longitude) < 0.0001
      );
      
      if (location) {
        setActiveLocation(location.id);
      }
    }
  }, []);
  
  // If not on maps tab, don't render the button
  if (!isMapTab) {
    return null;
  }
  
  return (
    <>
      {/* Button to open the simulator */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.floatingButtonText}>🧪</Text>
      </TouchableOpacity>
      
      {/* Location simulator modal */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Location Simulator</Text>
            <Text style={styles.modalDescription}>
              Simulate being at campus locations for testing
            </Text>
            
            {/* Location buttons */}
            {CAMPUS_LOCATIONS.map(location => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationButton,
                  activeLocation === location.id && styles.activeLocationButton
                ]}
                onPress={() => simulateLocation(location.id)}
              >
                <Text style={[
                  styles.locationButtonText,
                  activeLocation === location.id && styles.activeLocationButtonText
                ]}>
                  {location.name} ({location.purpose})
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* Reset button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetLocation}
            >
              <Text style={styles.resetButtonText}>Use Real Location</Text>
            </TouchableOpacity>
            
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 120, // Position higher to avoid overlapping with add button
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  floatingButtonText: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  locationButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  locationButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  activeLocationButton: {
    backgroundColor: '#007AFF',
  },
  activeLocationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resetButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    marginTop: 8,
    marginBottom: 16,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
}); 