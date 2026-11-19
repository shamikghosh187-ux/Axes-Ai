# AXES AI

**One AI workspace. Multiple providers. One configurable fallback chain.**

AXES AI is a browser-based multi-provider AI chat workspace. Connect API keys from supported providers, discover the models available to each key, and build an ordered chain so AXES can try another key automatically when an earlier request fails.

## Features

- **Multi-provider connections:** add API keys for OpenAI, Google Gemini, Anthropic Claude, Groq, DeepSeek, OpenRouter, and MeshAPI.
- **Multiple keys per provider:** save more than one key for the same provider and manage each key separately.
- **Model discovery:** AXES requests the available model list for each saved key.
- **Six-key API chain:** build a fallback chain with up to six saved keys. You can mix providers and include multiple keys from the same provider.
- **Choose the order:** move chain entries up or down, add saved keys, or remove entries from the chain without deleting the saved key.
- **Automatic fallback:** AXES tries the configured chain in order and stops when a key returns a successful answer. If every configured attempt fails, AXES shows the final API failure dialog.
- **Research chat workspace:** ask questions and receive responses from the connected model.

## Supported providers

| Provider | Provider ID |
| --- | --- |
| OpenAI | `openai` |
| Google Gemini | `gemini` |
| Anthropic Claude | `anthropic` |
| Groq | `groq` |
| DeepSeek | `deepseek` |
| OpenRouter | `openrouter` |
| MeshAPI | `meshapi` |

The models available depend on the provider, the API key's permissions, and the provider's current API access.

## How the API chain works

1. Open **Settings → API connections**.
2. Choose a provider and add an API key. AXES validates the key by requesting its available models.
3. Add saved keys to the **API Chain**. A newly saved key is added automatically when there is room.
4. Arrange the chain in the order you want. For example:

   ```text
   1. Groq — Key 1
   2. Groq — Key 2
   3. Google Gemini — Key 1
   4. Google Gemini — Key 2
   5. OpenAI — Key 1
   6. Anthropic Claude — Key 1
   ```

5. Send a message. AXES attempts the configured keys sequentially and stops after the first successful response.

The example above is only an example; you control which saved keys are in the chain and their order. The chain can contain at most **six entries**. A saved key that is not in the chain is not used for chat fallback.

## API key storage and privacy

- Provider API keys are stored in the browser's `sessionStorage`, not in the Git repository.
- Keys are available to the app for the current browser-tab session. Closing the tab/session may clear them.
- The API chain order is also stored in `sessionStorage`.
- Do not paste API keys into issues, pull requests, screenshots, or source files.
- Use your provider's dashboard to manage, rotate, or revoke API keys.

**Important:** session storage is browser-side session storage. This project does not currently claim encrypted, permanent, account-synced storage for provider keys.

## Run locally

You need Node.js and npm installed.

```bash
git clone https://github.com/shamikghosh187-ux/Axes-Ai.git
cd Axes-Ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To create a production build:

```bash
npm run build
npm run start
```

## Project stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Lucide icons

## Repository

[github.com/shamikghosh187-ux/Axes-Ai](https://github.com/shamikghosh187-ux/Axes-Ai)

---

AXES AI is an evolving project. Provider APIs, model availability, rate limits, and key permissions are controlled by their respective providers.
