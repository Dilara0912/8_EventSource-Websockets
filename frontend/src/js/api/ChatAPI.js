// API для HTTP-запросов

import Entity from './Entity';
import createRequest from './createRequest';

export default class ChatAPI extends Entity { //наследуем, чтобы получить св-во url 
  constructor() {
    super('http://localhost:3000');  // Вызывает конструктор родительского класса Entity и передает ему URL: this.url = 'http://localhost:3000';
  }
  
  // Создание нового пользователя (регистрация в чате)
  // f-я асинхронная — внутри можно использовать await
  async createUser(name) {
    const result = await createRequest({
      url: `${this.url}/new-user`,   // полный URL: http://localhost:3000/new-user - то,куда отправляем запрос
      method: 'POST', // создаем новый ресурс
      body: { name }, //Данные, которые отправляем (объект с именем)
    });
    return result;
  }
}


// сreateUser — это дополнительный метод, который мы добавляем в 
// ChatAPI. Он не переопределяет метод create из Entity, у них разные имена.