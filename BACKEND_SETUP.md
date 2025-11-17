# Инструкция по настройке Backend API

## Быстрый старт

### 1. Установите .NET 8.0 SDK

Скачайте и установите с официального сайта:
https://dotnet.microsoft.com/download/dotnet/8.0

Проверьте установку:
```bash
dotnet --version
```

### 2. Перейдите в папку Backend

```bash
cd Backend
```

### 3. Восстановите зависимости

```bash
dotnet restore
```

### 4. Запустите проект

```bash
dotnet run
```

Или для запуска с конкретным профилем:
```bash
dotnet run --launch-profile https
```

### 5. Проверьте работу API

Откройте в браузере:
- Swagger UI: `https://localhost:7227/swagger`
- API: `https://localhost:7227/api/files/list`

## Настройка для работы с React

### 1. Убедитесь, что CORS настроен

В `Program.cs` уже настроен CORS для:
- `http://localhost:3000`
- `https://localhost:3000`

Если ваш React приложение работает на другом порту, добавьте его в `Program.cs`:

```csharp
policy.WithOrigins(
    "http://localhost:3000",
    "http://localhost:3001",  // Добавьте нужный порт
    "https://yourdomain.com"  // Для production
)
```

### 2. Запустите Backend и React одновременно

**Терминал 1 (Backend):**
```bash
cd Backend
dotnet run
```

**Терминал 2 (React):**
```bash
npm start
```

## Тестирование API

### Через Swagger

1. Откройте `https://localhost:7227/swagger`
2. Найдите `POST /api/files/{filename}`
3. Нажмите "Try it out"
4. Введите имя файла (например: `test.json`)
5. Вставьте JSON в тело запроса
6. Нажмите "Execute"

### Через curl

```bash
curl -X POST "https://localhost:7227/api/files/theme.json" \
  -H "Content-Type: application/json" \
  -d '{"currentTheme":"default","themes":{}}' \
  -k
```

### Через Postman

1. Создайте POST запрос
2. URL: `https://localhost:7227/api/files/theme.json`
3. Headers: `Content-Type: application/json`
4. Body: выберите `raw` и `JSON`, вставьте данные
5. Отключите проверку SSL (Settings → SSL certificate verification)

## Структура файлов

После сохранения файлы будут находиться в:
```
Backend/wwwroot/
├── theme.json
├── menu.json
├── reservations.json
├── categories.json
└── ...
```

## Развертывание на хост

### 1. Опубликуйте проект

```bash
cd Backend
dotnet publish -c Release -o ./publish
```

### 2. Скопируйте файлы на сервер

Скопируйте содержимое папки `publish` на ваш хостинг.

### 3. Настройте URL в React

В `src/utils/fileStorage.js` убедитесь, что для production используется правильный URL:

```javascript
const getApiUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://localhost:7227/api';
  }
  // Production - используйте ваш домен
  return `${window.location.origin}/api`;
};
```

### 4. Настройте веб-сервер

Для IIS или Nginx настройте проксирование запросов `/api/*` на ваш .NET приложение.

## Устранение проблем

### Ошибка "Connection refused"

- Убедитесь, что Backend запущен
- Проверьте, что порт 7227 не занят другим приложением
- Попробуйте использовать HTTP вместо HTTPS: `http://localhost:5000`

### Ошибка CORS

- Проверьте настройки CORS в `Program.cs`
- Убедитесь, что домен React приложения добавлен в список разрешенных

### Ошибка "SSL certificate"

- В development можно игнорировать ошибки SSL
- В production используйте валидный SSL сертификат

### Файлы не сохраняются

- Проверьте права доступа к папке `wwwroot`
- Убедитесь, что папка `wwwroot` существует
- Проверьте логи в консоли Backend

## Дополнительные настройки

### Изменить порт

Отредактируйте `Properties/launchSettings.json`:

```json
"applicationUrl": "https://localhost:7227;http://localhost:5000"
```

### Добавить аутентификацию

Для production рекомендуется добавить аутентификацию. Пример в `Program.cs`:

```csharp
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options => { ... });
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи в консоли Backend
2. Проверьте консоль браузера (F12)
3. Убедитесь, что все зависимости установлены

