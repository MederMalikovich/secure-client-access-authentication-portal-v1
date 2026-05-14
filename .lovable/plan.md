# План: Visit-Centric архитектура ветклиники

Это крупная переработка ядра системы. Разделяю на 4 этапа, чтобы можно было проверять промежуточные результаты. Если хочешь, реализую все этапы подряд в одном заходе, либо по одному — скажи.

---

## Этап 0. Быстрые фиксы (включаю в Этап 1)

**Автосчёт при выписке из стационара**
- При смене статуса hospitalization на `discharged`: подсчитать дни × `daily_rate`, создать invoice + invoice_item «Стационар: N дней × X ₸» автоматически.
- Реализую через PG-триггер `auto_invoice_on_discharge` + UI-уведомление «Счёт #YYYY-NNNNNN создан».

---

## Этап 1. Visit-Centric ядро (БД)

**Главный принцип:** одна медкарта на питомца на всю жизнь. Каждый приём = `visit` внутри неё.

### Новые/изменённые таблицы

```text
pets
  └─ medical_record (1:1, создаётся автоматически при создании питомца)
        └─ visits (1:N) ← новая таблица, центр системы
              ├─ visit_services (услуги визита)
              ├─ visit_materials (списание со склада)
              ├─ visit_diagnoses
              ├─ prescriptions (FK → visit_id)
              ├─ hospitalizations (FK → visit_id)
              └─ invoice (1:1, генерируется из визита)
```

**Новая таблица `visits`** (SOAP + workflow):
- `medical_record_id`, `pet_id`, `client_id`, `appointment_id?`, `veterinarian_id`
- `visit_date`, `status` (`waiting`/`in_consultation`/`procedures`/`hospital`/`completed`/`cancelled`)
- SOAP: `subjective` (жалобы+анамнез), `objective` (осмотр+vitals), `assessment` (диагноз), `plan` (лечение+рекомендации)
- `weight`, `temperature`, `pulse`, `respiratory_rate`
- `chief_complaint`, `notes`, `next_visit_date`
- `created_at`, `updated_at`

**Миграция данных:** существующие `medical_records` конвертируются → одна `medical_record` на питомца + N `visits`. Старые поля сохраняются, ничего не удаляется.

**Триггеры автоматизации после `visit.status = 'completed'`:**
1. `auto_create_invoice_from_visit` — создаёт invoice со всеми `visit_services` и `visit_materials`
2. `auto_deduct_inventory_on_visit_complete` — списание материалов
3. `auto_create_medical_record_for_new_pet` — при создании pet

### Лояльность — уровни
Расширяю `loyalty_settings`:
- `silver_threshold` (0), `gold_threshold` (50000), `vip_threshold` (200000)
- `silver_percent`, `gold_percent`, `vip_percent` (% начисления по уровню)

Расчёт уровня = sum(payments за 12 мес). Хранится в `clients.loyalty_tier` (вычисляется триггером после payment).

---

## Этап 2. Visit-Centric UI

### `MedicalRecords.tsx` → Timeline view
- Левая колонка: список питомцев с поиском
- Правая: timeline визитов (новые сверху), карточки с датой/врачом/диагнозом/статусом
- Фильтры: дата (range), врач, диагноз (поиск), статус
- Клик по визиту → раскрытие SOAP + услуги + назначения + счёт

### Новый компонент `VisitDialog.tsx` (центральный)
Открывается из:
- Календаря (кнопка «Начать приём» на appointment)
- Медкарты (кнопка «+ Новый визит»)
- Flowboard

Вкладки:
1. **SOAP** — 4 секции: Жалобы / Осмотр (+vitals) / Диагноз / План
2. **Услуги** — добавить из каталога, цены подтягиваются
3. **Препараты/материалы** — со склада, авто-списание
4. **Назначения** — встроенный prescription editor
5. **Счёт** — превью invoice до сохранения

**Быстрый режим врача:**
- Кнопка «Загрузить из прошлого визита» (vitals + лечение)
- Шаблоны приёмов (вакцинация, осмотр, кастрация и т.д.) — новая таблица `visit_templates`
- «Повторить назначение» — копирует prescription из истории

### Календарь
- Кнопка «▶ Начать приём» на appointment → создаёт visit со статусом `in_consultation`, открывает VisitDialog

### Новая страница `Flowboard.tsx` (`/flowboard`)
Kanban-доска по статусам визитов на сегодня:
- Колонки: Ожидает / На приёме / Процедуры / Стационар / Завершён
- Drag-and-drop для смены статуса
- Карточка: питомец, владелец, врач, время, длительность

---

## Этап 3. Лояльность + UX подсказки

- Бейдж уровня (Silver/Gold/VIP) в `ClientDetailSheet`, `ClientPortal`, invoice
- Настройки порогов и % в `Settings → Лояльность`
- `ProcessHint` на каждом ключевом экране: что делать дальше
- Обновить `Training.tsx` и `ClientTraining.tsx` — раздел «Visit-centric workflow»

---

## Технические детали

- **Совместимость:** старые `medical_records` остаются как «легаси-визиты»; UI рендерит их в том же timeline
- **RLS:** для `visits`, `visit_services`, `visit_materials`, `visit_templates` — те же роли что и у medical_records
- **Триггеры:** все в `SECURITY DEFINER` с `SET search_path = public`
- **Безопасность счетов:** уже есть guard от дублей (submitting state)
- **Realtime:** включаю для `visits` чтобы Flowboard обновлялся live

## Файлы, которые будут затронуты
- Новые: `src/pages/Flowboard.tsx`, `src/components/VisitDialog.tsx`, `src/components/VisitTimeline.tsx`, `src/components/VisitTemplatesManager.tsx`
- Edited: `MedicalRecords.tsx`, `Calendar.tsx`, `Hospitalization.tsx`, `Settings.tsx`, `ClientDetailSheet.tsx`, `Finances.tsx`, `Loyalty.tsx`, `App.tsx`, sidebars, `Training.tsx`, `ClientTraining.tsx`
- Migrations: 3 шт (visit-схема, hospitalization auto-invoice, loyalty tiers)

---

## Объём работы
Это ~2-3 часа агентского времени и большое изменение БД. Готов начать?

**Подтверди:**
1. Делаем все 4 этапа последовательно в этом сообщении? (рекомендую)
2. Или хочешь разбить — например, сначала Этап 0 (фикс стационара) + Этап 1 (БД), потом UI?
3. Сохранить старые `medical_records` как fallback или мигрировать жёстко в `visits`? (рекомендую сохранить)