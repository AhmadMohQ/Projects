import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import SplashScreen from '../components/SplashScreen';
import CampusLocationMonitor from '../components/CampusLocationMonitor';
import LocationSimulator from '../components/LocationSimulator';

export default function AppLayout() {
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Simulate loading time with a splash screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <ThemeProvider>
      <TabLayout />
    </ThemeProvider>
  );
}

function TabLayout() {
  const { colors, theme } = useTheme();

  return (
    <>
      <CampusLocationMonitor />
      
      <LocationSimulator />
      
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.secondaryText,
          tabBarStyle: { 
            backgroundColor: theme === 'dark' ? '#121212' : '#fff',
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerShown: false, // Hide the header since we have custom headers in each screen
        }}
      >
        <Tabs.Screen
          name="reminders"
          options={{
            title: 'Reminders',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="security"
          options={{
            title: 'Security',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="videocam" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="weather"
          options={{
            title: 'Weather',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cloud" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="maps"
          options={{
            title: 'Maps',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null, 
          }}
        />
      </Tabs>
    </>
  );
} 