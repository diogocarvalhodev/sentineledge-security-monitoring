/**
 * Sentinel Brand Theme
 * Professional dark mode security monitoring system
 */

export const sentineledgeTheme = {
  // Brand Identity
  name: 'Sentinel',
  tagline: 'Local Security Monitoring System',
  version: '2.0.0',
  
  // Primary Colors
  colors: {
    // Dark Mode Base
    background: {
      primary: '#0B1117',      // Deep dark blue-black
      secondary: '#151C24',    // Slightly lighter
      tertiary: '#1E2935',     // Card backgrounds
      hover: '#2A3441',        // Hover states
    },
    
    // Brand Colors
    brand: {
      primary: '#00D1FF',      // Bright cyan (main brand color)
      secondary: '#0099CC',    // Darker cyan
      tertiary: '#00E5FF',     // Light cyan
      gradient: 'linear-gradient(135deg, #00D1FF 0%, #0099CC 100%)',
    },
    
    // Status Colors
    status: {
      success: '#00FF88',      // Green
      warning: '#FFB800',      // Amber
      error: '#FF3366',        // Red
      info: '#00D1FF',         // Cyan (brand)
    },
    
    // Severity Colors (Alert System)
    severity: {
      low: '#4CAF50',          // Green
      medium: '#FFB800',       // Amber
      high: '#FF6B35',         // Orange
      critical: '#FF3366',     // Red
    },
    
    // Text Colors
    text: {
      primary: '#FFFFFF',
      secondary: '#9BA3AF',
      tertiary: '#6B7280',
      disabled: '#4B5563',
      inverse: '#0B1117',
    },
    
    // Border & Dividers
    border: {
      light: '#2A3441',
      medium: '#374151',
      heavy: '#4B5563',
    },
    
    // Camera Status
    camera: {
      online: '#00FF88',
      offline: '#6B7280',
      error: '#FF3366',
      maintenance: '#FFB800',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"Fira Code", "Cascadia Code", Consolas, Monaco, monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(0, 209, 255, 0.3)', // Brand glow
  },
  
  // Logo/Icon
  logo: {
    icon: '🛡️', // Shield emoji (replace with SVG)
    text: 'SENTINEL',
  },
  
  // Layout
  layout: {
    sidebarWidth: '16rem',      // 256px
    sidebarCollapsedWidth: '4rem', // 64px
    topbarHeight: '4rem',        // 64px
    maxContentWidth: '1920px',
  },
  
  // Animations
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
  
  // Breakpoints (responsive)
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Tailwind CSS custom classes (to add to tailwind.config.js)
export const tailwindThemeExtension = {
  colors: {
    sentineledge: {
      bg: {
        primary: '#0B1117',
        secondary: '#151C24',
        tertiary: '#1E2935',
        hover: '#2A3441',
      },
      brand: {
        DEFAULT: '#00D1FF',
        dark: '#0099CC',
        light: '#00E5FF',
      },
      success: '#00FF88',
      warning: '#FFB800',
      error: '#FF3366',
      info: '#00D1FF',
    },
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['"Fira Code"', 'Consolas', 'monospace'],
  },
};

export default sentineledgeTheme;
