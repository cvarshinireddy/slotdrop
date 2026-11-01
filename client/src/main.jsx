import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user": Framer drops transform/layout animation when the OS asks for less motion */}
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <ErrorBoundary><App /></ErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>
);
