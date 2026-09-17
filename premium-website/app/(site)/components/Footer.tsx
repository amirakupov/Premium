import Link from "next/link";
import styles from "./Footer.module.css";
import A11yTrigger from "@/app/(site)/components/a11y/A11yTrigger";
import MapEmbed from "@/app/(site)/components/MapEmbed";
import { CLINIC } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className={styles.footer} id="address">
      <div className={styles.container}>

        <div className={styles.topArea}>
          <div className={styles.mapWrapper}>
            {/* iframe Яндекс Карт — только после согласия на cookies */}
            <MapEmbed />
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
              <Link href="/documents" className={styles.link}>Раскрытие информации</Link>
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
          <A11yTrigger className={styles.a11yBtn} />
        </div>
      </div>
    </footer>
  );
}
