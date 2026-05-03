import React from 'react';
import { render } from '@testing-library/react';
// Provide basic wrapper for tests
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <div>
      {ui}
    </div>
  );
};
