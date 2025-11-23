import { useState, useEffect, useCallback } from 'react';
import {
  loadMinuteChartData,
  saveMinuteChartData,
  groupByMinute,
  formatTimeToSecond,
  type MinuteChartDataPoint,
} from '../utils/localStorageRobot';

interface Activity {
  time: string; // Format: "HH:mm:ss"
  collectedKg: number;
  timestamp: string; // ISO string
}

const ACTIVITIES_STORAGE_KEY = 'smartcow_robot_activities';

/**
 * Custom hook for managing robot minute-based chart data
 */
export function useRobotMinuteChart() {
  // Load activities from separate storage (to preserve individual events)
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Activity[];
        // Filter old data on load
        const now = new Date();
        const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
        return parsed.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= sixtyMinutesAgo;
        });
      }
    } catch {}
    return [];
  });

  const [groupedData, setGroupedData] = useState<MinuteChartDataPoint[]>(() => {
    // Load grouped data from localStorage
    return loadMinuteChartData();
  });

  // Update grouped data whenever activities change
  useEffect(() => {
    if (activities.length > 0) {
      const grouped = groupByMinute(activities);
      setGroupedData(grouped);
      saveMinuteChartData(grouped);
    } else {
      setGroupedData([]);
      saveMinuteChartData([]);
    }
  }, [activities]);

  /**
   * Add a new collection activity
   */
  const addActivity = useCallback((collectedKg: number) => {
    const now = new Date();
    const timeStr = formatTimeToSecond(now);
    const timestamp = now.toISOString();

    const newActivity: Activity = {
      time: timeStr,
      collectedKg,
      timestamp,
    };

    setActivities(prev => {
      const updated = [newActivity, ...prev];
      // Save to localStorage
      try {
        localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  /**
   * Clean up old data (older than 60 minutes)
   */
  const cleanupOldData = useCallback(() => {
    const now = new Date();
    const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);

    setActivities(prev => {
      const filtered = prev.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= sixtyMinutesAgo;
      });
      // Save cleaned data
      try {
        localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
      return filtered;
    });
  }, []);

  // Auto-cleanup every 5 minutes
  useEffect(() => {
    const interval = setInterval(cleanupOldData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupOldData]);

  return {
    activities,
    groupedData,
    addActivity,
    cleanupOldData,
  };
}

