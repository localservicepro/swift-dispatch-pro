
export const formatDeliveryDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting delivery date:', error);
    return '';
  }
};

export const formatDeliveryTime = (timeString: string | null | undefined): string => {
  if (!timeString) return '';
  
  try {
    // Handle special time values
    const timeLower = timeString.toLowerCase();
    if (timeLower === 'urgent') return 'Urgent';
    if (timeLower === 'asap') return 'ASAP';
    if (timeLower === 'anytime' || timeLower === 'any time') return 'Any time';
    
    // Detect 1-hour slot prefix
    let isOneHourSlot = false;
    let timeStr = timeString;
    if (timeStr.startsWith('1h-')) {
      timeStr = timeStr.substring(3);
      isOneHourSlot = true;
    }
    
    // Handle both HH:mm and HH:mm:ss formats
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    
    const endTotalMin = minutes + (isOneHourSlot ? 60 : 30);
    const endHour = hours + Math.floor(endTotalMin / 60);
    const endMin = endTotalMin % 60;
    
    const formatSingleTime = (h: number, m: number): string => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };
    
    return `${formatSingleTime(hours, minutes)} - ${formatSingleTime(endHour, endMin)}`;
  } catch (error) {
    console.error('Error formatting delivery time:', error);
    return '';
  }
};

export const formatCreatedDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting created date:', error);
    return '';
  }
};

export const formatCreatedTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (error) {
    console.error('Error formatting created time:', error);
    return '';
  }
};

export const getTimeBasedGreeting = (): string => {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
};

export const getCurrentTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const extractFirstName = (fullName?: string, email?: string): string => {
  // First try to extract from full_name if available
  if (fullName && fullName.trim()) {
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }
  
  // Fallback to email extraction if no full_name
  if (email) {
    const namePart = email.split('@')[0];
    const firstName = namePart.split(/[._-]/)[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }
  
  // Final fallback
  return 'User';
};

// Perth timezone utilities
export const getPerthDate = (): Date => {
  const now = new Date();
  // Convert to Perth time (UTC+8)
  const perthTime = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Perth"}));
  return perthTime;
};

export const getPerthDateOnly = (): Date => {
  const perthDate = getPerthDate();
  // Create a new date with only the date components (no time)
  return new Date(perthDate.getFullYear(), perthDate.getMonth(), perthDate.getDate());
};

export const isDateBeforeToday = (date: Date): boolean => {
  const today = getPerthDateOnly();
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return compareDate < today;
};

export const formatDeliveredDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting delivered date:', error);
    return '';
  }
};
