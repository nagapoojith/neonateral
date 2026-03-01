import React, { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Mic, MicOff, Volume2, VolumeX, Bot, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string; timestamp: Date };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/neo-voice-chat`;

const LANGUAGES = [
  { code: 'en', label: 'English', speechCode: 'en-US' },
  { code: 'hi', label: 'Hindi', speechCode: 'hi-IN' },
  { code: 'es', label: 'Spanish', speechCode: 'es-ES' },
  { code: 'fr', label: 'French', speechCode: 'fr-FR' },
  { code: 'ar', label: 'Arabic', speechCode: 'ar-SA' },
  { code: 'zh', label: 'Chinese', speechCode: 'zh-CN' },
];

const AIChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'parent' | 'clinical'>('parent');
  const [autoVoice, setAutoVoice] = useState(false);
  const [language, setLanguage] = useState('en');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognition;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    const langConfig = LANGUAGES.find(l => l.code === language);
    if (langConfig) utterance.lang = langConfig.speechCode;
    synth.speak(utterance);
  }, [language]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setInput('');

    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    const chatHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    let assistantText = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatHistory, mode, language }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
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

      if (autoVoice && assistantText) speakText(assistantText);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [messages, mode, language, autoVoice, isLoading, speakText, toast]);

  const toggleMic = () => {
    if (!speechSupported) {
      toast({ title: 'Not Supported', description: 'Use Chrome, Edge, or Safari for voice input.', variant: 'destructive' });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    const langConfig = LANGUAGES.find(l => l.code === language);
    recognition.lang = langConfig?.speechCode || 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const result = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setInput(result);
    };
    recognition.onend = () => {
      setIsListening(false);
      // Auto-send on voice end
      setTimeout(() => {
        const el = inputRef.current;
        if (el && el.value.trim()) {
          sendMessage(el.value);
        }
      }, 100);
    };
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== 'no-speech') toast({ title: 'Speech Error', description: e.error, variant: 'destructive' });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Chatbot</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'parent' ? 'Parent Support Mode' : 'Clinical Mode'} — {LANGUAGES.find(l => l.code === language)?.label}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">Clinical</Label>
              <Switch
                id="mode-toggle"
                checked={mode === 'parent'}
                onCheckedChange={(v) => setMode(v ? 'parent' : 'clinical')}
              />
              <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">Parent</Label>
            </div>
            <div className="flex items-center gap-2">
              {autoVoice ? <Volume2 className="w-4 h-4 text-muted-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
              <Switch checked={autoVoice} onCheckedChange={setAutoVoice} />
              <Label className="text-xs text-muted-foreground">Voice</Label>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">NeoGuard AI Assistant</p>
                    <p className="text-xs mt-1">Ask me anything about neonatal care</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-3',
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
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Bar */}
            <div className="p-4 border-t border-border/50">
              {isListening && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-status-critical animate-pulse" />
                  <span className="text-xs text-status-critical font-medium">Listening...</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === 'parent' ? 'Ask about your baby...' : 'Ask a clinical question...'}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMic}
                    disabled={isLoading}
                    className={cn(
                      'absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg',
                      isListening && 'text-status-critical'
                    )}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="rounded-xl gradient-primary h-10 w-10"
                >
                  <Send className="w-4 h-4 text-primary-foreground" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AIChatbot;
