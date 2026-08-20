// dashboard-utils.js — helpers globais ($, fmt, charts, chips/badges, classificação, estado do Aeroporto
const $=id=>document.getElementById(id);
const fmt={
  brlK:v=>{const n=+v;return n>=1000?'R$'+(n/1000).toFixed(1)+'K':'R$'+n.toFixed(0);},
  brl:v=>'R$'+(+v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
  pct:v=>(+v).toFixed(1)+'%',
  num:v=>Math.round(+v).toLocaleString('pt-BR'),
  k:v=>{const n=+v;return n>=1000?(n/1000).toFixed(0)+'K':String(n);}
};
function days(n=30){return Array.from({length:n},(_,i)=>{const d=new Date();d.setDate(d.getDate()-n+i+1);return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});});}
setInterval(()=>{$('clk').textContent=new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});},1000);

// CHARTS
Chart.defaults.color='#8090B0';
Chart.defaults.font.family="'Outfit',sans-serif";
Chart.defaults.font.size=11;
Chart.defaults.plugins.legend.display=false;
Chart.defaults.plugins.tooltip.backgroundColor='#0C1020';
Chart.defaults.plugins.tooltip.borderColor='#1E2640';
Chart.defaults.plugins.tooltip.borderWidth=1;
Chart.defaults.plugins.tooltip.titleColor='#E6EFFF';
Chart.defaults.plugins.tooltip.bodyColor='#8090B0';
Chart.defaults.plugins.tooltip.padding=10;
const CC={};
function dc(id){if(CC[id]){CC[id].destroy();delete CC[id];}}
const GR={color:'rgba(255,255,255,.04)'};
function mkB(id,lb,ds,op={}){dc(id);const c=$(id);if(!c)return;CC[id]=new Chart(c,{type:'bar',data:{labels:lb,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#3A4560',maxRotation:op.rot||0}},y:{grid:GR,ticks:{color:'#3A4560',...(op.ticks||{})}}}}});}
function mkD(id,lb,dt,cl){dc(id);const c=$(id);if(!c)return;CC[id]=new Chart(c,{type:'doughnut',data:{labels:lb,datasets:[{data:dt,backgroundColor:cl,borderColor:'#04060F',borderWidth:3,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false}}}});}

// HELPERS
function scC(s){const n=+s;return n>=8?'var(--gn)':n>=5?'#FF8C55':'var(--red)';}
function cplC(v,m=15){const n=+v;if(!n)return'var(--dim)';return n<80?'var(--gn)':n<=130?'#6AAAFF':n<=180?'#FF8C55':'var(--red)';}
function cplChip(v,m=15){const n=+v;if(n===0||!n)return'<span class="chip" style="background:var(--s2);color:var(--dim);border:1px solid var(--brd2)">— Sem dados</span>';if(n<80)return'<span class="chip top">🚀 Escalar</span>';if(n<=130)return'<span class="chip ok">✓ OK</span>';if(n<=180)return'<span class="chip lim">⚠ Limite</span>';return'<span class="chip paus">✕ Pausar</span>';}
function cplChipHub(v){const n=+v;if(n===0||!n)return'<span class="chip" style="background:var(--s2);color:var(--dim);border:1px solid var(--brd2)">— Sem dados</span>';if(n<60)return'<span class="chip top">🚀 Escalar</span>';if(n<=110)return'<span class="chip ok">✓ OK</span>';if(n<=150)return'<span class="chip lim">⚠ Limite</span>';return'<span class="chip paus">✕ Pausar</span>';}
function cplChipEx(v){const n=+v;if(n===0||!n)return'<span class="chip" style="background:var(--s2);color:var(--dim);border:1px solid var(--brd2)">— Sem dados</span>';if(n<300)return'<span class="chip top">🚀 Escalar</span>';if(n<=500)return'<span class="chip ok">✓ OK</span>';return'<span class="chip paus">✕ Pausar</span>';}
function ctrChip(v){return +v>=2?'<span class="chip ok">✓ OK</span>':'<span class="chip lim">⚠ Baixo</span>';}
function leadChip(c){if(c==='Quente')return'<span class="chip hot">🔥 Quente</span>';if(c==='Morno')return'<span class="chip warm">◎ Morno</span>';return'<span class="chip cold">● Frio</span>';}
function classifBadge(c){
  const map={
    'Qualificado':      {bg:'rgba(34,197,94,.2)',  border:'rgba(34,197,94,.5)',  color:'#22C55E', icon:'✅', label:'Qualificado'},
    'Pré-qualificado':  {bg:'rgba(234,179,8,.2)',  border:'rgba(234,179,8,.5)',  color:'#EAB308', icon:'⚡', label:'Pré-qualificado'},
    'Desqualificação prévia':{bg:'rgba(249,115,22,.2)',border:'rgba(249,115,22,.5)',color:'#F97316',icon:'⚠',label:'Desq. prévia'},
    'Desqualificado':   {bg:'rgba(239,68,68,.2)',   border:'rgba(239,68,68,.5)',  color:'#EF4444', icon:'✕', label:'Desqualificado'},
  };
  const s=map[c];
  if(!s)return`<div style="background:var(--s3);border:1px solid var(--brd2);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:600;color:var(--sub);text-align:center;">— Pendente</div>`;
  return`<div style="background:${s.bg};border:1px solid ${s.border};border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;color:${s.color};text-align:center;">${s.icon} ${s.label}</div>`;
}
function classifChip(c){
  if(c==='Qualificado')return'<span style="background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);color:#22C55E;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">✅ Qualificado</span>';
  if(c==='Pré-qualificado')return'<span style="background:rgba(234,179,8,.15);border:1px solid rgba(234,179,8,.4);color:#EAB308;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">⚡ Pré-qualificado</span>';
  if(c==='Desqualificação prévia')return'<span style="background:rgba(249,115,22,.15);border:1px solid rgba(249,115,22,.4);color:#F97316;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">⚠ Desq. prévia</span>';
  if(c==='Desqualificado')return'<span style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#EF4444;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">✕ Desqualificado</span>';
  return'<span style="background:var(--s2);border:1px solid var(--brd2);color:var(--sub);padding:3px 10px;border-radius:20px;font-size:11px;">— Pendente</span>';
}
function classifSelect(leadId, atual){
  const opts=['Qualificado','Pré-qualificado','Desqualificação prévia','Desqualificado'];
  return`<select onchange="salvarClassifLead('${leadId}',this.value)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:8px;padding:4px 8px;color:var(--txt);font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;">
    <option value="">— Classificar</option>
    ${opts.map(o=>`<option value="${o}" ${o===atual?'selected':''}>${o}</option>`).join('')}
  </select>`;
}
async function salvarClassifLead(id, classificacao, selectEl){
  try{
    await supaUpdate('leads_mentoria', id, {classificacao_manual: classificacao});
    // Atualiza só o badge sem recarregar tudo
    if(selectEl){
      const td = selectEl.closest('td');
      if(td){
        const badge = td.querySelector('div > div');
        if(badge) badge.outerHTML = classifBadge(classificacao);
      }
    }
    // Atualiza seções de qualificação
    if(window._mnLeads){ const _r=window._mnLeads.find(r=>r.id===id); if(_r) _r.classificacao_manual=classificacao; renderMnSecoes(window._mnLeads); }
    // Atualiza contadores e gráfico
    const {ini,fim}=getDates('mentoria');
    supaFetch('leads_mentoria',`select=classificacao_manual&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59`).then(leads=>{
      const hot=leads.filter(r=>r.classificacao_manual==='Qualificado').length;
      const warm=leads.filter(r=>r.classificacao_manual==='Pré-qualificado').length;
      const dqp=leads.filter(r=>r.classificacao_manual==='Desqualificação prévia').length;
      const cold=leads.filter(r=>r.classificacao_manual==='Desqualificado').length;
      if($('mn-hot'))$('mn-hot').textContent=hot;
      if($('mn-dh'))$('mn-dh').textContent=hot;
      if($('mn-dw'))$('mn-dw').textContent=warm;
      if($('mn-dq'))$('mn-dq').textContent=dqp;
      if($('mn-dc'))$('mn-dc').textContent=cold;
      if($('g-hot'))$('g-hot').textContent=hot;
      mkD('c-mn-pie',['Qualificado','Pré-qualificado','Desq. prévia','Desqualificado'],[hot,warm,dqp,cold],['#22C55E','#EAB308','#F97316','#EF4444']);
      mkD('c-g-pie',['Qualificado','Pré-qualificado','Desq. prévia','Desqualificado'],[hot,warm,dqp,cold],['#22C55E','#EAB308','#F97316','#EF4444']);
    });
  }catch(e){console.error('Erro ao salvar classificação:',e); alert('Erro ao salvar: '+e.message);}
}
function renderMnSecoes(leads){
  const _wa = p => { if(!p) return '—'; const n=p.replace(/\D/g,''); const num=n.startsWith('55')?n:'55'+n; return `<a href="https://wa.me/${num}" target="_blank" style="color:#25D366;text-decoration:none;font-size:11px;">📱 ${p}</a>`; };
  const _row = r => `<tr>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong style="font-size:12px;">${r.contact_name||'—'}</strong></td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${igLink(r.contact_instagram)}</td>
    <td class="cel-wrap">${platChip(r.plataforma_ad)}</td>
    <td class="cel-wrap">${canalChip(r.canal)}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.cargo||r.cargo_lp||'—'}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.faturamento||'—'}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.contact_email||'—'}</td>
    <td style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_wa(r.contact_phone)}</td>
    <td class="cel-classif">
      <select onchange="salvarClassifLead('${r.id}',this.value,this)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:6px;padding:3px 6px;color:var(--txt);font-size:10px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;width:100%;">
        <option value="">— Classificar</option>
        <option value="Qualificado" ${'Qualificado'===r.classificacao_manual?'selected':''}>✅ Qualificado</option>
        <option value="Pré-qualificado" ${'Pré-qualificado'===r.classificacao_manual?'selected':''}>⚡ Pré-qualificado</option>
        <option value="Desqualificação prévia" ${'Desqualificação prévia'===r.classificacao_manual?'selected':''}>⚠ Desq. prévia</option>
        <option value="Desqualificado" ${'Desqualificado'===r.classificacao_manual?'selected':''}>✕ Desqualificado</option>
      </select>
    </td>
  </tr>`;
  const _empty = msg => `<tr class="er"><td colspan="9" style="color:var(--dim);font-style:italic;text-align:center;padding:14px;">${msg}</td></tr>`;
  const s1=leads.filter(r=>r.classificacao_manual==='Qualificado');
  const s2=leads.filter(r=>r.classificacao_manual==='Pré-qualificado');
  const s3=leads.filter(r=>r.classificacao_manual==='Desqualificado');
  const s1c=$('mn-s1-count'); if(s1c) s1c.textContent=s1.length+(s1.length===1?' lead':' leads');
  const s2c=$('mn-s2-count'); if(s2c) s2c.textContent=s2.length+(s2.length===1?' lead':' leads');
  const s3c=$('mn-s3-count'); if(s3c) s3c.textContent=s3.length+(s3.length===1?' lead':' leads');
  const s1tb=$('mn-s1-leads'); if(s1tb) s1tb.innerHTML=s1.length?s1.map(_row).join(''):_empty('Nenhum lead qualificado ainda');
  const s2tb=$('mn-s2-leads'); if(s2tb) s2tb.innerHTML=s2.length?s2.map(_row).join(''):_empty('Nenhum lead pré-qualificado ainda');
  const s3tb=$('mn-s3-leads'); if(s3tb) s3tb.innerHTML=s3.length?s3.map(_row).join(''):_empty('Nenhum lead desqualificado ainda');
}
function renderPlatLeads(pfx, leads){
  const _wa=p=>{if(!p)return'—';const n=p.replace(/\D/g,'');const num=n.startsWith('55')?n:'55'+n;return`<a href="https://wa.me/${num}" target="_blank" style="color:#25D366;text-decoration:none;font-size:11px;">📱 ${p}</a>`;};
  const _row=r=>`<tr>
    <td class="mo" style="font-size:11px;white-space:nowrap;min-width:135px;width:135px;">${fmtDate(r.created_at)}</td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong style="font-size:12px;">${r.contact_name||'—'}</strong></td>
    <td class="cel-nowrap" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${igLink(r.contact_instagram)}</td>
    <td class="cel-wrap">${canalChip(r.canal)}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.cargo||r.cargo_lp||'—'}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.faturamento||'—'}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.contact_email||'—'}</td>
    <td style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_wa(r.contact_phone)}</td>
    <td class="cel-classif">
      <select onchange="salvarClassifLead('${r.id}',this.value,this)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:6px;padding:3px 6px;color:var(--txt);font-size:10px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;width:100%;">
        <option value="">— Classificar</option>
        <option value="Qualificado" ${'Qualificado'===r.classificacao_manual?'selected':''}>✅ Qualificado</option>
        <option value="Pré-qualificado" ${'Pré-qualificado'===r.classificacao_manual?'selected':''}>⚡ Pré-qualificado</option>
        <option value="Desqualificação prévia" ${'Desqualificação prévia'===r.classificacao_manual?'selected':''}>⚠ Desq. prévia</option>
        <option value="Desqualificado" ${'Desqualificado'===r.classificacao_manual?'selected':''}>✕ Desqualificado</option>
      </select>
    </td>
  </tr>`;
  const _srow=r=>`<tr>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong style="font-size:12px;">${r.contact_name||'—'}</strong></td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${igLink(r.contact_instagram)}</td>
    <td class="cel-wrap">${canalChip(r.canal)}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.cargo||r.cargo_lp||'—'}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.faturamento||'—'}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.contact_email||'—'}</td>
    <td style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_wa(r.contact_phone)}</td>
    <td class="cel-classif">
      <select onchange="salvarClassifLead('${r.id}',this.value,this)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:6px;padding:3px 6px;color:var(--txt);font-size:10px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;width:100%;">
        <option value="">— Classificar</option>
        <option value="Qualificado" ${'Qualificado'===r.classificacao_manual?'selected':''}>✅ Qualificado</option>
        <option value="Pré-qualificado" ${'Pré-qualificado'===r.classificacao_manual?'selected':''}>⚡ Pré-qualificado</option>
        <option value="Desqualificação prévia" ${'Desqualificação prévia'===r.classificacao_manual?'selected':''}>⚠ Desq. prévia</option>
        <option value="Desqualificado" ${'Desqualificado'===r.classificacao_manual?'selected':''}>✕ Desqualificado</option>
      </select>
    </td>
  </tr>`;
  const _empty8=msg=>`<tr class="er"><td colspan="8" style="color:var(--dim);font-style:italic;text-align:center;padding:14px;">${msg}</td></tr>`;
  const _empty9=msg=>`<tr class="er"><td colspan="9" style="text-align:center;padding:14px;">${msg}</td></tr>`;
  const hot=leads.filter(r=>r.classificacao_manual==='Qualificado');
  const warm=leads.filter(r=>r.classificacao_manual==='Pré-qualificado');
  const cold=leads.filter(r=>r.classificacao_manual==='Desqualificado');
  // Aeroporto
  const lb=$(pfx+'-leads'); if(lb) lb.innerHTML=leads.length?leads.map(_row).join(''):_empty9('Aguardando leads — configure as UTMs nos anúncios');
  if($(pfx+'-lcount')) $(pfx+'-lcount').textContent=leads.length+' leads';
  // KPIs
  if($(pfx+'-tot')) $(pfx+'-tot').textContent=leads.length||'—';
  if($(pfx+'-hot')) $(pfx+'-hot').textContent=hot.length||'—';
  // Seções
  if($(pfx+'-s1-leads')) $(pfx+'-s1-leads').innerHTML=hot.length?hot.map(_srow).join(''):_empty8('Nenhum lead qualificado ainda');
  if($(pfx+'-s2-leads')) $(pfx+'-s2-leads').innerHTML=warm.length?warm.map(_srow).join(''):_empty8('Nenhum lead pré-qualificado ainda');
  if($(pfx+'-s3-leads')) $(pfx+'-s3-leads').innerHTML=cold.length?cold.map(_srow).join(''):_empty8('Nenhum lead desqualificado ainda');
  if($(pfx+'-s1-count')) $(pfx+'-s1-count').textContent=hot.length+(hot.length===1?' lead':' leads');
  if($(pfx+'-s2-count')) $(pfx+'-s2-count').textContent=warm.length+(warm.length===1?' lead':' leads');
  if($(pfx+'-s3-count')) $(pfx+'-s3-count').textContent=cold.length+(cold.length===1?' lead':' leads');
}
function exportarMnSecao(classificacao){
  const {ini,fim}=getDates('mentoria');
  supaFetch('leads_mentoria',`select=*&classificacao_manual=eq.${encodeURIComponent(classificacao)}&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59&order=created_at.desc`).then(leads=>{
    if(!leads||!leads.length){alert('Nenhum lead nesta seção para exportar.');return;}
    const cols=['contact_name','contact_instagram','contact_email','contact_phone','canal','cargo','faturamento','created_at'];
    const header=cols.join(',');
    const rows=leads.map(r=>cols.map(c=>'"'+String(r[c]||'').replace(/"/g,'""')+'"').join(','));
    const csv='﻿'+header+'\n'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const slug=classificacao.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    a.href=url;a.download=`mentoria-${slug}.csv`;a.click();
    URL.revokeObjectURL(url);
  });
}
function canalChip(c){var cl=(c||'').toLowerCase();if(c==='Landing Page'||cl==='landing page'||cl==='lp')return'<span class="chip clp">🌐 LP</span>';if(cl==='typebot'||cl.startsWith('typebot'))return'<span class="chip ctb">🤖 Typebot</span>';if(c==='Respondi'||cl==='respondi')return'<span class="chip crp">💬 Respondi</span>';if(cl==='site'||cl==='site oficial')return'<span class="chip cst">🌐 Site</span>';if(cl==='orgânico'||cl==='organico')return'<span class="chip corg">🌿 Orgânico</span>';return'<span class="chip corg">🌿 Org</span>';}
function platChip(p){
  if(!p||p==='organico'||p==='orgânico')return'<span style="background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:#34D399;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">🌱 Orgânico</span>';
  if(p==='meta')return'<span style="background:rgba(26,63,203,.12);border:1px solid rgba(26,63,203,.3);color:#6AAAFF;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">📘 Meta</span>';
  if(p==='google')return'<span style="background:rgba(234,67,53,.12);border:1px solid rgba(234,67,53,.3);color:#EA4335;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">🔍 Google</span>';
  if(p==='linkedin')return'<span style="background:rgba(0,119,181,.12);border:1px solid rgba(0,119,181,.3);color:#0077B5;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">💼 LinkedIn</span>';
  if(p==='tiktok')return'<span style="background:rgba(255,0,80,.12);border:1px solid rgba(255,0,80,.3);color:#FF0050;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">🎵 TikTok</span>';
  return'<span style="background:var(--s2);border:1px solid var(--brd2);color:var(--sub);padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">'+p+'</span>';
}
function switchMnTab(tab,el){
  document.querySelectorAll('.mn-subtab').forEach(d=>d.style.display='none');
  document.querySelectorAll('.mn-stab').forEach(b=>b.classList.remove('on'));
  const t=document.getElementById('mn-sub-'+tab);
  if(t)t.style.display='';
  if(el)el.classList.add('on');
  window._mnActiveSubtab=tab;
  if(tab==='google'){initGoogleAdsAuth();renderGoogleAdsMetrics();}
}
function stBand(el,ok,okT,wT){if(!el)return;const sdot=`<span style="width:6px;height:6px;border-radius:50%;background:${ok?'var(--gn)':'#FF8C55'};display:inline-block;"></span>`;el.className='pb-st '+(ok?'ok':'warn');el.innerHTML=sdot+' '+(ok?okT:wT);}
function setRef(id){const e=$(id);if(e)e.textContent='Atualizado '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function fmtDate(d){if(!d)return'—';const dt=new Date(d);return dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}

// ═══════════════════════════════════════════
// AEROPORTO DE LEADS
// ═══════════════════════════════════════════
var _apPeriodo='hoje';
var _apInterval=null;
var _apLeadIds=new Set();
var _apMetas={mensal:50};
(function(){try{var s=localStorage.getItem('ap_metas');if(s){var m=JSON.parse(s);_apMetas.mensal=m.mensal||50;}}catch(e){}})();
_apMetas.semanal=Math.ceil(_apMetas.mensal/4);
_apMetas.diaria=Math.ceil(_apMetas.mensal/30);

function apSetPeriodo(p,el){
  _apPeriodo=p;
  document.querySelectorAll('.ap-pb').forEach(function(b){b.classList.remove('on');});
  if(el)el.classList.add('on');
  renderAeroporto();
}
function apToggleFullscreen(){
  if(!document.fullscreenElement){document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();}
  else{document.exitFullscreen&&document.exitFullscreen();}
}
function apOpenMetas(){var el=document.getElementById('ap-metas-cfg');if(el){el.classList.add('open');var mn=_apMetas.mensal||50;var me=document.getElementById('ap-m-mensal');if(me)me.value=mn;var sl=document.getElementById('ap-m-semanal-lbl');if(sl)sl.textContent=Math.ceil(mn/4)+' qualif./semana';var dl=document.getElementById('ap-m-diaria-lbl');if(dl)dl.textContent=Math.ceil(mn/30)+' qualif./dia';}}
function apCloseMetas(){var el=document.getElementById('ap-metas-cfg');if(el)el.classList.remove('open');}
function apSaveMetas(){
  _apMetas.mensal=parseInt(document.getElementById('ap-m-mensal').value)||50;
  _apMetas.semanal=Math.ceil(_apMetas.mensal/4);
  _apMetas.diaria=Math.ceil(_apMetas.mensal/30);
  try{localStorage.setItem('ap_metas',JSON.stringify({mensal:_apMetas.mensal}));}catch(e){}
  apCloseMetas();
  renderAeroporto();
}
function _apDateRange(){
  var now=new Date();
  var todayStr=now.toISOString().slice(0,10);
  if(_apPeriodo==='hoje') return{ini:todayStr,fim:todayStr};
  if(_apPeriodo==='semana'){
    var d=new Date(now);d.setDate(d.getDate()-6);
    return{ini:d.toISOString().slice(0,10),fim:todayStr};
  }
  if(_apPeriodo==='mes'){
    return{ini:todayStr.slice(0,7)+'-01',fim:todayStr};
  }
  return{ini:todayStr,fim:todayStr};
}
function _apBadge(cl){
  if(cl==='Qualificado') return'<span class="ap-badge q">✅ Qualificado</span>';
  if(cl==='Pré-qualificado') return'<span class="ap-badge p">⚡ Pré-qualif.</span>';
  if(cl==='Desqualificado'||cl==='Desqualificação prévia') return'<span class="ap-badge d">✗ Desqualif.</span>';
  return'<span class="ap-badge n">— Pendente</span>';
}
function _apPlat(p){
  if(!p)return'<span class="ap-plat site">—</span>';
  var k=(p||'').toLowerCase().replace(/[^a-z]/g,'');
  var lb=p||'—';
  return'<span class="ap-plat '+k+'">'+lb+'</span>';
}
function _apGoalBar(atual,meta){
  var p=meta>0?Math.min(100,Math.round(atual/meta*100)):0;
  var cls=p>=100?'done':p>=70?'near':'';
  return{p:p,cls:cls};
}
function _apStartClock(){
  function tick(){var el=document.getElementById('ap-clock');if(el)el.textContent=new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
  tick();
  if(window._apClockId)clearInterval(window._apClockId);
  window._apClockId=setInterval(tick,1000);
}
