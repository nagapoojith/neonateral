import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Bell, AlertCircle, Send, Sparkles, Heart, Thermometer, Activity, Users, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualAlertDialogProps {
  babyId: string;
  babyName: string;
  bedNumber: string;
}

type AlertType = 'normal' | 'high' | 'critical';

interface Vitals {
  heartRate?: number;
  spo2?: number;
  temperature?: number;
  movement?: number;
  sleepingPosition?: string;
}

interface Recipient {
  id: string;
  email: string;
  recipient_name: string | null;
}

const ManualAlertDialog: React.FC<ManualAlertDialogProps> = ({
  babyId,
  babyName,
  bedNumber,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('normal');
  const [reason, setReason] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // Only doctors and nurses can send manual alerts
  const canSendAlert = user?.role === 'doctor' || user?.role === 'nurse' || user?.role === 'senior_doctor';

  // Fetch latest vitals and recipients when dialog opens
  useEffect(() => {
    if (open && babyId) {
      fetchLatestVitals();
      fetchRecipients();
    }
  }, [open, babyId]);

  const fetchLatestVitals = async () => {
    setLoadingVitals(true);
    try {
      const { data, error } = await supabase
        .from('vitals')
        .select('heart_rate, spo2, temperature, movement, sleeping_position')
        .eq('baby_id', babyId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setVitals({
          heartRate: data.heart_rate,
          spo2: data.spo2,
          temperature: data.temperature,
          movement: data.movement || undefined,
          sleepingPosition: data.sleeping_position || 'back',
        });
      }
    } catch (error) {
      console.error('Error fetching vitals:', error);
    } finally {
      setLoadingVitals(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_recipients')
        .select('id, email, recipient_name')
        .eq('baby_id', babyId)
        .eq('is_active', true);

      if (data && !error) {
        setRecipients(data);
        setSelectedRecipients(data.map(r => r.email));
      }
    } catch (error) {
      console.error('Error fetching recipients:', error);
    }
  };

  if (!canSendAlert) {
    return null;
  }

  const handleRecipientToggle = (email: string) => {
    setSelectedRecipients(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleSendAlert = async () => {
    if (!reason.trim()) {
      toast.error('Please enter a reason for the alert');
      return;
    }

    // Determine which emails to send to
    let emailTargets: string[] = [];
    if (sendToAll) {
      emailTargets = recipients.length > 0 
        ? recipients.map(r => r.email)
        : (user?.email ? [user.email] : []);
    } else {
      emailTargets = selectedRecipients.length > 0 
        ? selectedRecipients 
        : (user?.email ? [user.email] : []);
    }

    if (emailTargets.length === 0) {
      toast.error('No recipients available. Please add recipients in Alert Settings.');
      return;
    }

    setIsSending(true);

    try {
      // 1. Insert alert into database
      const { data: alertData, error: alertError } = await supabase
        .from('alerts')
        .insert({
          baby_id: babyId,
          alert_type: alertType,
          message: `Manual Alert: ${reason}`,
          trigger_reason: reason,
          is_acknowledged: false,
          escalation_level: 0,
          vitals_snapshot: vitals as any,
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // 2. Send email to all selected recipients
      const emailPromises = emailTargets.map(async (recipientEmail) => {
        try {
          const { error } = await supabase.functions.invoke('send-alert-email', {
            body: {
              to: recipientEmail,
              babyName,
              babyId,
              bedNumber,
              alertType,
              message: `Manual Alert: ${reason}`,
              triggerReason: reason,
              timestamp: new Date().toLocaleString(),
              vitals: vitals || undefined,
            },
          });

          if (error) {
            console.error(`Email to ${recipientEmail} failed:`, error);
            return { email: recipientEmail, success: false };
          }
          return { email: recipientEmail, success: true };
        } catch (emailError) {
          console.error(`Email to ${recipientEmail} failed:`, emailError);
          return { email: recipientEmail, success: false };
        }
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Alert sent to ${successCount} recipient(s)`, {
          description: failCount > 0 ? `${failCount} email(s) failed` : 'All emails sent successfully',
          icon: <Sparkles className="w-4 h-4 text-primary" />,
        });
      } else if (failCount > 0) {
        toast.warning('Alert created but emails failed to send');
      }

      toast.success('Manual alert created successfully');
      setOpen(false);
      setReason('');
      setAlertType('normal');
    } catch (error) {
      console.error('Error sending manual alert:', error);
      toast.error('Failed to send manual alert');
    } finally {
      setIsSending(false);
    }
  };

  const alertTypeOptions = [
    {
      value: 'normal',
      label: 'Normal',
      description: 'Standard notification',
      icon: Bell,
      color: 'text-status-normal',
      bgColor: 'bg-status-normal-bg',
    },
    {
      value: 'high',
      label: 'High Priority',
      description: 'Urgent attention needed',
      icon: AlertTriangle,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning-bg',
    },
    {
      value: 'critical',
      label: 'Critical',
      description: 'Immediate action required',
      icon: AlertCircle,
      color: 'text-status-critical',
      bgColor: 'bg-status-critical-bg',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-status-warning/30 text-status-warning hover:bg-status-warning-bg hover:text-status-warning shadow-sm">
          <AlertTriangle className="w-4 h-4" />
          Send Manual Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-status-warning-bg">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
            </div>
            <div>
              <span>Send Manual Alert</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-xs font-normal text-muted-foreground">AI-powered email generation</span>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="pt-2">
            Alert for <span className="font-semibold text-foreground">{babyName}</span> • Bed {bedNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Current Vitals Display */}
          {vitals && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Current Vitals (will be included in email)
              </p>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 rounded-lg bg-background">
                  <Heart className="w-4 h-4 mx-auto text-red-500 mb-1" />
                  <p className="text-sm font-bold text-foreground">{vitals.heartRate || '—'}</p>
                  <p className="text-[10px] text-muted-foreground">BPM</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background">
                  <div className="w-4 h-4 mx-auto text-primary mb-1 flex items-center justify-center text-xs font-bold">O₂</div>
                  <p className="text-sm font-bold text-foreground">{vitals.spo2 || '—'}%</p>
                  <p className="text-[10px] text-muted-foreground">SpO₂</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background">
                  <Thermometer className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                  <p className="text-sm font-bold text-foreground">{vitals.temperature || '—'}°</p>
                  <p className="text-[10px] text-muted-foreground">Temp</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background">
                  <Activity className="w-4 h-4 mx-auto text-green-500 mb-1" />
                  <p className="text-sm font-bold text-foreground">{vitals.movement || '—'}</p>
                  <p className="text-[10px] text-muted-foreground">Move</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background">
                  <div className="w-4 h-4 mx-auto text-primary mb-1 flex items-center justify-center text-[10px] font-bold">🛏️</div>
                  <p className="text-sm font-bold text-foreground capitalize">{vitals.sleepingPosition || 'back'}</p>
                  <p className="text-[10px] text-muted-foreground">Pos</p>
                </div>
              </div>
            </div>
          )}

          {/* Alert Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Alert Priority</Label>
            <RadioGroup
              value={alertType}
              onValueChange={(value) => setAlertType(value as AlertType)}
              className="grid grid-cols-3 gap-2"
            >
              {alertTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all text-center',
                      alertType === option.value
                        ? `border-current ${option.bgColor} ${option.color} shadow-sm`
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <div className={cn('p-2.5 rounded-xl', option.bgColor)}>
                      <Icon className={cn('w-5 h-5', option.color)} />
                    </div>
                    <div>
                      <p className={cn('font-semibold text-sm', alertType === option.value && option.color)}>
                        {option.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Alert Details
            </Label>
            <Textarea
              id="reason"
              placeholder="Describe the clinical observations or concerns..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none border-border/60 focus:border-primary"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                AI will generate medical assessment
              </p>
              <p className="text-xs text-muted-foreground">
                {reason.length}/500
              </p>
            </div>
          </div>

          {/* Recipients Section */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Recipients
              </Label>
              <span className="text-xs text-muted-foreground">
                {recipients.length > 0 ? `${recipients.length} configured` : 'None configured'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendToAll"
                checked={sendToAll}
                onCheckedChange={(checked) => setSendToAll(checked as boolean)}
              />
              <label
                htmlFor="sendToAll"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Send to all recipients
              </label>
            </div>

            {!sendToAll && recipients.length > 0 && (
              <div className="space-y-2 pl-6">
                {recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={recipient.id}
                      checked={selectedRecipients.includes(recipient.email)}
                      onCheckedChange={() => handleRecipientToggle(recipient.email)}
                    />
                    <label
                      htmlFor={recipient.id}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {recipient.email}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {recipients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No recipients configured. Add recipients in Alert Settings tab. Alert will be sent to your email.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendAlert}
            disabled={isSending || !reason.trim()}
            className={cn(
              'flex-1 gap-2',
              alertType === 'critical' && 'bg-status-critical hover:bg-status-critical/90',
              alertType === 'high' && 'bg-status-warning hover:bg-status-warning/90'
            )}
          >
            {isSending ? (
              'Sending...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Alert
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAlertDialog;