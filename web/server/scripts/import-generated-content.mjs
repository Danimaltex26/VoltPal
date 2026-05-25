// Import script for Opus-generated content (questions + module content).
//
// Usage:
//   node scripts/import-generated-content.mjs questions <path/to/voltpal_<cert>_q.json>
//   node scripts/import-generated-content.mjs modules <path/to/voltpal_<cert>_modules.json>
//   node scripts/import-generated-content.mjs --dir <path/to/folder/>     # auto-detects files
//
// Default mode is DRY-RUN — validates + reports stats without touching the DB.
// Pass --apply to actually write to Supabase.
//
// Validations performed before any write:
//   - JSON shape matches the brief
//   - cert_level + module_number map to a real training_modules row
//   - standard_reference (questions) matches the approved-articles regex
//   - No duplicate question_text against existing bank
//   - No duplicate (module_id, section_number) for module content
//   - difficulty / section_type values are in their enum
//
// Anything flagged requires_sme_check=true is inserted with flagged_quality=true
// so the app can suppress it from production until the SME pass.

import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'voltpal' } }
)

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const dirIdx = args.indexOf('--dir')
const DIR = dirIdx >= 0 ? args[dirIdx + 1] : null

// ── Approved references (mirrors the briefs §6) ────────────────────────────
const APPROVED_REF_PATTERNS = [
  /^NEC \d+(\.\d+(\([^)]+\))*)*$/,
  /^NEC Article \d+$/,
  /^NEC Table \d+(\.\d+(\([^)]+\))*)*$/,
  /^NEC Chapter 9, Table \d+$/,
  /^NFPA 70E \d+(\.\d+(\([^)]+\))*)*$/,
  /^NFPA 70E Article \d+(\.\d+)*$/,
  /^NFPA 70E Table \d+(\.\d+(\([^)]+\))*)*$/,
  /^OSHA 29 CFR \d+(\.\d+)? Subpart [A-Z]+$/,
]

const VALID_DIFFICULTIES = new Set(['foundation', 'applied', 'analysis'])
const VALID_SECTION_TYPES = new Set([
  'overview', 'concept', 'code_reference',
  'worked_example', 'common_pitfalls', 'self_check',
])
const VALID_CERTS = new Set(['APPRENTICE', 'JOURNEYMAN', 'MASTER', 'NFPA_70E'])

function isApprovedRef(ref) {
  if (!ref) return true // null is fine
  return APPROVED_REF_PATTERNS.some((re) => re.test(ref))
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateQuestion(q, i, moduleMap) {
  const errs = []
  if (!VALID_CERTS.has(q.cert_level)) errs.push(`cert_level=${q.cert_level} not in approved set`)
  if (typeof q.module_number !== 'number') errs.push(`module_number missing/not a number`)
  const moduleKey = `${q.cert_level}:${q.module_number}`
  if (!moduleMap.has(moduleKey)) errs.push(`no module found for ${moduleKey}`)
  if (!q.question_text || q.question_text.length < 20) errs.push(`question_text too short or missing`)
  if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) errs.push(`missing one of option_a-d`)
  if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) errs.push(`correct_answer must be A/B/C/D`)
  if (!q.explanation || q.explanation.length < 40) errs.push(`explanation too short or missing`)
  if (q.difficulty && !VALID_DIFFICULTIES.has(q.difficulty)) errs.push(`difficulty=${q.difficulty} not in approved set`)
  if (q.standard_reference && !isApprovedRef(q.standard_reference)) errs.push(`standard_reference=${q.standard_reference} not in approved patterns`)
  if (!q.verification) errs.push(`verification field missing`)
  if (typeof q.requires_sme_check !== 'boolean') errs.push(`requires_sme_check missing or not boolean`)
  return errs
}

