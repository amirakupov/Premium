/**
 * Группа (admin) не добавляет ни шапки, ни отступов:
 * /admin рисует собственный каркас, /login — центрированную карточку.
 *
 * Единственное, что делает обёртка — надевает розовый скин токенов
 * (.admin-skin в app/globals.css) на оба маршрута сразу. Блочный div,
 * а не фрагмент, потому что скину нужен носитель класса и собственные
 * обои через ::before. На раскладку он не влияет: внутри у него
 * .shell высотой 100dvh и .screen с min-height: 100dvh.
 */
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
    return <div className="admin-skin">{children}</div>;
}
