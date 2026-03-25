import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Thermometer, Wind, Wifi, WifiOff, Clock, RefreshCw, Droplets, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const THINGSPEAK_CHANNEL_ID = '3299978';
const THINGSPEAK_API_KEY = 'FW0N2ZJVIPXBVSIQ';
const REFRESH_INTERVAL = 15000;
const HISTORY_COUNT = 100;

interface ThingSpeakEntry {
  created_at: string;
  entry_id: number;
  field1: string | null;
  field2: string | null;
  field3: string | null;
  field4: string | null;
  field5: string | null;
  field6: string | null;
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
  incubatorHumidity: number | null;
  incubatorTemperature: number | null;
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

// Inner content component (no layout wrapper)
const LiveMonitoringContent: React.FC = () => {
  const [currentVitals, setCurrentVitals] = useState<VitalData>({
    heartRate: null, spo2: null, temperature: null,
    incubatorHumidity: null, incubatorTemperature: null,
    timestamp: null, entryId: null,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('waiting');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousEntryId, setPreviousEntryId] = useState<number | null>(null);

  const validateAndParseEntry = (entry: ThingSpeakEntry) => {
    const parseField = (val: string | null) => val ? parseFloat(val) : null;

    const hrRaw = parseField(entry.field1);
    const spo2Raw = parseField(entry.field2);
    // field3 is SpO2 Min - not used
    const tempRaw = parseField(entry.field4);      // field4 = Body Temp (°C)
    const incTempRaw = parseField(entry.field5);    // field5 = Room/Incubator Temp (°C)
    const incHumRaw = parseField(entry.field6);     // field6 = Humidity (%)

    return {
      heartRate: hrRaw !== null && !isNaN(hrRaw) && hrRaw > 0 && hrRaw < 300 ? hrRaw : null,
      spo2: spo2Raw !== null && !isNaN(spo2Raw) && spo2Raw > 0 && spo2Raw <= 100 ? spo2Raw : null,
      temperature: tempRaw !== null && !isNaN(tempRaw) && tempRaw > 20 && tempRaw < 45 ? tempRaw : null,
      incubatorHumidity: incHumRaw !== null && !isNaN(incHumRaw) && incHumRaw >= 0 && incHumRaw <= 100 ? incHumRaw : null,
      incubatorTemperature: incTempRaw !== null && !isNaN(incTempRaw) && incTempRaw > -10 && incTempRaw < 60 ? incTempRaw : null,
    };
  };

  const fetchLatestData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const latestUrl = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
      const latestResponse = await fetch(latestUrl);

      if (!latestResponse.ok) throw new Error('Failed to fetch from ThingSpeak');

      const latestData: ThingSpeakResponse = await latestResponse.json();

      if (!latestData.feeds || latestData.feeds.length === 0) {
        setDeviceStatus('offline');
        setCurrentVitals({ heartRate: null, spo2: null, temperature: null, incubatorHumidity: null, incubatorTemperature: null, timestamp: null, entryId: null });
        return;
      }

      const latestEntry = latestData.feeds[0];
      const timeDiff = (Date.now() - new Date(latestEntry.created_at).getTime()) / 1000;

      if (timeDiff > 60) setDeviceStatus('offline');
      else if (previousEntryId !== null && latestEntry.entry_id === previousEntryId) setDeviceStatus('waiting');
      else setDeviceStatus('online');

      setPreviousEntryId(latestEntry.entry_id);
      const parsed = validateAndParseEntry(latestEntry);

      setCurrentVitals({
        ...parsed,
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
      if (!historyResponse.ok) return;

      const historyData: ThingSpeakResponse = await historyResponse.json();
      if (!historyData.feeds || historyData.feeds.length === 0) { setChartData([]); return; }

      const formattedData: ChartDataPoint[] = historyData.feeds.map((entry) => {
        const timestamp = new Date(entry.created_at);
        const parsed = validateAndParseEntry(entry);
        return {
          time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          fullTime: timestamp.toLocaleString(),
          heartRate: parsed.heartRate,
          spo2: parsed.spo2,
          temperature: parsed.temperature,
        };
      });
      setChartData(formattedData);
    } catch (err) {
      console.error('Error fetching historical data:', err);
    }
  }, []);

  useEffect(() => {
    fetchLatestData();
    fetchHistoricalData();
    const interval = setInterval(() => { fetchLatestData(); fetchHistoricalData(); }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLatestData, fetchHistoricalData]);

  const handleManualRefresh = () => { fetchLatestData(); fetchHistoricalData(); };

  const getStatusBadge = () => {
    switch (deviceStatus) {
      case 'online':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1.5 px-3 py-1"><Wifi className="h-3.5 w-3.5" />Live</Badge>;
      case 'waiting':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1.5 px-3 py-1"><Clock className="h-3.5 w-3.5" />Waiting</Badge>;
      case 'offline':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1.5 px-3 py-1"><WifiOff className="h-3.5 w-3.5" />Offline</Badge>;
    }
  };

  // === Main Dashboard ===
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">IoT Live Monitoring</h1>
            <p className="text-sm text-muted-foreground">Real-time Neonatal Vital Signs & Incubator</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {lastFetchTime && <span>Last updated: {lastFetchTime.toLocaleTimeString()}</span>}
        {currentVitals.timestamp && <span>Sensor: {new Date(currentVitals.timestamp).toLocaleString()}</span>}
        <span>Auto-refresh: 15s</span>
      </div>

        {/* ===== TOP SECTION: Vital Signs Cards ===== */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-400" /> Neonatal Vital Signs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <VitalCard title="Heart Rate" value={currentVitals.heartRate} unit="BPM" icon={<Heart className="h-5 w-5 text-rose-400" />} color="bg-rose-500" normalRange={{ min: 100, max: 180 }} />
            <VitalCard title="Blood Oxygen (SpO₂)" value={currentVitals.spo2} unit="%" icon={<Wind className="h-5 w-5 text-blue-400" />} color="bg-blue-500" normalRange={{ min: 90, max: 100 }} />
            <VitalCard title="Body Temperature" value={currentVitals.temperature} unit="°C" icon={<Thermometer className="h-5 w-5 text-amber-400" />} color="bg-amber-500" normalRange={{ min: 36.0, max: 37.5 }} />
          </div>
        </div>

        {/* ===== Vital Signs Graphs ===== */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Historical Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <VitalChart title="Heart Rate Trend" dataKey="heartRate" color="#f43f5e" unit="BPM" data={chartData} />
            <VitalChart title="SpO₂ Trend" dataKey="spo2" color="#3b82f6" unit="%" data={chartData} />
            <VitalChart title="Temperature Trend" dataKey="temperature" color="#f59e0b" unit="°C" data={chartData} />
          </div>
        </div>

        {/* ===== MIDDLE/BOTTOM: Incubator Monitoring ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incubator Panel */}
          <Card className="bg-gradient-to-br from-slate-900/80 to-cyan-950/30 border-cyan-700/30 backdrop-blur-sm overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 to-teal-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Box className="h-5 w-5 text-cyan-400" />
                </div>
                Incubator Monitoring
              </CardTitle>
              <p className="text-xs text-slate-400">Real-time incubator environment data</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Incubator Temperature */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-slate-400 font-medium">Incubator Temp</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold tabular-nums ${currentVitals.incubatorTemperature === null ? 'text-slate-500' : 'text-orange-300'}`}>
                      {currentVitals.incubatorTemperature !== null ? currentVitals.incubatorTemperature.toFixed(1) : '--'}
                    </span>
                    <span className="text-sm text-slate-400">°C</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Normal: 32–36 °C</p>
                </div>
                {/* Incubator Humidity */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-teal-400" />
                    <span className="text-xs text-slate-400 font-medium">Incubator Humidity</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold tabular-nums ${currentVitals.incubatorHumidity === null ? 'text-slate-500' : 'text-teal-300'}`}>
                      {currentVitals.incubatorHumidity !== null ? currentVitals.incubatorHumidity.toFixed(1) : '--'}
                    </span>
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Normal: 40–60 %</p>
                </div>
              </div>
              {/* Incubator Status */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-between">
                <span className="text-sm text-slate-300 font-medium">Incubator Status</span>
                <IncubatorStatusBadge temp={currentVitals.incubatorTemperature} humidity={currentVitals.incubatorHumidity} />
              </div>
            </CardContent>
          </Card>

          {/* Technical Info */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Channel ID', value: THINGSPEAK_CHANNEL_ID },
                { label: 'Field 1', value: 'Heart Rate (BPM)' },
                { label: 'Field 2', value: 'SpO₂ Avg (%)' },
                { label: 'Field 3', value: 'SpO₂ Min (%) — unused' },
                { label: 'Field 4', value: 'Body Temperature (°C)' },
                { label: 'Field 5', value: 'Room/Incubator Temp (°C)' },
                { label: 'Field 6', value: 'Humidity (%)' },
                { label: 'Refresh Rate', value: '15 seconds' },
                { label: 'Data Source', value: 'Arduino / ESP32' },
                { label: 'History', value: `Last ${HISTORY_COUNT} entries` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-1.5 px-3 rounded-lg bg-slate-800/30 text-sm">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-300 font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

    </div>
  );
};

// === Sub-components ===

const VitalCard: React.FC<{
  title: string; value: number | null; unit: string; icon: React.ReactNode; color: string; normalRange?: { min: number; max: number };
}> = ({ title, value, unit, icon, color, normalRange }) => {
  const isOffline = value === null;
  const isOutOfRange = normalRange && value !== null && (value < normalRange.min || value > normalRange.max);
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
      <div className={`h-1 w-full ${isOffline ? 'bg-slate-600' : isOutOfRange ? 'bg-red-500' : color}`} />
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isOffline ? 'bg-slate-700' : `${color}/20`}`}>{icon}</div>
          <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold tabular-nums ${isOffline ? 'text-slate-500' : isOutOfRange ? 'text-red-400' : 'text-white'}`}>
            {isOffline ? '--' : value}
          </span>
          <span className="text-lg text-slate-400">{unit}</span>
        </div>
        {normalRange && !isOffline && <p className="text-xs text-slate-500 mt-1">Normal: {normalRange.min}–{normalRange.max} {unit}</p>}
        {isOffline && <p className="text-xs text-slate-500 mt-1">No sensor data available</p>}
      </CardContent>
    </Card>
  );
};

const VitalChart: React.FC<{
  title: string; dataKey: keyof ChartDataPoint; color: string; unit: string; data: ChartDataPoint[];
}> = ({ title, dataKey, color, unit, data }) => {
  const validData = data.filter(d => d[dataKey] !== null);
  if (validData.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle></CardHeader>
        <CardContent className="h-48 flex items-center justify-center"><p className="text-slate-500 text-sm">No historical data available</p></CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle></CardHeader>
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
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullTime || ''}
              formatter={(value: number) => [`${value} ${unit}`, title]}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#gradient-${dataKey})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#0f172a' }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const IncubatorStatusBadge: React.FC<{ temp: number | null; humidity: number | null }> = ({ temp, humidity }) => {
  if (temp === null && humidity === null) {
    return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">No Data</Badge>;
  }
  const tempOk = temp !== null && temp >= 32 && temp <= 36;
  const humOk = humidity !== null && humidity >= 40 && humidity <= 60;
  if (tempOk && humOk) {
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Optimal</Badge>;
  }
  if ((temp !== null && !tempOk) || (humidity !== null && !humOk)) {
    return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Needs Attention</Badge>;
  }
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Normal</Badge>;
};

export default LiveMonitoring;
