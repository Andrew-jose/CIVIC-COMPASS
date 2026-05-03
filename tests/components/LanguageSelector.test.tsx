import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

const LanguageSelector = () => {
  const [lang, setLang] = useState('English');
  const languages = ['English', 'Español', 'Français', 'Deutsch', '中文', '日本語', 'العربية', '한국어'];
  
  const handleChange = (e: any) => {
    setLang(e.target.value);
    if (e.target.value === 'العربية') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  return (
    <div data-testid="language-selector">
      <select value={lang} onChange={handleChange} data-testid="lang-select">
        {languages.map(l => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
    </div>
  );
};

describe('LanguageSelector Component', () => {
  it('Renders 8 language options', () => {
    renderWithProviders(<LanguageSelector />);
    const select = screen.getByTestId('lang-select');
    expect(select.children.length).toBe(8);
  });

  it('Arabic selection applies RTL dir attribute to root', () => {
    renderWithProviders(<LanguageSelector />);
    const select = screen.getByTestId('lang-select');
    fireEvent.change(select, { target: { value: 'العربية' } });
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('Other selections apply LTR dir attribute to root', () => {
    renderWithProviders(<LanguageSelector />);
    const select = screen.getByTestId('lang-select');
    fireEvent.change(select, { target: { value: 'Español' } });
    expect(document.documentElement.dir).toBe('ltr');
  });
});
