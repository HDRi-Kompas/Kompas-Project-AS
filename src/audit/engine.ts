/**
 * KOMPAS - Metadata Quality Index (MQI) Audit Engine
 * Evaluates metadata rules, computes scores according to Hasara & Karunanayaka (2026),
 * and generates comprehensive audit reports.
 */

import { AUDIT_RULE_REGISTRY } from './registry';
import { METHODOLOGY_METADATA, MQI_CATEGORIES, ISO19115_CORE_ELEMENTS } from './methodology';
import { auditConsistency } from './consistency';
import {
  AuditReport,
  CategorySummary,
  DatasetProfileId,
  ISO19115ComplianceReport,
  ISO19115CoreElementCheck,
  MQICategory,
  MQIScoreReport,
  NormalizedMetadata,
  NormalizedSpatialData,
  ParameterAuditResult,
} from '../types/audit';

export function runDatasetAudit(
  profileId: DatasetProfileId,
  metadata?: NormalizedMetadata,
  spatial?: NormalizedSpatialData,
  datasetNameOverride?: string
): AuditReport {
  const timestamp = new Date().toISOString();
  const datasetName = datasetNameOverride || metadata?.title || spatial?.fileName || 'Dataset Kelautan Tanpa Judul';

  const parameterResults: ParameterAuditResult[] = [];
  const provisionalReasons: string[] = [];

  // Filter applicable rules for this profile
  const applicableRules = AUDIT_RULE_REGISTRY.filter(rule => {
    if (rule.applicableProfiles === 'all') return true;
    return rule.applicableProfiles.includes(profileId);
  });

  // Evaluate each rule
  for (const rule of applicableRules) {
    let outcome: ReturnType<typeof rule.evaluate>;

    if (!metadata) {
      outcome = {
        status: 'belum_diperiksa',
        valueFound: null,
        findingMessage: 'Berkas metadata pendukung tidak tersedia.',
      };
    } else {
      try {
        outcome = rule.evaluate(metadata, spatial);
      } catch (err: any) {
        outcome = {
          status: 'belum_diperiksa',
          valueFound: null,
          findingMessage: `Kesalahan saat mengevaluasi aturan: ${err?.message}`,
        };
      }
    }

    const isMandatory = rule.isMandatoryInProfile(profileId);
    if (isMandatory && (outcome.status === 'tidak_terpenuhi' || outcome.status === 'tidak_valid')) {
      provisionalReasons.push(`Parameter wajib "${rule.name}" (${rule.id}) berstatus ${outcome.status}.`);
    }
    if (outcome.status === 'perlu_ditinjau') {
      provisionalReasons.push(`Parameter "${rule.name}" (${rule.id}) memerlukan peninjauan manual pakar.`);
    }

    const scoreContribution = outcome.status === 'terpenuhi' ? 1 * rule.weight : 0;

    parameterResults.push({
      ruleId: rule.id,
      name: rule.name,
      category: rule.category,
      importance: rule.importance,
      weight: rule.weight,
      source: rule.source,
      status: outcome.status,
      scoreContribution,
      valueFound: outcome.valueFound,
      expectedFormat: rule.expectedFormat,
      iso19115Tag: rule.iso19115Tag,
      isIso19115Core: rule.isIso19115Core,
      sourcePath: outcome.sourcePath,
      evidenceSnippet: outcome.evidenceSnippet,
      findingMessage: outcome.findingMessage,
      recommendation: outcome.recommendation,
      technicalDetails: outcome.technicalDetails,
    });
  }

  // 1. Calculate Original MQI (only Hasara 2026 rules)
  const originalRules = parameterResults.filter(
    r => r.source === 'jurnal_hasara_2026' && r.status !== 'tidak_berlaku'
  );
  let origNumerator = 0;
  let origDenominator = 0;
  for (const r of originalRules) {
    if (r.status === 'terpenuhi') {
      origNumerator += r.weight;
    }
    origDenominator += r.weight;
  }
  const originalScore = origDenominator > 0 ? Math.round((origNumerator / origDenominator) * 1000) / 10 : null;

  // 2. Calculate KOMPAS Adapted MQI (all applicable evaluated rules)
  const evaluatedRules = parameterResults.filter(r => r.status !== 'tidak_berlaku');
  let adaptedNumerator = 0;
  let adaptedDenominator = 0;
  for (const r of evaluatedRules) {
    if (r.status === 'terpenuhi') {
      adaptedNumerator += r.weight;
    }
    adaptedDenominator += r.weight;
  }
  const adaptedScore = adaptedDenominator > 0 ? Math.round((adaptedNumerator / adaptedDenominator) * 1000) / 10 : null;

  // Status counts
  const statusCounts: Record<ParameterAuditResult['status'], number> = {
    terpenuhi: 0,
    tidak_terpenuhi: 0,
    tidak_valid: 0,
    tidak_berlaku: 0,
    belum_diperiksa: 0,
    perlu_ditinjau: 0,
  };
  parameterResults.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });

  // Calculate 8 Category Summaries
  const categorySummaries: CategorySummary[] = (
    Object.keys(MQI_CATEGORIES) as MQICategory[]
  ).map(catKey => {
    const catRules = parameterResults.filter(r => r.category === catKey);
    const applicableCatRules = catRules.filter(r => r.status !== 'tidak_berlaku');
    const fulfilledCatRules = catRules.filter(r => r.status === 'terpenuhi');

    let scoreEarned = 0;
    let scoreMaxPossible = 0;
    applicableCatRules.forEach(r => {
      scoreMaxPossible += r.weight;
      if (r.status === 'terpenuhi') scoreEarned += r.weight;
    });

    const percentage = scoreMaxPossible > 0 ? Math.round((scoreEarned / scoreMaxPossible) * 1000) / 10 : 0;

    return {
      category: catKey,
      categoryName: MQI_CATEGORIES[catKey].name,
      totalParameters: catRules.length,
      applicableParameters: applicableCatRules.length,
      fulfilledParameters: fulfilledCatRules.length,
      scoreEarned,
      scoreMaxPossible,
      percentage,
    };
  });

  // Determine compliance tier
  const finalScoreRef = adaptedScore ?? originalScore;
  let complianceTier: MQIScoreReport['complianceTier'] = 'Unrated';
  if (finalScoreRef !== null) {
    const matchTier = METHODOLOGY_METADATA.tiers.find(
      t => finalScoreRef >= t.min && finalScoreRef <= t.max
    );
    if (matchTier) complianceTier = matchTier.label as any;
  }

  const scoreReport: MQIScoreReport = {
    originalScore,
    adaptedScore,
    isProvisional: provisionalReasons.length > 0 || statusCounts.belum_diperiksa > 0,
    provisionalReasons,
    numerator: adaptedNumerator,
    denominator: adaptedDenominator,
    totalRulesAssessed: parameterResults.length,
    statusCounts,
    categorySummaries,
    complianceTier,
    methodologyVersion: METHODOLOGY_METADATA.version,
    rulesetVersion: METHODOLOGY_METADATA.rulesetVersion,
  };

  // Spatial Findings
  const spatialFindings: AuditReport['spatialFindings'] = [];
  if (spatial) {
    if (spatial.errors.length > 0) {
      spatial.errors.forEach(err => {
        spatialFindings.push({
          severity: 'critical',
          title: 'Kesalahan Validasi Data Spasial',
          description: err,
          remediation: 'Perbaiki berkas spasial menggunakan software GIS (QGIS/GDAL) sebelum digunakan.',
        });
      });
    }
    if (spatial.ringClosureErrorsCount > 0) {
      spatialFindings.push({
        severity: 'critical',
        title: 'Pelanggaran Cincin Poligon (Ring Closure)',
        description: `Ditemukan ${spatial.ringClosureErrorsCount} cincin poligon tidak tertutup (titik awal != titik akhir).`,
        remediation: 'Lakukan operasi perbaikan geometri (Fix Geometries / ST_MakeValid) pada lapisan poligon.',
      });
    }
    if (spatial.emptyGeometryCount > 0) {
      spatialFindings.push({
        severity: 'warning',
        title: 'Geometri Kosong Ditemukan',
        description: `Terdapat ${spatial.emptyGeometryCount} fitur dengan geometri null atau tanpa koordinat.`,
        remediation: 'Hapus atau perbaiki fitur bergeometri kosong dari layer.',
      });
    }
    if (spatial.invalidCoordinateCount > 0) {
      spatialFindings.push({
        severity: 'critical',
        title: 'Koordinat di Luar Rentang Geografis',
        description: `Ditemukan ${spatial.invalidCoordinateCount} koordinat non-numerik atau di luar batas bujur/lintang [-180..180, -90..90].`,
        remediation: 'Pastikan urutan koordinat adalah Longitude-Latitude dan terproyeksi dalam sistem WGS 84.',
      });
    }
    if (spatial.duplicateIdCount > 0) {
      spatialFindings.push({
        severity: 'warning',
        title: 'Pengidentifikasi Fitur Duplikat',
        description: `Ditemukan ${spatial.duplicateIdCount} ID fitur yang berulang/duplikat.`,
        remediation: 'Buat ID unik primer (FID/UUID) untuk setiap fitur spasial.',
      });
    }
  }

  // Consistency Audit
  let consistencyResult;
  if (metadata && spatial) {
    consistencyResult = auditConsistency(metadata, spatial);
  }

  // Evaluate ISO 19115 Core Metadata Compliance (ISO 19115-1:2014 / SNI ISO 19115:2012)
  const iso19115Elements: ISO19115CoreElementCheck[] = ISO19115_CORE_ELEMENTS.map(item => {
    const matchedParam = parameterResults.find(p => p.ruleId === item.ruleId);
    const status = matchedParam ? matchedParam.status : (metadata ? 'tidak_terpenuhi' : 'belum_diperiksa');
    const valueFound = matchedParam?.valueFound ?? null;
    const details = matchedParam?.findingMessage || (status === 'terpenuhi' ? 'Elemen inti terdefinisi sesuai skema ISO 19115.' : 'Elemen inti belum terdokumentasi.');

    return {
      code: item.code,
      name: item.name,
      nameId: item.nameId,
      isoTag: item.isoTag,
      xmlPath: item.xmlPath,
      isMandatory: item.isMandatory,
      status,
      valueFound,
      details,
      ruleId: item.ruleId,
    };
  });

  const mandatoryElements = iso19115Elements.filter(e => e.isMandatory);
  const passedCount = iso19115Elements.filter(e => e.status === 'terpenuhi').length;
  const passedMandatoryCount = mandatoryElements.filter(e => e.status === 'terpenuhi').length;
  const isCompliant = passedMandatoryCount === mandatoryElements.length;
  const coreScore = Math.round((passedCount / iso19115Elements.length) * 1000) / 10;

  const iso19115Compliance: ISO19115ComplianceReport = {
    isCompliant,
    coreScore,
    passedCount,
    totalCoreCount: iso19115Elements.length,
    statusLabel: isCompliant
      ? 'Memenuhi Standar Inti ISO 19115 & SNI ISO 19115:2012'
      : `Belum Memenuhi (${passedMandatoryCount}/${mandatoryElements.length} Elemen Wajib Terpenuhi)`,
    summaryNotes: isCompliant
      ? 'Seluruh elemen metadata wajib (Mandatory Core Elements) sesuai ISO 19115-1:2014 & SNI ISO 19115:2012 telah lengkap dan terverifikasi.'
      : `Terdapat ${mandatoryElements.length - passedMandatoryCount} elemen metadata inti berstatus wajib yang belum lengkap atau tidak valid menurut ISO 19115.`,
    elements: iso19115Elements,
    standardReference: 'ISO 19115-1:2014 & SNI ISO 19115:2012 (BSN/BIG)',
  };

  return {
    id: `AUDIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp,
    datasetName,
    profileId,
    metadataFile: metadata ? { name: metadata.fileName, size: metadata.fileSizeBytes, format: metadata.rawFormat } : undefined,
    spatialFile: spatial ? { name: spatial.fileName, size: spatial.fileSizeBytes, format: spatial.format } : undefined,
    normalizedMetadata: metadata,
    normalizedSpatialData: spatial,
    scoreReport,
    iso19115Compliance,
    parameterResults,
    consistencyResult,
    spatialFindings,
  };
}
