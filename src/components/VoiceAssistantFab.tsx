import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, X, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Status = 'idle' | 'listening' | 'processing' | 'speaking';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/neo-voice-chat`;

const VoiceAssistantFab: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const messagesRef = useRef<{ role: string; content: string }[]>([]);
  const { toast } = useToast();

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognition;

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const speakText = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setStatus('speaking');
      utterance.onend = () => { setStatus('idle'); resolve(); };
      utterance.onerror = () => { setStatus('idle'); resolve(); };
      synth.speak(utterance);
    });
  }, []);

  const sendToAI = useCallback(async (userText: string) => {
    setStatus('processing');
    messagesRef.current.push({ role: 'user', content: userText });

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: messagesRef.current, mode: 'clinical' }),
      });

      if (!resp.ok) throw new Error('AI request failed');

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';

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
              setLastResponse(assistantText);
            }
          } catch { /* partial */ }
        }
      }

      if (assistantText) {
        messagesRef.current.push({ role: 'assistant', content: assistantText });
        await speakText(assistantText);
      } else {
        setStatus('idle');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setStatus('idle');
    }
  }, [speakText, toast]);

  const startListening = useCallback(() => {
    if (!speechSupported) {
      toast({ title: 'Not Supported', description: 'Use Chrome, Edge, or Safari.', variant: 'destructive' });
      return;
    }

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
      if (finalText.trim()) sendToAI(finalText.trim());
      else setStatus('idle');
    };
    recognition.onerror = (e: any) => {
      setStatus('idle');
      if (e.error !== 'no-speech') {
        toast({ title: 'Speech Error', description: e.error, variant: 'destructive' });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, speechSupported, sendToAI, toast]);

  const toggleMic = () => {
    if (!expanded) { setExpanded(true); return; }
    if (status === 'listening') recognitionRef.current?.stop();
    else if (status === 'idle') startListening();
  };

  const getIcon = () => {
    if (status === 'processing') return <Loader2 className="w-5 h-5 animate-spin" />;
    if (status === 'speaking') return <Volume2 className="w-5 h-5" />;
    if (status === 'listening') return <MicOff className="w-5 h-5" />;
    return <Mic className="w-5 h-5" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {expanded && (
        <div className="bg-card border border-border rounded-2xl shadow-xl w-72 p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Voice Assistant</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setExpanded(false); window.speechSynthesis.cancel(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {transcript && (
            <div className="p-2 rounded-lg bg-muted/50 text-xs text-foreground">
              <span className="text-muted-foreground font-semibold">You: </span>{transcript}
            </div>
          )}

          {lastResponse && (
            <div className="p-2 rounded-lg bg-primary/10 text-xs text-foreground max-h-32 overflow-y-auto">
              <span className="text-primary font-semibold">AI: </span>{lastResponse.slice(0, 200)}{lastResponse.length > 200 ? '...' : ''}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            {status === 'idle' && 'Tap mic to speak'}
            {status === 'listening' && 'Listening...'}
            {status === 'processing' && 'Processing...'}
            {status === 'speaking' && 'Speaking...'}
          </p>
        </div>
      )}

      <Button
        size="icon"
        onClick={toggleMic}
        disabled={status === 'processing'}
        className={cn(
          'w-14 h-14 rounded-full shadow-xl transition-all duration-300',
          status === 'listening'
            ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
            : 'gradient-primary hover:opacity-90'
        )}
      >
        {getIcon()}
      </Button>
    </div>
  );
};

export default VoiceAssistantFab;
