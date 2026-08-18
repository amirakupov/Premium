import Image from 'next/image';
import styles from './ClinicFotos.module.css';

const photos: string[] = [
  '/clinic/clinic11.jpg',
  '/clinic/clinic10.jpg',
  '/clinic/clinic7.jpg',
  '/clinic/clinic6.jpg',
  '/clinic/clinic13.png',
  '/clinic/clinic5.jpg',
  '/clinic/clinic4.jpg',
  '/clinic/clinic12.jpg',
  '/clinic/clinic14.jpg',
  '/clinic/clinic9.jpg',
];

/**
 * Галерея клиники.
 *
 * Раньше компонент был клиентским только ради одного gsap.fromTo на слайдах.
 * Теперь появление слайдов и параллакс фотографий ведёт общий SectionMotion, а
 * галерея вернулась в серверные компоненты: разметка целиком попадает в HTML, и
 * из клиентского бандла ушёл ещё один модуль.
 *
 * `id="clinic-photos"` — якорь главы «Кульминация: сбор», см. neuron/sceneScript.ts.
 */
export default function ClinicFotos() {
  return (
    <section id="clinic-photos" className={styles.carousel}>
      <h2 className={styles.heading} data-reveal="heading">Как выглядит клиника</h2>
      <p className={styles.subheading}>
        Мы используем самое современное и качественное оборудование в связке с
        приятным интерьером для вашего комфорта
      </p>

      <div className={styles.slides} data-reveal-group>
        {photos.map((src, index) => (
          <div className={styles.slide} data-reveal="card" key={src}>
            <div className={styles.slideMedia}>
              {/* Обёртка нужна параллаксу: двигать сам <Image> нельзя, на нём
                  висит ховерный transform. Слой выше рамки по высоте, поэтому
                  при сдвиге не открывается пустой край. */}
              <div className={styles.parallaxLayer} data-parallax>
                <Image
                  src={src}
                  alt={`Интерьер и оборудование клиники — фото ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 90vw, 45vw"
                  style={{ objectFit: 'cover' }}
                  className={styles.image}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
