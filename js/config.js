// Datos públicos del proyecto de Supabase (Project Settings → API → Project URL y anon/publishable key).
// La key "anon/publishable" es pública por diseño: la seguridad la dan las reglas (RLS) y funciones de supabase/schema.sql.
// Si se dejan vacíos, la app funciona en modo local (sin login, ranking ni mercado).
window.CERT_CONFIG = {
  url: '',
  key: '',
  emailDomain: 'certamen2.app', // correo ficticio interno: usuario@certamen2.app (no se envían correos)
};
