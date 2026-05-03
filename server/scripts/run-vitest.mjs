#!/usr/bin/env node
/**
 * Запускает vitest run; лишние argv от `npm test …` не передаются в Vitest
 * (иначе они становятся фильтром имён и тесты «не находятся»).
 */
import { spawn } from 'child_process'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const serverRoot = join(scriptDir, '..')

const require = createRequire(join(serverRoot, 'package.json'))
const vitestDir = dirname(require.resolve('vitest/package.json'))
const vitestMjs = join(vitestDir, 'vitest.mjs')

const child = spawn(process.execPath, [vitestMjs, 'run'], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 0)
})
