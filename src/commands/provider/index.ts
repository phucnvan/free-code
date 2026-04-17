import type { Command } from '../../commands.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'

const provider = {
  type: 'local-jsx',
  name: 'provider',
  description: 'Switch quickly between Claude and Codex',
  argumentHint: '[claude|codex|current]',
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./provider.js'),
} satisfies Command

export default provider
