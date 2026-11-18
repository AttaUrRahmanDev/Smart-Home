import React, {useState} from 'react';
import {Mic, MicOff, Send, X} from 'lucide-react';

interface VoiceCommandBarProps {
  open: boolean;
  onClose: () => void;
  onExecute: (command: string) => Promise<string>;
  lastFeedback: string | null;
}

const EXAMPLE_COMMANDS = [
  'Turn on living room light',
  'Turn off auxiliary load',
  'Set thermostat to 22 degrees',
  'Turn on ventilation fan',
  'Show energy report',
  'Turn off all lights',
];

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  open,
  onClose,
  onExecute,
  lastFeedback,
}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(lastFeedback);

  if (!open) return null;

  const startMic = () => {
    const SpeechRec =
      (window as unknown as {SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown})
        .SpeechRecognition ||
      (window as unknown as {webkitSpeechRecognition?: new () => unknown}).webkitSpeechRecognition;

    if (!SpeechRec) {
      setFeedback('SpeechRecognition API unavailable in this browser. Type a command below.');
      return;
    }

    try {
      const rec = new SpeechRec() as {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (evt: {results: ArrayLike<ArrayLike<{transcript: string}>>}) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setListening(true);
      setFeedback('Listening... speak a smart home command');

      rec.onresult = async (evt) => {
        const text = evt.results[0][0].transcript;
        setTranscript(text);
        const reply = await onExecute(text);
        setFeedback(reply);
      };
      rec.onerror = () => {
        setListening(false);
        setFeedback('Microphone capture failed or permission denied. You can also type commands.');
      };
      rec.onend = () => {
        setListening(false);
      };
      rec.start();
    } catch {
      setListening(false);
      setFeedback('Could not initialize microphone. Use typed commands below.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    const reply = await onExecute(transcript.trim());
    setFeedback(reply);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Voice &amp; Quick Command Control
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
              Control ESP32 relays, thermostat, and navigation hands-free
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice command panel"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startMic}
            className={`min-h-[48px] flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition shrink-0 ${
              listening
                ? 'bg-red-500 text-white'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            }`}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? 'Listening...' : 'Speak'}
          </button>

          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder='Say or type "Turn on living room light"'
              className="flex-1 min-h-[48px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3.5 text-sm text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              aria-label="Run command"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 dark:border-[#263750] text-slate-700 dark:text-white hover:border-emerald-500"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {feedback && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
            {feedback}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9eb0c9]">Quick Voice Presets</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={async () => {
                  setTranscript(cmd);
                  const reply = await onExecute(cmd);
                  setFeedback(reply);
                }}
                className="min-h-[38px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-xs text-slate-700 dark:text-slate-200 hover:border-emerald-500/60 transition"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
