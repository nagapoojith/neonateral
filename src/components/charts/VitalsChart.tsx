import React from 'react';
import { VitalSigns } from '@/contexts/DataContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VitalsChartProps {
  data: VitalSigns[];
  type: 'heartRate' | 'respirationRate' | 'spo2' | 'temperature' | 'movement';
  title: string;
  color: string;
  unit: string;
  normalRange?: { min: number; max: number };
}

const VitalsChart: React.FC<VitalsChartProps> = ({
  data,
  type,
  title,
  color,
  unit,
  normalRange,
}) => {
  const chartData = data.map((d, index) => ({
    time: index,
    value: d[type],
    timestamp: new Date(d.timestamp).toLocaleTimeString(),
  }));

  const currentValue = chartData[chartData.length - 1]?.value ?? 0;
  const isOutOfRange = normalRange && (currentValue < normalRange.min || currentValue > normalRange.max);

  return (
    <Card className="card-medical overflow-hidden">
      <div className={cn(
        'h-1 w-full',
        isOutOfRange ? 'bg-status-critical' : 'gradient-primary'
      )} />
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
          <div className="text-right">
            <span 
              className={cn(
                'text-3xl font-bold tabular-nums',
                isOutOfRange ? 'text-status-critical' : 'text-foreground'
              )}
            >
              {currentValue}
            </span>
            <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>
          </div>
        </div>
        {normalRange && (
          <p className="text-xs font-medium text-muted-foreground mt-1">
            Normal range: {normalRange.min} - {normalRange.max} {unit}
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" vertical={false} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }}
                tickLine={false}
                axisLine={false}
                domain={normalRange ? [normalRange.min - 10, normalRange.max + 10] : ['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(210 20% 90%)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  boxShadow: '0 4px 12px hsl(215 25% 15% / 0.1)',
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.timestamp || ''}
                formatter={(value: number) => [`${value} ${unit}`, title]}
              />
              {normalRange && (
                <>
                  <ReferenceLine 
                    y={normalRange.min} 
                    stroke="hsl(38 95% 50%)" 
                    strokeDasharray="6 4" 
                    strokeWidth={1.5}
                  />
                  <ReferenceLine 
                    y={normalRange.max} 
                    stroke="hsl(38 95% 50%)" 
                    strokeDasharray="6 4" 
                    strokeWidth={1.5}
                  />
                </>
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#gradient-${type})`}
                dot={false}
                activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VitalsChart;