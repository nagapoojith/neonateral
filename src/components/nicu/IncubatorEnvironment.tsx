import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Sun, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

type EnvStatus = 'Optimal' | 'Slight Deviation' | 'Attention Needed';

interface EnvironmentData {
  temperature: number;
  humidity: number;
  lightExposure: number;
}

interface IncubatorEnvironmentProps {
  babyId?: string;
}

const STATUS_CONFIG: Record<EnvStatus, { badge: 'normal' | 'warning' | 'critical'; color: string; bg: string }> = {
  'Optimal': { badge: 'normal', color: 'text-status-normal', bg: 'bg-status-normal-bg' },
  'Slight Deviation': { badge: 'warning', color: 'text-status-warning', bg: 'bg-status-warning-bg' },
  'Attention Needed': { badge: 'critical', color: 'text-status-critical', bg: 'bg-status-critical-bg' },
};

function generateEnvironmentData(): EnvironmentData {
  return {
    temperature: 32 + (Math.random() - 0.5) * 4,
    humidity: 55 + (Math.random() - 0.5) * 20,
    lightExposure: 200 + Math.floor((Math.random() - 0.5) * 200),
  };
}

function getParamStatus(type: 'temperature' | 'humidity' | 'light', value: number): EnvStatus {
  switch (type) {
    case 'temperature':
      if (value >= 32 && value <= 34) return 'Optimal';
      if (value >= 30 && value <= 36) return 'Slight Deviation';
      return 'Attention Needed';
    case 'humidity':
      if (value >= 50 && value <= 60) return 'Optimal';
      if (value >= 40 && value <= 70) return 'Slight Deviation';
      return 'Attention Needed';
    case 'light':
      if (value >= 100 && value <= 300) return 'Optimal';
      if (value >= 50 && value <= 400) return 'Slight Deviation';
      return 'Attention Needed';
    default:
      return 'Optimal';
  }
}

function getOverallStatus(data: EnvironmentData): EnvStatus {
  const statuses = [
    getParamStatus('temperature', data.temperature),
    getParamStatus('humidity', data.humidity),
    getParamStatus('light', data.lightExposure),
  ];
  if (statuses.includes('Attention Needed')) return 'Attention Needed';
  if (statuses.includes('Slight Deviation')) return 'Slight Deviation';
  return 'Optimal';
}

const IncubatorEnvironment: React.FC<IncubatorEnvironmentProps> = () => {
  const [envData, setEnvData] = useState<EnvironmentData>(generateEnvironmentData());

  useEffect(() => {
    const interval = setInterval(() => {
      setEnvData(generateEnvironmentData());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = getOverallStatus(envData);
  const config = STATUS_CONFIG[overallStatus];

  const parameters = [
    {
      label: 'Incubator Temperature',
      value: envData.temperature.toFixed(1),
      unit: '°C',
      icon: Thermometer,
      status: getParamStatus('temperature', envData.temperature),
      normal: '32.0 – 34.0 °C',
      iconColor: 'text-chart-temp',
    },
    {
      label: 'Humidity',
      value: envData.humidity.toFixed(0),
      unit: '%',
      icon: Droplets,
      status: getParamStatus('humidity', envData.humidity),
      normal: '50 – 60 %',
      iconColor: 'text-chart-spo2',
    },
    {
      label: 'Light Exposure',
      value: envData.lightExposure.toFixed(0),
      unit: 'lux',
      icon: Sun,
      status: getParamStatus('light', envData.lightExposure),
      normal: '100 – 300 lux',
      iconColor: 'text-status-warning',
    },
  ];

  return (
    <Card className="card-medical overflow-hidden">
      <div className={cn(
        'h-1 w-full',
        overallStatus === 'Optimal' ? 'bg-status-normal' :
        overallStatus === 'Slight Deviation' ? 'bg-status-warning' : 'bg-status-critical'
      )} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Box className="w-4 h-4 text-primary" />
            </div>
            Incubator Environment
          </CardTitle>
          <Badge variant={config.badge} className="font-semibold">
            {overallStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {parameters.map((param) => {
          const Icon = param.icon;
          const pConfig = STATUS_CONFIG[param.status];
          return (
            <div key={param.label} className={cn('p-3 rounded-xl border', pConfig.bg, 'border-transparent')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-card shadow-sm">
                    <Icon className={cn('w-4 h-4', param.iconColor)} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{param.label}</p>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {param.value}
                      <span className="text-sm font-medium text-muted-foreground ml-1">{param.unit}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={pConfig.badge} className="text-xs mb-1">
                    {param.status}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground">Normal: {param.normal}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default IncubatorEnvironment;
