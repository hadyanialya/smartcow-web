/**
 * LocalStorage utilities for Robot Waste Collection Chart Data
 */

const ROBOT_MINUTE_CHART_KEY = 'ROBOT_MINUTE_CHART';

export interface MinuteChartDataPoint {
  time: string; // Format: "HH:mm"
  collectedKg: number;
  timestamp: string; // ISO string for sorting and cleanup
}

/**
 * Load minute chart data from localStorage
 */
export function loadMinuteChartData(): MinuteChartDataPoint[] {
  try {
    const saved = localStorage.getItem(ROBOT_MINUTE_CHART_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as MinuteChartDataPoint[];
      // Filter out data older than 60 minutes
      return cleanupOldData(parsed);
    }
  } catch (error) {
    console.error('Error loading minute chart data:', error);
  }
  return [];
}

/**
 * Save minute chart data to localStorage
 */
export function saveMinuteChartData(data: MinuteChartDataPoint[]): void {
  try {
    // Clean up old data before saving
    const cleaned = cleanupOldData(data);
    localStorage.setItem(ROBOT_MINUTE_CHART_KEY, JSON.stringify(cleaned));
  } catch (error) {
    console.error('Error saving minute chart data:', error);
  }
}

/**
 * Remove data points older than 60 minutes
 */
function cleanupOldData(data: MinuteChartDataPoint[]): MinuteChartDataPoint[] {
  const now = new Date();
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  return data.filter(point => {
    const pointDate = new Date(point.timestamp);
    return pointDate >= sixtyMinutesAgo;
  });
}

/**
 * Group activities by minute and sum collectedKg
 */
export function groupByMinute(activities: Array<{ time: string; collectedKg: number; timestamp: string }>): MinuteChartDataPoint[] {
  const grouped = new Map<string, { collectedKg: number; timestamp: string }>();
  
  activities.forEach(activity => {
    // Extract minute from time (format: "HH:mm:ss" -> "HH:mm")
    const minuteKey = activity.time.substring(0, 5);
    
    if (grouped.has(minuteKey)) {
      const existing = grouped.get(minuteKey)!;
      existing.collectedKg += activity.collectedKg;
      // Keep the earliest timestamp for this minute
      if (new Date(activity.timestamp) < new Date(existing.timestamp)) {
        existing.timestamp = activity.timestamp;
      }
    } else {
      grouped.set(minuteKey, {
        collectedKg: activity.collectedKg,
        timestamp: activity.timestamp,
      });
    }
  });
  
  // Convert to array and sort by timestamp
  return Array.from(grouped.entries())
    .map(([time, data]) => ({
      time,
      collectedKg: data.collectedKg,
      timestamp: data.timestamp,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Format time to HH:mm from Date object
 */
export function formatTimeToMinute(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format time to HH:mm:ss from Date object
 */
export function formatTimeToSecond(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

