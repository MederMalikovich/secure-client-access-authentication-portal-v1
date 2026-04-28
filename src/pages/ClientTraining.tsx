import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  GraduationCap, LogIn, PawPrint, Calendar, FileText, DollarSign,
  Bell, Lightbulb, BookOpen, AlertTriangle, Pill, BedDouble,
} from 'lucide-react';

interface Step { text: string; hint?: string }
interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  steps: Step[];
  tips?: string[];
  warnings?: string[];
}

const sections: Section[] = [
  {
    id: 'login',
    title: '1. Вход в личный кабинет',
    icon: LogIn,
    description: 'Как войти, используя номер клиента',
    steps: [
      { text: 'Откройте страницу входа клиники.' },
      { text: 'Переключитесь на вкладку «Клиент».' },
      { text: 'Введите ваш 6-значный номер клиента (выдан клиникой при регистрации).' },
      { text: 'Введите пароль. По умолчанию — 123456.', hint: 'Если вы забыли номер — обратитесь в регистратуру клиники.' },
      { text: 'Нажмите «Войти».' },
    ],
    warnings: ['Сразу после первого входа смените пароль в настройках профиля для безопасности.'],
  },
  {
    id: 'cabinet',
    title: '2. Главная — Мой кабинет',
    icon: BookOpen,
    description: 'Что доступно на главной странице',
    steps: [
      { text: 'На главной вы видите: краткую информацию о ваших питомцах, ближайшие записи, неоплаченные счета и последние визиты.' },
      { text: 'Кнопки быстрого доступа позволяют сразу записаться на приём или открыть медкарту питомца.' },
    ],
  },
  {
    id: 'pets',
    title: '3. Мои питомцы',
    icon: PawPrint,
    description: 'Просмотр данных о ваших животных',
    steps: [
      { text: 'Откройте раздел «Мои питомцы» в боковом меню.' },
      { text: 'Кликните по питомцу — откроется карточка с фото, видом, породой, возрастом, весом и заметками.' },
      { text: 'На вкладке «Медкарта» — полная история визитов вашего питомца в виде таймлайна.' },
      { text: 'На вкладке «Исследования» — все загруженные врачом PDF-документы (анализы, рентген и т.п.). Их можно скачать.' },
    ],
    tips: ['Добавление и редактирование данных питомца производится только сотрудниками клиники. Если данные нужно изменить — сообщите регистратору.'],
  },
  {
    id: 'booking',
    title: '4. Онлайн-запись на приём',
    icon: Calendar,
    description: 'Самостоятельная запись 24/7 через личный кабинет',
    steps: [
      { text: 'На главной нажмите «Записаться на приём» (или используйте быстрое действие).' },
      { text: 'Выберите питомца из списка ваших животных.' },
      { text: 'Выберите услугу — рядом будет указана цена.' },
      { text: 'Выберите врача. По умолчанию выбран «Любой свободный врач», но вы можете указать конкретного специалиста из списка.' },
      { text: 'Выберите удобную дату — календарь покажет только дни, когда клиника работает.' },
      { text: 'Выберите время из списка свободных слотов. Слоты, уже занятые, не отображаются.' },
      { text: 'При желании добавьте комментарий (например, «питомец нервничает»).' },
      { text: 'Нажмите «Записаться». Запись сразу появится в вашем кабинете и в календаре клиники.' },
    ],
    tips: [
      'Свободные слоты определяются автоматически на основе графика работы клиники и уже существующих записей.',
      'За 24 часа до визита вы получите автоматическое напоминание по выбранному каналу связи (E-mail / Telegram / WhatsApp).',
    ],
    warnings: ['Если на выбранную дату нет ни одного свободного слота — попробуйте другой день или конкретного врача.'],
  },
  {
    id: 'medical',
    title: '5. Медицинская история',
    icon: FileText,
    description: 'Полная хроника здоровья вашего питомца',
    steps: [
      { text: 'Раздел «Медкарты» в меню — список всех ваших питомцев.' },
      { text: 'Откройте питомца — увидите вертикальный таймлайн всех визитов: дата, врач, диагноз, назначения, рекомендации.' },
      { text: 'Каждая запись содержит: жалобы, осмотр, диагноз, лечение, назначения, вес и температуру на момент визита.' },
      { text: 'Кнопка «Скачать PDF» формирует красиво оформленную медкарту, которую можно сохранить или показать другому врачу.' },
      { text: 'На вкладке «Исследования» — PDF-файлы анализов, УЗИ, рентгена, загруженные врачом.' },
    ],
    tips: ['Медкарту можно только просматривать — данные вносит ветеринарный врач после приёма.'],
  },
  {
    id: 'invoices',
    title: '6. Счета и оплата',
    icon: DollarSign,
    description: 'Просмотр выставленных счетов и истории платежей',
    steps: [
      { text: 'В вашем кабинете отображаются все счета: номер, дата, сумма, статус (Ожидает / Частично / Оплачено).' },
      { text: 'Откройте счёт, чтобы увидеть детализацию: услуги, товары, цены.' },
      { text: 'Оплата производится в клинике (наличные / карта) или переводом по реквизитам, указанным в счёте. После приёма платежа администратор зафиксирует его в системе — статус счёта обновится автоматически.' },
      { text: 'История ваших платежей сохраняется и доступна в любой момент.' },
    ],
    warnings: ['Счёт автоматически создаётся после завершения визита. Если вы видите счёт без визита — обратитесь в клинику для уточнения.'],
  },
  {
    id: 'notifications',
    title: '7. Настройка уведомлений',
    icon: Bell,
    description: 'Выберите удобный канал связи',
    steps: [
      { text: 'Откройте свой профиль (имя в боковом меню) → «Уведомления».' },
      { text: 'Выберите предпочтительный канал: E-mail, Telegram, WhatsApp, Instagram.' },
      { text: 'Для Telegram — укажите ваш chat_id (получить можно у бота клиники). Для WhatsApp / Instagram — номер телефона / username.' },
      { text: 'Сохраните. Все уведомления (напоминания о визите, новые счета, ответы клиники) будут приходить выбранным способом.' },
    ],
  },
  {
    id: 'prescriptions',
    title: '8. Назначения и приём лекарств',
    icon: Pill,
    description: 'Расписание приёма препаратов вашему питомцу',
    steps: [
      { text: 'Откройте раздел «Назначения» в боковом меню.' },
      { text: 'Вы увидите все активные назначения врача: название препарата, дозировку, способ приёма и инструкцию.' },
      { text: 'Прогресс-бар показывает, сколько приёмов уже выполнено из общего количества.' },
      { text: 'Подсказка «Следующий приём» напоминает, когда давать лекарство.' },
      { text: 'Раскройте «Расписание приёмов» — увидите все дозы по дням и часам.' },
      { text: 'Когда дали лекарство — нажмите ✓ (зелёный) рядом с конкретным приёмом.' },
      { text: 'Если приём пропущен — нажмите ✗ (красный). Это поможет врачу скорректировать лечение.', hint: 'Просроченные приёмы подсвечиваются оранжевым.' },
    ],
    tips: [
      'Отмечайте приёмы вовремя — врач видит, насколько точно соблюдается курс лечения.',
      'Если возникли сомнения по препарату — позвоните в клинику до приёма, не пропускайте.',
    ],
    warnings: [
      'Не корректируйте дозу самостоятельно. Если препарат вызвал реакцию — немедленно свяжитесь с клиникой.',
    ],
  },
  {
    id: 'hospitalization',
    title: '9. Стационар — состояние вашего питомца',
    icon: BedDouble,
    description: 'Если ваш питомец проходит лечение в стационаре',
    steps: [
      { text: 'Откройте раздел «Стационар» — увидите карту вашего питомца с номером бокса, диагнозом и количеством дней.' },
      { text: 'На карточке отображаются последние 3 наблюдения врача: температура, вес, аппетит, состояние и фото.' },
      { text: 'Нажмите «Все обновления» — откроется полный журнал с фото-отчётами по дням.' },
      { text: 'Все обновления добавляются медицинским персоналом в течение дня.' },
      { text: 'Текущая стоимость пребывания (по тарифу за сутки × количество дней) видна на карточке.' },
    ],
    tips: [
      'Журнал стационара обновляется в реальном времени — заходите в любое время дня и ночи.',
      'Фото показывают, как ваш питомец себя чувствует — это снимает тревогу и не требует звонков в клинику.',
    ],
  },
];

