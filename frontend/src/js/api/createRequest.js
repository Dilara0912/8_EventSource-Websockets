// функция будет делать HTTP-запросы к серверу

const createRequest = async (options) => { //принимает один параметр — объект с настройками запроса (url: 'http://localhost:3000/new-user', method: 'POST',, body: { name: 'Анна' })
  const { url, method = 'GET', body, headers = {} } = options; // Деструктуризация параметров - вытаскиваем св-ва
  
//   Создаем объект, который будет передан в fetch()
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
//   Добавляем тело запроса (если есть) в виде строки для fetch()
  if (body) {
    config.body = JSON.stringify(body);
  }
  
//   Отправляем запрос и обрабатываем ответ
  try {
    const response = await fetch(url, config); //Отправляем запрос на сервер - сервер отвечает напр:{ "status": "ok", "user": { "id": "123", "name": "Анна" }}
    const data = await response.json();//Превращаем JSON-строку в объект  
    return data;
  } catch (error) {
    console.error('Ошибка запроса:', error);
    throw error;
  }
};

export default createRequest;