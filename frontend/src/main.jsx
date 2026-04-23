import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function bootstrap() {
  if (import.meta.env.VITE_DEMO_MOCK === 'true') {
    const { enableMockApi } = await import('./mock/mockApi');
    enableMockApi();
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
