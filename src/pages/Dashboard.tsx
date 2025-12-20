import React from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BabyCard from '@/components/dashboard/BabyCard';
import AlertCard from '@/components/dashboard/AlertCard';
import BehaviorComparison from '@/components/charts/BehaviorComparison';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Baby, AlertCircle, Activity, Heart, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { babies, alerts } = useData();
  const { user } = useAuth();

  const stats = {
    total: babies.length,
    normal: babies.filter((b) => b.status === 'normal').length,
    high: babies.filter((b) => b.status === 'high').length,
    critical: babies.filter((b) => b.status === 'critical').length,
  };

  const recentAlerts = alerts
    .filter((a) => !a.acknowledged)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">NICU Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-semibold text-primary">{user?.name}</span>. Real-time monitoring overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm px-4 py-2 rounded-full border-status-normal/40 bg-status-normal-bg shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-status-normal mr-2 animate-pulse" />
              <span className="text-status-normal font-semibold">Live Monitoring</span>
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-medical overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Babies</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Baby className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-medical overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Normal</p>
                  <p className="text-3xl font-bold text-status-normal mt-1">{stats.normal}</p>
                </div>
                <div className="p-3 rounded-2xl bg-status-normal-bg">
                  <Heart className="w-6 h-6 text-status-normal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-medical overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                  <p className="text-3xl font-bold text-status-warning mt-1">{stats.high}</p>
                </div>
                <div className="p-3 rounded-2xl bg-status-warning-bg">
                  <Activity className="w-6 h-6 text-status-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-medical overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-3xl font-bold text-status-critical mt-1">{stats.critical}</p>
                </div>
                <div className="p-3 rounded-2xl bg-status-critical-bg">
                  <AlertCircle className="w-6 h-6 text-status-critical" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Baby Cards - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Monitored Babies</h2>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                Updated every 3 seconds
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {babies.map((baby) => (
                <BabyCard key={baby.id} baby={baby} />
              ))}
            </div>

            {/* Behavior Comparison */}
            <BehaviorComparison babies={babies} />
          </div>

          {/* Recent Alerts - 1 column */}
          <div className="space-y-4">
            <Card className="card-medical">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Recent Alerts</CardTitle>
                  <Link 
                    to="/alerts" 
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAlerts.length > 0 ? (
                  recentAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} compact />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-3 rounded-2xl bg-status-normal-bg mb-3">
                      <CheckCircle2 className="w-6 h-6 text-status-normal" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      No pending alerts
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="card-medical">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Monitoring Status', value: 'Active', variant: 'normal' as const },
                  { label: 'Alert Escalation', value: 'Enabled', variant: 'normal' as const },
                  { label: 'Behavior Tracking', value: 'Running', variant: 'normal' as const },
                  { label: 'Scheduled Checks', value: '1hr / 30min', variant: 'secondary' as const },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <Badge variant={item.variant}>{item.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;