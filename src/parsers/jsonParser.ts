/**
 * KOMPAS - JSON Metadata Parser
 * Distinguishes missing vs null vs empty string vs empty array vs placeholder vs unparsed JSON string.
 */

import { isPlaceholderValue } from '../audit/validator';
import { NormalizedMetadata } from '../types/audit';

export function parseJsonMetadata(jsonString: string, fileName = 'metadata.json'): NormalizedMetadata {
  const warnings: string[] = [];
  const errors: string[] = [];
  const rawEvidence: NormalizedMetadata['rawEvidence'] = {};

  let data: any = null;
  try {
    data = JSON.parse(jsonString);
  } catch (err: any) {
    errors.push(`Format JSON tidak valid atau korup: ${err?.message}`);
    return {
      rawFormat: 'json_catalog',
      fileName,
      fileSizeBytes: new Blob([jsonString]).size,
      parsedAt: new Date().toISOString(),
      rawEvidence: {},
      parseWarnings: warnings,
      parseErrors: errors,
    };
  }

  // If top-level is an array, take the first element if it's a catalog list
  if (Array.isArray(data)) {
    if (data.length === 0) {
      errors.push('Berkas JSON berisi array kosong ([]) tanpa objek metadata.');
      return {
        rawFormat: 'json_catalog',
        fileName,
        fileSizeBytes: new Blob([jsonString]).size,
        parsedAt: new Date().toISOString(),
        rawEvidence: {},
        parseWarnings: warnings,
        parseErrors: errors,
      };
    }
    warnings.push(`Berkas JSON berisi array berisi ${data.length} item katalog, memproses item pertama.`);
    data = data[0];
  }

  if (typeof data !== 'object' || data === null) {
    errors.push('Akar dokumen JSON harus berupa objek ({}), bukan nilai primitif.');
    return {
      rawFormat: 'json_catalog',
      fileName,
      fileSizeBytes: new Blob([jsonString]).size,
      parsedAt: new Date().toISOString(),
      rawEvidence: {},
      parseWarnings: warnings,
      parseErrors: errors,
    };
  }

  // Deep search with state distinction
  function getProp(obj: any, candidates: string[]): { value: any; path: string; state: 'found' | 'null' | 'empty_str' | 'empty_arr' | 'empty_obj' | 'placeholder' | 'unparsed_json' } | null {
    if (!obj || typeof obj !== 'object') return null;

    for (const key of candidates) {
      if (key in obj) {
        const val = obj[key];
        const path = key;

        if (val === null) return { value: null, path, state: 'null' };
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.length === 0) return { value: '', path, state: 'empty_str' };
          // Check if it is an unparsed JSON string e.g. "{\"bbox\": [100, 0, 105, 5]}"
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              const unparsed = JSON.parse(trimmed);
              return { value: unparsed, path, state: 'unparsed_json' };
            } catch {
              // regular string
            }
          }
          if (isPlaceholderValue(trimmed)) return { value: val, path, state: 'placeholder' };
          return { value: val, path, state: 'found' };
        }
        if (Array.isArray(val)) {
          if (val.length === 0) return { value: val, path, state: 'empty_arr' };
          return { value: val, path, state: 'found' };
        }
        if (typeof val === 'object') {
          if (Object.keys(val).length === 0) return { value: val, path, state: 'empty_obj' };
          return { value: val, path, state: 'found' };
        }
        return { value: val, path, state: 'found' };
      }
    }

    // Recurse into nested objects
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === 'object' && obj[k] !== null) {
        const nested = getProp(obj[k], candidates);
        if (nested) {
          return { ...nested, path: `${k}.${nested.path}` };
        }
      }
    }
    return null;
  }

  // Extract core fields
  const titleProp = getProp(data, ['title', 'name', 'dataset_title', 'nama_dataset', 'judul']);
  let title: string | undefined;
  if (titleProp) {
    if (titleProp.state === 'placeholder' || titleProp.state === 'empty_str' || titleProp.state === 'null') {
      warnings.push(`Judul dataset terdeteksi berstatus ${titleProp.state} pada lintasan "${titleProp.path}".`);
    } else {
      title = String(titleProp.value);
    }
    rawEvidence.title = { value: titleProp.value, path: titleProp.path, isPlaceholder: titleProp.state === 'placeholder' };
  }

  const idProp = getProp(data, ['id', 'uuid', 'identifier', 'dataset_id', 'kode']);
  let datasetId: string | undefined;
  if (idProp && idProp.state === 'found') {
    datasetId = String(idProp.value);
    rawEvidence.datasetId = { value: idProp.value, path: idProp.path, isPlaceholder: false };
  }

  const absProp = getProp(data, ['description', 'abstract', 'notes', 'ringkasan', 'deskripsi']);
  let abstract: string | undefined;
  if (absProp) {
    abstract = typeof absProp.value === 'string' ? absProp.value : undefined;
    rawEvidence.abstract = { value: absProp.value, path: absProp.path, isPlaceholder: absProp.state === 'placeholder' };
  }

  const purposeProp = getProp(data, ['purpose', 'tujuan', 'objective']);
  const purpose = typeof purposeProp?.value === 'string' ? purposeProp.value : undefined;

  // Keywords
  const kwProp = getProp(data, ['keywords', 'tags', 'kata_kunci', 'theme']);
  let keywords: string[] = [];
  if (kwProp && Array.isArray(kwProp.value)) {
    keywords = kwProp.value.map((k: any) => typeof k === 'string' ? k : k?.name || k?.label || '').filter(Boolean);
  } else if (kwProp && typeof kwProp.value === 'string') {
    keywords = kwProp.value.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  // BBox & Extent
  let west: number | undefined;
  let east: number | undefined;
  let south: number | undefined;
  let north: number | undefined;

  const bboxProp = getProp(data, ['bbox', 'spatial_extent', 'batas_wilayah', 'bounding_box', 'spatial']);
  if (bboxProp?.value) {
    let bboxVal = bboxProp.value;
    if (typeof bboxVal === 'string' && (bboxProp.state as string) === 'unparsed_json') {
      bboxVal = bboxProp.value;
    }
    if (Array.isArray(bboxVal) && bboxVal.length === 4) {
      // standard [minX, minY, maxX, maxY]
      west = Number(bboxVal[0]);
      south = Number(bboxVal[1]);
      east = Number(bboxVal[2]);
      north = Number(bboxVal[3]);
    } else if (typeof bboxVal === 'object') {
      west = Number(bboxVal.west ?? bboxVal.minX ?? bboxVal.xmin);
      south = Number(bboxVal.south ?? bboxVal.minY ?? bboxVal.ymin);
      east = Number(bboxVal.east ?? bboxVal.maxX ?? bboxVal.xmax);
      north = Number(bboxVal.north ?? bboxVal.maxY ?? bboxVal.ymax);
    }
  }

  // CRS
  const crsProp = getProp(data, ['crs', 'srs', 'spatial_reference', 'epsg', 'sistem_koordinat']);
  let crsName: string | undefined;
  if (crsProp && crsProp.value) {
    crsName = typeof crsProp.value === 'string' ? crsProp.value : crsProp.value?.name || crsProp.value?.code || JSON.stringify(crsProp.value);
    rawEvidence.crs = { value: crsName, path: crsProp.path, isPlaceholder: isPlaceholderValue(crsName) };
  }

  // Contact / Maintainer / Kustodian
  const orgProp = getProp(data, ['organization', 'publisher', 'author', 'instansi', 'kustodian', 'maintainer', 'department']);
  const emailProp = getProp(data, ['author_email', 'maintainer_email', 'contact_email', 'email', 'kontak']);
  const contactNameProp = getProp(data, ['author_name', 'maintainer_name', 'contact_name', 'kontak_person']);

  const contactOrg = orgProp && typeof orgProp.value === 'string' ? orgProp.value : orgProp?.value?.title || orgProp?.value?.name;
  const contactEmail = emailProp && typeof emailProp.value === 'string' ? emailProp.value : undefined;
  const contactName = contactNameProp && typeof contactNameProp.value === 'string' ? contactNameProp.value : undefined;

  if (orgProp) rawEvidence.contactOrg = { value: contactOrg, path: orgProp.path, isPlaceholder: isPlaceholderValue(contactOrg) };
  if (emailProp) rawEvidence.contactEmail = { value: contactEmail, path: emailProp.path, isPlaceholder: isPlaceholderValue(contactEmail) };

  // Dates
  const pubDateProp = getProp(data, ['metadata_created', 'issued', 'publication_date', 'tanggal_rilis', 'created', 'date']);
  const revDateProp = getProp(data, ['metadata_modified', 'modified', 'revision_date', 'tanggal_pembaruan', 'updated']);
  const pubDate = pubDateProp && typeof pubDateProp.value === 'string' ? pubDateProp.value : undefined;
  const revDate = revDateProp && typeof revDateProp.value === 'string' ? revDateProp.value : undefined;

  // Accuracy
  const tvuProp = getProp(data, ['tvu', 'vertical_uncertainty', 'ketidakpastian_vertikal']);
  const thuProp = getProp(data, ['thu', 'horizontal_uncertainty', 'ketidakpastian_horizontal']);
  const vDatumProp = getProp(data, ['vertical_datum', 'datum_vertikal', 'sounding_datum', 'pasut']);
  const sensorProp = getProp(data, ['sensor', 'instrument', 'peralatan_survei', 'echosounder']);

  // Lineage
  const lineageProp = getProp(data, ['lineage', 'silsilah_data', 'metodologi', 'methodology', 'processing']);
  const lineage = lineageProp && typeof lineageProp.value === 'string' ? lineageProp.value : undefined;

  return {
    rawFormat: 'json_catalog',
    fileName,
    fileSizeBytes: new Blob([jsonString]).size,
    parsedAt: new Date().toISOString(),
    title,
    datasetId,
    abstract,
    purpose,
    keywords,
    spatialExtent: {
      westBoundLongitude: isNaN(west as number) ? undefined : west,
      eastBoundLongitude: isNaN(east as number) ? undefined : east,
      southBoundLatitude: isNaN(south as number) ? undefined : south,
      northBoundLatitude: isNaN(north as number) ? undefined : north,
      crsName,
    },
    temporalExtent: {
      publicationDate: pubDate,
      revisionDate: revDate,
    },
    contact: {
      organization: contactOrg,
      individualName: contactName,
      email: contactEmail,
      isPlaceholder: isPlaceholderValue(contactOrg) || isPlaceholderValue(contactEmail),
    },
    accuracy: {
      totalVerticalUncertainty: tvuProp?.value,
      totalHorizontalUncertainty: thuProp?.value,
      verticalDatum: vDatumProp?.value,
      sensorType: sensorProp?.value,
      soundVelocityCorrected: false,
      tideCorrected: !!vDatumProp?.value,
    },
    processing: {
      lineageStatement: lineage,
    },
    metaMetadata: {
      standardName: 'Indonesian Marine Spatial Data Catalog / CKAN JSON',
      metadataDate: pubDate || revDate,
    },
    rawEvidence,
    parseWarnings: warnings,
    parseErrors: errors,
  };
}
