import React from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BabyCard from '@/components/dashboard/BabyCard';
import AlertCard from '@/components/dashboard/AlertCard';
import BehaviorComparison from '@/components/charts/BehaviorComparison';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Baby, AlertCircle, Activity, Heart, CheckCircle2, Shield, TrendingUp, Users } from 'lucide-react';
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
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">NICU Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-semibold text-primary">{user?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{stats.total} Patients</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card group">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl gradient-primary shadow-lg group-hover:shadow-xl transition-shadow">
                    <Baby className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-status-normal opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Total Patients</p>
                <p className="text-4xl font-bold text-foreground">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card group">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-status-normal shadow-lg group-hover:shadow-xl transition-shadow">
                    <Heart className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <Badge variant="normal" className="text-xs font-bold">Stable</Badge>
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Normal</p>
                <p className="text-4xl font-bold text-status-normal">{stats.normal}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card group">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-status-warning shadow-lg group-hover:shadow-xl transition-shadow">
                    <Activity className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <Badge variant="warning" className="text-xs font-bold">Monitor</Badge>
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">High Priority</p>
                <p className="text-4xl font-bold text-status-warning">{stats.high}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card group">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-status-critical shadow-lg group-hover:shadow-xl transition-shadow">
                    <AlertCircle className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <Badge variant="critical" className="text-xs font-bold animate-pulse">Alert</Badge>
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Critical</p>
                <p className="text-4xl font-bold text-status-critical">{stats.critical}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Monitored Patients</h2>
                <p className="text-sm text-muted-foreground">Real-time vital signs monitoring</p>
              </div>
              <div className="live-indicator">
                <span>Auto-refresh 3s</span>
              </div>
            </div>
            
            {babies.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {babies.map((baby) => (
                  <BabyCard key={baby.id} baby={baby} />
                ))}
              </div>
            ) : (
              <Card className="card-medical">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-2xl bg-muted mb-4">
                    <Baby className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-1">No patients registered</p>
                  <p className="text-sm text-muted-foreground">Register a new patient to begin monitoring</p>
                </CardContent>
              </Card>
            )}

            {babies.length > 0 && <BehaviorComparison babies={babies} />}
          </div>

          <div className="space-y-6">
            <Card className="card-medical overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-status-critical/10">
                      <AlertCircle className="w-4 h-4 text-status-critical" />
                    </div>
                    Recent Alerts
                  </CardTitle>
                  <Link 
                    to="/alerts" 
                    className="text-sm text-primary font-semibold hover:underline"
                  >
                    View all →
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {recentAlerts.length > 0 ? (
                  recentAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} compact />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="p-4 rounded-2xl bg-status-normal-bg mb-3">
                      <CheckCircle2 className="w-8 h-8 text-status-normal" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">All Clear</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      No pending alerts at this time
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-medical overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[
                  { label: 'Monitoring Status', value: 'Active', status: 'normal' as const },
                  { label: 'Alert Escalation', value: 'Enabled', status: 'normal' as const },
                  { label: 'Email Notifications', value: 'Connected', status: 'normal' as const },
                  { label: 'Automatic Alerts', value: 'Active', status: 'normal' as const },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-status-normal animate-pulse" />
                      <span className="text-sm font-semibold text-status-normal">{item.value}</span>
                    </div>
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