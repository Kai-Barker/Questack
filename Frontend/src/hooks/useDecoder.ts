import { useRef, useState } from 'react';
import { checkDecoderAnswer, COMMS_DOWN_MESSAGE, CommsError, decodeStandalone, sendDecoderMessage } from '../services/aiService';
import type { DecodedTransmission, DecoderCheckResult } from '../types/ai';
import type { ProficiencyLevel } from '../types/pilot';
import type { CommsMessage } from './useQuestSession';

// The standalone decoder's state. Not a quest: nothing here touches quest
// progress or XP, and the code only ever lives in this page's memory.
//
//   paste   -> the pilot pastes code, picks a sector and decodes it
//   decoded -> sections one at a time, follow-up chat, then the comprehension check

const GREETING: CommsMessage = {
  id: 0,
  from: 'ai',
  tone: 'info',
  text: "Paste an intercepted transmission and I'll decode it with you, section by section. Ask me anything about it once it's decoded.",
};

const failure = (err: unknown) => (err instanceof CommsError ? err.message : COMMS_DOWN_MESSAGE);

export function useDecoder() {
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [explainAs, setExplainAs] = useState<ProficiencyLevel>('cadet');
  const [code, setCode] = useState('');
  const [transmission, setTransmission] = useState<DecodedTransmission | null>(null);
  const [step, setStep] = useState(0);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const [answer, setAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [result, setResult] = useState<DecoderCheckResult | null>(null);

  const [messages, setMessages] = useState<CommsMessage[]>([GREETING]);
  const [chatBusy, setChatBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const nextId = useRef(1);

  const addMessage = (message: Omit<CommsMessage, 'id'>) =>
    setMessages((list) => [...list, { ...message, id: nextId.current++ }]);

  const decoded = transmission !== null;
  const sections = transmission?.sections ?? [];
  const atLastSection = decoded && step >= sections.length - 1;

  async function decode() {
    if (languageId === null || !code.trim() || decoding) return;
    setDecoding(true);
    setDecodeError(null);
    try {
      const result = await decodeStandalone({ languageId, proficiency: explainAs, code });
      setTransmission(result);
      setStep(0);
      setOnline(true);
      addMessage({
        from: 'ai',
        tone: 'decode',
        label: 'Decode complete',
        text: result.question
          ? `Decoded in ${result.sections.length} section${result.sections.length === 1 ? '' : 's'}. Step through them, ask me anything, then take the comprehension check.`
          : result.sections[0]?.explanation ?? "That doesn't look like code, Pilot.",
      });
    } catch (err) {
      setDecodeError(failure(err));
      setOnline(false);
    } finally {
      setDecoding(false);
    }
  }

  // Back to an empty decoder for a new transmission
  function reset() {
    setTransmission(null);
    setCode('');
    setStep(0);
    setAnswer('');
    setResult(null);
    setCheckError(null);
    setDecodeError(null);
    setMessages([GREETING]);
  }

  async function sendChat(text: string) {
    const message = text.trim();
    if (!message || chatBusy) return;
    if (!decoded || languageId === null) {
      addMessage({ from: 'pilot', tone: 'chat', text: message });
      addMessage({ from: 'ai', tone: 'info', text: 'Decode the transmission first, Pilot. Then I can talk you through it.' });
      return;
    }

    // Only the conversation itself goes back to the AI, not status notes
    const history = messages.filter((m) => m.tone === 'chat').map((m) => ({ from: m.from, text: m.text }));
    addMessage({ from: 'pilot', tone: 'chat', text: message });
    setChatBusy(true);
    try {
      const reply = await sendDecoderMessage({
        languageId,
        proficiency: explainAs,
        code,
        messages: [...history, { from: 'pilot' as const, text: message }].slice(-20),
        question: transmission?.question ?? undefined,
      });
      addMessage({ from: 'ai', tone: 'chat', text: reply });
      setOnline(true);
    } catch (err) {
      addMessage({ from: 'ai', tone: 'error', text: failure(err) });
      setOnline(false);
    } finally {
      setChatBusy(false);
    }
  }

  async function submitCheck() {
    if (!transmission?.checkToken || !answer.trim() || checking) return;
    setChecking(true);
    setCheckError(null);
    try {
      const evaluation = await checkDecoderAnswer({
        proficiency: explainAs,
        code,
        checkToken: transmission.checkToken,
        answer,
      });
      setResult(evaluation);
      setOnline(true);
    } catch (err) {
      setCheckError(failure(err));
      setOnline(false);
    } finally {
      setChecking(false);
    }
  }

  return {
    languageId,
    setLanguageId,
    explainAs,
    setExplainAs,
    code,
    setCode,
    transmission,
    decoded,
    sections,
    step,
    atLastSection,
    next: () => setStep((s) => Math.min(s + 1, sections.length - 1)),
    previous: () => setStep((s) => Math.max(s - 1, 0)),
    decoding,
    decodeError,
    decode,
    reset,
    answer,
    setAnswer,
    checking,
    checkError,
    result,
    submitCheck,
    messages,
    chatBusy,
    online,
    sendChat,
  };
}
