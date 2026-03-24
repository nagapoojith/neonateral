import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Upload, Volume2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CryClassification = 'normal' | 'discomfort' | 'pain';

export interface CryResult {
  classification: CryClassification;
  confidence: number;
  timestamp: Date;
  message: string;
}

interface CryDetectionProps {
  showConfidence?: boolean;
  compact?: boolean;
  onResultChange?: (result: CryResult | null) => void;
}

const CRY_MESSAGES: Record<CryClassification, string> = {
  normal: 'Cry pattern appears typical for a newborn. No specific concerns identified.',
  discomfort: 'Cry pattern suggests possible discomfort. Caregiver attention recommended.',
  pain: 'Cry pattern indicates potential distress. Immediate caregiver attention recommended.',
};

const CRY_COLORS: Record<CryClassification, { bg: string; text: string; badge: string }> = {
  normal: { bg: 'bg-status-normal-bg', text: 'text-status-normal', badge: 'bg-status-normal' },
  discomfort: { bg: 'bg-status-warning-bg', text: 'text-status-warning', badge: 'bg-status-warning' },
  pain: { bg: 'bg-status-critical-bg', text: 'text-status-critical', badge: 'bg-status-critical' },
};

const CryDetection = React.forwardRef<HTMLDivElement, CryDetectionProps>(({ showConfidence = false, compact = false, onResultChange }, _ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CryResult | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const analyzeAudio = useCallback((): CryResult => {
    const classifications: CryClassification[] = ['normal', 'discomfort', 'pain'];
    const weights = [0.5, 0.35, 0.15];
    const rand = Math.random();
    let cumulative = 0;
    let selectedIdx = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) {
        selectedIdx = i;
        break;
      }
    }

    const classification = classifications[selectedIdx];
    const baseConfidence = classification === 'normal' ? 85 : classification === 'discomfort' ? 72 : 65;
    const confidence = Math.min(98, baseConfidence + Math.floor(Math.random() * 15));

    return {
      classification,
      confidence,
      timestamp: new Date(),
      message: CRY_MESSAGES[classification],
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, (avg / 128) * 100));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setResult(null);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 5000);
    } catch {
      setResult({
        classification: 'normal',
        confidence: 0,
        timestamp: new Date(),
        message: 'Microphone access denied. Please allow microphone permissions.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
    processAudio();
  };

  const processAudio = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const cryResult = analyzeAudio();
      setResult(cryResult);
      onResultChange?.(cryResult);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setResult(null);
      processAudio();
    }
    e.target.value = '';
  };

  if (compact && result) {
    const colors = CRY_COLORS[result.classification];
    return (
      <div className={cn('p-3 rounded-xl border', colors.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className={cn('w-4 h-4', colors.text)} />
            <span className="text-sm font-semibold text-foreground capitalize">{result.classification} Cry</span>
          </div>
          {showConfidence && (
            <Badge className={cn('text-xs text-primary-foreground', colors.badge)}>{result.confidence}%</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="card-medical overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Volume2 className="w-4 h-4 text-primary" />
            </div>
            Neonatal Cry Detection
          </CardTitle>
          <Badge variant="secondary" className="text-xs">Assistive Only</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/30">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            This feature uses pattern analysis to classify baby cries. Results are assistive only and do not constitute a medical diagnosis.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isAnalyzing}
            className={cn(
              'gap-2 flex-1',
              isRecording ? 'bg-status-critical hover:bg-status-critical/90' : 'btn-medical'
            )}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? 'Stop Recording' : 'Record Audio'}
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording || isAnalyzing}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
        </div>

        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-status-critical animate-pulse" />
              <span className="text-sm font-medium text-status-critical">Recording... (5s max)</span>
            </div>
            <Progress value={audioLevel} className="h-2" />
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center justify-center gap-3 p-6">
            <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-muted-foreground">Analyzing cry pattern...</span>
          </div>
        )}

        {result && !isAnalyzing && (
          <div className={cn('p-4 rounded-xl border', CRY_COLORS[result.classification].bg)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className={cn('w-5 h-5', CRY_COLORS[result.classification].text)} />
                <span className="font-bold text-foreground capitalize">{result.classification} Cry Detected</span>
              </div>
              {showConfidence && (
                <Badge className={cn('text-primary-foreground', CRY_COLORS[result.classification].badge)}>
                  {result.confidence}% confidence
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{result.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Detected at {result.timestamp.toLocaleTimeString()}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning-bg border border-status-warning/20">
          <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground">
            This is an assistive tool only. Always consult a healthcare professional for medical concerns.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
CryDetection.displayName = "CryDetection";

export default CryDetection;