function validateSection(s, i, moduleMap) {
  const errs = []
  if (!VALID_CERTS.has(s.cert_level)) errs.push(`cert_level=${s.cert_level} not in approved set`)
  if (typeof s.module_number !== 'number') errs.push(`module_number missing/not a number`)
  const moduleKey = `${s.cert_level}:${s.module_number}`
  if (!moduleMap.has(moduleKey)) errs.push(`no module found for ${moduleKey}`)
  if (typeof s.section_number !== 'number' || s.section_number < 1 || s.section_number > 6) {
    errs.push(`section_number must be 1-6`)
  }
  if (!s.section_title) errs.push(`section_title missing`)
  if (!VALID_SECTION_TYPES.has(s.section_type)) errs.push(`section_type=${s.section_type} not in approved set`)
  if (!s.content_markdown || s.content_markdown.length < 80) errs.push(`content_markdown too short or missing`)
  if (!s.verification) errs.push(`verification field missing`)
  if (typeof s.requires_sme_check !== 'boolean') errs.push(`requires_sme_check missing or not boolean`)
  return errs
}

// ── Loaders ────────────────────────────────────────────────────────────────

async function loadModuleMap() {
  const { data, error } = await supabase
    .from('training_modules')
    .select('id, cert_level, module_number, title')
  if (error) throw error
  const map = new Map()
  for (const m of data) map.set(`${m.cert_level}:${m.module_number}`, m)
  return map
}

async function loadExistingQuestionTexts() {
  const { data, error } = await supabase
    .from('training_questions')
    .select('question_text')
  if (error) throw error
  return new Set(data.map((r) => r.question_text.trim().toLowerCase()))
}

async function loadExistingSections() {
  const { data, error } = await supabase
    .from('training_module_content')
    .select('module_id, section_number')
  // Tolerate the table not existing yet (pre-migration 052)
  if (error && /training_module_content/.test(error.message)) return new Set()
  if (error) throw error
  return new Set(data.map((r) => `${r.module_id}:${r.section_number}`))
}

// ── Importers ──────────────────────────────────────────────────────────────

async function importQuestions(items, moduleMap, existingTexts) {
  const valid = []
  const dupes = []
  const errs = []

  for (let i = 0; i < items.length; i++) {
    const q = items[i]
    if (q._meta) continue
    const errors = validateQuestion(q, i, moduleMap)
    if (errors.length) { errs.push({ i, errors, q: q.question_text?.slice(0, 80) }); continue }
    const norm = q.question_text.trim().toLowerCase()
    if (existingTexts.has(norm)) { dupes.push(q.question_text.slice(0, 80)); continue }
    existingTexts.add(norm)
    const module = moduleMap.get(`${q.cert_level}:${q.module_number}`)
    valid.push({
      module_id: module.id,
      cert_level: q.cert_level,
      topic: q.topic,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      standard_reference: q.standard_reference || null,
      difficulty: q.difficulty || 'applied',
      flagged_quality: q.requires_sme_check || false,
      is_dynamic: false,
    })
  }

  console.log(`\n  ✓ valid:       ${valid.length}`)
  console.log(`  - duplicates:  ${dupes.length}`)
  console.log(`  ✗ errors:      ${errs.length}`)
  console.log(`  ⚑ flagged for SME: ${valid.filter((q) => q.flagged_quality).length}`)

  if (errs.length > 0) {
    console.log(`\n  First 5 errors:`)
    for (const e of errs.slice(0, 5)) console.log(`    [${e.i}] ${e.errors.join('; ')} — ${e.q || '(no text)'}`)
  }

  if (!APPLY) {
    console.log(`\n  DRY-RUN — no DB writes. Pass --apply to insert.`)
    return
  }

  console.log(`\n  Inserting ${valid.length} questions...`)
  // Insert in batches of 100 to stay under PostgREST payload limits
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100)
    const { error } = await supabase.from('training_questions').insert(batch)
    if (error) { console.error(`  ❌ batch ${i / 100} failed:`, error.message); return }
    process.stdout.write('.')
  }
  console.log(`\n  ✓ Inserted ${valid.length} questions.`)
}

