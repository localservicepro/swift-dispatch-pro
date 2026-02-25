
/**
 * Utility functions for handling time format conversions between database and UI components
 */

/**
 * Converts time from database format (HH:MM:SS) to form format (HH:MM)
 * @param timeString - Time string in HH:MM:SS format
 * @returns Time string in HH:MM format, or empty string if invalid
 */
const SPECIAL_TIME_VALUES = ['urgent', 'asap', 'anytime'];

export const convertTimeToFormFormat = (timeString: string | null | undefined): string => {
  if (!timeString) return '';
  
  // Pass through special priority values unchanged
  if (SPECIAL_TIME_VALUES.includes(timeString.toLowerCase())) {
    return timeString.toLowerCase();
  }
  
  try {
    // Handle both HH:MM:SS and HH:MM formats
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      return `${timeParts[0]}:${timeParts[1]}`;
    }
    return timeString;
  } catch (error) {
    console.error('Error converting time to form format:', error);
    return '';
  }
};

/**
 * Converts time from form format (HH:MM) to database format (HH:MM:SS)
 * @param timeString - Time string in HH:MM format
 * @returns Time string in HH:MM:SS format, or empty string if invalid
 */
export const convertTimeToDbFormat = (timeString: string | null | undefined): string => {
  if (!timeString) return '';
  
  // Pass through special priority values unchanged
  if (SPECIAL_TIME_VALUES.includes(timeString.toLowerCase())) {
    return timeString.toLowerCase();
  }
  
  try {
    // If already in HH:MM:SS format, return as is
    if (timeString.includes(':') && timeString.split(':').length === 3) {
      return timeString;
    }
    
    // Convert HH:MM to HH:MM:SS
    const timeParts = timeString.split(':');
    if (timeParts.length === 2) {
      return `${timeParts[0]}:${timeParts[1]}:00`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Error converting time to database format:', error);
    return '';
  }
};

/**
 * Validates if a time string is in valid HH:MM format
 * @param timeString - Time string to validate
 * @returns boolean indicating if the time format is valid
 */
export const isValidTimeFormat = (timeString: string): boolean => {
  if (!timeString) return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};
