import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Database,
  Zap,
  Mail,
  Smartphone,
  Globe,
  Moon,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Info,
  Download,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dataService, type ActivityEntry } from '@/services/dataService';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';
import { machines, anomalies, optimizationSuggestions } from '@/data/mockData';

const settingsSections = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'data', label: 'Data & Export', icon: Database },
  { id: 'integrations', label: 'Integrations', icon: Zap },
];



export default function Settings() {
  const [activeSection, setActiveSection] = useState('general');
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('carbotrack_settings');
    return saved ? JSON.parse(saved) : {
      emailNotifications: true,
      smsAlerts: false,
      anomalyAlerts: true,
      weeklyReports: true,
      twoFactorAuth: false,
      dataRetention: '12',
      autoExport: false,
    };
  });

  // Subscribe to activities/notifications from Firebase
  useEffect(() => {
    const unsub = dataService.subscribeToActivities(setActivities);
    return () => unsub();
  }, []);

  // Persist settings (excluding darkMode which is handled by store)
  useEffect(() => {
    localStorage.setItem('carbotrack_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: string, value: boolean | string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  // Export functions
  const downloadCSV = (rows: any[], filename = 'carbotrack_export.csv') => {
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

  const generatePDFReport = async () => {
    try {
      // Dynamically import jsPDF to avoid bundle size issues
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129); // Primary green
      doc.text('CarboTrack Data Export Report', margin, yPosition);
      yPosition += 10;

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 8;

      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Summary', margin, yPosition);
      yPosition += 6;

      const summaryData = [
        ['Total Machines', machines.length],
        ['Active Machines', machines.filter(m => m.status === 'operational').length],
        ['Critical Machines', machines.filter(m => m.status === 'critical').length],
        ['Anomalies Detected', anomalies.length],
        ['Optimization Suggestions', optimizationSuggestions.length],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Count']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      yPosition = ((doc as any).lastAutoTable?.finalY ?? yPosition) + 8;

      // Machines section
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Machines Inventory', margin, yPosition);
      yPosition += 6;

      const machineHeaders = ['ID', 'Name', 'Department', 'Status', 'Efficiency', 'Consumption'];
      const machineData = machines.map(m => [
        m.id,
        m.name,
        m.department,
        m.status,
        `${m.efficiency.toFixed(1)}%`,
        `${m.consumption.toFixed(1)} kW`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [machineHeaders],
        body: machineData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
          // Footer
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text(
            `Page ${doc.internal.pages.length}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        },
      });

      yPosition = ((doc as any).lastAutoTable?.finalY ?? yPosition) + 8;

      // Anomalies section
      if (anomalies.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Detected Anomalies', margin, yPosition);
        yPosition += 6;

        const anomalyHeaders = ['Machine', 'Type', 'Category', 'Confidence', 'Status'];
        const anomalyData = anomalies.map(a => [
          a.machineName,
          a.type,
          a.category,
          `${(a.confidence * 100).toFixed(1)}%`,
          a.resolved ? 'Resolved' : 'Pending',
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [anomalyHeaders],
          body: anomalyData,
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
          margin: { left: margin, right: margin },
        });

        yPosition = ((doc as any).lastAutoTable?.finalY ?? yPosition) + 8;
      }

      // Optimization suggestions section
      if (optimizationSuggestions.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Optimization Suggestions', margin, yPosition);
        yPosition += 6;

        const suggestionHeaders = ['Title', 'Priority', 'Savings', 'CO₂ Reduction'];
        const suggestionData = optimizationSuggestions.map(s => [
          s.title.substring(0, 30),
          s.priority,
          `$${s.potentialSavings.toLocaleString()}`,
          `${s.co2Reduction} kg`,
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [suggestionHeaders],
          body: suggestionData,
          theme: 'striped',
          headStyles: { fillColor: [168, 85, 247], textColor: [255, 255, 255] },
          margin: { left: margin, right: margin },
        });
      }

      // Download PDF
      doc.save('carbotrack_report.pdf');
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleExportCSV = () => {
    const exportData = [
      ...machines.map(m => ({
        type: 'Machine',
        id: m.id,
        name: m.name,
        department: m.department,
        status: m.status,
        efficiency: m.efficiency,
        consumption: m.consumption,
        co2Emissions: m.co2Emissions,
      })),
      ...anomalies.map(a => ({
        type: 'Anomaly',
        id: a.id,
        machineName: a.machineName,
        anomalyType: a.type,
        category: a.category,
        confidence: a.confidence,
        resolved: a.resolved ? 'Yes' : 'No',
      })),
      ...optimizationSuggestions.map(s => ({
        type: 'Suggestion',
        id: s.id,
        title: s.title,
        priority: s.priority,
        potentialSavings: s.potentialSavings,
        co2Reduction: s.co2Reduction,
        status: s.status,
      })),
    ];
    downloadCSV(exportData, 'carbotrack_complete_export.csv');
  };

  return (
    <Layout title="Settings" subtitle="Manage your preferences and configurations">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="glass-card p-4 rounded-xl border border-border h-fit">
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 glass-card p-6 rounded-xl border border-border">
          {activeSection === 'general' && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                General Settings
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-warning" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Dark Mode
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use dark theme across the application
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>

                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Account
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Manage your account settings
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
                    Manage
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Notification Preferences
              </h2>
              
              {/* Recent Notifications List */}
              <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Recent Notifications
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No notifications yet.</p>
                  ) : (
                    activities.slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-start gap-2 p-2 rounded bg-background/50 text-xs">
                        {a.action.toLowerCase().includes('anomal') || a.action.toLowerCase().includes('critical') ? (
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        ) : a.action.toLowerCase().includes('resolved') || a.action.toLowerCase().includes('success') ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        ) : (
                          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{a.action}</p>
                          <p className="text-muted-foreground">{a.time} • {a.user}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Email Notifications
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Receive alerts and reports via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(v) => updateSetting('emailNotifications', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        SMS Alerts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Critical alerts via SMS
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.smsAlerts}
                    onCheckedChange={(v) => updateSetting('smsAlerts', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Anomaly Alerts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Real-time anomaly detection alerts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.anomalyAlerts}
                    onCheckedChange={(v) => updateSetting('anomalyAlerts', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Weekly Reports
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Weekly energy summary reports
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.weeklyReports}
                    onCheckedChange={(v) => updateSetting('weeklyReports', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Security Settings
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Two-Factor Authentication
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add an extra layer of security
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(v) => updateSetting('twoFactorAuth', v)}
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Password
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last changed 30 days ago
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Active Sessions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        2 devices currently logged in
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage Sessions
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Data & Export Settings
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Data Retention Period
                      </p>
                      <p className="text-xs text-muted-foreground">
                        How long to keep historical data
                      </p>
                    </div>
                  </div>
                  <select
                    value={settings.dataRetention}
                    onChange={(e) => updateSetting('dataRetention', e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Auto Export
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Automatically export monthly reports
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoExport}
                    onCheckedChange={(v) => updateSetting('autoExport', v)}
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium text-foreground mb-4">
                    Export All Data
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={handleExportCSV}
                    >
                      <Download className="h-4 w-4" />
                      Export as CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={generatePDFReport}
                    >
                      <Download className="h-4 w-4" />
                      Export as PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Integrations
              </h2>
              <div className="space-y-4">
                {[
                  { name: 'Slack', description: 'Get alerts in Slack channels', connected: true },
                  { name: 'Microsoft Teams', description: 'Integration with Teams', connected: false },
                  { name: 'Zapier', description: 'Connect with 3000+ apps', connected: false },
                  { name: 'Webhook', description: 'Custom webhook integrations', connected: true },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {integration.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={integration.connected ? 'outline' : 'default'}
                      size="sm"
                    >
                      {integration.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
