import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './src/theme';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}