async function importSections(items, moduleMap, existingSections) {
  const valid = []
  const dupes = []
  const errs = []

  for (let i = 0; i < items.length; i++) {
    const s = items[i]
    if (s._meta) continue
    const errors = validateSection(s, i, moduleMap)
    if (errors.length) { errs.push({ i, errors, s: s.section_title }); continue }
    const module = moduleMap.get(`${s.cert_level}:${s.module_number}`)
    const key = `${module.id}:${s.section_number}`
    if (existingSections.has(key)) { dupes.push(`${s.cert_level} M${s.module_number} §${s.section_number}`); continue }
    existingSections.add(key)
    valid.push({
      module_id: module.id,
      section_number: s.section_number,
      section_title: s.section_title,
      section_type: s.section_type,
      content_markdown: s.content_markdown,
      estimated_read_minutes: s.estimated_read_minutes || null,
      verification_notes: s.verification,
      requires_sme_check: s.requires_sme_check || false,
      flagged_quality: s.requires_sme_check || false,
      generation_source: `opus_${new Date().toISOString().slice(0, 10)}`,
    })
  }

  console.log(`\n  ✓ valid:       ${valid.length}`)
  console.log(`  - duplicates:  ${dupes.length}`)
  console.log(`  ✗ errors:      ${errs.length}`)
  console.log(`  ⚑ flagged for SME: ${valid.filter((s) => s.flagged_quality).length}`)

  if (errs.length > 0) {
    console.log(`\n  First 5 errors:`)
    for (const e of errs.slice(0, 5)) console.log(`    [${e.i}] ${e.errors.join('; ')} — ${e.s || '(no title)'}`)
  }

  if (!APPLY) {
    console.log(`\n  DRY-RUN — no DB writes. Pass --apply to insert.`)
    return
  }

  console.log(`\n  Inserting ${valid.length} module sections...`)
  for (let i = 0; i < valid.length; i += 50) {
    const batch = valid.slice(i, i + 50)
    const { error } = await supabase.from('training_module_content').insert(batch)
    if (error) { console.error(`  ❌ batch ${i / 50} failed:`, error.message); return }
    process.stdout.write('.')
  }
  console.log(`\n  ✓ Inserted ${valid.length} sections.`)
}

// ── Main ───────────────────────────────────────────────────────────────────

async function processFile(filepath) {
  const isQuestion = /_q\.json$/i.test(filepath) || /question/i.test(filepath)
  const isModule = /_modules\.json$/i.test(filepath) || /module/i.test(filepath)
  if (!isQuestion && !isModule) {
    console.log(`  ⚠️  Could not infer file type from name: ${filepath} — skipping`)
    return
  }
  const raw = await readFile(filepath, 'utf8')
  let items
  try { items = JSON.parse(raw) } catch (e) {
    console.error(`  ❌ Invalid JSON in ${filepath}: ${e.message}`); return
  }
  if (!Array.isArray(items)) { console.error(`  ❌ Expected top-level array in ${filepath}`); return }

  console.log(`\n══ ${path.basename(filepath)} (${items.length} items)`)
  const meta = items.find((x) => x._meta)
  if (meta) console.log(`  meta: ${meta._meta}`)

  const moduleMap = await loadModuleMap()
  if (isQuestion) {
    const existingTexts = await loadExistingQuestionTexts()
    await importQuestions(items, moduleMap, existingTexts)
  } else {
    const existingSections = await loadExistingSections()
    await importSections(items, moduleMap, existingSections)
  }
}

async function main() {
  console.log(`\nOpus content importer (mode: ${APPLY ? 'APPLY' : 'DRY-RUN'})`)

  if (DIR) {
    const files = (await readdir(DIR)).filter((f) => f.endsWith('.json')).map((f) => path.join(DIR, f))
    if (files.length === 0) { console.log(`No .json files in ${DIR}`); return }
    for (const f of files) await processFile(f)
  } else {
    // Positional: <type> <filepath>
    const type = args[0]
    const filepath = args[1]
    if (!type || !filepath || !['questions', 'modules'].includes(type)) {
      console.log(`Usage:`)
      console.log(`  node scripts/import-generated-content.mjs questions <file.json>`)
      console.log(`  node scripts/import-generated-content.mjs modules <file.json>`)
      console.log(`  node scripts/import-generated-content.mjs --dir <folder>`)
      console.log(`Add --apply to actually write to Supabase (default is dry-run).`)
      process.exit(1)
    }
    await processFile(filepath)
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
