import React, { createContext, useContext, useEffect, useState } from 'react';
import { generateColorShades, DEFAULT_PRIMARY_COLOR } from '../utils/colorUtils';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always initialize with 'light' mode as requested
  const [theme, setTheme] = useState<Theme>('light');
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PRIMARY_COLOR);

  // Update CSS variables when primaryColor changes
  useEffect(() => {
    const root = document.documentElement;
    const shades = generateColorShades(primaryColor);
    
    // Set CSS custom properties for primary color shades
    Object.entries(shades).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value);
    });
  }, [primaryColor]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    // We still save to localStorage in case we want to revert to persisting preference later,
    // but currently we ignore it on initialization.
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
