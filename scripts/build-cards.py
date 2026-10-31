"""Convierte la carpeta de monas en cartas livianas para la web.

Uso:  python3 scripts/build-cards.py "/ruta/a/MONAS CLAUDE"

Lee DECENTES/<Rareza>/ e INDECENTES CULIAOS/<Rareza>/ (Comun, Rara, Epica, Legendaria, Mitica)
y "DECENTES/Uso general en la App" (reacciones). Escribe:
  assets/cards/<id>.webp     imagen completa (animada si era GIF), máx. 520 px
  assets/cards/t/<id>.webp   miniatura fija para la colección, máx. 260 px
  assets/reactions/<n>.webp  reacciones animadas
  js/data/cards.js           lista de cartas (la lee catalog.js)
  assets/manifest.json       rutas de reacciones (conserva sonidos y sobres)
Ids: decentes c001…, indecentes h001…  (el orden es alfabético por carpeta: no renombrar archivos ya usados).
"""
import hashlib, json, os, re, sys
from PIL import Image, ImageSequence

ROOT = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..')
RAR = [('Comun', 'comun'), ('Rara', 'rara'), ('Epica', 'epica'), ('Legendaria', 'legendaria'), ('Mitica', 'mitica')]
EXT = ('.png', '.jpg', '.jpeg', '.gif', '.webp')
# Koneko y Ravel (DxD) tienen apariencia infantil: no van en la serie indecente.
# Las que no son nada sugerentes pasan a la serie decente; las que tienen ligas o tajos se dejan fuera.
TO_DECENT = {'4017.jpg': 'Koneko', '4094.jpg': 'Koneko', '3822.jpg': 'Koneko y Ravel'}
EXCLUDE = {'4322.jpg', '4344.jpg', '4426.jpg'} | set(TO_DECENT)
SAD = {'12083.gif', '12084.gif', '221698.gif', '221699.gif', '221705.gif', "i-don't-know-what-to-do.gif",
       'bocchi-the-rock-bocchi (1).gif', 'bocchi-the-rock-bocchi-the-rock-meme.gif'}

LL = ['Sonoda Umi', 'Minami Kotori', 'Tojo Nozomi', 'Toujou Nozomi', 'Nishikino Maki', 'Hoshizora Rin', 'Ayase Eli',
      'Matsuura Kanan', 'Tsushima Yoshiko', 'Ohara Mari', 'Kurosawa Dia', 'Kunikida Hanamaru']


