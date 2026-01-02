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
  Shield,
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
          <div className="p-6 rounded-3xl bg-muted/50 mb-6">
            <AlertTriangle className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Patient not found</h2>
          <p className="text-muted-foreground mb-6">The requested patient record does not exist.</p>
          <Link to="/dashboard">
            <Button className="gap-2 btn-medical rounded-xl h-11">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = {
    critical: { variant: 'critical' as const, label: 'Critical' },
    high: { variant: 'warning' as const, label: 'High Priority' },
    normal: { variant: 'normal' as const, label: 'Stable' }
  };

  const status = statusConfig[baby.status as keyof typeof statusConfig] || statusConfig.normal;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted h-11 w-11">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg',
                baby.status === 'critical' ? 'bg-status-critical' :
                baby.status === 'high' ? 'bg-status-warning' : 'gradient-primary'
              )}>
                <span className="text-2xl font-bold text-primary-foreground">
                  {baby.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{baby.name}</h1>
                  <Badge variant={status.variant} className="font-semibold shadow-sm">
                    {status.label}
                  </Badge>
                  {!baby.alertsEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      Alerts Disabled
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <Bed className="w-4 h-4" />
                  <span className="text-sm font-medium">Bed {baby.bedNumber}</span>
                </div>
              </div>
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
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-critical-bg border border-status-critical/30 alert-pulse">
                <AlertTriangle className="w-5 h-5 text-status-critical" />
                <span className="font-bold text-status-critical">
                  {babyAlerts.length} Active Alert{babyAlerts.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {currentVitals && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                type: 'heartRate',
                label: 'Heart Rate',
                value: currentVitals.heartRate,
                unit: 'bpm',
                normal: '120-160 bpm',
                icon: Heart,
                colorClass: 'text-chart-heart',
                bgClass: 'bg-chart-heart/10',
              },
              {
                type: 'spo2',
                label: 'SpO₂',
                value: currentVitals.spo2,
                unit: '%',
                normal: '95-100%',
                icon: Wind,
                colorClass: 'text-chart-spo2',
                bgClass: 'bg-chart-spo2/10',
              },
              {
                type: 'temperature',
                label: 'Temperature',
                value: currentVitals.temperature,
                unit: '°C',
                normal: '36.5-37.5°C',
                icon: Thermometer,
                colorClass: 'text-chart-temp',
                bgClass: 'bg-chart-temp/10',
              },
              {
                type: 'movement',
                label: 'Movement',
                value: currentVitals.movement,
                unit: '%',
                normal: 'Activity level',
                icon: Activity,
                colorClass: 'text-chart-movement',
                bgClass: 'bg-chart-movement/10',
              },
            ].map((vital) => {
              const Icon = vital.icon;
              const vitalStatus = getVitalStatus(vital.type, vital.value);
              
              return (
                <Card 
                  key={vital.type}
                  className={cn(
                    'card-medical overflow-hidden relative',
                    vitalStatus === 'critical' && 'ring-2 ring-status-critical alert-pulse',
                    vitalStatus === 'warning' && 'ring-2 ring-status-warning'
                  )}
                >
                  <div className={cn(
                    'absolute top-0 left-0 right-0 h-1',
                    vitalStatus === 'critical' ? 'bg-status-critical' :
                    vitalStatus === 'warning' ? 'bg-status-warning' : 'gradient-primary'
                  )} />
                  <CardContent className="p-5 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        'p-3 rounded-xl shadow-sm',
                        vitalStatus === 'critical' ? 'bg-status-critical-bg' :
                        vitalStatus === 'warning' ? 'bg-status-warning-bg' : vital.bgClass
                      )}>
                        <Icon className={cn(
                          'w-5 h-5',
                          vitalStatus === 'critical' ? 'text-status-critical' :
                          vitalStatus === 'warning' ? 'text-status-warning' : vital.colorClass
                        )} />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">{vital.label}</span>
                    </div>
                    <p className={cn(
                      'text-4xl font-bold tabular-nums',
                      vitalStatus === 'critical' ? 'text-status-critical' :
                      vitalStatus === 'warning' ? 'text-status-warning' : 'text-foreground'
                    )}>
                      {vital.value}
                      <span className="text-sm font-medium text-muted-foreground ml-1">{vital.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Normal: {vital.normal}</p>
                  </CardContent>
                </Card>
              );
            })}

            <Card className={cn(
              'card-medical overflow-hidden relative',
              getPositionStatus(currentVitals.sleepingPosition) === 'critical' && 'ring-2 ring-status-critical alert-pulse',
              getPositionStatus(currentVitals.sleepingPosition) === 'warning' && 'ring-2 ring-status-warning'
            )}>
              <div className={cn(
                'absolute top-0 left-0 right-0 h-1',
                getPositionStatus(currentVitals.sleepingPosition) === 'critical' ? 'bg-status-critical' :
                getPositionStatus(currentVitals.sleepingPosition) === 'warning' ? 'bg-status-warning' : 'gradient-primary'
              )} />
              <CardContent className="p-5 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'p-3 rounded-xl shadow-sm',
                    getPositionStatus(currentVitals.sleepingPosition) === 'critical' ? 'bg-status-critical-bg' :
                    getPositionStatus(currentVitals.sleepingPosition) === 'warning' ? 'bg-status-warning-bg' : 'bg-primary/10'
                  )}>
                    <User className={cn(
                      'w-5 h-5',
                      getPositionStatus(currentVitals.sleepingPosition) === 'critical' ? 'text-status-critical' :
                      getPositionStatus(currentVitals.sleepingPosition) === 'warning' ? 'text-status-warning' : 'text-primary'
                    )} />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">Position</span>
                </div>
                <p className={cn(
                  'text-3xl font-bold capitalize',
                  getPositionStatus(currentVitals.sleepingPosition) === 'critical' ? 'text-status-critical' :
                  getPositionStatus(currentVitals.sleepingPosition) === 'warning' ? 'text-status-warning' : 'text-foreground'
                )}>
                  {currentVitals.sleepingPosition}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Recommended: Back</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="vitals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="vitals" className="gap-2 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="w-4 h-4" />
              Vitals History
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <User className="w-4 h-4" />
              Patient Info
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
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
              <Card className="card-medical overflow-hidden">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {[
                    { icon: Bed, label: 'Bed Number', value: baby.bedNumber },
                    { icon: Calendar, label: 'Date of Birth', value: baby.dateOfBirth },
                    { icon: Clock, label: 'Time of Birth', value: baby.timeOfBirth },
                    { icon: Users, label: 'Parents', value: baby.parentNames },
                    { icon: Phone, label: 'Contact', value: baby.parentContact },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="p-2.5 rounded-xl bg-muted">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                          <p className="font-semibold text-foreground">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="card-medical overflow-hidden">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    Behavior Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {baby.behaviorBaseline ? (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground">Baseline Status</span>
                        <Badge variant={baby.behaviorBaseline.isBaselineEstablished ? 'normal' : 'secondary'} className="font-semibold">
                          {baby.behaviorBaseline.isBaselineEstablished ? '✓ Established' : 'Learning...'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground">Days Tracked</span>
                        <span className="font-bold text-foreground">{baby.behaviorBaseline.daysTracked} / 4 days</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground">Avg Movement</span>
                        <span className="font-bold text-foreground">{baby.behaviorBaseline.avgMovement}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground">Avg Heart Rate</span>
                        <span className="font-bold text-foreground">{baby.behaviorBaseline.avgHeartRate} bpm</span>
                      </div>
                      
                      <div className="pt-4 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sleep Pattern</p>
                        <div className="flex gap-2">
                          {baby.behaviorBaseline.sleepPatterns.map((pattern, index) => (
                            <div 
                              key={index}
                              className="flex-1 h-16 rounded-xl bg-primary/10 relative overflow-hidden"
                            >
                              <div 
                                className="absolute bottom-0 left-0 right-0 gradient-primary transition-all rounded-b-xl"
                                style={{ height: `${pattern}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="p-5 rounded-2xl bg-muted mb-4">
                        <TrendingUp className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Not Initialized</p>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Behavior tracking will begin shortly
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