const fullJourney = [
  'Клиника создаёт ваш аккаунт и сообщает вам 6-значный номер.',
  'Вы входите в личный кабинет: номер + пароль 123456.',
  'Просматриваете список своих питомцев и их медкарты.',
  'Записываетесь на приём онлайн — выбираете питомца, услугу, врача, дату и время.',
  'Получаете автоматическое напоминание за 24 часа до визита.',
  'Приходите в клинику — врач проводит приём и заполняет медкарту.',
  'После визита в кабинете появляется счёт с детализацией.',
  'Оплачиваете счёт в клинике или переводом — статус обновится автоматически.',
  'В разделе «Назначения» видите все рецепты врача и отмечаете каждый приём лекарства — врач видит точность лечения.',
  'Если питомец в стационаре — раздел «Стационар» показывает его состояние и фото-обновления в реальном времени.',
  'В любое время просматриваете полную историю визитов и скачиваете медкарту в PDF.',
];

export default function ClientTraining() {
  return (
    <div>
      <PageHeader
        title="Обучение"
        description="Как пользоваться личным кабинетом VetCRM"
        breadcrumbs={[{ label: 'Мой кабинет', href: '/my-cabinet' }, { label: 'Обучение' }]}
      />

      <div className="space-y-6">
        <Card className="glass border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Что вы можете делать в личном кабинете
            </CardTitle>
            <CardDescription>Краткая дорожная карта взаимодействия с клиникой онлайн</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside text-sm">
              {fullJourney.map((step, i) => (
                <li key={i} className="leading-relaxed text-muted-foreground">
                  <span className="text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Alert className="border-primary/30">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Подсказка</AlertTitle>
          <AlertDescription>
            Личный кабинет работает 24/7 — вы можете записаться на приём в любое удобное время, не дожидаясь рабочих часов клиники.
          </AlertDescription>
        </Alert>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Подробные инструкции
            </CardTitle>
            <CardDescription>Раскройте раздел — пошаговые действия</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Icon className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <div className="font-medium">{section.title}</div>
                          <div className="text-xs text-muted-foreground font-normal">{section.description}</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <ol className="space-y-3">
                        {section.steps.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm leading-relaxed">{step.text}</p>
                              {step.hint && (
                                <p className="text-xs text-muted-foreground italic flex items-start gap-1">
                                  <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                                  {step.hint}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>

                      {section.tips && section.tips.length > 0 && (
                        <Alert>
                          <Lightbulb className="h-4 w-4" />
                          <AlertTitle>Полезно знать</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-1">
                              {section.tips.map((t, i) => <li key={i} className="text-sm">{t}</li>)}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {section.warnings && section.warnings.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Важно</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-1">
                              {section.warnings.map((w, i) => <li key={i} className="text-sm">{w}</li>)}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
