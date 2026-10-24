// Реестр доступных тем оформления iPodify.
// Чтобы добавить новую тему:
// 1. Положите CSS-файл в папку /themes/ (используйте селектор body[data-theme="ваш_id"])
// 2. Добавьте объект темы в массив window.IPODIFY_THEMES ниже.

window.IPODIFY_THEMES = [
    {
        id: 'classic',
        name: 'Classic 1G',
        css: null // Базовая тема из основного style.css
    },
    {
        id: 'ios26',
        name: 'iOS 26 Glass',
        css: '/themes/ios26.css'
    }
];
