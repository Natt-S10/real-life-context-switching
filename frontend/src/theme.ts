import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#38bdf8' },
    secondary: { main: '#22d3ee' },
    background: { default: '#0b1020', paper: '#111827' },
    text: { primary: '#e5e7eb', secondary: '#9ca3af' }
  },
  shape: { borderRadius: 10 },
  typography: {
    fontSize: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': {
          height: '100%',
        },
        'body': {
          WebkitTextSizeAdjust: '120%',
          textSizeAdjust: '120%',
        },
        '*, *::before, *::after': {
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 transparent',
        },
        '*::-webkit-scrollbar': {
          width: 10,
          height: 10,
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: '#475569',
          borderRadius: 8,
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
      },
    },
  },
});
