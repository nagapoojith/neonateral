import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isEscalation?: boolean;
}

interface SymptomTracker {
  [symptom: string]: number;
}

interface ParentChatbotProps {
  babyName?: string;
  onShowHospitals: () => void;
}

const SERIOUS_SYMPTOMS = [
  'breathing difficulty',
  'breathing problem',
  'not breathing',
  'blue lips',
  'blue skin',
  'unconscious',
  'seizure',
  'convulsion',
  'high fever',
  'persistent fever',
  'continuous vomiting',
  'blood in stool',
  'blood in vomit',
  'not feeding',
  'refusing to eat',
  'limp',
  'unresponsive',
  'excessive crying',
  'inconsolable',
  'rash spreading',
  'swelling',
];

const ParentChatbot: React.FC<ParentChatbotProps> = ({ babyName, onShowHospitals }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your neonatal care assistant. I'm here to help answer your questions about newborn care, feeding, sleep, hygiene, health concerns, and more.\n\n**Note:** I provide general guidance only and cannot access specific baby records. For personalized medical advice, please consult your pediatrician.\n\nHow can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [symptomTracker, setSymptomTracker] = useState<SymptomTracker>({});
  const [showEscalationWarning, setShowEscalationWarning] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const checkForEscalation = (userMessage: string): { shouldEscalate: boolean; reason: string } => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for serious symptoms
    for (const symptom of SERIOUS_SYMPTOMS) {
      if (lowerMessage.includes(symptom)) {
        return { shouldEscalate: true, reason: `Serious symptom detected: ${symptom}` };
      }
    }

    // Track repeated symptom mentions
    const updatedTracker = { ...symptomTracker };
    const symptomKeywords = ['fever', 'vomit', 'cry', 'rash', 'cough', 'breathing', 'diarrhea', 'constipation'];
    
    for (const keyword of symptomKeywords) {
      if (lowerMessage.includes(keyword)) {
        updatedTracker[keyword] = (updatedTracker[keyword] || 0) + 1;
        
        if (updatedTracker[keyword] >= 5) {
          setSymptomTracker(updatedTracker);
          return { shouldEscalate: true, reason: `Repeated concern about: ${keyword}` };
        }
      }
    }
    
    setSymptomTracker(updatedTracker);
    return { shouldEscalate: false, reason: '' };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Check for escalation
    const escalation = checkForEscalation(userMessage);
    
    if (escalation.shouldEscalate) {
      setShowEscalationWarning(true);
      const escalationMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **IMPORTANT HEALTH ALERT**\n\nBased on your concern about ${escalation.reason.replace('Serious symptom detected: ', '').replace('Repeated concern about: ', '')}, I strongly recommend you seek immediate medical attention.\n\n**Please consider:**\n- Contacting your pediatrician immediately\n- Visiting the nearest hospital emergency room\n- Calling emergency services if the situation is severe\n\nYour baby's safety is the top priority. Click "Find Nearest Hospitals" below to locate medical facilities near you.`,
        timestamp: new Date(),
        isEscalation: true,
      };
      setMessages(prev => [...prev, escalationMsg]);
      return;
    }

    setIsLoading(true);

    try {
      // Call the chatbot edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parent-chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.filter(m => !m.isEscalation).map(m => ({
            role: m.role,
            content: m.content,
          })).concat({ role: 'user', content: userMessage }),
          isGeneralMode: true, // Indicates this is general guidance, not baby-specific
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Too many requests. Please wait a moment and try again.');
          return;
        }
        if (response.status === 402) {
          toast.error('Service temporarily unavailable. Please try again later.');
          return;
        }
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMsgId = (Date.now() + 1).toString();

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      toast.error('Failed to get a response. Please try again.');
      
      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact your healthcare provider if you have urgent concerns.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'How often should I feed my baby?',
    'What is a normal baby temperature?',
    'Why is my baby crying?',
    'Safe sleep positions for babies',
  ];

  return (
    <Card className="card-medical h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-primary" />
          Baby Care Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Escalation Warning Banner */}
        {showEscalationWarning && (
          <div className="p-3 bg-status-critical-bg border-b border-status-critical/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-status-critical" />
                <span className="text-sm font-medium text-status-critical">
                  Medical attention may be needed
                </span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={onShowHospitals}
                className="gap-1"
              >
                <MapPin className="w-4 h-4" />
                Find Hospitals
              </Button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.isEscalation
                      ? 'bg-status-critical text-primary-foreground'
                      : 'bg-accent text-accent-foreground'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.isEscalation
                      ? 'bg-status-critical-bg border border-status-critical/30'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <Bot className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Questions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setInput(question);
                    inputRef.current?.focus();
                  }}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about baby care, feeding, sleep, health..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="gradient-hero"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParentChatbot;
