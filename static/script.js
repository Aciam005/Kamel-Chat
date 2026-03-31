document.addEventListener('DOMContentLoaded', () => {
    // =====================================================================
    // Application State
    // =====================================================================
    let appConfig = {
        api_key: "",
        models: ["mistralai/mistral-small-4-119b-2603"],
        last_used_model: "mistralai/mistral-small-4-119b-2603",
        system_prompt: ""
    };

    let currentConversationId = null;
    let conversations = [];

    // Tree state for active conversation
    let messagesMap = {}; // msgId -> msgObject
    let messageChildren = {}; // parentId -> [msgId, ...]
    let activeBranch = {}; // parentId -> activeChildId

    // =====================================================================
    // DOM References
    // =====================================================================
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');
    const uiModelSelect = document.getElementById('ui-model-select');
    const userProfileBtn = document.querySelector('.user-profile');

    // Modal
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsApiKey = document.getElementById('settings-api-key');
    const settingsSystemPrompt = document.getElementById('settings-system-prompt');
    const settingsModels = document.getElementById('settings-models');

    // Sidebar toggle
    const menuBtn = document.querySelector('.menu-btn');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const appContainer = document.querySelector('.app-container');

    // Sidebar nav
    const navNewChat = document.getElementById('nav-new-chat');

    // New Chat button (top-right)
    const newChatBtn = document.getElementById('new-chat-btn');

    // Conversation list
    const conversationList = document.getElementById('conversation-list');

    // Context menu
    const contextMenu = document.getElementById('context-menu');
    let contextMenuConvoId = null;

    // =====================================================================
    // Sidebar Toggle
    // =====================================================================
    if (menuBtn && toggleSidebarBtn && appContainer) {
        menuBtn.addEventListener('click', () => {
            appContainer.classList.add('sidebar-closed');
        });
        toggleSidebarBtn.addEventListener('click', () => {
            appContainer.classList.remove('sidebar-closed');
        });
    }

    // =====================================================================
    // Initialization
    // =====================================================================
    loadConfig();
    loadConversations();

    // =====================================================================
    // Config Management
    // =====================================================================
    async function loadConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const data = await response.json();
                appConfig = data;
                updateConfigUI();
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    function updateConfigUI() {
        settingsApiKey.value = appConfig.api_key || '';
        settingsSystemPrompt.value = appConfig.system_prompt || '';
        settingsModels.value = (appConfig.models || []).join('\n');

        uiModelSelect.innerHTML = '';
        (appConfig.models || []).forEach(model => {
            const opt = document.createElement('option');
            opt.value = model;
            opt.textContent = model.split('/').pop() || model;
            uiModelSelect.appendChild(opt);
        });

        if (appConfig.last_used_model && (appConfig.models || []).includes(appConfig.last_used_model)) {
            uiModelSelect.value = appConfig.last_used_model;
        } else if (appConfig.models && appConfig.models.length > 0) {
            uiModelSelect.value = appConfig.models[0];
            appConfig.last_used_model = appConfig.models[0];
            saveConfigPartial({ last_used_model: appConfig.last_used_model });
        }
    }

    async function saveConfigPartial(data) {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    // =====================================================================
    // Modal Events
    // =====================================================================
    userProfileBtn.addEventListener('click', () => {
        updateConfigUI();
        settingsModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });

    saveSettingsBtn.addEventListener('click', async () => {
        const newApiKey = settingsApiKey.value.trim();
        const newSystemPrompt = settingsSystemPrompt.value.trim();
        const modelsRaw = settingsModels.value.split('\n').map(m => m.trim()).filter(m => m);

        appConfig.api_key = newApiKey;
        appConfig.system_prompt = newSystemPrompt;
        appConfig.models = modelsRaw;

        if (!appConfig.models.includes(appConfig.last_used_model) && appConfig.models.length > 0) {
            appConfig.last_used_model = appConfig.models[0];
        }

        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = 'Saving...';
        saveSettingsBtn.disabled = true;

        await saveConfigPartial({
            api_key: appConfig.api_key,
            system_prompt: appConfig.system_prompt,
            models: appConfig.models,
            last_used_model: appConfig.last_used_model
        });

        saveSettingsBtn.textContent = originalText;
        saveSettingsBtn.disabled = false;

        updateConfigUI();
        settingsModal.classList.remove('active');
    });

    // Dropdown Event
    uiModelSelect.addEventListener('change', () => {
        appConfig.last_used_model = uiModelSelect.value;
        saveConfigPartial({ last_used_model: appConfig.last_used_model });
    });

    // =====================================================================
    // Conversation CRUD
    // =====================================================================

    async function loadConversations() {
        try {
            const res = await fetch('/api/conversations');
            if (res.ok) {
                conversations = await res.json();
                renderConversationList();
            }
        } catch (err) {
            console.error('Error loading conversations:', err);
        }
    }

    function renderConversationList() {
        conversationList.innerHTML = '';

        conversations.forEach(convo => {
            const item = document.createElement('div');
            item.className = 'conv-item';
            item.dataset.id = convo.id;

            if (convo.is_pinned) item.classList.add('pinned');
            if (convo.id === currentConversationId) item.classList.add('active');

            // Pin icon
            const pinIcon = document.createElement('span');
            pinIcon.className = 'conv-pin-icon';
            pinIcon.textContent = '📌';

            // Title
            const title = document.createElement('span');
            title.className = 'conv-title';
            title.textContent = convo.title || `Chat ${convo.id}`;

            // 3-dot button
            const menuBtn = document.createElement('button');
            menuBtn.className = 'conv-menu-btn';
            menuBtn.innerHTML = '⋮';
            menuBtn.title = 'More options';

            // Click on item → load that conversation
            item.addEventListener('click', (e) => {
                if (e.target === menuBtn || e.target.closest('.conv-menu-btn')) return;
                selectConversation(convo.id);
            });

            // Click on 3-dot → open context menu
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openContextMenu(e, convo.id);
            });

            item.appendChild(pinIcon);
            item.appendChild(title);
            item.appendChild(menuBtn);
            conversationList.appendChild(item);
        });
    }

    async function selectConversation(id) {
        currentConversationId = id;
        highlightActiveConversation();
        highlightNavNewChat(false);
        await loadMessages(id);
    }

    function highlightActiveConversation() {
        document.querySelectorAll('.conv-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.id) === currentConversationId);
        });
    }

    function highlightNavNewChat(active) {
        if (navNewChat) {
            navNewChat.classList.toggle('active', active);
        }
    }

    async function loadMessages(convoId) {
        try {
            const res = await fetch(`/api/conversations/${convoId}/messages`);
            if (!res.ok) throw new Error('Failed to load messages');
            const messages = await res.json();

            // Build tree state
            messagesMap = {};
            messageChildren = { null: [] };
            activeBranch = {};

            messages.forEach(msg => {
                messagesMap[msg.id] = msg;
                const pId = msg.parent_id || null;
                if (!messageChildren[pId]) messageChildren[pId] = [];
                messageChildren[pId].push(msg.id);
            });

            // Initialize activeBranch to always point to the most recent child (by highest id, representing latest created in sequential load)
            for (const [pId, children] of Object.entries(messageChildren)) {
                if (children.length > 0) {
                    activeBranch[pId] = children[children.length - 1]; // last one is the latest
                }
            }

            renderChat();

        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }

    function renderChat() {
        chatHistory.innerHTML = '';

        let currentMsgId = activeBranch['null'];
        const activePath = [];

        while (currentMsgId) {
            const msg = messagesMap[currentMsgId];
            if (!msg) break;
            activePath.push(msg);
            currentMsgId = activeBranch[currentMsgId];
        }

        if (activePath.length === 0) {
            chatHistory.classList.add('empty');
            // Re-add hero
            chatHistory.innerHTML = `
                <div class="hero" id="hero-logo">
                    <svg class="pixel-c-logo" viewBox="0 0 5 5" width="150" height="150">
                        <defs>
                            <linearGradient id="camelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="#e32636" />
                                <stop offset="100%" stop-color="#ffcc00" />
                            </linearGradient>
                        </defs>
                        <g fill="url(#camelGradient)">
                            <rect x="1" y="0" width="4" height="1"/>
                            <rect x="0" y="1" width="1" height="1"/>
                            <rect x="0" y="2" width="1" height="1"/>
                            <rect x="0" y="3" width="1" height="1"/>
                            <rect x="1" y="4" width="4" height="1"/>
                            <rect x="4" y="1" width="1" height="1"/>
                            <rect x="4" y="3" width="1" height="1"/>
                        </g>
                    </svg>
                </div>
            `;
        } else {
            chatHistory.classList.remove('empty');
            activePath.forEach(msg => {
                if (msg.role === 'user') {
                    addMessage('User', msg.content, 'user', null, null, null, msg.id, msg.parent_id);
                } else {
                    const displayName = msg.formatted_model_name || 'Assistant';
                    addMessage('AI', msg.content, 'ai', msg.reasoning, displayName, msg.timestamp, msg.id, msg.parent_id);
                }
            });
        }
    }

    async function createConversation() {
        try {
            const res = await fetch('/api/conversations', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to create conversation');
            const convo = await res.json();
            currentConversationId = convo.id;
            conversations.unshift(convo);
            renderConversationList();
            highlightNavNewChat(false);
            return convo;
        } catch (err) {
            console.error('Error creating conversation:', err);
            return null;
        }
    }

    async function updateConversation(id, data) {
        try {
            const res = await fetch(`/api/conversations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update conversation');
            const updated = await res.json();
            // Update local cache
            const idx = conversations.findIndex(c => c.id === id);
            if (idx !== -1) conversations[idx] = updated;
            // Re-sort: pinned first, then by created_at desc
            conversations.sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            renderConversationList();
            return updated;
        } catch (err) {
            console.error('Error updating conversation:', err);
            return null;
        }
    }

    async function deleteConversation(id) {
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete conversation');
            conversations = conversations.filter(c => c.id !== id);
            renderConversationList();
            // If we deleted the active conversation, reset
            if (currentConversationId === id) {
                startNewChat();
            }
        } catch (err) {
            console.error('Error deleting conversation:', err);
        }
    }

    // =====================================================================
    // Context Menu
    // =====================================================================

    function openContextMenu(e, convoId) {
        contextMenuConvoId = convoId;
        const convo = conversations.find(c => c.id === convoId);

        // Update pin label
        const pinItem = contextMenu.querySelector('[data-action="pin"] span');
        if (pinItem) {
            pinItem.textContent = convo && convo.is_pinned ? 'Unpin' : 'Pin';
        }

        // Make the 3-dot btn stay visible
        document.querySelectorAll('.conv-menu-btn.visible').forEach(b => b.classList.remove('visible'));
        const btn = e.currentTarget;
        btn.classList.add('visible');

        // Position the menu
        const rect = btn.getBoundingClientRect();
        contextMenu.style.top = `${rect.bottom + 4}px`;
        contextMenu.style.left = `${rect.left - 120}px`;

        // Ensure it stays on-screen
        contextMenu.classList.add('visible');
        const menuRect = contextMenu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            contextMenu.style.left = `${window.innerWidth - menuRect.width - 8}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
            contextMenu.style.top = `${rect.top - menuRect.height - 4}px`;
        }
    }

    function closeContextMenu() {
        contextMenu.classList.remove('visible');
        contextMenuConvoId = null;
        document.querySelectorAll('.conv-menu-btn.visible').forEach(b => b.classList.remove('visible'));
    }

    // Close context menu on outside click
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target) && !e.target.closest('.conv-menu-btn')) {
            closeContextMenu();
        }
    });

    // Context menu actions
    contextMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('.context-menu-item');
        if (!btn || !contextMenuConvoId) return;

        const action = btn.dataset.action;
        const id = contextMenuConvoId;
        closeContextMenu();

        if (action === 'pin') {
            const convo = conversations.find(c => c.id === id);
            if (convo) {
                updateConversation(id, { is_pinned: !convo.is_pinned });
            }
        } else if (action === 'edit') {
            startInlineEdit(id);
        } else if (action === 'delete') {
            deleteConversation(id);
        }
    });

    function startInlineEdit(convoId) {
        const item = conversationList.querySelector(`.conv-item[data-id="${convoId}"]`);
        if (!item) return;

        const titleSpan = item.querySelector('.conv-title');
        const currentTitle = titleSpan.textContent;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'conv-title-input';
        input.value = currentTitle;

        titleSpan.replaceWith(input);
        input.focus();
        input.select();

        function saveEdit() {
            const newTitle = input.value.trim() || currentTitle;
            const newSpan = document.createElement('span');
            newSpan.className = 'conv-title';
            newSpan.textContent = newTitle;
            input.replaceWith(newSpan);

            if (newTitle !== currentTitle) {
                updateConversation(convoId, { title: newTitle });
            }
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                const newSpan = document.createElement('span');
                newSpan.className = 'conv-title';
                newSpan.textContent = currentTitle;
                input.replaceWith(newSpan);
            }
        });

        input.addEventListener('blur', saveEdit);
    }

    // =====================================================================
    // New Chat
    // =====================================================================

    function startNewChat() {
        currentConversationId = null;
        messagesMap = {};
        messageChildren = { null: [] };
        activeBranch = {};

        highlightActiveConversation();
        highlightNavNewChat(true);

        // Reset chat area
        chatHistory.classList.add('empty');
        chatHistory.innerHTML = `
            <div class="hero" id="hero-logo">
                <svg class="pixel-c-logo" viewBox="0 0 5 5" width="150" height="150">
                    <defs>
                        <linearGradient id="camelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#e32636" />
                            <stop offset="100%" stop-color="#ffcc00" />
                        </linearGradient>
                    </defs>
                    <g fill="url(#camelGradient)">
                        <rect x="1" y="0" width="4" height="1"/>
                        <rect x="0" y="1" width="1" height="1"/>
                        <rect x="0" y="2" width="1" height="1"/>
                        <rect x="0" y="3" width="1" height="1"/>
                        <rect x="1" y="4" width="4" height="1"/>
                        <rect x="4" y="1" width="1" height="1"/>
                        <rect x="4" y="3" width="1" height="1"/>
                    </g>
                </svg>
            </div>
        `;

        userInput.focus();
    }

    // New Chat — sidebar nav item
    if (navNewChat) {
        navNewChat.addEventListener('click', (e) => {
            e.preventDefault();
            startNewChat();
        });
    }

    // New Chat — top-right button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            startNewChat();
        });
    }

    // =====================================================================
    // Chat Input
    // =====================================================================

    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value === '') {
            this.style.height = 'auto';
        }
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isGenerating) {
                sendMessage();
            }
        }
    });

    let isGenerating = false;
    let currentAbortController = null;

    function setGeneratingState(generating) {
        isGenerating = generating;
        if (generating) {
            sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>';
            sendBtn.classList.add('stop-btn');
        } else {
            sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
            sendBtn.classList.remove('stop-btn');
        }
    }

    sendBtn.addEventListener('click', () => {
        if (isGenerating) {
            if (currentAbortController) {
                currentAbortController.abort();
            }
        } else {
            sendMessage();
        }
    });

    // =====================================================================
    // Send Message (with persistence)
    // =====================================================================

    async function sendMessage() {
        const apiKey = appConfig.api_key;
        const modelName = appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603';
        const message = userInput.value.trim();

        if (!apiKey) {
            addMessage('System', 'Please enter your NanoGPT API Key in the settings (click bottom-left profile).', 'error');
            return;
        }

        if (!message) return;

        // Auto-create conversation if none active
        if (!currentConversationId) {
            const convo = await createConversation();
            if (!convo) {
                addMessage('System', 'Failed to create conversation.', 'error');
                return;
            }
        }

        // Find the leaf of the active branch to be the parent
        let currentParentId = activeBranch['null'] || null;
        while (currentParentId && activeBranch[currentParentId]) {
            currentParentId = activeBranch[currentParentId];
        }

        chatHistory.classList.remove('empty');
        // Render optimistically
        addMessage('User', message, 'user', null, null, null, 'temp-user', currentParentId);

        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.focus();

        const thinkingId = addThinkingIndicator();
        setGeneratingState(true);
        currentAbortController = new AbortController();

        try {
            // 1. Save user message to DB
            const userRes = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_id: currentConversationId,
                    parent_id: currentParentId,
                    role: 'user',
                    content: message
                })
            });
            if (!userRes.ok) throw new Error('Failed to save user message');
            const savedUserMsg = await userRes.json();

            // Re-render optimistically the new node
            const tempUserMsg = document.querySelector('.message[data-id="temp-user"]');
            if (tempUserMsg) tempUserMsg.dataset.id = savedUserMsg.id;

            // Update state
            messagesMap[savedUserMsg.id] = savedUserMsg;
            if (!messageChildren[currentParentId]) messageChildren[currentParentId] = [];
            messageChildren[currentParentId].push(savedUserMsg.id);
            activeBranch[currentParentId] = savedUserMsg.id;

            // 2. Stream AI reply
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: currentAbortController.signal,
                body: JSON.stringify({
                    api_key: apiKey,
                    model_name: modelName,
                    conversation_id: currentConversationId,
                    parent_id: savedUserMsg.id,
                    system_prompt: appConfig.system_prompt
                })
            });

            removeElement(thinkingId);

            if (!response.ok) {
                let errorMsg = 'Unknown error occurred on backend';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { }
                throw new Error(errorMsg);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;

            const streamMsg = addStreamingMessage(savedUserMsg.id);
            let fullText = '';
            let fullReasoning = '';
            let buffer = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6).trim();
                            if (dataStr === '[DONE]') continue;
                            if (!dataStr) continue;

                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.done && parsed.message_id) {
                                    streamMsg.finalize(parsed.message_id, fullText);

                                    // Make sure tree state is updated
                                    messagesMap[parsed.message_id] = {
                                        id: parsed.message_id,
                                        parent_id: savedUserMsg.id,
                                        role: 'assistant',
                                        content: fullText,
                                        model_name: appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603',
                                        timestamp: new Date().toISOString()
                                    };

                                    if (!messageChildren[savedUserMsg.id]) messageChildren[savedUserMsg.id] = [];
                                    messageChildren[savedUserMsg.id].push(parsed.message_id);
                                    activeBranch[savedUserMsg.id] = parsed.message_id;
                                    renderChat();
                                    continue;
                                }
                                if (parsed.choices && parsed.choices.length > 0) {
                                    const delta = parsed.choices[0].delta || {};

                                    if (delta.reasoning) fullReasoning += delta.reasoning;
                                    if (delta.content) fullText += delta.content;

                                    const msgObj = parsed.choices[0].message || {};
                                    if (msgObj.reasoning && !delta.reasoning && fullReasoning.length === 0) fullReasoning = msgObj.reasoning;
                                    if (msgObj.content && !delta.content && fullText.length === 0) fullText = msgObj.content;

                                    streamMsg.update(fullText, fullReasoning);
                                }
                            } catch (e) {
                                console.warn('Error parsing SSE line:', dataStr, e);
                            }
                        }
                    }
                }
            }

            // Refresh sidebar to reflect the conversation
            await loadConversations();

        } catch (error) {
            removeElement(thinkingId);
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
                setTimeout(() => {
                    if (currentConversationId) loadMessages(currentConversationId);
                }, 500);
            } else {
                addMessage('System', `Error: ${error.message}`, 'error');
            }
        } finally {
            setGeneratingState(false);
            currentAbortController = null;
        }
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    function formatModelName(rawModel) {
        if (!rawModel) return 'Assistant';
        let slug = rawModel.includes('/') ? rawModel.split('/').pop() : rawModel;
        const isThinking = slug.toLowerCase().includes('thinking');
        // Normalize colons to hyphens (e.g. kimi-k2.5:thinking)
        slug = slug.replace(/:/g, '-');
        // Strip trailing date codes
        slug = slug.replace(/-\d{4,}$/, '');
        // Remove thinking/instruct tokens
        slug = slug.replace(/-?thinking-?/gi, '-');
        slug = slug.replace(/-?instruct-?/gi, '-');
        // Remove parameter count like 119b, 70b
        slug = slug.replace(/-?\d+b-?/gi, '-');
        // Clean up hyphens
        slug = slug.replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
        if (!slug) return 'Assistant';
        let nice = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        if (isThinking) nice += ' (Thinking)';
        return nice;
    }

    function formatTimestamp(isoString) {
        if (!isoString) return '';
        // If it already has a timezone indicator (Z or +HH:mm), don't append Z
        const dateStr = isoString.endsWith('Z') || isoString.includes('+') || isoString.match(/-\d{2}:\d{2}$/)
            ? isoString
            : isoString + 'Z';
        const d = new Date(dateStr);
        return d.toLocaleString(undefined, {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // =====================================================================
    // Message Rendering
    // =====================================================================

    function addMessage(sender, text, type, reasoning = null, modelDisplayName = null, timestamp = null, msgId = null, parentId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        if (msgId) messageDiv.dataset.id = msgId;
        if (parentId) messageDiv.dataset.parentId = parentId;

        // Check for siblings to render the branch navigator
        const pId = parentId || null;
        const siblings = messageChildren[pId] || [];
        const currentIndex = siblings.indexOf(msgId);

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('message-header');

        if (type === 'ai') {
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('message-model-name');
            nameSpan.textContent = modelDisplayName || 'Assistant';
            headerDiv.appendChild(nameSpan);
            if (timestamp) {
                const sep = document.createElement('span');
                sep.classList.add('message-header-sep');
                sep.textContent = ' · ';
                headerDiv.appendChild(sep);
                const timeSpan = document.createElement('span');
                timeSpan.classList.add('message-timestamp');
                timeSpan.textContent = formatTimestamp(timestamp);
                headerDiv.appendChild(timeSpan);
            }
        }

        if (type === 'ai' || (type === 'user' && siblings.length > 1)) {
            messageDiv.appendChild(headerDiv);
        }

        // Branch Navigator
        if (msgId && siblings.length > 1) {
            const navigatorDiv = document.createElement('div');
            navigatorDiv.classList.add('branch-navigator');

            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
            prevBtn.disabled = currentIndex === 0;
            prevBtn.onclick = () => {
                if (currentIndex > 0) {
                    activeBranch[pId] = siblings[currentIndex - 1];
                    renderChat();
                }
            };

            const countSpan = document.createElement('span');
            countSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M22 2l-4.5 4.5"/></svg> ${currentIndex + 1} of ${siblings.length}`;

            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
            nextBtn.disabled = currentIndex === siblings.length - 1;
            nextBtn.onclick = () => {
                if (currentIndex < siblings.length - 1) {
                    activeBranch[pId] = siblings[currentIndex + 1];
                    renderChat();
                }
            };

            navigatorDiv.appendChild(prevBtn);
            navigatorDiv.appendChild(countSpan);
            navigatorDiv.appendChild(nextBtn);
            messageDiv.appendChild(navigatorDiv);
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        let contentHtml = '';

        if (type === 'ai' && reasoning) {
            const escapedReasoning = reasoning.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
            contentHtml += `
                <details class="reasoning-box">
                    <summary>💭 Thought Process</summary>
                    <div class="reasoning-content">${escapedReasoning}</div>
                </details>
            `;
        }

        if (type === 'user' || type === 'ai') {
            const escapedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            contentHtml += escapedText.replace(/\n/g, '<br>');
            contentDiv.innerHTML = contentHtml;
        } else {
            contentDiv.textContent = text;
        }

        messageDiv.appendChild(contentDiv);
        
        messageDiv.dataset.rawText = text;
        const actionBar = createActionBar(messageDiv, type);
        messageDiv.appendChild(actionBar);

        chatHistory.appendChild(messageDiv);
        scrollToBottom();
    }

    function addStreamingMessage(parentId) {
        const modelName = appConfig.last_used_model || '';
        const displayName = formatModelName(modelName);
        const now = new Date();
        const timeStr = now.toLocaleString(undefined, {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai');
        if (parentId) messageDiv.dataset.parentId = parentId;

        // Check siblings
        const pId = parentId || null;
        let sibCount = (messageChildren[pId] || []).length;
        // Assume this new streaming message is the latest child
        sibCount += 1;

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('message-header');
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('message-model-name');
        nameSpan.textContent = displayName;
        headerDiv.appendChild(nameSpan);
        const sep = document.createElement('span');
        sep.classList.add('message-header-sep');
        sep.textContent = ' · ';
        headerDiv.appendChild(sep);
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-timestamp');
        timeSpan.textContent = timeStr;
        headerDiv.appendChild(timeSpan);
        messageDiv.appendChild(headerDiv);

        if (sibCount > 1) {
            const navigatorDiv = document.createElement('div');
            navigatorDiv.classList.add('branch-navigator');

            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
            prevBtn.disabled = false; // it will be at the end, so prev is possible

            const countSpan = document.createElement('span');
            countSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M22 2l-4.5 4.5"/></svg> ${sibCount} of ${sibCount}`;

            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
            nextBtn.disabled = true; // it is the last one

            navigatorDiv.appendChild(prevBtn);
            navigatorDiv.appendChild(countSpan);
            navigatorDiv.appendChild(nextBtn);
            messageDiv.appendChild(navigatorDiv);
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        messageDiv.appendChild(contentDiv);
        chatHistory.appendChild(messageDiv);
        scrollToBottom();

        return {
            update: (text, reasoning) => {
                let contentHtml = '';

                if (reasoning) {
                    const escapedReasoning = reasoning.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
                    contentHtml += `
                        <details class="reasoning-box" ${text ? '' : 'open'}>
                            <summary>💭 Thought Process</summary>
                            <div class="reasoning-content">${escapedReasoning}</div>
                        </details>
                    `;
                }

                if (text) {
                    const escapedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    contentHtml += escapedText.replace(/\n/g, '<br>');
                }

                if (!text && !reasoning) {
                    contentHtml = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
                }

                contentDiv.innerHTML = contentHtml;
                scrollToBottom();
            },
            finalize: (msgId, finalRawText) => {
                messageDiv.dataset.id = msgId;
                messageDiv.dataset.rawText = finalRawText;
                const actionBar = createActionBar(messageDiv, 'ai');
                messageDiv.appendChild(actionBar);
            }
        };
    }

    function addThinkingIndicator() {
        const id = 'thinking-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai');
        messageDiv.id = id;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content', 'typing-indicator');

        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.classList.add('typing-dot');
            contentDiv.appendChild(dot);
        }

        messageDiv.appendChild(contentDiv);
        chatHistory.appendChild(messageDiv);
        scrollToBottom();

        return id;
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // =====================================================================
    // Action Bar Handlers (Retry, Copy, Edit)
    // =====================================================================

    function createActionBar(messageDiv, type) {
        const actionBar = document.createElement('div');
        actionBar.className = 'message-actions';

        if (type === 'ai') {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'message-action-btn retry-btn';
            retryBtn.title = 'Retry';
            retryBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>';
            retryBtn.addEventListener('click', () => handleRetry(messageDiv));

            const copyBtn = document.createElement('button');
            copyBtn.className = 'message-action-btn copy-btn';
            copyBtn.title = 'Copy';
            copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            copyBtn.addEventListener('click', () => handleCopy(copyBtn, messageDiv.dataset.rawText));

            const editBtn = document.createElement('button');
            editBtn.className = 'message-action-btn edit-btn';
            editBtn.title = 'Edit';
            editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            editBtn.addEventListener('click', () => handleEdit(messageDiv));

            actionBar.appendChild(retryBtn);
            actionBar.appendChild(copyBtn);
            actionBar.appendChild(editBtn);
        } else if (type === 'user') {
            const resendBtn = document.createElement('button');
            resendBtn.className = 'message-action-btn resend-btn';
            resendBtn.title = 'Resend';
            resendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>';
            resendBtn.addEventListener('click', () => handleResendUserMessage(messageDiv));

            const editBtn = document.createElement('button');
            editBtn.className = 'message-action-btn edit-btn';
            editBtn.title = 'Edit';
            editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            editBtn.addEventListener('click', () => handleEdit(messageDiv));

            actionBar.appendChild(resendBtn);
            actionBar.appendChild(editBtn);
            actionBar.style.justifyContent = 'flex-end';
        }

        return actionBar;
    }

    async function handleCopy(btn, textToCopy) {
        try {
            await navigator.clipboard.writeText(textToCopy || '');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }

    async function handleResendUserMessage(messageDiv) {
        // Now resend user message just means "generate another child from this user message"
        const msgId = messageDiv.dataset.id;
        const parentIdStr = messageDiv.dataset.parentId;
        const parentId = parentIdStr && parentIdStr !== 'null' ? parseInt(parentIdStr) : null;

        if (!msgId || !currentConversationId) return;
        const msgIdInt = parseInt(msgId);

        const apiKey = appConfig.api_key;
        if (!apiKey) {
            addMessage('System', 'Please enter your NanoGPT API Key in the settings.', 'error');
            return;
        }

        try {
            // Unset active branch so that when renderChat is called it only renders up to the user message
            activeBranch[msgIdInt] = null;
            renderChat();

            const thinkingId = addThinkingIndicator();
            setGeneratingState(true);
            currentAbortController = new AbortController();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: currentAbortController.signal,
                body: JSON.stringify({
                    api_key: apiKey,
                    model_name: appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603',
                    conversation_id: currentConversationId,
                    parent_id: msgIdInt,
                    system_prompt: appConfig.system_prompt
                })
            });

            removeElement(thinkingId);

            if (!response.ok) {
                let errorMsg = 'Unknown error occurred on backend';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;

            // This creates a new streaming node whose parent is the User message
            const streamMsg = addStreamingMessage(msgIdInt);
            let fullText = '';
            let fullReasoning = '';
            let buffer = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6).trim();
                            if (dataStr === '[DONE]') continue;
                            if (!dataStr) continue;

                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.done && parsed.message_id) {
                                    streamMsg.finalize(parsed.message_id, fullText);

                                    messagesMap[parsed.message_id] = {
                                        id: parsed.message_id,
                                        parent_id: msgIdInt,
                                        role: 'assistant',
                                        content: fullText,
                                        model_name: appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603',
                                        timestamp: new Date().toISOString()
                                    };

                                    if (!messageChildren[msgIdInt]) messageChildren[msgIdInt] = [];
                                    messageChildren[msgIdInt].push(parsed.message_id);
                                    activeBranch[msgIdInt] = parsed.message_id;
                                    renderChat();
                                    continue;
                                }
                                if (parsed.choices && parsed.choices.length > 0) {
                                    const delta = parsed.choices[0].delta || {};

                                    if (delta.reasoning) fullReasoning += delta.reasoning;
                                    if (delta.content) fullText += delta.content;

                                    const msgObj = parsed.choices[0].message || {};
                                    if (msgObj.reasoning && !delta.reasoning && fullReasoning.length === 0) {
                                        fullReasoning = msgObj.reasoning;
                                    }
                                    if (msgObj.content && !delta.content && fullText.length === 0) {
                                        fullText = msgObj.content;
                                    }

                                    streamMsg.update(fullText, fullReasoning);
                                }
                            } catch (e) { }
                        }
                    }
                }
            }
            await loadConversations();
        } catch (err) {
            removeElement(thinkingId);
            if (err.name === 'AbortError') {
                console.log('Generation stopped by user (retry)');
                setTimeout(() => {
                    if (currentConversationId) loadMessages(currentConversationId);
                }, 500);
            } else {
                addMessage('System', `Error: ${err.message}`, 'error');
            }
        } finally {
            setGeneratingState(false);
            currentAbortController = null;
        }
    }

    async function handleRetry(messageDiv) {
        // Retry AI message means "generate a sibling AI response (from the AI message's parent)"
        const msgId = messageDiv.dataset.id;
        const parentIdStr = messageDiv.dataset.parentId;
        const parentId = parentIdStr && parentIdStr !== 'null' ? parseInt(parentIdStr) : null;

        if (!msgId || !currentConversationId) return;
        const msgIdInt = parseInt(msgId);

        const apiKey = appConfig.api_key;
        if (!apiKey) return;

        try {
            // Ensure the chat is rendered up to the parent message so that it clears the active visual tree below
            activeBranch[parentId] = null;
            renderChat();

            const thinkingId = addThinkingIndicator();
            setGeneratingState(true);
            currentAbortController = new AbortController();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: currentAbortController.signal,
                body: JSON.stringify({
                    api_key: apiKey,
                    model_name: appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603',
                    conversation_id: currentConversationId,
                    parent_id: parentId, // We use the parent (the user message) to generate a sibling
                    system_prompt: appConfig.system_prompt
                })
            });

            removeElement(thinkingId);
            if (!response.ok) throw new Error('Regenerate failed');

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;

            const streamMsg = addStreamingMessage(parentId);
            let fullText = '';
            let fullReasoning = '';
            let buffer = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6).trim();
                            if (dataStr === '[DONE]') continue;
                            if (!dataStr) continue;
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.done && parsed.message_id) {
                                    streamMsg.finalize(parsed.message_id, fullText);

                                    messagesMap[parsed.message_id] = {
                                        id: parsed.message_id,
                                        parent_id: parentId,
                                        role: 'assistant',
                                        content: fullText,
                                        model_name: appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603',
                                        timestamp: new Date().toISOString()
                                    };

                                    if (!messageChildren[parentId]) messageChildren[parentId] = [];
                                    messageChildren[parentId].push(parsed.message_id);
                                    activeBranch[parentId] = parsed.message_id;
                                    renderChat();
                                    continue;
                                }
                                if (parsed.choices && parsed.choices.length > 0) {
                                    const delta = parsed.choices[0].delta || {};
                                    if (delta.reasoning) fullReasoning += delta.reasoning;
                                    if (delta.content) fullText += delta.content;
                                    const msgObj = parsed.choices[0].message || {};
                                    if (msgObj.reasoning && !delta.reasoning && fullReasoning.length === 0) fullReasoning = msgObj.reasoning;
                                    if (msgObj.content && !delta.content && fullText.length === 0) fullText = msgObj.content;
                                    streamMsg.update(fullText, fullReasoning);
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
            await loadConversations();
        } catch (err) {
            removeElement(thinkingId);
            if (err.name === 'AbortError') {
                console.log('Generation stopped by user (retry)');
                setTimeout(() => {
                    if (currentConversationId) loadMessages(currentConversationId);
                }, 500);
            } else {
                addMessage('System', `Error: ${err.message}`, 'error');
            }
        } finally {
            setGeneratingState(false);
            currentAbortController = null;
        }
    }

    function handleEdit(messageDiv) {
        const msgId = messageDiv.dataset.id;
        const msgIdInt = parseInt(msgId);
        const parentIdStr = messageDiv.dataset.parentId;
        const parentId = parentIdStr && parentIdStr !== 'null' ? parseInt(parentIdStr) : null;
        const isUser = messageDiv.classList.contains('user');

        if (!msgId) return;

        const contentDiv = messageDiv.querySelector('.message-content');
        const actionBar = messageDiv.querySelector('.message-actions');
        
        let originalText = messageDiv.dataset.rawText || '';

        // Hide original content and action bar
        const childrenNodesArray = Array.from(contentDiv.childNodes);
        childrenNodesArray.forEach(child => {
            if(child.nodeType !== Node.ELEMENT_NODE || !child.classList.contains('reasoning-box')) {
                if(child.style) child.style.display = 'none';
                else if(child.nodeType === Node.TEXT_NODE) child.textContent = '';
            }
        });
        if (actionBar) actionBar.style.display = 'none';

        const editContainer = document.createElement('div');
        editContainer.className = 'message-edit-area';

        const textarea = document.createElement('textarea');
        textarea.className = 'message-edit-textarea';
        textarea.value = originalText;

        const controls = document.createElement('div');
        controls.className = 'message-edit-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn gradient-btn';
        saveBtn.textContent = 'Save';

        controls.appendChild(cancelBtn);
        controls.appendChild(saveBtn);

        editContainer.appendChild(textarea);
        editContainer.appendChild(controls);
        contentDiv.appendChild(editContainer);

        textarea.focus();

        const closeEdit = () => {
            editContainer.remove();
            if (actionBar) actionBar.style.display = 'flex';
            // re-render the content area properly by triggering a re-render from data
            renderContentNode(contentDiv, messageDiv.dataset.rawText, contentDiv.querySelector('.reasoning-box'));
        };

        cancelBtn.addEventListener('click', closeEdit);

        saveBtn.addEventListener('click', async () => {
            const newText = textarea.value.trim();
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            try {
                // Post as a NEW message sibling
                const res = await fetch(`/api/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversation_id: currentConversationId,
                        parent_id: parentId,
                        role: isUser ? 'user' : 'assistant',
                        content: newText,
                        model_name: isUser ? null : appConfig.last_used_model
                    })
                });

                if (res.ok) {
                    const newMsgObj = await res.json();

                    // Update tree structure
                    messagesMap[newMsgObj.id] = newMsgObj;
                    if (!messageChildren[parentId]) messageChildren[parentId] = [];
                    messageChildren[parentId].push(newMsgObj.id);
                    activeBranch[parentId] = newMsgObj.id;

                    closeEdit();
                    renderChat(); // Render it to show the new node instead of old one

                    // If it was a user message, auto-trigger a response
                    if (isUser) {
                        const apiKey = appConfig.api_key;
                        if (!apiKey) {
                            addMessage('System', 'Please enter your NanoGPT API Key in the settings.', 'error');
                            return;
                        }

                        const thinkingId = addThinkingIndicator();
                        setGeneratingState(true);
                        currentAbortController = new AbortController();

                        try {
                            const aiRes = await fetch('/api/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                signal: currentAbortController.signal,
                                body: JSON.stringify({
                                    api_key: apiKey,
                                    model_name: appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603',
                                    conversation_id: currentConversationId,
                                    parent_id: newMsgObj.id,
                                    system_prompt: appConfig.system_prompt
                                })
                            });

                            removeElement(thinkingId);
                            if (!aiRes.ok) throw new Error('Regenerate failed');

                            const reader = aiRes.body.getReader();
                            const decoder = new TextDecoder("utf-8");
                            let done = false;

                            const streamMsg = addStreamingMessage(newMsgObj.id);
                            let fullText = '';
                            let fullReasoning = '';
                            let buffer = '';

                            while (!done) {
                                const { value, done: readerDone } = await reader.read();
                                done = readerDone;
                                if (value) {
                                    buffer += decoder.decode(value, { stream: true });
                                    const lines = buffer.split('\n');
                                    buffer = lines.pop();
                                    for (const line of lines) {
                                        if (line.startsWith('data: ')) {
                                            const dataStr = line.substring(6).trim();
                                            if (dataStr === '[DONE]') continue;
                                            if (!dataStr) continue;
                                            try {
                                                const parsed = JSON.parse(dataStr);
                                                if (parsed.done && parsed.message_id) {
                                                    streamMsg.finalize(parsed.message_id, fullText);

                                                    messagesMap[parsed.message_id] = {
                                                        id: parsed.message_id,
                                                        parent_id: newMsgObj.id,
                                                        role: 'assistant',
                                                        content: fullText,
                                                        model_name: appConfig.last_used_model || 'mistralai/mistral-small-4-119b-2603',
                                                        timestamp: new Date().toISOString()
                                                    };
                                                    if (!messageChildren[newMsgObj.id]) messageChildren[newMsgObj.id] = [];
                                                    messageChildren[newMsgObj.id].push(parsed.message_id);
                                                    activeBranch[newMsgObj.id] = parsed.message_id;
                                    renderChat();
                                    continue;
                                                }
                                                if (parsed.choices && parsed.choices.length > 0) {
                                                    const delta = parsed.choices[0].delta || {};
                                                    if (delta.reasoning) fullReasoning += delta.reasoning;
                                                    if (delta.content) fullText += delta.content;
                                                    const msgObj = parsed.choices[0].message || {};
                                                    if (msgObj.reasoning && !delta.reasoning && fullReasoning.length === 0) fullReasoning = msgObj.reasoning;
                                                    if (msgObj.content && !delta.content && fullText.length === 0) fullText = msgObj.content;
                                                    streamMsg.update(fullText, fullReasoning);
                                                }
                                            } catch (e) {}
                                        }
                                    }
                                }
                            }
                            await loadConversations();

                        } catch (err) {
                            removeElement(thinkingId);
                            if (err.name !== 'AbortError') {
                                addMessage('System', `Error: ${err.message}`, 'error');
                            }
                        } finally {
                            setGeneratingState(false);
                            currentAbortController = null;
                        }
                    } else {
                        await loadConversations();
                    }
                }
            } catch(e) {
                console.error(e);
                closeEdit();
            }
        });
    }

    function renderContentNode(contentDiv, newText, reasoningBoxEl) {
        contentDiv.innerHTML = '';
        if (reasoningBoxEl) {
            contentDiv.appendChild(reasoningBoxEl);
        }
        const escapedText = newText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const formatted = escapedText.replace(/\n/g, '<br>');
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = formatted;
        
        Array.from(wrapper.childNodes).forEach(node => contentDiv.appendChild(node));
    }

});
