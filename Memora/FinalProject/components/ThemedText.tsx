import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type ThemedTextProps = TextProps & {
  children: React.ReactNode;
};

export default function ThemedText({ children, style, ...props }: ThemedTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      style={[styles.defaultText, { color: colors.text }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontSize: 16,
  },
});
