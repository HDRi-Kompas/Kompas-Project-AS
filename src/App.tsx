/**
 * KOMPAS - Marine Geospatial Metadata Quality Index (MQI) Audit Platform
 * Master Application Controller
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { UploadAuditView } from './components/UploadAuditView';
import { AuditProgressView, AuditStepState } from './components/AuditProgressView';
import { AuditResultsView } from './components/AuditResultsView';
import { RegistryView } from './components/RegistryView';
import { HistoryCompareView } from './components/HistoryCompareView';
import { MethodologyView } from './components/MethodologyView';
import { parseXmlMetadata } from './parsers/xmlParser';
import { parseJsonMetadata } from './parsers/jsonParser';
import { parseGeoJson } from './parsers/geoJsonParser';
import { parseShapefileZip } from './parsers/shapefileZipParser';
import { runDatasetAudit } from './audit/engine';
import { AuditReport, DatasetProfileId, NormalizedMetadata, NormalizedSpatialData } from './types/audit';
import {
  SAMPLE_XML_BATIMETRI_ISO19139,
  SAMPLE_XML_BATIMETRI_ESRI,
  SAMPLE_XML_KONSERVASI_ISO,
  SAMPLE_XML_TERUMBU_PLACEHOLDER,
  SAMPLE_XML_CORRUPTED,
  SAMPLE_GEOJSON_BENGKALIS,
  SAMPLE_JSON_KALBAR,
  createKotawaringinShapefileZip,
} from './data/samples';

const INITIAL_STEPS: AuditStepState[] = [
  { id: 1, label: 'Deteksi Format & Namespace', description: 'Memeriksa header, skema, dan integritas berkas.', status: 'pending' },
  { id: 2, label: 'Pembacaan & Sanitasi Berkas', description: 'Mencegah XXE, Zip-Slip, dan enkapsulasi biner.', status: 'pending' },
  { id: 3, label: 'Normalisasi ke Skema Internal', description: 'Memetakan elemen XML/JSON ke model audit terpadu.', status: 'pending' },
  { id: 4, label: 'Validasi Struktur & Topologi', description: 'Memeriksa koordinat, ring closure, dan atribut.', status: 'pending' },
  { id: 5, label: 'Audit Aturan Parameter (8 Kategori MQI)', description: 'Mengevaluasi aturan kelengkapan dan placeholder.', status: 'pending' },
  { id: 6, label: 'Audit Spasial Khusus Lapangan', description: 'Memverifikasi keselarasan batas geografis maritim.', status: 'pending' },
  { id: 7, label: 'Penghitungan Skor Transparan MQI', description: 'Mengkalkulasi rumus berbobot Hasara 2026.', status: 'pending' },
  { id: 8, label: 'Penyusunan Laporan & Rekomendasi', description: 'Menghasilkan bukti audit dan panduan perbaikan.', status: 'pending' },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [auditSteps, setAuditSteps] = useState<AuditStepState[]>(INITIAL_STEPS);
  const [currentProcessingName, setCurrentProcessingName] = useState<string>('');

  // Initialize stored reports or pre-seed initial audits
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kompas_audit_reports');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAuditReports(parsed);
          setActiveReport(parsed[0]);
          return;
        }
      }
    } catch {
      // fallback
    }

    // Seed default baseline audit reports
    const metaMalaka = parseXmlMetadata(SAMPLE_XML_BATIMETRI_ISO19139, 'survei_malaka_multibeam.xml');
    const reportMalaka = runDatasetAudit('batimetri', metaMalaka, undefined, 'Survei Batimetri Multibeam TSS Selat Malaka');

    const metaEsri = parseXmlMetadata(SAMPLE_XML_BATIMETRI_ESRI, 'batimetri_teluk_lampung_1998.xml');
    const reportEsri = runDatasetAudit('batimetri', metaEsri, undefined, 'Pemeruman Batimetri Teluk Lampung 1998');

    const metaKalbar = parseJsonMetadata(SAMPLE_JSON_KALBAR, 'kkp3k_kalbar_catalog.json');
    const reportKalbar = runDatasetAudit('kawasan_konservasi', metaKalbar, undefined, 'Katalog Kawasan Konservasi KKP3K Kalimantan Barat');

    const initial = [reportMalaka, reportEsri, reportKalbar];
    setAuditReports(initial);
    setActiveReport(reportMalaka);
    try {
      localStorage.setItem('kompas_audit_reports', JSON.stringify(initial));
    } catch {
      // ignore
    }
  }, []);

  const saveReport = (report: AuditReport) => {
    setAuditReports((prev) => {
      const updated = [report, ...prev.filter(r => r.id !== report.id)];
      try {
        localStorage.setItem('kompas_audit_reports', JSON.stringify(updated));
      } catch {
        // storage overflow fallback
      }
      return updated;
    });
    setActiveReport(report);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('kompas_audit_reports');
    setAuditReports([]);
    setActiveReport(null);
  };

  // Run audit on user-uploaded files
  const handleStartAudit = async (
    profileId: DatasetProfileId,
    metaFile: File | null,
    spatialFile: File | null
  ) => {
    setIsProcessing(true);
    const datasetTitle = metaFile?.name.replace(/\.[^/.]+$/, '') || spatialFile?.name.replace(/\.[^/.]+$/, '') || 'Dataset Kelautan';
    setCurrentProcessingName(datasetTitle);
    setCurrentTab('progress');

    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const steps: AuditStepState[] = INITIAL_STEPS.map(s => ({ ...s, status: 'pending' }));
    setAuditSteps(steps);

    // Step 1: Detect format
    steps[0].status = 'running';
    setAuditSteps([...steps]);
    await delay(200);
    steps[0].status = 'completed';

    // Step 2: Read & Sanitize
    steps[1].status = 'running';
    setAuditSteps([...steps]);

    let normalizedMeta: NormalizedMetadata | undefined;
    let normalizedSpatial: NormalizedSpatialData | undefined;

    try {
      if (metaFile) {
        const text = await metaFile.text();
        const ext = metaFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'xml') {
          normalizedMeta = parseXmlMetadata(text, metaFile.name);
        } else if (ext === 'json') {
          normalizedMeta = parseJsonMetadata(text, metaFile.name);
        }
      }

      if (spatialFile) {
        const ext = spatialFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'geojson' || ext === 'json') {
          const text = await spatialFile.text();
          normalizedSpatial = parseGeoJson(text, spatialFile.name);
        } else if (ext === 'zip') {
          const buffer = await spatialFile.arrayBuffer();
          normalizedSpatial = await parseShapefileZip(buffer, spatialFile.name);
        }
      }
    } catch (err: any) {
      steps[1].status = 'error';
      steps[1].errorDetails = `Gagal membaca berkas: ${err?.message}`;
      setAuditSteps([...steps]);
      setIsProcessing(false);
      return;
    }
    steps[1].status = 'completed';

    // Step 3: Normalization
    steps[2].status = 'running';
    setAuditSteps([...steps]);
    await delay(150);
    steps[2].status = 'completed';

    // Step 4: Structural & topology check
    steps[3].status = 'running';
    setAuditSteps([...steps]);
    await delay(150);
    steps[3].status = 'completed';

    // Step 5: Parameter Audit
    steps[4].status = 'running';
    setAuditSteps([...steps]);
    await delay(200);
    steps[4].status = 'completed';

    // Step 6: Spatial Audit
    steps[5].status = 'running';
    setAuditSteps([...steps]);
    await delay(150);
    steps[5].status = 'completed';

    // Step 7: Score calculation
    steps[6].status = 'running';
    setAuditSteps([...steps]);
    const report = runDatasetAudit(profileId, normalizedMeta, normalizedSpatial, datasetTitle);
    await delay(200);
    steps[6].status = 'completed';

    // Step 8: Report assembly
    steps[7].status = 'running';
    setAuditSteps([...steps]);
    await delay(150);
    steps[7].status = 'completed';

    saveReport(report);
    setIsProcessing(false);
    setCurrentTab('results');
  };

  // Run benchmark test samples with 1 click
  const handleRunSampleAudit = async (sampleKey: string) => {
    setIsLoadingSample(true);
    setCurrentTab('progress');

    const steps: AuditStepState[] = INITIAL_STEPS.map(s => ({ ...s, status: 'pending' }));
    setAuditSteps(steps);
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    steps[0].status = 'running';
    setAuditSteps([...steps]);
    await delay(100);
    steps[0].status = 'completed';

    steps[1].status = 'running';
    setAuditSteps([...steps]);

    let profileId: DatasetProfileId = 'batimetri';
    let meta: NormalizedMetadata | undefined;
    let spatial: NormalizedSpatialData | undefined;
    let title = 'Sampel Uji MQI';

    if (sampleKey === 'iso_batimetri') {
      profileId = 'batimetri';
      meta = parseXmlMetadata(SAMPLE_XML_BATIMETRI_ISO19139, 'survei_malaka_multibeam.xml');
      title = 'Survei Batimetri Multibeam TSS Selat Malaka';
    } else if (sampleKey === 'esri_batimetri') {
      profileId = 'batimetri';
      meta = parseXmlMetadata(SAMPLE_XML_BATIMETRI_ESRI, 'batimetri_teluk_lampung_1998.xml');
      title = 'Pemeruman Batimetri Teluk Lampung 1998';
    } else if (sampleKey === 'json_kalbar') {
      profileId = 'kawasan_konservasi';
      meta = parseJsonMetadata(SAMPLE_JSON_KALBAR, 'kkp3k_kalbar_catalog.json');
      title = 'Katalog Kawasan Konservasi KKP3K Kalimantan Barat';
    } else if (sampleKey === 'geojson_bengkalis') {
      profileId = 'mangrove';
      spatial = parseGeoJson(SAMPLE_GEOJSON_BENGKALIS, 'mangrove_pesisir_bengkalis.geojson');
      title = 'Pesisir Mangrove Bengkalis & Meranti, Riau';
    } else if (sampleKey === 'shp_kotawaringin') {
      profileId = 'jalur_migrasi';
      const zipBlob = await createKotawaringinShapefileZip();
      const buffer = await zipBlob.arrayBuffer();
      spatial = await parseShapefileZip(buffer, 'alur_migrasi_kotawaringin.zip');
      title = 'Alur Migrasi Biota Laut Kotawaringin Timur';
    } else if (sampleKey === 'xml_placeholder') {
      profileId = 'terumbu_karang';
      meta = parseXmlMetadata(SAMPLE_XML_TERUMBU_PLACEHOLDER, 'draft_wakatobi_placeholder.xml');
      title = 'Survei Terumbu Karang Wakatobi (Draft Placeholder)';
    } else if (sampleKey === 'xml_corrupted') {
      profileId = 'kelautan_umum';
      meta = parseXmlMetadata(SAMPLE_XML_CORRUPTED, 'dokumen_rusak.xml');
      title = 'Metadata Geospasial Rusak (Corrupted Tag)';
    } else if (sampleKey === 'paired_kalbar_bengkalis') {
      profileId = 'kawasan_konservasi';
      meta = parseJsonMetadata(SAMPLE_JSON_KALBAR, 'kkp3k_kalbar_catalog.json');
      spatial = parseGeoJson(SAMPLE_GEOJSON_BENGKALIS, 'mangrove_pesisir_bengkalis.geojson');
      title = 'Uji Pasangan: Metadata Kalbar + Spasial Riau';
    }

    setCurrentProcessingName(title);
    steps[1].status = 'completed';

    for (let i = 2; i < 7; i++) {
      steps[i].status = 'running';
      setAuditSteps([...steps]);
      await delay(80);
      steps[i].status = 'completed';
    }

    const report = runDatasetAudit(profileId, meta, spatial, title);
    steps[7].status = 'completed';
    setAuditSteps([...steps]);

    saveReport(report);
    setIsLoadingSample(false);
    setCurrentTab('results');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onQuickUpload={() => setCurrentTab('upload')}
        activeAuditCount={auditReports.length}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            auditReports={auditReports}
            onSelectAudit={(r) => {
              setActiveReport(r);
              setCurrentTab('results');
            }}
            onNavigateUpload={() => setCurrentTab('upload')}
            onRunSampleAudit={handleRunSampleAudit}
            isLoadingSample={isLoadingSample}
          />
        )}

        {currentTab === 'upload' && (
          <UploadAuditView
            onStartAudit={handleStartAudit}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'progress' && (
          <AuditProgressView
            steps={auditSteps}
            currentDatasetName={currentProcessingName}
          />
        )}

        {currentTab === 'results' && (
          activeReport ? (
            <AuditResultsView
              report={activeReport}
              onBackToDashboard={() => setCurrentTab('dashboard')}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <p className="mb-4">Belum ada hasil audit yang aktif.</p>
              <button
                onClick={() => setCurrentTab('upload')}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
              >
                Mulai Audit Baru
              </button>
            </div>
          )
        )}

        {currentTab === 'registry' && <RegistryView />}

        {currentTab === 'history' && (
          <HistoryCompareView
            auditReports={auditReports}
            onSelectAudit={(r) => {
              setActiveReport(r);
              setCurrentTab('results');
            }}
            onClearHistory={handleClearHistory}
          />
        )}

        {currentTab === 'methodology' && <MethodologyView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 bg-slate-900/90 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="font-bold text-white">KOMPAS</span> · Sistem Audit Kualitas Metadata dan Dataset Geospasial Kelautan Berbasis MQI
            <div className="text-[11px] text-slate-500 mt-0.5">
              Landasan: K. M. D. Hasara & K. A. N. C. Karunanayaka (2026), Sabaragamuwa University of Sri Lanka.
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>MSDI Audit Standard v2.4</span>
            <span aria-hidden="true">·</span>
            <span>WGS 84 / IHO S-44 / ISO 19139</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
