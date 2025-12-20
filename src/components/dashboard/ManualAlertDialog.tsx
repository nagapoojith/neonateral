import React, { useState } from 'react';
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
import { AlertTriangle, Bell, AlertCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualAlertDialogProps {
  babyId: string;
  babyName: string;
  bedNumber: string;
}

type AlertType = 'normal' | 'high' | 'critical';

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

  // Only doctors and nurses can send manual alerts
  const canSendAlert = user?.role === 'doctor' || user?.role === 'nurse' || user?.role === 'senior_doctor';

  if (!canSendAlert) {
    return null;
  }

  const handleSendAlert = async () => {
    if (!reason.trim()) {
      toast.error('Please enter a reason for the alert');
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
          is_acknowledged: false,
          escalation_level: 0,
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // 2. Optionally trigger email notification (to the user who created it as confirmation)
      // This uses the existing send-alert-email edge function
      if (user?.email) {
        try {
          await supabase.functions.invoke('send-alert-email', {
            body: {
              to: user.email,
              babyName,
              bedNumber,
              alertType,
              message: `Manual Alert: ${reason}`,
              timestamp: new Date().toLocaleString(),
            },
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      toast.success('Manual alert sent successfully');
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
        <Button variant="outline" className="gap-2 border-status-warning/30 text-status-warning hover:bg-status-warning-bg hover:text-status-warning">
          <AlertTriangle className="w-4 h-4" />
          Send Manual Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-status-warning" />
            Send Manual Alert
          </DialogTitle>
          <DialogDescription>
            Send a manual alert for <span className="font-medium text-foreground">{babyName}</span> (Bed {bedNumber}).
            This will notify the medical team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alert Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Alert Priority</Label>
            <RadioGroup
              value={alertType}
              onValueChange={(value) => setAlertType(value as AlertType)}
              className="space-y-2"
            >
              {alertTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      alertType === option.value
                        ? `border-current ${option.bgColor} ${option.color}`
                        : 'border-border hover:border-muted-foreground/30'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <div className={cn('p-2 rounded-lg', option.bgColor)}>
                      <Icon className={cn('w-4 h-4', option.color)} />
                    </div>
                    <div className="flex-1">
                      <p className={cn('font-medium', alertType === option.value && option.color)}>
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    {alertType === option.value && (
                      <div className={cn('w-2 h-2 rounded-full', option.color.replace('text-', 'bg-'))} />
                    )}
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Alert
            </Label>
            <Textarea
              id="reason"
              placeholder="Describe the reason for this alert..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/500 characters
            </p>
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