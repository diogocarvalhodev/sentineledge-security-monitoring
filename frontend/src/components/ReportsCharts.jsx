import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

/**
 * Gráfico de linha - Alertas por período
 */
export function AlertsLineChart({ data, loading }) {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyChart message="Nenhum dado disponível para o período selecionado" />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Total de Alertas"
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="critical" 
          stroke="#ef4444" 
          strokeWidth={2}
          name="Alertas Críticos"
          dot={{ fill: '#ef4444', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Gráfico de barras - Alertas por câmera
 */
export function AlertsByCamera({ data, loading }) {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyChart message="Nenhuma câmera com alertas no período" />;
  }

  // Pegar top 10
  const topCameras = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={topCameras}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          style={{ fontSize: '11px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
        <Bar 
          dataKey="count" 
          fill="#3b82f6"
          name="Alertas"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Gráfico de pizza - Distribuição de alertas
 */
export function AlertsPieChart({ data, loading }) {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyChart message="Nenhum dado disponível" />;
  }

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Gráfico de área - Tendência temporal
 */
export function AlertsAreaChart({ data, loading }) {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyChart message="Nenhum dado disponível para o período" />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
        <Area 
          type="monotone" 
          dataKey="total" 
          stroke="#3b82f6" 
          fillOpacity={1} 
          fill="url(#colorTotal)"
          name="Total"
        />
        <Area 
          type="monotone" 
          dataKey="critical" 
          stroke="#ef4444" 
          fillOpacity={1} 
          fill="url(#colorCritical)"
          name="Críticos"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Heatmap de horários - Mostra quando há mais alertas
 */
export function AlertsHeatmap({ data, loading }) {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyChart message="Nenhum dado disponível" />;
  }

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Encontrar valor máximo para normalização
  const maxValue = Math.max(...data.map(d => d.count));

  const getColor = (count) => {
    if (!count) return '#f3f4f6';
    const intensity = count / maxValue;
    if (intensity > 0.75) return '#dc2626';
    if (intensity > 0.5) return '#f59e0b';
    if (intensity > 0.25) return '#fbbf24';
    return '#fde68a';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Cabeçalho com horas */}
        <div className="flex mb-1">
          <div className="w-12"></div>
          {hours.map(hour => (
            <div 
              key={hour} 
              className="flex-1 text-center text-xs text-gray-600"
            >
              {hour}h
            </div>
          ))}
        </div>

        {/* Linhas por dia da semana */}
        {days.map((day, dayIndex) => (
          <div key={day} className="flex mb-1">
            <div className="w-12 text-xs text-gray-600 flex items-center">
              {day}
            </div>
            {hours.map(hour => {
              const item = data.find(d => d.day === dayIndex && d.hour === hour);
              const count = item?.count || 0;
              
              return (
                <div
                  key={hour}
                  className="flex-1 h-8 mx-0.5 rounded transition-colors cursor-pointer hover:ring-2 hover:ring-blue-500"
                  style={{ backgroundColor: getColor(count) }}
                  title={`${day} ${hour}h: ${count} alerta(s)`}
                >
                  {count > 0 && (
                    <div className="text-xs text-center leading-8 text-gray-800">
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
          <span>Menos</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f3f4f6' }}></div>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fde68a' }}></div>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
          </div>
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para carregamento
 */
function ChartSkeleton() {
  return (
    <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-gray-400">Carregando gráfico...</div>
    </div>
  );
}

/**
 * Estado vazio
 */
function EmptyChart({ message }) {
  return (
    <div className="w-full h-[300px] bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center">
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
}
