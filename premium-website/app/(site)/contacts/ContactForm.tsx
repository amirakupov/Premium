'use client';

import { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import styles from './page.module.css';
import { EMAILJS } from '@/lib/constants';
import ConsentCheckbox from '@/app/(site)/components/ConsentCheckbox';
import { type LeadErrors, validateLead } from '@/lib/forms/lead';

type Status = 'idle' | 'sending' | 'success' | 'error';

const initialForm = { name: '', email: '', phone: '', message: '' };

// Порядок совпадает с порядком полей в разметке: первым фокус получает то
// поле, что стоит выше, а не то, что раньше проверил validateLead.
const TEXT_FIELDS = ['name', 'email', 'phone', 'message'] as const;

export default function ContactForm() {
  const [formData, setFormData] = useState(initialForm);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>('idle');

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const fieldRefs = {
    name: nameRef,
    email: emailRef,
    phone: phoneRef,
    message: messageRef,
  } as const;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Гасим ошибку поля сразу, как его исправили, — так уже устроено у
    // согласия: висящий красный текст под уже заполненным полем читается
    // как «всё ещё не так».
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;

    // Сбрасываем статус прошлой попытки в начале новой: иначе «Спасибо,
    // сообщение отправлено» может повиснуть рядом с новой ошибкой согласия.
    setStatus('idle');

    // Проверяем до отправки: без согласия данные уходить не должны вовсе.
    const found = validateLead({ ...formData, consent });
    setErrors(found);

    if (Object.keys(found).length > 0) {
      const firstInvalidField = TEXT_FIELDS.find((field) => found[field]);
      // Переводим фокус на первое поле с ошибкой — иначе кнопка молча не
      // делает ничего, а сообщение об ошибке уходит с экрана вне поля зрения.
      if (firstInvalidField) fieldRefs[firstInvalidField].current?.focus();
      return;
    }

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
      setConsent(false);
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

      {/*
        noValidate: без него часть ошибок ловит не наш валидатор, а
        встроенная проверка браузера — она блокирует onSubmit ДО того, как
        JS вообще запустится, и наши aria-invalid/aria-describedby и фокус на
        первом невалидном поле просто не успевают сработать. Валидация
        остаётся полностью на validateLead — так же, как уже сделано у
        согласия, которое никогда не было HTML5-полем.
      */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Имя
          </label>
          <input
            id="name"
            name="name"
            type="text"
            ref={nameRef}
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined}
            required
          />
          {errors.name ? (
            <p id="name-error" role="alert" className="field-error">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            ref={emailRef}
            value={formData.email}
            onChange={handleChange}
            className={styles.input}
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            required
          />
          {errors.email ? (
            <p id="email-error" role="alert" className="field-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>
            Телефон
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            ref={phoneRef}
            value={formData.phone}
            onChange={handleChange}
            className={styles.input}
            autoComplete="tel"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone ? (
            <p id="phone-error" role="alert" className="field-error">
              {errors.phone}
            </p>
          ) : null}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="message" className={styles.label}>
            Сообщение
          </label>
          <textarea
            id="message"
            name="message"
            ref={messageRef}
            value={formData.message}
            onChange={handleChange}
            className={styles.textarea}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? 'message-error' : undefined}
            required
          />
          {errors.message ? (
            <p id="message-error" role="alert" className="field-error">
              {errors.message}
            </p>
          ) : null}
        </div>

        <ConsentCheckbox
          checked={consent}
          onChange={(next) => {
            setConsent(next);
            // Убираем ошибку сразу, как её исправили: висящий красный текст
            // под уже поставленной галочкой читается как «всё ещё не так».
            setErrors((prev) => ({ ...prev, consent: undefined }));
          }}
          error={errors.consent}
        />

        <button
          type="submit"
          className={`btn btn--primary ${styles.submit}`}
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
