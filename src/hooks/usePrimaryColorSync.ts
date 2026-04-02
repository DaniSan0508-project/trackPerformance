import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Hook para sincronizar a cor primária do AuthContext com o ThemeContext
 * Deve ser usado no nível mais alto da aplicação (ex: App.tsx)
 */
export const usePrimaryColorSync = () => {
  const { primaryColor } = useAuth();
  const { setPrimaryColor } = useTheme();

  useEffect(() => {
    if (primaryColor) {
      setPrimaryColor(primaryColor);
    }
  }, [primaryColor, setPrimaryColor]);
};
