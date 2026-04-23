import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const location = useLocation();
  
  // Mapeamento de rotas para nomes
  const routeNames = {
    '': 'Dashboard',
    'cameras': 'Câmeras',
    'alerts': 'Alertas',
    'map': 'Mapa',
    'reports': 'Relatórios',
    'settings': 'Configurações'
  };

  // Gerar breadcrumbs baseado na URL
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  // Se estiver na home, não mostrar breadcrumbs
  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      {/* Home */}
      <Link
        to="/"
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <Home size={16} />
      </Link>

      {pathnames.map((pathname, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = routeNames[pathname] || pathname;

        return (
          <React.Fragment key={pathname}>
            <ChevronRight size={16} className="text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-900">{name}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-blue-600 transition-colors"
              >
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
