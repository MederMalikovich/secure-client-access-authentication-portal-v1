# План: визуальный апгрейд + LTV в карточке клиента

Стиль остаётся текущий (тёмный fintech, glassmorphism, cyan/purple градиенты) — усиливаем его, не меняем направление.

## 1. LTV-дашборд в карточке клиента (только для персонала)

Расположение: `ClientDetailSheet.tsx`, новый блок сверху под именем клиента. Скрыт для роли `Client` (проверка через `useAuth`).

Показываем 2 главные метрики (по итогам опроса):
- **Lifetime Value** — сумма всех оплаченных счетов клиента (`invoices.status='paid'`, `sum(total)`)
- **Средний чек** — LTV / количество оплаченных счетов

Плюс компактно: количество визитов, дата последнего визита (как контекст к LTV — без отдельных карточек).

Визуально: glass-карточка с тонким cyan→purple градиентом, крупная сумма в ₸, иконка-бейдж, мини-метка тренда (▲/▼ vs прошлые 90 дней). Анимация fade-in при открытии sheet.

## 2. Полный визуальный refresh дашбордов и отчётов

### Общие токены (`src/index.css`)
- Новые градиентные токены: `--gradient-card`, `--gradient-stat-1..4`, `--gradient-mesh` (мягкий aurora-фон для hero-секций дашборда)
- Тени с цветом: `--shadow-glow-cyan`, `--shadow-glow-purple`, `--shadow-card-hover`
- Утилиты: `.stat-card-premium`, `.chart-card`, `.metric-pill`, `.trend-up`, `.trend-down`
- Усилить `.glass` (двойной border: внутренний highlight + внешний)

### Новый общий компонент `PremiumStatCard`
`src/components/ui/premium-stat-card.tsx` — карточка с:
- иконкой в градиентном круге с glow
- крупным значением, подписью
- delta-индикатором (▲ +12% / ▼ −3%)
- опциональным sparkline (recharts `<Area>` без осей)
- hover: lift + усиленный glow

Используется в Dashboard, Reports, Finances, Inventory, Shop, Hospitalization, MedicalRecords.

### Страницы
- **Dashboard** — заменить текущие stat-карточки на `PremiumStatCard` с sparkline-данными. Hero-секция с aurora-mesh фоном и приветствием. Графики (если есть) — gradient-fill `<Area>`, тонкий grid, кастомный tooltip в glass-стиле.
- **Reports** — все stat-карточки → premium. Графики Recharts: gradient fills, scrollable legend, кастомный tooltip. «Топ-5» — список с прогресс-барами и градиентными бейджами.
- **Finances** — premium-карточки, динамика выручки area-chart с двойным градиентом.
- **Inventory / Shop / Hospitalization / MedicalRecords** — заменить существующие stat-карточки на `PremiumStatCard`, единый стиль во всех модулях.

### Recharts tooltip
Общий `ChartTooltipGlass` — стеклянный с blur, цветовым акцентом, форматированием ₸.

## 3. Рекомендации по дальнейшему улучшению UI

Кратко в финальном ответе (без кода в этой итерации):
- единая типографика с tabular-nums для цифр в таблицах
- микро-анимации (hover-lift, count-up для метрик)
- skeleton-loaders вместо спиннеров
- консистентные empty-states с иллюстрацией и CTA
- breadcrumbs + sticky-заголовки страниц
- command palette (уже есть Cmd+K — расширить)
- более явные visual hierarchy в формах (группировка, секции)
- option на сжатую плотность (compact mode) для опытных пользователей

## Технические детали

- Новый компонент: `src/components/ui/premium-stat-card.tsx`
- Расширение `src/index.css` (токены + утилиты), без изменения существующих имён переменных — обратная совместимость
- Расчёт LTV — клиентский: уже загруженные `invoices` фильтруем по `client_id` + `status='paid'`. Если в `ClientDetailSheet` их нет — добавить запрос параллельно к существующим
- Recharts уже в проекте — новые зависимости не нужны
- Sparkline data для Dashboard — агрегация из существующих visits/invoices по последним 7/30 дням
- Скрытие LTV для роли Client — `if (role === 'client') return null` в блоке

## Что не меняется

- Структура навигации, маршруты, бизнес-логика
- Цветовая палитра (cyan/purple/dark) — только усиление
- Существующие диалоги/формы CRUD
- Auth, RLS, edge-функции
