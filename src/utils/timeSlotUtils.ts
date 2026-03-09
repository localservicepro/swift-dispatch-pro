
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

  // 30-Minute Windows (7:00 AM to 3:30-4:00 PM)
  const thirtyMinStarts = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'
  ];
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

  // 1-Hour Windows (7:00 AM to 3:00-4:00 PM)
  const oneHourStarts = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00'
  ];
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

  return timeSlots;
};
