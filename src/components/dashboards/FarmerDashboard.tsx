import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Trash2, Clock, Activity, RefreshCw, Download
} from 'lucide-react';
import { useRobotMinuteChart } from '../../hooks/useRobotMinuteChart';
import type { MinuteChartDataPoint } from '../../utils/localStorageRobot';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { XAxis, YAxis, CartesianGrid, Area, AreaChart, Tooltip } from 'recharts';

const WASTE_DATA_KEY = 'smartcow_farmer_waste_data';
const COLLECTION_LOG_KEY = 'smartcow_farmer_collection_log';

interface WasteCollectionLog {
  id: string;
  time: string;
  wasteCollected: number; // in kg
  timestamp: string; // ISO string for sorting
}

interface WasteData {
  collectedToday: number; // kg
  tankFillPercentage: number; // 0-100
  lastUpdate: string; // ISO timestamp
  dailyTotals: { [date: string]: number }; // date string -> kg
}

const TANK_CAPACITY = 100; // kg (when tank is 100% full)

// Generate random waste collection amount (0.1 to 3.0 kg)
const getRandomCollectionAmount = (): number => {
  // Random between 0.1 and 3.0 kg, rounded to 2 decimal places
  return Math.round((Math.random() * 2.9 + 0.1) * 100) / 100;
};

