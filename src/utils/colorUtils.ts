/**
 * Utility functions for color manipulation
 * Converts HEX colors to various formats and generates color shades
 */

/**
 * Convert HEX to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to HEX
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Convert HEX to HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
}

/**
 * Convert HSL to HEX
 */
export function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

/**
 * Generate color shades based on Tailwind's scale
 * Returns an object with all Tailwind color shades (50-900)
 */
export function generateColorShades(hex: string): {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
} {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    // Fallback to emerald if invalid
    return {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    };
  }

  const { h, s } = hsl;

  // Tailwind-like lightness values for each shade
  const lightnessMap: Record<number, number> = {
    50: 97,
    100: 92,
    200: 85,
    300: 76,
    400: 66,
    500: 55,
    600: 45,
    700: 37,
    800: 31,
    900: 24,
  };

  return {
    50: hslToHex(h, s, lightnessMap[50]),
    100: hslToHex(h, s, lightnessMap[100]),
    200: hslToHex(h, s, lightnessMap[200]),
    300: hslToHex(h, s, lightnessMap[300]),
    400: hslToHex(h, s, lightnessMap[400]),
    500: hslToHex(h, s, lightnessMap[500]),
    600: hslToHex(h, s, lightnessMap[600]),
    700: hslToHex(h, s, lightnessMap[700]),
    800: hslToHex(h, s, lightnessMap[800]),
    900: hslToHex(h, s, lightnessMap[900]),
  };
}

/**
 * Generate CSS custom properties for a color
 * Returns a string with CSS variables
 */
export function generateColorCSSVariables(hex: string, prefix = 'primary'): string {
  const shades = generateColorShades(hex);
  
  return `
    --color-${prefix}-50: ${shades[50]};
    --color-${prefix}-100: ${shades[100]};
    --color-${prefix}-200: ${shades[200]};
    --color-${prefix}-300: ${shades[300]};
    --color-${prefix}-400: ${shades[400]};
    --color-${prefix}-500: ${shades[500]};
    --color-${prefix}-600: ${shades[600]};
    --color-${prefix}-700: ${shades[700]};
    --color-${prefix}-800: ${shades[800]};
    --color-${prefix}-900: ${shades[900]};
  `.trim();
}

/**
 * Default primary color (emerald-600)
 */
export const DEFAULT_PRIMARY_COLOR = '#059669';
