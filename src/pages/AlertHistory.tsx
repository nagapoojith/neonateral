import React from 'react';
import { useData } from '@/contexts/DataContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, Bell, AlertTriangle, AlertCircle, Check, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const AlertHistory = () => {
  const { alerts } = useData();

  // Sort alerts by timestamp (newest first)
  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-status-critical" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-status-warning" />;
      default:
        return <Bell className="w-4 h-4 text-status-normal" />;
    }
  };

  const getLevelVariant = (level: string): 'critical' | 'warning' | 'normal' => {
    switch (level) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'warning';
      default:
        return 'normal';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <History className="w-7 h-7" />
            Alert History
          </h1>
          <p className="text-muted-foreground">
            Complete log of all alerts and acknowledgments
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-medical">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Alerts</p>
              <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Critical Alerts</p>
              <p className="text-2xl font-bold text-status-critical">
                {alerts.filter((a) => a.level === 'critical').length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">High Priority</p>
              <p className="text-2xl font-bold text-status-warning">
                {alerts.filter((a) => a.level === 'high').length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Response Rate</p>
              <p className="text-2xl font-bold text-status-normal">
                {Math.round((alerts.filter((a) => a.acknowledged).length / alerts.length) * 100)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Table */}
        <Card className="card-medical overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">All Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Level</TableHead>
                    <TableHead>Baby</TableHead>
                    <TableHead className="hidden md:table-cell">Bed</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Message</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Acknowledged By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {getLevelIcon(alert.level)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{alert.babyName}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {alert.bedNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {alert.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs truncate text-muted-foreground">
                        {alert.message}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="whitespace-nowrap">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <Badge variant="normal" className="flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3" />
                            Done
                          </Badge>
                        ) : (
                          <Badge variant={getLevelVariant(alert.level)}>Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {alert.acknowledgedBy || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Accountability Log */}
        <Card className="card-medical">
          <CardHeader>
            <CardTitle className="text-lg">Escalation & Accountability Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedAlerts
                .filter((a) => a.escalationLevel > 0)
                .slice(0, 5)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getLevelVariant(alert.level)}>
                            {alert.level.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{alert.babyName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Escalation Level:</span> {alert.escalationLevel}
                          {alert.escalatedTo && (
                            <span className="ml-2">
                              <span className="font-medium">To:</span> {alert.escalatedTo.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{format(new Date(alert.timestamp), 'MMM d, yyyy')}</p>
                        <p>{format(new Date(alert.timestamp), 'HH:mm:ss')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {sortedAlerts.filter((a) => a.escalationLevel > 0).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No escalated alerts recorded
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AlertHistory;
