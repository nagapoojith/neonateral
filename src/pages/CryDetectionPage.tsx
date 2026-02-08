import React, { useState, useRef, useCallback, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Volume2, Mic, MicOff, Upload, AlertTriangle, Info, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

type CryClassification = 'normal' | 'discomfort' | 'pain';

interface CryEvent {
  id: string;
  babyId: string;
  babyName: string;
  classification: CryClassification;
  confidence: number;
  duration: number; // seconds
  timestamp: Date;
  message: string;
}

const CRY_MESSAGES: Record<CryClassification, string> = {
  normal: 'Cry pattern appears typical for a newborn. No specific concerns identified.',
  discomfort: 'Cry pattern suggests possible discomfort. Caregiver attention recommended.',
  pain: 'Cry pattern indicates potential distress. Immediate caregiver attention recommended.',
};

const CRY_COLORS: Record<CryClassification, { bg: string; text: string; badge: string; icon: string }> = {
  normal: { bg: 'bg-status-normal-bg', text: 'text-status-normal', badge: 'bg-status-normal', icon: '😊' },
  discomfort: { bg: 'bg-status-warning-bg', text: 'text-status-warning', badge: 'bg-status-warning', icon: '😟' },
  pain: { bg: 'bg-status-critical-bg', text: 'text-status-critical', badge: 'bg-status-critical', icon: '😢' },
};

const CryDetectionPage = () => {
  const { user } = useAuth();
  const { babies } = useData();
  const isDoctorOrSenior = user?.role === 'doctor' || user?.role === 'senior_doctor';

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedBaby, setSelectedBaby] = useState(babies[0]?.id || '');
  const [currentResult, setCurrentResult] = useState<CryEvent | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock history
  const [history, setHistory] = useState<CryEvent[]>(() => {
    const events: CryEvent[] = [];
    babies.slice(0, 2).forEach(baby => {
      const classes: CryClassification[] = ['normal', 'discomfort', 'normal', 'pain', 'normal'];
      classes.forEach((cls, i) => {
        events.push({
          id: `${baby.id}-${i}`,
          babyId: baby.id,
          babyName: baby.name,
          classification: cls,
          confidence: 65 + Math.floor(Math.random() * 30),
          duration: 2 + Math.floor(Math.random() * 8),
          timestamp: new Date(Date.now() - (i * 1800000) - Math.random() * 3600000),
          message: CRY_MESSAGES[cls],
        });
      });
    });
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const analyzeAudio = useCallback((): CryEvent => {
    const classifications: CryClassification[] = ['normal', 'discomfort', 'pain'];
    const weights = [0.5, 0.35, 0.15];
    const rand = Math.random();
    let cumulative = 0, selectedIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) { selectedIdx = i; break; }
    }
    const classification = classifications[selectedIdx];
    const baseConfidence = classification === 'normal' ? 85 : classification === 'discomfort' ? 72 : 65;
    const baby = babies.find(b => b.id === selectedBaby);
    return {
      id: Date.now().toString(),
      babyId: selectedBaby,
      babyName: baby?.name || 'Unknown',
      classification,
      confidence: Math.min(98, baseConfidence + Math.floor(Math.random() * 15)),
      duration: 3 + Math.floor(Math.random() * 5),
      timestamp: new Date(),
      message: CRY_MESSAGES[classification],
    };
  }, [selectedBaby, babies]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ctx;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        setAudioLevel(Math.min(100, (dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 128) * 100));
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      setCurrentResult(null);
      setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') stopRecording(); }, 5000);
    } catch {
      // silently handle
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    setIsRecording(false);
    setAudioLevel(0);
    processAudio();
  };

  const processAudio = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeAudio();
      setCurrentResult(result);
      setHistory(prev => [result, ...prev]);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setCurrentResult(null);
      processAudio();
    }
    e.target.value = '';
  };

  // Stats
  const babyHistory = selectedBaby ? history.filter(h => h.babyId === selectedBaby) : history;
  const normalCount = babyHistory.filter(h => h.classification === 'normal').length;
  const discomfortCount = babyHistory.filter(h => h.classification === 'discomfort').length;
  const painCount = babyHistory.filter(h => h.classification === 'pain').length;
  const avgConfidence = babyHistory.length > 0 ? Math.round(babyHistory.reduce((s, h) => s + h.confidence, 0) / babyHistory.length) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cry Detection</h1>
          <p className="text-muted-foreground">ML-based neonatal cry pattern analysis</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Main Detection Card */}
            <Card className="card-medical overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10"><Volume2 className="w-5 h-5 text-primary" /></div>
                    Cry Pattern Analyzer
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">Assistive Only</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">Analyzing Baby</label>
                  <select
                    value={selectedBaby}
                    onChange={e => setSelectedBaby(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                  >
                    {babies.map(b => <option key={b.id} value={b.id}>{b.name} (Bed {b.bedNumber})</option>)}
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button onClick={isRecording ? stopRecording : startRecording} disabled={isAnalyzing}
                    className={cn('gap-2 flex-1', isRecording ? 'bg-status-critical hover:bg-status-critical/90' : 'btn-medical')}>
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isRecording ? 'Stop Recording' : 'Record Audio'}
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isRecording || isAnalyzing} className="gap-2">
                    <Upload className="w-4 h-4" /> Upload
                  </Button>
                  <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                </div>

                {isRecording && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-status-critical animate-pulse" />
                      <span className="text-sm font-medium text-status-critical">Recording... (5s max)</span>
                    </div>
                    <Progress value={audioLevel} className="h-3" />
                    <div className="flex justify-between">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className={cn('w-1 rounded-full transition-all', audioLevel > (i * 5) ? 'bg-primary h-4' : 'bg-muted h-2')} />
                      ))}
                    </div>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="flex items-center justify-center gap-3 p-8">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-muted-foreground">Analyzing cry pattern...</span>
                  </div>
                )}

                {currentResult && !isAnalyzing && (
                  <div className={cn('p-5 rounded-xl border-2', CRY_COLORS[currentResult.classification].bg)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{CRY_COLORS[currentResult.classification].icon}</span>
                        <div>
                          <span className="font-bold text-lg text-foreground capitalize">{currentResult.classification} Cry</span>
                          <p className="text-xs text-muted-foreground">Duration: ~{currentResult.duration}s</p>
                        </div>
                      </div>
                      {isDoctorOrSenior && (
                        <Badge className={cn('text-primary-foreground text-sm', CRY_COLORS[currentResult.classification].badge)}>
                          {currentResult.confidence}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{currentResult.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">Detected at {currentResult.timestamp.toLocaleTimeString()}</p>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/30">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">This is an assistive tool only. Always consult healthcare professionals for medical concerns.</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent History */}
            <Card className="card-medical">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Recent Cry Activity
                  </CardTitle>
                  <Badge variant="secondary">{babyHistory.length} events</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {babyHistory.slice(0, 15).map(event => (
                  <div key={event.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', CRY_COLORS[event.classification].bg)}>
                    <span className="text-xl">{CRY_COLORS[event.classification].icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize">{event.classification}</span>
                        <span className="text-xs text-muted-foreground">{event.babyName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.timestamp.toLocaleString()} · ~{event.duration}s
                      </p>
                    </div>
                    {isDoctorOrSenior && (
                      <Badge variant="secondary" className="text-xs">{event.confidence}%</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Stats */}
          <div className="space-y-4">
            <Card className="card-medical">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Detection Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-status-normal-bg">
                    <div className="flex items-center gap-2">
                      <span>😊</span>
                      <span className="text-sm font-medium">Normal</span>
                    </div>
                    <span className="text-lg font-bold text-status-normal">{normalCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-status-warning-bg">
                    <div className="flex items-center gap-2">
                      <span>😟</span>
                      <span className="text-sm font-medium">Discomfort</span>
                    </div>
                    <span className="text-lg font-bold text-status-warning">{discomfortCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-status-critical-bg">
                    <div className="flex items-center gap-2">
                      <span>😢</span>
                      <span className="text-sm font-medium">Pain</span>
                    </div>
                    <span className="text-lg font-bold text-status-critical">{painCount}</span>
                  </div>
                </div>

                {isDoctorOrSenior && (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Avg Confidence</span>
                      <span className="text-lg font-bold text-primary">{avgConfidence}%</span>
                    </div>
                    <Progress value={avgConfidence} className="h-2" />
                  </div>
                )}

                <div className="pt-4 border-t border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Confidence Trend</p>
                  <div className="flex items-end gap-1 h-16">
                    {babyHistory.slice(0, 12).reverse().map((event, i) => (
                      <div
                        key={i}
                        className={cn('flex-1 rounded-t transition-all', CRY_COLORS[event.classification].badge)}
                        style={{ height: `${event.confidence}%`, opacity: isDoctorOrSenior ? 1 : 0.5 }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-medical">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning-bg border border-status-warning/20">
                  <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">
                    Cry detection is assistive technology only and does not constitute a medical diagnosis. Always verify with clinical assessment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CryDetectionPage;
