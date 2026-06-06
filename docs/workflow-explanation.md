# Workflow Explanation

A deep-dive into every node in the `Voice Assistant (Ashar's Work)` n8n workflow.

---

## Workflow Overview

The workflow has **two parallel paths** that both activate independently:

```
PATH 1 — Serve the UI
──────────────────────
GET /webhook/voice-assistant
   → Voice Interface Endpoint
   → Voice Assistant UI
   → Send HTML Interface

PATH 2 — Process Voice Input
──────────────────────────────
POST /webhook/process-audio
   → Audio Processing Endpoint
   → Process User Query  ←──┐
      ↑ (sub-nodes)         │
      │  GPT-4o-mini Model   │
      └  Conversation Memory │
   → Generate Voice Response │
   → Send Audio Response     │
```

---

## Node-by-Node Breakdown

---

### 1. Voice Interface Endpoint

**Type:** Webhook (GET)
**Path:** `/webhook/voice-assistant`
**Purpose:** The entry point for users. When someone opens this URL in a browser, n8n triggers this node.

| Field | Value |
|---|---|
| HTTP Method | GET (default) |
| Path | `voice-assistant` |
| Response Mode | `responseNode` — waits for the downstream "Respond to Webhook" node |
| Webhook ID | `71ac230d-5949-41ba-b05e-761cb5cb07f3` |

**Output:** The raw HTTP request data (headers, query params, etc.)

**Flow:** Passes data to → `Voice Assistant UI`

---

### 2. Voice Assistant UI

**Type:** HTML Node
**Purpose:** Generates the complete HTML page for the voice assistant interface.

This node contains the full HTML/CSS/JavaScript for the interactive orb UI:
- A clickable glowing orb
- Web Speech API for capturing voice input
- Auto-silence detection (1200ms timer)
- POST to `/webhook/process-audio` with the transcribed text
- Plays back the returned audio blob
- Three visual states: listening (cyan), processing → playing (magenta)

**Output:** `{ "html": "<full HTML string>" }`

**Flow:** Passes to → `Send HTML Interface`

---

### 3. Send HTML Interface

**Type:** Respond to Webhook
**Purpose:** Sends the HTML back to the user's browser as the HTTP response.

| Setting | Value |
|---|---|
| Respond With | `text` (raw text/html) |
| Response Body | `{{ $json.html }}` — the HTML from the previous node |
| Headers | `Permissions-Policy: microphone=(self)` |

The `Permissions-Policy` header is critical — it tells the browser that the page is allowed to use the microphone. Without it, Chrome may block the Web Speech API.

**Output:** HTTP 200 response with HTML content

---

### 4. Audio Processing Endpoint

**Type:** Webhook (POST)
**Path:** `/webhook/process-audio`
**Purpose:** Receives the transcribed speech text from the frontend.

| Field | Value |
|---|---|
| HTTP Method | POST |
| Path | `process-audio` |
| Response Mode | `responseNode` — waits for downstream response |
| Webhook ID | `287d40b1-4172-4ba0-9a1d-6d971dd9cf68` |

**Expected Input (JSON body):**
```json
{
  "question": "What is the capital of France?"
}
```

**Output:** `{ "body": { "question": "..." }, "headers": {...}, ... }`

**Flow:** Passes to → `Process User Query`

---

### 5. GPT-4o-mini Model *(Sub-node)*

**Type:** LangChain — OpenAI Chat Model
**Purpose:** Provides the language model used by the AI Agent.

| Setting | Value |
|---|---|
| Model | `gpt-4o-mini` |
| Provider | OpenAI |
| Connection Type | `ai_languageModel` (sub-connection to Agent) |

This node doesn't execute on its own — it's "plugged into" the `Process User Query` agent as its brain. You can swap this for GPT-4o or any other OpenAI chat model.

**Credentials required:** OpenAI API key

---

### 6. Conversation Memory *(Sub-node)*

**Type:** LangChain — Memory Buffer Window
**Purpose:** Gives the AI a memory of recent conversation turns.

| Setting | Value |
|---|---|
| Session Key | `voice-assistant-session` |
| Context Window | 30 messages |
| Session ID Type | Custom key (static, so all users share the same session) |

The 30-message window means the AI remembers the last ~15 conversation turns (each turn = 1 user message + 1 AI response).

