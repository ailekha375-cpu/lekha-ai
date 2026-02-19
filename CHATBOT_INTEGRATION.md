# Chatbot ↔ Azure Function integration

## How the chatbot is wired in the frontend

1. **Entry point**  
   The chatbot is the slide-in panel opened from the header (e.g. “AI” or “Chat”). It’s implemented in **`src/app/components/ChatbotModal.tsx`** and shown/hidden via **`ModalContext`** (`showChatModal` / `setShowChatModal`).

2. **State**  
   - **`currentChat`**: list of `Message` objects (user + assistant) for the active conversation.  
   - **`chatHistory`**: list of past sessions (each with `id`, `title`, `messages`, `createdAt`).  
   - **`input`**: current text in the input box.  
   - **`isTyping`**: true while waiting for the backend.

3. **Sending a message (triggering the Azure Function)**  
   - User types and hits **Send** (or Enter).  
   - **`handleSend`** runs:  
     - Appends a **user** message to `currentChat`.  
     - Clears input and sets **`isTyping`** to true.  
     - Calls **`POST /api/chat`** with:
       - **`message`**: the user’s text.  
       - **`conversationHistory`**: previous messages in this chat, as `{ role: 'user' | 'assistant', content: string }[]`, so the backend can use context/intent.  
   - When the request returns, **`handleSend`** appends an **assistant** message built from the response and updates **`chatHistory`** for the current session.

4. **Rendering**  
   - Messages are rendered from **`currentChat`**.  
   - Assistant messages can have **`content`** (text) and optional **`imageBase64`**.  
   - If **`imageBase64`** is set, the bubble shows the image (click to open lightbox; zoom and save there).

So: **every user “Send” triggers exactly one `POST /api/chat`** with the latest user message and the current conversation history; the UI then shows the assistant reply (text and/or image) from that response.

---

## How the Azure Function is triggered and how responses are used

- **Trigger**: The frontend does **not** call the Azure Function URL directly. It always calls **`POST /api/chat`** (Next.js API route).
- **Proxy** (**`src/app/api/chat/route.ts`**):  
  - Reads **`AZURE_FUNCTION_URL`** (and optionally **`AZURE_FUNCTION_KEY`**) from env.  
  - Forwards the request body to your Azure Function (e.g. adds `?code=...` for key auth).  
  - Returns the Function’s JSON response as-is (or an error object if the call fails).

So the flow is:

**Browser** → **Next.js (`/api/chat`)** → **Azure Function** → **Next.js** → **Browser**

The chatbot only ever talks to `/api/chat`; the Function URL and key stay on the server.

---

## Request and response contract

### Frontend → `/api/chat` (and then proxied to your Azure Function)

**Body:**

```json
{
  "message": "user's latest message text",
  "conversationHistory": [
    { "role": "user", "content": "first user message" },
    { "role": "assistant", "content": "first assistant reply" },
    { "role": "user", "content": "second user message" }
  ]
}
```

- **`message`** (string, required): The message the user just sent.  
- **`conversationHistory`** (array, optional): Previous turns in the current chat. Omit or send `[]` for the first message.

Your Azure Function should accept this same shape (or the proxy can be changed to map your frontend format to whatever the Function expects).

### Backend (Azure Function) → response used by the frontend

The frontend expects the proxy to return JSON in one of these forms:

**Text-only reply:**

```json
{
  "content": "Assistant reply text only."
}
```

**Reply with image (e.g. after calling Azure ML):**

```json
{
  "content": "Here’s your generated design.",
  "imageBase64": "iVBORw0KGgo..."
}
```

- **`content`** (string): Shown as the assistant message text. Required.  
- **`imageBase64`** (string, optional): Raw base64 image data (no `data:image/...;base64,` prefix). If present, the chat bubble shows the image and the lightbox can be used to zoom and save.

So: **triggering the Azure Function** = user sends a message → frontend calls **`POST /api/chat`** with **`message`** and **`conversationHistory`** → your Next.js proxy calls the Azure Function with that payload → the Function’s response (with **`content`** and optionally **`imageBase64`**) is returned and the chatbot displays it.

---

## Env vars for the proxy

In **`.env.local`** (project root):

- **`AZURE_FUNCTION_URL`** (required): Full URL of your Azure Function HTTP trigger (e.g. `https://<app>.azurewebsites.net/api/chat`).  
- **`AZURE_FUNCTION_KEY`** (optional): Function key (or master key). The proxy appends it as `?code=<key>`; if your Function uses a different auth (e.g. header), adjust **`src/app/api/chat/route.ts`** accordingly.

Restart the dev server after changing env.

---

## Summary

| Step | What happens |
|------|-------------------------------|
| 1 | User types and clicks Send in **ChatbotModal**. |
| 2 | **handleSend** sends **POST /api/chat** with **message** and **conversationHistory**. |
| 3 | **`/api/chat`** (Next.js) forwards the body to **AZURE_FUNCTION_URL** (with key if set). |
| 4 | Your Azure Function runs (LLM intent → LLM or Azure ML call) and returns **{ content, imageBase64? }**. |
| 5 | Proxy returns that JSON to the browser. |
| 6 | **handleSend** adds an assistant message with **content** and optional **imageBase64**; the UI updates and can show the image (and lightbox zoom/save). |

That’s how the chatbot is integrated and how the Azure Function is triggered and its responses used on the frontend.
