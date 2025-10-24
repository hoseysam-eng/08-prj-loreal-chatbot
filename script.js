/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// For students: paste your deployed Cloudflare Worker URL below.
// Example: const WORKER_URL = "https://your-worker-name.your-subdomain.workers.dev";
const WORKER_URL = ""; // leave blank to use local secrets.js during development

// System prompt: keeps the AI focused on L’Oréal topics and politely declines unrelated questions.
const systemPrompt = `
You are a helpful L’Oréal product advisor for skincare, haircare, and cosmetics.
- Only answer questions related to L’Oréal brands, products, routines, ingredients, usage tips, and beauty-related topics.
- If a question is unrelated, politely decline and redirect to L’Oréal topics.
- Be concise, friendly, and practical. When recommending products, mention the product line and key benefits.
- Avoid medical claims. Encourage patch testing and consulting professionals for sensitive concerns.
`;

// Messages state used for Chat Completions API
let messages = [{ role: "system", content: systemPrompt.trim() }];

// Helper: append a message to the chat window
function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user" : "ai"}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Simple typing indicator
function showTyping() {
  const div = document.createElement("div");
  div.className = "msg ai";
  div.id = "typing";
  div.textContent = "…";
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typing");
  if (el) el.remove();
}

// Set initial message
chatWindow.textContent =
  "👋 Hello! I’m your L’Oréal product advisor. How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const content = userInput.value.trim();
  if (!content) return;

  // Show user message
  addMessage("user", content);

  // Track in conversation
  messages.push({ role: "user", content });

  // Clear input
  userInput.value = "";

  // Show typing indicator
  showTyping();

  try {
    let data;

    if (WORKER_URL) {
      // Preferred: call your Cloudflare Worker (no API key in the browser)
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      data = await res.json();
      if (!res.ok)
        throw new Error(data?.error?.message || "Worker request failed");
    } else {
      // Local dev only: call OpenAI directly using secrets.js -> window.OPENAI_API_KEY
      const apiKey =
        typeof OPENAI_API_KEY !== "undefined" ? OPENAI_API_KEY : "";
      if (!apiKey)
        throw new Error(
          "Missing OPENAI_API_KEY. Use secrets.js or set WORKER_URL."
        );

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          max_tokens: 300,
          temperature: 0.6,
        }),
      });
      data = await res.json();
      if (!res.ok)
        throw new Error(data?.error?.message || "OpenAI request failed");
    }

    // Read the assistant message per Chat Completions API
    const aiText =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t find an answer.";
    hideTyping();
    addMessage("ai", aiText);

    // Track assistant reply for conversation context
    messages.push({ role: "assistant", content: aiText });
  } catch (err) {
    hideTyping();
    addMessage("ai", `Sorry, something went wrong. ${err.message}`);
  }
});
