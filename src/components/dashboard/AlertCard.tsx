import React, { useState } from 'react';
import { Alert } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bell, AlertTriangle, AlertCircle, Clock, Check, ArrowUp, Mail, CheckCircle2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

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
  const [emailSent, setEmailSent] = useState(false);

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      await acknowledgeAlert(alert.id, user.name);
      toast.success('Alert acknowledged successfully');
    }
  };

  const handleSendEmail = async () => {
    if (!emailAddress) return;
    setIsSending(true);
    await sendAlertEmail(alert, emailAddress);
    setIsSending(false);
    setShowEmailInput(false);
    setEmailAddress('');
    setEmailSent(true);
    toast.success('Alert email successfully sent to assigned staff', {
      description: `Delivery Status: Sent to ${emailAddress}`,
      icon: <CheckCircle2 className="w-4 h-4 text-status-normal" />
    });
  };

  const levelConfig = {
    critical: {
      icon: AlertCircle,
      variant: 'critical' as const,
      label: 'Critical',
      bgClass: 'bg-status-critical-bg border-status-critical/30',
      iconBgClass: 'bg-status-critical/15',
      iconClass: 'text-status-critical'
    },
    high: {
      icon: AlertTriangle,
      variant: 'warning' as const,
      label: 'High Priority',
      bgClass: 'bg-status-warning-bg border-status-warning/30',
      iconBgClass: 'bg-status-warning/15',
      iconClass: 'text-status-warning'
    },
    normal: {
      icon: Bell,
      variant: 'normal' as const,
      label: 'Normal',
      bgClass: 'bg-status-normal-bg border-status-normal/30',
      iconBgClass: 'bg-status-normal/15',
      iconClass: 'text-status-normal'
    }
  };

  const config = levelConfig[alert.level as keyof typeof levelConfig] || levelConfig.normal;
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-sm',
          alert.acknowledged 
            ? 'bg-muted/30 border-border/50' 
            : config.bgClass,
          alert.level === 'critical' && !alert.acknowledged && 'alert-pulse'
        )}
      >
        <div className={cn('p-2.5 rounded-xl flex-shrink-0', config.iconBgClass)}>
          <Icon className={cn('w-4 h-4', config.iconClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{alert.babyName}</p>
            <Badge variant={config.variant} className="text-[10px] h-4 px-1.5">{config.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.message}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
        {!alert.acknowledged && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleAcknowledge} 
            className="rounded-xl h-8 w-8 p-0 hover:bg-status-normal/10"
          >
            <Check className="w-4 h-4 text-status-normal" />
          </Button>
        )}
        {alert.acknowledged && (
          <div className="p-1.5 rounded-lg bg-status-normal/10">
            <CheckCircle2 className="w-4 h-4 text-status-normal" />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300 overflow-hidden border-2',
        alert.acknowledged 
          ? 'bg-card border-border/50' 
          : config.bgClass,
        alert.level === 'critical' && !alert.acknowledged && 'alert-pulse'
      )}
    >
      <div className={cn(
        'h-1.5 w-full',
        alert.level === 'critical' ? 'bg-status-critical' :
        alert.level === 'high' ? 'bg-status-warning' : 'bg-status-normal'
      )} />
      
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn('p-3 rounded-2xl flex-shrink-0 shadow-sm', config.iconBgClass)}>
            <Icon className={cn('w-6 h-6', config.iconClass)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="font-bold text-lg text-foreground">{alert.babyName}</h4>
                <p className="text-sm text-muted-foreground">Bed: {alert.bedNumber}</p>
              </div>
              <Badge variant={config.variant} className="font-semibold shadow-sm">
                {config.label}
              </Badge>
            </div>
            
            <p className="text-sm text-foreground mb-4 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
              {alert.message}
            </p>
            
            <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
              </div>
              <Badge variant="outline" className="text-[10px] rounded-lg font-semibold">
                {alert.type}
              </Badge>
              {emailSent && (
                <div className="flex items-center gap-1.5 bg-status-normal-bg px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-normal" />
                  <span className="font-semibold text-status-normal">Email Sent</span>
                </div>
              )}
            </div>

            {alert.escalationLevel > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-status-warning-bg/70 border border-status-warning/30">
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-1.5 rounded-lg bg-status-warning/15">
                    <ArrowUp className="w-4 h-4 text-status-warning" />
                  </div>
                  <span className="font-bold text-status-warning">
                    Escalated to Level {alert.escalationLevel}
                  </span>
                </div>
                {alert.escalatedTo && (
                  <p className="text-xs text-muted-foreground mt-2 ml-9">
                    Notified: {alert.escalatedTo.join(', ')}
                  </p>
                )}
              </div>
            )}

            {alert.acknowledged ? (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-status-normal-bg/70 border border-status-normal/30">
                <div className="p-1.5 rounded-lg bg-status-normal/15">
                  <CheckCircle2 className="w-4 h-4 text-status-normal" />
                </div>
                <span className="text-sm font-semibold text-status-normal">
                  Acknowledged by {alert.acknowledgedBy}
                </span>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    className={cn(
                      'rounded-xl h-10 gap-2 font-semibold shadow-sm',
                      alert.level === 'critical' 
                        ? 'btn-critical' 
                        : alert.level === 'high'
                        ? 'bg-status-warning hover:bg-status-warning/90 text-primary-foreground'
                        : 'btn-medical'
                    )}
                    onClick={handleAcknowledge}
                  >
                    <Check className="w-4 h-4" />
                    Acknowledge Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-10 gap-2 font-semibold border-2"
                    onClick={() => setShowEmailInput(!showEmailInput)}
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </Button>
                </div>
                {showEmailInput && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter recipient email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="h-9 text-sm rounded-lg border-0 bg-transparent focus-visible:ring-0"
                    />
                    <Button
                      size="sm"
                      className="rounded-lg h-9 gap-1.5 btn-medical"
                      onClick={handleSendEmail}
                      disabled={isSending || !emailAddress}
                    >
                      <Send className="w-3.5 h-3.5" />
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