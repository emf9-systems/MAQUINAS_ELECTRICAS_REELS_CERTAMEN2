# Multimedia (parte 2)

La app ya funciona sin ningún archivo de esta carpeta: los sonidos se sintetizan y las cartas muestran un arte provisional.
Para enchufar la multimedia basta con copiar los archivos aquí y anotarlos en `manifest.json`. No hay que tocar el código.

| Clave en `manifest.json` | Qué es | Formato recomendado |
|---|---|---|
| `cards.c001` … `cards.c060` | Arte de cada carta (id = el de `js/data/catalog.js`) | WebP vertical 5:7, ~400×560, < 80 KB |
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

Para cambiar el **nombre o la serie** de una carta, edita `js/data/catalog.js` (no cambies los ids `c001`…).
Si se agregan cartas nuevas, después hay que correr `node scripts/gen-seed.mjs` y pegar `supabase/seed.sql` en Supabase.
