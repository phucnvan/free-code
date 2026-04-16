<p align="center">
  <img src="assets/screenshot.png" alt="free-code" width="720" />
</p>

<h1 align="center">free-code</h1>

<p align="center">
  <strong>The free build of Claude Code.</strong><br>
  All telemetry stripped. All guardrails removed. All experimental features unlocked.<br>
  One binary, zero callbacks home.
</p>

<p align="center">
  <a href="#quick-install"><img src="https://img.shields.io/badge/install-one--liner-blue?style=flat-square" alt="Install" /></a>
  <a href="https://github.com/phucnvan/free-code/stargazers"><img src="https://img.shields.io/github/stars/phucnvan/free-code?style=flat-square" alt="Stars" /></a>
  <a href="https://github.com/phucnvan/free-code/issues"><img src="https://img.shields.io/github/issues/phucnvan/free-code?style=flat-square" alt="Issues" /></a>
  <a href="https://github.com/phucnvan/free-code/blob/main/FEATURES.md"><img src="https://img.shields.io/badge/features-88%20flags-orange?style=flat-square" alt="Feature Flags" /></a>
  <a href="#ipfs-mirror"><img src="https://img.shields.io/badge/IPFS-mirrored-teal?style=flat-square" alt="IPFS" /></a>
</p>

---

## Quick Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/phucnvan/free-code/main/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/phucnvan/free-code/main/install.ps1 | iex
```

The installers:

- check for `git`
- install Bun if needed
- clone `https://github.com/phucnvan/free-code.git`
- run `bun install`
- build the full dev binary with `bun run build:dev:full`
- create a `free-code` launcher on your PATH

On macOS/Linux, the launcher is symlinked into `~/.local/bin/free-code`.
On Windows, the installer creates `free-code.cmd` and `free-code.ps1` in `%USERPROFILE%\.local\bin`.

Then run `free-code` and use the `/login` command to authenticate with your preferred model provider.

### Side-by-side install with Claude Code

`free-code` uses the same default config directory as Claude Code upstream: `~/.claude`.
If you want both installed side by side without sharing auth, sessions, plugins, and settings, run `free-code` with a separate config dir:

```bash
export CLAUDE_CONFIG_DIR="$HOME/.free-code"
free-code
```

```powershell
$env:CLAUDE_CONFIG_DIR="$HOME\\.free-code"
free-code
```

---

## Table of Contents

