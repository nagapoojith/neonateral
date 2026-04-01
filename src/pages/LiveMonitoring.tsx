import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Thermometer, Wind, Wifi, WifiOff, Clock, RefreshCw, Droplets, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
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
  channel: { id: number; name: string; description: string; created_at: string; updated_at: string; last_entry_id: number };
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
    const tempRaw = parseField(entry.field4);
    const incTempRaw = parseField(entry.field5);
    const incHumRaw = parseField(entry.field6);
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
      setCurrentVitals({ ...parsed, timestamp: latestEntry.created_at, entryId: latestEntry.entry_id });
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
        return <Badge variant="normal" className="gap-1.5 px-3 py-1"><Wifi className="h-3.5 w-3.5" />Live</Badge>;
      case 'waiting':
        return <Badge variant="warning" className="gap-1.5 px-3 py-1"><Clock className="h-3.5 w-3.5" />Waiting</Badge>;
      case 'offline':
        return <Badge variant="critical" className="gap-1.5 px-3 py-1"><WifiOff className="h-3.5 w-3.5" />Offline</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl gradient-primary shadow-glow-primary">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">IoT Live Monitoring</h1>
            <p className="text-sm text-muted-foreground">Real-time Neonatal Vital Signs & Incubator</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing} className="rounded-xl">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {lastFetchTime && <span>Last updated: {lastFetchTime.toLocaleTimeString()}</span>}
        {currentVitals.timestamp && <span>Sensor: {new Date(currentVitals.timestamp).toLocaleString()}</span>}
        <div className="live-indicator"><span>Auto-refresh 15s</span></div>
      </div>

      {/* Vital Signs Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-status-critical" /> Neonatal Vital Signs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VitalCard title="Heart Rate" value={currentVitals.heartRate} unit="BPM" icon={<Heart className="h-5 w-5" />} colorClass="text-status-critical" bgClass="bg-status-critical" normalRange={{ min: 100, max: 180 }} />
          <VitalCard title="Blood Oxygen (SpO₂)" value={currentVitals.spo2} unit="%" icon={<Wind className="h-5 w-5" />} colorClass="text-primary" bgClass="bg-primary" normalRange={{ min: 90, max: 100 }} />
          <VitalCard title="Body Temperature" value={currentVitals.temperature} unit="°C" icon={<Thermometer className="h-5 w-5" />} colorClass="text-status-warning" bgClass="bg-status-warning" normalRange={{ min: 36.0, max: 37.5 }} />
        </div>
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Historical Trends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <VitalChart title="Heart Rate Trend" dataKey="heartRate" color="hsl(var(--status-critical))" unit="BPM" data={chartData} />
          <VitalChart title="SpO₂ Trend" dataKey="spo2" color="hsl(var(--primary))" unit="%" data={chartData} />
          <VitalChart title="Temperature Trend" dataKey="temperature" color="hsl(var(--status-warning))" unit="°C" data={chartData} />
        </div>
      </div>

      {/* Incubator section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-glass overflow-hidden">
          <div className="h-1.5 w-full gradient-teal" />
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/20">
                <Box className="h-5 w-5 text-accent-foreground" />
              </div>
              Incubator Monitoring
            </CardTitle>
            <p className="text-xs text-muted-foreground">Real-time incubator environment data</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-4 w-4 text-status-warning" />
                  <span className="text-xs text-muted-foreground font-medium">Incubator Temp</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold tabular-nums ${currentVitals.incubatorTemperature === null ? 'text-muted-foreground' : 'text-status-warning'}`}>
                    {currentVitals.incubatorTemperature !== null ? currentVitals.incubatorTemperature.toFixed(1) : '--'}
                  </span>
                  <span className="text-sm text-muted-foreground">°C</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Normal: 32–36 °C</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Incubator Humidity</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold tabular-nums ${currentVitals.incubatorHumidity === null ? 'text-muted-foreground' : 'text-primary'}`}>
                    {currentVitals.incubatorHumidity !== null ? currentVitals.incubatorHumidity.toFixed(1) : '--'}
                  </span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Normal: 40–60 %</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-between">
              <span className="text-sm text-foreground font-medium">Incubator Status</span>
              <IncubatorStatusBadge temp={currentVitals.incubatorTemperature} humidity={currentVitals.incubatorHumidity} />
            </div>
          </CardContent>
        </Card>

        {/* System info */}
        <Card className="card-glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
              <div key={item.label} className="flex justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground font-medium">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

const VitalCard: React.FC<{
  title: string; value: number | null; unit: string; icon: React.ReactNode; colorClass: string; bgClass: string; normalRange?: { min: number; max: number };
}> = ({ title, value, unit, icon, colorClass, bgClass, normalRange }) => {
  const isOffline = value === null;
  const isOutOfRange = normalRange && value !== null && (value < normalRange.min || value > normalRange.max);
  return (
    <Card className="card-glass overflow-hidden">
      <div className={`h-1 w-full ${isOffline ? 'bg-muted' : isOutOfRange ? 'bg-status-critical' : bgClass}`} />
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isOffline ? 'bg-muted' : `${bgClass}/20`} ${colorClass}`}>{icon}</div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold tabular-nums ${isOffline ? 'text-muted-foreground' : isOutOfRange ? 'text-status-critical' : 'text-foreground'}`}>
            {isOffline ? '--' : value}
          </span>
          <span className="text-lg text-muted-foreground">{unit}</span>
        </div>
        {normalRange && !isOffline && <p className="text-xs text-muted-foreground mt-1">Normal: {normalRange.min}–{normalRange.max} {unit}</p>}
        {isOffline && <p className="text-xs text-muted-foreground mt-1">No sensor data available</p>}
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
      <Card className="card-glass">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
        <CardContent className="h-48 flex items-center justify-center"><p className="text-muted-foreground text-sm">No historical data available</p></CardContent>
      </Card>
    );
  }
  return (
    <Card className="card-glass">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={validData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
                boxShadow: 'var(--shadow-elevated)',
              }}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullTime || ''}
              formatter={(value: number) => [`${value} ${unit}`, title]}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#gradient-${dataKey})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: 'hsl(var(--card))' }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const IncubatorStatusBadge: React.FC<{ temp: number | null; humidity: number | null }> = ({ temp, humidity }) => {
  if (temp === null && humidity === null) {
    return <Badge variant="secondary">No Data</Badge>;
  }
  const tempOk = temp !== null && temp >= 32 && temp <= 36;
  const humOk = humidity !== null && humidity >= 40 && humidity <= 60;
  if (tempOk && humOk) {
    return <Badge variant="normal">Optimal</Badge>;
  }
  if ((temp !== null && !tempOk) || (humidity !== null && !humOk)) {
    return <Badge variant="warning">Needs Attention</Badge>;
  }
  return <Badge variant="normal">Normal</Badge>;
};

const LiveMonitoring: React.FC = () => (
  <DashboardLayout>
    <LiveMonitoringContent />
  </DashboardLayout>
);

export default LiveMonitoring;
