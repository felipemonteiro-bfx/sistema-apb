#!/usr/bin/env node
/**
 * Sincroniza variáveis VITE_* do .env.local para o Vercel.
 * Uso: node scripts/vercel-env.cjs
 * Requer: vercel login e projeto linkado.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Arquivo .env.local não encontrado.');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const vars = [];
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (key.startsWith('VITE_') && value) vars.push([key, value]);
}

if (vars.length === 0) {
  console.log('Nenhuma variável VITE_* encontrada em .env.local');
  process.exit(0);
}

console.log(`Enviando ${vars.length} variáveis para Vercel (Production)...`);
for (const [key, value] of vars) {
  try {
    execSync(`vercel env add ${key} production`, {
      input: value,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    console.log(`  ✓ ${key}`);
  } catch (e) {
    if (e.stderr && e.stderr.includes('already exists')) {
      console.log(`  → ${key} (já existe)`);
    } else {
      console.error(`  ✗ ${key}:`, e.message || (e.stderr || '').slice(0, 80));
    }
  }
}
console.log('\nFeito! Execute "vercel --prod" para fazer o deploy.');