- [What is this](#what-is-this)
- [Model Providers](#model-providers)
- [Quick Install](#quick-install)
- [Requirements](#requirements)
- [Build](#build)
- [Usage](#usage)
- [Experimental Features](#experimental-features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [IPFS Mirror](#ipfs-mirror)
- [Contributing](#contributing)
- [License](#license)

---

## What is this

A clean, buildable fork of Anthropic's [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI -- the terminal-native AI coding agent. The upstream source became publicly available on March 31, 2026 through a source map exposure in the npm distribution.

This fork applies three categories of changes on top of that snapshot:

### Telemetry removed

The upstream binary phones home through OpenTelemetry/gRPC, GrowthBook analytics, Sentry error reporting, and custom event logging. In this build:

- All outbound telemetry endpoints are dead-code-eliminated or stubbed
- GrowthBook feature flag evaluation still works locally (needed for runtime feature gates) but does not report back
- No crash reports, no usage analytics, no session fingerprinting

### Security-prompt guardrails removed

Anthropic injects system-level instructions into every conversation that constrain Claude's behavior beyond what the model itself enforces. These include hardcoded refusal patterns, injected "cyber risk" instruction blocks, and managed-settings security overlays pushed from Anthropic's servers.

This build strips those injections. The model's own safety training still applies -- this just removes the extra layer of prompt-level restrictions that the CLI wraps around it.

### Experimental features unlocked

Claude Code ships with 88 feature flags gated behind `bun:bundle` compile-time switches. Most are disabled in the public npm release. This build unlocks all 54 flags that compile cleanly. See [Experimental Features](#experimental-features) below, or refer to [FEATURES.md](FEATURES.md) for the full audit.

---

## Model Providers

free-code supports **five API providers** out of the box. Set the corresponding environment variable to switch providers -- no code changes needed.

### Anthropic (Direct API) -- Default

Use Anthropic's first-party API directly.

| Model | ID |
|---|---|
| Claude Opus 4.6 | `claude-opus-4-6` |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Haiku 4.5 | `claude-haiku-4-5` |

### OpenAI Codex

Use OpenAI's Codex models for code generation. Requires a Codex subscription.

| Model | ID |
|---|---|
| GPT-5.3 Codex (recommended) | `gpt-5.3-codex` |
| GPT-5.4 | `gpt-5.4` |
| GPT-5.4 Mini | `gpt-5.4-mini` |

```bash
export CLAUDE_CODE_USE_OPENAI=1
free-code
```

### AWS Bedrock

Route requests through your AWS account via Amazon Bedrock.

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION="us-east-1"   # or AWS_DEFAULT_REGION
free-code
```

Uses your standard AWS credentials (environment variables, `~/.aws/config`, or IAM role). Models are mapped to Bedrock ARN format automatically (e.g., `us.anthropic.claude-opus-4-6-v1`).

| Variable | Purpose |
|---|---|
| `CLAUDE_CODE_USE_BEDROCK` | Enable Bedrock provider |
| `AWS_REGION` / `AWS_DEFAULT_REGION` | AWS region (default: `us-east-1`) |
| `ANTHROPIC_BEDROCK_BASE_URL` | Custom Bedrock endpoint |
| `AWS_BEARER_TOKEN_BEDROCK` | Bearer token auth |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH` | Skip auth (testing) |

### Google Cloud Vertex AI

Route requests through your GCP project via Vertex AI.

```bash
export CLAUDE_CODE_USE_VERTEX=1
free-code
```

Uses Google Cloud Application Default Credentials (`gcloud auth application-default login`). Models are mapped to Vertex format automatically (e.g., `claude-opus-4-6@latest`).

### Anthropic Foundry

Use Anthropic Foundry for dedicated deployments.

```bash
export CLAUDE_CODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_API_KEY="..."
free-code
```

Supports custom deployment IDs as model names.

### Provider Selection Summary

| Provider | Env Variable | Auth Method |
|---|---|---|
| Anthropic (default) | -- | `ANTHROPIC_API_KEY` or OAuth |
| OpenAI Codex | `CLAUDE_CODE_USE_OPENAI=1` | OAuth via OpenAI |
| AWS Bedrock | `CLAUDE_CODE_USE_BEDROCK=1` | AWS credentials |
| Google Vertex AI | `CLAUDE_CODE_USE_VERTEX=1` | `gcloud` ADC |
| Anthropic Foundry | `CLAUDE_CODE_USE_FOUNDRY=1` | `ANTHROPIC_FOUNDRY_API_KEY` |

---

## Requirements

- **Runtime**: [Bun](https://bun.sh) >= 1.3.11
- **OS**: macOS, Linux, or Windows PowerShell
- **Auth**: An API key or OAuth login for your chosen provider

```bash
# Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash
```

---

## Build

```bash
git clone https://github.com/phucnvan/free-code.git
cd free-code
bun install
bun run build
./cli
```

Windows PowerShell:

```powershell
git clone https://github.com/phucnvan/free-code.git
cd free-code
bun install
bun run build:dev:full
.\cli-dev
```

### Build Variants

| Command | Output | Features | Description |
|---|---|---|---|
| `bun run build` | `./cli` | `VOICE_MODE` only | Production-like binary |
| `bun run build:dev` | `./cli-dev` | `VOICE_MODE` only | Dev version stamp |
| `bun run build:dev:full` | `./cli-dev` | Curated `dev-full` experimental bundle | Full unlock build |
| `bun run compile` | `./dist/cli` | `VOICE_MODE` only | Alternative output path |

### Custom Feature Flags

Enable specific flags without the full bundle:

```bash
# Enable just ultraplan and ultrathink
bun run ./scripts/build.ts --feature=ULTRAPLAN --feature=ULTRATHINK

# Add a flag on top of the dev build
bun run ./scripts/build.ts --dev --feature=BRIDGE_MODE
```

---

## Usage

```bash
# Interactive REPL (default)
./cli

# One-shot mode
./cli -p "what files are in this directory?"

# Specify a model
./cli --model claude-opus-4-6

# Run from source (slower startup)
bun run dev

# OAuth login
./cli /login
```

Windows PowerShell:

```powershell
# Interactive REPL
.\cli-dev

# One-shot mode
.\cli-dev -p "what files are in this directory?"

# OAuth login
.\cli-dev /login
```

### Environment Variables Reference

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_AUTH_TOKEN` | Auth token (alternative) |
| `ANTHROPIC_MODEL` | Override default model |
| `ANTHROPIC_BASE_URL` | Custom API endpoint |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Custom Opus model ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Custom Sonnet model ID |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Custom Haiku model ID |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token via env |
| `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | API key helper cache TTL |

---

## Experimental Features

There are two different numbers to keep straight:

- `FEATURES.md` audits **54 flags that currently bundle cleanly** in this snapshot.
- `bun run build:dev:full` currently enables the curated **`dev-full` bundle** from [scripts/build.ts](scripts/build.ts), which is the set the installers build by default.

That means a normal install of `free-code` already includes the current `dev-full` experimental bundle. Some features are fully local and work immediately; others still require `claude.ai` login, remote/web flows, audio tooling, or supporting config.

### Interaction & UI

| Flag | Description |
|---|---|
| `ULTRAPLAN` | Remote multi-agent planning on Claude Code web (Opus-class) |
| `ULTRATHINK` | Deep thinking mode -- type "ultrathink" to boost reasoning effort |
| `VOICE_MODE` | Push-to-talk voice input and dictation |
| `TOKEN_BUDGET` | Token budget tracking and usage warnings |
| `HISTORY_PICKER` | Interactive prompt history picker |
| `MESSAGE_ACTIONS` | Message action entrypoints in the UI |
| `QUICK_SEARCH` | Prompt quick-search |
| `SHOT_STATS` | Shot-distribution stats |

### Agents, Memory & Planning

| Flag | Description |
|---|---|
| `BUILTIN_EXPLORE_PLAN_AGENTS` | Built-in explore/plan agent presets |
| `VERIFICATION_AGENT` | Verification agent for task validation |
| `AGENT_TRIGGERS` | Local cron/trigger tools for background automation |
| `AGENT_TRIGGERS_REMOTE` | Remote trigger tool path |
| `EXTRACT_MEMORIES` | Post-query automatic memory extraction |
| `COMPACTION_REMINDERS` | Smart reminders around context compaction |
| `CACHED_MICROCOMPACT` | Cached microcompact state through query flows |
| `TEAMMEM` | Team-memory files and watcher hooks |

### Tools & Infrastructure

| Flag | Description |
|---|---|
| `BRIDGE_MODE` | IDE remote-control bridge (VS Code, JetBrains) |
| `BASH_CLASSIFIER` | Classifier-assisted bash permission decisions |
| `PROMPT_CACHE_BREAK_DETECTION` | Cache-break detection in compaction/query flow |

### Which features can you actually use?

The most useful way to think about experimental features is by runtime dependency:

- **Works locally right away**: terminal-only UI, planning UX, search, history, budget tracking, and most agent orchestration improvements
- **Needs `claude.ai` auth**: remote/web features like `ULTRAPLAN`, `BRIDGE_MODE`, `CCR_*`, and parts of channels/voice
- **Needs extra environment setup**: audio recording for `VOICE_MODE`, team-memory files for `TEAMMEM`, remote bridge setup for `BRIDGE_MODE`

### Recommended first tests

These are the easiest features to verify in a fresh install:

| Feature | What it does | How to test | Extra requirements | Works with Codex? |
|---|---|---|---|---|
| `ULTRATHINK` | Boosts reasoning effort when the prompt contains the `ultrathink` keyword | In the REPL, type `ultrathink analyze this repo structure` | None | Yes |
| `HISTORY_PICKER` | Improves interactive prompt history search | Send a few prompts, then press `Ctrl+R` | None | Yes |
| `QUICK_SEARCH` | Adds quick-open and global search bindings | Press `Ctrl+Shift+F` or `Ctrl+Shift+P` in the REPL | None | Yes |
| `MESSAGE_ACTIONS` | Adds transcript navigation/actions on prior messages | After you have a few messages, press `Shift+Up` | Fullscreen REPL context | Yes |
| `TOKEN_BUDGET` | Tracks token budget and warning state during longer sessions | Start a normal coding session and watch the status UI as context grows | None | Yes |
| `NEW_INIT` | Enables the newer `/init` onboarding flow | Run `/init` in a project directory | None | Yes |
| `BUILTIN_EXPLORE_PLAN_AGENTS` | Adds built-in explore/plan agent presets | Open `/agents` and inspect built-in presets | None | Yes |
| `VERIFICATION_AGENT` | Adds verification-oriented agent guidance | Ask the tool to validate or review a change after an edit | None | Yes |

### Features that require Claude web/remote login

These are included in `dev-full`, but they are not purely local features:

| Feature | What it does | How to test | Extra requirements | Works with Codex? |
|---|---|---|---|---|
| `ULTRAPLAN` | Launches a stronger remote planning session on Claude Code web | Run `/ultraplan <task>` | `claude.ai` login | No |
| `BRIDGE_MODE` | Remote-control bridge / web-connected workflows | Run the bridge-related commands after login | `claude.ai` login and remote bridge eligibility | No |
| `CCR_AUTO_CONNECT` | Auto-connect behavior for remote sessions | Verify after remote/web setup | `claude.ai` login | No |
| `CCR_MIRROR` | Outbound-only mirrored remote sessions | Test only after remote session setup | `claude.ai` login | No |
| `CCR_REMOTE_SETUP` | Remote setup command path | Use the remote setup command after login | `claude.ai` login | No |
| `KAIROS_CHANNELS` | Channel-related UI and callback plumbing | Requires matching remote/channel environment | `claude.ai` login and supporting setup | Usually no |

### Features with extra caveats

| Feature | Caveat |
|---|---|
| `VOICE_MODE` | Built into this binary, but still depends on `claude.ai` auth and a working local audio backend. |
| `TEAMMEM` | Only useful if you actually configure team-memory files and related environment. |
| `NATIVE_CLIPBOARD_IMAGE` | Mostly a platform optimization path, not a dramatic visible UX feature on every system. |
| `BASH_CLASSIFIER` | Affects permission behavior rather than adding an obvious command, so it is harder to "see" directly. |
| `PROMPT_CACHE_BREAK_DETECTION` | Internal quality/perf behavior; you notice it through better compaction/cache handling rather than a dedicated UI command. |

### Codex compatibility

If you run with:

```powershell
$env:CLAUDE_CODE_USE_OPENAI=1
free-code /login
```

and log into **OpenAI Codex**, the **local terminal features** above still work well. What usually does **not** carry over are the features tied to `claude.ai` web/remote infrastructure, such as `ULTRAPLAN`, `BRIDGE_MODE`, and the `CCR_*` family.

In short:

- **Codex is fine for local UI/agent/search/history features**
- **Claude login is better if you want the full remote/web experimental stack**

### Quick test checklist

On a normal install, you can verify the experimental bundle in 2 minutes:

1. Run `free-code`
2. Type a prompt containing `ultrathink`
3. Press `Ctrl+R` after a few prompts
4. Press `Ctrl+Shift+F`
5. Run `/init`
6. Run `/ultraplan`

Expected result:

- Steps 2-5 should behave as available local features in a standard REPL
- `/ultraplan` should at least resolve as a real command; running it fully requires `claude.ai` login

See [FEATURES.md](FEATURES.md) for the complete audit of all 88 flags, including the larger list of bundle-clean flags and the broken flags with reconstruction notes.

---

## Project Structure

```
scripts/
  build.ts                # Build script with feature flag system

src/
  entrypoints/cli.tsx     # CLI entrypoint
  commands.ts             # Command registry (slash commands)
  tools.ts                # Tool registry (agent tools)
  QueryEngine.ts          # LLM query engine
  screens/REPL.tsx        # Main interactive UI (Ink/React)

  commands/               # /slash command implementations
  tools/                  # Agent tool implementations (Bash, Read, Edit, etc.)
  components/             # Ink/React terminal UI components
  hooks/                  # React hooks
  services/               # API clients, MCP, OAuth, analytics
    api/                  # API client + Codex fetch adapter
    oauth/                # OAuth flows (Anthropic + OpenAI)
  state/                  # App state store
  utils/                  # Utilities
    model/                # Model configs, providers, validation
  skills/                 # Skill system
  plugins/                # Plugin system
  bridge/                 # IDE bridge
  voice/                  # Voice input
  tasks/                  # Background task management
```

---

## Tech Stack

| | |
|---|---|
| **Runtime** | [Bun](https://bun.sh) |
| **Language** | TypeScript |
| **Terminal UI** | React + [Ink](https://github.com/vadimdemedes/ink) |
| **CLI Parsing** | [Commander.js](https://github.com/tj/commander.js) |
| **Schema Validation** | Zod v4 |
| **Code Search** | ripgrep (bundled) |
| **Protocols** | MCP, LSP |
| **APIs** | Anthropic Messages, OpenAI Codex, AWS Bedrock, Google Vertex AI |

---

## IPFS Mirror

A full copy of this repository is permanently pinned on IPFS via Filecoin:

| | |
|---|---|
| **CID** | `bafybeiegvef3dt24n2znnnmzcud2vxat7y7rl5ikz7y7yoglxappim54bm` |
| **Gateway** | https://w3s.link/ipfs/bafybeiegvef3dt24n2znnnmzcud2vxat7y7rl5ikz7y7yoglxappim54bm |

If this repo gets taken down, the code lives on.

---

## Contributing

Contributions are welcome. If you're working on restoring one of the 34 broken feature flags, check the reconstruction notes in [FEATURES.md](FEATURES.md) first -- many are close to compiling and just need a small wrapper or missing asset.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'feat: add something'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## License

The original Claude Code source is the property of Anthropic. This fork exists because the source was publicly exposed through their npm distribution. Use at your own discretion.