# Nombres revisados a mano (id | nombre | serie); mandan sobre lo que se adivina del archivo.
FIXED = {l.split('|')[0].strip(): [x.strip() for x in l.split('|')[1:]]
         for l in open(os.path.join(OUT, 'scripts', 'card-names.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')}


def name_set(fn, spicy):
    s = fn.replace('-', ' ').replace('_', ' ')
    for n in LL:
        if n in s:
            return n.replace('Toujou', 'Tojo'), 'Love Live!'
    low = s.lower()
    if 'teto' in low or 'tet pear' in low: return 'Kasane Teto', 'Vocaloid'
    if 'miku' in low: return 'Hatsune Miku', 'Vocaloid'
    if 'bocchi' in low or 'hitori' in low or 'kita' in low: return 'Bocchi', 'Bocchi the Rock!'
    if 'k on' in low or 'ritsu' in low or 'mugi' in low or 'mio' in low or 'yui' in low: return 'K-On!', 'K-On!'
    if spicy: return None, 'Serie Indecente'
    return None, 'Variadas'


def frames(im):
    return [f.copy() for f in ImageSequence.Iterator(im)]


def fit(im, side):
    im = im.convert('RGBA')
    im.thumbnail((side, side), Image.LANCZOS)
    return im


def save(src, dst, side, q, animate=True):
    im = Image.open(src)
    n = getattr(im, 'n_frames', 1)
    if animate and n > 1:
        fr = frames(im)
        step = max(1, len(fr) // 60)            # máx. ~60 cuadros
        fr = fr[::step]
        dur = [max(20, (im.info.get('duration') or 60) * step)] * len(fr)
        side = min(side, 360)
        out = [fit(f, side) for f in fr]
        out[0].save(dst, 'WEBP', save_all=True, append_images=out[1:], duration=dur, loop=0, quality=q - 15, method=4)
    else:
        im.seek(0)
        fit(im, side).save(dst, 'WEBP', quality=q, method=5)
    return n > 1


def main():
    os.makedirs(f'{OUT}/assets/cards/t', exist_ok=True)
    os.makedirs(f'{OUT}/assets/reactions', exist_ok=True)
    cards, seen = [], set()
    for folder, prefix, spicy in [('DECENTES', 'c', False), ('INDECENTES CULIAOS', 'h', True)]:
        k = 0
        for sub, rarity in RAR:
            d = os.path.join(ROOT, folder, sub)
            for fn in sorted(os.listdir(d)):
                if not fn.lower().endswith(EXT) or fn in EXCLUDE: continue
                p = os.path.join(d, fn)
                hsh = hashlib.sha1(open(p, 'rb').read()).hexdigest()
                if hsh in seen: continue
                seen.add(hsh)
                k += 1
                cid = f'{prefix}{k:03d}'
                anim = save(p, f'{OUT}/assets/cards/{cid}.webp', 520, 80)
                save(p, f'{OUT}/assets/cards/t/{cid}.webp', 260, 72, animate=False)
                name, set_ = FIXED.get(cid) or name_set(fn, spicy)
                cards.append({'id': cid, 'rarity': rarity, 'set': set_, 'name': name or ('Indecente' if spicy else 'Mona') + f' #{k}',
                              'spicy': spicy, 'anim': anim})
                print(cid, rarity, set_, fn[:50])
        if not spicy:   # al final de las decentes, para no correr los ids de las que ya existían
            for sub, rarity in RAR:
                d = os.path.join(ROOT, 'INDECENTES CULIAOS', sub)
                for fn in sorted(os.listdir(d)):
                    if fn not in TO_DECENT: continue
                    k += 1
                    cid = f'c{k:03d}'
                    p = os.path.join(d, fn)
                    anim = save(p, f'{OUT}/assets/cards/{cid}.webp', 520, 80)
                    save(p, f'{OUT}/assets/cards/t/{cid}.webp', 260, 72, animate=False)
                    cards.append({'id': cid, 'rarity': rarity, 'set': 'High School DxD', 'name': TO_DECENT[fn], 'spicy': False, 'anim': anim})
                    print(cid, rarity, 'DxD decente', fn)
    # reacciones: todo lo de "Uso general" (los duplicados se buscan en las otras carpetas)
    react = {'happy': [], 'sad': [], 'hype': []}
    gen = os.path.join(ROOT, 'DECENTES', 'Uso general en la App')
    index = {}
    for dp, _, fs in os.walk(os.path.join(ROOT, 'DECENTES')):
        for f in fs: index.setdefault(f, os.path.join(dp, f))
    names = [n for n in sorted(os.listdir(gen)) if n.lower().endswith(EXT)] if os.path.isdir(gen) else []
    want = json.load(open(os.path.join(OUT, 'scripts', 'reactions.json'))) if os.path.exists(os.path.join(OUT, 'scripts', 'reactions.json')) else None
    rseen = set()
    for i, fn in enumerate(want or names):
        p = index.get(fn)
        if not p: continue
        hsh = hashlib.sha1(open(p, 'rb').read()).hexdigest()
        if hsh in rseen: continue
        rseen.add(hsh)
        dst = f'assets/reactions/r{len(rseen):02d}.webp'
        save(p, f'{OUT}/{dst}', 280, 70)
        if fn in SAD: react['sad'].append(dst)
        else: react['happy'].append(dst); react['hype'].append(dst)
    js = ('// GENERADO por scripts/build-cards.py desde la carpeta de monas. No editar a mano\n'
          '// (para cambiar un nombre, edita NAMES en js/data/catalog.js).\n'
          'export const CARD_LIST = [\n' + ''.join(
              f"  {{ id: '{c['id']}', rarity: '{c['rarity']}', set: {json.dumps(c['set'])}, name: {json.dumps(c['name'], ensure_ascii=False)}, spicy: {str(c['spicy']).lower()}, anim: {str(c['anim']).lower()} }},\n"
              for c in cards) + '];\n')
    open(f'{OUT}/js/data/cards.js', 'w').write(js)
    mpath = f'{OUT}/assets/manifest.json'
    m = json.load(open(mpath))
    m['reactions'] = react
    m['cards'] = {}
    json.dump(m, open(mpath, 'w'), ensure_ascii=False, indent=2)
    from collections import Counter
    print(len(cards), 'cartas', Counter((c['spicy'], c['rarity']) for c in cards), len(rseen), 'reacciones')


main()
