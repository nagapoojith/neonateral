export type UserRole = 'doctor' | 'nurse' | 'senior_doctor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type BabyStatus = 'normal' | 'high' | 'critical';

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
  behaviorBaseline?: BehaviorBaseline;
  alertsEnabled: boolean;
  lastAlertSentAt?: string | null;
}

export interface VitalSigns {
  timestamp: number;
  heartRate: number;
  respirationRate: number;
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

export type AlertLevel = 'normal' | 'high' | 'critical';

export interface Alert {
  id: string;
  babyId: string;
  babyName: string;
  bedNumber: string;
  type: 'vital' | 'scheduled' | 'behavior' | 'comparison';
  level: AlertLevel;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  escalationLevel: number;
  escalatedTo?: string[];
}

export interface AlertEscalation {
  alertId: string;
  level: number;
  escalatedAt: string;
  escalatedTo: string;
  reason: string;
}
