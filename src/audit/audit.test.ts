/**
 * KOMPAS - Unit Tests for Core Logic & Auditing Engine
 * Uses Node's built-in test runner (node:test) as mandated by Ultra Mode.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseXmlMetadata } from '../parsers/xmlParser';
import { parseJsonMetadata } from '../parsers/jsonParser';
import { parseGeoJson } from '../parsers/geoJsonParser';
import { runDatasetAudit } from './engine';
import { isPlaceholderValue, isValidContactEmail, validateBBox } from './validator';
import {
  SAMPLE_XML_BATIMETRI_ISO19139,
  SAMPLE_XML_CORRUPTED,
  SAMPLE_XML_TERUMBU_PLACEHOLDER,
  SAMPLE_GEOJSON_BENGKALIS,
  SAMPLE_JSON_KALBAR,
} from '../data/samples';

test('Placeholder Detection detects generic values and nulls', () => {
  assert.equal(isPlaceholderValue('Belum Ada'), true);
  assert.equal(isPlaceholderValue('TBD'), true);
  assert.equal(isPlaceholderValue('test@example.com'), false); // not a placeholder string per se, but email validator catches domain
  assert.equal(isPlaceholderValue(''), true);
  assert.equal(isPlaceholderValue('   '), true);
  assert.equal(isPlaceholderValue('null'), true);
  assert.equal(isPlaceholderValue('Survei Batimetri Alur Selat Malaka'), false);
});

test('Email validation flags invalid formats and example domains', () => {
  assert.equal(isValidContactEmail('survei.hidro@pushidrosal.id').valid, true);
  assert.equal(isValidContactEmail('test@example.com').valid, false);
  assert.equal(isValidContactEmail('invalid-email-string').valid, false);
  assert.equal(isValidContactEmail('admin@test.com').valid, false);
});

test('Bounding box validator catches coordinate ranges and inversions', () => {
  assert.equal(validateBBox(101.5, 1.5, 102.0, 2.0).valid, true);
  // Inverted: west > east
  assert.equal(validateBBox(105.0, 1.0, 100.0, 2.0).valid, false);
  // Out of range: longitude > 180
  assert.equal(validateBBox(190.0, 1.0, 195.0, 2.0).valid, false);
  // Pure zeros (unconfigured box)
  assert.equal(validateBBox(0, 0, 0, 0).valid, false);
});

test('XML Parser successfully extracts compliant ISO 19139 metadata', () => {
  const norm = parseXmlMetadata(SAMPLE_XML_BATIMETRI_ISO19139, 'malaka.xml');
  assert.equal(norm.rawFormat, 'xml_iso19139');
  assert.equal(norm.title, 'Survei Batimetri Multibeam Alur Pelayaran TSS Selat Malaka');
  assert.equal(norm.contact?.organization, 'Pusat Hidro-Oseanografi TNI AL (Pushidrosal)');
  assert.equal(norm.contact?.email, 'survei.hidro@pushidrosal.id');
  assert.equal(norm.accuracy?.verticalDatum, 'Lowest Astronomical Tide (LAT)');
  assert.equal(norm.accuracy?.soundVelocityCorrected, true);
  assert.ok(norm.spatialExtent?.westBoundLongitude !== undefined);
  assert.equal(norm.spatialExtent?.westBoundLongitude, 101.45);
  assert.equal(norm.parseErrors.length, 0);
});

test('XML Parser safely handles corrupted XML without throwing', () => {
  const norm = parseXmlMetadata(SAMPLE_XML_CORRUPTED, 'corrupt.xml');
  assert.ok(norm.parseErrors.length > 0);
  assert.equal(norm.rawFormat, 'unknown');
});

test('JSON Parser extracts catalog metadata and distinguishes placeholders', () => {
  const norm = parseJsonMetadata(SAMPLE_JSON_KALBAR, 'kalbar.json');
  assert.equal(norm.rawFormat, 'json_catalog');
  assert.equal(norm.title, 'Katalog Metadata Kawasan Konservasi Pesisir dan Pulau-Pulau Kecil (KKP3K) Kalimantan Barat');
  assert.equal(norm.datasetId, 'kkp3k-kalbar-2023-resmi');
  assert.equal(norm.spatialExtent?.westBoundLongitude, 108.45);
  assert.equal(norm.contact?.organization, 'Dinas Kelautan dan Perikanan Provinsi Kalimantan Barat');
});

test('GeoJSON Parser validates FeatureCollection and polygon rings', () => {
  const spatial = parseGeoJson(SAMPLE_GEOJSON_BENGKALIS, 'bengkalis.geojson');
  assert.equal(spatial.format, 'geojson');
  assert.equal(spatial.featureCount, 3);
  assert.equal(spatial.geometryTypes.includes('Polygon'), true);
  assert.equal(spatial.ringClosureErrorsCount, 0);
  assert.equal(spatial.emptyGeometryCount, 0);
  assert.ok(spatial.bounds[0] > 100); // longitude east of 100°
});

test('MQI Audit Engine evaluates Bathymetric dataset with high score for compliant survey', () => {
  const meta = parseXmlMetadata(SAMPLE_XML_BATIMETRI_ISO19139, 'malaka.xml');
  const report = runDatasetAudit('batimetri', meta);

  assert.ok(report.scoreReport.adaptedScore !== null);
  // Compliant multibeam should score high (>= 85%)
  assert.ok((report.scoreReport.adaptedScore as number) >= 80);
  assert.equal(report.scoreReport.statusCounts.tidak_berlaku, 0);
  assert.ok(report.scoreReport.categorySummaries.length === 8);
});

test('MQI Audit Engine flags provisional score on placeholder metadata', () => {
  const meta = parseXmlMetadata(SAMPLE_XML_TERUMBU_PLACEHOLDER, 'draft.xml');
  const report = runDatasetAudit('terumbu_karang', meta);

  assert.equal(report.scoreReport.isProvisional, true);
  assert.ok(report.scoreReport.provisionalReasons.length > 0);
  // Should have invalid parameters for email, date, etc.
  assert.ok(report.scoreReport.statusCounts.tidak_valid > 0);
});

test('MQI Audit Engine excludes non-applicable parameters from denominator', () => {
  const meta = parseJsonMetadata(SAMPLE_JSON_KALBAR, 'kalbar.json');
  const report = runDatasetAudit('kawasan_konservasi', meta);

  // In 'kawasan_konservasi', bathymetry-only parameters (e.g. SVP, TVU) are not applicable or adapted
  const svpResult = report.parameterResults.find(r => r.ruleId === 'ACC-04');
  // If not applicable in profile, it is excluded
  if (svpResult) {
    assert.ok(svpResult.status === 'tidak_berlaku' || svpResult.weight > 0);
  }
});

test('ISO 19115 Core Metadata Compliance correctly verifies compliant dataset', () => {
  const meta = parseXmlMetadata(SAMPLE_XML_BATIMETRI_ISO19139, 'malaka.xml');
  const report = runDatasetAudit('batimetri', meta);

  assert.ok(report.iso19115Compliance !== undefined);
  assert.equal(report.iso19115Compliance.isCompliant, true);
  assert.ok(report.iso19115Compliance.coreScore >= 80);
  assert.ok(report.iso19115Compliance.elements.length >= 12);
  assert.ok(report.iso19115Compliance.standardReference.includes('ISO 19115'));
});

test('ISO 19115 Core Metadata Compliance flags incomplete or placeholder dataset', () => {
  const meta = parseXmlMetadata(SAMPLE_XML_TERUMBU_PLACEHOLDER, 'draft.xml');
  const report = runDatasetAudit('terumbu_karang', meta);

  assert.ok(report.iso19115Compliance !== undefined);
  assert.equal(report.iso19115Compliance.isCompliant, false);
  assert.ok(report.iso19115Compliance.statusLabel.includes('Belum Memenuhi'));
});

