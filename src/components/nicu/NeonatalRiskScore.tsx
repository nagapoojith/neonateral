import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VitalSigns } from '@/contexts/DataContext';
import type { CryResult } from './CryDetection';

type RiskCategory = 'Stable' | 'Monitor' | 'Attention Needed' | 'Critical';

interface NeonatalRiskScoreProps {
  currentVitals: VitalSigns | null;
  cryResult?: CryResult | null;
  environmentStatus?: 'Optimal' | 'Slight Deviation' | 'Attention Needed';
}

const CATEGORY_CONFIG: Record<RiskCategory, { badge: 'normal' | 'warning' | 'critical' | 'secondary'; color: string; bg: string }> = {
  'Stable': { badge: 'normal', color: 'text-status-normal', bg: 'bg-status-normal-bg' },
  'Monitor': { badge: 'secondary', color: 'text-chart-spo2', bg: 'bg-primary/5' },
  'Attention Needed': { badge: 'warning', color: 'text-status-warning', bg: 'bg-status-warning-bg' },
  'Critical': { badge: 'critical', color: 'text-status-critical', bg: 'bg-status-critical-bg' },
};

const NeonatalRiskScore: React.FC<NeonatalRiskScoreProps> = ({
  currentVitals,
  cryResult,
  environmentStatus = 'Optimal',
}) => {
  const { score, category, factors } = useMemo(() => {
    if (!currentVitals) {
      return { score: 0, category: 'Stable' as RiskCategory, factors: [] };
    }

    let riskScore = 0;
    const factors: { label: string; contribution: number; status: 'good' | 'warn' | 'bad' }[] = [];

    const hr = currentVitals.heartRate;
    if (hr < 80 || hr > 160) {
      riskScore += 25;
      factors.push({ label: 'Heart Rate', contribution: 25, status: 'bad' });
    } else if (hr < 100 || hr > 150) {
      riskScore += 10;
      factors.push({ label: 'Heart Rate', contribution: 10, status: 'warn' });
    } else {
      factors.push({ label: 'Heart Rate', contribution: 0, status: 'good' });
    }

    const spo2 = currentVitals.spo2;
    if (spo2 < 90) {
      riskScore += 25;
      factors.push({ label: 'SpO₂', contribution: 25, status: 'bad' });
    } else if (spo2 < 94) {
      riskScore += 10;
      factors.push({ label: 'SpO₂', contribution: 10, status: 'warn' });
    } else {
      factors.push({ label: 'SpO₂', contribution: 0, status: 'good' });
    }

    const resp = currentVitals.respirationRate;
    if (resp < 30 || resp > 60) {
      riskScore += 20;
      factors.push({ label: 'Respiration', contribution: 20, status: 'bad' });
    } else if (resp < 35 || resp > 55) {
      riskScore += 8;
      factors.push({ label: 'Respiration', contribution: 8, status: 'warn' });
    } else {
      factors.push({ label: 'Respiration', contribution: 0, status: 'good' });
    }

    if (cryResult) {
      if (cryResult.classification === 'pain') {
        riskScore += 15;
        factors.push({ label: 'Cry Detection', contribution: 15, status: 'bad' });
      } else if (cryResult.classification === 'discomfort') {
        riskScore += 8;
        factors.push({ label: 'Cry Detection', contribution: 8, status: 'warn' });
      } else {
        factors.push({ label: 'Cry Detection', contribution: 0, status: 'good' });
      }
    }

    if (environmentStatus === 'Attention Needed') {
      riskScore += 15;
      factors.push({ label: 'Environment', contribution: 15, status: 'bad' });
    } else if (environmentStatus === 'Slight Deviation') {
      riskScore += 5;
      factors.push({ label: 'Environment', contribution: 5, status: 'warn' });
    } else {
      factors.push({ label: 'Environment', contribution: 0, status: 'good' });
    }

    riskScore = Math.min(100, riskScore);

    let category: RiskCategory = 'Stable';
    if (riskScore >= 70) category = 'Critical';
    else if (riskScore >= 45) category = 'Attention Needed';
    else if (riskScore >= 20) category = 'Monitor';

    return { score: riskScore, category, factors };
  }, [currentVitals, cryResult, environmentStatus]);

  const config = CATEGORY_CONFIG[category];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const scoreColor = score >= 70 ? 'hsl(var(--status-critical))' :
    score >= 45 ? 'hsl(var(--status-warning))' :
    score >= 20 ? 'hsl(var(--chart-spo2))' : 'hsl(var(--status-normal))';

  return (
    <Card className="card-medical overflow-hidden">
      <div className={cn(
        'h-1 w-full',
        category === 'Stable' ? 'bg-status-normal' :
        category === 'Monitor' ? 'bg-primary' :
        category === 'Attention Needed' ? 'bg-status-warning' : 'bg-status-critical'
      )} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            Neonatal Risk Score
          </CardTitle>
          <Badge variant={config.badge} className="font-semibold">
            {category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-bold', config.color)}>{score}</span>
              <span className="text-[10px] font-medium text-muted-foreground">/100</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {factors.map((factor) => (
              <div key={factor.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    factor.status === 'good' ? 'bg-status-normal' :
                    factor.status === 'warn' ? 'bg-status-warning' : 'bg-status-critical'
                  )} />
                  <span className="text-xs font-medium text-muted-foreground">{factor.label}</span>
                </div>
                <span className={cn(
                  'text-xs font-bold tabular-nums',
                  factor.contribution === 0 ? 'text-status-normal' :
                  factor.contribution <= 10 ? 'text-status-warning' : 'text-status-critical'
                )}>
                  +{factor.contribution}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/30">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Risk score is assistive and not a medical diagnosis. It combines multiple monitoring parameters to provide an overview for clinical staff.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NeonatalRiskScore;
