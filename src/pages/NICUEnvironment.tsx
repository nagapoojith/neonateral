import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Sun, Shield, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus, Activity, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

interface IncubatorData {
  id: string;
  babyName: string;
  bedNumber: string;
  temperature: number;
  humidity: number;
  lightExposure: number;
  status: 'optimal' | 'slight_deviation' | 'attention_needed';
  prevTemperature: number;
  prevHumidity: number;
  prevLight: number;
  lastChecked: Date;
}

const getEnvStatus = (temp: number, humidity: number, light: number): 'optimal' | 'slight_deviation' | 'attention_needed' => {
  const tempOk = temp >= 32 && temp <= 34;
  const humidityOk = humidity >= 50 && humidity <= 60;
  const lightOk = light >= 100 && light <= 300;

  if (tempOk && humidityOk && lightOk) return 'optimal';

  const tempCritical = temp < 30 || temp > 36;
  const humidityCritical = humidity < 40 || humidity > 70;
  const lightCritical = light > 500;

  if (tempCritical || humidityCritical || lightCritical) return 'attention_needed';
  return 'slight_deviation';
};

const statusConfig = {
  optimal: { label: 'Optimal', color: 'text-status-normal', bg: 'bg-status-normal-bg', border: 'border-status-normal', icon: CheckCircle2 },
  slight_deviation: { label: 'Slight Deviation', color: 'text-status-warning', bg: 'bg-status-warning-bg', border: 'border-status-warning', icon: AlertTriangle },
  attention_needed: { label: 'Attention Needed', color: 'text-status-critical', bg: 'bg-status-critical-bg', border: 'border-status-critical', icon: AlertTriangle },
};

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.3) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (diff > 0) return <TrendingUp className="w-3.5 h-3.5 text-status-warning" />;
  return <TrendingDown className="w-3.5 h-3.5 text-chart-spo2" />;
}

function getParamStatus(value: number, min: number, max: number): 'normal' | 'warning' | 'critical' {
  if (value >= min && value <= max) return 'normal';
  const distMin = min - value;
  const distMax = value - max;
  if (distMin > 3 || distMax > 3) return 'critical';
  return 'warning';
}

