/**
 * KOMPAS - Main Dashboard View
 * Executive overview, key audit metrics, quick-start sample benchmarks, and recent audits.
 */

import React from 'react';
import {
  FileCheck2,
  AlertOctagon,
  Clock,
  Compass,
  ArrowRight,
  Database,
  Layers,
  FileCode2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AuditReport } from '../types/audit';
import { METHODOLOGY_METADATA } from '../audit/methodology';

interface DashboardViewProps {
  auditReports: AuditReport[];
  onSelectAudit: (audit: AuditReport) => void;
  onNavigateUpload: () => void;
  onRunSampleAudit: (sampleKey: string) => void;
  isLoadingSample: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  auditReports,
  onSelectAudit,
  onNavigateUpload,
  onRunSampleAudit,
  isLoadingSample,
}) => {
  const totalAudits = auditReports.length;
  const completedAudits = auditReports.filter(r => !r.scoreReport.isProvisional).length;
  const totalFindings = auditReports.reduce(
    (acc, r) => acc + (r.scoreReport.statusCounts.tidak_terpenuhi + r.scoreReport.statusCounts.tidak_valid),
    0
  );
  const avgMqi =
    totalAudits > 0
      ? (
          auditReports.reduce((acc, r) => acc + (r.scoreReport.adaptedScore || 0), 0) / totalAudits
        ).toFixed(1)
      : '0.0';

  const benchmarkSamples = [
    {
      key: 'iso_batimetri',
      title: 'Survei Batimetri Multibeam TSS Selat Malaka',
      type: 'XML (ISO 19139)',
      profile: 'Batimetri',
      badgeColor: 'text-cyan-400 border-cyan-800/80 bg-cyan-950/40',
      description: 'Metadata multibeam echosounder lengkap dengan TVU, THU, koreksi SVP, dan datum pasut LAT.',
      expected: 'Skor MQI Tinggi (Compliant)',
    },
    {
      key: 'esri_batimetri',
      title: 'Batimetri Single-Beam Teluk Lampung 1998',
      type: 'XML (Esri / FGDC)',
      profile: 'Batimetri',
      badgeColor: 'text-amber-400 border-amber-800/80 bg-amber-950/40',
      description: 'Arsip lama analog, tidak memiliki dokumentasi ketidakpastian vertikal modern (TVU/THU).',
      expected: 'Kualitas Sedang (Legacy Data)',
    },
    {
      key: 'json_kalbar',
      title: 'Katalog Kawasan Konservasi Kalbar (KKP3K)',
      type: 'JSON Katalog',
      profile: 'Kawasan Konservasi',
      badgeColor: 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40',
      description: 'Format katalog JSON terstruktur memuat SK penetapan hukum, batas spasial, dan narahubung resmi.',
      expected: 'Evaluasi Adaptasi KOMPAS',
    },
    {
      key: 'geojson_bengkalis',
      title: 'Pesisir Mangrove Bengkalis & Meranti, Riau',
      type: 'GeoJSON Spasial',
      profile: 'Mangrove',
      badgeColor: 'text-teal-400 border-teal-800/80 bg-teal-950/40',
      description: 'Dataset poligon spasial dengan 3 fitur mangrove, verifikasi koordinat WGS 84 dan ring closure.',
      expected: 'Audit Geometri & Topologi',
    },
    {
      key: 'shp_kotawaringin',
      title: 'Alur Migrasi Biota Laut Kotawaringin Timur',
      type: 'Shapefile ZIP (.shp, .shx, .dbf, .prj)',
      profile: 'Jalur Migrasi Biota Laut',
      badgeColor: 'text-blue-400 border-blue-800/80 bg-blue-950/40',
      description: 'Arsip biner ZIP shapefile berisi alur lintasan mamalia laut dan proyeksi geografis .prj.',
      expected: 'Uji Ekstraksi ZIP & Biner',
    },
    {
      key: 'xml_placeholder',
      title: 'Survei Terumbu Karang Wakatobi (Draft Placeholder)',
      type: 'XML (ISO 19139)',
      profile: 'Terumbu Karang',
      badgeColor: 'text-rose-400 border-rose-800/80 bg-rose-950/40',
      description: 'Memuat nilai "Belum Ada", "TBD", tanggal "0000-00-00", dan email placeholder test@example.com.',
      expected: 'Deteksi Placeholder & Skor Sementara',
    },
    {
      key: 'xml_corrupted',
      title: 'Metadata Geospasial Rusak (Corrupted Tag)',
      type: 'XML Rusak',
      profile: 'Kelautan Umum',
      badgeColor: 'text-red-400 border-red-800/80 bg-red-950/40',
      description: 'Sintaks XML tidak tertutup untuk menguji ketahanan parser dan sanitasi sistem.',
      expected: 'Uji Ketahanan Error (No Crash)',
    },
    {
      key: 'paired_kalbar_bengkalis',
      title: 'Uji Pasangan: Metadata Kalbar + Spasial Riau',
      type: 'Pasangan Uji (Paired Audit)',
      profile: 'Kawasan Konservasi',
      badgeColor: 'text-purple-400 border-purple-800/80 bg-purple-950/40',
      description: 'Uji audit konsistensi lintas-berkas antara dokumen metadata dan lapisan spasial geografis.',
      expected: 'Deteksi Inkonsistensi BBox/Wilayah',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Strip */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400 mb-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-semibold">
              STANDAR ISO 19115 & SNI ISO 19115
            </span>
            <span aria-hidden="true">·</span>
            <span>LANDASAN MQI HASARA & KARUNANAYAKA (2026)</span>
            <span aria-hidden="true">·</span>
            <span>IHO S-102 / S-44</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            Audit Kualitas Metadata & Data Spasial Kelautan
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            KOMPAS mengaudit kesesuaian standar internasional <strong className="text-cyan-300 font-semibold">ISO 19115-1:2014</strong> dan standar nasional <strong className="text-emerald-300 font-semibold">SNI ISO 19115:2012 (BSN/BIG)</strong> serta menghitung indeks mutu kuantitatif <strong className="text-white font-semibold">Metadata Quality Index (MQI)</strong> dengan transparansi penuh formula matematis dan tanpa simulasi rekaan.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow transition-colors"
            >
              <span>Unggah Berkas untuk Diaudit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Mendukung XML ISO 19139, Esri XML, JSON Katalog, GeoJSON, dan ZIP Shapefile
            </span>
          </div>
        </div>

        {/* Decorative Cartographic Background Lines */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden lg:block overflow-hidden">
          <svg viewBox="0 0 400 400" className="w-full h-full text-cyan-400 stroke-current fill-none">
            <circle cx="200" cy="200" r="180" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="200" cy="200" r="140" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="100" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="200" cy="200" r="60" strokeWidth="2" />
            <path d="M 20 200 L 380 200 M 200 20 L 200 380" strokeWidth="1" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Audit</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {totalAudits}
          </div>
          <div className="text-xs text-slate-500 mt-1">Sesi pemeriksaan tersimpan</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Audit Tuntas</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {completedAudits}
          </div>
          <div className="text-xs text-slate-500 mt-1">Skor final tanpa penangguhan</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Temuan Masalah</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {totalFindings}
          </div>
          <div className="text-xs text-slate-500 mt-1">Hilang / placeholder / invalid</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Rata-Rata MQI</span>
            <Compass className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {avgMqi}
            <span className="text-sm font-normal text-slate-400 ml-1">/ 100</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Indeks Kualitas Metadata</div>
        </div>
      </div>

      {/* Benchmark Test Datasets (1-Click Run) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>Berkas Sampel Pengujian Otentik (1-Click Audit)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Uji langsung kapabilitas parser dan algoritma MQI terhadap dataset kasus riil dari perairan Indonesia.
            </p>
          </div>
          {isLoadingSample && (
            <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Memproses Sampel...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {benchmarkSamples.map((sample) => (
            <div
              key={sample.key}
              className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-lg p-4 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sample.badgeColor}`}>
                    {sample.type}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {sample.profile}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-1.5">
                  {sample.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-3">
                  {sample.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <div className="text-[11px] font-mono text-slate-400 mb-2">
                  Target: <span className="text-slate-300">{sample.expected}</span>
                </div>
                <button
                  onClick={() => onRunSampleAudit(sample.key)}
                  disabled={isLoadingSample}
                  className="w-full py-1.5 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 border border-slate-700 rounded-md transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50"
                >
                  <span>Jalankan Audit Sampel</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Audits List or Empty State */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <span>Riwayat Pemeriksaan Terkini</span>
        </h2>

        {auditReports.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-lg">
            <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">
              Belum Ada Sesi Audit yang Dijalankan
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              Silakan pilih salah satu dataset sampel pengujian di atas untuk melihat demonstrasi audit nyata, atau unggah berkas metadata/data spasial Anda sendiri.
            </p>
            <button
              onClick={onNavigateUpload}
              className="px-4 py-2 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
            >
              Unggah Dataset Baru
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Dataset</th>
                  <th className="py-3 px-4">Profil</th>
                  <th className="py-3 px-4">Format Berkas</th>
                  <th className="py-3 px-4">Skor MQI</th>
                  <th className="py-3 px-4">Status Skor</th>
                  <th className="py-3 px-4">Waktu Audit</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditReports.slice(0, 8).map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      {report.datasetName}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono capitalize text-slate-400">
                      {report.profileId.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      {report.metadataFile?.format || report.spatialFile?.format || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white tabular-nums">
                      {report.scoreReport.adaptedScore !== null ? `${report.scoreReport.adaptedScore}%` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {report.scoreReport.isProvisional ? (
                        <span className="text-amber-400 font-medium">Skor Sementara</span>
                      ) : (
                        <span className="text-emerald-400 font-medium">Skor Sah (Final)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {new Date(report.timestamp).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectAudit(report)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium hover:underline focus-visible:outline-none"
                      >
                        Buka Laporan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
