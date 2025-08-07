
interface TimeSlot {
  value: string;
  label: string;
}

export const generateTimeSlots = (): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  
  // Generate 30-minute ranges from 7:00 AM to 7:30 PM
  for (let hour = 7; hour <= 19; hour++) {
    for (let min = 0; min < 60; min += 30) {
      // Skip the last iteration for 7:30 PM (19:30)
      if (hour === 19 && min === 30) break;
      
      const startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const endMin = min + 30;
      const endHour = endMin >= 60 ? hour + 1 : hour;
      const adjustedEndMin = endMin >= 60 ? 0 : endMin;
      const endTime = `${endHour.toString().padStart(2, '0')}:${adjustedEndMin.toString().padStart(2, '0')}`;
      
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
        label: `${startDisplay}-${endDisplay}` 
      });
    }
  }
  
  return timeSlots;
};
