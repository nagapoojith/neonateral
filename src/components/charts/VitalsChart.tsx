import React from 'react';
import { VitalSigns } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VitalsChartProps {
  data: VitalSigns[];
  type: 'heartRate' | 'spo2' | 'temperature' | 'movement';
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
    <Card className="card-medical">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className="text-right">
            <span 
              className={`text-2xl font-bold ${isOutOfRange ? 'text-status-critical' : 'text-foreground'}`}
            >
              {currentValue}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
          </div>
        </div>
        {normalRange && (
          <p className="text-xs text-muted-foreground">
            Normal: {normalRange.min} - {normalRange.max} {unit}
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                domain={normalRange ? [normalRange.min - 10, normalRange.max + 10] : ['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.timestamp || ''}
                formatter={(value: number) => [`${value} ${unit}`, title]}
              />
              {normalRange && (
                <>
                  <ReferenceLine 
                    y={normalRange.min} 
                    stroke="hsl(var(--status-warning))" 
                    strokeDasharray="5 5" 
                  />
                  <ReferenceLine 
                    y={normalRange.max} 
                    stroke="hsl(var(--status-warning))" 
                    strokeDasharray="5 5" 
                  />
                </>
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VitalsChart;
