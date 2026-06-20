#!/usr/bin/env node
/**
 * Incrementa o patch da versão em client/package.json
 * e imprime a nova versão no stdout.
 *
 * Uso:  node scripts/bump-version.js
 *
 * Estratégia de bump:
 *   - Enquanto PATCH < 9  →  só incrementa PATCH   (1.0.0 → 1.0.9)
 *   - Quando  PATCH = 9   →  zera PATCH, incrementa MINOR  (1.0.9 → 1.1.0)
 *   - Quando  MINOR = 9   →  zera MINOR e PATCH, incrementa MAJOR  (1.9.9 → 2.0.0)
 */
const fs   = require('fs')
const path = require('path')

const pkgPath = path.join(__dirname, '..', 'client', 'package.json')
const pkg     = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

let [major, minor, patch] = pkg.version.split('.').map(Number)

if (patch < 9) {
  patch++
} else if (minor < 9) {
  patch = 0
  minor++
} else {
  patch = 0
  minor = 0
  major++
}

pkg.version = `${major}.${minor}.${patch}`
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

process.stdout.write(pkg.version + '\n')
