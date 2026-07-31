// ===== DOM ЭЛЕМЕНТЫ =====
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const registerUsername = document.getElementById('registerUsername');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerBtn = document.getElementById('registerBtn');
const registerError = document.getElementById('registerError');

const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const contactsList = document.getElementById('contactsList');
const chatName = document.getElementById('chatName');
const chatAvatar = document.getElementById('chatAvatar');
const chatStatus = document.getElementById('chatStatus');
const searchInput = document.getElementById('searchInput');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const connectionStatus = document.getElementById('connectionStatus');

// ===== СОСТОЯНИЕ =====
let currentContact = null;
let currentUser = null;
let messagesCache = {};
let contactsCache = [];
let contactListeners = {};

// ===== ПЕРЕКЛЮЧЕНИЕ ФОРМ =====
showRegister.addEventListener('click', function(e) {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
});

showLogin.addEventListener('click', function(e) {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
});

// ===== АВТОРИЗАЦИЯ =====

// Вход
loginBtn.addEventListener('click', async function() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (!email || !password) {
        loginError.textContent = '❌ Заполните все поля';
        return;
    }

    try {
        loginError.textContent = '⏳ Вход...';
        loginBtn.disabled = true;
        
        await auth.signInWithEmailAndPassword(email, password);
        
        loginError.textContent = '';
        loginBtn.disabled = false;
    } catch (error) {
        loginError.textContent = '❌ ' + error.message;
        loginBtn.disabled = false;
    }
});

// Регистрация
registerBtn.addEventListener('click', async function() {
    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    
    if (!username || !email || !password) {
        registerError.textContent = '❌ Заполните все поля';
        return;
    }

    if (password.length < 6) {
        registerError.textContent = '❌ Пароль должен быть минимум 6 символов';
        return;
    }

    try {
        registerError.textContent = '⏳ Создание аккаунта...';
        registerBtn.disabled = true;
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Сохраняем имя пользователя в базу данных
        await database.ref(`users/${user.uid}`).set({
            username: username,
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        registerError.textContent = '';
        registerBtn.disabled = false;
    } catch (error) {
        registerError.textContent = '❌ ' + error.message;
        registerBtn.disabled = false;
    }
});

// Выход
logoutBtn.addEventListener('click', async function() {
    if (confirm('Выйти из аккаунта?')) {
        await auth.signOut();
    }
});

// Enter на полях входа
loginEmail.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loginBtn.click();
});

loginPassword.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loginBtn.click();
});

registerUsername.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') registerBtn.click();
});

registerEmail.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') registerBtn.click();
});

registerPassword.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') registerBtn.click();
});

// ===== СЛУШАТЕЛЬ АВТОРИЗАЦИИ =====

auth.onAuthStateChanged(async function(user) {
    if (user) {
        currentUser = user;
        
        // Загружаем данные пользователя
        try {
            const snapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();
            
            if (userData) {
                userName.textContent = userData.username || 'Пользователь';
                userEmail.textContent = user.email;
                userAvatar.textContent = (userData.username || 'П')[0].toUpperCase();
            }
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
        }
        
        // Показываем приложение
        authScreen.style.display = 'none';
        appScreen.style.display = 'flex';
        
        // Загружаем контакты
        loadContacts();
        
        // Подключаем статус
        setupConnectionStatus();
    } else {
        // Показываем экран авторизации
        authScreen.style.display = 'flex';
        appScreen.style.display = 'none';
        currentUser = null;
        currentContact = null;
        
        // Очищаем слушатели
        Object.values(contactListeners).forEach(function(listener) { listener(); });
        contactListeners = {};
        contactsCache = [];
        
        // Очищаем контакты
        contactsList.innerHTML = `
            <div class="no-contacts">
                <span>👋 Начни общение</span>
                <span class="sub">Войди в аккаунт</span>
            </div>
        `;
        
        messagesContainer.innerHTML = `
            <div class="empty-chat">
                <span>💬 Войди в аккаунт</span>
                <span class="sub">Чтобы начать общение</span>
            </div>
        `;
    }
});

