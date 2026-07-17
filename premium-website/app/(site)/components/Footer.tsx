import Link from "next/link";
import styles from "./Footer.module.css";
import A11yToggle from "@/app/(site)/components/A11yToggle";
import { CLINIC } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className={styles.footer} id="address">
      <div className={styles.container}>

        <div className={styles.topArea}>
          <div className={styles.mapWrapper}>
            <iframe
              src="https://yandex.ru/map-widget/v1/?um=constructor%3Ad327fce798422fcd5d920a9ccc441768bc8681acc45894d3adc940841067f112&amp;source=constructor"
              width="500"
              height="400"
              frameBorder="0"
              loading="lazy"
              title="Клиника «Премиум» на карте"
            ></iframe>
          </div>

          <div className={styles.columns}>
            <div className={styles.column}>
              <h4 className={styles.title}>Клиника</h4>
              <Link href="/" className={styles.link}>Главная</Link>
              <Link href="/contacts" className={styles.link}>Контакты</Link>
            </div>

            <div className={styles.column}>
              <h4 className={styles.title}>Услуги</h4>
              <Link href="/contacts" className={styles.link}>Заявка</Link>
              <Link href="/documents" className={styles.link}>Документы</Link>
            </div>

            <div className={styles.column}>
              <h4 className={styles.title}>Адрес</h4>
              <p className={styles.text}>
                {CLINIC.address}<br />
                Респ. Башкортостан, 450018
              </p>
              <p className={styles.text}>
                {CLINIC.hoursWeekdays}<br />
                {CLINIC.hoursWeekend}
              </p>
              <p className={styles.text}>
                <a href={CLINIC.phoneHref} className={styles.link}>{CLINIC.phone}</a>
              </p>
              <p className={styles.text}>
                <a
                  href={CLINIC.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Instagram
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.text}>© {new Date().getFullYear()} {CLINIC.name}</p>
          <A11yToggle className={styles.a11yBtn} />
        </div>
      </div>
    </footer>
  );
}
