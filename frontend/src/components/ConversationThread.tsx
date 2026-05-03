import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../store/useSessionStore';
import { ConfidenceBar } from './ConfidenceBar';
import { SourceCitationPanel } from './SourceCitationPanel';

interface ConversationThreadProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

/**
 * ConversationThread — Scrollable, auto-scrolling chat interface.
 * User bubbles (right), AI responses (left) with citation badges,
 * confidence indicator, source links, and streaming cursor.
 * Handles Gemini 3 Thought Signatures for multi-turn persistence.
 */
export function ConversationThread({ messages }: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16 px-4"
      >
        <div className="text-6xl mb-4">🧭</div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Welcome to CIVIC COMPASS
        </h2>
        <p className="text-text-secondary max-w-md mx-auto mb-6">
          Ask me anything about your election journey — registration,
          deadlines, ID requirements, ballot measures, and more.
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {[
            'How do I register to vote?',
            'What ID do I need?',
            'When is early voting?',
            'Explain my ballot',
          ].map((suggestion) => (
            <span key={suggestion} className="text-xs rounded-full border border-border-default px-3 py-1.5 text-text-muted">
              {suggestion}
            </span>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className="space-y-4"
      role="log"
      aria-live="polite"
      aria-label="Conversation with CIVIC COMPASS AI"
    >
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
            {/* AI avatar */}
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-2 mb-1.5 text-xs text-text-muted">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-civic-blue/20 text-civic-blue-light text-[10px] font-bold">
                  CC
                </span>
                <span>CIVIC COMPASS</span>
                {msg.isStreaming && <span className="animate-pulse text-civic-green">●</span>}
              </div>
            )}

            {/* Message content */}
            <div className={`whitespace-pre-wrap text-sm leading-relaxed ${msg.isStreaming ? 'streaming-cursor' : ''}`}>
              {msg.content || (msg.isStreaming ? '' : '...')}
            </div>

            {/* Confidence + Sources (only for AI messages) */}
            {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
              <div className="mt-2 space-y-1">
                {msg.confidence !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <ConfidenceBar confidence={msg.confidence} size="sm" />
                    </div>
                  </div>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <SourceCitationPanel sources={msg.sources} />
                )}
              </div>
            )}

            {/* Timestamp */}
            <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/50 text-right' : 'text-text-muted'}`}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </motion.div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