const NICUEnvironment = () => {
  const { babies } = useData();
  const [incubators, setIncubators] = useState<IncubatorData[]>([]);

  useEffect(() => {
    const generateData = () => {
      setIncubators(prev => {
        return babies.map((baby) => {
          const existing = prev.find(p => p.id === baby.id);
          const temp = 32 + Math.random() * 3;
          const humidity = 48 + Math.random() * 16;
          const light = 80 + Math.random() * 280;
          return {
            id: baby.id,
            babyName: baby.name,
            bedNumber: baby.bedNumber,
            temperature: parseFloat(temp.toFixed(1)),
            humidity: parseFloat(humidity.toFixed(1)),
            lightExposure: Math.round(light),
            status: getEnvStatus(temp, humidity, light),
            prevTemperature: existing?.temperature ?? parseFloat(temp.toFixed(1)),
            prevHumidity: existing?.humidity ?? parseFloat(humidity.toFixed(1)),
            prevLight: existing?.lightExposure ?? Math.round(light),
            lastChecked: new Date(),
          };
        });
      });
    };

    generateData();
    const interval = setInterval(generateData, 10000);
    return () => clearInterval(interval);
  }, [babies]);

  const overall = incubators.length === 0
    ? 'optimal'
    : incubators.some(i => i.status === 'attention_needed')
    ? 'attention_needed'
    : incubators.some(i => i.status === 'slight_deviation')
    ? 'slight_deviation'
    : 'optimal';

  const overallCfg = statusConfig[overall];
  const OverallIcon = overallCfg.icon;

  const optimalCount = incubators.filter(i => i.status === 'optimal').length;
  const deviationCount = incubators.filter(i => i.status === 'slight_deviation').length;
  const attentionCount = incubators.filter(i => i.status === 'attention_needed').length;

  const avgTemp = incubators.length > 0 ? (incubators.reduce((s, i) => s + i.temperature, 0) / incubators.length).toFixed(1) : '--';
  const avgHum = incubators.length > 0 ? (incubators.reduce((s, i) => s + i.humidity, 0) / incubators.length).toFixed(1) : '--';
  const avgLight = incubators.length > 0 ? Math.round(incubators.reduce((s, i) => s + i.lightExposure, 0) / incubators.length) : '--';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">NICU Incubator Overview</h1>
            <p className="text-muted-foreground">Real-time environmental monitoring across all incubators</p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Auto-refresh: 10s</span>
            <div className="live-indicator ml-2">Live</div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={cn('card-medical border-l-4', overallCfg.color === 'text-status-normal' ? 'border-l-status-normal' : overallCfg.color === 'text-status-warning' ? 'border-l-status-warning' : 'border-l-status-critical')}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('p-2 rounded-xl', overallCfg.bg)}>
                  <OverallIcon className={cn('w-5 h-5', overallCfg.color)} />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">Overall Status</span>
              </div>
              <p className={cn('text-xl font-bold', overallCfg.color)}>{overallCfg.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{incubators.length} incubators monitored</p>
            </CardContent>
          </Card>

          <Card className="card-medical">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-status-normal-bg">
                  <CheckCircle2 className="w-4 h-4 text-status-normal" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">Optimal</span>
              </div>
              <p className="text-3xl font-bold text-status-normal">{optimalCount}</p>
              <p className="text-xs text-muted-foreground mt-1">All parameters in range</p>
            </CardContent>
          </Card>

          <Card className="card-medical">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-status-warning-bg">
                  <AlertTriangle className="w-4 h-4 text-status-warning" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">Deviation</span>
              </div>
              <p className="text-3xl font-bold text-status-warning">{deviationCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Minor adjustments needed</p>
            </CardContent>
          </Card>

          <Card className="card-medical">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-status-critical-bg">
                  <AlertTriangle className="w-4 h-4 text-status-critical" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">Attention</span>
              </div>
              <p className="text-3xl font-bold text-status-critical">{attentionCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Immediate review needed</p>
            </CardContent>
          </Card>
        </div>

        <Card className="card-medical">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              NICU Averages
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Thermometer className="w-5 h-5 text-chart-temp" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Temperature</p>
                  <p className="text-lg font-bold text-foreground">{avgTemp}°C</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Droplets className="w-5 h-5 text-chart-spo2" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Humidity</p>
                  <p className="text-lg font-bold text-foreground">{avgHum}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Sun className="w-5 h-5 text-chart-heart" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Light</p>
                  <p className="text-lg font-bold text-foreground">{avgLight} lux</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {incubators.map((inc) => {
            const cfg = statusConfig[inc.status];
            const StatusIcon = cfg.icon;
            const tempStatus = getParamStatus(inc.temperature, 32, 34);
            const humStatus = getParamStatus(inc.humidity, 50, 60);
            const lightStatus = getParamStatus(inc.lightExposure, 100, 300);

            return (
              <Card key={inc.id} className={cn('card-medical overflow-hidden', inc.status === 'attention_needed' && 'ring-2 ring-status-critical alert-pulse')}>
                <div className={cn('h-1.5', inc.status === 'optimal' ? 'gradient-primary' : inc.status === 'slight_deviation' ? 'bg-status-warning' : 'bg-status-critical')} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg)}>
                        <StatusIcon className={cn('w-5 h-5', cfg.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{inc.babyName}</CardTitle>
                        <p className="text-xs text-muted-foreground">Bed {inc.bedNumber} • Incubator #{inc.bedNumber}</p>
                      </div>
                    </div>
                    <Badge variant={inc.status === 'optimal' ? 'normal' : inc.status === 'slight_deviation' ? 'warning' : 'critical'}>
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  {[
                    {
                      icon: Thermometer, label: 'Temperature', value: `${inc.temperature}°C`,
                      status: tempStatus, progress: ((inc.temperature - 28) / 10) * 100,
                      range: '32–34°C', colorClass: 'text-chart-temp',
                      trend: <TrendIcon current={inc.temperature} previous={inc.prevTemperature} />,
                    },
                    {
                      icon: Droplets, label: 'Humidity', value: `${inc.humidity}%`,
                      status: humStatus, progress: inc.humidity,
                      range: '50–60%', colorClass: 'text-chart-spo2',
                      trend: <TrendIcon current={inc.humidity} previous={inc.prevHumidity} />,
                    },
                    {
                      icon: Sun, label: 'Light Exposure', value: `${inc.lightExposure} lux`,
                      status: lightStatus, progress: (inc.lightExposure / 500) * 100,
                      range: '100–300 lux', colorClass: 'text-chart-heart',
                      trend: <TrendIcon current={inc.lightExposure} previous={inc.prevLight} />,
                    },
                  ].map((param) => {
                    const ParamIcon = param.icon;
                    const statusColor = param.status === 'critical' ? 'text-status-critical' : param.status === 'warning' ? 'text-status-warning' : 'text-foreground';
                    return (
                      <div key={param.label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ParamIcon className={cn('w-4 h-4', param.colorClass)} />
                            <span className="text-sm font-medium">{param.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {param.trend}
                            <span className={cn('text-sm font-bold tabular-nums', statusColor)}>
                              {param.value}
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={Math.min(100, Math.max(0, param.progress))}
                          className={cn('h-2', param.status === 'critical' ? '[&>div]:bg-status-critical' : param.status === 'warning' ? '[&>div]:bg-status-warning' : '')}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground">Optimal: {param.range}</p>
                          {param.status !== 'normal' && (
                            <Badge variant={param.status === 'critical' ? 'critical' : 'warning'} className="text-[9px] px-1.5 py-0">
                              {param.status === 'critical' ? 'Out of Range' : 'Near Limit'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last updated: {inc.lastChecked.toLocaleTimeString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {incubators.length === 0 && (
            <Card className="card-medical col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Shield className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-lg font-semibold">No Incubators to Monitor</p>
                <p className="text-sm text-muted-foreground">Register babies to view environment data</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NICUEnvironment;
