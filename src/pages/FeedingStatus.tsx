import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Utensils, Clock, Plus, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FeedingType = 'breast_milk' | 'formula' | 'tube_feeding';
type FeedingStatus = 'fed' | 'due' | 'missed';

interface FeedingEntry {
  id: string;
  babyId: string;
  babyName: string;
  feedingTime: Date;
  feedingType: FeedingType;
  recordedBy: string;
  notes?: string;
}

const FEEDING_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

const feedingTypeLabels: Record<FeedingType, string> = {
  breast_milk: 'Breast Milk',
  formula: 'Formula',
  tube_feeding: 'Tube Feeding',
};

const FeedingStatusPage = () => {
  const { user } = useAuth();
  const { babies } = useData();
  const isNurse = user?.role === 'nurse';
  const isDoctorOrSenior = user?.role === 'doctor' || user?.role === 'senior_doctor';

  const [entries, setEntries] = useState<FeedingEntry[]>(() => {
    // Initialize with some mock data
    return babies.slice(0, 3).flatMap((baby, idx) => {
      const now = Date.now();
      return [
        {
          id: `${baby.id}-1`,
          babyId: baby.id,
          babyName: baby.name,
          feedingTime: new Date(now - (idx === 0 ? 1 : idx === 1 ? 4 : 2) * 3600000),
          feedingType: (['breast_milk', 'formula', 'tube_feeding'] as FeedingType[])[idx % 3],
          recordedBy: 'RN Emily Davis',
        },
      ];
    });
  });

  const [showForm, setShowForm] = useState(false);
  const [formBaby, setFormBaby] = useState('');
  const [formType, setFormType] = useState<FeedingType>('breast_milk');

  const getStatusForBaby = (babyId: string): { status: FeedingStatus; lastFed?: Date; nextDue?: Date } => {
    const babyEntries = entries.filter(e => e.babyId === babyId).sort((a, b) => b.feedingTime.getTime() - a.feedingTime.getTime());
    if (babyEntries.length === 0) return { status: 'missed' };
    
    const lastFed = babyEntries[0].feedingTime;
    const nextDue = new Date(lastFed.getTime() + FEEDING_INTERVAL_MS);
    const now = new Date();
    
    if (now > nextDue) return { status: 'missed', lastFed, nextDue };
    if (nextDue.getTime() - now.getTime() < 30 * 60 * 1000) return { status: 'due', lastFed, nextDue };
    return { status: 'fed', lastFed, nextDue };
  };

  const statusCfg = {
    fed: { label: 'Fed', icon: CheckCircle2, color: 'text-status-normal', bg: 'bg-status-normal-bg', badgeVariant: 'normal' as const },
    due: { label: 'Due', icon: AlertTriangle, color: 'text-status-warning', bg: 'bg-status-warning-bg', badgeVariant: 'warning' as const },
    missed: { label: 'Missed', icon: XCircle, color: 'text-status-critical', bg: 'bg-status-critical-bg', badgeVariant: 'critical' as const },
  };

  const handleAddEntry = () => {
    if (!formBaby) {
      toast.error('Please select a baby');
      return;
    }
    const baby = babies.find(b => b.id === formBaby);
    const entry: FeedingEntry = {
      id: Date.now().toString(),
      babyId: formBaby,
      babyName: baby?.name || 'Unknown',
      feedingTime: new Date(),
      feedingType: formType,
      recordedBy: user?.name || 'Staff',
    };
    setEntries(prev => [entry, ...prev]);
    setShowForm(false);
    setFormBaby('');
    toast.success(`Feeding recorded for ${baby?.name}`);
  };

  const fedCount = babies.filter(b => getStatusForBaby(b.id).status === 'fed').length;
  const dueCount = babies.filter(b => getStatusForBaby(b.id).status === 'due').length;
  const missedCount = babies.filter(b => getStatusForBaby(b.id).status === 'missed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feeding Status Monitor</h1>
            <p className="text-muted-foreground">Track feeding compliance across all neonates</p>
          </div>
          {isNurse && (
            <Button onClick={() => setShowForm(!showForm)} className="btn-medical gap-2">
              <Plus className="w-4 h-4" />
              Record Feeding
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="card-medical">
            <CardContent className="p-5 flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-status-normal" />
              <div>
                <p className="text-sm text-muted-foreground">Fed</p>
                <p className="text-3xl font-bold text-status-normal">{fedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-5 flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-status-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Due</p>
                <p className="text-3xl font-bold text-status-warning">{dueCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-medical">
            <CardContent className="p-5 flex items-center gap-4">
              <XCircle className="w-8 h-8 text-status-critical" />
              <div>
                <p className="text-sm text-muted-foreground">Missed</p>
                <p className="text-3xl font-bold text-status-critical">{missedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && isNurse && (
          <Card className="card-medical border-2 border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Record New Feeding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Select Baby</label>
                <select
                  value={formBaby}
                  onChange={e => setFormBaby(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select --</option>
                  {babies.map(b => <option key={b.id} value={b.id}>{b.name} (Bed {b.bedNumber})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Feeding Type</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as FeedingType)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="breast_milk">Breast Milk</option>
                  <option value="formula">Formula</option>
                  <option value="tube_feeding">Tube Feeding</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAddEntry} className="btn-medical gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Record
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {babies.map(baby => {
            const { status, lastFed, nextDue } = getStatusForBaby(baby.id);
            const cfg = statusCfg[status];
            const StatusIcon = cfg.icon;
            const babyEntries = entries.filter(e => e.babyId === baby.id).sort((a, b) => b.feedingTime.getTime() - a.feedingTime.getTime());

            return (
              <Card key={baby.id} className={cn('card-medical overflow-hidden', status === 'missed' && 'ring-2 ring-status-critical')}>
                <div className={cn('h-1', status === 'fed' ? 'gradient-primary' : status === 'due' ? 'bg-status-warning' : 'bg-status-critical')} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">{baby.name}</CardTitle>
                    <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Bed {baby.bedNumber}</p>
                </CardHeader>
                <CardContent className="space-y-3 pb-5">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Fed:</span>
                    <span className="font-semibold">{lastFed ? lastFed.toLocaleTimeString() : 'Never'}</span>
                  </div>
                  {nextDue && (
                    <div className="flex items-center gap-2 text-sm">
                      <Utensils className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Next Due:</span>
                      <span className={cn('font-semibold', status !== 'fed' && cfg.color)}>{nextDue.toLocaleTimeString()}</span>
                    </div>
                  )}
                  {babyEntries.length > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent Feeds</p>
                      {babyEntries.slice(0, 3).map(entry => (
                        <div key={entry.id} className="flex items-center justify-between text-xs py-1">
                          <span className="text-muted-foreground">{entry.feedingTime.toLocaleString()}</span>
                          <Badge variant="secondary" className="text-[10px]">{feedingTypeLabels[entry.feedingType]}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FeedingStatusPage;
