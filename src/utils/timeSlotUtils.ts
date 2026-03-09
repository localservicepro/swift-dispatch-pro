
interface TimeSlot {
  value: string;
  label: string;
  group: 'priority' | '30min' | '1hour';
}

export const generateTimeSlots = (): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];

  // Priority options
  timeSlots.push({ value: 'urgent', label: 'Urgent', group: 'priority' });
  timeSlots.push({ value: 'asap', label: 'ASAP', group: 'priority' });
  timeSlots.push({ value: 'anytime', label: 'Any time', group: 'priority' });

  // 30-Minute Windows
  const thirtyMinStarts = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30'];
  for (const start of thirtyMinStarts) {
    const [h, m] = start.split(':').map(Number);
    const endMin = m + 30;
    const endH = endMin >= 60 ? h + 1 : h;
    const endM = endMin >= 60 ? endMin - 60 : endMin;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const startDisplay = new Date(`2000-01-01T${start}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endDisplay = new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    timeSlots.push({ value: start, label: `${startDisplay} - ${endDisplay}`, group: '30min' });
  }
  timeSlots.push({ value: 'upto-4pm', label: 'Up to 4:00 PM', group: '30min' });

  // 1-Hour Windows
  const oneHourStarts = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30'];
  for (const start of oneHourStarts) {
    const [h, m] = start.split(':').map(Number);
    const endMin = m + 60;
    const endH = h + Math.floor(endMin / 60);
    const endM = endMin % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const startDisplay = new Date(`2000-01-01T${start}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endDisplay = new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    timeSlots.push({ value: `1h-${start}`, label: `${startDisplay} - ${endDisplay}`, group: '1hour' });
  }
  timeSlots.push({ value: 'upto-3pm-4pm', label: 'Up to 3:00 PM - 4:00 PM', group: '1hour' });

  return timeSlots;
};
