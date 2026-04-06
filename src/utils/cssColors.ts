/**
 * Utility functions to generate Tailwind-like class names using CSS variables
 * These can be used to replace hardcoded color classes like 'bg-emerald-600'
 * 
 * Usage example:
 *   Instead of: className="bg-emerald-600 text-emerald-500"
 *   Use:        className={`${css.bg('600')} ${css.text('500')}`}
 */

/**
 * Generate background color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'bg-[var(--color-primary-600)]'
 */
export const bg = (shade: string): string => {
  return `bg-[var(--color-primary-${shade})]`;
};

/**
 * Generate text color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'text-[var(--color-primary-600)]'
 */
export const text = (shade: string): string => {
  return `text-[var(--color-primary-${shade})]`;
};

/**
 * Generate border color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'border-[var(--color-primary-600)]'
 */
export const border = (shade: string): string => {
  return `border-[var(--color-primary-${shade})]`;
};

/**
 * Generate ring/focus color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'focus:ring-[var(--color-primary-500)]'
 */
export const ring = (shade: string): string => {
  return `focus:ring-[var(--color-primary-${shade})]`;
};

/**
 * Generate hover background color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'hover:bg-[var(--color-primary-700)]'
 */
export const hoverBg = (shade: string): string => {
  return `hover:bg-[var(--color-primary-${shade})]`;
};

/**
 * Generate hover text color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'hover:text-[var(--color-primary-600)]'
 */
export const hoverText = (shade: string): string => {
  return `hover:text-[var(--color-primary-${shade})]`;
};

/**
 * Generate dark mode background color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'dark:bg-[var(--color-primary-900/20)]'
 */
export const darkBg = (shade: string, opacity: string = '1'): string => {
  return `dark:bg-[var(--color-primary-${shade})]`;
};

/**
 * Generate dark mode text color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'dark:text-[var(--color-primary-400)]'
 */
export const darkText = (shade: string): string => {
  return `dark:text-[var(--color-primary-${shade})]`;
};

/**
 * Generate dark mode border color class using CSS variable
 * @param shade - Tailwind shade (50, 100, 200, ... 900)
 * @returns CSS class string like 'dark:border-[var(--color-primary-800)]'
 */
export const darkBorder = (shade: string): string => {
  return `dark:border-[var(--color-primary-${shade})]`;
};

// Export as a namespace object for convenience
export const css = {
  bg,
  text,
  border,
  ring,
  hoverBg,
  hoverText,
  darkBg,
  darkText,
  darkBorder,
};

/**
 * Common color combinations used throughout the app
 * These mimic the most common Tailwind emerald patterns
 */
export const common = {
  // Primary button styles (emerald-600 -> emerald-700)
  primaryButton: {
    base: bg('600'),
    hover: hoverBg('700'),
    text: 'text-white',
  },
  
  // Badge styles (emerald-50/100 with emerald-700/600 text)
  badgeLight: {
    bg: bg('50'),
    text: text('700'),
    border: border('200'),
    dark: {
      bg: darkBg('900', '0.2'),
      text: darkText('400'),
      border: darkBorder('800'),
    },
  },
  
  // Icon colors
  icon: {
    default: text('600'),
    dark: darkText('400'),
  },
  
  // Focus ring
  focusRing: {
    base: ring('500'),
    border: 'focus:border-[var(--color-primary-500)]',
  },
};
