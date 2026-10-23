# iPodify

iPodify - это легковесный веб-клиент Spotify, интерфейс которого полностью стилизован под классический iPod. Управление осуществляется с помощью виртуального колеса Click Wheel. Проект состоит из легковесного бэкенда на Node.js/Express и фронтенда на Vanilla HTML/CSS/JS.

## Особенности
- **Интерфейс iPod**: Монохромный экран, Click Wheel, звуковые/вибро-отклики.
- **Управление Click Wheel**: Поддерживает прокрутку по кругу для навигации (как на настоящем iPod).
- **Авторизация Spotify**: Безопасный вход через Spotify API, токены обновления (refresh token) хранятся в защищенных httpOnly куках.
- **Воспроизведение музыки**: Интегрирован Spotify Web Playback SDK для воспроизведения музыки прямо в браузере.
- **Просмотр библиотеки**: Поддержка просмотра плейлистов, топ-артистов и сохраненных треков.
- **Адаптивность**: Полноэкранный режим на мобильных устройствах, фиксированный масштаб по центру экрана на ПК.

## Требования
- **Node.js**: Версия 14.x или выше.
- **Подписка Spotify Premium**: Требуется для работы Spotify Web Playback SDK (ограничение самого Spotify). Без Premium будет доступен только интерфейс, но музыка не будет играть.
- **Spotify Developer App**: Необходимо создать приложение в панели разработчика Spotify.

---

## Инструкция по установке (включая деплой на VPS)

### 1. Создание приложения Spotify
1. Перейдите на [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) и авторизуйтесь.
2. Нажмите **Create App**.
3. Заполните название (например, iPodify) и описание.
4. В поле **Redirect URIs** введите адрес вашего сервера. Для локальной разработки: `http://localhost:3000/callback`. Для продакшена на VPS добавьте адрес вашего домена, например: `https://your-domain.com/callback` (ВАЖНО: Spotify требует HTTPS для продакшена).
5. Поставьте галочку "Web Playback SDK".
6. Сохраните.
7. Зайдите в настройки созданного приложения и скопируйте `Client ID` и `Client Secret`.

### 2. Подготовка сервера VPS
Подключитесь к вашему VPS по SSH:
```bash
ssh root@your_vps_ip
```

Убедитесь, что установлен Node.js и Git:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

### 3. Клонирование и настройка проекта
Склонируйте репозиторий:
```bash
git clone https://github.com/your-username/ipodify.git
cd ipodify
```

Установите зависимости:
```bash
npm install
```

Настройте переменные окружения:
```bash
cp .env.template .env
nano .env
```
В файле `.env` укажите ваши данные:
```env
PORT=3000
SPOTIFY_CLIENT_ID=ваш_client_id
SPOTIFY_CLIENT_SECRET=ваш_client_secret
SPOTIFY_REDIRECT_URI=http://ваш_ip_или_домен:3000/callback
NODE_ENV=production
```
*(Замените `SPOTIFY_REDIRECT_URI` на актуальный, который вы указали в настройках приложения Spotify)*.

### 4. Запуск сервера
Для поддержания работы приложения в фоне рекомендуется использовать `pm2`:
```bash
sudo npm install -g pm2
pm2 start src/server.js --name ipodify
```
Чтобы приложение запускалось автоматически при перезагрузке сервера:
```bash
pm2 startup
pm2 save
```

### 5. Настройка Reverse Proxy (Nginx) + SSL (HTTPS)
Так как Spotify Web Playback SDK **требует** контекст безопасности, вам нужен HTTPS.
Если у вас **нет собственного домена**, не беда! Мы будем использовать бесплатный сервис `nip.io`, который превращает ваш IP-адрес в доменное имя (например, если IP вашего сервера `123.45.67.89`, то ваш домен будет `123.45.67.89.nip.io`).

Установите Nginx и Certbot:
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

Если у вас на сервере порты 80/443 уже заняты другим приложением (например, Python Uvicorn/FastAPI), вы можете настроить Nginx на прослушивание другого порта для HTTPS, например `2026`. (При этом бэкенд Node.js должен работать на внутреннем порту, например `3000`).

Сначала получите сертификат в автономном режиме (если 80 порт свободен) или временно остановите другое приложение:
```bash
sudo certbot certonly --standalone -d ВАШ_IP.nip.io
```

Создайте конфигурацию Nginx:
```bash
sudo nano /etc/nginx/sites-available/ipodify
```
Вставьте конфигурацию (замените `ВАШ_IP` на ваш реальный IP):
```nginx
server {
    listen 2026 ssl; # Слушаем нестандартный порт для HTTPS
    server_name ВАШ_IP.nip.io;

    ssl_certificate /etc/letsencrypt/live/ВАШ_IP.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ВАШ_IP.nip.io/privkey.pem;

    location / {
        proxy_pass http://localhost:3000; # Порт, на котором работает Node.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Активируйте и перезагрузите Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ipodify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Важно!** Не забудьте указать именно этот новый адрес `https://ВАШ_IP.nip.io:2026/callback` (вместе с портом) в настройках приложения Spotify (раздел Redirect URIs) и в вашем файле `.env`!

Готово! Теперь вы можете зайти на `https://ВАШ_IP.nip.io:2026` и использовать ваш iPodify.

---
**Важно**: Для воспроизведения музыки не забудьте, что текущее устройство (браузер) должно быть активно, и иногда, чтобы начать играть, требуется нажать кнопку `Play/Pause` или запустить трек через официальное приложение Spotify, выбрав устройство `iPodify Web Player`.
