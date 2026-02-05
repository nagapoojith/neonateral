import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Thermometer, Wind, Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const THINGSPEAK_CHANNEL_ID = '3242355';
const THINGSPEAK_API_KEY = 'DXDNPGTNJC504SX4';
const REFRESH_INTERVAL = 15000; // 15 seconds
const HISTORY_COUNT = 100; // Fetch last 100 entries for graphs

// ThingSpeak Field Mapping (based on Arduino output: Temp, BPM, SpO2)
// field1 = Temperature (°C)
// field2 = unused
// field3 = Heart Rate (BPM)
// field4 = SpO2 (%)

interface ThingSpeakEntry {
  created_at: string;
  entry_id: number;
  field1: string | null; // Temperature
  field2: string | null; // Unused
  field3: string | null; // Heart Rate (BPM)
  field4: string | null; // SpO2
}

interface ThingSpeakResponse {
  channel: {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    last_entry_id: number;
  };
  feeds: ThingSpeakEntry[];
}

interface VitalData {
  heartRate: number | null;
  spo2: number | null;
  temperature: number | null;
  timestamp: string | null;
  entryId: number | null;
}

interface ChartDataPoint {
  time: string;
  fullTime: string;
  heartRate: number | null;
  spo2: number | null;
  temperature: number | null;
}

type DeviceStatus = 'online' | 'offline' | 'waiting';

