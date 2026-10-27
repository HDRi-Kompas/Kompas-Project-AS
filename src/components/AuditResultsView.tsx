/**
 * KOMPAS - Audit Results & Diagnostic Dashboard
 * Detailed parameter breakdown, evidence explorer, spatial diagnostics, and formal report export.
 */

import React, { useState } from 'react';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Eye,
  Layers,
  MapPin,
  FileText,
  Info,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { AuditReport, MQICategory, ParameterAuditResult } from '../types/audit';
import { MQI_CATEGORIES } from '../audit/methodology';
import { EvidenceModal } from './EvidenceModal';

interface AuditResultsViewProps {
  report: AuditReport;
  onBackToDashboard: () => void;
}

export const AuditResultsView: React.FC<AuditResultsViewProps> = ({
  report,
  onBackToDashboard,
}) => {
  const [selectedResult, setSelectedResult] = useState<ParameterAuditResult | null>(null);
  const [activeTab, setActiveTab] = useState<'parameters' | 'iso19115' | 'categories' | 'spatial' | 'consistency'>('parameters');
  const [methodologyView, setMethodologyView] = useState<'adapted' | 'original'>('adapted');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [onlyIso19115, setOnlyIso19115] = useState<boolean>(false);

  const { scoreReport, parameterResults, consistencyResult, spatialFindings, normalizedSpatialData, iso19115Compliance } = report;

  // Filter results
  const filteredResults = parameterResults.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        r.ruleId.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.iso19115Tag && r.iso19115Tag.toLowerCase().includes(q)) ||
        (r.findingMessage && r.findingMessage.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (selectedImportance !== 'all' && r.importance !== selectedImportance) return false;
    if (selectedSource !== 'all' && r.source !== selectedSource) return false;
    if (onlyIso19115 && !r.isIso19115Core) return false;
    return true;
  });

  const activeScore = methodologyView === 'adapted' ? scoreReport.adaptedScore : scoreReport.originalScore;

  // CSV Export handler
  const handleExportCsv = () => {
    const headers = [
      'ID Parameter',
      'Nama Parameter',
      'Kategori',
      'Tingkat Kepentingan',
      'Bobot',
      'Status',
      'Tag ISO 19115',
      'Elemen Inti ISO',
      'Sumber Aturan',
      'Format Diharapkan',
      'Nilai Ditemukan',
      'Temuan',
      'Rekomendasi',
    ];
    const rows = parameterResults.map(r => [
      `"${r.ruleId}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${MQI_CATEGORIES[r.category]?.name || r.category}"`,
      `"${r.importance}"`,
      r.weight,
      `"${r.status}"`,
      `"${r.iso19115Tag || ''}"`,
      r.isIso19115Core ? '"Ya (ISO 19115 Core)"' : '"Tidak"',
      `"${r.source}"`,
      `"${(r.expectedFormat || '').replace(/"/g, '""')}"`,
      `"${String(r.valueFound || '').replace(/"/g, '""')}"`,
      `"${(r.findingMessage || '').replace(/"/g, '""')}"`,
      `"${(r.recommendation || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KOMPAS_Audit_${report.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export handler
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `KOMPAS_Report_${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Formal Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Detail Modal */}
      {selectedResult && (
        <EvidenceModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <span>AUDIT ID: {report.id}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{report.profileId.replace('_', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span>{new Date(report.timestamp).toLocaleString('id-ID')}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {report.datasetName}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ekspor JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Score Hero Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Gauge & Main Score */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-6 border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-8">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 60}
                  strokeDashoffset={
                    activeScore !== null
                      ? 2 * Math.PI * 60 * (1 - activeScore / 100)
                      : 2 * Math.PI * 60
                  }
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ${
                    activeScore === null
                      ? 'text-slate-600'
                      : activeScore >= 85
                      ? 'text-emerald-400'
                      : activeScore >= 70
                      ? 'text-cyan-400'
                      : activeScore >= 55
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold font-mono text-white tabular-nums">
                  {activeScore !== null ? `${activeScore}` : 'N/A'}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Skor MQI
                </span>
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                  scoreReport.complianceTier === 'Excellent'
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                    : scoreReport.complianceTier === 'Good'
                    ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                    : scoreReport.complianceTier === 'Fair'
                    ? 'border-amber-500/50 bg-amber-950/40 text-amber-300'
                    : 'border-rose-500/50 bg-rose-950/40 text-rose-300'
                }`}>
                  Tingkat: {scoreReport.complianceTier}
                </span>

                {scoreReport.isProvisional && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-500/60 bg-amber-950/40 text-amber-300">
                    Skor Sementara
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 leading-relaxed">
                {scoreReport.isProvisional ? (
                  <span className="text-amber-300">
                    Beberapa parameter wajib belum lolos atau perlu ditinjau, skor berstatus sementara.
                  </span>
                ) : (
                  <span>
                    Seluruh aturan parameter telah dinilai sesuai standar formal MSDI.
                  </span>
                )}
              </div>

              {/* Methodology Switcher */}
              <div className="pt-2">
                <div className="inline-flex p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setMethodologyView('adapted')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      methodologyView === 'adapted'
                        ? 'bg-slate-800 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Adaptasi KOMPAS
                  </button>
                  <button
                    onClick={() => setMethodologyView('original')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      methodologyView === 'original'
                        ? 'bg-slate-800 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    MQI Asli Hasara 2026
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Formula Transparency & Status Counts */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 font-mono text-xs">
              <div className="text-slate-400 mb-1 flex items-center justify-between">
                <span>Dekomposisi Penghitungan Rumus MQI:</span>
                <span className="text-cyan-400">MQI = (Σ pᵢwᵢ / Σ wᵢ) × 100</span>
              </div>
              <div className="text-slate-200 flex items-center gap-3 pt-1">
                <span>Pembilang (Σ pᵢwᵢ): <strong className="text-white tabular-nums">{scoreReport.numerator}</strong></span>
                <span aria-hidden="true">/</span>
                <span>Penyebut (Σ wᵢ): <strong className="text-white tabular-nums">{scoreReport.denominator}</strong></span>
                <span aria-hidden="true">=</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {scoreReport.denominator > 0
                    ? ((scoreReport.numerator / scoreReport.denominator) * 100).toFixed(2)
                    : 0}%
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                *Catatan metodologis: Parameter berstatus "Tidak Berlaku" telah dikeluarkan secara transparan dari penyebut.
              </div>
            </div>

            {/* Status Counts Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-emerald-900/40">
                <div className="font-bold font-mono text-emerald-400 text-lg tabular-nums">
                  {scoreReport.statusCounts.terpenuhi}
                </div>
                <div className="text-[11px] text-slate-400">Terpenuhi</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-amber-900/40">
                <div className="font-bold font-mono text-amber-400 text-lg tabular-nums">
                  {scoreReport.statusCounts.tidak_terpenuhi}
                </div>
                <div className="text-[11px] text-slate-400">Tidak Ada</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-rose-900/40">
                <div className="font-bold font-mono text-rose-400 text-lg tabular-nums">
                  {scoreReport.statusCounts.tidak_valid}
                </div>
                <div className="text-[11px] text-slate-400">Tidak Valid</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <div className="font-bold font-mono text-slate-400 text-lg tabular-nums">
                  {scoreReport.statusCounts.tidak_berlaku}
                </div>
                <div className="text-[11px] text-slate-400">Tidak Berlaku</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-sky-900/40 col-span-2 sm:col-span-1">
                <div className="font-bold font-mono text-sky-400 text-lg tabular-nums">
                  {scoreReport.statusCounts.perlu_ditinjau}
                </div>
                <div className="text-[11px] text-slate-400">Perlu Review</div>
              </div>
            </div>
          </div>
        </div>

        {/* Provisional Score Warning Accordion if active */}
        {scoreReport.isProvisional && scoreReport.provisionalReasons.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-4 text-xs text-slate-300">
              <div className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Penyebab Skor Ditetapkan Sebagai Skor Sementara:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono">
                {scoreReport.provisionalReasons.map((reason, idx) => (
                  <li key={idx} className="leading-relaxed">{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ISO 19115 Core Metadata Compliance Banner Card */}
      {iso19115Compliance && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  iso19115Compliance.isCompliant
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800 shadow-md shadow-emerald-950/50'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800 shadow-md shadow-amber-950/50'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wide">
                    Evaluasi Standar ISO 19115 & SNI ISO 19115
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    {iso19115Compliance.standardReference}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Kesesuaian Elemen Inti Metadata (Core Metadata Conformance)
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  iso19115Compliance.isCompliant
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/80 text-amber-300'
                }`}
              >
                {iso19115Compliance.statusLabel}
              </span>
              <button
                onClick={() => setActiveTab('iso19115')}
                className="px-2.5 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-800/80 rounded-lg transition-colors"
              >
                Lihat Detail Inti →
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {iso19115Compliance.summaryNotes} Menguji 13 elemen inti standar (Table 3 ISO 19115 / Annex F ISO 19115-1:2014 & SNI ISO 19115:2012) yang diwajibkan untuk interoperabilitas katalog spasial kelautan nasional (JIGN BIG) dan internasional (IHO MSDI).
          </p>

          {/* Quick status chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2 pt-1">
            {iso19115Compliance.elements.map((el) => {
              const isOk = el.status === 'terpenuhi';
              return (
                <div
                  key={el.code}
                  onClick={() => {
                    if (el.ruleId) {
                      const matched = parameterResults.find(p => p.ruleId === el.ruleId);
                      if (matched) setSelectedResult(matched);
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    isOk
                      ? 'bg-slate-950/70 border-emerald-900/50 hover:border-emerald-700/80'
                      : 'bg-slate-950/70 border-rose-900/50 hover:border-rose-700/80'
                  }`}
                  title={`${el.nameId} (${el.isoTag}) - Klik untuk lihat bukti`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] text-slate-400 truncate">
                      {el.code}
                    </span>
                    {isOk ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </div>
                  <div className="font-medium text-slate-200 text-[11px] leading-tight line-clamp-2">
                    {el.nameId}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 truncate">
                    {el.isMandatory ? 'Wajib (M)' : 'Kondisional (C)'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Tabs (Parameters, ISO 19115, 8 Categories, Spatial Diagnostics, Consistency) */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('parameters')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'parameters'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Daftar Parameter ({filteredResults.length})
        </button>
        {iso19115Compliance && (
          <button
            onClick={() => setActiveTab('iso19115')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'iso19115'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Kepatuhan ISO 19115 ({iso19115Compliance.passedCount}/{iso19115Compliance.totalCoreCount})</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Evaluasi 8 Kategori MQI
        </button>
        {normalizedSpatialData && (
          <button
            onClick={() => setActiveTab('spatial')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'spatial'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Geospasial Lapangan
          </button>
        )}
        {consistencyResult && (
          <button
            onClick={() => setActiveTab('consistency')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'consistency'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Konsistensi Pasangan Data ({consistencyResult.overallConsistencyScore}%)
          </button>
        )}
      </div>

      {/* TAB 1: PARAMETER AUDIT FINDINGS TABLE */}
      {activeTab === 'parameters' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari parameter, ID, atau kata kunci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Kategori (8)</option>
                {Object.keys(MQI_CATEGORIES).map((catKey) => (
                  <option key={catKey} value={catKey}>
                    {MQI_CATEGORIES[catKey as MQICategory].name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Status</option>
                <option value="terpenuhi">Terpenuhi</option>
                <option value="tidak_terpenuhi">Tidak Terpenuhi</option>
                <option value="tidak_valid">Tidak Valid</option>
                <option value="tidak_berlaku">Tidak Berlaku</option>
                <option value="perlu_ditinjau">Perlu Ditinjau</option>
              </select>

              {/* Importance Filter */}
              <select
                value={selectedImportance}
                onChange={(e) => setSelectedImportance(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Bobot</option>
                <option value="critical">Critical (3)</option>
                <option value="important">Important (2)</option>
                <option value="supplementary">Supplementary (1)</option>
              </select>

              {/* ISO 19115 Toggle Filter */}
              <button
                type="button"
                onClick={() => setOnlyIso19115(!onlyIso19115)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  onlyIso19115
                    ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hanya Elemen Inti ISO 19115</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Nama Parameter / Tag ISO 19115</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Bobot</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Nilai Terdeteksi</th>
                    <th className="py-3 px-4 text-right">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        Tidak ada parameter yang sesuai kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((result) => {
                      return (
                        <tr
                          key={result.ruleId}
                          onClick={() => setSelectedResult(result)}
                          className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono text-xs text-cyan-400 font-semibold whitespace-nowrap">
                            {result.ruleId}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-white max-w-sm">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{result.name}</span>
                              {result.isIso19115Core && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 shrink-0">
                                  ISO Core
                                </span>
                              )}
                            </div>
                            {result.iso19115Tag && (
                              <div className="text-[10px] font-mono text-cyan-400/90 truncate mt-0.5">
                                {result.iso19115Tag}
                              </div>
                            )}
                            {result.findingMessage && (
                              <div className="text-[11px] text-rose-300/80 truncate mt-0.5">
                                {result.findingMessage}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                            {MQI_CATEGORIES[result.category]?.nameEn || result.category}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono whitespace-nowrap">
                            <span className="capitalize text-slate-300">
                              {result.importance} ({result.weight})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {result.status === 'terpenuhi' && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Terpenuhi</span>
                              </span>
                            )}
                            {result.status === 'tidak_terpenuhi' && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Tidak Ada</span>
                              </span>
                            )}
                            {result.status === 'tidak_valid' && (
                              <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-medium">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tidak Valid</span>
                              </span>
                            )}
                            {result.status === 'tidak_berlaku' && (
                              <span className="text-xs text-slate-500">Tidak Berlaku</span>
                            )}
                            {result.status === 'perlu_ditinjau' && (
                              <span className="inline-flex items-center gap-1 text-xs text-sky-400 font-medium">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Perlu Review</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                            {result.valueFound !== null && result.valueFound !== undefined
                              ? String(result.valueFound)
                              : '<kosong>'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResult(result);
                              }}
                              className="text-xs text-cyan-400 group-hover:text-cyan-300 font-medium inline-flex items-center gap-1"
                            >
                              <span>Lihat Bukti</span>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ISO 19115 CORE METADATA COMPLIANCE VIEW */}
      {activeTab === 'iso19115' && iso19115Compliance && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Kepatuhan Standar Formal Metadata</span>
                  <span aria-hidden="true">·</span>
                  <span>{iso19115Compliance.standardReference}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  13 Elemen Metadata Inti ISO 19115 (Core Metadata Conformance)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {iso19115Compliance.coreScore}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {iso19115Compliance.passedCount} / {iso19115Compliance.totalCoreCount} Elemen Terpenuhi
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sesuai standar ISO 19115-1:2014 Annex F dan SNI ISO 19115:2012 BSN/BIG, himpunan elemen inti (*core metadata elements*) dirancang agar dataset geospasial dapat ditemukan secara universal (*Universal Discovery*) dalam geoportal nasional (JIGN) dan pertukaran internasional.
            </p>
          </div>

          {/* Core Elements Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Elemen Inti ISO 19115</th>
                    <th className="py-3 px-4">UML Path & XPath XML</th>
                    <th className="py-3 px-4">Kewajiban</th>
                    <th className="py-3 px-4">Status Audit</th>
                    <th className="py-3 px-4">Nilai Terdeteksi</th>
                    <th className="py-3 px-4 text-right">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {iso19115Compliance.elements.map((el) => {
                    const matched = el.ruleId ? parameterResults.find(p => p.ruleId === el.ruleId) : null;
                    return (
                      <tr
                        key={el.code}
                        onClick={() => {
                          if (matched) setSelectedResult(matched);
                        }}
                        className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs text-cyan-400 font-bold whitespace-nowrap">
                          {el.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white">{el.nameId}</div>
                          <div className="text-xs text-slate-400">{el.name}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">
                          <div className="text-cyan-300 truncate max-w-xs">{el.isoTag}</div>
                          <div className="text-slate-500 text-[10px] truncate max-w-xs">{el.xmlPath}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            el.isMandatory
                              ? 'bg-rose-950/40 text-rose-300 border-rose-900/60 font-semibold'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}>
                            {el.isMandatory ? 'Wajib (M)' : 'Kondisional (C)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {el.status === 'terpenuhi' && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terpenuhi</span>
                            </span>
                          )}
                          {el.status === 'tidak_terpenuhi' && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Tidak Ada</span>
                            </span>
                          )}
                          {el.status === 'tidak_valid' && (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-medium">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tidak Valid</span>
                            </span>
                          )}
                          {el.status === 'belum_diperiksa' && (
                            <span className="text-xs text-slate-500">Belum Diperiksa</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-300 max-w-xs truncate">
                          {el.valueFound !== null && el.valueFound !== undefined
                            ? String(el.valueFound)
                            : '<kosong>'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {matched && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResult(matched);
                              }}
                              className="text-xs text-cyan-400 group-hover:text-cyan-300 font-medium inline-flex items-center gap-1"
                            >
                              <span>Lihat Bukti</span>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Standards & Guidelines Info Box */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Keterkaitan Antara Standar ISO 19115 dan Indeks Mutu MQI Hasara (2026)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Jurnal penelitian Hasara & Karunanayaka (2026) mengadopsi struktur skema ISO 19115 sebagai fondasi pembagian 8 kategori metadata. Evaluasi ISO 19115 di atas menguji kepatuhan terhadap elemen wajib minimal agar dataset legal dan terstandarisasi, sedangkan skor kuantitatif MQI (0–100) mengukur kedalaman kualitas akurasi, silsilah data, dan parameter teknis sensor untuk kelayakan pemanfaatan ulang (*fitness-for-purpose*).
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: 8 CATEGORIES BREAKDOWN */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scoreReport.categorySummaries.map((cat) => {
            const catMeta = MQI_CATEGORIES[cat.category];
            return (
              <div
                key={cat.category}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">
                    {cat.categoryName}
                  </h3>
                  <span className="text-sm font-bold font-mono text-cyan-400 tabular-nums">
                    {cat.percentage}%
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {catMeta?.description}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-700 ${
                      cat.percentage >= 80
                        ? 'bg-emerald-400'
                        : cat.percentage >= 50
                        ? 'bg-cyan-400'
                        : cat.percentage >= 25
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
                  <span>Parameter Terpenuhi: {cat.fulfilledParameters} / {cat.applicableParameters}</span>
                  <span>Bobot: {cat.scoreEarned} / {cat.scoreMaxPossible}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: SPATIAL DIAGNOSTICS */}
      {activeTab === 'spatial' && normalizedSpatialData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Ringkasan Vektor Spasial</span>
              </h3>
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">Format Data:</span>
                  <span className="text-white uppercase">{normalizedSpatialData.format}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">Jumlah Fitur:</span>
                  <span className="text-white tabular-nums">{normalizedSpatialData.featureCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">Tipe Geometri:</span>
                  <span className="text-cyan-300">{normalizedSpatialData.geometryTypes.join(', ') || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">CRS / Proyeksi:</span>
                  <span className="text-white truncate max-w-[180px]">{normalizedSpatialData.crs.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">Geometri Kosong:</span>
                  <span className={normalizedSpatialData.emptyGeometryCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {normalizedSpatialData.emptyGeometryCount}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">Cincin Poligon Rusak:</span>
                  <span className={normalizedSpatialData.ringClosureErrorsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {normalizedSpatialData.ringClosureErrorsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Bounding Box Visualizer Canvas */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                Visualisasi Batas Spasial (Bounding Box)
              </h3>
              <div className="relative bg-slate-950 rounded-lg border border-slate-800 p-4 h-56 flex items-center justify-center overflow-hidden">
                {/* SVG Coordinate Grid Background */}
                <svg className="w-full h-full text-slate-800" stroke="currentColor" fill="none">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Bounding box representation box */}
                <div className="absolute inset-8 border-2 border-cyan-400/80 bg-cyan-950/30 rounded flex flex-col items-center justify-center p-3 text-center">
                  <div className="text-[11px] font-mono text-cyan-300 font-bold mb-1">
                    Cakupan Spasial Terverifikasi
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                    <div>Utara (North): {normalizedSpatialData.bounds[3].toFixed(4)}°</div>
                    <div>Barat: {normalizedSpatialData.bounds[0].toFixed(4)}° · Timur: {normalizedSpatialData.bounds[2].toFixed(4)}°</div>
                    <div>Selatan (South): {normalizedSpatialData.bounds[1].toFixed(4)}°</div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-3">
                *Catatan: Validasi batas memastikan koordinat berada dalam batas maritim valid dan bukan koordinat fiktif (0,0).
              </div>
            </div>
          </div>

          {/* Spatial Findings & Attribute inventory */}
          {spatialFindings && spatialFindings.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Temuan Validasi Spasial Khusus
              </h3>
              <div className="space-y-2">
                {spatialFindings.map((f, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-rose-300">{f.title}</div>
                    <div className="text-slate-300">{f.description}</div>
                    <div className="text-cyan-400 text-[11px]">Saran: {f.remediation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CROSS-FILE CONSISTENCY AUDIT */}
      {activeTab === 'consistency' && consistencyResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">
                Hasil Audit Konsistensi Antar-Berkas (Metadata vs Data Spasial)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Memeriksa apakah berkas metadata benar-benar mencerminkan karakteristik fisik dan geografis dari dataset spasial pendamping.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
                {consistencyResult.overallConsistencyScore}%
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Skor Konsistensi</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 font-semibold">1. Kesesuaian Judul & Identitas</div>
              <div className="text-sm text-slate-200">{consistencyResult.titleMatch.details}</div>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 font-semibold">2. Kesesuaian Sistem Koordinat (CRS)</div>
              <div className="text-sm text-slate-200">{consistencyResult.crsMatch.details}</div>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 font-semibold">3. Kesesuaian Cakupan Geografis (BBox Overlap)</div>
              <div className="text-sm text-slate-200">{consistencyResult.bboxMatch.details}</div>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 font-semibold">4. Kesesuaian Tipe Geometri & Struktur</div>
              <div className="text-sm text-slate-200">{consistencyResult.geometryTypeMatch.details}</div>
            </div>
          </div>

          {consistencyResult.discrepancies.length > 0 && (
            <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-rose-300 uppercase tracking-wide">
                Indikasi Diskrepansi / Ketidakcocokan Pasangan:
              </div>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                {consistencyResult.discrepancies.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
