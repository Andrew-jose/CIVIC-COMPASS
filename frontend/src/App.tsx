import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Journey } from './pages/Journey';
import { Timeline } from './pages/Timeline';
import { Ballot } from './pages/Ballot';
import { Checklist } from './pages/Checklist';
import { History } from './pages/History';
import { FactCheck } from './pages/FactCheck';

export default function App() {
  return (
    <BrowserRouter>
      {/* Skip navigation link for accessibility (WCAG 2.2 AA) */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/ballot" element={<Ballot />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/factcheck" element={<FactCheck />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}
