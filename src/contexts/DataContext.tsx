import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export type BabyStatus = 'normal' | 'high' | 'critical';
export type AlertLevel = 'normal' | 'high' | 'critical';

export interface VitalSigns {
  timestamp: number;
  heartRate: number;
  spo2: number;
  temperature: number;
  movement: number;
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
}

interface DataContextType {
  babies: Baby[];
  alerts: Alert[];
  isLoading: boolean;
  addBaby: (baby: Omit<Baby, 'id' | 'status' | 'registeredAt' | 'behaviorBaseline'>) => Promise<void>;
  updateBabyStatus: (babyId: string, status: BabyStatus) => void;
  acknowledgeAlert: (alertId: string, userName: string) => Promise<void>;
  getVitalsHistory: (babyId: string) => VitalSigns[];
  getCurrentVitals: (babyId: string) => VitalSigns | null;
  sendAlertEmail: (alert: Alert, recipientEmail: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Store vitals history in memory (simulated real-time data)
const vitalsHistory: Record<string, VitalSigns[]> = {};

// Generate realistic vital signs
function generateVitals(babyId: string, status: BabyStatus): VitalSigns {
  const baseHeartRate = status === 'critical' ? 180 : status === 'high' ? 160 : 140;
  const baseSpo2 = status === 'critical' ? 88 : status === 'high' ? 92 : 97;
  const baseTemp = status === 'critical' ? 38.5 : status === 'high' ? 37.8 : 37.0;
  const baseMovement = status === 'critical' ? 20 : status === 'high' ? 35 : 50;

  return {
    timestamp: Date.now(),
    heartRate: Math.round(baseHeartRate + (Math.random() - 0.5) * 20),
    spo2: Math.round(baseSpo2 + (Math.random() - 0.5) * 4),
    temperature: parseFloat((baseTemp + (Math.random() - 0.5) * 0.5).toFixed(1)),
    movement: Math.round(baseMovement + (Math.random() - 0.5) * 20),
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [babies, setBabies] = useState<Baby[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session, user } = useAuth();

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
      const mappedBabies: Baby[] = data.map((baby) => ({
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
        behaviorBaseline: {
          avgMovement: 45,
          avgHeartRate: 140,
          sleepPatterns: [80, 75, 85, 70],
          daysTracked: Math.floor((Date.now() - new Date(baby.created_at).getTime()) / (24 * 60 * 60 * 1000)),
          isBaselineEstablished: Math.floor((Date.now() - new Date(baby.created_at).getTime()) / (24 * 60 * 60 * 1000)) >= 4,
        },
      }));
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
      const mappedAlerts: Alert[] = data.map((alert) => ({
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

  // Update vitals every 3 seconds
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
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [babies]);

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

  const addBaby = useCallback(async (babyData: Omit<Baby, 'id' | 'status' | 'registeredAt' | 'behaviorBaseline'>) => {
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

  const sendAlertEmail = useCallback(async (alert: Alert, recipientEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          to: recipientEmail,
          babyName: alert.babyName,
          bedNumber: alert.bedNumber,
          alertType: alert.level,
          message: alert.message,
          timestamp: new Date(alert.timestamp).toLocaleString(),
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
