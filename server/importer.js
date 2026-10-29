/**
 * Project import — CSV / XLSX with dry-run validation (PRD v2.1 §7.8).
 *
 * Zero dependencies, per ADR-001:
 *  - CSV: RFC 4180 state machine (quoted fields, escaped quotes, embedded
 *    newlines, BOM, delimiter sniffing between , ; and tab).
 *  - XLSX: minimal OOXML reader — ZIP central directory parsed by hand,
 *    DEFLATE streams inflated with node:zlib, shared strings and the first
 *    worksheet extracted with a tolerant regex scanner. Enough for the
 *    flat metadata sheets this feature consumes, and nothing more.
 *
 * The importer is pure: buildImport() parses and validates without touching
 * the store and returns a plan; applyImport() commits that plan. Dry-run
 * therefore cannot mutate anything, which is the point of the mode.
 */

import zlib from 'node:zlib';

import { db } from './store.js';

export const IMPORT_MAX_BYTES = 2_000_000;
export const IMPORT_MAX_ROWS = 200;
export const IMPORT_MAX_PROJECTS = 500;

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

export function parseCsv(text) {
  let source = String(text ?? '');
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);

  /* Sniff the delimiter from the first line outside quotes. */
  const firstLine = source.slice(0, source.indexOf('\n') === -1 ? 2048 : source.indexOf('\n'));
  const candidates = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const char of firstLine) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char in candidates) candidates[char] += 1;
  }
  const delimiter = Object.entries(candidates).sort((a, b) => b[1] - a[1])[0][0] || ',';

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let touched = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    touched = false;
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    touched = true;
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      endField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      endRow();
    } else {
      field += char;
    }
  }
  if (inQuotes) throw new Error('Unterminated quoted field — a closing quote is missing.');
  if (field !== '' || row.length > 0 || touched) endRow();

  return { rows, delimiter };
}

/* ------------------------------------------------------------------ */
/* XLSX (minimal OOXML)                                                */
/* ------------------------------------------------------------------ */

function zipEntries(buffer) {
  /* Locate the End of Central Directory record. */
  let eocd = -1;
  const floor = Math.max(0, buffer.length - 66_000);
  for (let i = buffer.length - 22; i >= floor; i -= 1) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b && buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('Not a readable XLSX file (ZIP directory not found).');

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let n = 0; n < entryCount; n += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function zipRead(buffer, entries, name) {
  const entry = entries.get(name);
  if (!entry) return null;
  const local = entry.localOffset;
  if (buffer.readUInt32LE(local) !== 0x04034b50) throw new Error(`Corrupt XLSX entry: ${name}`);
  const nameLength = buffer.readUInt16LE(local + 26);
  const extraLength = buffer.readUInt16LE(local + 28);
  const start = local + 30 + nameLength + extraLength;
  const raw = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(raw);
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error(`Unsupported XLSX compression (method ${entry.method}) in ${name}.`);
}

const decodeXml = (text) =>
  String(text ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

function columnFromRef(reference) {
  const letters = /^[A-Z]+/.exec(String(reference || '').toUpperCase());
  if (!letters) return -1;
  let index = 0;
  for (const char of letters[0]) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function parseSharedStrings(xml) {
  const out = [];
  for (const match of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) {
    let text = '';
    for (const part of match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) text += part[1];
    out.push(decodeXml(text));
  }
  return out;
}

function parseSheet(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1] || '';
      const body = cellMatch[2] || '';
      const reference = /\br\s*=\s*"([^"]+)"/.exec(attrs);
      const type = /\bt\s*=\s*"([^"]+)"/.exec(attrs);
      const index = columnFromRef(reference ? reference[1] : '');
      if (index < 0) continue;

      let value = '';
      const kind = type ? type[1] : 'n';
      if (kind === 'inlineStr') {
        const inline = body.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/);
        value = inline ? decodeXml(inline[1]) : '';
      } else {
        const v = body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
        const raw = v ? v[1] : '';
        if (kind === 's') value = sharedStrings[Number(raw)] ?? '';
        else if (kind === 'str') value = decodeXml(raw);
        else value = decodeXml(raw);
      }
      cells[index] = String(value).trim();
    }
    rows.push(Array.from(cells, (cell) => cell ?? ''));
  }
  return rows;
}

export function parseXlsx(buffer) {
  const entries = zipEntries(buffer);
  const sharedRaw = zipRead(buffer, entries, 'xl/sharedStrings.xml');
  const sharedStrings = sharedRaw ? parseSharedStrings(sharedRaw.toString('utf8')) : [];

  const sheetNames = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const sheetName =
    sheetNames[0] || [...entries.keys()].find((name) => name.startsWith('xl/worksheets/'));
  if (!sheetName) throw new Error('No worksheet found in the XLSX file.');

  const sheetXml = zipRead(buffer, entries, sheetName).toString('utf8');
  return { rows: parseSheet(sheetXml, sharedStrings), sheet: sheetName.replace('xl/worksheets/', '') };
}

