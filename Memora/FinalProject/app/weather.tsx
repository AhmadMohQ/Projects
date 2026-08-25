import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';

// Default Raspberry Pi IP and port
const RASPBERRY_PI_IP = 'xx.x.x.xx';
const RASPBERRY_PI_PORT = 'xxxx'; 

interface WeatherData {
  location: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  wind_direction: string;
  condition: string;
  icon: string;
  forecast: {
    day: string;
    condition: string;
    max_temp: number;
    min_temp: number;
    icon: string;
  }[];
  last_updated: string;
}

export default function WeatherScreen() {
  const { colors, theme } = useTheme();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState(RASPBERRY_PI_IP);
  const [port, setPort] = useState(RASPBERRY_PI_PORT);
  const [showSettings, setShowSettings] = useState(false);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://${ipAddress}:${port}/weather`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Weather data received:', data);
      setWeatherData(data);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      setError('Failed to connect to weather service. Make sure the weather server is running on your Raspberry Pi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeatherData();
  };

  // Save IP address and port settings
  const saveSettings = () => {
    setShowSettings(false);
    fetchWeatherData();
  };

  useEffect(() => {
    fetchWeatherData();
    
    // Set up interval to update weather data every 10 minutes
    const interval = setInterval(() => {
      fetchWeatherData();
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [ipAddress, port]);

  // Helper function to get weather icon
  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
      return theme === 'dark' ? 'sunny' : 'sunny-outline';
    } else if (lowerCondition.includes('cloud')) {
      return 'cloudy';
    } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return 'rainy';
    } else if (lowerCondition.includes('snow')) {
      return 'snow';
    } else if (lowerCondition.includes('thunderstorm') || lowerCondition.includes('thunder')) {
      return 'thunderstorm';
    } else if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
      return 'cloud';
    } else {
      return 'partly-sunny';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header with title and theme toggle */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Weather</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <ThemeToggle />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading weather data...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline" size={64} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchWeatherData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : weatherData ? (
          <>
            {/* Current Weather Card */}
            <View style={[styles.currentWeatherCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.currentWeatherHeader}>
                <Text style={[styles.location, { color: colors.text }]}>
                  {weatherData.location}
                </Text>
                <Text style={[styles.updatedText, { color: colors.secondaryText }]}>
                  Updated: {weatherData.last_updated}
                </Text>
              </View>
              
              <View style={styles.currentWeatherContent}>
                <Ionicons 
                  name={getWeatherIcon(weatherData.condition)} 
                  size={100} 
                  color={colors.primary} 
                  style={styles.weatherIcon}
                />
                
                <View style={styles.temperatureContainer}>
                  <Text style={[styles.temperature, { color: colors.text }]}>
                    {Math.round(weatherData.temperature)}°
                  </Text>
                  <Text style={[styles.weatherCondition, { color: colors.text }]}>
                    {weatherData.condition}
                  </Text>
                </View>
              </View>
              
              <View style={styles.weatherDetailsContainer}>
                <View style={styles.weatherDetail}>
                  <Ionicons name="thermometer-outline" size={22} color={colors.primary} />
                  <Text style={[styles.weatherDetailText, { color: colors.secondaryText }]}>
                    Feels like: {Math.round(weatherData.feels_like)}°
                  </Text>
                </View>
                
                <View style={styles.weatherDetail}>
                  <Ionicons name="water-outline" size={22} color={colors.primary} />
                  <Text style={[styles.weatherDetailText, { color: colors.secondaryText }]}>
                    Humidity: {weatherData.humidity}%
                  </Text>
                </View>
                
                <View style={styles.weatherDetail}>
                  <Ionicons name="arrow-forward-outline" size={22} color={colors.primary} />
                  <Text style={[styles.weatherDetailText, { color: colors.secondaryText }]}>
                    Wind: {weatherData.wind_speed} km/h {weatherData.wind_direction}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Forecast */}
            <View style={[styles.forecastContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.forecastTitle, { color: colors.text }]}>
                5-Day Forecast
              </Text>
              
              <View style={styles.forecastList}>
                {weatherData.forecast.map((day, index) => (
                  <View key={index} style={[
                    styles.forecastItem,
                    index < weatherData.forecast.length - 1 && { 
                      borderBottomWidth: 1, 
                      borderBottomColor: colors.border 
                    }
                  ]}>
                    <Text style={[styles.forecastDay, { color: colors.text }]}>
                      {day.day}
                    </Text>
                    
                    <View style={styles.forecastIconContainer}>
                      <Ionicons 
                        name={getWeatherIcon(day.condition)} 
                        size={24} 
                        color={colors.primary} 
                      />
                      <Text style={[styles.forecastCondition, { color: colors.secondaryText }]}>
                        {day.condition}
                      </Text>
                    </View>
                    
                    <View style={styles.forecastTemp}>
                      <Text style={[styles.forecastTempHigh, { color: colors.text }]}>
                        {Math.round(day.max_temp)}°
                      </Text>
                      <Text style={[styles.forecastTempLow, { color: colors.secondaryText }]}>
                        {Math.round(day.min_temp)}°
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
      
      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Weather Settings</Text>
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Raspberry Pi IP Address</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={ipAddress}
              onChangeText={setIpAddress}
              placeholder="e.g., 192.168.1.100"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
              autoCapitalize="none"
            />
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Port</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={port}
              onChangeText={setPort}
              placeholder="5001"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowSettings(false)}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveSettings}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  settingsButton: {
    marginRight: 12,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 30,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentWeatherCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  currentWeatherHeader: {
    marginBottom: 20,
  },
  location: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  updatedText: {
    fontSize: 12,
    marginTop: 4,
  },
  currentWeatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weatherIcon: {
    marginRight: 10,
  },
  temperatureContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  temperature: {
    fontSize: 60,
    fontWeight: 'bold',
  },
  weatherCondition: {
    fontSize: 18,
  },
  weatherDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  weatherDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  weatherDetailText: {
    marginLeft: 10,
    fontSize: 16,
  },
  forecastContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  forecastList: {},
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  forecastDay: {
    fontSize: 16,
    fontWeight: '500',
    width: 100,
  },
  forecastIconContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastCondition: {
    marginLeft: 8,
    fontSize: 14,
  },
  forecastTemp: {
    flexDirection: 'row',
    width: 80,
    justifyContent: 'flex-end',
  },
  forecastTempHigh: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  forecastTempLow: {
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    padding: 24,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    margin: 5,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
  },
}); 