> **Note:** Because the session key is a fixed string (`voice-assistant-session`), all users of the same n8n instance share the same conversation memory. To support multiple users independently, you would change the `sessionKey` to something user-specific (e.g., an IP address or user ID passed in the request).

**Connection Type:** `ai_memory` (sub-connection to Agent)

---

### 7. Process User Query

**Type:** LangChain — AI Agent
**Purpose:** The core AI processing node. It receives the user's question, uses the GPT-4o-mini model and conversation memory to generate a response.

| Setting | Value |
|---|---|
| Prompt | `{{ $json.body.question }}` — extracts the question from the webhook body |
| System Message | "You are a helpful AI assistant. Respond in a friendly and conversational manner." |
| Sub-nodes | GPT-4o-mini Model, Conversation Memory |

**Input:** User's question as a string
**Output:** `{ "output": "AI's text response here" }`

**Flow:** Passes to → `Generate Voice Response`

---

### 8. Generate Voice Response

**Type:** LangChain — OpenAI (Audio resource)
**Purpose:** Converts the AI's text response into speech audio using OpenAI's Text-to-Speech API.

| Setting | Value |
|---|---|
| Resource | `audio` |
| Input | `{{ $json.output }}` — the text from the AI Agent |
| Voice | `onyx` (deep and authoritative) |
| Model | `tts-1` (default) |

**Output:** Binary audio data (MP3 format)

**Available voices:**
- `alloy` — Neutral
- `echo` — Warm
- `fable` — Expressive
- `onyx` — Deep *(current)*
- `nova` — Upbeat
- `shimmer` — Soft

**Credentials required:** OpenAI API key

**Flow:** Passes to → `Send Audio Response`

---

### 9. Send Audio Response

**Type:** Respond to Webhook
**Purpose:** Sends the generated audio file back to the browser as the HTTP response to the POST request.

| Setting | Value |
|---|---|
| Respond With | `binary` — sends the raw binary audio data |
| Content-Type | Automatically set to `audio/mpeg` |

The browser receives this as an audio blob, creates an object URL, and plays it via the `<audio>` element.

---

## Complete Execution Flow (End-to-End)

```
1. User opens: https://n8n-instance.com/webhook/voice-assistant
   → n8n executes PATH 1
   → Returns the HTML interface

2. User clicks the orb and speaks
   → Browser's Web Speech API captures audio
   → Transcribes to text: "What's the weather like on Mars?"

3. After 1200ms of silence, browser POSTs:
   POST /webhook/process-audio
   { "question": "What's the weather like on Mars?" }

4. n8n executes PATH 2:
   a. Audio Processing Endpoint receives the request
   b. Process User Query sends to GPT-4o-mini with conversation history
   c. AI generates: "Mars has extreme weather conditions..."
   d. Generate Voice Response converts text to MP3 audio (onyx voice)
   e. Send Audio Response returns the MP3 binary

5. Browser receives MP3, plays it
   → User hears the AI's voice response
   → Orb glows magenta during playback
```

---

## Data Flow Diagram

```
Browser                          n8n
───────                          ───
GET /webhook/voice-assistant ──► Voice Interface Endpoint
                                    │
                                 Voice Assistant UI (HTML)
                                    │
◄── HTML Page ─────────────── Send HTML Interface

[User clicks orb, speaks]

POST /webhook/process-audio  ──► Audio Processing Endpoint
 body: { question: "..." }          │
                                 Process User Query (AI Agent)
                                  ├── GPT-4o-mini (LLM)
                                  └── Conversation Memory
                                    │
                                    │ output: "AI response text"
                                    │
                                 Generate Voice Response (TTS)
                                    │
                                    │ binary: MP3 audio
                                    │
◄── MP3 Audio Blob ────────── Send Audio Response

[Browser plays audio]
```

---

## Customization Reference

| What to change | Which node | Which field |
|---|---|---|
| AI personality | Process User Query | `systemMessage` |
| AI model | GPT-4o-mini Model | `model` |
| Voice | Generate Voice Response | `voice` |
| Language | Voice Assistant UI | `recognition.lang` in HTML |
| Memory length | Conversation Memory | `contextWindowLength` |
| Silence timeout | Voice Assistant UI | `setTimeout(..., 1200)` in HTML |
