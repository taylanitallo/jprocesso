#!/usr/bin/env node
const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
}

// 1. Bump de versão (lê, incrementa, grava client/package.json)
run('node scripts/bump-version.js')

// 2. Lê a nova versão (require cachearia a antiga, então lemos o arquivo direto)
const pkgPath = path.join(__dirname, '..', 'client', 'package.json')
const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

// 3. Commit + push
run('git add client/package.json')
run(`git commit -m "chore: v${version}"`)
run('git push')

console.log(`\nDeploy iniciado — versao ${version} enviada para o Railway.`)
