/**
 * KOMPAS - Metadata XML Parser
 * Robust & secure parser for ISO 19139 and Esri/ArcGIS XML metadata formats.
 * Sanitizes input to prevent XXE (XML External Entity) attacks.
 */

import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { isPlaceholderValue } from '../audit/validator';
import { NormalizedMetadata } from '../types/audit';

export function parseXmlMetadata(xmlString: string, fileName = 'metadata.xml'): NormalizedMetadata {
  const warnings: string[] = [];
  const errors: string[] = [];
  const rawEvidence: NormalizedMetadata['rawEvidence'] = {};

  // XXE Defense: Check for dangerous DOCTYPE / ENTITY declarations
  if (/<!DOCTYPE\b[^>]*<!ENTITY/i.test(xmlString) || /SYSTEM\s+["'][^"']+["']/i.test(xmlString)) {
    errors.push('Ditemukan deklarasi DTD/ENTITY eksternal yang berpotensi membahayakan (XXE protection). Penguraian entitas eksternal dinonaktifkan.');
  }

  // Validate XML syntax
  const validation = XMLValidator.validate(xmlString);
  if (validation !== true) {
    errors.push(`Gagal mengurai dokumen XML: ${validation.err?.msg || 'Sintaks XML tidak valid atau struktur tag rusak.'}`);
    return {
      rawFormat: 'unknown',
      fileName,
      fileSizeBytes: new Blob([xmlString]).size,
      parsedAt: new Date().toISOString(),
      rawEvidence: {},
      parseWarnings: warnings,
      parseErrors: errors,
    };
  }

  // Configure fast-xml-parser safely
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true, // Strips 'gmd:', 'gco:', 'gml:' etc. for unified normalized querying
    parseTagValue: true,
    trimValues: true,
  });

  let parsed: any = null;
  try {
    parsed = parser.parse(xmlString);
  } catch (err: any) {
    errors.push(`Gagal mengurai dokumen XML: ${err?.message || 'Sintaks XML tidak valid atau struktur tag rusak.'}`);
    return {
      rawFormat: 'unknown',
      fileName,
      fileSizeBytes: new Blob([xmlString]).size,
      parsedAt: new Date().toISOString(),
      rawEvidence: {},
      parseWarnings: warnings,
      parseErrors: errors,
    };
  }

  // Detect format flavor
  const isIso19139 = !!(parsed?.MD_Metadata || parsed?.['gmd:MD_Metadata'] || parsed?.metadata?.MD_Metadata);
  const isEsri = !!(parsed?.metadata?.idinfo || parsed?.metadata?.Esri || parsed?.idinfo);
  const rawFormat = isIso19139 ? 'xml_iso19139' : isEsri ? 'xml_esri' : 'unknown';

  if (rawFormat === 'unknown') {
    warnings.push('Format XML tidak secara langsung teridentifikasi sebagai ISO 19139 maupun Esri Metadata standar, menggunakan pelacakan heuristik semantik.');
  }

  // Helper to deep traverse and find first non-empty text node
  function findNode(obj: any, keys: string[]): { value: any; path: string } | null {
    if (!obj || typeof obj !== 'object') return null;

    for (const key of keys) {
      if (key in obj && obj[key] !== undefined && obj[key] !== null) {
        let val = obj[key];
        // Handle ISO 19139 gco:CharacterString or similar wrapper objects
        if (typeof val === 'object' && val !== null) {
          if ('CharacterString' in val) val = val.CharacterString;
          else if ('LanguageCode' in val) val = typeof val.LanguageCode === 'object' ? (val.LanguageCode['#text'] || val.LanguageCode['@_codeListValue'] || val.LanguageCode) : val.LanguageCode;
          else if ('CI_RoleCode' in val) val = typeof val.CI_RoleCode === 'object' ? (val.CI_RoleCode['#text'] || val.CI_RoleCode['@_codeListValue'] || val.CI_RoleCode) : val.CI_RoleCode;
          else if ('MD_ScopeCode' in val) val = typeof val.MD_ScopeCode === 'object' ? (val.MD_ScopeCode['#text'] || val.MD_ScopeCode['@_codeListValue'] || val.MD_ScopeCode) : val.MD_ScopeCode;
          else if ('#text' in val) val = val['#text'];
          else if ('URL' in val) val = val.URL;
          else if ('Date' in val) val = val.Date;
          else if ('DateTime' in val) val = val.DateTime;
          else if ('Decimal' in val) val = val.Decimal;
          else if ('Integer' in val) val = val.Integer;
          else if ('Boolean' in val) val = val.Boolean;
        }
        if (val !== undefined && val !== null) {
          return { value: val, path: key };
        }
      }
    }

    // Traverse children
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === 'object' && obj[k] !== null && !k.startsWith('@_')) {
        const sub = findNode(obj[k], keys);
        if (sub) {
          return { value: sub.value, path: `${k}/${sub.path}` };
        }
      }
    }
    return null;
  }

  // Helper to extract keywords list
  function extractKeywords(obj: any): string[] {
    const list: string[] = [];
    function scan(node: any) {
      if (!node) return;
      if (typeof node === 'string') {
        const parts = node.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        list.push(...parts);
      } else if (Array.isArray(node)) {
        node.forEach(scan);
      } else if (typeof node === 'object') {
        for (const k of Object.keys(node)) {
          if (/keyword/i.test(k) || k === 'CharacterString') {
            scan(node[k]);
          }
        }
      }
    }
    const kwNode = findNode(obj, ['keyword', 'theme', 'keywords', 'descript', 'place']);
    if (kwNode) scan(kwNode.value);
    return Array.from(new Set(list));
  }

  // Extract Title
  const titleMatch = findNode(parsed, ['title', 'resTitle', 'CitationTitle', 'datasetTitle']);
  const title = typeof titleMatch?.value === 'string' ? titleMatch.value : undefined;
  if (titleMatch) {
    rawEvidence.title = { value: title, path: titleMatch.path, isPlaceholder: isPlaceholderValue(title) };
  }

  // Extract Dataset ID
  const idMatch = findNode(parsed, ['fileIdentifier', 'id', 'datasetId', 'identCode', 'code']);
  const datasetId = typeof idMatch?.value === 'string' ? idMatch.value : typeof idMatch?.value === 'number' ? String(idMatch.value) : undefined;
  if (idMatch) {
    rawEvidence.datasetId = { value: datasetId, path: idMatch.path, isPlaceholder: isPlaceholderValue(datasetId) };
  }

  // Extract Abstract
  const abstractMatch = findNode(parsed, ['abstract', 'idAbs', 'descript', 'purpose']);
  const abstract = typeof abstractMatch?.value === 'string' ? abstractMatch.value : undefined;
  if (abstractMatch) {
    rawEvidence.abstract = { value: abstract, path: abstractMatch.path, isPlaceholder: isPlaceholderValue(abstract) };
  }

  // Extract Purpose
  const purposeMatch = findNode(parsed, ['purpose', 'idPurp']);
  const purpose = typeof purposeMatch?.value === 'string' ? purposeMatch.value : undefined;
  if (purposeMatch) {
    rawEvidence.purpose = { value: purpose, path: purposeMatch.path, isPlaceholder: isPlaceholderValue(purpose) };
  }

  // Extract Language
  const langMatch = findNode(parsed, ['LanguageCode', 'language', 'dataLang']);
  const language = typeof langMatch?.value === 'string' ? langMatch.value : undefined;
  if (langMatch) {
    rawEvidence.language = { value: language, path: langMatch.path, isPlaceholder: isPlaceholderValue(language) };
  }

  // Extract Extents (BBox)
  const westMatch = findNode(parsed, ['westBoundLongitude', 'westbc', 'westBL']);
  const eastMatch = findNode(parsed, ['eastBoundLongitude', 'eastbc', 'eastBL']);
  const southMatch = findNode(parsed, ['southBoundLatitude', 'southbc', 'southBL']);
  const northMatch = findNode(parsed, ['northBoundLatitude', 'northbc', 'northBL']);

  const west = westMatch ? parseFloat(westMatch.value) : undefined;
  const east = eastMatch ? parseFloat(eastMatch.value) : undefined;
  const south = southMatch ? parseFloat(southMatch.value) : undefined;
  const north = northMatch ? parseFloat(northMatch.value) : undefined;

  // Extract CRS / Datum
  const crsMatch = findNode(parsed, ['referenceSystemIdentifier', 'code', 'refSysCode', 'datum', 'horizpa', 'projection']);
  const crsVal = typeof crsMatch?.value === 'string' ? crsMatch.value : typeof crsMatch?.value === 'object' ? JSON.stringify(crsMatch.value) : undefined;
  if (crsMatch) {
    rawEvidence.crs = { value: crsVal, path: crsMatch.path, isPlaceholder: isPlaceholderValue(crsVal) };
  }

  // Extract Contact
  const orgMatch = findNode(parsed, ['organisationName', 'cntorg', 'rpOrgName', 'Originator', 'publisher']);
  const contactOrg = typeof orgMatch?.value === 'string' ? orgMatch.value : undefined;
  if (orgMatch) {
    rawEvidence.contactOrg = { value: contactOrg, path: orgMatch.path, isPlaceholder: isPlaceholderValue(contactOrg) };
  }

  const emailMatch = findNode(parsed, ['electronicMailAddress', 'cntemail', 'email']);
  const contactEmail = typeof emailMatch?.value === 'string' ? emailMatch.value : undefined;
  if (emailMatch) {
    rawEvidence.contactEmail = { value: contactEmail, path: emailMatch.path, isPlaceholder: isPlaceholderValue(contactEmail) };
  }

  const indNameMatch = findNode(parsed, ['individualName', 'cntper', 'rpIndName']);
  const contactName = typeof indNameMatch?.value === 'string' ? indNameMatch.value : undefined;

  const roleMatch = findNode(parsed, ['role', 'roleCode', 'RoleCode']);
  const contactRole = typeof roleMatch?.value === 'string' ? roleMatch.value : undefined;

  // Extract Dates
  const dateMatch = findNode(parsed, ['date', 'pubdate', 'createDate', 'revisionDate', 'dateStamp']);
  const pubDate = typeof dateMatch?.value === 'string' ? dateMatch.value : undefined;
  if (dateMatch) {
    rawEvidence.publicationDate = { value: pubDate, path: dateMatch.path, isPlaceholder: isPlaceholderValue(pubDate) };
  }

  // Extract Accuracy & Marine Specifics (TVU, THU, TPU, Datum)
  const tvuMatch = findNode(parsed, ['totalVerticalUncertainty', 'verticalAccuracy', 'vertacc', 'TVU', 'vUncert']);
  const thuMatch = findNode(parsed, ['totalHorizontalUncertainty', 'horizontalAccuracy', 'horizacc', 'THU', 'hUncert']);
  const tpuMatch = findNode(parsed, ['totalPropagatedUncertainty', 'TPU']);
  const vertDatumMatch = findNode(parsed, ['verticalDatum', 'vdatum', 'depthDatum', 'soundingDatum']);
  const sensorMatch = findNode(parsed, ['sensor', 'instrument', 'sounder', 'echosounder', 'multibeam', 'singlebeam', 'equipment']);

  if (tvuMatch) rawEvidence.tvu = { value: tvuMatch.value, path: tvuMatch.path, isPlaceholder: isPlaceholderValue(tvuMatch.value) };
  if (thuMatch) rawEvidence.thu = { value: thuMatch.value, path: thuMatch.path, isPlaceholder: isPlaceholderValue(thuMatch.value) };

  // Lineage / Processing
  const lineageMatch = findNode(parsed, ['statement', 'lineage', 'procdesc', 'processStep']);
  const lineage = typeof lineageMatch?.value === 'string' ? lineageMatch.value : undefined;
  if (lineageMatch) {
    rawEvidence.lineage = { value: lineage, path: lineageMatch.path, isPlaceholder: isPlaceholderValue(lineage) };
  }

  // Meta-metadata
  const standardNameMatch = findNode(parsed, ['metadataStandardName', 'metstdn']);
  const standardVersionMatch = findNode(parsed, ['metadataStandardVersion', 'metstdv']);
  const metaDateMatch = findNode(parsed, ['dateStamp', 'metd']);

  return {
    rawFormat,
    fileName,
    fileSizeBytes: new Blob([xmlString]).size,
    parsedAt: new Date().toISOString(),
    title,
    datasetId,
    abstract,
    purpose,
    keywords: extractKeywords(parsed),
    language,
    spatialExtent: {
      westBoundLongitude: isNaN(west as number) ? undefined : west,
      eastBoundLongitude: isNaN(east as number) ? undefined : east,
      southBoundLatitude: isNaN(south as number) ? undefined : south,
      northBoundLatitude: isNaN(north as number) ? undefined : north,
      crsName: crsVal,
      datum: typeof vertDatumMatch?.value === 'string' ? vertDatumMatch.value : undefined,
    },
    temporalExtent: {
      publicationDate: pubDate,
    },
    contact: {
      organization: contactOrg,
      individualName: contactName,
      email: contactEmail,
      role: contactRole,
      isPlaceholder: isPlaceholderValue(contactOrg) || isPlaceholderValue(contactEmail),
    },
    accuracy: {
      totalVerticalUncertainty: tvuMatch?.value,
      totalHorizontalUncertainty: thuMatch?.value,
      totalPropagatedUncertainty: tpuMatch?.value,
      verticalDatum: typeof vertDatumMatch?.value === 'string' ? vertDatumMatch.value : undefined,
      sensorType: typeof sensorMatch?.value === 'string' ? sensorMatch.value : undefined,
      soundVelocityCorrected: xmlString.toLowerCase().includes('sound velocity') || xmlString.toLowerCase().includes('svp'),
      tideCorrected: xmlString.toLowerCase().includes('tide') || xmlString.toLowerCase().includes('pasang surut'),
    },
    processing: {
      lineageStatement: lineage,
      softwareUsed: findNode(parsed, ['software', 'processSoftware'])?.value,
    },
    metaMetadata: {
      standardName: typeof standardNameMatch?.value === 'string' ? standardNameMatch.value : isIso19139 ? 'ISO 19115/19139' : isEsri ? 'Esri Metadata' : undefined,
      standardVersion: typeof standardVersionMatch?.value === 'string' ? standardVersionMatch.value : undefined,
      metadataDate: typeof metaDateMatch?.value === 'string' ? metaDateMatch.value : undefined,
    },
    rawEvidence,
    parseWarnings: warnings,
    parseErrors: errors,
  };
}
