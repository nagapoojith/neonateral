import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, Baby, VitalSigns } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Thermometer, Wind, Activity, ChevronRight, Bell, BellOff, Bed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BabyCardProps {
  baby: Baby;
}

const BabyCard: React.FC<BabyCardProps> = ({ baby }) => {
  const { getCurrentVitals } = useData();
  const [vitals, setVitals] = useState<VitalSigns | null>(null);

  useEffect(() => {
    const updateVitals = () => {
      setVitals(getCurrentVitals(baby.id));
    };
    updateVitals();
    const interval = setInterval(updateVitals, 3000);
    return () => clearInterval(interval);
  }, [baby.id, getCurrentVitals]);

  const statusConfig = {
    critical: {
      variant: 'critical' as const,
      label: 'Critical',
      bgClass: 'bg-status-critical-bg border-status-critical/30',
      ringClass: 'ring-2 ring-status-critical/40',
      pulseClass: 'alert-pulse'
    },
    high: {
      variant: 'warning' as const,
      label: 'High Priority',
      bgClass: 'bg-status-warning-bg border-status-warning/30',
      ringClass: 'ring-2 ring-status-warning/30',
      pulseClass: ''
    },
    normal: {
      variant: 'normal' as const,
      label: 'Stable',
      bgClass: '',
      ringClass: '',
      pulseClass: ''
    }
  };

  const status = statusConfig[baby.status as keyof typeof statusConfig] || statusConfig.normal;

  const getVitalStatus = (type: string, value: number): 'normal' | 'warning' | 'critical' => {
    switch (type) {
      case 'heartRate':
        if (value < 100 || value > 180) return 'critical';
        if (value < 110 || value > 170) return 'warning';
        return 'normal';
      case 'spo2':
        if (value < 90) return 'critical';
        if (value < 94) return 'warning';
        return 'normal';
      case 'temperature':
        if (value < 36 || value > 38) return 'critical';
        if (value < 36.5 || value > 37.5) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const getStatusStyles = (vitalStatus: 'normal' | 'warning' | 'critical') => {
    switch (vitalStatus) {
      case 'critical':
        return 'text-status-critical font-bold';
      case 'warning':
        return 'text-status-warning font-bold';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Link to={`/baby/${baby.id}`} className="block">
      <Card 
        className={cn(
          'card-medical cursor-pointer group relative overflow-hidden',
          status.ringClass,
          status.pulseClass
        )}
      >
        <div className={cn(
          'absolute top-0 left-0 right-0 h-1 transition-all duration-300',
          baby.status === 'critical' ? 'bg-status-critical' :
          baby.status === 'high' ? 'bg-status-warning' : 'gradient-primary'
        )} />
        
        <CardContent className="p-5 pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm',
                baby.status === 'critical' ? 'bg-status-critical-bg' :
                baby.status === 'high' ? 'bg-status-warning-bg' : 'bg-primary/10'
              )}>
                <span className={cn(
                  'text-xl font-bold',
                  baby.status === 'critical' ? 'text-status-critical' :
                  baby.status === 'high' ? 'text-status-warning' : 'text-primary'
                )}>
                  {baby.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {baby.name}
                  </h3>
                  {baby.alertsEnabled ? (
                    <Bell className="w-3.5 h-3.5 text-status-normal" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Bed className="w-3.5 h-3.5" />
                  <span>Bed {baby.bedNumber}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="font-semibold shadow-sm">
                {status.label}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
            </div>
          </div>

          {vitals && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'heartRate', label: 'Heart Rate', value: vitals.heartRate, unit: 'bpm', icon: Heart, colorClass: 'text-chart-heart' },
                { type: 'spo2', label: 'SpO₂', value: vitals.spo2, unit: '%', icon: Wind, colorClass: 'text-chart-spo2' },
                { type: 'temperature', label: 'Temp', value: vitals.temperature, unit: '°C', icon: Thermometer, colorClass: 'text-chart-temp' },
                { type: 'movement', label: 'Activity', value: vitals.movement, unit: '%', icon: Activity, colorClass: 'text-chart-movement' },
              ].map((vital) => {
                const Icon = vital.icon;
                const vitalStatus = getVitalStatus(vital.type, vital.value);
                
                return (
                  <div 
                    key={vital.type} 
                    className={cn(
                      'vital-card relative',
                      vitalStatus === 'critical' && 'border-status-critical/30 bg-status-critical-bg/30',
                      vitalStatus === 'warning' && 'border-status-warning/30 bg-status-warning-bg/30'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={cn(
                        'w-4 h-4',
                        vitalStatus !== 'normal' ? 
                          vitalStatus === 'critical' ? 'text-status-critical' : 'text-status-warning' 
                          : vital.colorClass
                      )} />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{vital.label}</span>
                    </div>
                    <p className={cn('text-xl font-bold tabular-nums', getStatusStyles(vitalStatus))}>
                      {vital.value}
                      <span className="text-xs font-medium text-muted-foreground ml-1">{vital.unit}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {baby.behaviorBaseline && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Behavior Baseline</span>
                <Badge 
                  variant={baby.behaviorBaseline.isBaselineEstablished ? 'normal' : 'secondary'}
                  className="text-[10px] h-5"
                >
                  {baby.behaviorBaseline.isBaselineEstablished 
                    ? '✓ Established' 
                    : `${baby.behaviorBaseline.daysTracked}/4 days`}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default BabyCard;