/**
 * KOMPAS - Audit History & Version Comparison View
 * Lists historical audits and allows side-by-side comparison between 2 dataset versions.
 */

import React, { useState } from 'react';
import { Clock, GitCompare, ArrowRight, CheckCircle2, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { AuditReport } from '../types/audit';

interface HistoryCompareViewProps {
  auditReports: AuditReport[];
  onSelectAudit: (report: AuditReport) => void;
  onClearHistory: () => void;
}

export const HistoryCompareView: React.FC<HistoryCompareViewProps> = ({
  auditReports,
  onSelectAudit,
  onClearHistory,
}) => {
  const [selectedAuditAId, setSelectedAuditAId] = useState<string>(auditReports[0]?.id || '');
  const [selectedAuditBId, setSelectedAuditBId] = useState<string>(auditReports[1]?.id || '');

  const auditA = auditReports.find(r => r.id === selectedAuditAId);
  const auditB = auditReports.find(r => r.id === selectedAuditBId);

  const scoreA = auditA?.scoreReport.adaptedScore ?? 0;
  const scoreB = auditB?.scoreReport.adaptedScore ?? 0;
  const delta = scoreB - scoreA;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Riwayat & Komparasi Antarversi Dataset
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Telusuri audit terdahulu dan bandingkan peningkatan kualitas metadata antara draft awal dengan versi yang telah diperbaiki.
          </p>
        </div>
        {auditReports.length > 0 && (
          <button
            onClick={onClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/60 rounded-lg transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Riwayat</span>
          </button>
        )}
      </div>

      {auditReports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
          Belum ada riwayat audit yang tersimpan. Jalankan audit baru atau uji coba sampel dari beranda.
        </div>
      ) : (
        <>
          {/* Side-by-Side Comparison Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <GitCompare className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">
                Komparasi Langsung 2 Hasil Audit (Versi A vs Versi B)
              </h2>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-mono mb-1.5 block">
                  Pilih Versi Referensi (Versi A)
                </label>
                <select
                  value={selectedAuditAId}
                  onChange={(e) => setSelectedAuditAId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {auditReports.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.datasetName} ({r.scoreReport.adaptedScore}%) - {new Date(r.timestamp).toLocaleTimeString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-mono mb-1.5 block">
                  Pilih Versi Pembanding (Versi B)
                </label>
                <select
                  value={selectedAuditBId}
                  onChange={(e) => setSelectedAuditBId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {auditReports.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.datasetName} ({r.scoreReport.adaptedScore}%) - {new Date(r.timestamp).toLocaleTimeString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Metrics Delta */}
            {auditA && auditB && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-mono mb-1">Skor MQI Versi A</div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {auditA.scoreReport.adaptedScore}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">{auditA.datasetName}</div>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-mono mb-1">Skor MQI Versi B</div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {auditB.scoreReport.adaptedScore}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">{auditB.datasetName}</div>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-mono mb-1">Selisih Kualitas (Delta)</div>
                  <div className={`text-2xl font-bold font-mono tabular-nums ${
                    delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {delta > 0 ? 'Peningkatan kualitas terkonfirmasi' : delta < 0 ? 'Terjadi regresi kelengkapan' : 'Kualitas setara'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historical Audits Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-white">
                Daftar Lengkap Riwayat Audit ({auditReports.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/70 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nama Dataset</th>
                    <th className="py-3 px-4">Profil</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Skor MQI</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Temuan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {auditReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                        {r.datasetName}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono capitalize text-slate-400">
                        {r.profileId.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {new Date(r.timestamp).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                        {r.scoreReport.adaptedScore}%
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {r.scoreReport.isProvisional ? (
                          <span className="text-amber-400 font-medium">Sementara</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">Sah (Final)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {r.scoreReport.statusCounts.tidak_terpenuhi + r.scoreReport.statusCounts.tidak_valid} temuan
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectAudit(r)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1"
                        >
                          <span>Buka Detail</span>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
