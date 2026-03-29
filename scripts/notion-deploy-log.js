#!/usr/bin/env node
/**
 * notion-deploy-log.js
 * Appends a deploy entry to the Notion page "État Dev — Claude Code"
 * after each git push.
 *
 * Required env vars (loaded from .env.local or process.env):
 *   NOTION_TOKEN     – secret_xxx Notion integration token
 *   NOTION_PAGE_ID   – ID of the target Notion page
 *   NOTION_ENABLED   – must be "true" to activate
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── load .env.local (no external deps) ───────────────────────────────────────
function loadDotEnvLocal() {
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local absent — rely on process.env already populated
  }
}

// ── run a shell command, return stdout or empty string ────────────────────────
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadDotEnvLocal();

  // Guard: only run when explicitly enabled
  if (process.env.NOTION_ENABLED !== 'true') {
    console.log('[notion-deploy-log] NOTION_ENABLED != "true" → skipped');
    return;
  }

  const token  = process.env.NOTION_TOKEN;
  const pageId = process.env.NOTION_PAGE_ID;

  if (!token || !pageId) {
    console.warn('[notion-deploy-log] NOTION_TOKEN or NOTION_PAGE_ID missing → skipped');
    return;
  }

  // ── gather commit info ─────────────────────────────────────────────────────
  const hash     = run('git rev-parse --short HEAD') || 'unknown';
  const message  = run('git log -1 --pretty=%B').replace(/\n+$/, '') || '(no message)';
  const rawFiles = run('git diff HEAD~1 --name-only');
  const dateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const appUrl   = 'https://wtf-app.vercel.app';

  const fileList = rawFiles
    ? rawFiles.split('\n').filter(Boolean)
    : ['(aucun fichier détecté)'];

  // ── build Notion blocks ────────────────────────────────────────────────────
  const headingText = `🚀 Deploy ${dateTime} — ${hash}`;

  function paragraph(text) {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  const blocks = [
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: headingText } }],
      },
    },
    paragraph(`Message : ${message}`),
    paragraph('Fichiers modifiés :'),
    ...fileList.map(f => paragraph(`• ${f}`)),
    paragraph(`URL : ${appUrl}`),
    { object: 'block', type: 'divider', divider: {} },
  ];

  // ── send to Notion API ─────────────────────────────────────────────────────
  const apiUrl = `https://api.notion.com/v1/blocks/${pageId}/children`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ children: blocks }),
    });

    if (response.ok) {
      console.log(`[notion-deploy-log] ✅ Deploy log ajouté dans Notion — ${hash} @ ${dateTime}`);
    } else {
      const errBody = await response.text();
      console.error(`[notion-deploy-log] ❌ Notion API ${response.status}: ${errBody}`);
    }
  } catch (err) {
    // Never block the push — catch all network/runtime errors
    console.error(`[notion-deploy-log] ❌ Erreur réseau: ${err.message}`);
  }
}

main().catch(err => {
  // Safety net — must never propagate an exit code that blocks the push
  console.error(`[notion-deploy-log] ❌ Fatal: ${err.message}`);
});
