// tab-mentoria-hub.js — Tutory Mentoria e TutoryHub
const _leadDateCell = r => { const dt=r.created_at?new Date(r.created_at):null; if(!dt)return'—'; const dS=dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}); const tS=dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); return `<span style="display:block;font-size:12px;font-weight:700;color:#F1F5F9;white-space:nowrap;">${dS}</span><span style="display:block;font-size:12.5px;font-weight:800;color:#7DD3FC;white-space:nowrap;margin-top:1px;">${tS}</span>`; };
const _leadRow = r => `<tr${r._isDuplicate?' style="opacity:0.75;"':''}>\r\n        <td class="mo" style="overflow:visible;text-overflow:clip;white-space:nowrap;min-width:78px;width:78px;">${_leadDateCell(r)}</td>\r\n        <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong style="font-size:12px;">${r.contact_name||'—'}</strong>${r._isDuplicate?'<span style="display:inline-block;margin-left:4px;background:#F97316;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;vertical-align:middle;letter-spacing:.5px;">DUP</span>':''}</td>
        <td class="cel-nowrap" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${igLink(r.contact_instagram)}</td>
        <td style="min-width:190px;">${platChip(r.plataforma_ad)}<br><span style="display:inline-block;margin-top:3px;">${canalChip(r.canal)}</span>${r.utm_content?`<span style="display:block;margin-top:4px;font-size:9.5px;font-weight:700;color:#C084FC;white-space:normal;word-break:break-word;line-height:1.4;">📢 ${_escAtr(r.utm_content)}</span>`:''}${r.utm_campaign?`<span style="display:block;margin-top:2px;font-size:9px;font-weight:600;color:#38BDF8;white-space:normal;word-break:break-word;line-height:1.4;">🏷️ ${_escAtr(r.utm_campaign)}</span>`:''}${r.utm_term?`<span style="display:block;margin-top:2px;font-size:9px;font-weight:600;color:#FBBF24;white-space:normal;word-break:break-word;line-height:1.4;">🧩 ${_escAtr(r.utm_term)}</span>`:''}</td>
        <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.cargo||r.cargo_lp||'—'}</td>
        <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.faturamento||'—'}</td>
        <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.contact_email||'—'}</td>
        <td style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(()=>{if(!r.contact_phone)return'—';const n=r.contact_phone.replace(/\D/g,'');const num=n.startsWith('55')?n:'55'+n;return`<a href='https://wa.me/${num}' target='_blank' style='color:#25D366;text-decoration:none;'>📱 ${r.contact_phone}</a>`;})()}</td>
        <td class="cel-classif">
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${classifBadge(r.classificacao_manual)}
            <select onchange="salvarClassifLead('${r.id}',this.value,this)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:6px;padding:3px 6px;color:var(--txt);font-size:10px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;width:100%;">
              <option value="">— Classificar</option>
              <option value="Qualificado" ${'Qualificado'===r.classificacao_manual?'selected':''}>✅ Qualificado</option>
              <option value="Pré-qualificado" ${'Pré-qualificado'===r.classificacao_manual?'selected':''}>⚡ Pré-qualificado</option>
              <option value="Desqualificação prévia" ${'Desqualificação prévia'===r.classificacao_manual?'selected':''}>⚠ Desq. prévia</option>
              <option value="Desqualificado" ${'Desqualificado'===r.classificacao_manual?'selected':''}>✕ Desqualificado</option>
            </select>
          </div>
        </td>
        <td style="text-align:center;"><button onclick="deleteMnLead('${r.id}',this)" title="Excluir lead" style="background:none;border:none;cursor:pointer;color:var(--sub);font-size:13px;padding:2px 4px;border-radius:4px;line-height:1;opacity:0.5;" onmouseover="this.style.opacity='1';this.style.color='#EF4444';" onmouseout="this.style.opacity='0.5';this.style.color='var(--sub)';">🗑</button></td>
      </tr>`;
