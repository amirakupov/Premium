import { analysesData } from "./analysesData";
import { proceduresData } from "./proceduresData";
import { adminReferencesData } from "./adminReferencesData";
import { physioProceduresData } from "./physioProceduresData";

export interface Service {
    id: number;
    slug: string;
    imageSrc: string;
    serviceName: string;
    price: string;
    description: string;
    longDescription: string;
    analysesList?: {
      code: string;
      name: string;
      price: string;
    }[];
    procedureList?: {
      name: string;
      price: string;
    }[];
    adminReferences?: {
      name: string;
      price: string;
    }[];
    physioProcedures?: {
      name: string;
      price: string;
    }[];
  }
  
  export const services: Service[] = [
    {
      id: 1,
      slug: 'botolinoterapiya',
      imageSrc: '/services/bottocs.png',
      serviceName: 'Ботулинотерапия',
      price: '150₽',
      description: 'Не просто «уколы красоты» – а лечение с гарантией попадания в мышцу!',
      longDescription: `Решаем такие проблемы как:
        1.Спастика после инсультов и травм:  
          — Расслабляем гипертонус мышц рук и ног  
          — Возвращаем контроль над телом  
        2. Хроническая боль: 
          — Мигрени, цервикалгия, люмбаго и другие  
        3. Косметические дефекты: 
          — Гипергидроз, блефароспазм  `,
    },
    {
      id: 2,
      slug: 'vlok',
      imageSrc: '/services/vlok.png',
      serviceName: 'ВЛОК',
      price: '1200₽',
      description: 'Внутривенное лазерное облучение крови',
      longDescription: `Ваша кровь — чище, энергия — выше! 
      Представьте: всего за 20 минут специальный лазер мягко «перезагружает» ваши кровяные клетки. Результат:  
      - Укрепляет иммунитет без таблеток,  
      - Снимает воспаления (от артрита до акне),  
      - Дарит заряд бодрости, как после отпуска.  
      Идеально при хронической усталости, аллергии, частых простудах.`,
    },
    {
      id: 3,
      slug: 'ozonoterapia',
      imageSrc: '/services/ozon.png',
      serviceName: 'Озонотерапия',
      price: '100₽',
      description: 'Кислородный детокс для клеток!',
      longDescription: `Насыщаем организм медицинским озоном — природным антисептиком и «энерджайзером»:  
- Заживляет ткани в 2 раза быстрее,  
- Омолаживает кожу изнутри,  
- Снижает боль без лекарств.  
*Попробуйте после стресса, при болях в спине или для сияющей кожи`,
    },
    {
      id: 4,
      slug: 'codirovanie',
      imageSrc: '/services/coding.png',
      serviceName: 'Кодировка',
      price: '250₽',
      description: 'Свобода от зависимости — за 1 сеанс!',
      longDescription: `Комбинация гипноза и препаратов создает «щит» против тяги:  
- Без стресса и ломки,  
- Эффект — с первого дня,  
- Анонимно и безопасно.  
Хватит откладывать — время жить без оков!`,
    },
    {
      id: 5,
      slug: 'capelnicy',
      imageSrc: '/services/capelnic.png',
      serviceName: 'Капельницы',
      price: '250₽',
      description: 'Витаминный коктейль для ваших сосудов!',
      longDescription: `Личный состав капельницы подбирает врач:  
- Для энергии — магний + витамины группы B,  
- Для детокса — глутатион,  
- Для молодости — пептиды.  
*Как SPA для организма, но с научным подходом.`,
    },
    {
      id: 6,
      slug: 'blocade',
      imageSrc: '/services/blocade.png',
      serviceName: 'Блокады',
      price: '250₽',
      description: 'Боль уходит за 5 минут!',
      longDescription: `Точечный укол анестетика + противовоспалительного:  
- Мгновенно снимает острую боль (спина, суставы),  
- Позволяет отказаться от обезболивающих,  
- Возвращает подвижность.  
*Спасательный круг при грыжах, невралгии, артрозе.`,
    },
    {
      id: 7,
      slug: 'elektroforez',
      imageSrc: '/services/elektro.png',
      serviceName: 'Электрофорез',
      price: '250₽',
      description: 'Лекарство — точно в цель, минуя желудок!',
      longDescription: `Через кожу с помощью тока доставляем препараты:  
- В 5 раз эффективнее таблеток,  
- Ноль побочных эффектов,  
- Лечит остеохондроз, невриты, рубцы.  
Умная альтернатива уколам.`,
    },
    {
      id: 8,
      slug: 'analiz',
      imageSrc: '/services/anal.png',
      serviceName: 'Анализы',
      price: '250₽',
      description: 'Узнайте о здоровье всё за 2 часа!',
      longDescription: `Сдаем кровь, мочу, гормоны, генетику — даже малышам без слез. Срочные анализы** за 60 минут (для справок, перед отпуском). Без боли и стресса: иглы-бабочки, мультики для детей `,
      analysesList: analysesData,
    },
    {
      id: 9,
      slug: 'kabinet',
      imageSrc: '/services/proc.jpg',
      serviceName: 'Кабинет Процедур',
      price: '250₽',
      description: 'Лечение без страха',
      longDescription: `Капельницы для иммунитета, энергии, детокса. Перевязки после операций/травм (аккуратно и без боли). Уколы (в/м, в/в) — мастерство «попасть в вену с первого раза`,
      procedureList: proceduresData,
    },
    {
      id: 10,
      slug: 'massage',
      imageSrc: '/services/massage.png',
      serviceName: 'Лечебный массаж',
      price: '250₽',
      description: 'Спина скажет вам "спасибо" уже после первого сеанса',
      longDescription: `Снимаем зажимы в шее, пояснице. Восстанавливаем после травм. Детский массаж при кривошее, гипертонусе  `,
    },
    {
      id: 11,
      slug: 'spravki',
      imageSrc: '/services/spravki.png',
      serviceName: 'Справки в 1 клик!',
      price: '250₽',
      description: 'В бассейн, на работу, в школу — пока вы пьете кофе',
      longDescription: `- в Санаторий/ бассейн 
        - 086/у — для вузов/работы  
        - В детсад/школу — без очередей  
        - На COVID 19 `,
      adminReferences: adminReferencesData,
    },
    {
      id: 12,
      slug: 'plazmoterapiya',
      imageSrc: '/services/plazma.png',
      serviceName: 'Плазмотерапия(PRP)',
      price: '250₽',
      description: 'Запускаем регенерацию там, где обычные методы бессильны!',
      longDescription: `Куда и зачем колем: 
- Шея/позвоночник/суставы:
  — Снимает боль при остеохондрозе, артрозе  
  — Восстанавливает хрящи без операции  
  — Увеличивает подвижность на 90% за курс  
- Кожа головы: 
  — Пробуждает «спящие» луковицы → рост волос  
  — Лечит алопецию, себорею  
- Лицо: 
  — Убирает акне, рубцы, воспаления  
  — Заменяет дорогую биоревитализацию  

Почему это безопасно? 
Ваша плазма + тромбоциты = ноль аллергии, максимум эффекта.`,
    },
    {
      id: 13,
      slug: 'uzi-beremennost',
      imageSrc: '/services/uzi.png',
      serviceName: 'УЗИ при беременности',
      price: '250₽',
      description: 'Увидим сердцебиение, когда другие ещё не видят ничего',
      longDescription: `Ранние сроки :
  — Подтверждение беременности (с 3-4 недель).  
  — Оценка рисков выкидыша, внематочной. 
  — Диагностика генетических патологий.
3D/4D-формат:
  — Портреты малыша в режиме реального времени.
  — Обследование при многоплодии, резус-конфликте.`,
    },
    {
      id: 14,
      slug: 'uzi',
      imageSrc: '/services/uzi2.png',
      serviceName: 'УЗИ-диагностика',
      price: '250₽',
      description: 'Точность 99% — никаких скрытых угроз',
      longDescription: `- Живот, почки, щитовидка — проверим за 15 минут  
- Сердце и сосуды — найдем причину головокружений  
- Молочные железы — без страха, с комфортом  
- Суставы, лимфоузлы, рубцы — оценка за 2 минуты  
- Малышам: нейросонография (мозг), тазобедренные суставы  `,
    },
    {
      id: 15,
      slug: 'physiotherapy',
      imageSrc: '/services/physiotherapy.png',
      serviceName: 'Физиотерапия',
      price: '250₽',
      description: 'Восстанавливаем тело без таблеток и побочек',
      longDescription: `Электрофорез, ультразвук, магнитотерапия — подбираем индивидуально:  
    - Убираем боль и воспаление без лекарств  
    - Ускоряем заживление после травм и операций  
    - Улучшаем кровообращение и подвижность суставов  
    - Снимаем отёки и напряжение мышц  
    - Безопасно даже для детей и пожилых  

    Идеально при остеохондрозе, артрозе, невралгии и спазмах`,
    physioProcedures: physioProceduresData,
    }
  ];
  