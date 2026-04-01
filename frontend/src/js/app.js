// создает экземпляр Chat

import Chat from './Chat';

const root = document.getElementById('root');

const app = new Chat(root);

app.init();

// При закрытии страницы отправляем сообщение о выходе
window.addEventListener('beforeunload', () => {
  app.exitChat();
});