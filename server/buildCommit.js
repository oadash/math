import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export function readBuildCommitFile() {
  try {
    return readFileSync(join(repoRoot, 'BUILD_COMMIT.txt'), 'utf8').trim()
  } catch {
    return null
  }
}