export default function FarmerDashboard() {
  const { groupedData, addActivity } = useRobotMinuteChart();
  
  // Stable gradient IDs for the chart
  const gradientIdRef = React.useRef(`waste-chart-gradient-${Math.random().toString(36).substr(2, 9)}`);
  const areaGradientIdRef = React.useRef(`waste-chart-area-${Math.random().toString(36).substr(2, 9)}`);

  const [wasteData, setWasteData] = useState<WasteData>(() => {
    try {
      const saved = localStorage.getItem(WASTE_DATA_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      collectedToday: 0,
      tankFillPercentage: 0,
      lastUpdate: new Date().toISOString(),
      dailyTotals: {},
    };
  });

  const [collectionLog, setCollectionLog] = useState<WasteCollectionLog[]>(() => {
    try {
      const saved = localStorage.getItem(COLLECTION_LOG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  // Load data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(WASTE_DATA_KEY);
    const savedLog = localStorage.getItem(COLLECTION_LOG_KEY);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setWasteData(parsed);
      } catch {}
    }
    
    if (savedLog) {
      try {
        const parsed = JSON.parse(savedLog);
        setCollectionLog(parsed);
      } catch {}
    }
  }, []);

  // Reset daily total at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastUpdateDate = wasteData.lastUpdate.split('T')[0];
      
      if (today !== lastUpdateDate && wasteData.collectedToday > 0) {
        // New day - reset today's collection but keep tank fill
        setWasteData(prev => {
          const updated = {
            ...prev,
            collectedToday: 0,
            lastUpdate: now.toISOString(),
          };
          localStorage.setItem(WASTE_DATA_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    };

    const interval = setInterval(checkMidnight, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [wasteData.lastUpdate, wasteData.collectedToday]);

  const simulateCollection = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });

    // Generate random collection amount (0.1 to 3.0 kg)
    const collectionAmount = getRandomCollectionAmount();

    // Create new log entry
    const newLogEntry: WasteCollectionLog = {
      id: Date.now().toString(),
      time: timeStr,
      wasteCollected: collectionAmount,
      timestamp: now.toISOString(),
    };

    // Update waste data
    setWasteData(prev => {
      const newCollectedToday = prev.collectedToday + collectionAmount;
      // Tank fill increases proportionally to collection amount (1% per 1kg)
      const fillIncrease = (collectionAmount / TANK_CAPACITY) * 100;
      const newTankFill = Math.min(100, prev.tankFillPercentage + fillIncrease);
      const newDailyTotals = {
        ...prev.dailyTotals,
        [today]: (prev.dailyTotals[today] || 0) + collectionAmount,
      };

      const updated = {
        collectedToday: newCollectedToday,
        tankFillPercentage: newTankFill,
        lastUpdate: now.toISOString(),
        dailyTotals: newDailyTotals,
      };

      localStorage.setItem(WASTE_DATA_KEY, JSON.stringify(updated));
      return updated;
    });

    // Add to log
    setCollectionLog(prev => {
      const updated = [newLogEntry, ...prev];
      localStorage.setItem(COLLECTION_LOG_KEY, JSON.stringify(updated));
      return updated;
    });

    // Add to minute chart
    addActivity(collectionAmount);
  };

  const formatLastUpdate = (): string => {
    if (!wasteData.lastUpdate) return 'Never';
    const date = new Date(wasteData.lastUpdate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const deleteHistory = () => {
    // Only clear the collection log, not waste data or chart data
    setCollectionLog([]);
    localStorage.setItem(COLLECTION_LOG_KEY, JSON.stringify([]));
  };

  const downloadHistoryAsPDF = () => {
    if (collectionLog.length === 0) {
      toast.error('No history to download');
      return;
    }

    // Dynamic import jsPDF to avoid loading it if not needed
    import('jspdf').then((jsPDF) => {
      const { jsPDF: JSPDF } = jsPDF;
      const doc = new JSPDF();
      
      // Set font and colors
      doc.setFontSize(18);
      doc.setTextColor(51, 51, 51);
      doc.text('Waste Collection History', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const generatedDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generated on: ${generatedDate}`, 14, 28);
      
      // Summary statistics
      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51);
      doc.text('Summary', 14, 38);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const totalCollected = collectionLog.reduce((sum, entry) => sum + entry.wasteCollected, 0);
      doc.text(`Total Entries: ${collectionLog.length}`, 14, 45);
      doc.text(`Total Waste Collected: ${totalCollected.toFixed(2)} kg`, 14, 52);
      doc.text(`Collected Today: ${wasteData.collectedToday.toFixed(2)} kg`, 14, 59);
      doc.text(`Tank Fill: ${wasteData.tankFillPercentage.toFixed(1)}%`, 14, 66);
      
      // Table header
      let yPos = 75;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.setFont(undefined, 'bold');
      doc.text('Time', 14, yPos);
      doc.text('Waste Collected', 60, yPos);
      doc.text('Date', 120, yPos);
      
      // Draw line under header
      doc.setDrawColor(229, 231, 235);
      doc.line(14, yPos + 2, 196, yPos + 2);
      
      // Table rows
      yPos += 8;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      
      collectionLog.forEach((entry, index) => {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          
          // Redraw header on new page
          doc.setFontSize(10);
          doc.setTextColor(51, 51, 51);
          doc.setFont(undefined, 'bold');
          doc.text('Time', 14, yPos);
          doc.text('Waste Collected', 60, yPos);
          doc.text('Date', 120, yPos);
          doc.setDrawColor(229, 231, 235);
          doc.line(14, yPos + 2, 196, yPos + 2);
          yPos += 8;
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
        }
        
        const entryDate = new Date(entry.timestamp);
        const dateStr = entryDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
        
        doc.setTextColor(51, 51, 51);
        doc.text(entry.time, 14, yPos);
        doc.setTextColor(34, 197, 94);
        doc.text(`+${entry.wasteCollected.toFixed(1)} kg`, 60, yPos);
        doc.setTextColor(107, 114, 128);
        doc.text(dateStr, 120, yPos);
        
        // Draw separator line
        if (index < collectionLog.length - 1) {
          doc.setDrawColor(243, 244, 246);
          doc.line(14, yPos + 3, 196, yPos + 3);
        }
        
        yPos += 7;
      });
      
      // Save the PDF
      const fileName = `waste-collection-history-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF downloaded successfully');
    }).catch((error) => {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    });
  };

  // Prepare chart data for Recharts
  const chartData = React.useMemo(() => {
    return groupedData.map(point => ({
      time: point.time,
      collectedKg: Number(point.collectedKg.toFixed(2)),
    }));
  }, [groupedData]);

  // Chart configuration
  const chartConfig = {
    collectedKg: {
      label: "Waste Collected",
      color: "#8b5cf6",
    },
  };

  // Custom dot component for data points
  const CustomDot = (props: any) => {
    const { cx, cy } = props;
    if (cx == null || cy == null) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="#8b5cf6"
        stroke="#ffffff"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3))' }}
      />
    );
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
          <div className="text-xs text-gray-500 mb-1">{data.time}</div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-sm font-semibold text-gray-900">
              {data.collectedKg.toFixed(2)} kg
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Ensure minimum data points for proper rendering (AreaChart needs at least 2 points)
  const displayData = React.useMemo(() => {
    if (!chartData || chartData.length === 0) {
      // Return empty array - will show fallback message
      return [];
    }
    if (chartData.length === 1) {
      // For single point, create a small range by adding a point slightly before
      const singlePoint = chartData[0];
      const [hours, minutes] = singlePoint.time.split(':').map(Number);
      const prevMinutes = minutes > 0 ? minutes - 1 : 59;
      const prevHours = minutes > 0 ? hours : (hours > 0 ? hours - 1 : 23);
      const prevTime = `${String(prevHours).padStart(2, '0')}:${String(prevMinutes).padStart(2, '0')}`;
      return [
        { time: prevTime, collectedKg: 0 },
        singlePoint
      ];
    }
    return chartData;
  }, [chartData]);

  // Render modern chart with Recharts
  const renderMinuteChart = () => {
    // Always render the chart container, even if empty - this ensures proper sizing
    const hasData = displayData && displayData.length > 0;

    if (!hasData) {
      return (
        <div className="w-full h-[280px] flex items-center justify-center">
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No data yet. Click "Simulate Robot Collecting Waste" to start tracking.</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <style>{`
          .farmer-chart-wrapper [data-slot="chart"] {
            aspect-ratio: unset !important;
            height: 280px !important;
          }
          .farmer-chart-wrapper [data-slot="chart"] > div {
            height: 100% !important;
            width: 100% !important;
          }
        `}</style>
        <div 
          className="w-full farmer-chart-wrapper" 
          style={{ 
            height: '280px', 
            minHeight: '280px',
            position: 'relative'
          }}
        >
          <ChartContainer 
            config={chartConfig} 
            className="w-full"
            style={{ 
              height: '280px', 
              width: '100%'
            }}
          >
            <AreaChart
              data={displayData}
              margin={{ top: 10, right: 10, left: 50, bottom: 30 }}
            >
            <defs>
              {/* Gradient for area fill */}
              <linearGradient id={areaGradientIdRef.current} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01} />
              </linearGradient>
              {/* Gradient for line */}
              <linearGradient id={gradientIdRef.current} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={{ stroke: '#e5e7eb' }}
              axisLine={{ stroke: '#e5e7eb' }}
              interval={displayData.length > 10 ? "preserveStartEnd" : 0}
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={{ stroke: '#e5e7eb' }}
              axisLine={{ stroke: '#e5e7eb' }}
              width={45}
              tickFormatter={(value) => `${value.toFixed(1)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.5 }}
            />
            <Area
              type="monotone"
              dataKey="collectedKg"
              stroke={`url(#${gradientIdRef.current})`}
              strokeWidth={2.5}
              fill={`url(#${areaGradientIdRef.current})`}
              fillOpacity={1}
              dot={displayData.length <= 10 ? <CustomDot /> : false}
              activeDot={{ 
                r: 5, 
                fill: '#8b5cf6',
                stroke: '#ffffff',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 2px 6px rgba(139, 92, 246, 0.4))' }
              }}
              animationDuration={600}
              animationEasing="ease-out"
              isAnimationActive={true}
            />
            </AreaChart>
          </ChartContainer>
        </div>
      </>
    );
  };

  const dashboardContent: React.ReactNode = (
    <div className="space-y-6">
      {/* Header with Simulate Button */}
      <div className="flex items-center justify-between">
              <div>
          <h2 className="text-2xl font-bold text-gray-900">Waste Collection Monitor</h2>
          <p className="text-gray-600 mt-1">Automatic robot waste collection tracking</p>
              </div>
        <Button
          onClick={simulateCollection}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl px-6 py-3 text-lg font-semibold shadow-lg"
          size="lg"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Simulate Robot Collecting Waste
        </Button>
            </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <Badge className="bg-blue-100 text-blue-700">Today</Badge>
                </div>
          <h3 className="text-sm text-gray-600 mb-1">Collected Today</h3>
          <div className="text-3xl font-bold text-gray-900">{wasteData.collectedToday.toFixed(1)} kg</div>
        </Card>

        <Card className="p-6 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <Badge className={`${wasteData.tankFillPercentage >= 80 ? 'bg-red-100 text-red-700' : wasteData.tankFillPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              {wasteData.tankFillPercentage >= 80 ? 'High' : wasteData.tankFillPercentage >= 50 ? 'Medium' : 'Low'}
            </Badge>
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Tank Fill</h3>
          <div className="text-3xl font-bold text-gray-900 mb-2">{wasteData.tankFillPercentage.toFixed(1)}%</div>
          <Progress value={wasteData.tankFillPercentage} className="h-2" />
          </Card>

          <Card className="p-6 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <Badge className="bg-gray-100 text-gray-700">Status</Badge>
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Last Update</h3>
          <div className="text-lg font-semibold text-gray-900">{formatLastUpdate()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {wasteData.lastUpdate ? new Date(wasteData.lastUpdate).toLocaleString('en-US') : 'Never'}
            </div>
          </Card>
        </div>

      {/* Per-Minute Chart Section */}
      <Card className="p-6 border-purple-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Waste Collection per Minute</h3>
          <p className="text-sm text-gray-600">Real-time tracking of waste collected per minute</p>
                  </div>
        {renderMinuteChart()}
                </Card>

      {/* Waste Collection Log */}
      <Card className="p-6 border-purple-200">
        <div className="flex items-center justify-between mb-6">
                      <div>
            <h3 className="text-lg font-semibold text-gray-900">Waste Collection Log</h3>
            <p className="text-sm text-gray-600">History of all collection events</p>
                      </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-100 text-purple-700">
              {collectionLog.length} {collectionLog.length === 1 ? 'entry' : 'entries'}
                      </Badge>
            {collectionLog.length > 0 && (
              <>
                <Button
                  onClick={downloadHistoryAsPDF}
                  variant="outline"
                  className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-xl"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={deleteHistory}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete History
                </Button>
              </>
            )}
              </div>
        </div>

        {collectionLog.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
            <Trash2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No collection events yet. Click "Simulate Robot Collecting Waste" to start tracking.</p>
                </div>
              ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Waste Collected</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {collectionLog.map((entry) => {
                  const entryDate = new Date(entry.timestamp);
                  const dateStr = entryDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  return (
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{entry.time}</span>
              </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-green-100 text-green-700">
                          +{entry.wasteCollected.toFixed(1)} kg
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
                    </div>
        )}
        </Card>
    </div>
  );

  return <DashboardLayout title="Farmer Dashboard" children={dashboardContent} />;
}
