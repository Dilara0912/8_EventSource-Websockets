// основной класс чата
// Создает HTML-страницу
// Обрабатывает действия пользователя (клики, ввод текста)
// Общается с сервером через HTTP и WebSocket
// Отображает сообщения и список пользователей

import ChatAPI from "./api/ChatAPI";

export default class Chat {
  constructor(container) {
    this.container = container;           // корневой элемент - в который будем вставлять HTML
    this.api = new ChatAPI();             // API для HTTP-запросов (экземпляр )
    this.websocket = null;               // WebSocket-соединение
    this.currentUser = null;             // текущий пользователь { id, name }
    this.users = [];                     // список пользователей в чате
  }

  // Главный метод инициализации
  async init() {
    this.bindToDOM();                   // создаем HTML-структуру
    this.registerEvents();              // регистрируем обработчики событий
    
    // Показываем модальное окно для ввода имени
    this.showModal();
  }

  // Создание HTML-структуры страницы
  bindToDOM() {
    this.container.innerHTML = `
      <div class="container">
        <div class="chat__header">
          <h1>Чат</h1>
        </div>
        
        <div class="chat__container">
          <div class="chat__area">
            <div class="chat__messages-container"></div>
            <div class="chat__messages-input">
              <form class="form" id="message-form">
                <div class="form__group">
                  <input type="text" class="form__input" id="message-input" placeholder="Введите сообщение...">
                </div>
              </form>
            </div>
          </div>
          
          <div class="chat__userlist">
            <h3>Участники</h3>
            <div class="userlist__container"></div>
          </div>
        </div>
      </div>
      
      <!-- Модальное окно для ввода имени -->
      <div class="modal__form" id="modal">
        <div class="modal__background"></div>
        <div class="modal__content">
          <div class="modal__header">
            <h3>Выберите псевдоним</h3>
          </div>
          <div class="modal__body">
            <div class="form__group">
              <input type="text" class="form__input" id="nickname-input" placeholder="Введите никнейм">
              <div class="form__hint" id="modal-hint"></div>
            </div>
          </div>
          <div class="modal__footer">
            <div class="modal__ok" id="modal-ok">Продолжить</div>
          </div>
        </div>
      </div>
    `;
    
    // Сохраняем ссылки на элементы, тчобы потом быстро обращаться к ним
    this.messagesContainer = this.container.querySelector('.chat__messages-container');
    this.messageInput = this.container.querySelector('#message-input');
    this.messageForm = this.container.querySelector('#message-form');
    this.userlistContainer = this.container.querySelector('.userlist__container');
    this.modal = this.container.querySelector('#modal');
    this.modalOk = this.container.querySelector('#modal-ok');
    this.nicknameInput = this.container.querySelector('#nickname-input');
    this.modalHint = this.container.querySelector('#modal-hint');
  }

