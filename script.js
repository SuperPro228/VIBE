// ===== ДАННЫЕ =====
const chatData = {
    'Анна': {
        messages: [
            { text: 'Привет! Как дела?', type: 'received', time: '12:25' },
            { text: 'Отлично! А у тебя?', type: 'sent', time: '12:27' },
            { text: 'Тоже хорошо 😊', type: 'received', time: '12:30' }
        ]
    },
    'Максим': {
        messages: [
            { text: 'Встреча в 15:00?', type: 'received', time: '11:10' },
            { text: 'Да, буду', type: 'sent', time: '11:12' },
            { text: 'Ок, договорились', type: 'received', time: '11:15' }
        ]
    },
    'Елена': {
        messages: [
            { text: 'Спасибо за помощь!', type: 'received', time: 'Вчера 18:20' },
            { text: 'Всегда пожалуйста)', type: 'sent', time: 'Вчера 18:22' }
        ]
    },
    'Команда': {
        messages: [
            { text: 'Всем привет!', type: 'received', time: 'Вчера 14:00' },
            { text: 'Привет!', type: 'sent', time: 'Вчера 14:02' },
            { text: 'Встреча в 15:00', type: 'received', time: 'Вчера 14:05' }
        ]
    }
};

// ===== СОСТОЯНИЕ =====
let currentContact = 'Анна';

// ===== DOM ЭЛЕМЕНТЫ =====
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const contactsList = document.getElementById('contactsList');
const chatName = document.getElementById('chatName');
const chatAvatar = document.getElementById('chatAvatar');
const chatStatus = document.getElementById('chatStatus');
const searchInput = document.getElementById('searchInput');

// ===== ФУНКЦИИ =====

// Загрузка сообщений из localStorage или из данных по умолчанию
function loadMessages(contact) {
    const saved = localStorage.getItem(`vibe_${contact}`);
    if (saved) {
        return JSON.parse(saved);
    }
    return chatData[contact]?.messages || [];
}

// Сохранение сообщений в localStorage
function saveMessages(contact, messages) {
    localStorage.setItem(`vibe_${contact}`, JSON.stringify(messages));
}

// Отображение сообщений
function renderMessages(contact) {
    const messages = loadMessages(contact);
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = `
            color: rgba(255,255,255,0.2);
            text-align: center;
            margin: auto;
            font-size: 14px;
        `;
        empty.textContent = 'Нет сообщений. Напиши что-нибудь! ✨';
        messagesContainer.appendChild(empty);
        return;
    }

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.type}`;
        div.innerHTML = `
            ${msg.text}
            <span class="time">${msg.time || ''}</span>
        `;
        messagesContainer.appendChild(div);
    });

    // Скролл вниз
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Отправка сообщения
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const messages = loadMessages(currentContact);
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + 
                 now.getMinutes().toString().padStart(2, '0');

    messages.push({
        text: text,
        type: 'sent',
        time: time
    });

    saveMessages(currentContact, messages);
    renderMessages(currentContact);
    messageInput.value = '';
    updateLastMessage(currentContact, text, time);
}

// Обновление последнего сообщения в сайдбаре
function updateLastMessage(contact, text, time) {
    const contactEl = document.querySelector(`.contact[data-contact="${contact}"]`);
    if (contactEl) {
        const lastMsg = contactEl.querySelector('.last-msg');
        const timeEl = contactEl.querySelector('.time');
        if (lastMsg) lastMsg.textContent = text;
        if (timeEl) timeEl.textContent = time;
    }
}

// Переключение контакта
function switchContact(contact) {
    currentContact = contact;
    
    // Обновление активного контакта
    document.querySelectorAll('.contact').forEach(el => {
        el.classList.remove('active');
    });
    const activeEl = document.querySelector(`.contact[data-contact="${contact}"]`);
    if (activeEl) activeEl.classList.add('active');

    // Обновление шапки чата
    const contactData = activeEl;
    if (contactData) {
        const avatar = contactData.querySelector('.avatar');
        const name = contactData.querySelector('.name');
        chatName.textContent = name.textContent;
        chatAvatar.textContent = avatar.textContent;
        chatAvatar.style.background = avatar.style.background;
        chatStatus.textContent = 'онлайн';
    }

    renderMessages(contact);
}

// Поиск контактов
function searchContacts(query) {
    const contacts = document.querySelectorAll('.contact');
    contacts.forEach(contact => {
        const name = contact.querySelector('.name').textContent.toLowerCase();
        if (name.includes(query.toLowerCase())) {
            contact.style.display = 'flex';
        } else {
            contact.style.display = 'none';
        }
    });
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

// Отправка по клику
sendBtn.addEventListener('click', sendMessage);

// Отправка по Enter
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// Переключение контакта
contactsList.addEventListener('click', (e) => {
    const contact = e.target.closest('.contact');
    if (contact) {
        const name = contact.dataset.contact;
        if (name && name !== currentContact) {
            switchContact(name);
        }
    }
});

// Поиск
searchInput.addEventListener('input', (e) => {
    searchContacts(e.target.value);
});

// Эмодзи (просто для демонстрации)
document.getElementById('emojiBtn').addEventListener('click', () => {
    const emojis = ['😊', '❤️', '🔥', '✨', '👍', '😂', '🎉', '💪'];
    const random = emojis[Math.floor(Math.random() * emojis.length)];
    messageInput.value += random;
    messageInput.focus();
});

// ===== ИНИЦИАЛИЗАЦИЯ =====
switchContact('Анна');