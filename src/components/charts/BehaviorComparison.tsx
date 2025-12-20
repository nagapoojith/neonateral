import React from 'react';
import { Baby } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

interface BehaviorComparisonProps {
  babies: Baby[];
}

const BehaviorComparison: React.FC<BehaviorComparisonProps> = ({ babies }) => {
  const { getCurrentVitals } = useData();

  const comparisonData = babies.map((baby) => {
    const vitals = getCurrentVitals(baby.id);
    const baseline = baby.behaviorBaseline;
    const currentMovement = vitals?.movement ?? 0;
    const avgMovement = baseline?.avgMovement ?? currentMovement;
    const deviation = avgMovement > 0 ? ((currentMovement - avgMovement) / avgMovement) * 100 : 0;

    return {
      name: baby.name.replace('Baby ', ''),
      bedNumber: baby.bedNumber,
      currentMovement,
      baselineMovement: avgMovement,
      deviation: Math.round(deviation),
      isAbnormal: Math.abs(deviation) > 30,
      status: baby.status,
    };
  });

  const abnormalBabies = comparisonData.filter((d) => d.isAbnormal);
  const avgMovement = comparisonData.reduce((sum, d) => sum + d.currentMovement, 0) / comparisonData.length;

  return (
    <Card className="card-medical">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Multi-Baby Behavior Comparison</CardTitle>
          {abnormalBabies.length > 0 && (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {abnormalBabies.length} Abnormal
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Comparing movement patterns across all monitored babies
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Movement %', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name === 'currentMovement' ? 'Current' : 'Baseline',
                ]}
              />
              <ReferenceLine 
                y={avgMovement} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Avg', 
                  position: 'right',
                  style: { fontSize: 10, fill: 'hsl(var(--primary))' }
                }}
              />
              <Bar 
                dataKey="currentMovement" 
                fill="hsl(var(--chart-movement))"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="baselineMovement" 
                fill="hsl(var(--muted))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Abnormal behavior list */}
        {abnormalBabies.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-status-warning-bg">
            <p className="text-sm font-medium text-status-warning mb-2">
              Babies with Abnormal Behavior Patterns:
            </p>
            <div className="space-y-1">
              {abnormalBabies.map((baby) => (
                <div key={baby.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{baby.name} ({baby.bedNumber})</span>
                  <span className={baby.deviation > 0 ? 'text-status-warning' : 'text-status-critical'}>
                    {baby.deviation > 0 ? '+' : ''}{baby.deviation}% deviation
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BehaviorComparison;