// ===== СТАТУС ПОДКЛЮЧЕНИЯ =====

function setupConnectionStatus() {
    database.ref('.info/connected').on('value', function(snap) {
        if (snap.val()) {
            connectionStatus.className = 'connection-status';
            connectionStatus.innerHTML = `
                <span class="dot"></span>
                <span>Подключено к Firebase</span>
            `;
        } else {
            connectionStatus.className = 'connection-status offline';
            connectionStatus.innerHTML = `
                <span class="dot"></span>
                <span>Офлайн</span>
            `;
        }
    });
}

// ===== ЗАГРУЗКА КОНТАКТОВ =====

function loadContacts() {
    const contactsRef = database.ref('contacts');
    
    contactsRef.on('value', function(snapshot) {
        const data = snapshot.val();
        contactsCache = [];
        
        if (data) {
            Object.keys(data).forEach(function(contactId) {
                const contact = data[contactId];
                if (contactId !== currentUser.uid) {
                    contactsCache.push({
                        id: contactId,
                        ...contact
                    });
                }
            });
        }
        
        renderContacts();
    });
}

function renderContacts() {
    contactsList.innerHTML = '';
    
    if (contactsCache.length === 0) {
        contactsList.innerHTML = `
            <div class="no-contacts">
                <span>👋 Нет контактов</span>
                <span class="sub">Добавьте друзей через Firebase</span>
            </div>
        `;
        return;
    }
    
    contactsCache.forEach(function(contact) {
        const div = document.createElement('div');
        div.className = 'contact' + (currentContact === contact.id ? ' active' : '');
        div.dataset.contact = contact.id;
        
        const initial = (contact.username || 'U')[0].toUpperCase();
        const colors = ['#ff6fd8', '#6f8cff', '#ffb86b', '#6fcf97', '#a06bff', '#ff6b6b'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        div.innerHTML = `
            <div class="avatar" style="background: ${color}">${initial}</div>
            <div class="info">
                <div class="name">${contact.username || 'Пользователь'}</div>
                <div class="last-msg">${contact.lastMsg || 'Напиши сообщение'}</div>
            </div>
            <div class="time">${contact.lastTime || ''}</div>
        `;
        
        div.addEventListener('click', function() {
            if (contact.id !== currentContact) {
                switchContact(contact.id);
            }
        });
        
        contactsList.appendChild(div);
    });
}

// ===== ПЕРЕКЛЮЧЕНИЕ КОНТАКТА =====

function switchContact(contactId) {
    currentContact = contactId;
    
    // Находим контакт
    const contact = contactsCache.find(function(c) { return c.id === contactId; });
    if (!contact) return;
    
    // Обновляем шапку
    chatName.textContent = contact.username || 'Пользователь';
    chatAvatar.textContent = (contact.username || 'U')[0].toUpperCase();
    chatStatus.textContent = 'онлайн';
    
    // Обновляем активный контакт
    document.querySelectorAll('.contact').forEach(function(el) {
        el.classList.remove('active');
        if (el.dataset.contact === contactId) {
            el.classList.add('active');
        }
    });
    
    // Загружаем сообщения
    loadMessages(contactId);
}

// ===== ЗАГРУЗКА СООБЩЕНИЙ =====

function loadMessages(contactId) {
    const chatRef = database.ref(`chats/${currentUser.uid}/${contactId}`);
    
    // Отписываемся от старого слушателя
    if (contactListeners[contactId]) {
        contactListeners[contactId]();
        delete contactListeners[contactId];
    }
    
    messagesContainer.innerHTML = `
        <div class="loading-messages">⏳ Загрузка сообщений...</div>
    `;
    
    // Слушаем новые сообщения
    const listener = chatRef.on('value', function(snapshot) {
        const data = snapshot.val();
        
        if (data && data.messages) {
            messagesCache[contactId] = data.messages;
        } else {
            messagesCache[contactId] = [];
        }
        
        renderMessages(contactId);
        updateContactLastMessage(contactId);
    });
    
    contactListeners[contactId] = function() {
        chatRef.off('value', listener);
    };
}

function renderMessages(contactId) {
    const messages = messagesCache[contactId] || [];
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-chat';
        empty.innerHTML = `
            <span>💬 Начни общение!</span>
            <span class="sub">Напиши первое сообщение</span>
        `;
        messagesContainer.appendChild(empty);
        return;
    }
    
    messages.forEach(function(msg) {
        const div = document.createElement('div');
        div.className = 'message ' + (msg.senderId === currentUser.uid ? 'sent' : 'received');
        div.innerHTML = `
            ${msg.text}
            <span class="time">${msg.time || ''}</span>
        `;
        messagesContainer.appendChild(div);
    });
    
    setTimeout(function() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
}

function updateContactLastMessage(contactId) {
    const messages = messagesCache[contactId] || [];
    if (messages.length === 0) return;
    
    const lastMsg = messages[messages.length - 1];
    
    const contactEl = document.querySelector('.contact[data-contact="' + contactId + '"]');
    if (contactEl) {
        const lastMsgEl = contactEl.querySelector('.last-msg');
        const timeEl = contactEl.querySelector('.time');
        if (lastMsgEl) lastMsgEl.textContent = lastMsg.text;
        if (timeEl) timeEl.textContent = lastMsg.time;
    }
    
    // Обновляем в базе данных
    const contact = contactsCache.find(function(c) { return c.id === contactId; });
    if (contact) {
        database.ref('contacts/' + contactId).update({
            lastMsg: lastMsg.text,
            lastTime: lastMsg.time
        });
    }
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentContact) return;
    
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + 
                 now.getMinutes().toString().padStart(2, '0');
    
    const messageData = {
        senderId: currentUser.uid,
        text: text,
        time: time,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        // Отправляем в чат текущего пользователя
        const chatRef = database.ref('chats/' + currentUser.uid + '/' + currentContact);
        const messages = messagesCache[currentContact] || [];
        messages.push(messageData);
        await chatRef.update({ messages: messages });
        
        // Отправляем в чат собеседника
        const otherChatRef = database.ref('chats/' + currentContact + '/' + currentUser.uid);
        const otherMessages = messagesCache[currentContact] || [];
        otherMessages.push(messageData);
        await otherChatRef.update({ messages: otherMessages });
        
        messageInput.value = '';
    } catch (error) {
        console.error('Ошибка отправки:', error);
    }
}

