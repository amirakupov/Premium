'use client'

export default function Footer() {
  return (
    <footer style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid #ccc' }}>
      <div>
        <h3>Контакты</h3>
        <p>Адрес: г. Ufa, ул. Amira Iakupova, 10</p>
        <p>Телефон: +7 (999) 999-999-999</p>
        <p>Email: info@neurologyclinic.ru</p>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>Документы</h3>
        <ul>
          <li><a href="#license">Лицензия</a></li>
          <li><a href="#policy">Политика конфиденциальности</a></li>
          <li><a href="#send-mri">Отправить МРТ</a></li>
          <li><a href="#about">О нас</a></li>
        </ul>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>Заявка</h3>
        <form>
          <input type="text" placeholder="Ваше имя" /><br />
          <input type="tel" placeholder="Ваш телефон" /><br />
          <button type="submit">Отправить</button>
        </form>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>Карта</h3>
        <iframe
          title="clinic-map"
          src="https://maps.google.com/..."
          width="100%"
          height="200"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
        ></iframe>
      </div>
    </footer>
  )
}
