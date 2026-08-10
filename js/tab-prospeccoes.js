// tab-prospeccoes.js — Prospecções

// IMPORTAR PROSPECÇÕES DO EXCEL
async function importarProspeccoes(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      // Parse CSV simples ou XLSX via SheetJS (carregado dinamicamente)
      let rows = [];
      if(file.name.endsWith('.csv')){
        const text = new TextDecoder().decode(data);
        const lines = text.split('\n').filter(l=>l.trim());
        const headers = lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/"/g,''));
        rows = lines.slice(1).map(l=>{
          const vals = l.split(',').map(v=>v.trim().replace(/"/g,''));
          const obj={};
          headers.forEach((h,i)=>obj[h]=vals[i]||'');
          return obj;
        });
      } else {
        // XLSX — usa SheetJS via CDN
        if(!window.XLSX){
          await new Promise(r=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=r;document.head.appendChild(s);});
        }
        const wb = window.XLSX.read(data, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = window.XLSX.utils.sheet_to_json(ws);
      }

      // Normaliza colunas
      const prosp = rows.map(r=>{
        const keys = Object.keys(r).map(k=>k.toLowerCase());
        const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const get = (names) => {
          for(const n of names){
            const k = Object.keys(r).find(k=>normalize(k)===normalize(n)||normalize(k).includes(normalize(n)));
            if(k && r[k] !== undefined && r[k] !== null && String(r[k]).trim()) return String(r[k]).trim();
          }
          return '';
        };
        const dataRaw = get(['Primeira Coleta','primeira coleta','data','date','created_at']);
        const dataFmt = dataRaw ? dataRaw.split('T')[0] : new Date().toISOString().split('T')[0];
        return {
          instagram: get(['Username','username','instagram','insta']),
          nome: get(['Nome','nome','name']),
          nicho: get(['Nicho','nicho','Categoria Instagram','categoria instagram','tipo']),
          data: dataFmt,
          classificacao_manual: get(['Classificação Manual','Classificacao Manual','classificacao_manual','classif','Classificação Efetiva']),
          plataforma: 'mentoria',
          created_at: new Date().toISOString()
        };
      }).filter(r=>r.instagram||r.nome||r.nicho);

      // Salvar no Supabase em lote
      let ok=0, erros=[];
      // Inserir em lotes de 100
      const LOTE = 100;
      for(let i=0;i<prosp.length;i+=LOTE){
        const chunk = prosp.slice(i,i+LOTE);
        try{
          const res = await fetch(`${SUPA_URL}/rest/v1/prospeccoes`,{
            method:'POST',
            headers:{'apikey':SUPA_KEY,'Authorization':`Bearer ${SUPA_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
            body:JSON.stringify(chunk)
          });
          if(!res.ok){const e=await res.text();throw new Error(e);}
          ok+=chunk.length;
        }catch(e){
          erros.push(e.message);
          console.error('Erro lote prospecção:',e.message);
        }
      }
      if(erros.length>0 && ok===0){
        alert('Erro ao importar: ' + erros[0] + '\n\nVerifique se o SQL foi executado no Supabase.');
      } else {
        alert(`✅ ${ok} prospecções importadas com sucesso!`);
      }
      renderProspeccoes(true);
    } catch(err){
      alert('Erro ao processar arquivo: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}

// STATUS MAP GLOBAL
const _stMap={'Reunião Agendada':{cor:'#60A5FA',bg:'rgba(96,165,250,.15)',brd:'rgba(96,165,250,.4)',icon:'📅'},'Aguardando':{cor:'#EAB308',bg:'rgba(234,179,8,.15)',brd:'rgba(234,179,8,.4)',icon:'⏳'},'Perdido':{cor:'#EF4444',bg:'rgba(239,68,68,.15)',brd:'rgba(239,68,68,.4)',icon:'❌'}};
window._prData=null;
window._prPage=0;
function prLoadMore(){ window._prPage++; renderProspeccoes(false); }
async function excluirProsp(id){
  if(!confirm('Tem certeza que deseja excluir este lead?')) return;
  try{
    const res=await fetch(SUPA_URL+'/rest/v1/prospeccoes?id=eq.'+id,{
      method:'DELETE',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Prefer':'return=minimal'}
    });
    if(!res.ok) throw new Error(await res.text());
    if(window._prData) window._prData=window._prData.filter(r=>r.id!==id);
    renderProspeccoes(false);
  }catch(e){ console.error('Erro ao excluir:',e); alert('Erro ao excluir: '+e.message); }
}

// RENDER PROSPECÇÕES
async function renderProspeccoes(force=false){
  try {
    if(force||!window._prData){
      window._prData=await supaFetch('prospeccoes','select=*&order=created_at.desc');
      if(force) window._prPage=0;
    }

    // Aplica filtro de data
    const {ini,fim}=getDates('prospeccoes');
    const ps=periodState['prospeccoes']||'30';
    const prosp = ps==='todos' ? window._prData : window._prData.filter(r=>{
      const d=(r.data||r.created_at||'').slice(0,10);
      return d>=ini && d<=fim;
    });

    // Atualiza label de período
    const _fp=s=>{const[y,m,d]=s.split('-');return`${d}/${m}/${y}`;};
    if($('pr-period-label')){
      $('pr-period-label').textContent = ps==='todos'?'Todos os registros':`${_fp(ini)} → ${_fp(fim)}`;
    }

    const total = prosp.length;
    const mn = prosp.filter(r=>!r.plataforma||r.plataforma==='mentoria').length;
    const hb = prosp.filter(r=>r.plataforma==='hub').length;
    const qual = prosp.filter(r=>r.classificacao_manual==='Qualificado').length;
    const desq = prosp.filter(r=>r.classificacao_manual==='Desqualificado').length;

    if($('pr-total'))$('pr-total').textContent=total||'—';
    if($('pr-mn'))$('pr-mn').textContent=mn||'—';
    if($('pr-hb'))$('pr-hb').textContent=hb||'—';
    if($('pr-qual'))$('pr-qual').textContent=qual||'—';
    if($('pr-desq'))$('pr-desq').textContent=desq||'—';
    if($('pr-count'))$('pr-count').textContent=total+' prospecções';

    const tb=$('pr-leads');
    if(!tb)return;
    const pageSize=50;
    const shown=(window._prPage+1)*pageSize;
    const paged=prosp.slice(0,shown);
    if(!prosp.length){ tb.innerHTML='<tr class="er"><td colspan="7">Nenhuma prospecção. Importe um arquivo Excel.</td></tr>'; }
    else {
      tb.innerHTML = paged.map(r=>`<tr>
      <td class="mo" style="font-size:11px;white-space:nowrap;">${r.data||fmtDate(r.created_at)}</td>
      <td><strong style="font-size:12px;">${r.nome||'—'}</strong></td>
      <td>${r.instagram?`<a href="https://instagram.com/${r.instagram.replace('@','')}" target="_blank" style="color:#A78BFA;text-decoration:none;font-size:12px;">${r.instagram}</a>`:'\u2014'}</td>
      <td style="color:var(--sub);font-size:11px">${r.nicho||'—'}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button data-action="plat" data-id="${r.id}" data-val="mentoria" style="padding:3px 9px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid ${r.plataforma==='mentoria'?'var(--mn)':'var(--brd2)'};background:${r.plataforma==='mentoria'?'var(--mn-bg)':'transparent'};color:${r.plataforma==='mentoria'?'var(--mn)':'var(--sub)'};font-family:'Plus Jakarta Sans',sans-serif;">Mentoria</button>
          <button data-action="plat" data-id="${r.id}" data-val="hub" style="padding:3px 9px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid ${r.plataforma==='hub'?'var(--hb)':'var(--brd2)'};background:${r.plataforma==='hub'?'var(--hb-bg)':'transparent'};color:${r.plataforma==='hub'?'var(--hb)':'var(--sub)'};font-family:'Plus Jakarta Sans',sans-serif;">Hub</button>
        </div>
      </td>
      <td>
        <div style="display:flex;flex-direction:column;gap:3px;min-width:150px;">
          ${classifBadge(r.classificacao_manual)}
          ${classifSelectProsp(r.id, r.classificacao_manual||'')}
        </div>
      </td>
      <td><button data-action="excluir" data-id="${r.id}" title="Excluir lead" style="background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:14px;padding:4px;border-radius:5px;line-height:1;">🗑</button></td>
    </tr>`).join('');
    }
    const lm=$('pr-loadmore');
    if(lm){ lm.innerHTML=''; }
    // Setup infinite scroll (once)
    const wrap=$('pr-leads-wrap');
    if(wrap&&!wrap._scrollSet){
      wrap._scrollSet=true;
      wrap.addEventListener('scroll',function(){
        if(this.scrollTop+this.clientHeight>=this.scrollHeight-80)prLoadMore();
      });
    }
    // Setup event delegation (once)
    if(wrap&&!wrap._delegSet){
      wrap._delegSet=true;
      wrap.addEventListener('click',function(e){
        const btn=e.target.closest('[data-action]');
        if(!btn)return;
        const act=btn.dataset.action, id=btn.dataset.id, val=btn.dataset.val;
        if(act==='plat') salvarPlataformaProsp(id,val);
        else if(act==='excluir') excluirProsp(id);
      });
    }


    // ── HELPERS SEÇÕES ──
    const _plat = r => (!r.plataforma||r.plataforma==='mentoria') ? 'mentoria' : 'hub';
    const _platBadge = r => _plat(r)==='mentoria'
      ? `<span style="background:var(--mn-bg);border:1px solid var(--mn-b);color:var(--mn);padding:3px 9px;border-radius:6px;font-size:10px;font-weight:700;">🎓 Mentoria</span>`
      : `<span style="background:var(--hb-bg);border:1px solid var(--hb-b);color:var(--hb);padding:3px 9px;border-radius:6px;font-size:10px;font-weight:700;">🏪 Hub</span>`;
    const _insta = r => r.instagram ? `<a href="https://instagram.com/${r.instagram.replace('@','')}" target="_blank" style="color:#A78BFA;text-decoration:none;font-size:12px;">${r.instagram}</a>` : '—';
    const _dt = r => r.data||fmtDate(r.created_at);
    const _empty = n => `<tr class="er"><td colspan="${n}" style="color:var(--dim);font-style:italic;text-align:center;padding:18px;">Nenhum lead nesta seção ainda</td></tr>`;

    // ── SEÇÃO QUALIFICADOS PROSPECÇÃO (pr-sq) ──
    const sqFilter = ($('pr-sq-filter')||{}).value||'';
    let sq = prosp.filter(r=>r.classificacao_manual==='Qualificado');
    if(sqFilter) sq = sq.filter(r=>_plat(r)===sqFilter);
    if($('pr-sq-count')) $('pr-sq-count').textContent = sq.length+(sq.length===1?' prospecção':' prospecções');
    const sqtb=$('pr-sq-leads');
    if(sqtb) sqtb.innerHTML = sq.length ? sq.map(r=>{
      const st=localStorage.getItem('pst_'+r.id)||r.status_qualificado||'Aguardando';
      const c=_stMap[st]||_stMap['Aguardando'];
      return `<tr>
        <td class="mo" style="font-size:11px;white-space:nowrap;">${_dt(r)}</td>
        <td><strong style="font-size:12px;">${r.nome||'—'}</strong></td>
        <td>${_insta(r)}</td>
        <td>${_platBadge(r)}</td>
        <td><select onchange="salvarStatusQual('${r.id}',this.value);const _m=(_stMap[this.value]||_stMap['Aguardando']);this.style.border='1px solid '+_m.brd;this.style.background=_m.bg;this.style.color=_m.cor;" style="padding:4px 8px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${c.brd};background:${c.bg};color:${c.cor};font-family:'Plus Jakarta Sans',sans-serif;outline:none;">
          <option value="Reunião Agendada" ${st==='Reunião Agendada'?'selected':''} style="background:#0f1629;color:#60A5FA;font-weight:700;">📅 Reunião Agendada</option>
          <option value="Aguardando" ${st==='Aguardando'?'selected':''} style="background:#0f1629;color:#EAB308;font-weight:700;">⏳ Aguardando</option>
          <option value="Perdido" ${st==='Perdido'?'selected':''} style="background:#0f1629;color:#EF4444;font-weight:700;">❌ Perdido</option>
        </select></td>
        <td><select onchange="salvarClassifProsp('${r.id}',this.value)" style="padding:4px 8px;border-radius:7px;font-size:11px;cursor:pointer;background:var(--s2);border:1px solid var(--brd2);color:var(--txt);font-family:'Plus Jakarta Sans',sans-serif;outline:none;">
          <option value="Qualificado" selected>✅ Qualificado</option>
          <option value="Pré-qualificado">⭐ Pré-qualificado</option>
          <option value="Desqualificação prévia">⚠️ Desq. prévia</option>
          <option value="Desqualificado">🚫 Desqualificado</option>
        </select></td>
      </tr>`;
    }).join('') : _empty(6);

    // ── APROVADOS PARA AVANÇO COMERCIAL: LEADS MENTORIA QUALIFICADOS (pr-s1) ──
    // ── APROVADOS PARA AVANÇO COMERCIAL: LEADS MENTORIA QUALIFICADOS (pr-s1) ──
    if(force || !window._prS1Cache){
      window._prS1Cache = await supaFetch('leads_mentoria','select=*&classificacao_manual=eq.Qualificado&order=created_at.desc').catch(()=>[]);
    }
    const mnQuals = window._prS1Cache;
    if($('pr-s1-count')) $('pr-s1-count').textContent = mnQuals.length+(mnQuals.length===1?' lead':' leads');
    if($('pr-qual-banner')) $('pr-qual-banner').textContent = mnQuals.length||'0';
    if($('pr-qual')) $('pr-qual').textContent = mnQuals.length||'—';
    const _wa2=p=>{if(!p)return'—';const n=p.replace(/\D/g,'');const num=n.startsWith('55')?n:'55'+n;return`<a href="https://wa.me/${num}" target="_blank" style="color:#25D366;text-decoration:none;font-size:11px;">📱 ${p}</a>`;};
    const s1tb=$('pr-s1-leads');
    const _tc='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:0;';
    if(s1tb) s1tb.innerHTML = mnQuals.length ? mnQuals.map(r=>`<tr>
      <td style="${_tc}"><strong style="font-size:11px;">${r.contact_name||'—'}</strong></td>
      <td style="${_tc}">${r.contact_instagram?`<a href="https://instagram.com/${r.contact_instagram.replace('@','')}" target="_blank" style="color:#A78BFA;text-decoration:none;font-size:11px;">${r.contact_instagram}</a>`:'—'}</td>
      <td style="text-align:center;">${platChip(r.plataforma_ad)}</td>
      <td style="text-align:center;">${canalChip(r.canal)}</td>
      <td style="${_tc}color:var(--sub);font-size:11px;">${r.cargo||r.cargo_lp||'—'}</td>
      <td style="${_tc}color:var(--sub);font-size:10px;">${r.faturamento||'—'}</td>
      <td style="${_tc}color:var(--sub);font-size:10px;">${r.contact_email||'—'}</td>
      <td style="${_tc}font-size:10px;">${_wa2(r.contact_phone)}</td>
      <td><select onchange="salvarClassifLeadProsp('${r.id}',this.value,this)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:6px;padding:2px 4px;color:var(--txt);font-size:10px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;width:100%;">
        <option value="">— Classificar</option>
        <option value="Qualificado" ${'Qualificado'===r.classificacao_manual?'selected':''}>✅ Qualificado</option>
        <option value="Pré-qualificado" ${'Pré-qualificado'===r.classificacao_manual?'selected':''}>⚡ Pré-qualificado</option>
        <option value="Desqualificação prévia" ${'Desqualificação prévia'===r.classificacao_manual?'selected':''}>⚠ Desq. prévia</option>
        <option value="Desqualificado" ${'Desqualificado'===r.classificacao_manual?'selected':''}>✕ Desqualificado</option>
      </select></td>
    </tr>`).join('') : `<tr class="er"><td colspan="9" style="color:var(--dim);font-style:italic;text-align:center;padding:18px;">Nenhum lead qualificado ainda</td></tr>`;
    // ── SEÇÃO 2: PRÉ-QUALIFICADOS ──
    const s2Filter=($('pr-s2-filter')||{}).value||'';
    let s2=prosp.filter(r=>r.classificacao_manual==='Pré-qualificado');
    if(s2Filter) s2=s2.filter(r=>_plat(r)===s2Filter);
    if($('pr-s2-count')) $('pr-s2-count').textContent = s2.length+(s2.length===1?' lead':' leads');
    const s2tb=$('pr-s2-leads');
    if(s2tb) s2tb.innerHTML = s2.length ? s2.map(r=>`<tr>
      <td class="mo" style="font-size:11px;white-space:nowrap;">${_dt(r)}</td>
      <td><strong style="font-size:12px;">${r.nome||'—'}</strong></td>
      <td>${_insta(r)}</td>
      <td>${_platBadge(r)}</td>
      <td><button onclick="moverParaQualificado('${r.id}')" style="padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid rgba(34,197,94,.4);background:rgba(34,197,94,.1);color:#22C55E;">→ Mover para Qualificados</button></td>
    </tr>`).join('') : _empty(5);

    // ── SEÇÃO 3: DESQUALIFICADOS ──
    const s3Filter=($('pr-s3-filter')||{}).value||'';
    let s3=prosp.filter(r=>r.classificacao_manual==='Desqualificado');
    if(s3Filter) s3=s3.filter(r=>_plat(r)===s3Filter);
    if($('pr-s3-count')) $('pr-s3-count').textContent = s3.length+(s3.length===1?' lead':' leads');
    const s3tb=$('pr-s3-leads');
    if(s3tb) s3tb.innerHTML = s3.length ? s3.map(r=>`<tr>
      <td class="mo" style="font-size:11px;white-space:nowrap;">${_dt(r)}</td>
      <td><strong style="font-size:12px;">${r.nome||'—'}</strong></td>
      <td>${_insta(r)}</td>
      <td>${_platBadge(r)}</td>
      <td><input value="${(r.motivo_desqualificacao||'').replace(/"/g,'&quot;')}" onblur="salvarMotivoDesq('${r.id}',this.value)" placeholder="Registrar motivo..." style="background:var(--s2);border:1px solid var(--brd2);border-radius:7px;padding:4px 8px;color:var(--txt);font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;width:100%;min-width:160px;"></td>
    </tr>`).join('') : _empty(5);

    // ── SEÇÃO 4: DESQUALIFICAÇÃO PRÉVIA ──
    const s4Filter=($('pr-s4-filter')||{}).value||'';
    let s4=prosp.filter(r=>r.classificacao_manual==='Desqualificação prévia');
    if(s4Filter) s4=s4.filter(r=>_plat(r)===s4Filter);
    if($('pr-s4-count')) $('pr-s4-count').textContent = s4.length+(s4.length===1?' lead':' leads');
    const s4tb=$('pr-s4-leads');
    if(s4tb) s4tb.innerHTML = s4.length ? s4.map(r=>`<tr>
      <td class="mo" style="font-size:11px;white-space:nowrap;">${_dt(r)}</td>
      <td><strong style="font-size:12px;">${r.nome||'—'}</strong></td>
      <td>${_insta(r)}</td>
      <td>${_platBadge(r)}</td>
      <td><button onclick="revisarProsp('${r.id}')" style="padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid rgba(249,115,22,.4);background:rgba(249,115,22,.1);color:#F97316;">→ Revisar</button></td>
    </tr>`).join('') : _empty(5);

  }catch(e){ console.error('renderProspeccoes:',e); }
}

function classifSelectProsp(id, atual){
  const opts=['Qualificado','Pré-qualificado','Desqualificação prévia','Desqualificado'];
  return`<select onchange="salvarClassifProsp('${id}',this.value)" style="background:var(--s2);border:1px solid var(--brd2);border-radius:8px;padding:4px 8px;color:var(--txt);font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;outline:none;">
    <option value="">— Classificar</option>
    ${opts.map(o=>`<option value="${o}" ${o===atual?'selected':''}>${o}</option>`).join('')}
  </select>`;
}
async function salvarClassifProsp(id, classificacao){
  try{
    await supaUpdate('prospeccoes', id, {classificacao_manual: classificacao});
    if(window._prData){const r=window._prData.find(r=>r.id===id);if(r)r.classificacao_manual=classificacao;}
    renderProspeccoes(false);
  }catch(e){ console.error('Erro ao salvar:', e); }
}
// Salva classificação de lead da Mentoria a partir da aba Prospecções
// Não dispara re-render de Mentoria nem Visão Geral — só atualiza Prospecções
async function salvarClassifLeadProsp(id, classificacao, selectEl){
  try{
    await supaUpdate('leads_mentoria', id, {classificacao_manual: classificacao});
    // Atualiza cache local sem tocar no cache da Mentoria (_mnLeads)
    if(window._prS1Cache){
      const r=window._prS1Cache.find(r=>r.id===id);
      if(r) r.classificacao_manual=classificacao;
    }
    // Se o lead foi desqualificado ou alterado, remove da lista de qualificados e re-renderiza
    renderProspeccoes(false);
  }catch(e){console.error('Erro ao salvar classificação (prosp):',e);alert('Erro ao salvar: '+e.message);}
}
async function salvarPlataformaProsp(id, plataforma){
  try{
    await supaUpdate('prospeccoes', id, {plataforma: plataforma});
    if(window._prData){const r=window._prData.find(r=>r.id===id);if(r)r.plataforma=plataforma;}
    renderProspeccoes(false);
  }catch(e){ console.error('Erro ao salvar plataforma:', e); }
}
function toggleStatusMenu(id){

  document.querySelectorAll('[id^="st-menu-"]').forEach(m=>{ if(m.id!=='st-menu-'+id) m.style.display='none'; });

  const m=$('st-menu-'+id);

  if(m) m.style.display=m.style.display==='none'?'block':'none';

}

async function salvarStatusQual(id, status){
  localStorage.setItem('pst_'+id, status);
  const c=_stMap[status]||_stMap['Aguardando'];
  const btn=$('st-btn-'+id);
  if(btn){ btn.style.border='1px solid '+c.brd; btn.style.background=c.bg; btn.style.color=c.cor; btn.textContent=c.icon+' '+status+' ▾'; }
  const mn=$('st-menu-'+id); if(mn) mn.style.display='none';
  if(window._prData){const r=window._prData.find(r=>r.id===id);if(r)r.status_qualificado=status;}
  try{ await supaUpdate('prospeccoes', id, {status_qualificado: status}); }catch(e){}
}
async function moverParaQualificado(id){
  try{
    await supaUpdate('prospeccoes', id, {classificacao_manual: 'Qualificado'});
    if(window._prData){const r=window._prData.find(r=>r.id===id);if(r)r.classificacao_manual='Qualificado';}
    renderProspeccoes(false);
  }catch(e){ console.error('Erro ao mover para qualificados:', e); }
}
async function salvarMotivoDesq(id, motivo){
  try{
    await supaUpdate('prospeccoes', id, {motivo_desqualificacao: motivo});
  }catch(e){ console.error('Erro ao salvar motivo:', e); }
}
async function revisarProsp(id){
  try{
    await supaUpdate('prospeccoes', id, {classificacao_manual: ''});
    if(window._prData){const r=window._prData.find(r=>r.id===id);if(r)r.classificacao_manual='';}
    renderProspeccoes(false);
  }catch(e){ console.error('Erro ao revisar prospecção:', e); }
}
function exportarSecaoProsp(classificacao){
  supaFetch('prospeccoes',`select=*&classificacao_manual=eq.${encodeURIComponent(classificacao)}&order=created_at.desc`).then(prosp=>{
    if(!prosp||!prosp.length){alert('Nenhum lead nesta seção para exportar.');return;}
    const cols=['nome','instagram','nicho','data','plataforma','status_qualificado','motivo_desqualificacao','classificacao_manual','created_at'];
    const header=cols.join(',');
    const rows=prosp.map(r=>cols.map(c=>'"'+String(r[c]||'').replace(/"/g,'""')+'"').join(','));
    const csv='\uFEFF'+header+'\n'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const slug=classificacao.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    a.href=url;a.download=`prospeccoes-${slug}.csv`;a.click();
    URL.revokeObjectURL(url);
  });
}

function exportarProspeccoes(){
  supaFetch('prospeccoes','select=*&order=created_at.desc').then(prosp=>{
    if(!prosp||!prosp.length){alert('Nenhuma prospecção para exportar.');return;}
    const cols=['instagram','nicho','data','classificacao_manual','plataforma','created_at'];
    const header=cols.join(',');
    const rows=prosp.map(r=>cols.map(c=>'"'+String(r[c]||'').replace(/"/g,'""')+'"').join(','));
    const csv='\uFEFF'+header+'\n'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='prospeccoes-tutory.csv';a.click();
    URL.revokeObjectURL(url);
  });
}


// ═══════════════════════════════════════════
// EXPORTAR RELATÓRIO PDF PREMIUM
// ═══════════════════════════════════════════
