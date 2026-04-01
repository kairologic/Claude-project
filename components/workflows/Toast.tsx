'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { colors, typography, spacing, radii, transitions, keyframes } from '@/lib/design-tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  message: string;
  duration: number;
}

export interface UseToastReturn {
  showToast: (message: string, duration?: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, duration = 2000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, message, duration };

    setToasts((prev) => [...prev, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useToast
// ─────────────────────────────────────────────────────────────────────────────

export const useToast = (): UseToastReturn => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    showToast: context.addToast,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast Container Component
// ─────────────────────────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: spacing.xl,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    zIndex: 9999,
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

ToastContainer.displayName = 'ToastContainer';

// ─────────────────────────────────────────────────────────────────────────────
// Toast Item Component
// ─────────────────────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 200); // Match animation duration
  };

  const itemStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.md}px ${spacing.lg}px`,
    backgroundColor: colors.navy,
    color: colors.white,
    borderRadius: radii.md,
    ...typography.body,
    fontWeight: 500,
    boxShadow: '0 8px 24px rgba(11,30,46,0.12)',
    animation: isExiting
      ? `fadeOutDown 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
      : `fadeInUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
    pointerEvents: 'auto',
    cursor: 'default',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
    textAlign: 'center',
  };

  return (
    <>
      {/* Inject keyframe animations */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeOutDown {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(8px);
            }
          }
        `}
      </style>
      <div style={itemStyle} role="status" aria-live="polite">
        {toast.message}
      </div>
    </>
  );
};

ToastItem.displayName = 'ToastItem';

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Toast Component (for manual rendering if needed)
// ─────────────────────────────────────────────────────────────────────────────

export interface StandaloneToastProps {
  message: string;
  isVisible: boolean;
  onDismiss?: () => void;
  duration?: number;
}

export const Toast: React.FC<StandaloneToastProps> = ({
  message,
  isVisible,
  onDismiss,
  duration = 2000,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  React.useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss?.();
        setIsExiting(false);
      }, 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onDismiss]);

  if (!isVisible && !isExiting) return null;

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: spacing.xl,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.md}px ${spacing.lg}px`,
    backgroundColor: colors.navy,
    color: colors.white,
    borderRadius: radii.md,
    ...typography.body,
    fontWeight: 500,
    boxShadow: '0 8px 24px rgba(11,30,46,0.12)',
    animation: isExiting
      ? `fadeOutDown 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
      : `fadeInUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
    zIndex: 9999,
    whiteSpace: 'nowrap',
    maxWidth: '400px',
    textAlign: 'center',
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeOutDown {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(8px);
            }
          }
        `}
      </style>
      <div style={toastStyle} role="status" aria-live="polite">
        {message}
      </div>
    </>
  );
};

Toast.displayName = 'Toast';
