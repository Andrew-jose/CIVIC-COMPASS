import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';
import { ConversationThread } from '../components/ConversationThread';
import { LanguageSelector } from '../components/LanguageSelector';

/**
 * Journey Page — Main AI conversation + election journey view.
 * Features SSE streaming from Gemini 3 Flash, Thought Signature preservation,
 * sidebar navigation to all features, and language selection.
 */
export function Journey() {
  const {
    messages, addMessage, updateMessage,
    isStreaming, setStreaming,
    jurisdiction, language,
  } = useSessionStore();

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsgId = `user-${Date.now()}`;
    addMessage({ id: userMsgId, role: 'user', content: text, timestamp: Date.now() });
    setInput('');
    setStreaming(true);

    const aiMsgId = `ai-${Date.now()}`;
    addMessage({ id: aiMsgId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true });

    try {
      const history = messages.map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [
          { text: m.content },
          ...(m.thoughtSignature ? [{ thoughtSignature: m.thoughtSignature }] : []),
        ],
      }));

      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: history,
          jurisdictionContext: jurisdiction,
          language,
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let thoughtSignature: string | undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text') { fullText += parsed.content; updateMessage(aiMsgId, { content: fullText }); }
              else if (parsed.type === 'done') { thoughtSignature = parsed.thoughtSignature; }
            } catch { /* skip malformed */ }
          }
        }
      }
      updateMessage(aiMsgId, { content: fullText, isStreaming: false, thoughtSignature });
    } catch {
      updateMessage(aiMsgId, { content: 'I apologize, but I encountered an error. Please try again.', isStreaming: false });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const NAV_ITEMS = [
    { path: '/timeline', icon: '📅', label: 'Timeline' },
    { path: '/ballot', icon: '📋', label: 'Ballot' },
    { path: '/checklist', icon: '✅', label: 'Checklist' },
    { path: '/factcheck', icon: '🔍', label: 'Fact Check' },
    { path: '/history', icon: '📚', label: 'History' },
  ];

  return (
    <div className="flex h-screen bg-surface-primary">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border-default bg-surface-secondary/50 p-3">
        <Link to="/" className="flex items-center gap-2 px-3 py-2 mb-4">
          <span className="text-xl">🧭</span>
          <span className="text-sm font-bold gradient-text">CIVIC COMPASS</span>
        </Link>

        <nav className="flex-1 space-y-1" aria-label="Feature navigation">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/50 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-4 border-t border-border-default">
          <LanguageSelector compact />
          {jurisdiction && (
            <p className="text-xs text-text-muted px-1 truncate" title={`${jurisdiction.county}, ${jurisdiction.state}`}>
              📍 {jurisdiction.county}, {jurisdiction.state}
            </p>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex md:hidden items-center justify-between border-b border-border-default px-4 py-3">
          <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">← Home</Link>
          <h1 className="text-sm font-semibold gradient-text">CIVIC COMPASS</h1>
          <LanguageSelector compact />
        </header>

        {/* Mobile nav bar */}
        <nav className="flex md:hidden overflow-x-auto border-b border-border-default px-2 py-1.5 gap-1 scrollbar-none" aria-label="Feature navigation">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-tertiary whitespace-nowrap transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <ConversationThread messages={messages} isStreaming={isStreaming} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border-default px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl flex gap-2">
            <label htmlFor="journey-chat-input" className="sr-only">Type your message</label>
            <input
              ref={inputRef}
              id="journey-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about your election journey..."
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-border-default bg-surface-secondary px-4 py-3 text-text-primary placeholder:text-text-muted outline-none focus:border-civic-blue transition-colors disabled:opacity-50 text-sm"
              aria-label="Type your question about the election process"
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="rounded-xl bg-civic-blue px-5 py-3 text-sm font-semibold text-white hover:bg-civic-blue-light disabled:opacity-50 transition-colors"
              aria-label="Send message"
            >
              {isStreaming ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