const _rFull=(tbId,data)=>{
  const tb=$(tbId);if(!tb)return;
  if(!data.length){tb.innerHTML='<tr class="er"><td colspan="10">Nenhum lead registrado ainda.</td></tr>';return;}
  tb.innerHTML=data.map(_leadRow).join('');
};
// ── Filtro de origem do Aeroporto de Leads (Visão Geral) ──────────────
const _origemPlatLabel={meta:'Meta',google:'Google',linkedin:'LinkedIn',tiktok:'TikTok',organico:'Orgânico'};
function _origemKey(r){ return (r.plataforma_ad||'organico')+'|'+((r.canal||'—').toLowerCase()); }
function _origemLabel(r){ const p=_origemPlatLabel[r.plataforma_ad||'organico']||(r.plataforma_ad||'Orgânico'); return p+' + '+(r.canal||'—'); }
function _popularFiltroOrigem(leads){
  const sel=$('mn-all-origem-filter'); if(!sel) return;
  const prev=sel.value;
  const seen={};
  leads.forEach(r=>{ const k=_origemKey(r); if(!seen[k]) seen[k]={key:k,label:_origemLabel(r),count:0}; seen[k].count++; });
  const opts=Object.values(seen).sort((a,b)=>b.count-a.count);
  sel.innerHTML='<option value="">🔎 Todas as origens ('+leads.length+')</option>'+opts.map(o=>`<option value="${o.key}">${o.label} — ${o.count}</option>`).join('');
  if(opts.some(o=>o.key===prev)) sel.value=prev;
}
function filtrarAeroportoOrigem(val){
  const leads=window._mnAeroportoLeads||[];
  const filtered=val?leads.filter(r=>_origemKey(r)===val):leads;
  _rFull('mn-all-leads',filtered);
  if($('mn-all-lcount')) $('mn-all-lcount').textContent=filtered.length+(filtered.length===1?' lead':' leads')+(val?' (filtrado)':'');
}
async function renderMentoria(force){
  try{
    const {ini,fim}=getDates('mentoria');
    const _cKey=ini+'|'+fim;
    if(!force&&window._mnCacheData&&window._mnCacheKey===_cKey&&Date.now()-(window._mnCacheTs||0)<90000){
      _renderMentoriaDOM(window._mnCacheData[0],window._mnCacheData[1],window._mnCacheData[2],window._mnCacheData[3],window._mnCacheData[4],ini,fim);
      return;
    }
    const [leads,camps,anuncios,diags,receita]=await Promise.all([
      supaFetch('leads_mentoria',`select=*&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59&order=created_at.desc&limit=500`),
      supaFetch('campanhas_mentoria',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('anuncios_mentoria',`select=*&data=gte.${ini}&data=lte.${fim}&order=cpl.asc`),
      supaFetch('diagnosticos','select=*&plataforma=eq.mentoria&order=created_at.desc&limit=1'),
      supaFetch('receita_mentoria',`select=valor&data=gte.${ini}&data=lte.${fim}`)
    ]);
    window._mnCacheData=[leads,camps,anuncios,diags,receita];
    window._mnCacheKey=_cKey;
    window._mnCacheTs=Date.now();
    _renderMentoriaDOM(leads,camps,anuncios,diags,receita,ini,fim);
  }catch(e){console.error('renderMentoria:',e);}
}
async function _renderMentoriaDOM(leads,camps,anuncios,diags,receita,ini,fim){
  try{
    // Dedup: marca o lead MAIS RECENTE como DUP (varremos do mais antigo para o mais novo)
    const _seenE=new Set(),_seenP=new Set(),_dupIds=new Set();
    [...leads].reverse().forEach(r=>{
      const em=(r.contact_email||'').toLowerCase().trim();
      const ph=(r.contact_phone||'').replace(/\D/g,'');
      let dup=false;
      if(em&&_seenE.has(em))dup=true;
      if(ph&&ph.length>5&&_seenP.has(ph))dup=true;
      if(em)_seenE.add(em);
      if(ph&&ph.length>5)_seenP.add(ph);
      if(dup)_dupIds.add(r.id||r.contact_email);
    });
    leads=leads.map(r=>_dupIds.has(r.id||r.contact_email)?{...r,_isDuplicate:true}:r);
    window._mnLeads = leads;
    const totL=leads.length;
    const hotL=leads.filter(r=>r.classificacao_manual==='Qualificado').length;
    const warmL=leads.filter(r=>r.classificacao_manual==='Pré-qualificado').length;
    const dqpL=leads.filter(r=>r.classificacao_manual==='Desqualificação prévia').length;
    const coldL=leads.filter(r=>r.classificacao_manual==='Desqualificado').length;
    const lpL=leads.filter(r=>r.canal==='Landing Page').length;
    const tbL=leads.filter(r=>r.canal==='Typebot').length;
    const rpL=leads.filter(r=>r.canal==='Respondi').length;
    const siteL=leads.filter(r=>r.canal==='Site'||r.canal==='Site Oficial').length;
    const orgL=leads.filter(r=>r.canal==='Orgânico'||!r.canal).length;
    const _metaMn=await fetchMetaInsights(ini,fim);const _msMn=metaSumByPlatform(_metaMn);
    const invest=_msMn.total>0?_msMn.mentoria:camps.reduce((a,r)=>a+(+r.gasto||0),0);
    const totRec=receita.reduce((a,r)=>a+(+r.valor||0),0);
    const cpl=totL>0?invest/totL:0;
    const roi=invest>0?(totRec-invest)/invest*100:0;
    const ctrArr=camps.filter(r=>r.ctr>0).map(r=>+r.ctr);
    const ctrMed=ctrArr.length?ctrArr.reduce((a,b)=>a+b,0)/ctrArr.length:0;
    const cpcArr=camps.filter(r=>r.cpc>0).map(r=>+r.cpc);
    const cpcMed=cpcArr.length?cpcArr.reduce((a,b)=>a+b,0)/cpcArr.length:0;
    if($('mn-inv'))$('mn-inv').textContent=fmt.brlK(invest);
    if($('mn-cpl'))$('mn-cpl').textContent=cpl>0?'R$'+cpl.toFixed(2).replace('.',','):'—';
    if($('mn-cpl-b'))$('mn-cpl-b').textContent=cpl>0?'R$'+cpl.toFixed(2).replace('.',','):'—';
    if($('mn-tot'))$('mn-tot').textContent=fmt.num(totL);
    if($('mn-hot'))$('mn-hot').textContent=hotL;
    if($('mn-ctr'))$('mn-ctr').textContent=fmt.pct(ctrMed);
    if($('mn-cac'))$('mn-cac').textContent=cpcMed>0?'R$'+cpcMed.toFixed(2).replace('.',','):'—';
    if($("mn-lp"))$("mn-lp").textContent=lpL;
    if($("mn-tb"))$("mn-tb").textContent=tbL;
    if($("mn-rp"))$("mn-rp").textContent=rpL;
    if($("mn-site"))$("mn-site").textContent=siteL;
    if($("mn-org"))$("mn-org").textContent=orgL;
    if($('mn-dh'))$('mn-dh').textContent=hotL;
    if($('mn-dq'))$('mn-dq').textContent=dqpL||0;
    if($('mn-dw'))$('mn-dw').textContent=warmL;
    if($('mn-dc'))$('mn-dc').textContent=coldL;
    if($('mn-lcount'))$('mn-lcount').textContent=totL+' leads';
    supaFetch('prospeccoes','select=id&plataforma=eq.mentoria').then(pr=>{
      if($('mn-pr-total'))$('mn-pr-total').textContent=pr?pr.length:'—';
    }).catch(()=>{});
    stBand($('mn-st'),cpl<=15||cpl===0,'CPL DENTRO DA META','CPL ACIMA DA META');
    if($('mn-dq'))$('mn-dq').textContent=dqpL;
    mkD('c-mn-pie',['Qualificado','Pré-qualificado','Desq. prévia','Desqualificado'],[hotL,warmL,dqpL,coldL],['#22C55E','#EAB308','#F97316','#EF4444']);
    renderHotCanal(leads);
    renderUFSection(leads);
    renderAtribuicao(leads);
    // Status dinâmico dos cards de setup de UTM: se já tem lead com utm_content
    // preenchido pra aquela plataforma, o setup já foi feito — troca o badge.
    (function(){
      const _utmBadge=(elId,plat)=>{
        const el=$(elId);if(!el)return;
        const ok=leads.some(r=>r.plataforma_ad===plat&&r.utm_content);
        if(ok){
          el.textContent='✅ Configurado';
          el.style.background='rgba(34,197,94,.12)';el.style.borderColor='rgba(34,197,94,.3)';el.style.color='#22C55E';
        } else {
          el.textContent='⚡ Ação necessária';
          el.style.background='rgba(234,67,53,.12)';el.style.borderColor='rgba(234,67,53,.3)';el.style.color='#EA4335';
        }
      };
      _utmBadge('meta-utm-status','meta');
      _utmBadge('google-utm-status','google');
    })();
    // Agrupa anúncios por nome (evita duplicatas de múltiplos dias)
    const anunciosMap={};
    anuncios.forEach(a=>{
      const k=a.anuncio_nome||a.conjunto_nome||a.campanha_nome;
      if(!anunciosMap[k]){anunciosMap[k]={...a,_gasto:0,_leads:0,_imp:0,_clk:0};}
      anunciosMap[k]._gasto+=(+a.gasto||0);
      anunciosMap[k]._leads+=(+a.leads||0);
      anunciosMap[k]._imp+=(+a.impressoes||0);
      anunciosMap[k]._clk+=(+a.cliques||0);
    });
    const anunciosAgrupados=Object.values(anunciosMap).map(a=>({
      ...a,
      gasto:a._gasto,
      leads:a._leads,
      impressoes:a._imp,
      cliques:a._clk,
      cpl:a._leads>0?a._gasto/a._leads:0,
      ctr:a._imp>0?a._clk/a._imp*100:0
    })).sort((a,b)=>{
      const ca=+a.cpl||9999, cb2=+b.cpl||9999;
      return ca-cb2;
    });
    window._mnCamps = anunciosAgrupados;
    renderMnCamps(window._mnCamps);
    if($('mn-camp-count'))$('mn-camp-count').textContent=anunciosAgrupados.length+' anúncios';
    // diag
    if(diags.length){
      const d=diags[0];
      if($('mn-dt'))$('mn-dt').textContent=d.resumo?d.resumo.slice(0,60)+'...':'Diagnóstico disponível';
      if($('mn-dtxt'))$('mn-dtxt').textContent=d.resumo||'—';
      if($('mn-dacts')&&d.recomendacoes){
        $('mn-dacts').innerHTML=d.recomendacoes.split('\n').filter(Boolean).map(a=>`<div class="dact">${a}</div>`).join('');
      }
    } else {
      if($('mn-dt'))$('mn-dt').textContent='Aguardando primeiro diagnóstico';
      if($('mn-dtxt'))$('mn-dtxt').textContent='O diagnóstico é gerado automaticamente todos os dias às 08h30.';
    }
    // leads table
    _rFull('mn-leads',leads.filter(r=>r.classificacao_manual==='Qualificado'||r.classificacao_manual==='Pré-qualificado'));
    window._mnAeroportoLeads=leads;
    _popularFiltroOrigem(leads);
    filtrarAeroportoOrigem($('mn-all-origem-filter')?$('mn-all-origem-filter').value:'');
    // Visão Geral KPIs
    if($('vg-inv-total'))$('vg-inv-total').textContent=fmt.brlK(invest);
    if($('vg-leads-total'))$('vg-leads-total').textContent=fmt.num(totL);
    if($('vg-hot-total'))$('vg-hot-total').textContent=hotL;
    if($('vg-cpl-total'))$('vg-cpl-total').textContent=cpl>0?'R$'+cpl.toFixed(2).replace('.',','):'—';
    if($('vg-meta-leads'))$('vg-meta-leads').textContent=leads.filter(r=>r.plataforma_ad==='meta').length;
    if($('vg-google-leads'))$('vg-google-leads').textContent=leads.filter(r=>r.plataforma_ad==='google').length;
    if($('vg-linkedin-leads'))$('vg-linkedin-leads').textContent=leads.filter(r=>r.plataforma_ad==='linkedin').length;
    if($('vg-tiktok-leads'))$('vg-tiktok-leads').textContent=leads.filter(r=>r.plataforma_ad==='tiktok').length;
    if($('vg-org-leads'))$('vg-org-leads').textContent=leads.filter(r=>!r.plataforma_ad||r.plataforma_ad==='organico'||r.plataforma_ad==='orgânico'||r.canal==='Orgânico').length;
    // Qualificados por Plataforma
    const vgQualEl=$('vg-qual-plat');
    if(vgQualEl){
      const plats=[{key:'meta',label:'📘 Meta',color:'#6AAAFF'},{key:'google',label:'🔍 Google',color:'#EA4335'},{key:'linkedin',label:'💼 LinkedIn',color:'#0077B5'},{key:'tiktok',label:'🎵 TikTok',color:'#FF0050'},{key:'org',label:'🌱 Orgânico',color:'#34D399'}];
      const platData=plats.map(p=>{
        const pLeads=p.key==='org'?leads.filter(r=>!r.plataforma_ad||r.plataforma_ad==='organico'||r.plataforma_ad==='orgânico'||r.canal==='Orgânico'):leads.filter(r=>r.plataforma_ad===p.key);
        const pTot=pLeads.length;
        const pHot=pLeads.filter(r=>r.classificacao_manual==='Qualificado').length;
        const pct=pTot>0?Math.round(pHot/pTot*100):0;
        return{...p,tot:pTot,hot:pHot,pct};
      }).filter(p=>p.tot>0);
      const maxHot=Math.max(...platData.map(p=>p.hot),1);
      vgQualEl.innerHTML=platData.length?platData.map(p=>`
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--brd);">
          <span style="min-width:110px;font-size:12px;font-weight:600;color:${p.color};">${p.label}</span>
          <div style="flex:1;background:var(--s2);border-radius:4px;height:8px;overflow:hidden;">
            <div style="height:100%;background:${p.color};width:${maxHot>0?Math.round(p.hot/maxHot*100):0}%;border-radius:4px;transition:width .4s;"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:var(--txt);min-width:80px;text-align:right;">${p.hot} qualificados <span style="color:var(--sub);font-weight:400;">(${p.pct}%)</span></span>
        </div>`).join(''):'<div style="color:var(--sub);font-size:13px;text-align:center;padding:20px;">Aguardando dados...</div>';
    }
    renderMnSecoes(leads);
    // Plataformas individuais
    renderPlatLeads('ggl', leads.filter(r=>r.plataforma_ad==='google'));
    renderPlatLeads('lk',  leads.filter(r=>r.plataforma_ad==='linkedin'));
    renderPlatLeads('tt',  leads.filter(r=>r.plataforma_ad==='tiktok'));
  }catch(e){console.error('_renderMentoriaDOM:',e);}
}

// RENDER HUB
async function renderHub(){
  try{
    const {ini,fim}=getDates('hub');
    const [camps,anunciosHub,diags,leads,receita]=await Promise.all([
      supaFetch('campanhas_hub',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('anuncios_hub',`select=*&data=gte.${ini}&data=lte.${fim}&order=data.desc`),
      supaFetch('diagnosticos','select=*&plataforma=eq.hub&order=created_at.desc&limit=1'),
      supaFetch('leads_hub',`select=*&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59&order=created_at.desc`),
      supaFetch('receita_hub','select=valor')
    ]);
    const _metaHb=await fetchMetaInsights(ini,fim);const _msHb=metaSumByPlatform(_metaHb);
    const invest=_msHb.total>0?_msHb.hub:camps.reduce((a,r)=>a+(+r.gasto||0),0);
    const imp=camps.reduce((a,r)=>a+(+r.impressoes||0),0);
    const clks=camps.reduce((a,r)=>a+(+r.cliques||0),0);
    const ctrArr=camps.filter(r=>r.ctr>0).map(r=>+r.ctr);
    const ctrMed=ctrArr.length?ctrArr.reduce((a,b)=>a+b,0)/ctrArr.length:0;
    const cpcArr=camps.filter(r=>r.cpc>0).map(r=>+r.cpc);
    const cpcMed=cpcArr.length?cpcArr.reduce((a,b)=>a+b,0)/cpcArr.length:0;
    const totRec=receita.reduce((a,r)=>a+(+r.valor||0),0);
    // Usa registros da API Meta se disponível, senão soma manual do banco
    const metaLeadsHb=_msHb&&_msHb.leads_hub>0?_msHb.leads_hub:0;
    const manualLeadsHb=camps.reduce((a,r)=>a+(+r.leads||0),0);
    const totLeadsHb=metaLeadsHb||manualLeadsHb;
    const hotLeadsHb=0;
    const cplHb=totLeadsHb>0?invest/totLeadsHb:0;
    if($('hb-inv'))$('hb-inv').textContent=fmt.brlK(invest);
    if($('hb-ctr'))$('hb-ctr').textContent=fmt.pct(ctrMed);
    if($('hb-cpc'))$('hb-cpc').textContent=cpcMed>0?'R$'+cpcMed.toFixed(2).replace('.',','):'—';
    if($('hb-imp'))$('hb-imp').textContent=fmt.k(imp);
    if($('hb-clk'))$('hb-clk').textContent=fmt.k(clks);
    if($('hb-tot-leads'))$('hb-tot-leads').textContent=totLeadsHb||'—';
    // Métrica SEPARADA: cadastros reais na leads_hub (Slack/Make/form) — não mistura com Meta
    if($('hb-leads-cad'))$('hb-leads-cad').textContent=fmt.num(leads.length);
    if($('hb-cpl'))$('hb-cpl').textContent=cplHb>0?'R$'+cplHb.toFixed(2).replace('.',','):'—';
    supaFetch('prospeccoes','select=id&plataforma=eq.hub').then(pr=>{
      if($('hb-pr-total'))$('hb-pr-total').textContent=pr?pr.length:'—';
    }).catch(()=>{});
    stBand($('hb-st'),ctrMed>=2||ctrMed===0,'CTR DENTRO DA META','CTR ABAIXO DA META');
    const hcb=$('hb-camp');
    if(hcb){
      if(anunciosHub.length===0){hcb.innerHTML='<tr class="er"><td colspan="8">Nenhuma campanha registrada ainda.</td></tr>';}
      else{
        const uniq={};anunciosHub.forEach(r=>{if(!uniq[r.anuncio_nome||r.campanha_nome])uniq[r.anuncio_nome||r.campanha_nome]=r;});
        hcb.innerHTML=Object.values(uniq).slice(0,10).map(r=>`<tr>
          <td><strong>${r.campanha_nome||'—'}</strong></td>
          <td style="color:var(--sub)">${r.conjunto_nome||'—'}</td>
          <td class="mo">${fmt.brl(r.gasto||0)}</td>
          <td class="mo">${fmt.k(r.impressoes||0)}</td>
          <td class="mo">${fmt.k(r.cliques||0)}</td>
          <td class="mo" style="color:${+r.ctr>=2?'var(--gn)':'var(--red)'}">${(+r.ctr||0).toFixed(1)}%</td>
          <td class="mo">R$${(+r.cpc||0).toFixed(2).replace('.',',')}</td>
          <td>${ctrChip(r.ctr||0)}</td>
        </tr>`).join('');
      }
    }
    // leads hub
    const hlb=$('hb-leads');
    if(hlb){
      if(leads.length===0){hlb.innerHTML='<tr class="er"><td colspan="6">Nenhum lead do Hub. Use o botão + para adicionar.</td></tr>';}
      else{hlb.innerHTML=leads.map(r=>`<tr>
        <td class="mo">${fmtDate(r.created_at)}</td>
        <td><strong>${r.contact_name||'—'}</strong></td>
        <td style="color:var(--sub)">${r.contact_email||'—'}</td>
        <td>${r.contact_phone||'—'}</td>
        <td>${r.origem||'—'}</td>
        <td style="color:var(--sub)">${r.observacao||'—'}</td>
      </tr>`).join('');}
    }
    // aeroporto hub
    window._hbLeads=leads;
    renderHbAeroporto(leads);
    // diag
    if(diags.length){
      const d=diags[0];
      if($('hb-dt'))$('hb-dt').textContent=d.resumo?d.resumo.slice(0,60)+'...':'Diagnóstico disponível';
      if($('hb-dtxt'))$('hb-dtxt').textContent=d.resumo||'—';
      if($('hb-dacts')&&d.recomendacoes){
        $('hb-dacts').innerHTML=d.recomendacoes.split('\n').filter(Boolean).map(a=>`<div class="dact">${a}</div>`).join('');
      }
    } else {
      if($('hb-dt'))$('hb-dt').textContent='Aguardando primeiro diagnóstico';
      if($('hb-dtxt'))$('hb-dtxt').textContent='O diagnóstico é gerado automaticamente todos os dias às 08h30.';
    }
  }catch(e){console.error('renderHub:',e);}
}

function hbCanalChip(c){
  if(!c)return'<span style="background:var(--s2);border:1px solid var(--brd2);color:var(--sub);padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">—</span>';
  const cl=c.toLowerCase();
  if(cl.includes('meta')||cl.includes('facebook'))return'<span style="background:rgba(26,63,203,.12);border:1px solid rgba(26,63,203,.3);color:#6AAAFF;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">📘 Meta</span>';
  if(cl.includes('google'))return'<span style="background:rgba(234,67,53,.12);border:1px solid rgba(234,67,53,.3);color:#EA4335;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">🔍 Google</span>';
  if(cl.includes('linkedin'))return'<span style="background:rgba(0,119,181,.12);border:1px solid rgba(0,119,181,.3);color:#0077B5;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">💼 LinkedIn</span>';
  if(cl.includes('tiktok'))return'<span style="background:rgba(255,0,80,.12);border:1px solid rgba(255,0,80,.3);color:#FF0050;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">🎵 TikTok</span>';
  if(cl.includes('youtube')||cl.includes('yt'))return'<span style="background:rgba(255,0,0,.12);border:1px solid rgba(255,0,0,.3);color:#FF0000;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">▶ YouTube</span>';
  if(cl.includes('site')||cl.includes('web'))return'<span style="background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);color:#818CF8;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">🌐 Site</span>';
  if(cl.includes('org')||cl.includes('indic'))return'<span style="background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:#34D399;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">🌱 Orgânico</span>';
  return`<span style="background:var(--s2);border:1px solid var(--brd2);color:var(--sub);padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;">${c}</span>`;
}
// Bloco de origem do lead Hub — igual ao da Mentoria: prioriza SEMPRE a UTM
// real (plataforma_ad/utm_*) assim que ela existir. "origem"/"canal" cru
// (ex.: "marketing", "orgânico" fixo) só é usado como fallback enquanto
// o lead ainda não chegou com UTM (todo lead É marketing, então não faz
// sentido tratar "origem" como uma classificação própria).
function _hbOrigemBloco(r){
  if(r.plataforma_ad){
    let out=platChip(r.plataforma_ad)+(r.canal?`<br><span style="display:inline-block;margin-top:3px;">${canalChip(r.canal)}</span>`:'');
    if(r.utm_content)out+=`<span style="display:block;margin-top:4px;font-size:9.5px;font-weight:700;color:#C084FC;white-space:normal;word-break:break-word;line-height:1.4;">📢 ${_escAtr(r.utm_content)}</span>`;
    if(r.utm_campaign)out+=`<span style="display:block;margin-top:2px;font-size:9px;font-weight:600;color:#38BDF8;white-space:normal;word-break:break-word;line-height:1.4;">🏷️ ${_escAtr(r.utm_campaign)}</span>`;
    if(r.utm_term)out+=`<span style="display:block;margin-top:2px;font-size:9px;font-weight:600;color:#FBBF24;white-space:normal;word-break:break-word;line-height:1.4;">🧩 ${_escAtr(r.utm_term)}</span>`;
    return out;
  }
  // sem UTM ainda: mostra Orgânico se realmente não veio de anúncio, senão o valor cru
  const raw=(r.origem||r.canal||'').toLowerCase();
  if(!raw||raw==='orgânico'||raw==='organico')return hbCanalChip('orgânico');
  return hbCanalChip(r.origem||r.canal);
}
function _hbPerfil(r){
  if(!r.observacao)return'—';
  const m=String(r.observacao).match(/perfil:\s*([^|]+)/i);
  return m?m[1].trim():r.observacao;
}
function hbClassifBadge(cl){
  if(cl==='Qualificado')return'<span style="background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);color:#22C55E;padding:2px 10px;border-radius:6px;font-size:10px;font-weight:700;">✅ Qualificado</span>';
  if(cl==='Pré-qualificado')return'<span style="background:rgba(234,179,8,.15);border:1px solid rgba(234,179,8,.3);color:#CA8A04;padding:2px 10px;border-radius:6px;font-size:10px;font-weight:700;">⚡ Pré-qualif.</span>';
  if(cl==='Desqualificação prévia')return'<span style="background:rgba(249,115,22,.15);border:1px solid rgba(249,115,22,.3);color:#EA580C;padding:2px 10px;border-radius:6px;font-size:10px;font-weight:700;">⚠ Desq. prévia</span>';
  if(cl==='Desqualificado')return'<span style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#DC2626;padding:2px 10px;border-radius:6px;font-size:10px;font-weight:700;">✕ Desqualif.</span>';
  return'<span style="background:var(--s2);border:1px solid var(--brd2);color:var(--sub);padding:2px 10px;border-radius:6px;font-size:10px;font-weight:700;">— Sem classif.</span>';
}
function _hbSelect(id,cl){
  return`<select onchange="salvarClassifLeadHub('${id}',this.value,this)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:6px;padding:3px 6px;color:var(--txt);font-size:10px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;width:100%;">
    <option value="">— Classificar</option>
    <option value="Qualificado" ${'Qualificado'===cl?'selected':''}>✅ Qualificado</option>
    <option value="Pré-qualificado" ${'Pré-qualificado'===cl?'selected':''}>⚡ Pré-qualificado</option>
    <option value="Desqualificação prévia" ${'Desqualificação prévia'===cl?'selected':''}>⚠ Desq. prévia</option>
    <option value="Desqualificado" ${'Desqualificado'===cl?'selected':''}>✕ Desqualificado</option>
  </select>`;
}
function _hbDelBtn(id){
  return`<button onclick="deleteHbLead('${id}',this)" title="Excluir lead" style="background:none;border:none;cursor:pointer;color:var(--sub);font-size:13px;padding:2px 4px;border-radius:4px;line-height:1;opacity:0.5;" onmouseover="this.style.opacity='1';this.style.color='#EF4444';" onmouseout="this.style.opacity='0.5';this.style.color='var(--sub)';">🗑</button>`;
}
function renderHbAeroporto(leads){
  const _wa=p=>{if(!p)return'—';const n=p.replace(/\D/g,'');const num=n.startsWith('55')?n:'55'+n;return`<a href="https://wa.me/${num}" target="_blank" style="color:#25D366;text-decoration:none;font-size:11px;">📱 ${p}</a>`;};
  const _rowAll=r=>`<tr>
    <td class="mo" style="overflow:visible;white-space:nowrap;min-width:78px;width:78px;">${_leadDateCell(r)}</td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong style="font-size:12px;">${r.contact_name||'—'}</strong></td>
    <td class="cel-nowrap" style="font-size:11px;">${igLink(r.contact_instagram)}</td>
    <td style="min-width:150px;">${_hbOrigemBloco(r)}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_hbPerfil(r)}</td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.contact_email||'—'}</td>
    <td style="font-size:11px;">${_wa(r.contact_phone)}</td>
    <td class="cel-classif">
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${hbClassifBadge(r.classificacao_manual)}
        ${_hbSelect(r.id,r.classificacao_manual)}
      </div>
    </td>
    <td style="text-align:center;">${_hbDelBtn(r.id)}</td>
  </tr>`;
  const _rowSec=r=>`<tr>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong style="font-size:12px;">${r.contact_name||'—'}</strong></td>
    <td style="color:var(--sub);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.contact_email||'—'}</td>
    <td style="font-size:11px;">${_wa(r.contact_phone)}</td>
    <td class="cel-nowrap" style="font-size:11px;">${igLink(r.contact_instagram)}</td>
    <td style="min-width:130px;">${_hbOrigemBloco(r)}</td>
    <td class="cel-classif">${_hbSelect(r.id,r.classificacao_manual)}</td>
    <td style="text-align:center;">${_hbDelBtn(r.id)}</td>
  </tr>`;
  const _eA=m=>`<tr class="er"><td colspan="9" style="color:var(--dim);font-style:italic;text-align:center;padding:14px;">${m}</td></tr>`;
  const _eS=m=>`<tr class="er"><td colspan="7" style="color:var(--dim);font-style:italic;text-align:center;padding:14px;">${m}</td></tr>`;
  const s1=leads.filter(r=>r.classificacao_manual==='Qualificado');
  const s2=leads.filter(r=>r.classificacao_manual==='Pré-qualificado');
  const s3=leads.filter(r=>r.classificacao_manual==='Desqualificado');
  _popularFiltroOrigemHub(leads);
  const filtroVal=$('hb-all-origem-filter')?$('hb-all-origem-filter').value:'';
  const filtered=filtroVal?leads.filter(r=>_hbOrigemKey(r)===filtroVal):leads;
  const airAll=$('hb-air-all');if(airAll)airAll.innerHTML=filtered.length?filtered.map(_rowAll).join(''):_eA('Nenhum lead registrado no período');
  const airCnt=$('hb-air-count');if(airCnt)airCnt.textContent=filtered.length+' leads'+(filtroVal?' (filtrado)':'');
  const s1tb=$('hb-s1-leads');if(s1tb)s1tb.innerHTML=s1.length?s1.map(_rowSec).join(''):_eS('Nenhum lead qualificado ainda');
  const s2tb=$('hb-s2-leads');if(s2tb)s2tb.innerHTML=s2.length?s2.map(_rowSec).join(''):_eS('Nenhum lead pré-qualificado ainda');
  const s3tb=$('hb-s3-leads');if(s3tb)s3tb.innerHTML=s3.length?s3.map(_rowSec).join(''):_eS('Nenhum lead desqualificado ainda');
  const s1c=$('hb-s1-count');if(s1c)s1c.textContent=s1.length+(s1.length===1?' lead':' leads');
  const s2c=$('hb-s2-count');if(s2c)s2c.textContent=s2.length+(s2.length===1?' lead':' leads');
  const s3c=$('hb-s3-count');if(s3c)s3c.textContent=s3.length+(s3.length===1?' lead':' leads');
}
// Filtro de origem do Aeroporto Hub (mesmo padrão do Aeroporto Geral da Mentoria)
function _hbOrigemKey(r){ return r.plataforma_ad?(r.plataforma_ad+'|'+(r.canal||'—').toLowerCase()):'organico|'+((r.origem||'—').toLowerCase()); }
function _hbOrigemLabel(r){
  if(r.plataforma_ad){const p=_origemPlatLabel[r.plataforma_ad]||r.plataforma_ad;return p+' + '+(r.canal||'—');}
  return 'Orgânico + '+(r.origem||'—');
}
function _popularFiltroOrigemHub(leads){
  const sel=$('hb-all-origem-filter'); if(!sel) return;
  const prev=sel.value;
  const seen={};
  leads.forEach(r=>{ const k=_hbOrigemKey(r); if(!seen[k]) seen[k]={key:k,label:_hbOrigemLabel(r),count:0}; seen[k].count++; });
  const opts=Object.values(seen).sort((a,b)=>b.count-a.count);
  sel.innerHTML='<option value="">🔎 Todas as origens ('+leads.length+')</option>'+opts.map(o=>`<option value="${o.key}">${o.label} — ${o.count}</option>`).join('');
  if(opts.some(o=>o.key===prev)) sel.value=prev;
}
function filtrarAeroportoHubOrigem(val){
  renderHbAeroporto(window._hbLeads||[]);
}
async function deleteHbLead(id,btn){
  if(!confirm('Excluir este lead permanentemente?'))return;
  btn.disabled=true;btn.textContent='…';
  const SUPA_URL='https://stgzgtpcuhtayglignik.supabase.co';
  const SUPA_KEY='sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/leads_hub?id=eq.${id}`,{
      method:'DELETE',
      headers:{'apikey':SUPA_KEY,'Authorization':`Bearer ${SUPA_KEY}`,'Prefer':'return=minimal'}
    });
    if(r.ok){
      if(window._hbLeads)window._hbLeads=window._hbLeads.filter(l=>String(l.id)!==String(id));
      renderHbAeroporto(window._hbLeads||[]);
    } else {
      alert('Erro ao excluir lead.');btn.disabled=false;btn.textContent='🗑';
    }
  }catch(e){console.error('Erro ao excluir lead hub:',e);alert('Erro ao excluir: '+e.message);btn.disabled=false;btn.textContent='🗑';}
}
async function salvarClassifLeadHub(id,classificacao,selectEl){
  try{
    await supaUpdate('leads_hub',id,{classificacao_manual:classificacao});
    if(window._hbLeads){const _r=window._hbLeads.find(r=>r.id===id);if(_r)_r.classificacao_manual=classificacao;renderHbAeroporto(window._hbLeads);}
  }catch(e){console.error('Erro classif hub:',e);alert('Erro ao salvar: '+e.message);}
}
async function exportarHbSecaoAll(){
  if(!window._hbLeads||!window._hbLeads.length){alert('Nenhum lead para exportar.');return;}
  const cols=['contact_name','contact_email','contact_phone','contact_instagram','origem','canal','plataforma_ad','utm_source','utm_medium','utm_campaign','utm_content','utm_term','classificacao_manual','created_at'];
  const csv='﻿'+cols.join(',')+'\n'+window._hbLeads.map(r=>cols.map(c=>'"'+String(r[c]||'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='hub-leads-todos.csv';a.click();
}
async function exportarHbSecao(classificacao){
  const leads=(window._hbLeads||[]).filter(r=>r.classificacao_manual===classificacao);
  if(!leads.length){alert('Nenhum lead nesta seção para exportar.');return;}
  const cols=['contact_name','contact_email','contact_phone','contact_instagram','origem','canal','plataforma_ad','utm_source','utm_medium','utm_campaign','utm_content','utm_term','classificacao_manual','created_at'];
  const csv='﻿'+cols.join(',')+'\n'+leads.map(r=>cols.map(c=>'"'+String(r[c]||'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const slug=classificacao.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`hub-${slug}.csv`;a.click();
}

// RENDER EXPERIENCE
