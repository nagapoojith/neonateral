import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Sun, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  optimal: { label: 'Optimal', color: 'text-status-normal', bg: 'bg-status-normal-bg', icon: CheckCircle2 },
  slight_deviation: { label: 'Slight Deviation', color: 'text-status-warning', bg: 'bg-status-warning-bg', icon: AlertTriangle },
  attention_needed: { label: 'Attention Needed', color: 'text-status-critical', bg: 'bg-status-critical-bg', icon: AlertTriangle },
};

const NICUEnvironment = () => {
  const { babies } = useData();
  const [incubators, setIncubators] = useState<IncubatorData[]>([]);

  useEffect(() => {
    const generateData = () => {
      const data: IncubatorData[] = babies.map((baby) => {
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
        };
      });
      setIncubators(data);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NICU Incubator Overview</h1>
          <p className="text-muted-foreground">Real-time environmental conditions across all incubators</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={cn('card-medical border-l-4', overallCfg.color === 'text-status-normal' ? 'border-l-status-normal' : overallCfg.color === 'text-status-warning' ? 'border-l-status-warning' : 'border-l-status-critical')}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <OverallIcon className={cn('w-5 h-5', overallCfg.color)} />
                <span className="text-sm font-semibold text-muted-foreground">Overall Status</span>
              </div>
              <p className={cn('text-xl font-bold', overallCfg.color)}>{overallCfg.label}</p>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Optimal</p>
              <p className="text-3xl font-bold text-status-normal">{optimalCount}</p>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Slight Deviation</p>
              <p className="text-3xl font-bold text-status-warning">{deviationCount}</p>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Attention Needed</p>
              <p className="text-3xl font-bold text-status-critical">{attentionCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {incubators.map((inc) => {
            const cfg = statusConfig[inc.status];
            const StatusIcon = cfg.icon;
            return (
              <Card key={inc.id} className={cn('card-medical overflow-hidden', inc.status === 'attention_needed' && 'ring-2 ring-status-critical')}>
                <div className={cn('h-1', inc.status === 'optimal' ? 'gradient-primary' : inc.status === 'slight_deviation' ? 'bg-status-warning' : 'bg-status-critical')} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">{inc.babyName}</CardTitle>
                    <Badge variant={inc.status === 'optimal' ? 'normal' : inc.status === 'slight_deviation' ? 'warning' : 'critical'} className="text-xs">
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Bed {inc.bedNumber}</p>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-chart-temp" />
                        <span className="text-sm font-medium">Temperature</span>
                      </div>
                      <span className={cn('text-sm font-bold', inc.temperature < 32 || inc.temperature > 34 ? 'text-status-warning' : 'text-foreground')}>
                        {inc.temperature}°C
                      </span>
                    </div>
                    <Progress value={((inc.temperature - 28) / 10) * 100} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">Optimal: 32–34°C</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-chart-spo2" />
                        <span className="text-sm font-medium">Humidity</span>
                      </div>
                      <span className={cn('text-sm font-bold', inc.humidity < 50 || inc.humidity > 60 ? 'text-status-warning' : 'text-foreground')}>
                        {inc.humidity}%
                      </span>
                    </div>
                    <Progress value={inc.humidity} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">Optimal: 50–60%</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-chart-heart" />
                        <span className="text-sm font-medium">Light Exposure</span>
                      </div>
                      <span className={cn('text-sm font-bold', inc.lightExposure > 300 ? 'text-status-warning' : 'text-foreground')}>
                        {inc.lightExposure} lux
                      </span>
                    </div>
                    <Progress value={(inc.lightExposure / 500) * 100} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">Optimal: 100–300 lux</p>
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
