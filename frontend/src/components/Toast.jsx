import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now();
    const newToast = { id, ...toast };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove após duração
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 5000);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, description) => {
    return addToast({ type: 'success', message, description });
  }, [addToast]);

  const error = useCallback((message, description) => {
    return addToast({ type: 'error', message, description, duration: 7000 });
  }, [addToast]);

  const warning = useCallback((message, description) => {
    return addToast({ type: 'warning', message, description });
  }, [addToast]);

  const info = useCallback((message, description) => {
    return addToast({ type: 'info', message, description });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const { type, message, description } = toast;

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-900'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-900'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    }
  };

  const { icon: Icon, bgColor, borderColor, iconColor, textColor } = config[type];

  return (
    <div
      className={`${bgColor} ${borderColor} border rounded-lg shadow-lg p-4 animate-slideInRight`}
      style={{
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <div className="flex items-start gap-3">
        <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${textColor}`}>{message}</p>
          {description && (
            <p className={`text-sm ${textColor} opacity-90 mt-1`}>{description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className={`${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

// CSS Animation (adicionar ao index.css)
export const toastAnimationCSS = `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slideInRight {
  animation: slideInRight 0.3s ease-out;
}
`;
