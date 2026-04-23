/**
 * Utilitário para formatação de datas
 * Corrige problema de fuso horário UTC → Brasil
 */

/**
 * Formata data para horário local do Brasil
 * @param {string} dateString - Data em formato ISO (ex: "2025-01-05T17:44:12")
 * @returns {string} - Data formatada (ex: "05/01/2025, 14:44:12")
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Data não disponível';
  
  // Criar objeto Date
  // IMPORTANTE: Backend agora salva em horário local (Brasil)
  const date = new Date(dateString);
  
  // Verificar se é válida
  if (isNaN(date.getTime())) {
    return 'Data inválida';
  }
  
  // Formatar para pt-BR (sem especificar timezone, usa local)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

/**
 * Formata data para horário local (formato curto)
 * @param {string} dateString - Data em formato ISO
 * @returns {string} - Data formatada (ex: "05/01/2025, 14:44")
 */
export const formatDateShort = (dateString) => {
  if (!dateString) return 'Data não disponível';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Data inválida';
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Formata data para exibir apenas o horário
 * @param {string} dateString - Data em formato ISO
 * @returns {string} - Horário formatado (ex: "14:44:12")
 */
export const formatTime = (dateString) => {
  if (!dateString) return '--:--';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return '--:--';
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

/**
 * Retorna o tempo decorrido desde uma data (ex: "há 5 minutos")
 * @param {string} dateString - Data em formato ISO
 * @returns {string} - Tempo relativo
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Data não disponível';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Data inválida';
  }
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'agora mesmo';
  } else if (diffMin < 60) {
    return `há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  } else if (diffHour < 24) {
    return `há ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  } else if (diffDay < 7) {
    return `há ${diffDay} dia${diffDay > 1 ? 's' : ''}`;
  } else {
    return formatDateShort(dateString);
  }
};
