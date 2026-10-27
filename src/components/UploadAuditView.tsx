/**
 * KOMPAS - Upload & Audit Configuration View
 * Handles file dropzone, profile selection, cross-file pairing, and audit initiation.
 */

import React, { useState } from 'react';
import {
  UploadCloud,
  FileCode,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Link as LinkIcon,
  X,
  Play,
} from 'lucide-react';
import { DATASET_PROFILES } from '../audit/methodology';
import { DatasetProfileId } from '../types/audit';

interface UploadAuditViewProps {
  onStartAudit: (
    profileId: DatasetProfileId,
    metadataFile: File | null,
    spatialFile: File | null
  ) => void;
  isProcessing: boolean;
}

export const UploadAuditView: React.FC<UploadAuditViewProps> = ({
  onStartAudit,
  isProcessing,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<DatasetProfileId>('batimetri');
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [spatialFile, setSpatialFile] = useState<File | null>(null);
  const [isPairingEnabled, setIsPairingEnabled] = useState(false);
  const [dragOverMeta, setDragOverMeta] = useState(false);
  const [dragOverSpatial, setDragOverSpatial] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleMetadataSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xml' && ext !== 'json') {
        setValidationError(`Format "${file.name}" tidak didukung sebagai dokumen metadata. Harap gunakan .xml atau .json.`);
        return;
      }
      setValidationError(null);
      setMetadataFile(file);
    }
  };

  const handleSpatialSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'geojson' && ext !== 'json' && ext !== 'zip') {
        setValidationError(`Format "${file.name}" tidak didukung sebagai dataset spasial. Harap gunakan .geojson atau arsip .zip.`);
        return;
      }
      setValidationError(null);
      setSpatialFile(file);
    }
  };

  const handleMetaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverMeta(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xml' || ext === 'json') {
        setValidationError(null);
        setMetadataFile(file);
      } else {
        setValidationError(`Berkas "${file.name}" bukan berkas XML/JSON metadata.`);
      }
    }
  };

  const handleSpatialDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSpatial(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'geojson' || ext === 'zip' || ext === 'json') {
        setValidationError(null);
        setSpatialFile(file);
      } else {
        setValidationError(`Berkas "${file.name}" bukan berkas GeoJSON atau Shapefile ZIP.`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadataFile && !spatialFile) {
      setValidationError('Silakan unggah minimal satu berkas (Metadata atau Data Spasial).');
      return;
    }
    setValidationError(null);
    onStartAudit(selectedProfile, metadataFile, spatialFile);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Audit Kualitas Dataset Geospasial Kelautan
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Unggah berkas metadata standar <span className="text-cyan-300 font-medium">ISO 19115 / SNI ISO 19115 (XML ISO 19139 & Esri)</span> atau JSON katalog dan/atau data spasial (GeoJSON/Shapefile ZIP) untuk menjalankan audit parameter mutu MQI & kesesuaian elemen inti ISO 19115.
        </p>
      </div>

      {validationError && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="leading-relaxed">{validationError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Audit Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-white uppercase tracking-wider block">
              1. Pilih Profil Dataset Kelautan
            </label>
            <span className="text-xs text-slate-400 font-mono">
              {DATASET_PROFILES[selectedProfile].isJournalOriginal ? 'Metodologi Jurnal Asli' : 'Adaptasi KOMPAS'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Pemilihan profil menentukan aturan yang berlaku dan mencegah parameter spesifik batimetri (seperti koreksi SVP) dipaksakan pada data habitat bentik atau batas kawasan.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(DATASET_PROFILES) as DatasetProfileId[]).map((profId) => {
              const prof = DATASET_PROFILES[profId];
              const isSelected = selectedProfile === profId;
              return (
                <button
                  type="button"
                  key={profId}
                  onClick={() => setSelectedProfile(profId)}
                  className={`p-3.5 text-left rounded-lg border transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/30 text-white shadow-sm ring-1 ring-cyan-500/50'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1 text-slate-200">
                    {prof.name}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {prof.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Upload Files Dropzones */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              2. Unggah Berkas Sumber
            </h2>
            <button
              type="button"
              onClick={() => setIsPairingEnabled(!isPairingEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                isPairingEnabled
                  ? 'border-cyan-500/70 bg-cyan-950/50 text-cyan-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{isPairingEnabled ? 'Mode Pasangan (Aktif)' : 'Aktifkan Pasangan Metadata + Spasial'}</span>
            </button>
          </div>

          <div className={`grid gap-6 ${isPairingEnabled ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Slot A: Metadata File */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Berkas Metadata Dokumen (.xml atau .json)
              </label>

              {metadataFile ? (
                <div className="p-4 bg-slate-950/80 border border-cyan-800/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileCode className="w-8 h-8 text-cyan-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-sm font-semibold text-white truncate">
                        {metadataFile.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {(metadataFile.size / 1024).toFixed(1)} KB · {metadataFile.name.split('.').pop()?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMetadataFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    aria-label="Hapus berkas metadata"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOverMeta(true); }}
                  onDragLeave={() => setDragOverMeta(false)}
                  onDrop={handleMetaDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOverMeta
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <div className="text-xs text-slate-300 font-medium mb-1">
                    Tarik berkas metadata ke sini atau klik untuk memilih
                  </div>
                  <div className="text-[11px] text-slate-500 mb-3">
                    Mendukung ISO 19139 XML, Esri Metadata XML, atau JSON Katalog
                  </div>
                  <label className="inline-block px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-200 hover:bg-white rounded cursor-pointer transition-colors">
                    Pilih Berkas Metadata
                    <input
                      type="file"
                      accept=".xml,.json"
                      onChange={handleMetadataSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Slot B: Spatial Dataset (Active or toggleable) */}
            {(isPairingEnabled || !metadataFile) && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 block">
                  Dataset Spasial Lapangan (.geojson atau .zip Shapefile)
                </label>

                {spatialFile ? (
                  <div className="p-4 bg-slate-950/80 border border-teal-800/80 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MapPin className="w-8 h-8 text-teal-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-sm font-semibold text-white truncate">
                          {spatialFile.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {(spatialFile.size / 1024).toFixed(1)} KB · {spatialFile.name.split('.').pop()?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSpatialFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      aria-label="Hapus berkas spasial"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverSpatial(true); }}
                    onDragLeave={() => setDragOverSpatial(false)}
                    onDrop={handleSpatialDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragOverSpatial
                        ? 'border-teal-400 bg-teal-950/20'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <div className="text-xs text-slate-300 font-medium mb-1">
                      Tarik dataset spasial ke sini atau klik untuk memilih
                    </div>
                    <div className="text-[11px] text-slate-500 mb-3">
                      Mendukung GeoJSON standar atau ZIP (.shp, .shx, .dbf, .prj)
                    </div>
                    <label className="inline-block px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-200 hover:bg-white rounded cursor-pointer transition-colors">
                      Pilih Dataset Spasial
                      <input
                        type="file"
                        accept=".geojson,.json,.zip"
                        onChange={handleSpatialSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isProcessing || (!metadataFile && !spatialFile)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isProcessing ? 'Sedang Memproses Audit...' : 'Jalankan Audit Kualitas (MQI)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
