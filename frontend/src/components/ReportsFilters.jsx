import React, { useState } from 'react';
import { Calendar, Download, Filter, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Componente de filtros de relatório
 */
export function ReportFilters({ filters, onFiltersChange, cameras = [] }) {
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [cameraId, setCameraId] = useState(filters.cameraId || '');
  const [period, setPeriod] = useState(filters.period || 'week');

  const handleApplyFilters = () => {
    onFiltersChange({
      startDate,
      endDate,
      cameraId,
      period
    });
  };

  const handleQuickPeriod = (periodType) => {
    const end = new Date();
    const start = new Date();

    switch (periodType) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setPeriod(periodType);
    
    onFiltersChange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      cameraId,
      period: periodType
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={20} className="text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Data Início */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Início
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Data Fim */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Fim
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Câmera */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Câmera
          </label>
          <select
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas as câmeras</option>
            {cameras.map(camera => (
              <option key={camera.id} value={camera.id}>
                {camera.name}
              </option>
            ))}
          </select>
        </div>

        {/* Botão Aplicar */}
        <div className="flex items-end">
          <button
            onClick={handleApplyFilters}
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Períodos rápidos */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 flex items-center">Período rápido:</span>
        {[
          { value: 'today', label: 'Hoje' },
          { value: 'week', label: 'Última semana' },
          { value: 'month', label: 'Último mês' },
          { value: 'quarter', label: 'Último trimestre' },
          { value: 'year', label: 'Último ano' }
        ].map(p => (
          <button
            key={p.value}
            onClick={() => handleQuickPeriod(p.value)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              period === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Componente de exportação de relatórios
 */
export function ReportExport({ data, fileName = 'relatorio', disabled = false }) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = () => {
    if (!data || data.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    setExporting(true);

    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Relatório de Alertas', 14, 20);
      
      // Data do relatório
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
      
      // Preparar dados para tabela
      const tableData = data.map(item => [
        item.date || item.name || item.label || '-',
        item.count || item.total || item.value || 0,
        item.critical || '-'
      ]);
      
      // Adicionar tabela
      doc.autoTable({
        head: [['Período/Câmera', 'Total', 'Críticos']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        }
      });
      
      // Salvar
      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    setExporting(true);

    try {
      // Preparar dados
      const exportData = data.map(item => ({
        'Data/Câmera': item.date || item.name || item.label || '-',
        'Total': item.count || item.total || item.value || 0,
        'Críticos': item.critical || 0,
        'Percentual': item.percent ? `${item.percent}%` : '-'
      }));

      // Criar worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Criar workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
      
      // Salvar
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao exportar Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportToPDF}
        disabled={disabled || exporting}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText size={16} />
        {exporting ? 'Exportando...' : 'Exportar PDF'}
      </button>

      <button
        onClick={exportToExcel}
        disabled={disabled || exporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileSpreadsheet size={16} />
        {exporting ? 'Exportando...' : 'Exportar Excel'}
      </button>
    </div>
  );
}

/**
 * Cards de estatísticas resumidas
 */
export function StatsCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total de Alertas',
      value: stats?.totalAlerts || 0,
      color: 'blue',
      icon: '🚨'
    },
    {
      label: 'Alertas Críticos',
      value: stats?.criticalAlerts || 0,
      color: 'red',
      icon: '⚠️'
    },
    {
      label: 'Câmeras Ativas',
      value: stats?.activeCameras || 0,
      color: 'green',
      icon: '📹'
    },
    {
      label: 'Taxa de Reconhecimento',
      value: `${stats?.acknowledgedRate || 0}%`,
      color: 'purple',
      icon: '✓'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">
              {card.label}
            </span>
            <div className={`w-10 h-10 rounded-lg ${colorClasses[card.color]} flex items-center justify-center text-xl`}>
              {card.icon}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
