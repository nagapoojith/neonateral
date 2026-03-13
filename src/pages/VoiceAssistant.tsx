import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

type Status = 'idle' | 'listening' | 'processing' | 'speaking';
type Message = { role: 'user' | 'assistant'; content: string; timestamp: Date };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/neo-voice-chat`;

const VoiceAssistant: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(4));
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>();
  const transcriptRef = useRef('');
  const messagesRef = useRef<Message[]>([]);
  const { toast } = useToast();

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognition;

  // Keep refs in sync
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Waveform animation
  useEffect(() => {
    if (status === 'listening') {
      const animate = () => {
        setWaveformBars(Array(20).fill(0).map(() => Math.random() * 28 + 4));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setWaveformBars(Array(20).fill(4));
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [status]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setStatus('speaking');
      utterance.onend = () => { setStatus('idle'); resolve(); };
      utterance.onerror = () => { setStatus('idle'); resolve(); };
      synth.speak(utterance);
    });
  }, []);

  const sendToAI = useCallback(async (userText: string) => {
    setStatus('processing');
    const userMsg: Message = { role: 'user', content: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    const chatHistory = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
    let assistantText = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatHistory, mode: 'clinical' }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'AI request failed');
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                }
                return [...prev, { role: 'assistant', content: assistantText, timestamp: new Date() }];
              });
            }
          } catch { /* partial */ }
        }
      }

      if (assistantText) await speakText(assistantText);
      else setStatus('idle');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setStatus('idle');
    }
  }, [speakText, toast]);

  const startListening = useCallback(() => {
    if (!speechSupported) {
      toast({ title: 'Not Supported', description: 'Speech recognition requires Chrome, Edge, or Safari.', variant: 'destructive' });
      return;
    }

    // Reset transcript
    setTranscript('');
    transcriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (e: any) => {
      const result = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setTranscript(result);
      transcriptRef.current = result;
    };

    recognition.onend = () => {
      const finalText = transcriptRef.current;
      setTranscript('');
      if (finalText.trim()) {
        sendToAI(finalText.trim());
      } else {
        setStatus('idle');
      }
    };

    recognition.onerror = (e: any) => {
      console.error('Speech error:', e.error);
      setStatus('idle');
      if (e.error !== 'no-speech') {
        toast({ title: 'Speech Error', description: e.error, variant: 'destructive' });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, speechSupported, sendToAI, toast]);

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const toggleMic = () => {
    if (status === 'listening') stopListening();
    else if (status === 'idle') startListening();
  };

  const statusConfig: Record<Status, { label: string; color: string }> = {
    idle: { label: 'Ready', color: 'bg-muted text-muted-foreground' },
    listening: { label: 'Listening...', color: 'bg-status-normal/20 text-status-normal' },
    processing: { label: 'Processing...', color: 'bg-primary/20 text-primary' },
    speaking: { label: 'Speaking...', color: 'bg-chart-4/20 text-chart-4' },
  };

// Standalone panel version (no DashboardLayout wrapper)
export const VoiceAssistantPanel: React.FC = () => {
  return <VoiceAssistantContent />;
};

const VoiceAssistantContent: React.FC = () => {
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Voice Assistant</h1>
            <p className="text-sm text-muted-foreground">Clinical Mode — NICU Staff Voice Interface</p>
          </div>
          <Badge className={cn('text-sm px-3 py-1', statusConfig[status].color)}>
            {statusConfig[status].label}
          </Badge>
        </div>

        {!speechSupported && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mic + Waveform */}
          <Card className="flex flex-col items-center justify-center py-12">
            <CardContent className="flex flex-col items-center gap-6">
              {/* Waveform */}
              <div className="flex items-end gap-1 h-12">
                {waveformBars.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 rounded-full transition-all duration-75',
                      status === 'listening' ? 'bg-status-normal' : 'bg-muted-foreground/30'
                    )}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              {/* Mic Button */}
              <div className="relative">
                {status === 'listening' && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-status-normal/20 animate-ping" style={{ scale: '1.5' }} />
                    <div className="absolute inset-0 rounded-full bg-status-normal/10 animate-pulse" style={{ scale: '1.8' }} />
                  </>
                )}
                <Button
                  size="icon"
                  onClick={toggleMic}
                  disabled={status === 'processing' || status === 'speaking'}
                  className={cn(
                    'w-24 h-24 rounded-full shadow-xl transition-all duration-300',
                    status === 'listening'
                      ? 'bg-status-critical hover:bg-status-critical/90'
                      : 'gradient-primary hover:opacity-90'
                  )}
                >
                  {status === 'processing' ? (
                    <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
                  ) : status === 'speaking' ? (
                    <Volume2 className="w-10 h-10 text-primary-foreground" />
                  ) : status === 'listening' ? (
                    <MicOff className="w-10 h-10 text-primary-foreground" />
                  ) : (
                    <Mic className="w-10 h-10 text-primary-foreground" />
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                {status === 'idle' && 'Tap the microphone to start speaking'}
                {status === 'listening' && 'Listening... tap again to stop'}
                {status === 'processing' && 'Analyzing your request...'}
                {status === 'speaking' && 'Playing response...'}
              </p>

              {/* Live Transcript */}
              {transcript && (
                <Card className="w-full bg-muted/50 border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">LIVE TRANSCRIPT</p>
                    <p className="text-sm text-foreground">{transcript}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b border-border/50">
                <h3 className="font-semibold text-foreground">Conversation History</h3>
                <p className="text-xs text-muted-foreground">{messages.length} messages</p>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conversations yet. Tap the mic to begin.</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}
                      >
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        <p className={cn('text-[10px] mt-1', msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VoiceAssistant;
