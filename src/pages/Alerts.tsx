import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AlertCard from '@/components/dashboard/AlertCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, AlertCircle, AlertTriangle, Check, Filter } from 'lucide-react';

const Alerts = () => {
  const { alerts } = useData();
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'normal'>('all');

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  const filteredUnacknowledged = filter === 'all'
    ? unacknowledgedAlerts
    : unacknowledgedAlerts.filter((a) => a.level === filter);

  const criticalCount = unacknowledgedAlerts.filter((a) => a.level === 'critical').length;
  const highCount = unacknowledgedAlerts.filter((a) => a.level === 'high').length;
  const normalCount = unacknowledgedAlerts.filter((a) => a.level === 'normal').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alert Center</h1>
            <p className="text-muted-foreground">
              Manage and acknowledge alerts from the monitoring system
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-medical">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                  <p className="text-2xl font-bold text-foreground">{unacknowledgedAlerts.length}</p>
                </div>
                <Bell className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-medical">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-status-critical">{criticalCount}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-status-critical" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-medical">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-status-warning">{highCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-status-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-medical">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Acknowledged</p>
                  <p className="text-2xl font-bold text-status-normal">{acknowledgedAlerts.length}</p>
                </div>
                <Check className="w-8 h-8 text-status-normal" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-2">Filter:</span>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({unacknowledgedAlerts.length})
          </Button>
          <Button
            variant={filter === 'critical' ? 'critical' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
          >
            Critical ({criticalCount})
          </Button>
          <Button
            variant={filter === 'high' ? 'warning' : 'outline'}
            size="sm"
            onClick={() => setFilter('high')}
          >
            High ({highCount})
          </Button>
          <Button
            variant={filter === 'normal' ? 'success' : 'outline'}
            size="sm"
            onClick={() => setFilter('normal')}
          >
            Normal ({normalCount})
          </Button>
        </div>

        {/* Alerts Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Pending
              {unacknowledgedAlerts.length > 0 && (
                <Badge variant="critical" className="ml-1">
                  {unacknowledgedAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="acknowledged" className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Acknowledged
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {filteredUnacknowledged.length > 0 ? (
              filteredUnacknowledged.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <Card className="card-medical">
                <CardContent className="p-8 text-center">
                  <Check className="w-12 h-12 text-status-normal mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Pending Alerts
                  </h3>
                  <p className="text-muted-foreground">
                    All alerts have been acknowledged. Great job!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="acknowledged" className="space-y-4">
            {acknowledgedAlerts.length > 0 ? (
              acknowledgedAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <Card className="card-medical">
                <CardContent className="p-8 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Acknowledged Alerts
                  </h3>
                  <p className="text-muted-foreground">
                    Acknowledged alerts will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Alert Escalation Info */}
        <Card className="card-medical">
          <CardHeader>
            <CardTitle className="text-lg">Alert Escalation System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-status-normal-bg">
                <Badge variant="normal" className="mb-2">Level 0</Badge>
                <p className="text-sm font-medium text-foreground">Initial Alert</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Alert sent to assigned nurse
                </p>
              </div>
              <div className="p-4 rounded-lg bg-status-warning-bg">
                <Badge variant="warning" className="mb-2">Level 1</Badge>
                <p className="text-sm font-medium text-foreground">Nurse Escalation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After 1 min: Alert all nurses on duty
                </p>
              </div>
              <div className="p-4 rounded-lg bg-status-critical-bg">
                <Badge variant="critical" className="mb-2">Level 2</Badge>
                <p className="text-sm font-medium text-foreground">Doctor Escalation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After 2 min: Alert senior doctors
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
