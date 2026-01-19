
interface TimeSlot {
  value: string;
  label: string;
}

export const generateTimeSlots = (): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  
  // Add special options at the top
  timeSlots.push({ value: 'urgent', label: 'Urgent' });
  timeSlots.push({ value: 'asap', label: 'ASAP' });
  timeSlots.push({ value: 'anytime', label: 'Any time' });
  
  // Generate 1-hour intervals starting every 30 minutes
  // From 7:00 AM to 4:00 PM (last slot: 4:00 PM - 5:00 PM)
  for (let hour = 7; hour <= 16; hour++) {
    for (let min = 0; min < 60; min += 30) {
      // Stop after 4:00 PM slot
      if (hour === 16 && min > 0) break;
      
      const startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      // Calculate end time (1 hour later)
      const endHour = hour + 1;
      const endTime = `${endHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      const startDisplay = new Date(`2000-01-01T${startTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const endDisplay = new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      timeSlots.push({ 
        value: startTime, 
        label: `${startDisplay} - ${endDisplay}` 
      });
    }
  }
  
  return timeSlots;
};
