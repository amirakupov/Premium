// Фикстурный бэкенд для замеров: отдаёт услуги/врачей с картинками из public/,
// логирует каждый запрос с таймстампом (для проверки кэша D1).
import http from 'node:http';
import fs from 'node:fs';
const LOG = process.env.MOCK_LOG || '/tmp/mock-backend.log';
const svcImgs = ['eeg','uzi2','massage','elektro','blocade','capelnic','anal','eeg','uzi2','massage','elektro','blocade'];
const services = svcImgs.map((img, i) => ({
  id: i + 1, slug: `service-${img}`, imageSrc: `/services/${img}.png`,
  serviceName: ['ЭЭГ','УЗДГ сосудов','Массаж','Физиотерапия','Ботулинотерапия','Блокады','Капельницы','Озонотерапия','Плазмотерапия','ВЛОК','Электромиография','Анализы'][i],
  price: 1500 + i * 350,
  description: 'Диагностика и терапия заболеваний нервной системы доказательными методами. Приём ведёт невролог.',
  longDescription: '<p>Подробное описание.</p>',
}));
const docImgs = ['azam','bash','berg','guzel','ildar','ivan'];
const doctors = docImgs.map((img, i) => ({
  id: i + 1, imgSrc: `/hero/founder.jpg`, // public/doctors удалён (не использовался кодом)
  name: ['Азамат Р.','Башир К.','Елена Берг','Гузель И.','Ильдар С.','Иван П.'][i],
  specialty: ['Невролог','Физиотерапевт','Невролог, эпилептолог','Массажист','Невролог','Нейрофизиолог'][i],
  bio: 'Стаж 12 лет. Диагностика и лечение головной боли, эпилепсии, последствий инсульта. Автор 8 научных публикаций.',
}));
const delay = Number(process.env.MOCK_DELAY_MS || 0);
http.createServer((req, res) => {
  fs.appendFileSync(LOG, `${new Date().toISOString()} ${req.method} ${req.url}\n`);
  const send = (body) => setTimeout(() => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  }, delay);
  if (req.url === '/api/cms/services') return send(services);
  if (req.url === '/api/cms/doctors') return send(doctors);
  if (req.url === '/api/cms/blog') return send([]);
  res.writeHead(404); res.end();
}).listen(8080, () => console.log('mock backend :8080'));
