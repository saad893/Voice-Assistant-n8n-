# 🎙️ AI Voice Assistant

A full-stack AI voice assistant powered by **n8n**, **OpenAI GPT-4o-mini**, and **OpenAI Text-to-Speech**. Speak to it, and it speaks back.

---

## 📸 Screenshots

> After deployment, the assistant UI looks like a glowing interactive orb on a dark background. Click it to start speaking — it listens, thinks, and responds with a voice.

---

## 🧠 How It Works

```
User speaks → Browser captures audio via Web Speech API
           → Transcribed text sent to n8n webhook (POST /process-audio)
           → n8n routes to GPT-4o-mini AI agent (with conversation memory)
           → AI response converted to speech via OpenAI TTS (voice: onyx)
           → MP3 audio blob returned to browser
           → Browser plays audio response
```

---

## ✨ Features

- 🎤 **Voice Input** — Uses browser's native Web Speech API (no extra libraries)
- 🤖 **AI Processing** — GPT-4o-mini with friendly conversational system prompt
- 🧠 **Memory** — 30-message conversation window keeps context across turns
- 🔊 **Voice Output** — OpenAI TTS with "onyx" voice (deep and authoritative)
- 🌐 **n8n Hosted UI** — The orb interface is served directly by n8n
- 🖥️ **Standalone Frontend** — Also included as a standalone HTML file for local use

---

## 📁 Repository Structure

```
voice-assistant/
├── workflow/
│   └── workflow.json          # n8n workflow (import this into n8n)
├── frontend/
│   ├── index.html             # Standalone voice assistant UI
│   ├── styles.css             # All visual styles
│   └── script.js              # Voice capture & API communication logic
├── docs/
│   ├── setup.md               # Step-by-step setup guide
│   └── workflow-explanation.md # Deep-dive into every n8n node
├── .env.example               # Environment variables template
├── .gitignore
├── LICENSE
└── README.md
```

---

## ⚙️ Quick Setup

### Prerequisites

- [n8n](https://n8n.io/) instance (self-hosted or cloud)
- OpenAI API key with access to GPT-4o-mini and TTS

### 1. Import the Workflow

1. Open your n8n instance
2. Go to **Workflows → Import**
3. Upload `workflow/workflow.json`

### 2. Add OpenAI Credentials

1. In n8n, go to **Credentials → New**
2. Select **OpenAI**
3. Paste your API key
4. Assign the credential to both:
   - `GPT-4o-mini Model` node
   - `Generate Voice Response` node

### 3. Configure the Webhook URL

1. Click the `Audio Processing Endpoint` node
2. Copy the **Production Webhook URL** (looks like `https://your-n8n.com/webhook/process-audio`)
3. Open the `Voice Assistant UI` node
4. In the HTML, find:
   ```javascript
   "https://algrithmn8n.duckdns.org/webhook/process-audio"
   ```
5. Replace it with your copied webhook URL

### 4. Activate the Workflow

- Toggle the workflow to **Active** in n8n

### 5. Use It

- **Via n8n**: Visit `https://your-n8n.com/webhook/voice-assistant` in your browser
- **Standalone**: Open `frontend/index.html` and update the webhook URL in `script.js`

---

## 🌍 Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `N8N_BASE_URL` | Your n8n instance URL |
| `WEBHOOK_PROCESS_AUDIO` | Full URL to `/webhook/process-audio` |
| `OPENAI_API_KEY` | Your OpenAI API key |

---

## 🔧 Configuration Options

### Change the AI Voice

In the `Generate Voice Response` node, change `voice` to:

| Voice | Style |
|---|---|
| `alloy` | Neutral and balanced |
| `echo` | Warm and conversational |
| `fable` | Expressive and dynamic |
| `onyx` | Deep and authoritative *(default)* |
| `nova` | Friendly and upbeat |
| `shimmer` | Soft and gentle |

### Change the Language

In the `Voice Assistant UI` node HTML (or `frontend/script.js`), update:
```javascript
recognition.lang = "en-US";  // Change to: 'pt-BR', 'es-ES', 'fr-FR', etc.
```

### Change the AI Model

In the `GPT-4o-mini Model` node, select any supported chat model.

### Change the System Personality

In the `Process User Query` node, update the `systemMessage`:
```
You are a helpful AI assistant. Respond in a friendly and conversational manner.
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| Microphone not working | Use Chrome or Edge; Firefox has limited Web Speech API support |
| "Error communicating with AI" | Check that your n8n webhook URL is correct and the workflow is **Active** |
| No audio plays | Ensure OpenAI TTS credentials are set on the `Generate Voice Response` node |
| CORS errors | Add your frontend origin to n8n's allowed origins in settings |
| Blank response | Check n8n execution logs for errors in the AI agent node |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 👤 Author

Built by **Syed Muhammad Saad Hasham**

- GitHub: [github.com/saad893](https://github.com/saad893)

---

## Repository

**GitHub:** [https://github.com/saad893](https://github.com/saad893)
