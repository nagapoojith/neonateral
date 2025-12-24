import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, Baby, VitalSigns } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Thermometer, Wind, Activity, ChevronRight, Bell, BellOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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

  const statusVariant = baby.status === 'critical' 
    ? 'critical' 
    : baby.status === 'high' 
    ? 'warning' 
    : 'normal';

  const statusLabel = baby.status === 'critical' 
    ? 'Critical' 
    : baby.status === 'high' 
    ? 'High Priority' 
    : 'Normal';

  const getVitalColor = (type: string, value: number) => {
    switch (type) {
      case 'heartRate':
        if (value < 100 || value > 180) return 'text-status-critical';
        if (value < 110 || value > 170) return 'text-status-warning';
        return 'text-foreground';
      case 'spo2':
        if (value < 90) return 'text-status-critical';
        if (value < 94) return 'text-status-warning';
        return 'text-foreground';
      case 'temperature':
        if (value < 36 || value > 38) return 'text-status-critical';
        if (value < 36.5 || value > 37.5) return 'text-status-warning';
        return 'text-foreground';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Link to={`/baby/${baby.id}`}>
      <Card 
        className={cn(
          'card-medical cursor-pointer hover:scale-[1.01] transition-all duration-300 group',
          baby.status === 'critical' && 'ring-2 ring-status-critical/50 animate-pulse-soft'
        )}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                  {baby.name}
                </h3>
                {/* Alert Status Indicator */}
                {baby.alertsEnabled ? (
                  <Bell className="w-3.5 h-3.5 text-status-normal" />
                ) : (
                  <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Bed: {baby.bedNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Vitals Grid */}
          {vitals && (
            <div className="grid grid-cols-2 gap-3">
              <div className="vital-card">
                <div className="flex items-center gap-2 mb-1.5">
                  <Heart className="w-4 h-4 text-chart-heart" />
                  <span className="text-xs font-medium text-muted-foreground">Heart Rate</span>
                </div>
                <p className={cn('text-xl font-bold', getVitalColor('heartRate', vitals.heartRate))}>
                  {vitals.heartRate}
                  <span className="text-sm font-normal text-muted-foreground ml-1">bpm</span>
                </p>
              </div>

              <div className="vital-card">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wind className="w-4 h-4 text-chart-spo2" />
                  <span className="text-xs font-medium text-muted-foreground">SpO₂</span>
                </div>
                <p className={cn('text-xl font-bold', getVitalColor('spo2', vitals.spo2))}>
                  {vitals.spo2}
                  <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
                </p>
              </div>

              <div className="vital-card">
                <div className="flex items-center gap-2 mb-1.5">
                  <Thermometer className="w-4 h-4 text-chart-temp" />
                  <span className="text-xs font-medium text-muted-foreground">Temp</span>
                </div>
                <p className={cn('text-xl font-bold', getVitalColor('temperature', vitals.temperature))}>
                  {vitals.temperature}
                  <span className="text-sm font-normal text-muted-foreground ml-1">°C</span>
                </p>
              </div>

              <div className="vital-card">
                <div className="flex items-center gap-2 mb-1.5">
                  <Activity className="w-4 h-4 text-chart-movement" />
                  <span className="text-xs font-medium text-muted-foreground">Movement</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {vitals.movement}
                  <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
                </p>
              </div>
            </div>
          )}

          {baby.behaviorBaseline && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Behavior Baseline</span>
                <Badge 
                  variant={baby.behaviorBaseline.isBaselineEstablished ? 'normal' : 'secondary'}
                  className="text-xs"
                >
                  {baby.behaviorBaseline.isBaselineEstablished 
                    ? 'Established' 
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