/* ------------------------------------------------------------------ */
/* Header mapping                                                      */
/* ------------------------------------------------------------------ */

const COLUMNS = {
  title: ['title', 'project', 'project title', 'project name', 'name'],
  slug: ['slug', 'id', 'key', 'project slug'],
  tagline: ['tagline', 'subtitle', 'strapline'],
  summary: ['summary', 'description', 'executive summary', 'short summary', 'overview'],
  sector: ['sector', 'industry', 'vertical'],
  stage: ['stage', 'round', 'maturity'],
  geography: ['geography', 'geo', 'location', 'country', 'market', 'jurisdiction'],
  ticket: ['ticket', 'ticket size', 'raise', 'raise size', 'target raise', 'ask', 'funding'],
  currency: ['currency', 'ccy'],
  status: ['status', 'project status'],
  visibility: ['visibility', 'access'],
  tags: ['tags', 'tag', 'labels'],
  link: ['link', 'url', 'external link', 'external url', 'website'],
  highlights: ['highlights', 'key highlights'],
  story: ['story', 'narrative', 'about', 'about the project'],
  updated: ['updated', 'last updated', 'date', 'as of'],
};

const normaliseHeader = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

function mapHeaders(headerRow, issues) {
  const map = new Map(); /* columnIndex → field */
  const used = new Set();
  headerRow.forEach((cell, index) => {
    const key = normaliseHeader(cell);
    if (!key) return;
    const field = Object.entries(COLUMNS).find(([, aliases]) => aliases.includes(key));
    if (!field) {
      if (cell.trim()) issues.push({ row: 1, field: String(cell).slice(0, 40), severity: 'warning', message: 'Unknown column ignored.' });
      return;
    }
    if (used.has(field[0])) {
      issues.push({ row: 1, field: field[0], severity: 'warning', message: 'Duplicate column — the first one wins.' });
      return;
    }
    used.add(field[0]);
    map.set(index, field[0]);
  });
  return map;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const STATUS_ALIASES = {
  open: 'open',
  'open for discussion': 'open',
  published: 'published',
  live: 'open',
  draft: 'draft',
  'under review': 'under-review',
  'under-review': 'under-review',
  review: 'under-review',
  paused: 'paused',
  hold: 'paused',
  closed: 'closed',
};
const VISIBILITIES = new Set(['public', 'registered', 'invitation', 'hidden']);
const HIDDEN_STATUSES = new Set(['draft', 'paused']);

export const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

function excelSerialToIso(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 20_000 || serial > 80_000) return null;
  const ms = Date.UTC(1899, 11, 30) + serial * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

const today = () => new Date().toISOString().slice(0, 10);

function splitList(value, max, maxLen, label, row, issues) {
  const parts = String(value ?? '')
    .split(/[;|\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > max) {
    issues.push({ row, field: label, severity: 'warning', message: `More than ${max} ${label} — keeping the first ${max}.` });
    parts.length = max;
  }
  return parts.map((part) => part.slice(0, maxLen));
}

export function isXlsx(buffer) {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

/**
 * Parse + validate. Returns a plan; never touches the store.
 * knownSlugs: slugs the operator cannot shadow (built-in catalogue).
 * storedSlugs: slugs already imported (those rows become updates).
 */
export function buildImport(buffer, filename, knownSlugs, storedSlugs) {
  const issues = [];
  const fileErrors = [];
  let parsed;

  try {
    parsed = isXlsx(buffer)
      ? { type: 'xlsx', ...parseXlsx(buffer) }
      : { type: 'csv', ...parseCsv(buffer.toString('utf8')) };
  } catch (error) {
    fileErrors.push(error.message);
    return { ok: false, file: { name: filename, type: isXlsx(buffer) ? 'xlsx' : 'csv' }, issues, fileErrors, counts: {}, projects: [], preview: [] };
  }

  const rows = parsed.rows.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
  if (!rows.length) {
    fileErrors.push('The file contains no data rows.');
    return { ok: false, file: { name: filename, type: parsed.type }, issues, fileErrors, counts: {}, projects: [], preview: [] };
  }

  const header = rows[0];
  const columnMap = mapHeaders(header, issues);
  if (!columnMap.has(-1) && ![...columnMap.values()].includes('title')) {
    fileErrors.push('Missing required column "title". Download the template for the expected format.');
    return { ok: false, file: { name: filename, type: parsed.type, rows: rows.length - 1 }, issues, fileErrors, counts: {}, projects: [], preview: [] };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > IMPORT_MAX_ROWS) {
    fileErrors.push(`Too many rows (${dataRows.length}). The limit is ${IMPORT_MAX_ROWS} per import.`);
  }

  const seenSlugs = new Set();
  const projects = [];
  let blankRows = 0;

  dataRows.forEach((cells, position) => {
    const row = position + 2; /* 1-based, counting the header row */
    if (row - 1 > IMPORT_MAX_ROWS) return;
    const get = (field) => {
      for (const [index, value] of columnMap) if (value === field) return String(cells[index] ?? '').trim();
      return '';
    };
    let hasError = false;
    const fail = (field, message) => {
      issues.push({ row, field, severity: 'error', message });
      hasError = true;
    };
    const warn = (field, message) => issues.push({ row, field, severity: 'warning', message });

    const title = get('title');
    if (!title) fail('title', 'Title is required.');
    else if (title.length < 3 || title.length > 120) fail('title', 'Title must be 3–120 characters.');

    const summary = get('summary');
    if (!summary) fail('summary', 'Summary is required.');
    else if (summary.length < 20) fail('summary', 'Summary must be at least 20 characters.');
    else if (summary.length < 60) warn('summary', 'Summary is short — briefs read better above 60 characters.');
    if (summary.length > 1200) fail('summary', 'Summary must be at most 1,200 characters.');

    const sector = get('sector');
    if (!sector) fail('sector', 'Sector is required (it drives the showcase filters).');
    else if (sector.length > 80) fail('sector', 'Sector must be at most 80 characters.');

    const stage = get('stage');
    if (!stage) fail('stage', 'Stage is required (it drives the showcase filters).');
    else if (stage.length > 40) fail('stage', 'Stage must be at most 40 characters.');

    const geography = get('geography');
    if (!geography) fail('geography', 'Geography is required (it drives the showcase filters).');
    else if (geography.length > 80) fail('geography', 'Geography must be at most 80 characters.');

    const ticket = get('ticket');
    if (!ticket) fail('ticket', 'Ticket is required, e.g. US$500K or US$1.2M.');
    else if (ticket.length > 24 || !/\d/.test(ticket)) fail('ticket', 'Ticket must state an amount, e.g. US$500K.');
    else if (!/[\d.]+\s*(K|M)\b/i.test(ticket)) warn('ticket', 'Ticket without a K/M suffix cannot be bucketed in the size filter.');

    let slug = get('slug') ? slugify(get('slug')) : slugify(title);
    if (slug.length < 3) slug = slug.length ? `${slug}-project` : '';
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) fail('slug', `Slug "${slug}" is not usable (3–60 characters, letters/numbers/hyphens).`);
    else if (knownSlugs.has(slug)) fail('slug', `Slug "${slug}" is already used by a built-in project.`);
    else if (seenSlugs.has(slug)) fail('slug', `Duplicate slug "${slug}" inside this file.`);
    else seenSlugs.add(slug);

    const statusRaw = normaliseHeader(get('status'));
    let status = 'open';
    if (get('status')) {
      if (STATUS_ALIASES[statusRaw]) status = STATUS_ALIASES[statusRaw];
      else fail('status', `"${get('status')}" is not a status. Use open, published, draft, under review, paused or closed.`);
    }

    let visibility = 'registered';
    if (get('visibility')) {
      const v = normaliseHeader(get('visibility'));
      if (VISIBILITIES.has(v)) visibility = v;
      else fail('visibility', 'Visibility must be public, registered, invitation or hidden.');
      if (visibility === 'hidden') status = status === 'open' ? 'draft' : status;
      else if (visibility !== 'registered') {
        warn('visibility', 'Stored for later; the showcase currently treats every non-hidden project as registered-only.');
      }
    }

    const currency = (get('currency') || 'USD').toUpperCase().slice(0, 4);
    if (get('currency') && !/^[A-Z]{3}$/.test(currency)) warn('currency', 'Currency looks unusual — three letters expected (USD, JOD…).');

    let updated = today();
    if (get('updated')) {
      const raw = get('updated');
      const serial = excelSerialToIso(raw);
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) updated = raw;
      else if (serial) updated = serial;
      else warn('updated', 'Date not in YYYY-MM-DD format — using today.');
    }

    const link = get('link');
    if (link && !/^https?:\/\/\S+$/.test(link) && link.length <= 300) fail('link', 'Link must be a full http(s) URL.');

    const tags = splitList(get('tags'), 8, 30, 'tags', row, issues);
    const highlights = splitList(get('highlights'), 6, 200, 'highlights', row, issues);
    const story = splitList(get('story'), 6, 1200, 'story', row, issues);
    if (summary && story.length && story.join(' ').includes(summary)) warn('story', 'Story repeats the summary — consider distinct narrative paragraphs.');

    const tagline = get('tagline').slice(0, 160);
    if (!hasError) {
      projects.push({
        slug, title, tagline, summary, sector, stage, geography, ticket, currency,
        status, visibility, tags, link, highlights, story, updated,
      });
    } else {
      projects.push(null); /* keep row alignment for reporting */
    }
  });

  const valid = projects.filter(Boolean);
  const counts = {
    total: Math.min(dataRows.length, IMPORT_MAX_ROWS),
    blank: blankRows,
    valid: valid.length,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    wouldCreate: valid.filter((project) => !storedSlugs.has(project.slug)).length,
    wouldUpdate: valid.filter((project) => storedSlugs.has(project.slug)).length,
  };

  return {
    ok: fileErrors.length === 0 && counts.errors === 0 && counts.valid > 0,
    file: { name: filename, type: parsed.type, rows: dataRows.length },
    fileErrors,
    issues,
    counts,
    projects,
    preview: valid.slice(0, 5).map((project) => ({
      slug: project.slug,
      title: project.title,
      stage: project.stage,
      sector: project.sector,
      geography: project.geography,
      ticket: project.ticket,
      status: project.status,
      action: storedSlugs.has(project.slug) ? 'update' : 'create',
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Commit                                                              */
/* ------------------------------------------------------------------ */

export function applyImport(plan, batchId, now = new Date().toISOString()) {
  const created = [];
  const updated = [];
  const store = db();
  for (const project of plan.projects) {
    if (!project) continue;
    const fields = {
      title: project.title,
      tagline: project.tagline,
      summary: project.summary,
      sector: project.sector,
      stage: project.stage,
      geography: project.geography,
      ticket: project.ticket,
      currency: project.currency,
      status: project.status,
      visibility: project.visibility,
      tags: project.tags,
      link: project.link,
      highlights: project.highlights,
      story: project.story,
      updated: project.updated,
      importBatchId: batchId,
      importedAt: now,
      updatedAt: now,
      source: 'import',
      documents: [],
    };
    const existing = store.projects.find((item) => item.slug === project.slug);
    if (existing) {
      Object.assign(existing, fields);
      updated.push(project.slug);
    } else {
      store.projects.push({ slug: project.slug, ...fields });
      created.push(project.slug);
    }
  }
  return { created, updated };
}

/* ------------------------------------------------------------------ */
/* Template                                                            */
/* ------------------------------------------------------------------ */

export function templateCsv() {
  const header =
    'Title,Slug,Tagline,Summary,Sector,Stage,Geography,Ticket,Currency,Status,Visibility,Tags,Link,Highlights,Story,Updated';
  const example1 = [
    'Fjord Kitchens',
    'fjord-kitchens',
    'Modular kitchens for fast-growing city franchises',
    'Fjord designs, builds and installs modular kitchen pods for franchise food brands, cutting fit-out time from twelve weeks to nine days with a pre-certified utility spine and a per-unit subscription on maintenance.',
    'Foodservice · Hardware',
    'Seed',
    'Amman, Jordan',
    'US$750K',
    'USD',
    'open',
    'registered',
    'franchising; hardware; foodservice',
    'https://example.com/fjord',
    'Nine-day install versus a twelve-week industry baseline;Two anchor franchises signed;Unit economics break even at eleven installs a month',
    'Fjord began as a fit-out contractor for hotel groups.|The pod system is pre-certified, so city approvals take days, not months.|Revenue splits into install fees and a maintenance subscription.',
    '2026-10-20',
  ].map((cell) => `"${cell.replace(/"/g, '""')}"`);
  const example2 = [
    'Zahra Textiles',
    '',
    'Dead-stock fabric, remade into hotel linens',
    'Zahra collects dead-stock fabric from Jordanian and Turkish mills and remakes it into hotel-grade linens, selling to boutique hotels at a price parity with conventional supply while diverting textile waste from landfill.',
    'Circular manufacturing',
    'Pre-seed',
    'Amman, Jordan',
    'US$300K',
    'USD',
    'draft',
    '',
    'sustainability; textiles',
    '',
    'Three hotel LOIs;Waste stream secured to 2028',
    '',
    '',
  ].map((cell) => `"${cell.replace(/"/g, '""')}"`);
  return [header, ...[example1, example2].map((row) => row.join(','))].join('\r\n');
}
