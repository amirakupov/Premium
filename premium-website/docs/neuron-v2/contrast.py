"""Проверка контраста по всей длине перехода фона.

Запуск: python3 docs/neuron-v2/contrast.py

Скрипт повторяет ровно ту арифметику, что работает в рантайме:
  1) цвета глав интерполируются в ЛИНЕЙНОМ пространстве — так работает
     THREE.Color.lerp, цвета хранятся линейными после sRGB→linear;
  2) darknessOf берёт линейную яркость, гамма-корректирует и мапит smoothstep'ом
     (utils.ts);
  3) пара «текст + поверхность» перебрасывается СТУПЕНЬЮ на dark = 0.5, а не
     интерполируется: непрерывного варианта, который держит AA, не существует —
     см. комментарий в pageTheme.ts;
  4) стеклянные подложки композитятся альфой над фоном страницы.

Проверяется ХУДШАЯ точка по всей шкале, а не три точки на глаз.

Требования:
  — корпусный текст (< 18.66px)  ≥ 4.5:1
  — крупный текст (заголовки секций, Prata от 1.6rem ≈ 26px) ≥ 3:1
"""

STEPS = 701


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c):
    c = max(0.0, min(1.0, c))
    v = c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055
    return v * 255.0


def hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def smoothstep(e0, e1, x):
    t = clamp01((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)


def darkness_of(lin_rgb):
    lum = 0.2126 * lin_rgb[0] + 0.7152 * lin_rgb[1] + 0.0722 * lin_rgb[2]
    return 1 - smoothstep(0.25, 0.75, clamp01(lum) ** (1 / 2.2))


def rel_lum(srgb):
    lin = [srgb_to_linear(c) for c in srgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def over(fg, bg):
    """fg = (r, g, b, a) над непрозрачным bg."""
    a = fg[3]
    return [fg[i] * a + bg[i] * (1 - a) for i in range(3)]


# ── те же данные, что в sceneScript.ts ──
BACKGROUNDS = ['#eaf1ff', '#dae5f8', '#0f2547', '#0a1a33', '#0d2244',
               '#0a1628', '#0a1628', '#eaf1ff']
BG_LINEAR = [[srgb_to_linear(c) for c in hex_rgb(h)] for h in BACKGROUNDS]

# ── та же таблица, что в pageTheme.ts: (светлое, светлое-в-полосе, тёмное, тёмное-в-полосе) ──
TOKENS = {
    'ink':             ('#0f1f38', None, '#eaf1fb', None),
    'ink-soft':        ('#42546d', None, '#a7bcda', None),
    'brand':           ('#2563eb', None, '#6aa8f5', None),
    'surface':         ('#ffffff', None, '#16283f', None),
    'glass-bg':        ((255, 255, 255, 0.2),  (255, 255, 255, 0.96),
                        (10, 22, 40, 0.42),    (10, 22, 40, 0.96)),
    'glass-bg-strong': ((255, 255, 255, 0.34), (255, 255, 255, 0.97),
                        (10, 22, 40, 0.62),    (10, 22, 40, 0.97)),
    'plate-a':         ((255, 255, 255, 0.92), (255, 255, 255, 0.99),
                        (22, 40, 63, 0.92),    (22, 40, 63, 0.99)),
    'panel-bg':        ((255, 255, 255, 0.0),  (255, 255, 255, 0.96),
                        (10, 22, 40, 0.0),     (10, 22, 40, 0.96)),
}

SWAP_LUMINANCE = 0.22
BAND_LIGHT_EDGE = (0.62, 0.50)
BAND_DARK_EDGE = (0.04, 0.07)


def parse(v):
    return hex_rgb(v) + [1.0] if isinstance(v, str) else list(v)


PARSED = {}
for k, (lt, ltb, dk, dkb) in TOKENS.items():
    PARSED[k] = (parse(lt), parse(ltb if ltb is not None else lt),
                 parse(dk), parse(dkb if dkb is not None else dk))


def token(name, swap, band):
    lt, ltb, dk, dkb = PARSED[name]
    base, dense = (dk, dkb) if swap else (lt, ltb)
    return [base[i] + (dense[i] - base[i]) * band for i in range(4)]


# ── Что и где проверяем ──
#
# Проверка разделена на две части, и это не формальность:
#
# SWEEP — пары, которые могут оказаться на экране в любой точке шкалы: текст на
#   стеклянных поверхностях, на подложке и заголовки секций прямо на фоне. Они
#   проверяются во всех 701 точке.
#
# KEYFRAME — пары, которые встречаются только на конкретных главах. Корпусный
#   текст и синие ссылки прямо на фоне живут в хиро (#hero), в шапках секций
#   услуг и врачей и в подписи галереи — то есть на фонах этих глав, а не в
#   середине перехода. Проверять их по всей шкале бессмысленно: синий #2563eb
#   держит 4.5:1 только на самом светлом грунте, это свойство палитры проекта, а
#   не перехода. В мутной середине под такими блоками работает подложка
#   (нарративные экраны и шапка секции врачей).
SWEEP = [
    ('корпус на подложке нарратива',    'ink',      'panel-bg',        4.5, 'band'),
    ('вторичный на подложке нарратива', 'ink-soft', 'panel-bg',        4.5, 'band'),
    ('корпус на стекле карточки',       'ink',      'glass-bg',        4.5, 'all'),
    ('вторичный на стекле карточки',    'ink-soft', 'glass-bg',        4.5, 'all'),
    ('корпус на стекле шапки',          'ink',      'glass-bg-strong', 4.5, 'all'),
    ('вторичный на стекле шапки',       'ink-soft', 'glass-bg-strong', 4.5, 'all'),
    ('корпус на плашке карточки врача', 'ink',      'plate-a',         4.5, 'all'),
    ('заголовок секции на фоне',        'ink',      'page',            3.0, 'all'),
]

# глава → (что там лежит, краска, подложка, минимум)
#
# Отдельно про синий. --brand #2563eb на корпусном кегле — пограничный токен и
# БЕЗ всякого перехода: на --paper он даёт 4.66:1, то есть работает только на
# самом светлом грунте. Поэтому синие ссылки проверяются на фонах своих глав, а
# не по всей шкале: ни одна из секций со синими ссылками не попадает в мутную
# середину перехода. Полоса A идёт между #symptom и #diagnostics (нарративные
# экраны, ссылок там нет вовсе), полоса B — между #doctors и #outro, и шапка
# секции врачей на это время получает подложку.
#
# ВАЖНО: это утверждение держится на длинах секций. Если порядок или высота
# секций изменятся так, что секция со синими ссылками попадёт в полосу, скрипт
# надо перезапустить и, скорее всего, выдать этой секции такую же подложку, как
# у Doctors.headerContainer.
KEYFRAMES = [
    (0, '#hero',          [('корпус (lede)', 'ink-soft', 'page', 4.5),
                           ('акцент kicker', 'brand', 'page', 4.5)]),
    (4, '#services',      [('ссылка «Все услуги»', 'brand', 'page', 4.5),
                           ('цена и «Подробнее» на карточке', 'brand', 'glass-bg', 4.5)]),
    (5, '#clinic-photos', [('подпись галереи', 'ink-soft', 'page', 4.5)]),
    (6, '#doctors',       [('ссылка «Все врачи»', 'brand', 'page', 4.5)]),
]

worst = {label: (99.0, None) for label, *_ in SWEEP}
rows = []

for s in range(STEPS):
    p = (len(BACKGROUNDS) - 1) * s / (STEPS - 1)
    i = min(len(BACKGROUNDS) - 2, int(p))
    t = p - i
    lin = [BG_LINEAR[i][k] + (BG_LINEAR[i + 1][k] - BG_LINEAR[i][k]) * t for k in range(3)]
    lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    dark = round(clamp01(darkness_of(lin)) * 200) / 200
    swap = 1 if lum < SWAP_LUMINANCE else 0
    band = round(smoothstep(*BAND_LIGHT_EDGE, lum) * smoothstep(*BAND_DARK_EDGE, lum) * 100) / 100
    page = [linear_to_srgb(c) for c in lin]

    for label, fg_name, bg_name, need, where in SWEEP:
        # «вне полосы» — там, где переход завершён в ту или иную сторону
        if where == 'ends' and band > 0.02:
            continue
        # подложка нарратива существует только внутри полосы
        if where == 'band' and band <= 0.02:
            continue
        fg = token(fg_name, swap, band)[:3]
        bg = page if bg_name == 'page' else over(token(bg_name, swap, band), page)
        ratio = contrast(fg, bg)
        if ratio < worst[label][0]:
            worst[label] = (ratio, (p, dark, band))

    if s % 50 == 0:
        rows.append((p, lum, dark, swap, band, page))

print('=== шкала перехода ===')
print(f"{'глава p':>8} {'lum':>6} {'dark':>5} {'ступень':>8} {'полоса':>7}  фон")
for p, lum, dark, swap, band, page in rows:
    print(f'{p:8.2f} {lum:6.3f} {dark:5.2f} {swap:8d} {band:7.2f}  #%02x%02x%02x'
          % tuple(int(round(c)) for c in page))

print()
print('=== SWEEP: худший контраст по всей шкале ===')
ok = True
for label, fg_name, bg_name, need, where in SWEEP:
    ratio, at = worst[label]
    passed = ratio >= need
    ok = ok and passed
    print(f'{label:34} {ratio:5.2f}:1  нужно {need}  '
          f'{"ok" if passed else "ПРОВАЛ"}   худшая точка p={at[0]:.2f} '
          f'dark={at[1]:.2f} полоса={at[2]:.2f}')

print()
print('=== KEYFRAME: текст прямо на фоне — на главах, где он есть ===')
for idx, anchor, items in KEYFRAMES:
    lin = BG_LINEAR[idx]
    lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    swap = 1 if lum < SWAP_LUMINANCE else 0
    band = round(smoothstep(*BAND_LIGHT_EDGE, lum) * smoothstep(*BAND_DARK_EDGE, lum) * 100) / 100
    page = [linear_to_srgb(c) for c in lin]
    for what, fg_name, bg_name, need in items:
        bg = page if bg_name == 'page' else over(token(bg_name, swap, band), page)
        ratio = contrast(token(fg_name, swap, band)[:3], bg)
        passed = ratio >= need
        ok = ok and passed
        print(f'{anchor:16} {what:32} {ratio:5.2f}:1  нужно {need}  '
              f'{"ok" if passed else "ПРОВАЛ"}')

white_on_cta = contrast([255, 255, 255], hex_rgb('#2563eb'))
print()
print(f'белый на синей кнопке #2563eb (не участвует в переходе): '
      f'{white_on_cta:5.2f}:1  {"ok" if white_on_cta >= 4.5 else "ПРОВАЛ"}')

print()
print('ИТОГ:', 'все проверки проходят' if ok else 'ЕСТЬ ПРОВАЛЫ')
raise SystemExit(0 if ok else 1)
