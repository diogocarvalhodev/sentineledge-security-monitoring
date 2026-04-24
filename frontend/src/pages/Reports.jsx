import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar, Camera, AlertTriangle, TrendingUp, FileDown } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/dateUtils';

const API_URL = 'http://localhost:8000';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [alertsRes, camerasRes, zonesRes] = await Promise.all([
        fetch(`${API_URL}/alerts`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/cameras`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/zones`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const alertsData = await alertsRes.json();
      const camerasData = await camerasRes.json();
      const zonesData = await zonesRes.json();
      
      setAlerts(alertsData);
      setCameras(camerasData);
      setZones(zonesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar alertas baseado nos critérios
  const getFilteredAlerts = () => {
    let filtered = [...alerts];
    
    // Filtro de zona
    if (selectedZone !== 'all') {
      const zoneCameras = cameras.filter(c => c.zone_id === selectedZone);
      const cameraIds = zoneCameras.map(c => c.id);
      filtered = filtered.filter(a => cameraIds.includes(a.camera_id));
    }
    
    // Filtro de data
    const now = new Date();
    let startDateTime, endDateTime;
    
    if (dateRange === 'today') {
      startDateTime = new Date(now.setHours(0, 0, 0, 0));
      endDateTime = new Date(now.setHours(23, 59, 59, 999));
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDateTime = new Date(weekAgo.setHours(0, 0, 0, 0));
      endDateTime = new Date();
    } else if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDateTime = new Date(monthAgo.setHours(0, 0, 0, 0));
      endDateTime = new Date();
    } else if (dateRange === 'custom' && startDate && endDate) {
      startDateTime = new Date(startDate + 'T00:00:00');
      endDateTime = new Date(endDate + 'T23:59:59');
    }
    
    if (startDateTime && endDateTime) {
      filtered = filtered.filter(alert => {
        const alertDate = new Date(alert.created_at);
        return alertDate >= startDateTime && alertDate <= endDateTime;
      });
    }
    
    return filtered;
  };

  const filteredAlerts = getFilteredAlerts();

  // Estatísticas
  const stats = {
    total: filteredAlerts.length,
    critical: filteredAlerts.filter(a => a.is_critical_hour).length,
    acknowledged: filteredAlerts.filter(a => a.acknowledged).length,
    avgPeople: filteredAlerts.length > 0 
      ? (filteredAlerts.reduce((sum, a) => sum + a.person_count, 0) / filteredAlerts.length).toFixed(1)
      : 0
  };

  // Dados para gráficos
  const getChartData = () => {
    // Agrupar por data
    const byDate = {};
    filteredAlerts.forEach(alert => {
      const date = new Date(alert.created_at).toLocaleDateString('pt-BR');
      byDate[date] = (byDate[date] || 0) + 1;
    });
    
    return Object.entries(byDate).map(([date, count]) => ({
      date,
      alertas: count
    })).slice(-30); // Últimos 30 dias
  };

  const getZoneData = () => {
    const byZone = {};
    
    filteredAlerts.forEach(alert => {
      const camera = cameras.find(c => c.id === alert.camera_id);
      const zone = zones.find(z => z.id === camera?.zone_id);
      const zoneName = zone?.name || 'Sem Zona';
      
      if (!byZone[zoneName]) {
        byZone[zoneName] = {
          name: zoneName,
          alertas: 0,
          criticos: 0,
          cameras: new Set()
        };
      }
      
      byZone[zoneName].alertas++;
      if (alert.is_critical_hour) byZone[zoneName].criticos++;
      byZone[zoneName].cameras.add(camera?.name || `Câmera ${alert.camera_id}`);
    });
    
    return Object.values(byZone).map(zone => ({
      ...zone,
      cameras: Array.from(zone.cameras)
    })).sort((a, b) => b.alertas - a.alertas);
  };

  const getZonePieData = () => {
    return getZoneData().map(zone => ({
      name: zone.name,
      value: zone.alertas
    }));
  };

  const getHourlyData = () => {
    const byHour = Array.from({ length: 24 }, (_, i) => ({
      hora: `${i}h`,
      alertas: 0
    }));
    
    filteredAlerts.forEach(alert => {
      const hour = new Date(alert.created_at).getHours();
      byHour[hour].alertas++;
    });
    
    return byHour;
  };

  // Exportar PDF
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.text('Relatório de Alertas por Zona', 14, 20);
      
      // Período
      doc.setFontSize(12);
      let periodo = '';
      if (dateRange === 'today') periodo = 'Hoje';
      else if (dateRange === 'week') periodo = 'Última Semana';
      else if (dateRange === 'month') periodo = 'Último Mês';
      else if (dateRange === 'custom') periodo = `${startDate} a ${endDate}`;
      
      doc.text(`Período: ${periodo}`, 14, 30);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 37);
      
      // Estatísticas
      doc.setFontSize(14);
      doc.text('Estatísticas Gerais', 14, 50);
      doc.setFontSize(11);
      doc.text(`Total de Alertas: ${stats.total}`, 14, 58);
      doc.text(`Alertas Críticos: ${stats.critical}`, 14, 65);
      doc.text(`Alertas Reconhecidos: ${stats.acknowledged}`, 14, 72);
      
      // Ranking de Zonas
      doc.setFontSize(14);
      doc.text('Ranking de Zonas (Mais Alertas)', 14, 85);
      
      const zoneData = getZoneData().slice(0, 10);
      const zoneTable = zoneData.map(zone => [
        zone.name,
        zone.alertas,
        zone.criticos,
        zone.cameras.join(', ')
      ]);
      
      autoTable(doc, {
        startY: 92,
        head: [['Zona', 'Alertas', 'Críticos', 'Câmeras']],
        body: zoneTable,
        theme: 'striped',
        headStyles: { fillColor: [0, 209, 255] },
        columnStyles: {
          3: { cellWidth: 80 }
        }
      });
      
      // Nova página para detalhes
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Detalhes dos Alertas', 14, 20);
      
      // Tabela de alertas
      const tableData = filteredAlerts.slice(0, 50).map(alert => {
        const camera = cameras.find(c => c.id === alert.camera_id);
        const zone = zones.find(z => z.id === camera?.zone_id);
        
        return [
          formatDate(alert.created_at),
          zone?.name || 'Sem Zona',
          camera?.name || `Câmera ${alert.camera_id}`,
          alert.person_count,
          alert.is_critical_hour ? 'Sim' : 'Não'
        ];
      });
      
      autoTable(doc, {
        startY: 27,
        head: [['Data/Hora', 'Zona', 'Câmera', 'Pessoas', 'Crítico']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 209, 255] }
      });
      
      doc.save(`relatorio-zonas-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique o console.');
    }
  };

  // Exportar Excel
  const exportExcel = () => {
    try {
      // Aba 1: Ranking de Zonas
      const zoneData = getZoneData().map(zone => ({
        'Zona': zone.name,
        'Total de Alertas': zone.alertas,
        'Alertas Críticos': zone.criticos,
        'Câmeras Envolvidas': zone.cameras.join(', '),
        'Taxa de Criticidade': `${((zone.criticos / zone.alertas) * 100).toFixed(1)}%`
      }));
      
      const ws1 = XLSX.utils.json_to_sheet(zoneData);
      
      // Aba 2: Detalhes dos Alertas
      const alertData = filteredAlerts.map(alert => {
        const camera = cameras.find(c => c.id === alert.camera_id);
        const zone = zones.find(z => z.id === camera?.zone_id);
        
        return {
          'Data/Hora': formatDate(alert.created_at),
          'Zona': zone?.name || 'Sem Zona',
          'Câmera': camera?.name || `Câmera ${alert.camera_id}`,
          'Local': camera?.location || '',
          'Pessoas Detectadas': alert.person_count,
          'Confiança': (alert.confidence * 100).toFixed(1) + '%',
          'Horário Crítico': alert.is_critical_hour ? 'Sim' : 'Não',
          'Reconhecido': alert.acknowledged ? 'Sim' : 'Não',
          'Observações': alert.notes || ''
        };
      });
      
      const ws2 = XLSX.utils.json_to_sheet(alertData);
      
      // Criar workbook com 2 abas
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Ranking Zonas');
      XLSX.utils.book_append_sheet(wb, ws2, 'Detalhes Alertas');
      
      XLSX.writeFile(wb, `relatorio-zonas-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar Excel. Verifique o console.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wider uppercase">
          <span className="glow-text-cyan">RELATÓRIOS</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide font-display">
          Análises e estatísticas de detecções
        </p>
      </div>

      {/* Filtros */}
      <div className="sentineledge-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-cyan-400" />
          <h2 className="text-lg font-display font-bold text-slate-100 uppercase tracking-wider">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Período */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Período de análise
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="today">Hoje</option>
              <option value="week">Última Semana</option>
              <option value="month">Último Mês</option>
              <option value="custom">Período Personalizado</option>
            </select>
          </div>

          {/* Data início (se custom) */}
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Data inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Data final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </>
          )}

          {/* Zona */}
          <div className={dateRange === 'custom' ? 'md:col-span-2' : ''}>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Zona
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Todas as Zonas</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botões de Exportação */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          <button
            onClick={exportPDF}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-all shadow-glow font-display uppercase tracking-wider text-sm font-semibold sm:w-auto"
          >
            <FileDown size={18} />
            Exportar PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-green-500/80 text-white rounded-lg hover:bg-green-600 transition-all shadow-glow font-display uppercase tracking-wider text-sm font-semibold sm:w-auto"
          >
            <Download size={18} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="sentineledge-card p-6 stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Total de Alertas</p>
              <p className="text-3xl sm:text-4xl font-bold text-slate-50 mt-2 font-mono">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <AlertTriangle className="text-blue-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card card-critical">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Alertas Críticos</p>
              <p className="text-3xl sm:text-4xl font-bold glow-text-red mt-2 font-mono">{stats.critical}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
              <AlertTriangle className="text-red-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card card-safe">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Reconhecidos</p>
              <p className="text-3xl sm:text-4xl font-bold glow-text-green mt-2 font-mono">{stats.acknowledged}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <BarChart3 className="text-green-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Média de Pessoas</p>
              <p className="text-3xl sm:text-4xl font-bold text-amber-400 mt-2 font-mono">{stats.avgPeople}</p>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <TrendingUp className="text-amber-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas por Data */}
        <div className="sentineledge-card p-6">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-4 uppercase tracking-wider">
            Alertas ao Longo do Tempo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Line type="monotone" dataKey="alertas" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alertas por Zona */}
        <div className="sentineledge-card p-6">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-4 uppercase tracking-wider">
            Alertas por Zona
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getZonePieData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {getZonePieData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Alertas por Hora */}
        <div className="sentineledge-card p-6 lg:col-span-2">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-4 uppercase tracking-wider">
            Distribuição por Horário
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getHourlyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hora" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="alertas" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking de Zonas */}
      {filteredAlerts.length > 0 && (
        <div className="sentineledge-card p-6 mt-6">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-4 uppercase tracking-wider">
            🏆 Ranking de Zonas - Indícios de Invasão
          </h3>
          <p className="text-sm text-slate-400 mb-4 font-display uppercase tracking-wide">
            Zonas ordenadas por número de alertas (maior risco primeiro)
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Posição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Total de Alertas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Alertas Críticos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Câmeras Envolvidas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Taxa Crítica
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-900/40 divide-y divide-slate-700">
                {getZoneData().map((zone, index) => {
                  const criticalRate = (zone.criticos / zone.alertas) * 100;
                  const riskLevel = 
                    criticalRate > 50 ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
                    criticalRate > 30 ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400' :
                    'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400';
                  
                  return (
                    <tr key={index} className={index < 3 ? 'bg-amber-500/5' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                          {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                          {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                          <span className="text-sm font-semibold text-slate-200 font-mono">
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-200">{zone.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100 font-bold font-mono">{zone.alertas}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-red-400 font-bold font-mono">{zone.criticos}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-400">
                          {zone.cameras.slice(0, 3).join(', ')}
                          {zone.cameras.length > 3 && ` (+${zone.cameras.length - 3})`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded font-mono ${riskLevel}`}>
                          {criticalRate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mensagem se não houver dados */}
      {filteredAlerts.length === 0 && (
        <div className="sentineledge-card p-12 text-center mt-8">
          <AlertTriangle size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 font-display uppercase tracking-wide">
            Nenhum alerta encontrado para os filtros selecionados
          </p>
        </div>
      )}
    </div>
  );
}