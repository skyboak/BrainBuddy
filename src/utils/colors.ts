// src/utils/colors.ts
// ADHD-friendly color system with high contrast and clear distinctions

// Primary color palette
export const primaryColors = {
    primary: '#007AFF',      // Blue - primary app color
    secondary: '#34C759',    // Green - positive actions/completion
    warning: '#FF9500',      // Orange - medium urgency
    danger: '#FF3B30',       // Red - high urgency or errors
    neutral: '#8E8E93',      // Gray - inactive or disabled items
  };
  
  // Background shades (darker to lighter)
  export const backgroundColors = {
    darkest: '#1A1A2E',      // Dark blue background for focus mode
    darker: '#16213E',       // Slightly lighter blue for cards in dark mode
    dark: '#28293D',         // For section headers in dark mode
    light: '#F9FAFC',        // Light background for main app
    lighter: '#FFFFFF',      // White for cards and elements
  };
  
  // Text colors with good contrast
  export const textColors = {
    primary: '#000000',      // Black text for light backgrounds
    secondary: '#555555',    // Dark gray for secondary text
    tertiary: '#8E8E93',     // Medium gray for less important text
    inverse: '#FFFFFF',      // White text for dark backgrounds
    link: '#007AFF',         // Blue for links and actions
  };
  
  // Urgency level colors (low to high)
  export const urgencyColors = {
    level1: '#007AFF',       // Blue - lowest urgency
    level2: '#34C759',       // Green - low urgency
    level3: '#FFCC00',       // Yellow - medium urgency
    level4: '#FF9500',       // Orange - high urgency
    level5: '#FF3B30',       // Red - highest urgency
  };
  
  // Difficulty level colors (using a distinct purple palette)
  export const difficultyColors = {
    level1: '#C7C5FC',       // Very light purple - very easy
    level2: '#9F9DF3',       // Light purple - easy
    level3: '#7977E8',       // Medium purple - moderate
    level4: '#5552E0',       // Strong purple - difficult
    level5: '#3634B3',       // Deep purple - very difficult
  };
  
  // Function to get color based on urgency level (1-5)
  export function getUrgencyColor(urgency: number): string {
    switch (urgency) {
      case 1: return urgencyColors.level1;
      case 2: return urgencyColors.level2;
      case 3: return urgencyColors.level3;
      case 4: return urgencyColors.level4;
      case 5: return urgencyColors.level5;
      default: return urgencyColors.level3;
    }
  }
  
  // Function to get color based on difficulty level (1-5)
  export function getDifficultyColor(difficulty: number): string {
    switch (difficulty) {
      case 1: return difficultyColors.level1;
      case 2: return difficultyColors.level2;
      case 3: return difficultyColors.level3;
      case 4: return difficultyColors.level4;
      case 5: return difficultyColors.level5;
      default: return difficultyColors.level3;
    }
  }
  
  // Function to get color with specified opacity
  export function getColorWithOpacity(color: string, opacity: number): string {
    // For named colors like 'red', return with rgba
    if (color.indexOf('#') !== 0) {
      return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    }
    
    // For hex colors, convert to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }