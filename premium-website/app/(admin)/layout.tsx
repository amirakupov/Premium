/**
 * Группа (admin) не добавляет ни шапки, ни отступов:
 * /admin рисует собственный каркас, /login — центрированную карточку.
 */
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
    return children;
}
