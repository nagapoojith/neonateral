import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export type BabyStatus = 'normal' | 'high' | 'critical';
export type AlertLevel = 'normal' | 'high' | 'critical';

export interface VitalSigns {
  timestamp: number;
  heartRate: number;
  respirationRate: number;
  spo2: number;
  temperature: number;
  movement: number;
  sleepingPosition: 'back' | 'side' | 'prone';
}

export interface BehaviorBaseline {
  avgMovement: number;
  avgHeartRate: number;
  sleepPatterns: number[];
  daysTracked: number;
  isBaselineEstablished: boolean;
}

export interface Baby {
  id: string;
  name: string;
  bedNumber: string;
  dateOfBirth: string;
  timeOfBirth: string;
  parentNames: string;
  parentContact: string;
  status: BabyStatus;
  registeredBy: string;
  registeredAt: string;
  behaviorBaseline: BehaviorBaseline;
  alertsEnabled: boolean;
  lastAlertSentAt?: string | null;
}

export interface Alert {
  id: string;
  babyId: string;
  babyName: string;
  bedNumber: string;
  type: 'vital' | 'behavior' | 'scheduled' | 'comparison';
  level: AlertLevel;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  escalationLevel: number;
  escalatedTo?: string[];
  triggerReason?: string;
  vitalsSnapshot?: VitalSigns;
}

