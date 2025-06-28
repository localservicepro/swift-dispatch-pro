
import { useState, useEffect } from "react";
import { getTimeBasedGreeting, getCurrentTime, extractFirstName } from "@/utils/dateTimeUtils";

interface PersonalizedGreetingProps {
  profile?: {
    full_name?: string;
    email?: string;
  };
}

export function PersonalizedGreeting({ profile }: PersonalizedGreetingProps) {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [greeting, setGreeting] = useState(getTimeBasedGreeting());

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(getCurrentTime());
      setGreeting(getTimeBasedGreeting());
    };

    // Update immediately
    updateTime();

    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const firstName = extractFirstName(profile?.full_name, profile?.email);

  return (
    <div className="flex items-center gap-2 text-xl font-semibold text-slate-800">
      <span>{greeting}, {firstName}</span>
      <span className="text-slate-400">•</span>
      <span className="text-slate-600 font-medium">{currentTime}</span>
    </div>
  );
}
