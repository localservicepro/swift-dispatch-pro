
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
    // Handle both HH:mm and HH:mm:ss formats
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting delivery time:', error);
    return '';
  }
};

export const convertTimeToFormFormat = (timeString: string | null | undefined): string => {
  if (!timeString) return '';
  
  // Convert HH:mm:ss to HH:mm format for form inputs
  const timeParts = timeString.split(':');
  if (timeParts.length >= 2) {
    return `${timeParts[0]}:${timeParts[1]}`;
  }
  
  return timeString;
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
