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
showRegister.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
});

showLogin.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
});

// ===== АВТОРИЗАЦИЯ =====

// Вход
loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (!email || !password) {
        loginError.textContent = 'Заполните все поля';
        return;
    }

    try {
        loginError.textContent = '⏳ Вход...';
        loginBtn.disabled = true;
        
        await auth.signInWithEmailAndPassword(email, password);
        
        loginError.textContent = '';
        loginBtn.disabled = false;
    } catch (error) {
        loginError.textContent = error.message;
        loginBtn.disabled = false;
    }
});

// Регистрация
registerBtn.addEventListener('click', async () => {
    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    
    if (!username || !email || !password) {
        registerError.textContent = 'Заполните все поля';
        return;
    }

    if (password.length < 6) {
        registerError.textContent = 'Пароль должен быть минимум 6 символов';
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
        registerError.textContent = error.message;
        registerBtn.disabled = false;
    }
});

// Выход
logoutBtn.addEventListener('click', async () => {
    if (confirm('Выйти из аккаунта?')) {
        await auth.signOut();
    }
});

// ===== СЛУШАТЕЛЬ АВТОРИЗАЦИИ =====

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Загружаем данные пользователя
        const snapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            userName.textContent = userData.username || 'Пользователь';
            userEmail.textContent = user.email;
            userAvatar.textContent = (userData.username || 'П')[0].toUpperCase();
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
        Object.values(contactListeners).forEach(listener => listener());
        contactListeners = {};
        contactsCache = [];
        
        // Очищаем контакты
        contactsList.innerHTML = `
            <div class="no-contacts">
                <span>👋 Начни общение</span>
                <span class="sub">Войди в аккаунт</span>
            </div>
        `;
        
        messagesContainer.innerHTML = '';
    }
});

// ===== СТАТУС ПОДКЛЮЧЕНИЯ =====

function setupConnectionStatus() {
    database.ref('.info/connected').on('value', (snap) => {
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
    
    contactsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        contactsCache = [];
        
        if (data) {
            Object.keys(data).forEach((contactId) => {
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
    
    contactsCache.forEach((contact) => {
        const div = document.createElement('div');
        div.className = `contact${
