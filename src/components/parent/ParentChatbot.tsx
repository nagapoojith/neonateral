import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bot, User, AlertTriangle, MapPin, Loader2, Globe } from 'lucide-react';
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

type Language = 'english' | 'hindi' | 'tamil' | 'telugu' | 'malayalam';

const LANGUAGES: { value: Language; label: string; nativeLabel: string }[] = [
  { value: 'english', label: 'English', nativeLabel: 'English' },
  { value: 'hindi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { value: 'tamil', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { value: 'telugu', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { value: 'malayalam', label: 'Malayalam', nativeLabel: 'മലയാളം' },
];

const GREETING_MESSAGES: Record<Language, string> = {
  english: `Hello! 👋 I'm your neonatal care assistant.\n\nI provide general guidance on feeding, sleep, hygiene, and baby health.\n\n**Note:** I offer general advice only. Please consult your pediatrician for specific concerns.\n\nHow can I help you today?`,
  hindi: `नमस्ते! 👋 मैं आपका शिशु देखभाल सहायक हूं।\n\nमैं दूध पिलाने, नींद, स्वच्छता और शिशु स्वास्थ्य पर सामान्य मार्गदर्शन प्रदान करता हूं।\n\n**नोट:** मैं केवल सामान्य सलाह देता हूं। विशेष चिंताओं के लिए कृपया अपने बाल रोग विशेषज्ञ से परामर्श लें।\n\nआज मैं आपकी कैसे मदद कर सकता हूं?`,
  tamil: `வணக்கம்! 👋 நான் உங்கள் குழந்தை பராமரிப்பு உதவியாளர்.\n\nஉணவூட்டுதல், தூக்கம், சுகாதாரம் மற்றும் குழந்தை ஆரோக்கியம் பற்றிய பொது வழிகாட்டுதல்களை வழங்குகிறேன்.\n\n**குறிப்பு:** நான் பொது ஆலோசனை மட்டுமே தருகிறேன். குறிப்பிட்ட கவலைகளுக்கு உங்கள் குழந்தை மருத்துவரை அணுகவும்.\n\nஇன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?`,
  telugu: `నమస్కారం! 👋 నేను మీ శిశు సంరక్షణ సహాయకుడిని.\n\nఆహారం, నిద్ర, పరిశుభ్రత మరియు శిశు ఆరోగ్యంపై సాధారణ మార్గదర్శకత్వం అందిస్తాను.\n\n**గమనిక:** నేను సాధారణ సలహా మాత్రమే ఇస్తాను. నిర్దిష్ట ఆందోళనల కోసం మీ శిశు వైద్యుడిని సంప్రదించండి.\n\nఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?`,
  malayalam: `നമസ്കാരം! 👋 ഞാൻ നിങ്ങളുടെ ശിശു പരിചരണ സഹായിയാണ്.\n\nഭക്ഷണം, ഉറക്കം, ശുചിത്വം, ശിശു ആരോഗ്യം എന്നിവയെക്കുറിച്ച് പൊതു മാർഗ്ഗനിർദ്ദേശം നൽകുന്നു.\n\n**കുറിപ്പ്:** ഞാൻ പൊതു ഉപദേശം മാത്രമേ നൽകുന്നുള്ളൂ. പ്രത്യേക ആശങ്കകൾക്ക് നിങ്ങളുടെ ശിശുരോഗ വിദഗ്ധനെ സമീപിക്കുക.\n\nഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?`,
};

const QUICK_QUESTIONS: Record<Language, string[]> = {
  english: [
    'How often should I feed my baby?',
    'What is normal baby temperature?',
    'Safe sleep positions?',
    'Why is my baby crying?',
  ],
  hindi: [
    'मुझे बच्चे को कितनी बार दूध पिलाना चाहिए?',
    'बच्चे का सामान्य तापमान क्या है?',
    'सुरक्षित नींद की स्थिति?',
    'मेरा बच्चा क्यों रो रहा है?',
  ],
  tamil: [
    'எவ்வளவு அடிக்கடி குழந்தைக்கு பால் கொடுக்க வேண்டும்?',
    'குழந்தையின் இயல்பான வெப்பநிலை என்ன?',
    'பாதுகாப்பான தூக்க நிலைகள்?',
    'என் குழந்தை ஏன் அழுகிறது?',
  ],
  telugu: [
    'నేను బిడ్డకు ఎంత తరచుగా పాలు ఇవ్వాలి?',
    'బిడ్డ సాధారణ ఉష్ణోగ్రత ఎంత?',
    'సురక్షితమైన నిద్ర స్థానాలు?',
    'నా బిడ్డ ఎందుకు ఏడుస్తోంది?',
  ],
  malayalam: [
    'എത്ര തവണ കുഞ്ഞിന് പാൽ കൊടുക്കണം?',
    'കുഞ്ഞിന്റെ സാധാരണ ഊഷ്മാവ് എത്ര?',
    'സുരക്ഷിതമായ ഉറക്ക സ്ഥാനങ്ങൾ?',
    'എന്റെ കുഞ്ഞ് എന്തിനാണ് കരയുന്നത്?',
  ],
};

const PLACEHOLDER_TEXT: Record<Language, string> = {
  english: 'Ask about baby care, feeding, sleep...',
  hindi: 'शिशु देखभाल, दूध पिलाने, नींद के बारे में पूछें...',
  tamil: 'குழந்தை பராமரிப்பு, உணவூட்டுதல் பற்றி கேளுங்கள்...',
  telugu: 'శిశు సంరక్షణ, ఆహారం గురించి అడగండి...',
  malayalam: 'ശിശു പരിചരണം, ഭക്ഷണം എന്നിവയെക്കുറിച്ച് ചോദിക്കൂ...',
};

const SERIOUS_SYMPTOMS = [
  'breathing difficulty', 'breathing problem', 'not breathing', 'blue lips', 'blue skin',
  'unconscious', 'seizure', 'convulsion', 'high fever', 'persistent fever',
  'continuous vomiting', 'blood in stool', 'blood in vomit', 'not feeding',
  'refusing to eat', 'limp', 'unresponsive', 'excessive crying', 'inconsolable',
  'rash spreading', 'swelling',
];

const ParentChatbot: React.FC<ParentChatbotProps> = ({ babyName, onShowHospitals }) => {
  const [language, setLanguage] = useState<Language>('english');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: GREETING_MESSAGES.english,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [symptomTracker, setSymptomTracker] = useState<SymptomTracker>({});
  const [showEscalationWarning, setShowEscalationWarning] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update greeting when language changes
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: GREETING_MESSAGES[newLang],
      timestamp: new Date(),
    }]);
    setSymptomTracker({});
    setShowEscalationWarning(false);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const checkForEscalation = (userMessage: string): { shouldEscalate: boolean; reason: string } => {
    const lowerMessage = userMessage.toLowerCase();
    
    for (const symptom of SERIOUS_SYMPTOMS) {
      if (lowerMessage.includes(symptom)) {
        return { shouldEscalate: true, reason: `Serious symptom detected: ${symptom}` };
      }
    }

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

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    const escalation = checkForEscalation(userMessage);
    
    if (escalation.shouldEscalate) {
      setShowEscalationWarning(true);
      const escalationMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **IMPORTANT HEALTH ALERT**\n\nBased on your concern, I strongly recommend seeking immediate medical attention.\n\n• Contact your pediatrician immediately\n• Visit the nearest hospital emergency\n• Click "Find Hospitals" below`,
        timestamp: new Date(),
        isEscalation: true,
      };
      setMessages(prev => [...prev, escalationMsg]);
      return;
    }

    setIsLoading(true);

    try {
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
          language: language,
          isGeneralMode: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Too many requests. Please wait a moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('Service temporarily unavailable.');
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMsgId = (Date.now() + 1).toString();

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
                  m.id === assistantMsgId ? { ...m, content: assistantContent } : m
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
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
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

  return (
    <Card className="h-[600px] flex flex-col bg-gradient-to-b from-sky-50 to-white border-sky-100 shadow-lg rounded-3xl overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-sky-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-sky-800">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            Baby Care Assistant
          </CardTitle>
          
          {/* Language Selector */}
          <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
            <SelectTrigger className="w-[160px] bg-white border-sky-200 rounded-xl">
              <Globe className="w-4 h-4 mr-2 text-sky-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span>{lang.nativeLabel}</span>
                    <span className="text-muted-foreground text-xs">({lang.label})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Escalation Warning Banner */}
        {showEscalationWarning && (
          <div className="p-3 bg-rose-50 border-b border-rose-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-medium text-rose-700">
                  Medical attention may be needed
                </span>
              </div>
              <Button
                size="sm"
                onClick={onShowHospitals}
                className="gap-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
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
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-sky-500 to-teal-500'
                      : message.isEscalation
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-br from-teal-400 to-sky-400'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white'
                      : message.isEscalation
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : 'bg-white border border-sky-100 text-slate-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-sky-400 flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-sky-100 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                    <span className="text-sm text-slate-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Questions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS[language].map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300"
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
        <div className="p-4 border-t border-sky-100 bg-white/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={PLACEHOLDER_TEXT[language]}
              className="flex-1 rounded-xl border-sky-200 focus:border-sky-400 focus:ring-sky-400"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 shadow-md"
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
