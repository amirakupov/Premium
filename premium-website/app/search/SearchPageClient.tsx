'use client';
import { useSearchParams } from 'next/navigation';
import Fuse from 'fuse.js';
import Link from 'next/link';

const items = [
  {
    name: 'ЭЭГ',
    link: '/eeg',
    description: 'Диагностика и расшифровка электроэнцефалограммы.',
    keywords: ['eeg', 'энцефалограмма', 'мозг', 'электро'],
  },
  {
    name: 'Врачи',
    link: '/doctors',
    description: 'Опытные специалисты с высшей квалификацией.',
    keywords: ['doctor', 'врач', 'доктор', 'специалист', 'невролог'],
  },
  {
    name: 'Услуги',
    link: '/services',
    description: 'Полный спектр медицинских услуг для взрослых и детей.',
    keywords: ['сервисф', 'услуги', 'медицина', 'лечение'],
  },
    {
        name: 'Экстренная помощь',
        link: '/emergency',
        description: 'Круглосуточная экстренная медицинская помощь.',
        keywords: ['экстренная', 'помощь', 'неотложная', 'срочная'],
    },
    {
        name: 'Контакты',
        link: '/contacts',
        description: 'Свяжитесь с нами для записи на приём или консультацию.',
        keywords: ['контакты', 'связь', 'телефон', 'адрес'],
    },
    {
        name: 'Адрес клиники',
        link: '/#address',
        description: 'Наш адрес и схема проезда.',
        keywords: ['адрес', 'расположение', 'карта'],
    },    
];

const options = {
  keys: ['name', 'description', 'keywords'],
  threshold: 0.35,         // оптимально для русского и английского
  ignoreLocation: true,
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';

  const fuse = new Fuse(items, options);
  const results = query
    ? fuse.search(query).map(result => result.item)
    : [];

  return (
    <div className="search-results-container">
      <h2 className="search-title">Результаты поиска</h2>
      <p className="search-subtitle">
        {query
          ? <>По запросу: <b>{query}</b></>
          : <>Введите ваш запрос для поиска по сайту</>
        }
      </p>
      <div className="results-list">
        {results.length > 0 ? (
          results.map(item => (
            <Link href={item.link} key={item.link} className="result-card">
              <span className="result-name">{item.name}</span>
              <span className="result-desc">{item.description}</span>
            </Link>
          ))
        ) : query ? (
          <div className="not-found">Ничего не найдено</div>
        ) : null}
      </div>
      <style jsx>{`
        .search-results-container {
          max-width: 600px;
          margin: 40px auto;
          padding: 24px;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 6px 32px rgba(0,0,0,0.08);
        }
        .search-title {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 0.7em;
        }
        .search-subtitle {
          color: #666;
          margin-bottom: 2em;
        }
        .results-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .result-card {
          display: flex;
          flex-direction: column;
          padding: 18px 22px;
          background: #eaf6fc;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(110,170,220,0.07);
          transition: background 0.18s, transform 0.12s;
          text-decoration: none;
          color: #232323;
          border: 1.5px solid #c3e5f7;
        }
        .result-card:hover {
          background: #d3eafc;
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 8px 24px rgba(80,160,220,0.10);
          border-color: #97daf8;
        }
        .result-name {
          font-size: 1.16rem;
          font-weight: 500;
        }
        .result-desc {
          margin-top: 3px;
          font-size: 0.98rem;
          color: #567;
        }
        .not-found {
          color: #b44;
          text-align: center;
          margin: 30px 0;
          font-size: 1.15rem;
        }
      `}</style>
    </div>
  );
}