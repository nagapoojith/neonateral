import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Utensils, Clock, Plus, CheckCircle2, AlertTriangle, XCircle, Baby, TrendingUp, Timer, Milk } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FeedingType = 'breast_milk' | 'formula' | 'tube_feeding';
type FeedingStatusType = 'fed' | 'due' | 'missed';

interface FeedingEntry {
  id: string;
  babyId: string;
  babyName: string;
  feedingTime: Date;
  feedingType: FeedingType;
  amount: string;
  recordedBy: string;
  notes?: string;
}

const FEEDING_INTERVAL_MS = 3 * 60 * 60 * 1000;

const feedingTypeLabels: Record<FeedingType, string> = {
  breast_milk: 'Breast Milk',
  formula: 'Formula',
  tube_feeding: 'Tube Feeding',
};

const feedingTypeIcons: Record<FeedingType, string> = {
  breast_milk: '🤱',
  formula: '🍼',
  tube_feeding: '💉',
};

const FeedingStatusPage = () => {
  const { user } = useAuth();
  const { babies } = useData();
  const isNurse = user?.role === 'nurse';

  const [entries, setEntries] = useState<FeedingEntry[]>(() => {
    return babies.slice(0, 4).flatMap((baby, idx) => {
      const now = Date.now();
      const feedTimes = [
        now - (idx === 0 ? 1 : idx === 1 ? 4 : idx === 2 ? 2 : 5) * 3600000,
        now - (idx === 0 ? 4 : idx === 1 ? 7 : idx === 2 ? 5 : 8) * 3600000,
        now - (idx === 0 ? 7 : idx === 1 ? 10 : idx === 2 ? 8 : 11) * 3600000,
      ];
      return feedTimes.map((t, fIdx) => ({
        id: `${baby.id}-${fIdx}`,
        babyId: baby.id,
        babyName: baby.name,
        feedingTime: new Date(t),
        feedingType: (['breast_milk', 'formula', 'tube_feeding'] as FeedingType[])[fIdx % 3],
        amount: `${20 + Math.floor(Math.random() * 30)} ml`,
        recordedBy: 'RN Emily Davis',
      }));
    });
  });

  const [showForm, setShowForm] = useState(false);
  const [formBaby, setFormBaby] = useState('');
  const [formType, setFormType] = useState<FeedingType>('breast_milk');
  const [formAmount, setFormAmount] = useState('30');
  const [formNotes, setFormNotes] = useState('');

  const getStatusForBaby = (babyId: string): { status: FeedingStatusType; lastFed?: Date; nextDue?: Date; timeSinceFed?: string } => {
    const babyEntries = entries.filter(e => e.babyId === babyId).sort((a, b) => b.feedingTime.getTime() - a.feedingTime.getTime());
    if (babyEntries.length === 0) return { status: 'missed' };

    const lastFed = babyEntries[0].feedingTime;
    const nextDue = new Date(lastFed.getTime() + FEEDING_INTERVAL_MS);
    const now = new Date();
    const diffMs = now.getTime() - lastFed.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    const timeSinceFed = hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;

    if (now > nextDue) return { status: 'missed', lastFed, nextDue, timeSinceFed };
    if (nextDue.getTime() - now.getTime() < 30 * 60 * 1000) return { status: 'due', lastFed, nextDue, timeSinceFed };
    return { status: 'fed', lastFed, nextDue, timeSinceFed };
  };

  const statusCfg = {
    fed: { label: 'Fed', icon: CheckCircle2, color: 'text-status-normal', bg: 'bg-status-normal-bg', badgeVariant: 'normal' as const, barColor: 'gradient-primary' },
    due: { label: 'Due Soon', icon: AlertTriangle, color: 'text-status-warning', bg: 'bg-status-warning-bg', badgeVariant: 'warning' as const, barColor: 'bg-status-warning' },
    missed: { label: 'Missed', icon: XCircle, color: 'text-status-critical', bg: 'bg-status-critical-bg', badgeVariant: 'critical' as const, barColor: 'bg-status-critical' },
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
      amount: `${formAmount} ml`,
      recordedBy: user?.name || 'Staff',
      notes: formNotes || undefined,
    };
    setEntries(prev => [entry, ...prev]);
    setShowForm(false);
    setFormBaby('');
    setFormNotes('');
    toast.success(`Feeding recorded for ${baby?.name}`);
  };

  const { fedCount, dueCount, missedCount, complianceRate } = useMemo(() => {
    let fed = 0, due = 0, missed = 0;
    babies.forEach(b => {
      const s = getStatusForBaby(b.id).status;
      if (s === 'fed') fed++;
      else if (s === 'due') due++;
      else missed++;
    });
    const rate = babies.length > 0 ? Math.round((fed / babies.length) * 100) : 0;
    return { fedCount: fed, dueCount: due, missedCount: missed, complianceRate: rate };
  }, [babies, entries]);

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-medical border-l-4 border-l-status-normal">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-status-normal-bg">
                <CheckCircle2 className="w-6 h-6 text-status-normal" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fed</p>
                <p className="text-3xl font-bold text-status-normal">{fedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-medical border-l-4 border-l-status-warning">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-status-warning-bg">
                <AlertTriangle className="w-6 h-6 text-status-warning" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Soon</p>
                <p className="text-3xl font-bold text-status-warning">{dueCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-medical border-l-4 border-l-status-critical">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-status-critical-bg">
                <XCircle className="w-6 h-6 text-status-critical" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Missed</p>
                <p className="text-3xl font-bold text-status-critical">{missedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-medical border-l-4 border-l-primary">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl gradient-primary">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compliance</p>
                <p className="text-3xl font-bold text-primary">{complianceRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && isNurse && (
          <Card className="card-medical border-2 border-primary/30">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Milk className="w-5 h-5 text-primary" />
                Record New Feeding
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
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
                    <option value="breast_milk">🤱 Breast Milk</option>
                    <option value="formula">🍼 Formula</option>
                    <option value="tube_feeding">💉 Tube Feeding</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">Amount (ml)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                    min="5"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Notes (optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g., baby tolerated well, minor reflux..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAddEntry} className="btn-medical gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Record Feeding
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {babies.map(baby => {
            const { status, lastFed, nextDue, timeSinceFed } = getStatusForBaby(baby.id);
            const cfg = statusCfg[status];
            const StatusIcon = cfg.icon;
            const babyEntries = entries.filter(e => e.babyId === baby.id).sort((a, b) => b.feedingTime.getTime() - a.feedingTime.getTime());
            const totalFeeds = babyEntries.length;

            return (
              <Card key={baby.id} className={cn('card-medical overflow-hidden', status === 'missed' && 'ring-2 ring-status-critical alert-pulse')}>
                <div className={cn('h-1.5', cfg.barColor)} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg)}>
                        <Baby className={cn('w-5 h-5', cfg.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{baby.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">Bed {baby.bedNumber}</p>
                      </div>
                    </div>
                    <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Last Fed</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {lastFed ? lastFed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                      </p>
                      {timeSinceFed && <p className="text-[10px] text-muted-foreground">{timeSinceFed}</p>}
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Next Due</span>
                      </div>
                      <p className={cn('text-sm font-bold', status !== 'fed' ? cfg.color : 'text-foreground')}>
                        {nextDue ? nextDue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">3h interval</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <span className="text-xs text-muted-foreground">Total feeds recorded</span>
                    <span className="text-sm font-bold text-foreground">{totalFeeds}</span>
                  </div>

                  {babyEntries.length > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 tracking-wide">Recent Feeds</p>
                      <div className="space-y-1.5">
                        {babyEntries.slice(0, 3).map(entry => (
                          <div key={entry.id} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span>{feedingTypeIcons[entry.feedingType]}</span>
                              <span className="text-muted-foreground">
                                {entry.feedingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">{entry.amount}</span>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{feedingTypeLabels[entry.feedingType]}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
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