const LiveMonitoring: React.FC = () => {
  const [currentVitals, setCurrentVitals] = useState<VitalData>({
    heartRate: null,
    spo2: null,
    temperature: null,
    timestamp: null,
    entryId: null,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('waiting');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousEntryId, setPreviousEntryId] = useState<number | null>(null);

  const fetchLatestData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Fetch latest single entry for current vitals
      const latestUrl = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
      const latestResponse = await fetch(latestUrl);
      
      if (!latestResponse.ok) {
        throw new Error('Failed to fetch from ThingSpeak');
      }

      const latestData: ThingSpeakResponse = await latestResponse.json();
      
      if (!latestData.feeds || latestData.feeds.length === 0) {
        setDeviceStatus('offline');
        setCurrentVitals({
          heartRate: null,
          spo2: null,
          temperature: null,
          timestamp: null,
          entryId: null,
        });
        return;
      }

      const latestEntry = latestData.feeds[0];
      const entryTimestamp = new Date(latestEntry.created_at);
      const now = new Date();
      const timeDiff = (now.getTime() - entryTimestamp.getTime()) / 1000; // seconds

      // Check if data is stale (more than 60 seconds old)
      if (timeDiff > 60) {
        setDeviceStatus('offline');
      } else if (previousEntryId !== null && latestEntry.entry_id === previousEntryId) {
        // No new data since last fetch
        setDeviceStatus('waiting');
      } else {
        setDeviceStatus('online');
      }

      setPreviousEntryId(latestEntry.entry_id);

      // Parse values with correct field mapping
      // Arduino sends: Temp (field1), BPM (field3), SpO2 (field4)
      const temperatureRaw = latestEntry.field1 ? parseFloat(latestEntry.field1) : null;
      const heartRateRaw = latestEntry.field3 ? parseFloat(latestEntry.field3) : null;
      const spo2Raw = latestEntry.field4 ? parseFloat(latestEntry.field4) : null;

      // Validate values - reject invalid readings
      // Temperature: -273.15 means sensor not connected (0 Kelvin), valid range 20-45°C
      const temperature = temperatureRaw !== null && !isNaN(temperatureRaw) && temperatureRaw > -50 && temperatureRaw < 50 ? temperatureRaw : null;
      // Heart Rate: valid range 30-250 BPM
      const heartRate = heartRateRaw !== null && !isNaN(heartRateRaw) && heartRateRaw > 0 && heartRateRaw < 300 ? heartRateRaw : null;
      // SpO2: valid range 70-100%
      const spo2 = spo2Raw !== null && !isNaN(spo2Raw) && spo2Raw > 0 && spo2Raw <= 100 ? spo2Raw : null;

      setCurrentVitals({
        heartRate: heartRate,
        spo2: spo2,
        temperature: temperature,
        timestamp: latestEntry.created_at,
        entryId: latestEntry.entry_id,
      });

      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Error fetching ThingSpeak data:', err);
      setError('Failed to connect to ThingSpeak');
      setDeviceStatus('offline');
    } finally {
      setIsRefreshing(false);
    }
  }, [previousEntryId]);

  const fetchHistoricalData = useCallback(async () => {
    try {
      const historyUrl = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=${HISTORY_COUNT}`;
      const historyResponse = await fetch(historyUrl);
      
      if (!historyResponse.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const historyData: ThingSpeakResponse = await historyResponse.json();
      
      if (!historyData.feeds || historyData.feeds.length === 0) {
        setChartData([]);
        return;
      }

      const formattedData: ChartDataPoint[] = historyData.feeds.map((entry) => {
        const timestamp = new Date(entry.created_at);
        
        // Parse raw values with correct field mapping
        const temperatureRaw = entry.field1 ? parseFloat(entry.field1) : null;
        const heartRateRaw = entry.field3 ? parseFloat(entry.field3) : null;
        const spo2Raw = entry.field4 ? parseFloat(entry.field4) : null;
        
        // Validate values with proper ranges
        const temperature = temperatureRaw !== null && !isNaN(temperatureRaw) && temperatureRaw > -50 && temperatureRaw < 50 ? temperatureRaw : null;
        const heartRate = heartRateRaw !== null && !isNaN(heartRateRaw) && heartRateRaw > 0 && heartRateRaw < 300 ? heartRateRaw : null;
        const spo2 = spo2Raw !== null && !isNaN(spo2Raw) && spo2Raw > 0 && spo2Raw <= 100 ? spo2Raw : null;

        return {
          time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          fullTime: timestamp.toLocaleString(),
          heartRate: heartRate,
          spo2: spo2,
          temperature: temperature,
        };
      });

      setChartData(formattedData);
    } catch (err) {
      console.error('Error fetching historical data:', err);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchLatestData();
    fetchHistoricalData();

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      fetchLatestData();
      fetchHistoricalData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchLatestData, fetchHistoricalData]);

  const handleManualRefresh = () => {
    fetchLatestData();
    fetchHistoricalData();
  };

  const getStatusBadge = () => {
    switch (deviceStatus) {
      case 'online':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1.5 px-3 py-1">
            <Wifi className="h-3.5 w-3.5" />
            Live Monitoring
          </Badge>
        );
      case 'waiting':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1.5 px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            Waiting for Hardware Data
          </Badge>
        );
      case 'offline':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1.5 px-3 py-1">
            <WifiOff className="h-3.5 w-3.5" />
            Device Offline
          </Badge>
        );
    }
  };

  const VitalCard: React.FC<{
    title: string;
    value: number | null;
    unit: string;
    icon: React.ReactNode;
    color: string;
    normalRange?: { min: number; max: number };
  }> = ({ title, value, unit, icon, color, normalRange }) => {
    const isOffline = value === null;
    const isOutOfRange = normalRange && value !== null && (value < normalRange.min || value > normalRange.max);

    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
        <div className={`h-1 w-full ${isOffline ? 'bg-slate-600' : isOutOfRange ? 'bg-red-500' : color}`} />
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isOffline ? 'bg-slate-700' : `${color.replace('bg-', 'bg-')}/20`}`}>
                {icon}
              </div>
              <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold tabular-nums ${isOffline ? 'text-slate-500' : isOutOfRange ? 'text-red-400' : 'text-white'}`}>
              {isOffline ? '--' : value}
            </span>
            <span className="text-lg text-slate-400">{unit}</span>
          </div>
          {normalRange && !isOffline && (
            <p className="text-xs text-slate-500 mt-1">
              Normal: {normalRange.min} - {normalRange.max} {unit}
            </p>
          )}
          {isOffline && (
            <p className="text-xs text-slate-500 mt-1">No sensor data available</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const VitalChart: React.FC<{
    title: string;
    dataKey: keyof ChartDataPoint;
    color: string;
    unit: string;
    data: ChartDataPoint[];
  }> = ({ title, dataKey, color, unit, data }) => {
    const validData = data.filter(d => d[dataKey] !== null);
    
    if (validData.length === 0) {
      return (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
          </CardHeader>
          <CardContent className="h-48 flex items-center justify-center">
            <p className="text-slate-500 text-sm">No historical data available</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={validData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullTime || ''}
                formatter={(value: number) => [`${value} ${unit}`, title]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${dataKey})`}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#0f172a' }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Activity className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Neonatal IoT Monitoring</h1>
                <p className="text-sm text-slate-400">Real-time NICU Vital Signs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Status Info */}
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-400">
          {lastFetchTime && (
            <span>Last updated: {lastFetchTime.toLocaleTimeString()}</span>
          )}
          {currentVitals.timestamp && (
            <span>Sensor data from: {new Date(currentVitals.timestamp).toLocaleString()}</span>
          )}
          {currentVitals.entryId && (
            <span>Entry ID: #{currentVitals.entryId}</span>
          )}
          <span>Auto-refresh: Every 15 seconds</span>
        </div>

        {/* Live Vitals Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <VitalCard
            title="Heart Rate"
            value={currentVitals.heartRate}
            unit="BPM"
            icon={<Heart className="h-5 w-5 text-rose-400" />}
            color="bg-rose-500"
            normalRange={{ min: 100, max: 180 }}
          />
          <VitalCard
            title="Blood Oxygen (SpO₂)"
            value={currentVitals.spo2}
            unit="%"
            icon={<Wind className="h-5 w-5 text-blue-400" />}
            color="bg-blue-500"
            normalRange={{ min: 90, max: 100 }}
          />
          <VitalCard
            title="Body Temperature"
            value={currentVitals.temperature}
            unit="°C"
            icon={<Thermometer className="h-5 w-5 text-amber-400" />}
            color="bg-amber-500"
            normalRange={{ min: 36.0, max: 37.5 }}
          />
        </div>

        {/* Charts Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4">Historical Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <VitalChart
              title="Heart Rate Trend"
              dataKey="heartRate"
              color="#f43f5e"
              unit="BPM"
              data={chartData}
            />
            <VitalChart
              title="SpO₂ Trend"
              dataKey="spo2"
              color="#3b82f6"
              unit="%"
              data={chartData}
            />
            <VitalChart
              title="Temperature Trend"
              dataKey="temperature"
              color="#f59e0b"
              unit="°C"
              data={chartData}
            />
          </div>
        </div>

        {/* Technical Info Footer */}
        <div className="mt-8 p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
          <h3 className="text-sm font-medium text-slate-300 mb-2">ThingSpeak Integration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500">
            <div>
              <span className="text-slate-400">Channel:</span> NEONATAL MONITORING
            </div>
            <div>
              <span className="text-slate-400">Channel ID:</span> {THINGSPEAK_CHANNEL_ID}
            </div>
            <div>
              <span className="text-slate-400">Field 1:</span> Temperature
            </div>
            <div>
              <span className="text-slate-400">Field 3:</span> Heart Rate
            </div>
            <div>
              <span className="text-slate-400">Field 4:</span> SpO₂
            </div>
            <div>
              <span className="text-slate-400">Refresh Rate:</span> 15 seconds
            </div>
            <div>
              <span className="text-slate-400">History:</span> Last {HISTORY_COUNT} entries
            </div>
            <div>
              <span className="text-slate-400">Data Source:</span> Arduino/ESP32
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-slate-500">
          <p>© 2026 Hospital Systems</p>
        </footer>
      </main>
    </div>
  );
};

export default LiveMonitoring;
