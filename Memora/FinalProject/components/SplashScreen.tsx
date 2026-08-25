import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type SplashProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1000); // Show splash for 1 second
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Loading MyRemindersApp...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