interface DataContextType {
  babies: Baby[];
  alerts: Alert[];
  isLoading: boolean;
  addBaby: (baby: Omit<Baby, 'id' | 'status' | 'registeredAt' | 'behaviorBaseline' | 'alertsEnabled'>) => Promise<void>;
  updateBabyStatus: (babyId: string, status: BabyStatus) => void;
  acknowledgeAlert: (alertId: string, userName: string) => Promise<void>;
  getVitalsHistory: (babyId: string) => VitalSigns[];
  getCurrentVitals: (babyId: string) => VitalSigns | null;
  sendAlertEmail: (alert: Alert, recipientEmail: string, vitals?: VitalSigns) => Promise<void>;
  refreshData: () => Promise<void>;
  toggleBabyAlerts: (babyId: string, enabled: boolean) => Promise<void>;
  deleteBaby: (babyId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Store vitals history in memory (simulated real-time data)
const vitalsHistory: Record<string, VitalSigns[]> = {};

// Track mock data rotation - cycle through different alert scenarios
let mockScenarioIndex = 0;
const MOCK_SCENARIOS = [
  'heart_rate_high',
  'heart_rate_low', 
  'respiration_high',
  'respiration_low',
  'temperature_high',
  'temperature_low',
  'spo2_low',
  'prone_position',
  'normal',
  'side_position',
] as const;

// PhysioNet Neonatal Thresholds for three-tier alert system
// Normal: All vitals within safe range
// High Priority (Early Warning): Vitals approaching abnormal limits
// Critical: Any vital crosses critical threshold (email alerts sent)
const VITAL_THRESHOLDS = {
  heartRate: { 
    // Normal: 100-160 BPM
    // High Priority: 80-99 or 151-160 BPM
    // Critical: < 80 or > 160 BPM
    criticalMin: 80, 
    criticalMax: 160,
    highPriorityMin: 100,
    highPriorityMax: 150,
  },
  respirationRate: { 
    // Normal: 30-60 /min
    // High Priority: 30-34 or 56-60 /min
    // Critical: < 30 or > 60 /min
    criticalMin: 30, 
    criticalMax: 60,
    highPriorityMin: 35,
    highPriorityMax: 55,
  },
  spo2: { 
    critical: 90, 
    warning: 94 
  },
  temperature: { 
    // Normal: 36.5-37.5 °C
    // High Priority: 36.0-36.4 or 37.3-37.5 °C
    // Critical: < 36.0 or > 37.5 °C
    criticalMin: 36.0, 
    criticalMax: 37.5,
    highPriorityMin: 36.5,
    highPriorityMax: 37.2,
  },
};

// Track last alert time to prevent spam
const lastAlertTime: Record<string, number> = {};
const ALERT_COOLDOWN = 30000; // 30 seconds between alerts for same baby

// Generate realistic vital signs based on mock scenario rotation
// This ensures ALL vital types trigger alerts over time
function generateVitals(babyId: string, _status: BabyStatus): VitalSigns {
  // Get current scenario for this cycle
  const scenario = MOCK_SCENARIOS[mockScenarioIndex % MOCK_SCENARIOS.length];
  
  // Base normal values
  let heartRate = 130 + Math.round((Math.random() - 0.5) * 20);
  let respirationRate = 42 + Math.round((Math.random() - 0.5) * 10);
  let spo2 = 97 + Math.round((Math.random() - 0.5) * 2);
  let temperature = 36.8 + parseFloat(((Math.random() - 0.5) * 0.3).toFixed(1));
  let movement = 50 + Math.round((Math.random() - 0.5) * 20);
  let sleepingPosition: 'back' | 'side' | 'prone' = 'back';
  
  // Apply scenario-specific abnormal values
  switch (scenario) {
    case 'heart_rate_high':
      heartRate = 165 + Math.round(Math.random() * 10); // Critical: >160
      break;
    case 'heart_rate_low':
      heartRate = 75 + Math.round(Math.random() * 4); // Critical: <80
      break;
    case 'respiration_high':
      respirationRate = 62 + Math.round(Math.random() * 5); // Critical: >60
      break;
    case 'respiration_low':
      respirationRate = 25 + Math.round(Math.random() * 4); // Critical: <30
      break;
    case 'temperature_high':
      temperature = 37.7 + parseFloat((Math.random() * 0.4).toFixed(1)); // Critical: >37.5
      break;
    case 'temperature_low':
      temperature = 35.5 + parseFloat((Math.random() * 0.4).toFixed(1)); // Critical: <36.0
      break;
    case 'spo2_low':
      spo2 = 85 + Math.round(Math.random() * 4); // Critical: <90
      break;
    case 'prone_position':
      sleepingPosition = 'prone';
      break;
    case 'side_position':
      sleepingPosition = 'side';
      break;
    case 'normal':
    default:
      // All values stay normal
      break;
  }

  return {
    timestamp: Date.now(),
    heartRate,
    respirationRate,
    spo2,
    temperature,
    movement,
    sleepingPosition,
  };
}

// Check if vitals are outside safe thresholds (Three-tier alert system)
// Normal: All vitals within safe range
// High Priority: Vitals approaching abnormal limits (early warning)
// Critical: Any vital crosses critical threshold (requires immediate attention)
function checkVitalThresholds(vitals: VitalSigns): { level: AlertLevel; reasons: string[] } {
  const reasons: string[] = [];
  let level: AlertLevel = 'normal';

  // Heart rate check
  // Normal: 100-150 BPM, High Priority: 80-99 or 151-160 BPM, Critical: <80 or >160 BPM
  if (vitals.heartRate < VITAL_THRESHOLDS.heartRate.criticalMin || vitals.heartRate > VITAL_THRESHOLDS.heartRate.criticalMax) {
    reasons.push(`Heart rate ${vitals.heartRate} BPM is CRITICAL (outside ${VITAL_THRESHOLDS.heartRate.criticalMin}-${VITAL_THRESHOLDS.heartRate.criticalMax} BPM)`);
    level = 'critical';
  } else if (vitals.heartRate < VITAL_THRESHOLDS.heartRate.highPriorityMin || vitals.heartRate > VITAL_THRESHOLDS.heartRate.highPriorityMax) {
    reasons.push(`Heart rate ${vitals.heartRate} BPM is HIGH PRIORITY (approaching limits)`);
    if (level === 'normal') level = 'high';
  }

  // Respiration rate check
  // Normal: 35-55/min, High Priority: 30-34 or 56-60/min, Critical: <30 or >60/min
  if (vitals.respirationRate < VITAL_THRESHOLDS.respirationRate.criticalMin || vitals.respirationRate > VITAL_THRESHOLDS.respirationRate.criticalMax) {
    reasons.push(`Respiration rate ${vitals.respirationRate}/min is CRITICAL (outside ${VITAL_THRESHOLDS.respirationRate.criticalMin}-${VITAL_THRESHOLDS.respirationRate.criticalMax}/min)`);
    level = 'critical';
  } else if (vitals.respirationRate < VITAL_THRESHOLDS.respirationRate.highPriorityMin || vitals.respirationRate > VITAL_THRESHOLDS.respirationRate.highPriorityMax) {
    reasons.push(`Respiration rate ${vitals.respirationRate}/min is HIGH PRIORITY (approaching limits)`);
    if (level === 'normal') level = 'high';
  }

  // SpO2 check
  if (vitals.spo2 < VITAL_THRESHOLDS.spo2.critical) {
    reasons.push(`SpO₂ ${vitals.spo2}% is CRITICAL (below ${VITAL_THRESHOLDS.spo2.critical}%)`);
    level = 'critical';
  } else if (vitals.spo2 < VITAL_THRESHOLDS.spo2.warning) {
    reasons.push(`SpO₂ ${vitals.spo2}% is HIGH PRIORITY (below ${VITAL_THRESHOLDS.spo2.warning}%)`);
    if (level === 'normal') level = 'high';
  }

  // Temperature check
  // Normal: 36.5-37.2°C, High Priority: 36.0-36.4 or 37.3-37.5°C, Critical: <36.0 or >37.5°C
  if (vitals.temperature < VITAL_THRESHOLDS.temperature.criticalMin || vitals.temperature > VITAL_THRESHOLDS.temperature.criticalMax) {
    reasons.push(`Temperature ${vitals.temperature}°C is CRITICAL (outside ${VITAL_THRESHOLDS.temperature.criticalMin}-${VITAL_THRESHOLDS.temperature.criticalMax}°C)`);
    level = 'critical';
  } else if (vitals.temperature < VITAL_THRESHOLDS.temperature.highPriorityMin || vitals.temperature > VITAL_THRESHOLDS.temperature.highPriorityMax) {
    reasons.push(`Temperature ${vitals.temperature}°C is HIGH PRIORITY (approaching limits)`);
    if (level === 'normal') level = 'high';
  }

  // Sleeping position check
  if (vitals.sleepingPosition === 'prone') {
    reasons.push(`Baby is in prone (stomach) position - CRITICAL SIDS risk`);
    level = 'critical';
  } else if (vitals.sleepingPosition === 'side') {
    reasons.push(`Baby is in side position - HIGH PRIORITY (not recommended)`);
    if (level === 'normal') level = 'high';
  }

  return { level, reasons };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [babies, setBabies] = useState<Baby[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session, user } = useAuth();
  const alertsEnabledRef = useRef<Record<string, boolean>>({});

  const fetchBabies = useCallback(async () => {
    if (!session) return;
    
    const { data, error } = await supabase
      .from('babies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching babies:', error);
      return;
    }

    if (data) {
      const mappedBabies: Baby[] = data.map((baby: any) => {
        const alertsEnabled = baby.alerts_enabled !== false;
        alertsEnabledRef.current[baby.id] = alertsEnabled;
        
        return {
          id: baby.id,
          name: baby.baby_name,
          bedNumber: baby.bed_number,
          dateOfBirth: new Date(baby.date_of_birth).toISOString().split('T')[0],
          timeOfBirth: new Date(baby.date_of_birth).toTimeString().slice(0, 5),
          parentNames: baby.parent_names,
          parentContact: baby.parent_contact,
          status: (baby.status as BabyStatus) || 'normal',
          registeredBy: baby.registered_by || '',
          registeredAt: baby.created_at,
          alertsEnabled,
          lastAlertSentAt: baby.last_alert_sent_at || null,
          behaviorBaseline: {
            avgMovement: 45,
            avgHeartRate: 140,
            sleepPatterns: [80, 75, 85, 70],
            daysTracked: Math.floor((Date.now() - new Date(baby.created_at).getTime()) / (24 * 60 * 60 * 1000)),
            isBaselineEstablished: Math.floor((Date.now() - new Date(baby.created_at).getTime()) / (24 * 60 * 60 * 1000)) >= 4,
          },
        };
      });
      setBabies(mappedBabies);

      // Initialize vitals history for new babies
      mappedBabies.forEach((baby) => {
        if (!vitalsHistory[baby.id]) {
          vitalsHistory[baby.id] = [];
          for (let i = 30; i >= 0; i--) {
            const vitals = generateVitals(baby.id, baby.status);
            vitals.timestamp = Date.now() - i * 5000;
            vitalsHistory[baby.id].push(vitals);
          }
        }
      });
    }
  }, [session]);

  const fetchAlerts = useCallback(async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        babies:baby_id (baby_name, bed_number)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching alerts:', error);
      return;
    }

    if (data) {
      const mappedAlerts: Alert[] = data.map((alert: any) => ({
        id: alert.id,
        babyId: alert.baby_id,
        babyName: (alert.babies as any)?.baby_name || 'Unknown',
        bedNumber: (alert.babies as any)?.bed_number || 'N/A',
        type: 'vital',
        level: alert.alert_type as AlertLevel,
        message: alert.message,
        timestamp: alert.created_at,
        acknowledged: alert.is_acknowledged,
        acknowledgedBy: alert.acknowledged_by || undefined,
        acknowledgedAt: alert.acknowledged_at || undefined,
        escalationLevel: alert.escalation_level || 0,
        triggerReason: alert.trigger_reason || undefined,
        vitalsSnapshot: alert.vitals_snapshot || undefined,
      }));
      setAlerts(mappedAlerts);
    }
  }, [session]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchBabies(), fetchAlerts()]);
    setIsLoading(false);
  }, [fetchBabies, fetchAlerts]);

  // Initial data fetch
  useEffect(() => {
    if (session) {
      refreshData();
    } else {
      setBabies([]);
      setAlerts([]);
      setIsLoading(false);
    }
  }, [session, refreshData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!session) return;

    const babiesChannel = supabase
      .channel('babies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'babies' },
        () => fetchBabies()
      )
      .subscribe();

    const alertsChannel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(babiesChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [session, fetchBabies, fetchAlerts]);

  const fetchBabyRecipients = useCallback(async (babyId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('alert_recipients')
        .select('email')
        .eq('baby_id', babyId)
        .eq('is_active', true);

      if (error) throw error;
      
      return data?.map(r => r.email).filter(e => e && !e.includes('@placeholder.local')) || [];
    } catch (error) {
      console.error('Error fetching recipients:', error);
      return [];
    }
  }, []);

  const sendAutoAlertEmail = useCallback(async (baby: Baby, vitals: VitalSigns, level: AlertLevel, reasons: string[]) => {
    // Only send email alerts for CRITICAL level - High Priority only shows dashboard warning
    if (level !== 'critical') {
      console.log(`Alert level ${level} for ${baby.name} - no email sent (only CRITICAL triggers email)`);
      return;
    }

    if (!alertsEnabledRef.current[baby.id]) {
      console.log(`Auto alerts disabled for baby ${baby.name}`);
      return;
    }

    const now = Date.now();
    const lastAlert = lastAlertTime[baby.id] || 0;
    
    if (now - lastAlert < ALERT_COOLDOWN) {
      console.log(`Alert cooldown active for baby ${baby.name}`);
      return;
    }

    lastAlertTime[baby.id] = now;
    const triggerReason = reasons.join('; ');
    const message = `CRITICAL ALERT: ${triggerReason}`;

    try {
      const { data: alertData, error: alertError } = await supabase
        .from('alerts')
        .insert({
          baby_id: baby.id,
          alert_type: level,
          message,
          trigger_reason: triggerReason,
          vitals_snapshot: vitals as any,
        })
        .select()
        .single();

      if (alertError) {
        console.error('Error saving auto alert:', alertError);
        return;
      }

      await supabase
        .from('babies')
        .update({ last_alert_sent_at: new Date().toISOString() })
        .eq('id', baby.id);

      const emails = await fetchBabyRecipients(baby.id);
      
      const emailTargets = emails.length > 0 
        ? emails 
        : [baby.parentContact.includes('@') ? baby.parentContact : 'nrkavipriyan.cse2024@citchennai.net'];

      const emailPromises = emailTargets.map(async (recipientEmail) => {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-alert-email', {
            body: {
              to: recipientEmail,
              babyName: baby.name,
              babyId: baby.id,
              bedNumber: baby.bedNumber,
              alertType: level,
              message,
              triggerReason,
              timestamp: new Date().toLocaleString(),
              vitals: {
                heartRate: vitals.heartRate,
                respirationRate: vitals.respirationRate,
                spo2: vitals.spo2,
                temperature: vitals.temperature,
                movement: vitals.movement,
                sleepingPosition: vitals.sleepingPosition,
              },
            },
          });

          if (emailError) {
            console.error(`Error sending alert to ${recipientEmail}:`, emailError);
            return false;
          }
          console.log(`Auto alert sent to ${recipientEmail} for ${baby.name}`);
          return true;
        } catch (error) {
          console.error(`Error sending alert to ${recipientEmail}:`, error);
          return false;
        }
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(Boolean).length;

      if (successCount > 0) {
        toast.warning(`Automatic ${level} alert triggered for ${baby.name}`, {
          description: `Sent to ${successCount} email(s). ${triggerReason}`,
        });
      }
    } catch (error) {
      console.error('Error in auto alert:', error);
    }
  }, [fetchBabyRecipients]);

  // Rotate mock scenario every 30 seconds to test different alert types
  useEffect(() => {
    const rotationInterval = setInterval(() => {
      mockScenarioIndex = (mockScenarioIndex + 1) % MOCK_SCENARIOS.length;
      console.log(`Mock scenario rotated to: ${MOCK_SCENARIOS[mockScenarioIndex]}`);
    }, 30000); // 30 seconds

    return () => clearInterval(rotationInterval);
  }, []);

  // Update vitals every 3 seconds and check for automatic alerts
  useEffect(() => {
    const interval = setInterval(() => {
      babies.forEach((baby) => {
        const newVitals = generateVitals(baby.id, baby.status);
        if (!vitalsHistory[baby.id]) {
          vitalsHistory[baby.id] = [];
        }
        vitalsHistory[baby.id].push(newVitals);
        if (vitalsHistory[baby.id].length > 60) {
          vitalsHistory[baby.id].shift();
        }

        // Check thresholds and trigger automatic alerts for ALL vital types
        if (alertsEnabledRef.current[baby.id]) {
          const { level, reasons } = checkVitalThresholds(newVitals);
          if (level !== 'normal' && reasons.length > 0) {
            console.log(`Alert triggered for ${baby.name}:`, reasons);
            sendAutoAlertEmail(baby, newVitals, level, reasons);
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [babies, sendAutoAlertEmail]);

  // Alert escalation
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts((prevAlerts) =>
        prevAlerts.map((alert) => {
          if (alert.acknowledged || alert.level === 'normal') return alert;

          const timeSinceAlert = Date.now() - new Date(alert.timestamp).getTime();
          
          if (alert.level === 'critical' && !alert.acknowledged) {
            if (timeSinceAlert > 60000 && alert.escalationLevel === 0) {
              return {
                ...alert,
                escalationLevel: 1,
                escalatedTo: ['All Nurses'],
                message: `${alert.message} [ESCALATED TO ALL NURSES]`,
              };
            }
            if (timeSinceAlert > 120000 && alert.escalationLevel === 1) {
              return {
                ...alert,
                escalationLevel: 2,
                escalatedTo: ['Senior Doctors'],
                message: `${alert.message} [ESCALATED TO SENIOR DOCTORS]`,
              };
            }
          }

          return alert;
        })
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const addBaby = useCallback(async (babyData: Omit<Baby, 'id' | 'status' | 'registeredAt' | 'behaviorBaseline' | 'alertsEnabled'>) => {
    if (!session?.user) {
      toast.error('You must be logged in to register a baby');
      return;
    }

    const dateOfBirth = new Date(`${babyData.dateOfBirth}T${babyData.timeOfBirth}`);

    const { data, error } = await supabase
      .from('babies')
      .insert({
        baby_name: babyData.name,
        bed_number: babyData.bedNumber,
        date_of_birth: dateOfBirth.toISOString(),
        parent_names: babyData.parentNames,
        parent_contact: babyData.parentContact,
        registered_by: session.user.id,
        status: 'normal',
        alerts_enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding baby:', error);
      toast.error('Failed to register baby');
      return;
    }

    toast.success(`${babyData.name} registered successfully!`);
    await fetchBabies();
  }, [session, fetchBabies]);

  const updateBabyStatus = useCallback(async (babyId: string, status: BabyStatus) => {
    const { error } = await supabase
      .from('babies')
      .update({ status })
      .eq('id', babyId);

    if (error) {
      console.error('Error updating baby status:', error);
      return;
    }

    setBabies((prev) =>
      prev.map((baby) => (baby.id === babyId ? { ...baby, status } : baby))
    );
  }, []);

  const toggleBabyAlerts = useCallback(async (babyId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('babies')
      .update({ alerts_enabled: enabled })
      .eq('id', babyId);

    if (error) {
      console.error('Error toggling alerts:', error);
      toast.error('Failed to update alert settings');
      return;
    }

    alertsEnabledRef.current[babyId] = enabled;
    setBabies((prev) =>
      prev.map((baby) => (baby.id === babyId ? { ...baby, alertsEnabled: enabled } : baby))
    );

    toast.success(`Alerts ${enabled ? 'enabled' : 'disabled'} for this patient`);
  }, []);

  const deleteBaby = useCallback(async (babyId: string) => {
    const baby = babies.find(b => b.id === babyId);
    
    const { error } = await supabase
      .from('babies')
      .delete()
      .eq('id', babyId);

    if (error) {
      console.error('Error deleting baby:', error);
      toast.error('Failed to remove patient. You may not have permission.');
      return;
    }

    // Clean up local state
    delete vitalsHistory[babyId];
    delete lastAlertTime[babyId];
    delete alertsEnabledRef.current[babyId];

    setBabies((prev) => prev.filter((b) => b.id !== babyId));
    toast.success(`${baby?.name || 'Patient'} has been removed from monitoring`);
  }, [babies]);

  const acknowledgeAlert = useCallback(async (alertId: string, userName: string) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('alerts')
      .update({
        is_acknowledged: true,
        acknowledged_by: session.user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
      return;
    }

    // Log acknowledgement
    await supabase.from('alert_acknowledgements').insert({
      alert_id: alertId,
      user_id: session.user.id,
      action: 'acknowledged',
    });

    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              acknowledged: true,
              acknowledgedBy: userName,
              acknowledgedAt: new Date().toISOString(),
            }
          : alert
      )
    );

    toast.success('Alert acknowledged');
  }, [session]);

  const sendAlertEmail = useCallback(async (alert: Alert, recipientEmail: string, vitals?: VitalSigns) => {
    try {
      const currentVitals = vitals || vitalsHistory[alert.babyId]?.[vitalsHistory[alert.babyId].length - 1];
      
      const { data, error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          to: recipientEmail,
          babyName: alert.babyName,
          babyId: alert.babyId,
          bedNumber: alert.bedNumber,
          alertType: alert.level,
          message: alert.message,
          triggerReason: alert.triggerReason || alert.message,
          timestamp: new Date(alert.timestamp).toLocaleString(),
          vitals: currentVitals ? {
            heartRate: currentVitals.heartRate,
            spo2: currentVitals.spo2,
            temperature: currentVitals.temperature,
            movement: currentVitals.movement,
            sleepingPosition: currentVitals.sleepingPosition,
          } : undefined,
        },
      });

      if (error) throw error;
      toast.success(`Alert email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Error sending alert email:', error);
      toast.error('Failed to send alert email');
    }
  }, []);

  const getVitalsHistory = useCallback((babyId: string): VitalSigns[] => {
    return vitalsHistory[babyId] || [];
  }, []);

  const getCurrentVitals = useCallback((babyId: string): VitalSigns | null => {
    const history = vitalsHistory[babyId];
    return history && history.length > 0 ? history[history.length - 1] : null;
  }, []);

  return (
    <DataContext.Provider
      value={{
        babies,
        alerts,
        isLoading,
        addBaby,
        updateBabyStatus,
        acknowledgeAlert,
        getVitalsHistory,
        getCurrentVitals,
        sendAlertEmail,
        refreshData,
        toggleBabyAlerts,
        deleteBaby,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
