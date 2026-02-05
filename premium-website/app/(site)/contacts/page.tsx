'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import emailjs from 'emailjs-com';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    // 1. Отправляем письмо пользователю
    const sendToUser = emailjs.send(
      'service_d5ejdz9',
      'template_v2ofuzf', // твой шаблон подтверждения для пользователя
      formData,
      'rg3ZXe_2vm2ejlIWW'
    );

    // 2. Отправляем письмо админу (указываем email админа и нужный шаблон)
    const sendToAdmin = emailjs.send(
      'service_d5ejdz9',
      'template_2tlppgm', // создаёшь отдельный шаблон для администратора
      {
        ...formData,
        to_email: 'premium.ufa02@gmail.com', // ключ должен совпадать с переменной to_email в шаблоне EmailJS
      },
      'rg3ZXe_2vm2ejlIWW'
    );

    // Ждём оба письма:
    Promise.all([sendToUser, sendToAdmin])
      .then(() => {
        alert("Спасибо! Сообщение отправлено.");
        setFormData({ name: '', email: '', phone: '', message: '' });
      })
      .catch((error) => {
        alert("Ошибка при отправке. Попробуйте еще раз.");
        console.error(error);
      });
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Контакты</h1>
      <p className={styles.description}>
        Напишите нам или оставьте заявку — мы свяжемся с вами в течение дня.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Имя
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>
            Телефон
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="message" className={styles.label}>
            Сообщение
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            className={styles.textarea}
            required
          />
        </div>

        <button type="submit" className={styles.submitButton}>
          Отправить
        </button>
      </form>
    </main>
  );
}
