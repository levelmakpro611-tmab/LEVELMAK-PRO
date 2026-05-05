import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<{ type: string, message: string, timestamp: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type: string, args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev, { 
        type, 
        message, 
        timestamp: new Date().toLocaleTimeString() 
      }].slice(-100)); // Keep last 100 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-[9999] bg-slate-900/80 backdrop-blur-md border border-white/10 p-3 rounded-full shadow-2xl text-primary"
      >
        <Terminal size={20} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 z-[9999] bg-slate-950 border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden flex flex-col ${isMinimized ? 'w-64 h-12' : 'w-[90vw] h-[60vh] max-w-lg'}`}>
      <div className="flex items-center justify-between px-4 h-12 bg-white/5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <Terminal size={14} className="text-primary" /> Console Debug
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLogs([])} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500">
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px] custom-scrollbar bg-black/50">
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-3 pb-2 border-b border-white/5 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'}`}>
              <span className="opacity-30 shrink-0">[{log.timestamp}]</span>
              <span className="break-words whitespace-pre-wrap">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center text-slate-600 py-10 italic">Aucun log pour le moment...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugConsole;
