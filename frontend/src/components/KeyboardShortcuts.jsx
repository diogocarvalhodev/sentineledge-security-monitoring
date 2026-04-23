import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para gerenciar atalhos de teclado globais
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignorar se estiver em input/textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        // Exceto ESC que sempre funciona
        if (e.key !== 'Escape') return;
      }

      // ESC - Fechar modais/voltar
      if (e.key === 'Escape') {
        // Dispara evento customizado para componentes ouvirem
        window.dispatchEvent(new CustomEvent('closeModal'));
      }

      // / - Focar na busca
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Ctrl/Cmd + K - Busca global (futuro)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Implementar busca global no futuro
        console.log('Busca global (Ctrl+K)');
      }

      // Atalhos de navegação (Alt + número)
      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate('/');
            break;
          case '2':
            e.preventDefault();
            navigate('/cameras');
            break;
          case '3':
            e.preventDefault();
            navigate('/alerts');
            break;
          case '4':
            e.preventDefault();
            navigate('/map');
            break;
          case '5':
            e.preventDefault();
            navigate('/reports');
            break;
          case '6':
            e.preventDefault();
            navigate('/settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);
}

/**
 * Componente para mostrar atalhos disponíveis
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { keys: 'ESC', description: 'Fechar modais / Cancelar ação' },
    { keys: '/', description: 'Focar na busca' },
    { keys: 'Alt + 1', description: 'Ir para Dashboard' },
    { keys: 'Alt + 2', description: 'Ir para Câmeras' },
    { keys: 'Alt + 3', description: 'Ir para Alertas' },
    { keys: 'Alt + 4', description: 'Ir para Mapa' },
    { keys: 'Alt + 5', description: 'Ir para Relatórios' },
    { keys: 'Alt + 6', description: 'Ir para Configurações' },
    { keys: 'Ctrl/Cmd + K', description: 'Busca global (em breve)' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            ⌨️ Atalhos de Teclado
          </h3>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-700">{shortcut.description}</span>
                <kbd className="px-3 py-1.5 text-sm font-mono bg-gray-100 border border-gray-300 rounded shadow-sm">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Botão de ajuda de atalhos (colocar no Layout)
 */
export function KeyboardShortcutsButton() {
  const [isOpen, setIsOpen] = React.useState(false);

  // Mostrar com Ctrl/Cmd + ?
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center z-40"
        title="Atalhos de teclado (Ctrl+Shift+?)"
      >
        <span className="text-xl">⌨️</span>
      </button>
      <KeyboardShortcutsHelp isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}