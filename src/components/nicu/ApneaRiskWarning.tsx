import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wind, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VitalSigns } from '@/contexts/DataContext';

type BreathingStatus = 'Normal' | 'Observe' | 'Attention Required';

interface ApneaRiskWarningProps {
  vitalsHistory: VitalSigns[];
  currentVitals: VitalSigns | null;
}

const STATUS_CONFIG: Record<BreathingStatus, { color: string; bg: string; icon: React.ElementType; badgeVariant: 'normal' | 'warning' | 'critical' }> = {
  'Normal': { color: 'text-status-normal', bg: 'bg-status-normal-bg', icon: CheckCircle2, badgeVariant: 'normal' },
  'Observe': { color: 'text-status-warning', bg: 'bg-status-warning-bg', icon: Eye, badgeVariant: 'warning' },
  'Attention Required': { color: 'text-status-critical', bg: 'bg-status-critical-bg', icon: AlertTriangle, badgeVariant: 'critical' },
};

const ApneaRiskWarning: React.FC<ApneaRiskWarningProps> = ({ vitalsHistory, currentVitals }) => {
  const analysis = useMemo(() => {
    if (!currentVitals || vitalsHistory.length < 3) {
      return { status: 'Normal' as BreathingStatus, details: [], respirationTrend: [] };
    }

    const recentReadings = vitalsHistory.slice(-10);
    const details: string[] = [];
    let riskScore = 0;

    const lowRespCount = recentReadings.filter(v => v.respirationRate < 30).length;
    if (lowRespCount >= 3) {
      riskScore += 3;
      details.push(`Low respiration rate detected in ${lowRespCount} of last ${recentReadings.length} readings`);
    } else if (lowRespCount >= 1) {
      riskScore += 1;
      details.push(`Occasional low respiration rate observed`);
    }

    const lowSpo2Count = recentReadings.filter(v => v.spo2 < 92).length;
    if (lowSpo2Count >= 3) {
      riskScore += 3;
      details.push(`Reduced oxygen saturation in ${lowSpo2Count} consecutive readings`);
    } else if (lowSpo2Count >= 1) {
      riskScore += 1;
      details.push(`Brief reduction in oxygen saturation noted`);
    }

    const respVariance = recentReadings.reduce((acc, v, i, arr) => {
      if (i === 0) return 0;
      return acc + Math.abs(v.respirationRate - arr[i - 1].respirationRate);
    }, 0) / Math.max(recentReadings.length - 1, 1);

    if (respVariance > 15) {
      riskScore += 2;
      details.push(`Irregular breathing pattern detected (high variability)`);
    }

    if (currentVitals.respirationRate < 25) {
      riskScore += 3;
      details.push(`Current respiration rate is critically low: ${currentVitals.respirationRate}/min`);
    }

    if (currentVitals.spo2 < 90) {
      riskScore += 3;
      details.push(`Current SpO₂ is critically low: ${currentVitals.spo2}%`);
    }

    let status: BreathingStatus = 'Normal';
    if (riskScore >= 5) status = 'Attention Required';
    else if (riskScore >= 2) status = 'Observe';

    if (details.length === 0) {
      details.push('Breathing pattern is within expected parameters');
    }

    const respirationTrend = recentReadings.map(v => v.respirationRate);

    return { status, details, respirationTrend };
  }, [vitalsHistory, currentVitals]);

  const config = STATUS_CONFIG[analysis.status];
  const StatusIcon = config.icon;

  return (
    <Card className="card-medical overflow-hidden">
      <div className={cn(
        'h-1 w-full',
        analysis.status === 'Normal' ? 'bg-status-normal' :
        analysis.status === 'Observe' ? 'bg-status-warning' : 'bg-status-critical'
      )} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wind className="w-4 h-4 text-primary" />
            </div>
            Breathing Status
          </CardTitle>
          <Badge variant={config.badgeVariant} className="font-semibold">
            {analysis.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn('p-4 rounded-xl flex items-start gap-3', config.bg)}>
          <StatusIcon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.color)} />
          <div className="space-y-1">
            {analysis.details.map((detail, i) => (
              <p key={i} className="text-sm text-foreground">{detail}</p>
            ))}
          </div>
        </div>

        {currentVitals && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground">Respiration Rate</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {currentVitals.respirationRate}
                <span className="text-sm font-medium text-muted-foreground ml-1">/min</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground">SpO₂</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {currentVitals.spo2}
                <span className="text-sm font-medium text-muted-foreground ml-1">%</span>
              </p>
            </div>
          </div>
        )}

        {analysis.respirationTrend.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Recent Trend (last {analysis.respirationTrend.length} readings)</p>
            <div className="flex items-end gap-1 h-12">
              {analysis.respirationTrend.map((value, i) => {
                const height = Math.max(10, ((value - 20) / 50) * 100);
                const isLow = value < 30;
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 rounded-t transition-all',
                      isLow ? 'bg-status-critical/60' : 'bg-primary/40'
                    )}
                    style={{ height: `${Math.min(100, height)}%` }}
                    title={`${value}/min`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApneaRiskWarning;
