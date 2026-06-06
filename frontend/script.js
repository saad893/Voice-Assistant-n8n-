/**
 * VOXA — AI Voice Assistant
 * 
 * Author: Syed Muhammad Saad Hasham
 * GitHub: https://github.com/saad893
 * script.js
 *
 * Handles:
 *  - Browser microphone access via Web Speech API
 *  - Speech recognition (live transcription)
 *  - POST to n8n webhook with transcribed question
 *  - Receiving audio blob response
 *  - Playing back AI voice response
 *  - UI state management (idle / listening / processing / playing)
 *  - Webhook URL configuration via localStorage
 */

/* ── Config ────────────────────────────────────────────────── */

/**
 * Default webhook URL (from the n8n workflow).
 * Users can override this via the settings modal.
 * Replace with YOUR actual n8n process-audio webhook URL.
 */
const DEFAULT_WEBHOOK_URL = "https://algrithmn8n.duckdns.org/webhook/process-audio";
const STORAGE_KEY = "voxa_webhook_url";

/* ── DOM references ────────────────────────────────────────── */
const orb           = document.getElementById("orb");
const orbIcon       = document.getElementById("orbIcon");
const iconMic       = document.getElementById("iconMic");
const iconWave      = document.getElementById("iconWave");
const iconSpeaker   = document.getElementById("iconSpeaker");
const statusLabel   = document.getElementById("statusLabel");
const hintText      = document.getElementById("hintText");
const transcriptText = document.getElementById("transcriptText");
const responseCard  = document.getElementById("responseCard");
const responseText  = document.getElementById("responseText");
const toast         = document.getElementById("toast");
const settingsBtn   = document.getElementById("settingsBtn");
const configModal   = document.getElementById("configModal");
const webhookInput  = document.getElementById("webhookInput");
const saveConfig    = document.getElementById("saveConfig");
const cancelConfig  = document.getElementById("cancelConfig");

/* ── State ─────────────────────────────────────────────────── */
let recognition      = null;
let isListening      = false;
let lastTranscript   = "";
let silenceTimer     = null;
let currentAudio     = null;

/* ── Helpers ───────────────────────────────────────────────── */

/** Get the configured webhook URL */
function getWebhookUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_WEBHOOK_URL;
}

/** Set body state class and update status badge/hint */
function setState(state) {
  // Remove all state classes
  document.body.classList.remove("listening", "processing", "playing");

  // Map icons
  iconMic.style.display     = "none";
  iconWave.style.display    = "none";
  iconSpeaker.style.display = "none";

  switch (state) {
    case "listening":
      document.body.classList.add("listening");
      statusLabel.textContent = "LISTENING";
      hintText.textContent    = "Speak now — tap orb to stop";
      iconWave.style.display  = "block";
      break;

    case "processing":
      document.body.classList.add("processing");
      statusLabel.textContent = "PROCESSING";
      hintText.textContent    = "Thinking...";
      iconMic.style.display   = "block"; // generic during processing
      break;

    case "playing":
      document.body.classList.add("playing");
      statusLabel.textContent   = "RESPONDING";
      hintText.textContent      = "Playing response...";
      iconSpeaker.style.display = "block";
      break;

    default: // idle
      statusLabel.textContent = "READY";
      hintText.textContent    = "Click the orb to start speaking";
      iconMic.style.display   = "block";
      break;
  }
}

/** Show a toast notification */
function showToast(message, type = "info", duration = 3000) {
  toast.textContent = message;
  toast.className   = `toast ${type} visible`;
  setTimeout(() => {
    toast.classList.remove("visible");
  }, duration);
}

/** Update the "YOU SAID" transcript card */
function setTranscript(text) {
  transcriptText.textContent = text || "—";
  transcriptText.classList.toggle("populated", !!text);
}

/** Update the "AI RESPONDED" card */
function setResponse(text) {
  if (text) {
    responseText.textContent = text;
    responseText.classList.add("populated");
    responseCard.style.display = "block";
  } else {
    responseCard.style.display = "none";
  }
}

/* ── Speech Recognition ────────────────────────────────────── */

/** Check if Web Speech API is available */
function isSpeechSupported() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

/** Start listening for speech */
async function startListening() {
  if (isListening) return;

  if (!isSpeechSupported()) {
    showToast("Speech recognition not supported. Use Chrome or Edge.", "error", 5000);
    return;
  }

  // Request microphone permission explicitly first
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    showToast("Microphone permission denied. Please allow mic access.", "error", 5000);
    return;
  }

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const SpeechRecognition =
    window.webkitSpeechRecognition || window.SpeechRecognition;

  recognition         = new SpeechRecognition();
  recognition.lang    = "en-US";          // Change language here if needed
  recognition.interimResults = true;
  recognition.continuous     = true;

  lastTranscript = "";
  clearTimeout(silenceTimer);

  recognition.onstart = () => {
    isListening = true;
    setState("listening");
    setTranscript(""); // clear previous
    setResponse(null);
  };

  recognition.onresult = (event) => {
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        lastTranscript += result[0].transcript + " ";
      } else {
        interimText += result[0].transcript;
      }
    }

    // Show live transcript (final + interim)
    const displayText = (lastTranscript + interimText).trim();
    if (displayText) {
      setTranscript(displayText);
    }

    // Auto-stop after silence (1200ms after last word)
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      stopListeningAndProcess();
    }, 1200);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);

    if (event.error === "no-speech") {
      showToast("No speech detected. Try again.", "info");
    } else if (event.error === "not-allowed") {
      showToast("Microphone access denied.", "error");
    } else {
      showToast(`Recognition error: ${event.error}`, "error");
    }

    stopListeningAndProcess();
  };

  recognition.onend = () => {
    isListening = false;
    // If still in listening state, state change is handled by stopListeningAndProcess
  };

  recognition.start();
}

