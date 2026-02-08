import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Clock, User, Users, FileText, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HandoverNote {
  id: string;
  babyId: string;
  babyName: string;
  note: string;
  author: string;
  authorRole: string;
  timestamp: Date;
}

const SHIFTS = [
  { name: 'Morning Shift', time: '06:00 – 14:00', doctor: 'Dr. Sarah Johnson', nurse: 'RN Emily Davis' },
  { name: 'Afternoon Shift', time: '14:00 – 22:00', doctor: 'Dr. Rajesh Kumar', nurse: 'RN Michael Chen' },
  { name: 'Night Shift', time: '22:00 – 06:00', doctor: 'Dr. Priya Nair', nurse: 'RN Jessica Williams' },
];

const getCurrentShift = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 0;
  if (hour >= 14 && hour < 22) return 1;
  return 2;
};

const ShiftHandover = () => {
  const { user } = useAuth();
  const { babies } = useData();
  const [notes, setNotes] = useState<HandoverNote[]>([
    {
      id: '1',
      babyId: babies[0]?.id || '',
      babyName: babies[0]?.name || 'Baby A',
      note: 'Vitals stable throughout shift. SpO₂ maintained at 96%. Feeding on schedule.',
      author: 'Dr. Sarah Johnson',
      authorRole: 'Doctor',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: '2',
      babyId: babies[1]?.id || '',
      babyName: babies[1]?.name || 'Baby B',
      note: 'Mild temperature fluctuation noted (36.3°C). Incubator adjusted. Monitor closely.',
      author: 'RN Emily Davis',
      authorRole: 'Nurse',
      timestamp: new Date(Date.now() - 7200000),
    },
  ]);
  const [newNote, setNewNote] = useState('');
  const [selectedBaby, setSelectedBaby] = useState('');

  const currentShiftIdx = getCurrentShift();
  const currentShift = SHIFTS[currentShiftIdx];
  const nextShift = SHIFTS[(currentShiftIdx + 1) % 3];

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedBaby) {
      toast.error('Please select a baby and enter a note');
      return;
    }
    const baby = babies.find(b => b.id === selectedBaby);
    const note: HandoverNote = {
      id: Date.now().toString(),
      babyId: selectedBaby,
      babyName: baby?.name || 'Unknown',
      note: newNote.trim(),
      author: user?.name || 'Unknown',
      authorRole: user?.role?.replace('_', ' ') || 'Staff',
      timestamp: new Date(),
    };
    setNotes(prev => [note, ...prev]);
    setNewNote('');
    setSelectedBaby('');
    toast.success('Handover note added');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shift & Handover</h1>
          <p className="text-muted-foreground">Ensure continuity of care during staff shift changes</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {SHIFTS.map((shift, idx) => (
            <Card key={idx} className={cn('card-medical overflow-hidden', idx === currentShiftIdx && 'ring-2 ring-primary')}>
              {idx === currentShiftIdx && <div className="h-1 gradient-primary" />}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">{shift.name}</CardTitle>
                  {idx === currentShiftIdx && (
                    <Badge className="text-xs bg-primary text-primary-foreground">Current</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{shift.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-primary" />
                  <span>{shift.doctor}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-chart-spo2" />
                  <span>{shift.nurse}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-medical">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Handover Note
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">Select Baby</label>
              <select
                value={selectedBaby}
                onChange={e => setSelectedBaby(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select a baby --</option>
                {babies.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Bed {b.bedNumber})</option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder="Enter handover note (e.g., vitals summary, medications given, observations...)"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="min-h-[100px] rounded-xl"
            />
            <Button onClick={handleAddNote} className="btn-medical gap-2">
              <FileText className="w-4 h-4" />
              Add Note
            </Button>
          </CardContent>
        </Card>

        <Card className="card-medical">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Handover Notes
              </CardTitle>
              <Badge variant="secondary">{notes.length} notes</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No handover notes yet</p>
              </div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{note.babyName}</Badge>
                      <span className="text-xs text-muted-foreground capitalize">{note.authorRole}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{note.timestamp.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground">{note.note}</p>
                  <p className="text-xs text-muted-foreground">— {note.author}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ShiftHandover;
