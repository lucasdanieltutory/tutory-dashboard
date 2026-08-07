/**
 * utm-tracking.js — Tutory UTM Capture
 * Adicione este arquivo no seu projeto v0/Next.js
 * e chame captureUTM() no layout raiz e getUTMData() no submit do form.
 */

// ── 1. Captura UTMs da URL e guarda na sessão ────────────────────
export function captureUTM() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  let saved = false;
  UTM_KEYS.forEach(key => {
    const val = params.get(key);
    if (val) {
      sessionStorage.setItem(key, val);
      saved = true;
    }
  });
  if (saved) {
    console.log('[UTM] Capturado:', Object.fromEntries(
      UTM_KEYS.map(k => [k, sessionStorage.getItem(k)]).filter(([, v]) => v)
    ));
  }
}

// ── 2. Retorna os dados UTM para incluir no submit do form ────────
export function getUTMData() {
  if (typeof window === 'undefined') return {};
  const source = sessionStorage.getItem('utm_source') || '';
  const medium = sessionStorage.getItem('utm_medium') || '';
  const campaign = sessionStorage.getItem('utm_campaign') || '';
  const content = sessionStorage.getItem('utm_content') || '';

  // Detecta plataforma de origem
  let plataforma_ad = 'organico';
  if (source === 'google') plataforma_ad = 'google';
  else if (source === 'facebook' || source === 'instagram' || medium === 'paid_social') plataforma_ad = 'meta';
  else if (source === 'linkedin') plataforma_ad = 'linkedin';
  else if (source === 'tiktok') plataforma_ad = 'tiktok';

  return {
    plataforma_ad,
    canal: medium || 'Orgânico',
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
  };
}
