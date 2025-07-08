// frontend/js/messages.js
document.addEventListener('DOMContentLoaded', function() {
    const threadsListDiv = document.getElementById('threadsList');
    const loadingThreadsMsg = document.getElementById('loadingThreadsMsg');

    const chatArea = document.getElementById('chatArea');
    const chatHeader = document.getElementById('chatHeader');
    const chatWithAvatar = document.getElementById('chatWithAvatar');
    const chatWithUsername = document.getElementById('chatWithUsername');
    const chatProjectContext = document.getElementById('chatProjectContext');
    const messagesContainer = document.getElementById('messagesContainer');
    const selectThreadMsg = document.getElementById('selectThreadMsg');
    const loadingMessagesMsg = document.getElementById('loadingMessagesMsg');

    const messageFormContainer = document.getElementById('messageFormContainer');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const sendMessageError = document.getElementById('sendMessageError');

    let currentChattingWithUserId = null;
    let currentChattingAboutProjectId = null;
    let currentUser = null; // Will be set by checkAuth

    function checkAuthAndInit() {
        currentUser = getCurrentUser(); // From auth_ui.js
        if (!currentUser) {
            window.location.href = 'login.html?redirect=messages.html';
            return;
        }
        // Update UI elements that depend on auth status (like navbar links)
        if (typeof updateNavBasedOnAuth === "function") updateNavBasedOnAuth();
        else if (logoutButton && typeof handleLogout === "function") logoutButton.addEventListener('click', handleLogout);

        fetchThreads();

        // Check URL params for pre-selected thread
        const urlParams = new URLSearchParams(window.location.search);
        const preselectUserId = urlParams.get('with_user_id');
        const preselectProjectId = urlParams.get('project_id');
        if (preselectUserId) {
            currentChattingWithUserId = parseInt(preselectUserId);
            currentChattingAboutProjectId = preselectProjectId ? parseInt(preselectProjectId) : null;
            // Fetch and display this specific thread's messages
            // Need to get username/avatar for header, then messages
            // This might require an extra call or smarter thread fetching
            loadAndDisplayThreadMessages(currentChattingWithUserId, currentChattingAboutProjectId, "کاربر", "frontend/images/default_avatar.png", null); // Placeholder name/avatar
        }

    }

    async function fetchThreads() {
        if (loadingThreadsMsg) loadingThreadsMsg.style.display = 'block';
        if (threadsListDiv) threadsListDiv.innerHTML = ''; // Clear previous
        try {
            const response = await fetch('backend/php/get_messages.php'); // No params = get threads
            const result = await response.json();
            if (loadingThreadsMsg) loadingThreadsMsg.style.display = 'none';

            if (result.success && result.threads) {
                displayThreads(result.threads);
            } else {
                threadsListDiv.innerHTML = `<p class="alert alert-warning p-3">${result.message || 'خطا در بارگذاری گفتگوها.'}</p>`;
            }
        } catch (error) {
            console.error('Error fetching threads:', error);
            if (loadingThreadsMsg) loadingThreadsMsg.style.display = 'none';
            threadsListDiv.innerHTML = '<p class="alert alert-danger p-3">خطا در ارتباط با سرور.</p>';
        }
    }

    function displayThreads(threads) {
        if (!threadsListDiv) return;
        threadsListDiv.innerHTML = ''; // Clear

        if (threads.length === 0) {
            threadsListDiv.innerHTML = '<p class="text-gray-500 text-center p-4">هیچ گفتگویی یافت نشد.</p>';
            return;
        }

        threads.forEach(thread => {
            const threadItem = document.createElement('div');
            threadItem.className = `flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors duration-150 ${
                thread.other_user_id == currentChattingWithUserId && (thread.project_id == currentChattingAboutProjectId || (thread.project_id === null && currentChattingAboutProjectId === null)) ? 'bg-blue-50 border-r-4 border-blue-500' : ''
            }`;
            threadItem.dataset.userId = thread.other_user_id;
            threadItem.dataset.projectId = thread.project_id || ''; // Store as string, handle null
            threadItem.dataset.username = thread.other_username;
            threadItem.dataset.avatar = thread.other_avatar_url;
            threadItem.dataset.projectTitle = thread.project_title || '';


            let projectInfoHtml = '';
            if (thread.project_title) {
                projectInfoHtml = `<span class="text-xs text-gray-400 block truncate group-hover:text-gray-500">پروژه: ${thread.project_title}</span>`;
            } else {
                projectInfoHtml = `<span class="text-xs text-gray-400 block italic">گفتگوی عمومی</span>`;
            }

            threadItem.innerHTML = `
                <img src="${thread.other_avatar_url}" alt="${thread.other_username}" class="w-10 h-10 rounded-full object-cover mr-3 ml-2 shadow-sm">
                <div class="flex-grow overflow-hidden">
                    <div class="flex justify-between items-center">
                        <h4 class="font-semibold text-gray-700 truncate group-hover:text-blue-600">${thread.other_username}</h4>
                        ${thread.unread_count > 0 ? `<span class="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">${thread.unread_count}</span>` : ''}
                    </div>
                    ${projectInfoHtml}
                    <p class="text-xs text-gray-500 truncate group-hover:text-gray-600">
                        ${thread.is_last_message_yours ? '<span class="text-blue-500">شما:</span> ' : ''}${thread.last_message_text}
                    </p>
                    <p class="text-xs text-gray-400 mt-0.5 group-hover:text-gray-500">${thread.last_message_sent_at_formatted}</p>
                </div>
            `;
            threadItem.addEventListener('click', function() {
                // Visually select this thread
                document.querySelectorAll('#threadsList > div').forEach(el => el.classList.remove('bg-blue-50', 'border-r-4', 'border-blue-500'));
                this.classList.add('bg-blue-50', 'border-r-4', 'border-blue-500');

                const userId = parseInt(this.dataset.userId);
                const projectIdStr = this.dataset.projectId;
                const projectId = projectIdStr ? parseInt(projectIdStr) : null;

                loadAndDisplayThreadMessages(userId, projectId, this.dataset.username, this.dataset.avatar, this.dataset.projectTitle);
            });
            threadsListDiv.appendChild(threadItem);
        });
    }

    async function loadAndDisplayThreadMessages(userId, projectId, username, avatarUrl, projectTitle) {
        currentChattingWithUserId = userId;
        currentChattingAboutProjectId = projectId;

        if (selectThreadMsg) selectThreadMsg.style.display = 'none';
        if (loadingMessagesMsg) loadingMessagesMsg.style.display = 'block';
        if (messagesContainer) messagesContainer.innerHTML = ''; // Clear previous messages

        if (chatHeader) {
            chatWithAvatar.src = avatarUrl;
            chatWithUsername.textContent = username;
            if (projectTitle) {
                chatProjectContext.textContent = `در مورد پروژه: ${projectTitle}`;
                chatProjectContext.classList.remove('hidden');
            } else {
                 chatProjectContext.classList.add('hidden');
            }
            chatHeader.classList.remove('hidden');
        }
        if (messageFormContainer) messageFormContainer.classList.remove('hidden');


        let query = `backend/php/get_messages.php?with_user_id=${userId}`;
        if (projectId !== null) { // Ensure projectId is not undefined
            query += `&project_id=${projectId}`;
        }

        try {
            const response = await fetch(query);
            const result = await response.json();
            if (loadingMessagesMsg) loadingMessagesMsg.style.display = 'none';

            if (result.success && result.messages) {
                displayMessages(result.messages);
                // Mark this thread as read in the sidebar if it had unread count
                const activeThreadEl = document.querySelector(`#threadsList > div[data-user-id='${userId}'][data-project-id='${projectId !== null ? projectId : ''}']`);
                if (activeThreadEl) {
                    const unreadBadge = activeThreadEl.querySelector('.bg-red-500');
                    if (unreadBadge) unreadBadge.remove();
                }
            } else {
                messagesContainer.innerHTML = `<p class="alert alert-warning p-3">${result.message || 'خطا در بارگذاری پیام‌ها.'}</p>`;
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            if (loadingMessagesMsg) loadingMessagesMsg.style.display = 'none';
            messagesContainer.innerHTML = '<p class="alert alert-danger p-3">خطا در ارتباط با سرور.</p>';
        }
    }

    function displayMessages(messages) {
        if (!messagesContainer) return;
        messagesContainer.innerHTML = ''; // Clear

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<p class="text-gray-400 text-center py-6">هنوز پیامی در این گفتگو وجود ندارد. اولین پیام را ارسال کنید!</p>';
            return;
        }

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-bubble mb-2 flex flex-col ${msg.sender_id == currentUser.user_id ? 'message-sent' : 'message-received'}`;

            const textP = document.createElement('p');
            textP.textContent = msg.message_text;

            const dateSpan = document.createElement('span');
            dateSpan.className = `text-xs mt-1 ${msg.sender_id == currentUser.user_id ? 'text-blue-200 self-end' : 'text-gray-500 self-start'}`;
            dateSpan.textContent = msg.sent_at_formatted;

            messageDiv.appendChild(textP);
            messageDiv.appendChild(dateSpan);
            messagesContainer.appendChild(messageDiv);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
    }

    if (messageForm) {
        const submitButton = messageForm.querySelector('button[type="submit"]');
        const originalButtonHtml = submitButton ? submitButton.innerHTML : 'ارسال';

        messageForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (!currentChattingWithUserId || !messageInput.value.trim()) return;

            if (sendMessageError) sendMessageError.textContent = '';
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="spinner-small inline-block"></div>'; // Smaller spinner
            }

            const messageData = {
                receiver_id: currentChattingWithUserId,
                message_text: messageInput.value.trim(),
                project_id: currentChattingAboutProjectId
                // csrf_token: '...' // If needed
            };

            try {
                const response = await fetch('backend/php/send_message.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messageData)
                });
                const result = await response.json();

                if (result.success && result.sent_message) {
                    messageInput.value = '';
                    // Add the new message to the UI
                    const newMsgData = result.sent_message;
                    newMsgData.sent_at_formatted = "همین الان"; // Or format server time
                    newMsgData.sender_avatar = currentUser.avatar_url || 'frontend/images/default_avatar.png'; // Assuming current user's avatar is available

                    appendMessageToUI(newMsgData);
                    // Optionally, update the thread list if this is a new conversation or to bring to top
                    fetchThreads();
                } else {
                    if(sendMessageError) sendMessageError.textContent = result.message || 'خطا در ارسال پیام.';
                }
            } catch (error) {
                console.error('Error sending message:', error);
                 if(sendMessageError) sendMessageError.textContent = 'خطا در ارتباط با سرور.';
            } finally {
                 if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonHtml;
                }
            }
        });
    }

    function appendMessageToUI(msg) {
        if (!messagesContainer) return;
        // Remove "no messages yet" placeholder if it exists
        const noMsgP = messagesContainer.querySelector('p.text-gray-400');
        if (noMsgP) noMsgP.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble mb-2 flex flex-col ${msg.sender_id == currentUser.user_id ? 'message-sent' : 'message-received'}`;

        const textP = document.createElement('p');
        textP.textContent = msg.message_text;

        const dateSpan = document.createElement('span');
        dateSpan.className = `text-xs mt-1 ${msg.sender_id == currentUser.user_id ? 'text-blue-200 self-end' : 'text-gray-500 self-start'}`;
        dateSpan.textContent = msg.sent_at_formatted || time_elapsed_string(msg.sent_at);

        messageDiv.appendChild(textP);
        messageDiv.appendChild(dateSpan);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }


    // Helper: Get current user from localStorage
    function getCurrentUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try { return JSON.parse(storedUser); } catch (e) { return null; }
        }
        return null;
    }
    // Helper for time_elapsed_string (simplified, or ensure it's globally available)
    if (typeof time_elapsed_string !== 'function') {
        window.time_elapsed_string = function(datetime) {
            // Basic fallback if not globally defined from functions.php via other JS
            if (!datetime) return '';
            const date = new Date(datetime);
            return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('fa-IR');
        }
    }


    // Initialize
    checkAuthAndInit();
    // Note: `updateNavBasedOnAuth` or similar logic for common header elements
    // is now expected to be handled by `auth_ui.js` globally.
});
