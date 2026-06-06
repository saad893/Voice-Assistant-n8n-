# Setup Guide

This guide walks you through everything needed to get the Voice Assistant running.

---

## Prerequisites

| Requirement | Details |
|---|---|
| **n8n** | Self-hosted or cloud instance (v1.0+) |
| **OpenAI API Key** | With access to `gpt-4o-mini` and `tts-1` models |
| **Browser** | Chrome or Edge (Web Speech API required) |

---

## Step 1 — Import the Workflow into n8n

1. Log into your n8n instance
2. Navigate to **Workflows** in the left sidebar
3. Click **Import** (or the `+` button → Import)
4. Select `workflow/workflow.json` from this repository
5. Click **Import**

You should see the workflow with these nodes:
- Voice Interface Endpoint
- Voice Assistant UI
- Send HTML Interface
- Audio Processing Endpoint
- Process User Query (AI Agent)
- GPT-4o-mini Model
- Conversation Memory
- Generate Voice Response
- Send Audio Response

---

## Step 2 — Add OpenAI API Credentials

The workflow needs OpenAI credentials on **two** nodes.

### Create the credential:
1. In n8n sidebar, go to **Credentials**
2. Click **Add Credential**
3. Search for **OpenAI**
4. Enter your API key
5. Name it something like `OpenAI - Voice Assistant`
6. Click **Save**

### Assign to nodes:
1. Open the `GPT-4o-mini Model` node → Select your OpenAI credential
2. Open the `Generate Voice Response` node → Select the same credential
3. Save the workflow

---

## Step 3 — Configure the Webhook URL in the HTML Node

The built-in HTML UI inside n8n (`Voice Assistant UI` node) has a hardcoded webhook URL. You need to update it.

1. Click the `Audio Processing Endpoint` node
2. Copy the **Production URL** shown (something like `https://your-n8n.com/webhook/process-audio`)
3. Click the `Voice Assistant UI` node
4. In the HTML content, find this line:
   ```javascript
   "https://algrithmn8n.duckdns.org/webhook/process-audio"
   ```
5. Replace it with your copied URL
6. Click **Save**

---

## Step 4 — Activate the Workflow

Toggle the **Active** switch at the top of the workflow. It should turn green.

---

## Step 5 — Test It

### Option A: Use the n8n-hosted UI

1. Copy the URL from the `Voice Interface Endpoint` node (Production URL)
2. Open it in **Chrome or Edge**
3. Click the glowing orb
4. Allow microphone permissions when prompted
5. Speak — the orb will glow cyan while listening
6. After a short pause, it will process (amber glow) then respond with speech (magenta glow)

### Option B: Use the standalone frontend

1. Open `frontend/index.html` in Chrome or Edge
2. Click the ⚙ settings icon (bottom-right corner)
3. Paste your `process-audio` webhook URL
4. Click **Save & Connect**
5. Click the orb and speak

---

## Step 6 — (Optional) Configure Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Fill in your values:

```
N8N_BASE_URL=https://your-n8n.com
WEBHOOK_PROCESS_AUDIO=https://your-n8n.com/webhook/process-audio
OPENAI_API_KEY=sk-...
```

> Note: The standalone frontend (`frontend/index.html`) reads the webhook URL from `localStorage` (set via the ⚙ modal), not from `.env`. The `.env` file is for documentation and any future server-side component.

---

## Browser Compatibility

| Browser | Voice Input | Audio Playback |
|---|---|---|
| Chrome (desktop) | ✅ Full support | ✅ |
| Edge (desktop) | ✅ Full support | ✅ |
| Firefox | ⚠ Limited (no Web Speech API) | ✅ |
| Safari | ⚠ Partial (iOS 14.5+) | ✅ |
| Mobile Chrome | ✅ Works | ✅ |

---

## CORS Configuration

If you're hosting the standalone frontend on a different domain than your n8n instance, you may need to configure CORS in n8n:

1. In n8n, go to **Settings → Environment Variables**
2. Add: `N8N_CORS_ORIGIN=https://your-frontend-domain.com`
3. Or set it to `*` for development: `N8N_CORS_ORIGIN=*`

For Docker deployments, add to your `docker-compose.yml`:
```yaml
environment:
  - N8N_CORS_ORIGIN=*
```

---

## Production Deployment Checklist

- [ ] n8n workflow is **Active**
- [ ] OpenAI credentials added to both nodes
- [ ] `Audio Processing Endpoint` URL updated in `Voice Assistant UI` node
- [ ] HTTPS enabled on n8n (required for microphone access)
- [ ] Tested in Chrome or Edge
- [ ] Microphone permissions granted

---

## Troubleshooting

See the [Troubleshooting section in README.md](../README.md#troubleshooting) for common issues and fixes.
