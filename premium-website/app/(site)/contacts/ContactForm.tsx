'use client';

import { useState } from 'react';
import emailjs from '@emailjs/browser';
import styles from './page.module.css';
import { EMAILJS } from '@/lib/constants';

type Status = 'idle' | 'sending' | 'success' | 'error';

const initialForm = { name: '', email: '', phone: '', message: '' };

export default function ContactForm() {
  const [formData, setFormData] = useState(initialForm);
  const [status, setStatus] = useState<Status>('idle');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');

    try {
      await Promise.all([
        emailjs.send(
          EMAILJS.serviceId,
          EMAILJS.userTemplateId,
          formData,
          EMAILJS.publicKey
        ),
        emailjs.send(
          EMAILJS.serviceId,
          EMAILJS.adminTemplateId,
          { ...formData, to_email: EMAILJS.adminEmail },
          EMAILJS.publicKey
        ),
      ]);
      setStatus('success');
      setFormData(initialForm);
    } catch (error) {
      console.error('Не удалось отправить заявку', error);
      setStatus('error');
    }
  };

  return (
    <div className={styles.container}>
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
            autoComplete="name"
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
            autoComplete="email"
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
            autoComplete="tel"
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

        <button
          type="submit"
          className={`btn btn--brass ${styles.submit}`}
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Отправляем…' : 'Отправить'}
        </button>

        <p role="status" aria-live="polite" className={styles.formStatus}>
          {status === 'success' && 'Спасибо! Сообщение отправлено — мы свяжемся с вами в течение дня.'}
          {status === 'error' && 'Не удалось отправить сообщение. Попробуйте ещё раз или позвоните нам.'}
        </p>
      </form>
    </div>
  );
}
