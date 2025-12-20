import React, { useState } from 'react';
import { Alert } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bell, AlertTriangle, AlertCircle, Clock, Check, ArrowUp, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, compact = false }) => {
  const { user } = useAuth();
  const { acknowledgeAlert, sendAlertEmail } = useData();
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      await acknowledgeAlert(alert.id, user.name);
    }
  };

  const handleSendEmail = async () => {
    if (!emailAddress) return;
    setIsSending(true);
    await sendAlertEmail(alert, emailAddress);
    setIsSending(false);
    setShowEmailInput(false);
    setEmailAddress('');
  };

  const levelIcon = {
    normal: Bell,
    high: AlertTriangle,
    critical: AlertCircle,
  };

  const Icon = levelIcon[alert.level];

  const levelVariant = alert.level === 'critical' 
    ? 'critical' 
    : alert.level === 'high' 
    ? 'warning' 
    : 'normal';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
          alert.acknowledged 
            ? 'bg-muted/30 border-border/50' 
            : alert.level === 'critical'
            ? 'bg-status-critical-bg border-status-critical/20 animate-pulse-soft'
            : alert.level === 'high'
            ? 'bg-status-warning-bg border-status-warning/20'
            : 'bg-status-normal-bg border-status-normal/20'
        )}
      >
        <div className={cn(
          'p-2 rounded-lg flex-shrink-0',
          alert.level === 'critical' ? 'bg-status-critical/10' :
          alert.level === 'high' ? 'bg-status-warning/10' : 'bg-status-normal/10'
        )}>
          <Icon className={cn(
            'w-4 h-4',
            alert.level === 'critical' ? 'text-status-critical' :
            alert.level === 'high' ? 'text-status-warning' : 'text-status-normal'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{alert.babyName}</p>
          <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
        </div>
        {!alert.acknowledged && (
          <Button size="sm" variant="ghost" onClick={handleAcknowledge} className="rounded-lg h-8 w-8 p-0">
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300 overflow-hidden',
        alert.acknowledged 
          ? 'bg-card border-border/50' 
          : alert.level === 'critical'
          ? 'bg-status-critical-bg/30 border-status-critical/20 animate-pulse-soft'
          : alert.level === 'high'
          ? 'bg-status-warning-bg/30 border-status-warning/20'
          : 'bg-status-normal-bg/30 border-status-normal/20'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            'p-3 rounded-xl flex-shrink-0',
            alert.level === 'critical' ? 'bg-status-critical/10' :
            alert.level === 'high' ? 'bg-status-warning/10' : 'bg-status-normal/10'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              alert.level === 'critical' ? 'text-status-critical' :
              alert.level === 'high' ? 'text-status-warning' : 'text-status-normal'
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-semibold text-foreground">{alert.babyName}</h4>
                <p className="text-sm text-muted-foreground">Bed: {alert.bedNumber}</p>
              </div>
              <Badge variant={levelVariant}>
                {alert.level === 'critical' ? 'Critical' : alert.level === 'high' ? 'High' : 'Normal'}
              </Badge>
            </div>
            
            <p className="text-sm text-foreground mb-4 leading-relaxed">{alert.message}</p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
              </div>
              <Badge variant="outline" className="text-xs rounded-md">
                {alert.type}
              </Badge>
            </div>

            {/* Escalation indicator */}
            {alert.escalationLevel > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-status-warning-bg/50 border border-status-warning/20">
                <div className="flex items-center gap-2 text-xs">
                  <ArrowUp className="w-3.5 h-3.5 text-status-warning" />
                  <span className="font-semibold text-status-warning">
                    Escalated Level {alert.escalationLevel}
                  </span>
                </div>
                {alert.escalatedTo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    To: {alert.escalatedTo.join(', ')}
                  </p>
                )}
              </div>
            )}

            {alert.acknowledged ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-status-normal">
                <div className="p-1 rounded-md bg-status-normal/10">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">Acknowledged by {alert.acknowledgedBy}</span>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    className={cn(
                      'rounded-xl h-9 gap-1.5',
                      alert.level === 'critical' 
                        ? 'bg-status-critical hover:bg-status-critical/90' 
                        : alert.level === 'high'
                        ? 'bg-status-warning hover:bg-status-warning/90'
                        : ''
                    )}
                    onClick={handleAcknowledge}
                  >
                    <Check className="w-4 h-4" />
                    Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-9 gap-1.5"
                    onClick={() => setShowEmailInput(!showEmailInput)}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                </div>
                {showEmailInput && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="h-9 text-sm rounded-xl"
                    />
                    <Button
                      size="sm"
                      className="rounded-xl h-9"
                      onClick={handleSendEmail}
                      disabled={isSending || !emailAddress}
                    >
                      {isSending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertCard;