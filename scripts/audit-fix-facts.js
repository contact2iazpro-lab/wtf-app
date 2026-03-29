#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znoceotakhynqcqhpwgz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

// ─── helpers ────────────────────────────────────────────────────────────────

function truncateAtSentence(text, maxLen) {
  if (text.length <= maxLen) return text;
  // find last sentence-ending punctuation before maxLen
  const slice = text.slice(0, maxLen);
  const lastPeriod = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
  );
  if (lastPeriod > maxLen * 0.5) {
    return text.slice(0, lastPeriod + 1).trim();
  }
  // fall back to truncating at last word
  const lastSpace = slice.lastIndexOf(' ');
  return text.slice(0, lastSpace > 0 ? lastSpace : maxLen).trim();
}

function truncateAtWord(text, maxLen) {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.5 ? text.slice(0, lastSpace) : slice).trim();
}

/**
 * Normalize a "definition" category question.
 * Target format: "Qu'est-ce que [term] ?"
 *
 * Strategy: extract the term (noun phrase) and reformat.
 * Examples:
 *   "Qu'est-ce que la dendrochronologie permet de faire ?" → "Qu'est-ce que la dendrochronologie ?"
 *   "Qu'est-ce que le phénomène de liquéfaction des sols ?" → already OK ✓
 *   "Qu'est-ce qu'un écosystème ?" → already OK ✓
 */
function normalizeDefinitionQuestion(question) {
  // Match the leading pattern
  const prefixPatterns = [
    /^(Qu['']est-ce que )(.+?)(\s*\?)\s*$/i,
    /^(Qu['']est-ce qu[''])(.+?)(\s*\?)\s*$/i,
  ];

  for (const pattern of prefixPatterns) {
    const m = question.match(pattern);
    if (!m) continue;

    const prefix = m[1];   // "Qu'est-ce que " or "Qu'est-ce qu'"
    const body = m[2];     // everything between prefix and "?"

    // Extract just the noun phrase (term) from the body
    // Noun phrase ends when a verb or connector word appears
    // Connectors that signal "extra clause": permet, est, sert, désigne, signifie, représente,
    //   consiste, fait, peut, a, ont, se, sont, désignent, décrit, indique
    const verbPattern = /\s+(permet|est|sert|désigne|signifie|représente|consiste|fait|peut|ont|se\s|sont|décrit|indique|qualifie|caractérise|mesure|étudie|analyse|détermine|concerne|implique|comprend|inclut|désignent|correspond|vise|provoque|cause|engendre|permet\s+de|est\s+utilisé|est\s+défini|est\s+caractérisé)\b/i;

    const verbMatch = body.search(verbPattern);
    if (verbMatch === -1) {
      // No verb found → body is already just the term, format is fine
      return null; // no change needed
    }

    // Extract just the term part before the verb
    const term = body.slice(0, verbMatch).trim();

    if (!term || term.length < 2) return null; // can't determine term

    const newQuestion = `${prefix}${term} ?`;

    // Only return if actually different
    return newQuestion !== question ? newQuestion : null;
  }

  return null; // no change needed
}

// ─── fetch facts ────────────────────────────────────────────────────────────

async function fetchAllFacts() {
  const allFacts = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/facts?select=*&order=id&offset=${offset}&limit=${batchSize}`;
    const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Fetch failed: ${res.status} ${err}`);
    }
    const batch = await res.json();
    allFacts.push(...batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  return allFacts;
}

// ─── patch a fact ────────────────────────────────────────────────────────────

async function patchFact(id, changes) {
  const url = `${SUPABASE_URL}/rest/v1/facts?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(changes),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH failed for id=${id}: ${res.status} ${err}`);
  }
  return true;
}