// ===== ОЧИСТКА ЧАТА =====

clearChatBtn.addEventListener('click', async function() {
    if (!currentContact) return;
    if (!confirm('Очистить всю историю чата?')) return;
    
    try {
        await database.ref('chats/' + currentUser.uid + '/' + currentContact).remove();
        await database.ref('chats/' + currentContact + '/' + currentUser.uid).remove();
        messagesCache[currentContact] = [];
        renderMessages(currentContact);
    } catch (error) {
        console.error('Ошибка очистки:', error);
    }
});

// ===== ПОИСК КОНТАКТОВ =====

searchInput.addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const contacts = document.querySelectorAll('.contact');
    
    contacts.forEach(function(contact) {
        const name = contact.querySelector('.name').textContent.toLowerCase();
        contact.style.display = name.includes(query) ? 'flex' : 'none';
    });
});

// ===== ЭМОДЗИ =====

document.getElementById('emojiBtn').addEventListener('click', function() {
    const emojis = ['😊', '❤️', '🔥', '✨', '👍', '😂', '🎉', '💪', '👋', '🎯', '⭐', '🌈'];
    const random = emojis[Math.floor(Math.random() * emojis.length)];
    messageInput.value += random;
    messageInput.focus();
});

// ===== ОТПРАВКА ПО ENTER =====

messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// ===== ОТПРАВКА ПО КЛИКУ =====

sendBtn.addEventListener('click', sendMessage);

console.log('✦ VIBE мессенджер загружен!');