  // Регистрация обработчиков событий
  registerEvents() {
    // Отправка сообщения по Enter
    this.messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    // Кнопка "Продолжить" в модальном окне
    this.modalOk.addEventListener('click', () => {
      this.onEnterChatHandler(); //регистрация пользователя
    });
    
    // Enter в поле ввода ника
    this.nicknameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.onEnterChatHandler();
      }
    });
  }

  // Показ модального окна
  showModal() {
    this.modal.classList.add('active');
  }

  // Скрытие модального окна
  hideModal() {
    this.modal.classList.remove('active');
  }

  // Обработка входа в чат (после ввода ника)
  async onEnterChatHandler() {
    const nickname = this.nicknameInput.value.trim(); //Берем текст из поля ввода, обрезаем пробелы
    
    if (!nickname) {
      this.modalHint.textContent = 'Введите никнейм';
      return;
    }
    
    try {
      // Отправляем POST-запрос на регистрацию пользователя
      const result = await this.api.createUser(nickname);
      
      if (result.status === 'error') {
        // Никнейм занят
        this.modalHint.textContent = result.message;
        this.nicknameInput.value = '';
        this.nicknameInput.focus();
        return;
      }
      
      // Успешная регистрация
      this.currentUser = result.user;
      
      // Устанавливаем WebSocket-соединение
      this.setupWebSocket();
      
      // Скрываем модальное окно
      this.hideModal();
      
      // Разблокируем поле ввода сообщений
      this.messageInput.disabled = false;
      this.messageInput.focus();
      
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      this.modalHint.textContent = 'Ошибка подключения к серверу';
    }
  }

  // Настройка WebSocket-соединения
  setupWebSocket() {
    // Создаем соединение после успешной регистрации пользователя
    this.websocket = new WebSocket('ws://localhost:3000');
    
    // Обработчик открытия соединения -можно отправлять сообщения
    this.websocket.addEventListener('open', (e) => {
      console.log('WebSocket соединение установлено');
    });
    
    // Обработчик получения сообщений - Пришло сообщение от сервера
    this.websocket.addEventListener('message', (e) => {
      this.handleWebSocketMessage(e.data);
    });
    
    // Обработчик ошибок
    this.websocket.addEventListener('error', (e) => {
      console.error('WebSocket ошибка:', e);
    });
    
    // Обработчик закрытия соединения
    this.websocket.addEventListener('close', (e) => {
      console.log('WebSocket соединение закрыто');
    });
  }

  // Обработка входящих сообщений по WebSocket
  handleWebSocketMessage(data) {
    try {
      const parsedData = JSON.parse(data);
      
      // Если это массив — значит пришел список пользователей 
      // (В server.js сервер отправляет JSON.stringify(userState) — а userState это массив)
      if (Array.isArray(parsedData)) {
        this.users = parsedData;
        this.renderUserList(); // Отображение списка пользователей
        return;
      }
      
      // Если это объект с типом "send" — пришло сообщение
      if (parsedData.type === 'send') {
        this.renderMessage(parsedData);
      }
      
    } catch (error) {
      console.error('Ошибка парсинга сообщения:', error);
    }
  }

  // Отправка сообщения
  sendMessage() {
    const messageText = this.messageInput.value.trim(); //Берем текст из поля ввода, обрезаем пробелы
    
    if (!messageText) return;
    
    // Формируем сообщение для отправки
    const message = {
      type: 'send',
      message: messageText,
      user: this.currentUser,
    };
    
    // Отправляем через WebSocket. Проверяем, что WebSocket открыт
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      this.messageInput.value = '';
    }
  }

  // Отображение сообщения в чате
  renderMessage(message) {
   //Проверяем, отправитель — текущий пользователь или кто-то другой 
    const isOwnMessage = message.user.id === this.currentUser?.id;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message__container ${
     //CSS-классы для своих и чужих сообщений 
      isOwnMessage ? 'message__container-yourself' : 'message__container-interlocutor'
    }`;
    
    // Форматируем дату
    const date = new Date();
    // Текущая дата и время (часы:минуты)
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString().slice(0, 5)}`;
    
    messageElement.innerHTML = `
      <div class="message__header">
        <span class="message__author">${isOwnMessage ? 'You' : message.user.name}</span>
        <span class="message__time">${formattedDate}</span>
      </div>
      <div class="message__text">${this.escapeHtml(message.message)}</div>
    `;
    // escapeHtml() -Защита от XSS-атак — заменяет опасные символы
    
    this.messagesContainer.append(messageElement);
    // Автоматическая прокрутка вниз при новом сообщении
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  // Отображение списка пользователей
  renderUserList() {
    // Очищает контейнер со списком пользователей
    this.userlistContainer.innerHTML = '';
    
    // проходит по массиву юзеров и добавляет элемент в контейнер
    this.users.forEach(user => {
      const userElement = document.createElement('div');
      userElement.className = 'chat__user';
      userElement.textContent = user.name;
      this.userlistContainer.append(userElement);
    });
  }

  // Выход из чата (при закрытии страницы) - отправка сообщения с типом и данными пользователя
  //  Чтобы сервер удалил пользователя из списка и оповестил остальных
  exitChat() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const exitMessage = {
        type: 'exit',
        user: this.currentUser,
      };
      this.websocket.send(JSON.stringify(exitMessage));
    }
  }

  // Защита от XSS - Заменяет опасные HTML-символы на безопасные эквиваленты
  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}