import { h, $, esc } from '../dom.js';
import { S, save, level, titleFor } from '../state.js';
import { NET } from '../backend.js';
import { TOPICS } from '../content/lessons.js';
import { toast, SFX, coinRain, confetti } from '../fx.js';
import { go } from '../router.js';
import { hud } from '../game.js';
import { fmt } from '../util.js';

export function render(root) {
  const L = level();
  const el = h(`<section class="view home">
    <div class="hero card">
      <div class="grow">
        <small class="muted">Certamen 2 · Control de Máquinas Eléctricas</small>
        <h1>Hola, ${esc(NET.name)} 👋</h1>
        <p class="muted">Nivel ${L.lv} · ${titleFor(L.lv)}</p>
        <div class="bar"><i style="width:${Math.round(L.pct * 100)}%"></i></div>
        <small class="muted">${L.into} / ${L.need} XP para el nivel ${L.lv + 1}</small>
      </div>
    </div>
    <div class="grid2">
      <button class="cta big exam"><b>📝 Simulacro de certamen</b><small>12 preguntas · 12 minutos · nota 1,0–7,0</small></button>
      <button class="cta big rush"><b>⚡ Modo Rush</b><small>Preguntas sin parar, combos y cofres</small></button>
      <button class="cta learn"><b>📚 Aprender desde cero</b><small>10 lecciones con ejemplos resueltos</small></button>
      <button class="cta practice"><b>✍️ Practicar desarrollo</b><small>Escribe el desarrollo y los resultados</small></button>
    </div>
    <div class="card daily"></div>
    <div class="card"><h3>Misiones de hoy</h3><div class="missions"></div></div>
    <div class="card"><h3>Tu dominio por tema</h3><p class="small muted">Porcentaje de aciertos. Toca un tema para estudiarlo.</p><div class="topics"></div></div>
    <div class="card exams-card" hidden><h3>Tus últimos simulacros</h3><div class="exams"></div></div>
    <div class="card lobby" hidden><h3>En línea ahora</h3><div class="peers"></div><div class="hypelog small"></div></div>
  </section>`);
  $('.exam', el).onclick = () => go('exam');
  $('.rush', el).onclick = () => go('rush');
  $('.learn', el).onclick = () => go('learn');
  $('.practice', el).onclick = () => go('practice');

  // ---- premio diario
  const daily = $('.daily', el);
  const drawDaily = () => {
    daily.innerHTML = '';
    if (NET.dailyReady) {
      daily.append(h(`<div class="row"><div class="grow"><b>🎁 Premio diario disponible</b><br><small class="muted">Monedas según tu racha de días + 1 sobre gratis</small></div><button class="btn gold pulse">Reclamar</button></div>`));
      $('button', daily).onclick = async (e) => {
        e.target.disabled = true;
        try {
          const r = await NET.claimDaily();
          if (r.ok) { SFX.coin(); coinRain(30); confetti(e.clientX, e.clientY, 50); toast(`+${r.coins} monedas y 1 sobre gratis`, `Racha de ${r.streak} día${r.streak > 1 ? 's' : ''} 🔥`, '🎁', 'gold'); }
        } catch (err) { toast('No se pudo reclamar', err.message, '!', 'bad'); }
        hud(true); drawDaily();
      };
    } else daily.append(h(`<div class="row"><div class="grow"><b>🔥 Racha de ${NET.dayStreak} día${NET.dayStreak === 1 ? '' : 's'}</b><br><small class="muted">Vuelve mañana por otro premio diario.</small></div>${NET.freePacks ? `<button class="btn">Abrir sobre gratis (${NET.freePacks})</button>` : ''}</div>`));
    const b = daily.querySelector('.btn:not(.gold)'); if (b) b.onclick = () => go('cards');
  };
  drawDaily();

  // ---- misiones
  const ms = $('.missions', el);
  const drawM = () => {
    ms.innerHTML = '';
    for (const m of S.missions) {
      const row = h(`<div class="mission ${m.done ? 'done' : ''}"><div class="grow"><b></b><div class="bar thin"><i style="width:${Math.round(m.p / m.n * 100)}%"></i></div><small class="muted">${m.p}/${m.n}</small></div><button class="btn sm ${m.done && !m.claimed ? 'gold pulse' : ''}" ${m.done && !m.claimed ? '' : 'disabled'}>${m.claimed ? 'Cobrada ✓' : `+${m.coins} 🪙`}</button></div>`);
      $('b', row).textContent = m.t;
      $('button', row).onclick = async (e) => {
        e.target.disabled = true;
        try { await NET.claimMission(m.coins); m.claimed = true; save(true); SFX.coin(); coinRain(15); toast(`+${m.coins} monedas`, m.t, '🎯', 'gold'); }
        catch (err) { toast('No se pudo cobrar', err.message, '!', 'bad'); m.claimed = true; save(true); }
        hud(true); drawM();
      };
      ms.append(row);
    }
  };
  drawM();

  // ---- dominio por tema
  const tp = $('.topics', el);
  for (const t of TOPICS) {
    const st = S.byTopic[t.id] || { ok: 0, n: 0 };
    const pct = st.n ? Math.round(st.ok / st.n * 100) : 0;
    const row = h(`<button class="topicrow"><span>${t.icon}</span><span class="grow">${esc(t.short)}${S.lessons[t.id]?.done ? ' ✓' : ''}</span><span class="bar thin w"><i style="width:${pct}%;background:${pct >= 70 ? 'var(--ok)' : pct >= 40 ? 'var(--gold)' : 'var(--bad)'}"></i></span><small>${st.n ? pct + '%' : '—'}</small></button>`);
    row.onclick = () => go('learn', { topic: t.id });
    tp.append(row);
  }

  if (S.exams.length) {
    $('.exams-card', el).hidden = false;
    for (const e of S.exams.slice(0, 5)) $('.exams', el).append(h(`<div class="row small"><span class="grade ${e.grade >= 4 ? 'ok' : 'bad'}">${fmt(e.grade).padEnd(3, ',0')}</span><span class="grow">${e.mode === 'desarrollo' ? 'Desarrollo' : 'Alternativas'} · ${e.correct}/${e.total} · ${Math.floor(e.seconds / 60)}:${String(e.seconds % 60).padStart(2, '0')}</span><span class="muted">${new Date(e.at).toLocaleDateString('es-CL')}</span></div>`));
  }

  if (NET.sb) {
    const lob = $('.lobby', el); lob.hidden = false;
    const drawL = () => {
      $('.peers', lob).textContent = NET.lobby.peers.length ? NET.lobby.peers.map(p => `${p.n || 'Alguien'} (nv ${p.lv || 1})`).join(' · ') : 'Nadie más por ahora.';
      $('.hypelog', lob).innerHTML = NET.lobby.log.map(x => `<div>⚡ <b>${esc(x.a)}</b> ${esc(x.t)}</div>`).join('');
    };
    drawL(); el._lobby = drawL;
  }
  root.append(el);
  return { refresh: () => el._lobby?.() };
}
