import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertRecipient {
  id: string;
  email: string;
  mobile_number: string | null;
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
  const [newRecipients, setNewRecipients] = useState<{ email: string; mobile: string }[]>([
    { email: '', mobile: '' },
    { email: '', mobile: '' },
    { email: '', mobile: '' },
    { email: '', mobile: '' },
    { email: '', mobile: '' },
  ]);
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
          ? 'Automatic alerts enabled - emails and SMS will be sent when vitals are abnormal' 
          : 'Automatic alerts disabled - no automatic notifications will be sent'
      );
    } catch (error) {
      setAlertsEnabled(!newValue);
      toast.error('Failed to update alert settings');
    }
  };

  const handleAddRecipients = async () => {
    const validRecipients = newRecipients.filter(r => {
      const trimmedEmail = r.email.trim();
      const trimmedMobile = r.mobile.trim();
      const isEmailValid = trimmedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
      const isMobileValid = trimmedMobile && /^[6-9]\d{9}$/.test(trimmedMobile.replace(/\D/g, ''));
      return isEmailValid || isMobileValid;
    });

    if (validRecipients.length === 0) {
      toast.error('Please enter at least one valid email address or 10-digit Indian mobile number');
      return;
    }

    setIsSaving(true);
    try {
      const insertData = validRecipients.map(r => ({
        baby_id: babyId,
        email: r.email.trim().toLowerCase() || `sms-only-${Date.now()}@placeholder.local`,
        mobile_number: r.mobile.trim().replace(/\D/g, '') || null,
        is_active: true,
      }));

      const { error } = await supabase
        .from('alert_recipients')
        .insert(insertData);

      if (error) throw error;

      toast.success(`${validRecipients.length} recipient(s) added successfully`);
      setNewRecipients([
        { email: '', mobile: '' },
        { email: '', mobile: '' },
        { email: '', mobile: '' },
        { email: '', mobile: '' },
        { email: '', mobile: '' },
      ]);
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

      toast.success(`Removed recipient`);
      fetchRecipients();
    } catch (error) {
      console.error('Error removing recipient:', error);
      toast.error('Failed to remove recipient');
    }
  };

  const handleRecipientChange = (index: number, field: 'email' | 'mobile', value: string) => {
    const updated = [...newRecipients];
    updated[index] = { ...updated[index], [field]: value };
    setNewRecipients(updated);
  };

  const formatLastAlertTime = () => {
    if (!lastAlertSentAt) return 'No alerts sent yet';
    const date = new Date(lastAlertSentAt);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
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
                    ? 'Email and SMS alerts will be sent automatically when vitals go outside safe ranges.'
                    : 'No automatic email or SMS alerts will be sent. UI monitoring continues normally.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Last alert sent: {formatLastAlertTime()}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="card-medical">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-semibold">Alert Recipients</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Manage who receives email and SMS alerts
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                        <p className="font-medium text-sm">{recipient.email.includes('@placeholder.local') ? 'SMS Only' : recipient.email}</p>
                        {recipient.mobile_number && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            +91 {recipient.mobile_number}
                          </p>
                        )}
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
                Add email addresses and mobile numbers below to receive alerts
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Recipients (up to 5)
            </Label>
            <div className="space-y-4">
              {newRecipients.map((recipient, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      placeholder={`doctor${index + 1}@hospital.com`}
                      value={recipient.email}
                      onChange={(e) => handleRecipientChange(index, 'email', e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Mobile Number (10-digit)
                    </Label>
                    <Input
                      type="tel"
                      placeholder="9876543210"
                      value={recipient.mobile}
                      onChange={(e) => handleRecipientChange(index, 'mobile', e.target.value)}
                      className="bg-background"
                      maxLength={10}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={handleAddRecipients}
              disabled={isSaving || !newRecipients.some(r => r.email.trim() || r.mobile.trim())}
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

          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> When automatic alerts are enabled, all recipients listed above 
              will receive email and SMS notifications when vital signs go outside safe ranges. 
              SMS alerts are sent to Indian mobile numbers via Fast2SMS.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertControlPanel;