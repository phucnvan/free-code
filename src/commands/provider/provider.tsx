import * as React from 'react'
import type { LocalJSXCommandContext } from '../../commands.js'
import { Select } from '../../components/CustomSelect/index.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import {
  getCodexOAuthTokens,
  isCodexSubscriber,
} from '../../utils/auth.js'
import { saveGlobalConfig } from '../../utils/config.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { stripSignatureBlocks } from '../../utils/messages.js'
import {
  getAPIProvider,
  getSavedProviderPreference,
  type SwitchableAPIProvider,
} from '../../utils/model/providers.js'
import { isCodexModel } from '../../services/api/codex-fetch-adapter.js'

type ProviderValue = 'claude' | 'codex'

function renderProviderName(provider: SwitchableAPIProvider): string {
  return provider === 'openai' ? 'Codex' : 'Claude'
}

function getThirdPartyEnvOverride():
  | { provider: 'bedrock' | 'vertex' | 'foundry'; envVar: string }
  | null {
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)) {
    return { provider: 'bedrock', envVar: 'CLAUDE_CODE_USE_BEDROCK' }
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)) {
    return { provider: 'vertex', envVar: 'CLAUDE_CODE_USE_VERTEX' }
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)) {
    return { provider: 'foundry', envVar: 'CLAUDE_CODE_USE_FOUNDRY' }
  }
  return null
}

function normalizeProviderArg(
  args: string,
): ProviderValue | 'current' | 'invalid' | 'picker' {
  const normalized = args.trim().toLowerCase()
  if (!normalized) return 'picker'
  if (['current', 'status'].includes(normalized)) return 'current'
  if (['claude', 'anthropic', 'firstparty', 'first-party'].includes(normalized)) {
    return 'claude'
  }
  if (['codex', 'openai'].includes(normalized)) return 'codex'
  return 'invalid'
}

function isCodexModelSetting(model: string | null | undefined): boolean {
  return typeof model === 'string' && isCodexModel(model)
}

function buildStatusMessage(): string {
  const selectedProvider = getSavedProviderPreference()
  const effectiveProvider = getAPIProvider()
  const hasCodexToken = !!getCodexOAuthTokens()?.accessToken
  const thirdPartyOverride = getThirdPartyEnvOverride()
  const activeBackend = thirdPartyOverride
    ? thirdPartyOverride.provider
    : effectiveProvider === 'openai' && hasCodexToken
      ? 'Codex'
      : 'Claude'

  const lines = [
    `Saved provider preference: ${renderProviderName(selectedProvider)}`,
    `Backend currently usable in this session: ${activeBackend}`,
  ]

  if (thirdPartyOverride) {
    lines.push(
      `Locked by ${thirdPartyOverride.envVar}=1, so /provider cannot override ${thirdPartyOverride.provider} in this shell.`,
    )
    return lines.join('\n')
  }

  if (selectedProvider === 'openai') {
    lines.push(
      hasCodexToken
        ? 'Codex login is available, so requests can use the Codex backend.'
        : 'No Codex login is stored yet. Run /login and choose OpenAI Codex account before Codex can be used.',
    )
  } else {
    lines.push(
      isCodexSubscriber()
        ? 'Codex tokens are still stored locally. Switching back to Codex later will not require logging in again unless the token expires.'
        : 'Claude mode is active.',
    )
  }

  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)) {
    lines.push(
      'CLAUDE_CODE_USE_OPENAI=1 is active in this CLI process. If that env var is also being exported by your shell, future launches from that shell may continue to prefer Codex until it is unset.',
    )
  }

  return lines.join('\n')
}

function applyProviderSelection(
  provider: SwitchableAPIProvider,
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
): void {
  const hadOpenAIEnvOverride = isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)
  const thirdPartyOverride = getThirdPartyEnvOverride()
  if (thirdPartyOverride) {
    onDone(
      `Provider switch is unavailable while ${thirdPartyOverride.envVar}=1 is set. Remove that env var and restart free-code if you want to use Claude or Codex instead.`,
      { display: 'system' },
    )
    return
  }

  saveGlobalConfig(current => {
    if (current.preferredProvider === provider) {
      return current
    }
    return {
      ...current,
      preferredProvider: provider,
    }
  })

  if (provider === 'openai') {
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
  } else {
    delete process.env.CLAUDE_CODE_USE_OPENAI
  }

  context.onChangeAPIKey()
  context.setMessages(stripSignatureBlocks)
  context.setAppState(prev => ({
    ...prev,
    mainLoopModel:
      provider === 'firstParty' && isCodexModelSetting(prev.mainLoopModel)
        ? null
        : prev.mainLoopModel,
    mainLoopModelForSession:
      provider === 'firstParty' &&
      isCodexModelSetting(prev.mainLoopModelForSession)
        ? null
        : prev.mainLoopModelForSession,
    authVersion: prev.authVersion + 1,
  }))

  const hasCodexToken = !!getCodexOAuthTokens()?.accessToken
  const message =
    provider === 'openai'
      ? hasCodexToken
        ? 'Saved provider preference as Codex. This session will now prefer the Codex backend.'
        : 'Saved provider preference as Codex, but no Codex login is stored yet. Run /login and choose OpenAI Codex account before requests can use Codex.'
      : 'Saved provider preference as Claude.'

  const suffix =
    provider === 'firstParty' && hadOpenAIEnvOverride
      ? ' CLAUDE_CODE_USE_OPENAI=1 had been active in this CLI process. If that env var is also being exported by your shell, future launches from that shell may continue to prefer Codex until it is unset.'
      : ''

  onDone(message + suffix, { display: 'system' })
}

function ProviderPicker({
  onDone,
  context,
}: {
  onDone: LocalJSXCommandOnDone
  context: LocalJSXCommandContext
}): React.ReactNode {
  const selectedProvider = getSavedProviderPreference()
  const hasCodexToken = !!getCodexOAuthTokens()?.accessToken

  return (
    <Dialog
      title="Switch provider"
      subtitle={`${renderProviderName(selectedProvider)} is currently saved as the default provider`}
      color="permission"
      onCancel={() =>
        onDone('Provider switch dismissed', {
          display: 'system',
        })
      }
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          Choose which provider free-code should prefer when no explicit
          provider env var is set.
        </Text>
        {!hasCodexToken && (
          <Text dimColor>
            Codex mode also needs a Codex login. If you choose Codex without a
            stored token, free-code will keep using Claude until you run
            /login.
          </Text>
        )}
      </Box>
      <Select
        defaultValue={
          selectedProvider === 'openai' ? ('codex' as const) : ('claude' as const)
        }
        defaultFocusValue={
          selectedProvider === 'openai' ? ('codex' as const) : ('claude' as const)
        }
        onChange={(value: ProviderValue) =>
          applyProviderSelection(
            value === 'codex' ? 'openai' : 'firstParty',
            onDone,
            context,
          )
        }
        options={[
          {
            value: 'claude' as const,
            label: 'Claude',
            description: 'Use the regular Anthropic / Claude backend.',
          },
          {
            value: 'codex' as const,
            label: 'Codex',
            description: hasCodexToken
              ? 'Use the OpenAI Codex backend with your stored Codex login.'
              : 'Prefer Codex after you log in with /login and choose OpenAI Codex account.',
          },
        ]}
      />
    </Dialog>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> {
  switch (normalizeProviderArg(args)) {
    case 'current':
      onDone(buildStatusMessage(), { display: 'system' })
      return null
    case 'claude':
      applyProviderSelection('firstParty', onDone, context)
      return null
    case 'codex':
      applyProviderSelection('openai', onDone, context)
      return null
    case 'invalid':
      onDone('Usage: /provider [claude|codex|current]', {
        display: 'system',
      })
      return null
    case 'picker':
    default:
      return <ProviderPicker onDone={onDone} context={context} />
  }
}
