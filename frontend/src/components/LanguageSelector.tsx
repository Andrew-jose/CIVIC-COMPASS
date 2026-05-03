import { useSessionStore } from '../store/useSessionStore';

const LANGUAGES: ReadonlyArray<{ code: string; label: string; nativeLabel: string; rtl?: boolean }> = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
];

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

/**
 * LanguageSelector — 8-language dropdown that switches UI and AI response language.
 * Triggers RTL layout when Arabic is selected.
 */
export function LanguageSelector({ compact = false, className = '' }: LanguageSelectorProps) {
  const { language, setLanguage } = useSessionStore();

  const handleChange = (code: string) => {
    setLanguage(code);
    const lang = LANGUAGES.find(l => l.code === code);
    if (lang?.rtl) {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label htmlFor="language-select" className="sr-only">Select language</label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none rounded-lg border border-border-default bg-surface-secondary px-3 py-1.5 pr-8 text-sm text-text-primary cursor-pointer hover:border-civic-blue/50 focus:border-civic-blue outline-none transition-colors"
        aria-label="Select your preferred language"
      >
        {LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {compact ? lang.nativeLabel : `${lang.nativeLabel} — ${lang.label}`}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <svg className="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export { LANGUAGES };
