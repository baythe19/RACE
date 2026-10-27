#!/usr/bin/env node
/**
 * Structural check for CLIENT_DOC_VS_BUILD.md against clintdoc.md.
 * Does not treat a hardcoded score as proof of product completeness.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const reportPath = path.join(repoRoot, 'docs/client/CLIENT_DOC_VS_BUILD.md');
const clientPath = path.join(repoRoot, 'clintdoc.md');

const ALLOWED_STATUS = /\b(Done|Partial|Stub|Missing|Later)\b/;
const SECRETISH = /(mongodb\+srv:\/\/[^/\s]+:[^/\s]+@)|(TWILIO_AUTH_TOKEN\s*=\s*\w{10,})|(JWT_ACCESS_SECRET\s*=\s*\S{16,})/i;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function extractClientModules(text) {
  const mods = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\*?(\d+)\.\s+(.+?)\*?\s*$/);
    if (m) mods.push({ n: m[1], title: m[2].replace(/\*+$/, '').trim() });
  }
  return mods;
}

const client = fs.readFileSync(clientPath, 'utf8');
const report = fs.readFileSync(reportPath, 'utf8');
const modules = extractClientModules(client);

if (modules.length < 10) {
  fail(`clintdoc.md expected at least 10 numbered modules, found ${modules.length}`);
}

const missingHeadings = [];
for (const { title } of modules) {
  const needle = title.replace(/\s+/g, ' ').trim();
  if (!report.includes(needle)) missingHeadings.push(needle);
}

if (missingHeadings.length) {
  fail(`Report missing client-doc module titles: ${missingHeadings.join(' | ')}`);
}

const requiredChunks = [
  'How to read this report',
  'Overall picture',
  'How the apps connect',
  'Work queue',
  'SCORE_TABLE',
  'OVERALL_SCORE_LINE',
];
for (const chunk of requiredChunks) {
  if (!report.includes(chunk)) fail(`Report missing required section marker: ${chunk}`);
}

if (!ALLOWED_STATUS.test(report)) {
  fail('Report has no allowed status labels');
}

const statusHits = (report.match(/\|\s*(Done|Partial|Stub|Missing|Later)\s*\|/g) || []).length;
if (statusHits < 40) {
  fail(`Expected many status table cells, found ${statusHits}`);
}

if (SECRETISH.test(report)) {
  fail('Report appears to contain secret-like values');
}

const scoresMode = process.argv.includes('--scores');
if (scoresMode) {
  if (!/OVERALL_SCORE_LINE:\s*\d{1,3}\s*\/\s*100/.test(report)) {
    fail('Missing OVERALL_SCORE_LINE with n/100');
  }
  if (!/SCORE_TABLE/.test(report)) {
    fail('Missing SCORE_TABLE marker');
  }
}

console.log('gap report verification passed');