// ─── main audit ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SUPABASE FACTS AUDIT & FIX ===\n');
  console.log('Fetching all facts...');

  const facts = await fetchAllFacts();
  console.log(`Fetched ${facts.length} facts total.\n`);

  const report = {
    total: facts.length,
    violations: [],
    fixes: [],
    errors: [],
    skipped: [],
  };

  for (const fact of facts) {
    const changes = {};
    const factViolations = [];

    // ── question > 100 ──────────────────────────────────────────────────────
    if (fact.question && fact.question.length > 100) {
      const fixed = truncateAtWord(fact.question, 100);
      factViolations.push({ field: 'question', issue: `length ${fact.question.length} > 100`, before: fact.question, after: fixed });
      changes.question = fixed;
    }

    // ── definition category question normalization ──────────────────────────
    if (fact.category === 'definition') {
      const q = changes.question || fact.question;
      if (q) {
        const normalized = normalizeDefinitionQuestion(q);
        if (normalized) {
          factViolations.push({ field: 'question', issue: 'definition format: extra clause after term', before: q, after: normalized });
          changes.question = normalized;
        }
      }
    }

    // ── hint1 > 20 ───────────────────────────────────────────────────────────
    if (fact.hint1 && fact.hint1.length > 20) {
      const fixed = truncateAtWord(fact.hint1, 20);
      factViolations.push({ field: 'hint1', issue: `length ${fact.hint1.length} > 20`, before: fact.hint1, after: fixed });
      changes.hint1 = fixed;
    }

    // ── hint2 > 20 ───────────────────────────────────────────────────────────
    if (fact.hint2 && fact.hint2.length > 20) {
      const fixed = truncateAtWord(fact.hint2, 20);
      factViolations.push({ field: 'hint2', issue: `length ${fact.hint2.length} > 20`, before: fact.hint2, after: fixed });
      changes.hint2 = fixed;
    }

    // ── short_answer > 50 ───────────────────────────────────────────────────
    if (fact.short_answer && fact.short_answer.length > 50) {
      const fixed = truncateAtWord(fact.short_answer, 50);
      factViolations.push({ field: 'short_answer', issue: `length ${fact.short_answer.length} > 50`, before: fact.short_answer, after: fixed });
      changes.short_answer = fixed;
    }

    // ── options > 50 ────────────────────────────────────────────────────────
    if (Array.isArray(fact.options)) {
      const fixedOptions = fact.options.map(opt => {
        if (typeof opt === 'string' && opt.length > 50) {
          return truncateAtWord(opt, 50);
        }
        return opt;
      });

      const hasOptionViolation = fact.options.some((opt, i) => fixedOptions[i] !== opt);
      if (hasOptionViolation) {
        fact.options.forEach((opt, i) => {
          if (typeof opt === 'string' && opt.length > 50) {
            factViolations.push({ field: `options[${i}]`, issue: `length ${opt.length} > 50`, before: opt, after: fixedOptions[i] });
          }
        });
        changes.options = fixedOptions;
      }
    }

    // ── explanation < 100 ───────────────────────────────────────────────────
    if (fact.explanation && fact.explanation.length < 100) {
      // Only report, don't fix
      report.skipped.push({
        id: fact.id,
        field: 'explanation',
        issue: `length ${fact.explanation.length} < 100 (too short, not auto-fixed)`,
        value: fact.explanation,
      });
    }

    // ── explanation > 300 ───────────────────────────────────────────────────
    if (fact.explanation && fact.explanation.length > 300) {
      const fixed = truncateAtSentence(fact.explanation, 300);
      factViolations.push({ field: 'explanation', issue: `length ${fact.explanation.length} > 300`, before: fact.explanation, after: fixed });
      changes.explanation = fixed;
    }

    // ── collect violations ──────────────────────────────────────────────────
    if (factViolations.length > 0) {
      report.violations.push({
        id: fact.id,
        category: fact.category,
        published: fact.published,
        violations: factViolations,
        changes,
      });
    }
  }

  console.log(`Found ${report.violations.length} facts with violations.\n`);

  // ── apply fixes ─────────────────────────────────────────────────────────
  let fixedCount = 0;
  for (const item of report.violations) {
    if (Object.keys(item.changes).length === 0) continue;
    try {
      await patchFact(item.id, item.changes);
      report.fixes.push({ id: item.id, fields: Object.keys(item.changes) });
      fixedCount++;
    } catch (err) {
      report.errors.push({ id: item.id, error: err.message });
      console.error(`  ERROR patching ${item.id}: ${err.message}`);
    }
  }

  // ── print report ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT REPORT');
  console.log('='.repeat(70));
  console.log(`Total facts scanned:    ${report.total}`);
  console.log(`Facts with violations:  ${report.violations.length}`);
  console.log(`Facts successfully fixed: ${fixedCount}`);
  console.log(`Errors during patch:    ${report.errors.length}`);
  console.log(`Explanation too short (skipped, report only): ${report.skipped.length}`);

  if (report.violations.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('DETAILED VIOLATIONS & FIXES:');
    console.log('-'.repeat(70));

    for (const item of report.violations) {
      const status = report.errors.find(e => e.id === item.id) ? '✗ ERROR' : '✓ FIXED';
      console.log(`\n[${status}] ID: ${item.id} | category: ${item.category} | published: ${item.published}`);
      for (const v of item.violations) {
        console.log(`  Field: ${v.field}`);
        console.log(`  Issue: ${v.issue}`);
        console.log(`  Before: ${v.before}`);
        console.log(`  After:  ${v.after}`);
      }
    }
  }

  if (report.skipped.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('EXPLANATION TOO SHORT (not auto-fixed):');
    console.log('-'.repeat(70));
    for (const s of report.skipped) {
      console.log(`  ID: ${s.id} | ${s.issue}`);
      console.log(`  Value: "${s.value}"`);
    }
  }

  if (report.errors.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('ERRORS:');
    console.log('-'.repeat(70));
    for (const e of report.errors) {
      console.log(`  ID: ${e.id} | ${e.error}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('DONE');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
