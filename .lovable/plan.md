

# NeoGuard Voice + Chat Assistant Module

## Important Note on Technology

This project runs on Lovable Cloud, which uses backend functions (not Python/Flask). The Voice + Chat Assistant will be built using:
- **Frontend**: React (as requested)
- **Backend**: Lovable Cloud backend functions (equivalent to your Flask routes, but serverless)
- **AI**: Lovable AI Gateway for chat intelligence (already configured, no extra API key needed)
- **Speech-to-Text**: Browser Web Speech API (free, works in Chrome/Edge, no API key needed)
- **Text-to-Speech**: Browser SpeechSynthesis API (free, built-in, no API key needed)

This approach gives you the same end result without needing to manage a separate Python server.

---

## What Will Be Built

### Page 1: Voice Assistant (`/voice-assistant`)
- Full-screen medical-themed voice interface
- Large animated microphone button in center
- Status indicators: Idle / Listening / Processing / Speaking
- Waveform animation while recording
- Live transcript display showing what was heard
- Scrollable conversation history panel
- Auto-plays AI voice response after processing
- Uses **Clinical Mode** system prompt (for NICU staff)

### Page 2: AI Chatbot (`/ai-chatbot`)
- WhatsApp-style chat interface with message bubbles
- Text input with embedded mic icon for voice input
- When mic used: speech converted to text, shown in chat, processed normally
- Auto voice playback toggle switch
- Uses **Parent Mode** system prompt (simple, reassuring language)
- Toggle switch to switch between Parent Mode and Clinical Mode

### Shared Backend Function
One new backend function: `neo-voice-chat`
- Accepts text messages
- Routes to Lovable AI Gateway with the appropriate system prompt (clinical or parent mode)
- Returns streaming AI response
- Multilingual support via language parameter

---

## Technical Plan

### 1. Create Backend Function
**File**: `supabase/functions/neo-voice-chat/index.ts`

- Accepts `{ messages, mode, language }` where mode is "clinical" or "parent"
- Two system prompts:
  - **Clinical**: Professional NICU assistant for doctors/nurses (vitals, SpO2, respiratory rate, incubator conditions)
  - **Parent**: Warm, simple, reassuring baby care assistant
- Streams response via Lovable AI Gateway using `google/gemini-3-flash-preview`
- Handles 429/402 rate limit errors

### 2. Create Voice Assistant Page
**File**: `src/pages/VoiceAssistant.tsx`

- Uses `webkitSpeechRecognition` / `SpeechRecognition` API for STT
- Uses `SpeechSynthesis` API for TTS playback
- UI elements:
  - Pulsating mic button with ring animation
  - Status badge (Idle / Listening / Processing / Speaking)
  - Real-time transcript display
  - Conversation history with timestamps
  - Waveform visualization using canvas or CSS animations
- Clinical Mode system prompt hardcoded
- Wrapped in `DashboardLayout` (accessible to logged-in staff)

### 3. Create AI Chatbot Page
**File**: `src/pages/AIChatbot.tsx`

- Chat bubble interface (user on right, AI on left)
- Input bar with send button and mic icon
- Mic icon triggers `SpeechRecognition`, fills input, auto-sends
- Toggle for auto voice playback (uses `SpeechSynthesis`)
- Toggle for Clinical/Parent mode
- Language selector dropdown
- Wrapped in `DashboardLayout`

### 4. Add Routes and Navigation
**File**: `src/App.tsx` - Add two new protected routes
**File**: `src/components/layout/DashboardLayout.tsx` - Add sidebar nav items:
  - "Voice Assistant" with Mic icon
  - "AI Chatbot" with MessageSquare icon

### 5. Browser Compatibility
- Speech Recognition works in Chrome, Edge, Safari
- Fallback message shown for unsupported browsers (e.g., Firefox)
- TTS works in all modern browsers

---

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/neo-voice-chat/index.ts` | Create |
| `src/pages/VoiceAssistant.tsx` | Create |
| `src/pages/AIChatbot.tsx` | Create |
| `src/App.tsx` | Edit (add 2 routes) |
| `src/components/layout/DashboardLayout.tsx` | Edit (add 2 nav items) |

No changes to baby data, alerts, database, authentication, or any existing features.

