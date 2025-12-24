import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData, VitalSigns } from '@/contexts/DataContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import VitalsChart from '@/components/charts/VitalsChart';
import ManualAlertDialog from '@/components/dashboard/ManualAlertDialog';
import AlertControlPanel from '@/components/dashboard/AlertControlPanel';
import DeleteBabyDialog from '@/components/dashboard/DeleteBabyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Heart,
  Wind,
  Thermometer,
  Activity,
  Calendar,
  Clock,
  Phone,
  Users,
  Bed,
  TrendingUp,
  AlertTriangle,
  Settings2,
  BarChart3,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BabyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { babies, getVitalsHistory, getCurrentVitals, alerts } = useData();
  const [vitalsHistory, setVitalsHistory] = useState<VitalSigns[]>([]);
  const [currentVitals, setCurrentVitals] = useState<VitalSigns | null>(null);

  const baby = babies.find((b) => b.id === id);
  const babyAlerts = alerts.filter((a) => a.babyId === id && !a.acknowledged);

  useEffect(() => {
    if (!id) return;

    const updateData = () => {
      setVitalsHistory(getVitalsHistory(id));
      setCurrentVitals(getCurrentVitals(id));
    };

    updateData();
    const interval = setInterval(updateData, 3000);
    return () => clearInterval(interval);
  }, [id, getVitalsHistory, getCurrentVitals]);

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

  const getPositionStatus = (position: string): 'normal' | 'warning' | 'critical' => {
    if (position === 'prone') return 'critical';
    if (position === 'side') return 'warning';
    return 'normal';
  };

  if (!baby) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="p-6 rounded-2xl bg-muted/50 mb-6">
            <AlertTriangle className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Baby not found</h2>
          <p className="text-muted-foreground mb-6">The requested baby record does not exist.</p>
          <Link to="/dashboard">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{baby.name}</h1>
                <Badge variant={statusVariant} className="text-sm">
                  {statusLabel}
                </Badge>
                {!baby.alertsEnabled && (
                  <Badge variant="secondary" className="text-xs">
                    Alerts Off
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Bed: {baby.bedNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <ManualAlertDialog 
              babyId={baby.id} 
              babyName={baby.name} 
              bedNumber={baby.bedNumber} 
            />
            <DeleteBabyDialog babyId={baby.id} babyName={baby.name} />
            {babyAlerts.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-critical-bg animate-pulse-soft">
                <AlertTriangle className="w-5 h-5 text-status-critical" />
                <span className="font-medium text-status-critical">
                  {babyAlerts.length} Active Alert{babyAlerts.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {currentVitals && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                type: 'heartRate',
                label: 'Heart Rate',
                value: currentVitals.heartRate,
                unit: 'bpm',
                normal: '120-160 bpm',
                icon: Heart,
                color: 'chart-heart',
              },
              {
                type: 'spo2',
                label: 'SpO₂',
                value: currentVitals.spo2,
                unit: '%',
                normal: '95-100%',
                icon: Wind,
                color: 'chart-spo2',
              },
              {
                type: 'temperature',
                label: 'Temperature',
                value: currentVitals.temperature,
                unit: '°C',
                normal: '36.5-37.5°C',
                icon: Thermometer,
                color: 'chart-temp',
              },
              {
                type: 'movement',
                label: 'Movement',
                value: currentVitals.movement,
                unit: '%',
                normal: 'Activity level',
                icon: Activity,
                color: 'chart-movement',
              },
            ].map((vital) => {
              const Icon = vital.icon;
              const status = getVitalStatus(vital.type, vital.value);
              
              return (
                <Card 
                  key={vital.type}
                  className={cn(
                    'card-medical overflow-hidden',
                    status === 'critical' && 'ring-2 ring-status-critical',
                    status === 'warning' && 'ring-2 ring-status-warning'
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        'p-2.5 rounded-xl',
                        status === 'critical' ? 'bg-status-critical-bg' :
                        status === 'warning' ? 'bg-status-warning-bg' :
                        `bg-${vital.color}/10`
                      )}>
                        <Icon className={cn(
                          'w-5 h-5',
                          status === 'critical' ? 'text-status-critical' :
                          status === 'warning' ? 'text-status-warning' :
                          `text-${vital.color}`
                        )} />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{vital.label}</span>
                    </div>
                    <p className={cn(
                      'text-3xl font-bold',
                      status === 'critical' ? 'text-status-critical' :
                      status === 'warning' ? 'text-status-warning' :
                      'text-foreground'
                    )}>
                      {vital.value}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{vital.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Normal: {vital.normal}</p>
                  </CardContent>
                </Card>
              );
            })}

            <Card className={cn(
              'card-medical overflow-hidden',
              getPositionStatus(currentVitals.sleepingPosition) === 'critical' && 'ring-2 ring-status-critical',
              getPositionStatus(currentVitals.sleepingPosition) === 'warning' && 'ring-2 ring-status-warning'
            )}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    'p-2.5 rounded-xl',
                    getPositionStatus(currentVitals.sleepingPosition) === 'critical' ? 'bg-status-critical-bg' :
                    getPositionStatus(currentVitals.sleepingPosition) === 'warning' ? 'bg-status-warning-bg' :
                    'bg-primary/10'
                  )}>
                    <User className={cn(
                      'w-5 h-5',
                      getPositionStatus(currentVitals.sleepingPosition) === 'critical' ? 'text-status-critical' :
                      getPositionStatus(currentVitals.sleepingPosition) === 'warning' ? 'text-status-warning' :
                      'text-primary'
                    )} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Position</span>
                </div>
                <p className={cn(
                  'text-2xl font-bold capitalize',
                  getPositionStatus(currentVitals.sleepingPosition) === 'critical' ? 'text-status-critical' :
                  getPositionStatus(currentVitals.sleepingPosition) === 'warning' ? 'text-status-warning' :
                  'text-foreground'
                )}>
                  {currentVitals.sleepingPosition}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Recommended: Back</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="vitals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="vitals" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Vitals History
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <User className="w-4 h-4" />
              Baby Info
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Alert Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vitals" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <VitalsChart
                data={vitalsHistory}
                type="heartRate"
                title="Heart Rate"
                color="hsl(var(--chart-heart))"
                unit="bpm"
                normalRange={{ min: 120, max: 160 }}
              />
              <VitalsChart
                data={vitalsHistory}
                type="spo2"
                title="SpO₂ Level"
                color="hsl(var(--chart-spo2))"
                unit="%"
                normalRange={{ min: 95, max: 100 }}
              />
              <VitalsChart
                data={vitalsHistory}
                type="temperature"
                title="Body Temperature"
                color="hsl(var(--chart-temp))"
                unit="°C"
                normalRange={{ min: 36.5, max: 37.5 }}
              />
              <VitalsChart
                data={vitalsHistory}
                type="movement"
                title="Movement Activity"
                color="hsl(var(--chart-movement))"
                unit="%"
              />
            </div>
          </TabsContent>

          <TabsContent value="info">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="card-medical">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Baby Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: Bed, label: 'Bed Number', value: baby.bedNumber },
                    { icon: Calendar, label: 'Date of Birth', value: baby.dateOfBirth },
                    { icon: Clock, label: 'Time of Birth', value: baby.timeOfBirth },
                    { icon: Users, label: 'Parents', value: baby.parentNames },
                    { icon: Phone, label: 'Contact', value: baby.parentContact },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-muted">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="font-medium text-foreground">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="card-medical">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    Behavior Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {baby.behaviorBaseline ? (
                    <>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Baseline Status</span>
                        <Badge variant={baby.behaviorBaseline.isBaselineEstablished ? 'normal' : 'secondary'}>
                          {baby.behaviorBaseline.isBaselineEstablished ? 'Established' : 'Learning'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Days Tracked</span>
                        <span className="font-medium">{baby.behaviorBaseline.daysTracked} / 4 days</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Avg Movement</span>
                        <span className="font-medium">{baby.behaviorBaseline.avgMovement}%</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Avg Heart Rate</span>
                        <span className="font-medium">{baby.behaviorBaseline.avgHeartRate} bpm</span>
                      </div>
                      
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-3">Sleep Pattern (last 4 readings)</p>
                        <div className="flex gap-2">
                          {baby.behaviorBaseline.sleepPatterns.map((pattern, index) => (
                            <div 
                              key={index}
                              className="flex-1 h-12 rounded-lg bg-primary/10 relative overflow-hidden"
                            >
                              <div 
                                className="absolute bottom-0 left-0 right-0 bg-primary/60 transition-all rounded-b-lg"
                                style={{ height: `${pattern}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="p-4 rounded-2xl bg-muted mb-4">
                        <TrendingUp className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-center">
                        Behavior tracking not initialized
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <AlertControlPanel
              babyId={baby.id}
              babyName={baby.name}
              alertsEnabled={baby.alertsEnabled}
              lastAlertSentAt={baby.lastAlertSentAt}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BabyDetail;