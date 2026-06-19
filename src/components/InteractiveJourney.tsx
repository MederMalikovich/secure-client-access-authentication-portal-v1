import { useState } from 'react';
import {
  UserPlus, Settings, Users, PawPrint, CalendarClock, Bell,
  ClipboardList, Stethoscope, Pill, BedDouble, Package, ShoppingCart,
  DollarSign, Gift, BarChart3, Smartphone, CheckCircle2,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type Stage = {
  id: string;
  title: string;
  short: string;
  icon: React.ElementType;
  role: string;
  module: string;
  details: string;
  tip?: string;
};

const stages: Stage[] = [
  {
    id: 's1', title: 'Регистрация Admin', short: 'Старт системы',
    icon: UserPlus, role: 'Администратор', module: '/auth',
    details: 'Первый сотрудник регистрируется на странице входа — автоматически получает роль Admin. Все последующие сотрудники получают роль «Просмотр» и ждут назначения от админа.',
    tip: 'Логин-страница одна и та же для сотрудников и клиентов — переключатель в шапке формы.',
  },
  {
    id: 's2', title: 'Настройка клиники', short: 'График + каналы',
    icon: Settings, role: 'Администратор', module: 'Настройки',
    details: 'Задайте часы работы по дням, длительность слота записи. Подключите каналы уведомлений: Email, Telegram, WhatsApp, Instagram. Настройте программу лояльности (% начисления и списания).',
    tip: 'Выходной = выключенный переключатель дня. Клиент не сможет выбрать этот день онлайн.',
  },
  {
    id: 's3', title: 'Команда и роли', short: 'RBAC, 7 ролей',
    icon: Users, role: 'Администратор', module: 'Настройки → Пользователи',
    details: 'Пригласите врачей, регистраторов, бухгалтеров, менеджеров. Назначьте роли — один сотрудник может иметь несколько ролей одновременно. Роли проверяются на сервере через security-definer функции.',
  },
  {
    id: 's4', title: 'Каталоги', short: 'Услуги + заболевания',
    icon: ClipboardList, role: 'Менеджер / Ветеринар', module: 'Услуги, Заболевания',
    details: 'Создайте категории и услуги с ценами в ₸ — они подставятся в счета автоматически. Ведите справочник диагнозов с симптомами и протоколами — используется в медкарте.',
  },
  {
    id: 's5', title: 'Клиент + питомец', short: '6-значный ID',
    icon: PawPrint, role: 'Регистратор', module: 'Клиенты, Питомцы',
    details: 'Создайте клиента — система сгенерирует 6-значный логин. Аккаунт для личного кабинета создаётся автоматически (пароль 123456). Добавьте питомцев с фото, видом, породой, весом.',
    tip: 'Реферальный код пригласившего вводится при создании клиента — оба получают бонусы.',
  },
  {
    id: 's6', title: 'Запись на приём', short: 'Календарь / онлайн',
    icon: CalendarClock, role: 'Клиент или Регистратор', module: 'Календарь',
    details: 'Запись создаётся в календаре (день/неделя/месяц) или клиентом самостоятельно через личный кабинет 24/7. Drag-and-drop для переноса. Цветовая индикация статусов и полоска загруженности дня.',
  },
  {
    id: 's7', title: 'Авто-напоминание', short: 'За 24 ч',
    icon: Bell, role: 'Система', module: 'pg_cron + Edge Function',
    details: 'За сутки до визита клиент автоматически получает напоминание по предпочтительному каналу (Telegram / WhatsApp / Email). При выставлении счёта — тоже уведомление.',
  },
  {
    id: 's8', title: 'Доска приёма', short: 'Kanban визитов',
    icon: LayoutGrid, role: 'Ветеринар / Регистратор', module: 'Доска приёма',
    details: 'Сегодняшние визиты в виде Kanban: Ожидает → На приёме → Процедуры → Стационар → Завершён. Перетаскивайте карточки между колонками для смены статуса. Загруженность врачей — в виде progress-баров.',
    tip: 'Альтернатива календарю для ежедневной работы — всё на одном экране.',
  },
  {
    id: 's9', title: 'Визит и SOAP', short: 'Единая медкарта',
    icon: Stethoscope, role: 'Ветеринар', module: 'Доска приёма / Календарь',
    details: 'В окне визита: SOAP (жалобы → осмотр → диагноз → план), витальные (вес, T°, пульс, ЧД), услуги и материалы. «Загрузить из прошлого» подтянет данные предыдущего визита. Шаблоны (вакцинация, кастрация) — в один клик.',
    tip: 'Один питомец = одна медкарта на всю жизнь. Все визиты копятся в её timeline.',
  },
  {
    id: 's10', title: 'Назначения', short: 'Авто-расписание',
    icon: Pill, role: 'Ветеринар', module: 'Назначения',
    details: 'Препарат, дозировка, способ введения, количество приёмов в день и длительность курса. Расписание всех приёмов формируется автоматически. Клиент отмечает «принято/пропущено» в кабинете.',
  },
  {
    id: 's11', title: 'Стационар', short: 'Журнал + фото',
    icon: BedDouble, role: 'Ветеринар', module: 'Стационар',
    details: 'Карта стационарного пациента: бокс, диагноз, тариф/сутки. Журнал наблюдений (показатели, процедуры, кормление, фото). Фото и заметки видны владельцу — снижает звонки «как там мой?».',
    tip: 'При выписке счёт за дни × тариф формируется автоматически.',
  },
  {
    id: 's12', title: 'Склад', short: 'Авто-списание',
    icon: Package, role: 'Ветеринар / Менеджер', module: 'Склад',
    details: 'Материалы, использованные на визите, списываются автоматически при завершении. Поступления и ручные списания через карточку позиции. Низкие остатки → уведомление + бейдж.',
  },
  {
    id: 's13', title: 'Магазин', short: 'Розничные продажи',
    icon: ShoppingCart, role: 'Регистратор', module: 'Магазин',
    details: 'Розничная продажа товаров с привязкой к клиенту/питомцу или без. Остатки списываются автоматически. Продажа сразу попадает в финансы и отчёты.',
  },
  {
    id: 's14', title: 'Счёт и оплата', short: 'Бонусы + сертификат',
    icon: DollarSign, role: 'Бухгалтер / Регистратор', module: 'Финансы',
    details: 'Счёт создаётся автоматически после визита/продажи. При приёме оплаты можно списать бонусы и применить код подарочного сертификата. Поддержка частичной оплаты.',
  },
  {
    id: 's15', title: 'Лояльность', short: 'Авто-начисление',
    icon: Gift, role: 'Система', module: 'Лояльность',
    details: 'После оплаты начисляются баллы (% от суммы). Сертификаты — генерация PDF с уникальным кодом. Реферальная программа — уникальный код у каждого клиента, бонусы обоим.',
  },
  {
    id: 's16', title: 'Аналитика + LTV', short: 'Отчёты, KPI',
    icon: BarChart3, role: 'Менеджер / Admin', module: 'Отчёты + Карточка клиента',
    details: 'Дашборд с KPI и sparkline-трендами. Отчёты с фильтрами по периодам, ТОП-5 услуг/товаров. В карточке каждого клиента — мини-дашборд Lifetime Value и среднего чека (виден только клинике).',
  },
  {
    id: 's17', title: 'Кабинет клиента', short: 'Самообслуживание',
    icon: Smartphone, role: 'Клиент', module: '/my-cabinet',
    details: 'Клиент видит своих питомцев, медкарты, счета и оплаты, активные назначения, бонусы и рефкод. Может записаться онлайн в любое время и отмечать приём лекарств.',
  },
];

export function InteractiveJourney() {
  const [activeId, setActiveId] = useState<string>(stages[0].id);
  const active = stages.find((s) => s.id === activeId) ?? stages[0];
  const activeIndex = stages.findIndex((s) => s.id === activeId);
  const ActiveIcon = active.icon;

  return (
    <div className="space-y-5">
      {/* Step rail */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {stages.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === activeId;
            const isDone = i < activeIndex;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={cn(
                  'group relative shrink-0 snap-start w-[140px] sm:w-[160px] rounded-xl border p-3 text-left transition-all',
                  'hover:-translate-y-0.5 hover:shadow-lg',
                  isActive
                    ? 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_8px_24px_-12px_hsl(var(--primary)/0.5)]'
                    : 'border-border/50 bg-card/40 hover:border-primary/40',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isDone
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="font-semibold text-sm leading-tight line-clamp-2">{s.title}</div>
                <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{s.short}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active detail */}
      <Card className="glass border-primary/30 p-5 md:p-6 animate-fade-in" key={activeId}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <ActiveIcon className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                Шаг {activeIndex + 1} / {stages.length}
              </span>
              <Badge variant="secondary" className="text-xs">{active.role}</Badge>
              <Badge variant="outline" className="text-xs">{active.module}</Badge>
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">{active.title}</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {active.details}
            </p>
            {active.tip && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs md:text-sm text-foreground/80">
                💡 {active.tip}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                disabled={activeIndex === 0}
                onClick={() => setActiveId(stages[activeIndex - 1].id)}
                className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Назад
              </button>
              <button
                disabled={activeIndex === stages.length - 1}
                onClick={() => setActiveId(stages[activeIndex + 1].id)}
                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Дальше →
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/60 transition-all duration-500"
            style={{ width: `${((activeIndex + 1) / stages.length) * 100}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
