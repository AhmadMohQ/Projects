// context/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';

export type ThemeColors = {
  background: string;
  text: string;
  secondaryText: string;
  primary: string;
  border: string;
  card: string;
  buttonBackground: string;
  modalOverlay: string;
  inactiveControl: string;
  switchThumb: string;
  switchThumbActive: string;
  error: string;
  inputBg: string;
  placeholderText: string;
};

type ThemeContextType = {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
};

const defaultLightColors: ThemeColors = {
  background: '#FFFFFF',
  text: '#000000',
  secondaryText: '#888888',
  primary: '#007AFF',
  border: '#CCCCCC',
  card: '#FFFFFF',
  buttonBackground: '#EEEEEE',
  modalOverlay: 'rgba(0,0,0,0.4)',
  inactiveControl: '#D1D1D6',
  switchThumb: '#FFFFFF',
  switchThumbActive: '#FFFFFF',
  error: '#FF3B30',
  inputBg: '#F5F5F5',
  placeholderText: '#AAAAAA',
};

const defaultDarkColors: Partial<ThemeColors> = {
  background: '#111111',
  text: '#FFFFFF',
  secondaryText: '#AAAAAA',
  primary: '#0A84FF',
  border: '#444444',
  card: '#222222',
  buttonBackground: '#333333',
  modalOverlay: 'rgba(0,0,0,0.7)',
  inactiveControl: '#636366',
  switchThumb: '#FFFFFF',
  switchThumbActive: '#FFFFFF',
  error: '#FF453A',
  inputBg: '#333333',
  placeholderText: '#777777',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: defaultLightColors,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors =
    theme === 'dark'
      ? { ...defaultLightColors, ...defaultDarkColors }
      : defaultLightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
