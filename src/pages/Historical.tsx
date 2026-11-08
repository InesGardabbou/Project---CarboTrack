import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { EnergyBarChart } from '@/components/charts/EnergyBarChart';
import { generateMonthlyData, generateHourlyData } from '@/data/mockData';
import { format, subDays, subMonths } from 'date-fns';
import {
  Calendar,
  Database,
  Download,
  Filter,
  FileDown,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const monthlyData = generateMonthlyData(24);
const hourlyData = generateHourlyData(24);

export default function HistoricalData() {
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const departments = ['All', 'Production', 'Assembly', 'Packaging', 'Warehouse', 'Office'];

  const parseDate = (s: string) => new Date(s + 'T00:00:00');

  const filteredMonthly = monthlyData.filter((d) => {
    const dt = parseDate(d.date);
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    return dt >= start && dt <= end;
  }).map(d => {
    if (selectedDepartment === 'All') return d;
    // return only relevant keys for the selected department
    const deptKey = selectedDepartment.toLowerCase();
    return {
      month: d.month,
      date: d.date,
      consumption: d.consumption,
      carbon: d.carbon,
      [deptKey]: d[deptKey as keyof typeof d],
    } as any;
  });

  const filteredHourly = hourlyData; // hourly data currently not date-aware in mock; leave as-is

  const downloadCSV = (rows: any[], filename = 'historical.csv') => {
    if (!rows || rows.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = Array.from(Object.keys(rows[0]));
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => {
        const v = r[h];
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return '"' + s + '"';
      }).join(',')))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const openPrintablePDF = (rows: any[], title = 'Historical Data') => {
    const headers = rows && rows.length ? Object.keys(rows[0]) : [];
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:left;font-family:Arial,Helvetica,sans-serif;font-size:12px}</style>
        </head>
        <body>
          <h2>${title}</h2>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map(r => `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) {
      alert('Unable to open print window');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    // give browser a moment to render then open print dialog
    setTimeout(() => {
      w.print();
    }, 500);
  };

  const handleExport = (type: 'csv' | 'pdf') => {
    // Combine filtered monthly and hourly into one dataset for export
    const rows: any[] = [];
    // Normalize monthly rows
    filteredMonthly.forEach(m => rows.push({
      period: 'monthly',
      month: m.month,
      date: m.date,
      consumption: m.consumption,
      carbon: m.carbon,
      production: (m as any).production ?? '',
      assembly: (m as any).assembly ?? '',
      packaging: (m as any).packaging ?? '',
      warehouse: (m as any).warehouse ?? '',
      office: (m as any).office ?? '',
    }));

    // Append hourly as separate rows
    filteredHourly.forEach(h => rows.push({
      period: 'hourly',
      time: h.time,
      total: h.total,
      production: h.production,
      assembly: h.assembly,
      packaging: h.packaging,
      warehouse: h.warehouse,
      office: h.office,
    }));

    if (type === 'csv') {
      downloadCSV(rows, 'historical_data.csv');
    } else {
      openPrintablePDF(rows, 'Historical Data Export');
    }
  };

  return (
    <Layout title="Historical Data" subtitle="Analyze past energy consumption patterns">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Data Range"
          value="6 Months"
          subtitle={`${format(subMonths(new Date(), 6), 'MMM yyyy')} - ${format(new Date(), 'MMM yyyy')}`}
          icon={<Calendar className="h-5 w-5" />}
          variant="primary"
        />
        <KPICard
          title="Data Points"
          value="1.2M"
          subtitle="Total records"
          icon={<Database className="h-5 w-5" />}
        />
        <KPICard
          title="Exports"
          value="24"
          subtitle="This month"
          icon={<Download className="h-5 w-5" />}
        />
        <KPICard
          title="Active Filters"
          value="2"
          subtitle="Applied"
          icon={<Filter className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-xl border border-border mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Historical Overview - Monthly
          </h2>
          <EnergyLineChart
            data={filteredMonthly}
            xKey="month"
            lines={[
              { key: 'consumption', name: 'Consumption', color: '#10b981', strokeWidth: 2 },
              { key: 'carbon', name: 'Carbon (kg CO₂)', color: '#3b82f6', strokeWidth: 2 },
            ]}
            height={300}
          />
        </div>

        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Historical Overview - Daily
          </h2>
          <EnergyBarChart
            data={filteredMonthly}
            xKey="month"
            bars={[
              { key: 'production', name: 'Production', color: '#10b981' },
              { key: 'assembly', name: 'Assembly', color: '#3b82f6' },
              { key: 'packaging', name: 'Packaging', color: '#eab308' },
            ]}
            height={300}
            stacked
          />
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="glass-card p-6 rounded-xl border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Year-over-Year Comparison
        </h2>
        <EnergyBarChart
          data={filteredMonthly.map((d, i) => ({
            ...d,
            lastYear: d.consumption * (0.85 + Math.random() * 0.2),
          }))}
          xKey="month"
          bars={[
            { key: 'consumption', name: 'This Year', color: '#10b981' },
            { key: 'lastYear', name: 'Last Year', color: '#6b7280' },
          ]}
          height={300}
        />
      </div>
    </Layout>
  );
}
