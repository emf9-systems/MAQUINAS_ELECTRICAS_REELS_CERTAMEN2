# Multimedia (parte 2)

Las cartas (`assets/cards/`) y las reacciones (`assets/reactions/`) se generan con `python3 scripts/build-cards.py "<carpeta MONAS CLAUDE>"` (ver README principal). Los sonidos se sintetizan mientras no haya archivos.
Para enchufar la multimedia basta con copiar los archivos aquí y anotarlos en `manifest.json`. No hay que tocar el código.

| Clave en `manifest.json` | Qué es | Formato recomendado |
|---|---|---|
| `cards.<id>` | (opcional) Reemplaza el arte de una carta. Normalmente no se usa: el arte sale de `assets/cards/<id>.webp`, que genera `scripts/build-cards.py` | WebP |
| `packs.diario`, `packs.basico`, `packs.grande`, `packs.legendario` | Imagen del sobre en la tienda | WebP 3:4 |
| `reactions.happy` / `sad` / `hype` | Listas de GIF/WebP animados que aparecen al acertar, fallar o en combos | WebP animado < 150 KB |
| `sounds.correct`, `wrong`, `coin`, `click`, `tick`, `whoosh`, `combo`, `levelup`, `fanfare`, `pack_shake`, `pack_open` | Efectos de sonido (puede ser una ruta o una lista para elegir al azar) | MP3/OGG cortos (< 2 s) |
| `sounds.reveal_1` … `reveal_5` | Sonido al revelar una carta según rareza (1 común … 5 mítica) | MP3/OGG |
| `avatars` | (opcional) Fotos de perfil predefinidas para elegir | WebP 256×256 |

Ejemplo:

```json
{
  "cards": { "c001": "assets/cards/c001.webp", "c060": "assets/cards/c060.webp" },
  "reactions": { "happy": ["assets/reactions/yay1.webp"], "sad": [], "hype": [] },
  "sounds": { "correct": ["assets/sounds/ok1.mp3", "assets/sounds/ok2.mp3"], "reveal_5": "assets/sounds/mitica.mp3" }
}
```

Para cambiar el **nombre o la serie** de una carta, edita su línea en `scripts/card-names.txt` (formato `id | nombre | serie`) y vuelve a correr el script. Para un cambio rápido sin regenerar, también sirve `NAMES` en `js/data/catalog.js`. No cambies los ids `c001`….
Si se agregan cartas nuevas, después hay que correr `node scripts/gen-seed.mjs` y pegar `supabase/seed.sql` en Supabase.