/** Stop recognition and send to webhook */
async function stopListeningAndProcess() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  isListening = false;
  clearTimeout(silenceTimer);

  const question = lastTranscript.trim();

  if (!question) {
    setState("idle");
    return;
  }

  // Show final transcript
  setTranscript(question);

  // Send to n8n
  await sendToWebhook(question);
}

/* ── Webhook Communication ─────────────────────────────────── */

/**
 * POST the transcribed question to the n8n webhook.
 * Expects an audio/mpeg binary response.
 */
async function sendToWebhook(question) {
  setState("processing");

  const webhookUrl = getWebhookUrl();

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // The n8n workflow returns binary audio data (MP3)
    const audioBlob = await response.blob();

    if (audioBlob.size === 0) {
      throw new Error("Empty audio response from server");
    }

    // Play the audio response
    await playAudioResponse(audioBlob);

  } catch (err) {
    console.error("Webhook error:", err);
    setState("idle");

    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      showToast("Cannot reach n8n. Check your webhook URL in settings.", "error", 5000);
    } else {
      showToast(`Error: ${err.message}`, "error", 4000);
    }
  }
}

/* ── Audio Playback ────────────────────────────────────────── */

/** Play the returned audio blob */
async function playAudioResponse(blob) {
  const audioUrl = URL.createObjectURL(blob);
  currentAudio   = new Audio(audioUrl);

  setState("playing");

  currentAudio.onended = () => {
    setState("idle");
    URL.revokeObjectURL(audioUrl);
    currentAudio = null;
  };

  currentAudio.onerror = () => {
    setState("idle");
    showToast("Failed to play audio response.", "error");
    URL.revokeObjectURL(audioUrl);
    currentAudio = null;
  };

  try {
    await currentAudio.play();
  } catch (err) {
    // Autoplay might be blocked on some browsers
    setState("idle");
    showToast("Autoplay blocked. Click to play.", "info");
  }
}

/* ── Orb Click Handler ─────────────────────────────────────── */

orb.addEventListener("click", () => {
  if (isListening) {
    // Manual stop
    stopListeningAndProcess();
  } else if (document.body.classList.contains("playing")) {
    // Stop playback
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    setState("idle");
  } else if (!document.body.classList.contains("processing")) {
    // Start listening
    startListening();
  }
});

/* ── Settings / Modal ──────────────────────────────────────── */

settingsBtn.addEventListener("click", () => {
  webhookInput.value = getWebhookUrl();
  configModal.style.display = "flex";
  setTimeout(() => webhookInput.focus(), 100);
});

saveConfig.addEventListener("click", () => {
  const url = webhookInput.value.trim();

  if (!url) {
    showToast("Please enter a webhook URL.", "error");
    return;
  }

  try {
    new URL(url); // Validate URL format
  } catch {
    showToast("Invalid URL format.", "error");
    return;
  }

  localStorage.setItem(STORAGE_KEY, url);
  configModal.style.display = "none";
  showToast("Webhook URL saved!", "success");
});

cancelConfig.addEventListener("click", () => {
  configModal.style.display = "none";
});

// Close modal on overlay click
configModal.addEventListener("click", (e) => {
  if (e.target === configModal) {
    configModal.style.display = "none";
  }
});

// Keyboard shortcut: Escape to cancel, Enter to save
document.addEventListener("keydown", (e) => {
  if (configModal.style.display !== "none") {
    if (e.key === "Escape") configModal.style.display = "none";
    if (e.key === "Enter")  saveConfig.click();
    return;
  }

  // Spacebar to toggle voice
  if (e.key === " " && e.target === document.body) {
    e.preventDefault();
    orb.click();
  }
});

/* ── Init ──────────────────────────────────────────────────── */

/**
 * On load: check for browser support and show modal
 * if no webhook URL is configured.
 */
(function init() {
  setState("idle");

  if (!isSpeechSupported()) {
    showToast(
      "⚠ Web Speech API not supported. Use Chrome or Edge.",
      "error",
      8000
    );
    orb.style.opacity = "0.4";
    orb.style.cursor  = "not-allowed";
    orb.removeEventListener("click", () => {});
  }

  // If using default URL, suggest configuring it
  const storedUrl = localStorage.getItem(STORAGE_KEY);
  if (!storedUrl) {
    setTimeout(() => {
      showToast("Tip: Click ⚙ to set your n8n webhook URL", "info", 5000);
    }, 1500);
  }
})();
