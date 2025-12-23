import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  BellOff,
  Mail,
  Plus,
  Trash2,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertRecipient {
  id: string;
  email: string;
  recipient_name: string | null;
  is_active: boolean;
}

interface AlertControlPanelProps {
  babyId: string;
  babyName: string;
  alertsEnabled: boolean;
  lastAlertSentAt?: string | null;
}

const AlertControlPanel: React.FC<AlertControlPanelProps> = ({
  babyId,
  babyName,
  alertsEnabled: initialAlertsEnabled,
  lastAlertSentAt,
}) => {
  const { toggleBabyAlerts } = useData();
  const [alertsEnabled, setAlertsEnabled] = useState(initialAlertsEnabled);
  const [recipients, setRecipients] = useState<AlertRecipient[]>([]);
  const [newEmails, setNewEmails] = useState<string[]>(['', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAlertsEnabled(initialAlertsEnabled);
  }, [initialAlertsEnabled]);

  useEffect(() => {
    fetchRecipients();
  }, [babyId]);

  const fetchRecipients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('alert_recipients')
        .select('*')
        .eq('baby_id', babyId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAlerts = async () => {
    const newValue = !alertsEnabled;
    setAlertsEnabled(newValue);
    
    try {
      await toggleBabyAlerts(babyId, newValue);
      toast.success(
        newValue 
          ? 'Automatic alerts enabled - emails will be sent when vitals are abnormal' 
          : 'Automatic alerts disabled - no automatic emails will be sent'
      );
    } catch (error) {
      setAlertsEnabled(!newValue);
      toast.error('Failed to update alert settings');
    }
  };

  const handleAddRecipients = async () => {
    const validEmails = newEmails.filter(email => {
      const trimmed = email.trim();
      return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    });

    if (validEmails.length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    setIsSaving(true);
    try {
      const insertData = validEmails.map(email => ({
        baby_id: babyId,
        email: email.trim().toLowerCase(),
        is_active: true,
      }));

      const { error } = await supabase
        .from('alert_recipients')
        .upsert(insertData, { onConflict: 'baby_id,email' });

      if (error) throw error;

      toast.success(`${validEmails.length} recipient(s) added successfully`);
      setNewEmails(['', '', '', '', '']);
      fetchRecipients();
    } catch (error: any) {
      console.error('Error adding recipients:', error);
      toast.error('Failed to add recipients');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveRecipient = async (recipientId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('alert_recipients')
        .delete()
        .eq('id', recipientId);

      if (error) throw error;

      toast.success(`Removed ${email} from recipients`);
      fetchRecipients();
    } catch (error) {
      console.error('Error removing recipient:', error);
      toast.error('Failed to remove recipient');
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const updated = [...newEmails];
    updated[index] = value;
    setNewEmails(updated);
  };

  const formatLastAlertTime = () => {
    if (!lastAlertSentAt) return 'No alerts sent yet';
    const date = new Date(lastAlertSentAt);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Alert Toggle Section */}
      <Card className="card-medical overflow-hidden">
        <div className={cn(
          'absolute inset-x-0 top-0 h-1',
          alertsEnabled ? 'bg-status-normal' : 'bg-muted-foreground/30'
        )} />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2.5 rounded-xl transition-colors',
                alertsEnabled ? 'bg-status-normal-bg' : 'bg-muted'
              )}>
                {alertsEnabled ? (
                  <Bell className="w-5 h-5 text-status-normal" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <span className="text-lg font-semibold">Alert Control</span>
                <p className="text-sm font-normal text-muted-foreground mt-0.5">
                  {babyName}
                </p>
              </div>
            </div>
            <Switch
              checked={alertsEnabled}
              onCheckedChange={handleToggleAlerts}
              className="data-[state=checked]:bg-status-normal"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn(
            'p-4 rounded-xl border transition-colors',
            alertsEnabled 
              ? 'bg-status-normal-bg/50 border-status-normal/20' 
              : 'bg-muted/50 border-border'
          )}>
            <div className="flex items-start gap-3">
              {alertsEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-status-normal mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
              )}
              <div>
                <p className={cn(
                  'font-medium',
                  alertsEnabled ? 'text-status-normal' : 'text-muted-foreground'
                )}>
                  {alertsEnabled ? 'Automatic Alerts Enabled' : 'Automatic Alerts Disabled'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {alertsEnabled 
                    ? 'Email alerts will be sent automatically when vitals go outside safe ranges.'
                    : 'No automatic email alerts will be sent. UI monitoring continues normally.'}
                </p>
              </div>
            </div>
          </div>

          {/* Last Alert Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Last alert sent: {formatLastAlertTime()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Email Recipients Section */}
      <Card className="card-medical">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-semibold">Alert Recipients</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Manage who receives alert emails
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Recipients */}
          {recipients.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Current Recipients ({recipients.length})
              </Label>
              <div className="space-y-2">
                {recipients.map((recipient) => (
                  <div 
                    key={recipient.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{recipient.email}</p>
                        {recipient.recipient_name && (
                          <p className="text-xs text-muted-foreground">{recipient.recipient_name}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveRecipient(recipient.id, recipient.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipients.length === 0 && !isLoading && (
            <div className="p-6 rounded-xl bg-status-warning-bg/50 border border-status-warning/20 text-center">
              <AlertTriangle className="w-8 h-8 text-status-warning mx-auto mb-2" />
              <p className="font-medium text-status-warning">No Recipients Configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add email addresses below to receive alerts
              </p>
            </div>
          )}

          {/* Add New Recipients */}
          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Recipients (up to 5)
            </Label>
            <div className="grid gap-3">
              {newEmails.map((email, index) => (
                <Input
                  key={index}
                  type="email"
                  placeholder={`Email address ${index + 1} (e.g., nurse${index + 1}@hospital.com)`}
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  className="bg-background"
                />
              ))}
            </div>
            <Button
              onClick={handleAddRecipients}
              disabled={isSaving || !newEmails.some(e => e.trim())}
              className="w-full gap-2 btn-medical"
            >
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Recipients
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> When automatic alerts are enabled, all recipients listed above 
              will receive email notifications when vital signs go outside safe ranges. 
              Manual alerts can also be sent to all recipients.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertControlPanel;