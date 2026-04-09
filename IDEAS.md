# Kamel.Chat Feature Ideas

This document outlines 5 detailed feature ideas for future development of the Kamel.Chat application, covering a mix of UX, backend, and AI capabilities.

---

## 1. Multi-modal File Upload & Vision Chat (AI/UX)

**Problem Statement:**
Currently, users can only interact with the assistant using text. Many modern LLMs support multi-modal inputs, allowing them to analyze images, PDFs, and other file types, which is highly useful for users who need help understanding diagrams, debugging screenshots, or summarizing documents.

**Proposed Solution:**
Introduce a file upload mechanism in the chat interface that allows users to attach images or documents to their prompts. The backend will parse these files, convert them to the appropriate format (e.g., base64 for images, extracted text for PDFs), and send them along with the user's prompt to the nano-gpt.com API (assuming the selected model supports multi-modal inputs).

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `index.html`):** Add an attachment icon (📎) to the chat input area. Implement a file input element and drag-and-drop zone. Handle file reading using `FileReader` API to convert images to base64.
- **Backend (`app.py`):** Update the `Message` model to include a new column for `attachments` (JSON type) or store files in a local directory/cloud bucket and save their URLs.
- **API Integration:** Modify the `/api/chat` route to accept multimodal payloads. Update the `api_messages` construction to format messages according to the OpenAI-style multimodal spec (e.g., array of content objects with `type: "image_url"`).

**User Story:**
As a user, I want to be able to upload a screenshot of an error I am seeing so that the AI can analyze the image and provide specific debugging steps.

---

## 2. Interactive Conversation Tree Branching UI (UX)

**Problem Statement:**
The backend already supports a tree structure for messages via `parent_id`, allowing users to branch off conversations (e.g., by editing an older message and generating a new response). However, the standard linear chat interface makes it difficult to navigate these branches or visualize alternate conversation paths.

**Proposed Solution:**
Implement a visual branch navigation system within the chat interface. When a message has multiple children (alternate responses or branches), provide a UI control (like left/right arrows: `< 2/3 >`) on that message to let the user switch between the different branches of the conversation history.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** When rendering messages, detect if multiple messages share the same `parent_id`. Inject navigation arrows for sibling messages. Maintain the "current active path" state in the frontend.
- **Backend (`app.py`):** The existing `/api/conversations/<int:convo_id>/messages` endpoint already provides the flat list of messages with `parent_id`.
- **State Management:** The frontend will need a function to dynamically build the active linear view from the tree structure based on the currently selected branch leaf node, similar to how ChatGPT handles edited messages.

**User Story:**
As a user, I want to edit an old message to ask a different question, and then be able to seamlessly navigate between the original conversation path and the new conversation path without losing any context.

---

## 3. Retrieval-Augmented Generation (RAG) Document Knowledge Base (Backend/AI)

**Problem Statement:**
The AI only knows what is in its pre-training data and the immediate conversation history. Users often need the AI to answer questions based on their own personal documents, internal company wikis, or large datasets that exceed the model's context window.

**Proposed Solution:**
Introduce a "Knowledge Base" feature where users can upload a corpus of text documents. The backend will chunk these documents, generate vector embeddings, and store them in a vector database. During chat, the system will perform a similarity search to retrieve relevant chunks and inject them into the context as a system prompt, grounding the AI's response in the user's data.

**Technical Implementation Details:**
- **Database:** Integrate a lightweight vector database (like ChromaDB, FAISS, or pgvector if migrating from SQLite).
- **Backend (`app.py`):** Add endpoints for `/api/knowledge-base/upload`. Use an embedding model (via nano-gpt.com or local HuggingFace) to compute vectors for document chunks.
- **Chat Flow:** In the `/api/chat` route, before calling the LLM, embed the user's query, retrieve the top-K similar chunks from the vector DB, and dynamically construct a system prompt containing the retrieved context.

**User Story:**
As a user, I want to upload a collection of PDF manuals for a software product so that I can ask the AI highly specific questions and get answers grounded in the official documentation.

---

## 4. Chat Export & Backup Capability (Full-Stack)

**Problem Statement:**
Users generate valuable information, code snippets, and ideas within their conversations. Currently, this data is locked within the application's SQLite database. Users have no easy way to export their conversations for safekeeping, offline reading, or sharing with others.

**Proposed Solution:**
Add export functionality that allows users to download individual conversations or their entire chat history in multiple formats, such as Markdown (`.md`), JSON (`.json`), or a printable HTML view.

**Technical Implementation Details:**
- **Backend (`app.py`):** Create a new route `/api/conversations/<int:convo_id>/export?format=markdown`.
  - For JSON: Simply return the serialized list of messages.
  - For Markdown: Loop through the active message path and format it as `**User:**\n\n{content}\n\n**Assistant:**\n\n{content}`.
- **Frontend (`static/script.js`):** Add an "Export" button in the conversation sidebar or header. Handle the API response by triggering a browser download using a temporary `Blob` and an anchor tag (`<a download>`).

**User Story:**
As a user, I want to export my conversation with the AI as a Markdown file so that I can easily paste the resulting code snippets and explanations into my project's documentation.

---

## 5. User Authentication & Multi-user Support (Backend)

**Problem Statement:**
Kamel.Chat currently operates as a single-tenant application where anyone accessing the UI shares the same SQLite database, conversations, and API key configuration (`config.json`). This is insufficient for a web-hosted deployment where multiple individuals want private, isolated workspaces.

**Proposed Solution:**
Implement a robust user authentication system with registration and login flows. Ensure that conversations, messages, and API key configurations are securely isolated and tied to individual user accounts.

**Technical Implementation Details:**
- **Database (`app.py`):** Add a `User` model (id, username, password_hash). Add a `user_id` foreign key to the `Conversation` model. Move the API configuration from `config.json` into a new `UserConfig` table tied to `user_id`.
- **Authentication:** Use Flask-Login or JWT (JSON Web Tokens) to handle session management.
- **Security:** Ensure password hashing using `werkzeug.security` (bcrypt/scrypt). Update all API routes (e.g., `/api/conversations`, `/api/chat`) to verify the current user's session and filter queries by `user_id` to prevent unauthorized access.

**User Story:**
As a user, I want to create a personal account and log in with a password so that my chat history and private API keys remain secure and inaccessible to other users of the application.
