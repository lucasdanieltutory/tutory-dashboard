// tab-experience-campanhas.js — Experience, navegação/período, modais, chat IA, gráficos de campanha
async function renderExperience(){
  try{
    const {ini,fim}=getDates('experience');
    const [camps,anunciosEx,diags]=await Promise.all([
      supaFetch('campanhas_experience',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('anuncios_experience',`select=*&data=gte.${ini}&data=lte.${fim}&order=data.desc`),
      supaFetch('diagnosticos','select=*&plataforma=eq.experience&order=created_at.desc&limit=1')
    ]);
    const _metaEx=await fetchMetaInsights(ini,fim);const _msEx=metaSumByPlatform(_metaEx);
    const invest=_msEx.total>0?_msEx.experience:camps.reduce((a,r)=>a+(+r.gasto||0),0);
    // Vendas = soma do campo vendas das campanhas (Resultados do Meta Ads)
    const totV=camps.reduce((a,r)=>a+(+r.vendas||0),0);
    // Custo por compra = soma do campo custo_por_compra ponderado
    const totRec=0; // sem receita manual por enquanto
    const ctrArr=camps.filter(r=>r.ctr>0).map(r=>+r.ctr);
    const ctrMed=ctrArr.length?ctrArr.reduce((a,b)=>a+b,0)/ctrArr.length:0;
    const custo=totV>0?invest/totV:0;
    const roi=invest>0?(totRec-invest)/invest*100:0;
    const ticket=totV>0?totRec/totV:0;
    const dias=Math.max(0,Math.round((new Date('2026-04-11')-new Date())/86400000));
    if($('ex-inv'))$('ex-inv').textContent=fmt.brlK(invest);
    if($('ex-ing'))$('ex-ing').textContent=totV;
    if($('ex-ci'))$('ex-ci').textContent=custo>0?'R$'+custo.toFixed(2).replace('.',','):'—';
    if($('ex-cib'))$('ex-cib').textContent=custo>0?'R$'+custo.toFixed(2).replace('.',','):'—';
    if($('ex-tk'))$('ex-tk').textContent=ticket>0?'R$'+ticket.toFixed(2).replace('.',','):'—';
    if($('ex-ctr'))$('ex-ctr').textContent=fmt.pct(ctrMed);
    if($('ex-dias'))$('ex-dias').textContent=dias;
    stBand($('ex-st'),custo<=50||custo===0,'EM ANDAMENTO','CUSTO ALTO');
    // camps
    const ecb=$('ex-camp');
    if(ecb){
      if(anunciosEx.length===0){ecb.innerHTML='<tr class="er"><td colspan="5">Nenhuma campanha registrada ainda.</td></tr>';}
      else{
        const uniq={};anunciosEx.forEach(r=>{if(!uniq[r.anuncio_nome||r.campanha_nome])uniq[r.anuncio_nome||r.campanha_nome]=r;});
        ecb.innerHTML=Object.values(uniq).slice(0,8).map(r=>`<tr>
          <td><strong>${r.campanha_nome||'—'}</strong></td>
          <td class="mo">${fmt.brl(r.gasto||0)}</td>
          <td class="mo" style="color:${+r.ctr>=2?'var(--gn)':'var(--red)'}">${(+r.ctr||0).toFixed(1)}%</td>
          <td class="mo">R$${(+r.cpc||0).toFixed(2).replace('.',',')}</td>
          <td>${ctrChip(r.ctr||0)}</td>
        </tr>`).join('');
      }
    }
    // vendas
    const evb=$('ex-vend');
    if(evb){
      if(vendasFiltradas.length===0){evb.innerHTML='<tr class="er"><td colspan="4">Nenhuma venda registrada. Use o botão + para adicionar.</td></tr>';}
      else{evb.innerHTML=vendasFiltradas.map(r=>`<tr>
        <td class="mo">${fmtDate(r.created_at)}</td>
        <td class="mo" style="color:var(--ex)">${fmt.brl(r.valor||0)}</td>
        <td>${r.descricao||'—'}</td>
        <td style="color:var(--sub)">${r.observacao||'—'}</td>
      </tr>`).join('');}
    }
    // diag
    if(diags.length){
      const d=diags[0];
      if($('ex-dt'))$('ex-dt').textContent=d.resumo?d.resumo.slice(0,60)+'...':'Diagnóstico disponível';
      if($('ex-dtxt'))$('ex-dtxt').textContent=d.resumo||'—';
      if($('ex-dacts')&&d.recomendacoes){
        $('ex-dacts').innerHTML=d.recomendacoes.split('\n').filter(Boolean).map(a=>`<div class="dact">${a}</div>`).join('');
      }
    } else {
      if($('ex-dt'))$('ex-dt').textContent='Aguardando primeiro diagnóstico';
      if($('ex-dtxt'))$('ex-dtxt').textContent='O diagnóstico é gerado automaticamente todos os dias às 08h30.';
    }
  }catch(e){console.error('renderExperience:',e);}
}

// RENDER CAMPS TABLE
function renderMnCamps(data){
  const cb=$('mn-camp');
  if(!cb)return;
  if(!data||data.length===0){
    cb.innerHTML='<tr class="er"><td colspan="10">Nenhum anúncio registrado ainda.</td></tr>';
    return;
  }
  cb.innerHTML=data.map(r=>{
    const cpl=+r.cpl||0;
    const leads=+r.leads||0;
    const adId=r.anuncio_id||r.id||'';
    const adLink=adId?`https://www.facebook.com/ads/manager/account/ads?act=1448033875601177&selected_ad_ids=${adId}`:'https://business.facebook.com/adsmanager';
    const thumbHtml=`<a href="${adLink}" target="_blank" title="Ver anúncio no Meta" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:var(--mn-bg);border:1px solid var(--mn-b);border-radius:6px;color:#6AAAFF;font-size:11px;font-weight:600;text-decoration:none;">👁 Ver</a>`;
    return `<tr>
      <td style="padding:8px 14px;">${thumbHtml}</td>
      <td><div style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:12px;" title="${r.anuncio_nome||''}">${r.anuncio_nome||r.conjunto_nome||'—'}</div></td>
      <td style="color:var(--sub);font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.conjunto_nome||'—'}</td>
      <td style="color:var(--dim);font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.campanha_nome||'—'}</td>
      <td class="mo">${fmt.brl(r.gasto||0)}</td>
      <td class="mo" style="text-align:center;">${leads>0?leads:'—'}</td>
      <td class="mo" style="color:${cplC(cpl)};font-weight:700;">${cpl>0?'R$'+cpl.toFixed(2).replace('.',','):'—'}</td>
      <td class="mo" style="color:${+r.ctr>=2?'var(--gn)':'var(--red)'}">${(+r.ctr||0).toFixed(1)}%</td>
      <td class="mo">R$${(+r.cpc||0).toFixed(2).replace('.',',')}</td>
      <td>${cplChip(cpl)}</td>
    </tr>`;
  }).join('');
}
function filterCamps(){
  const q=($('mn-camp-search').value||'').toLowerCase();
  if(!window._mnCamps)return;
  const filtered=q?window._mnCamps.filter(r=>
    (r.anuncio_nome||'').toLowerCase().includes(q)||
    (r.conjunto_nome||'').toLowerCase().includes(q)||
    (r.campanha_nome||'').toLowerCase().includes(q)
  ):window._mnCamps;
  renderMnCamps(filtered);
  if($('mn-camp-count'))$('mn-camp-count').textContent=filtered.length+' anúncios'+(q?' (filtrado)':'');
}

// PERIOD FILTER STATE
const periodState={mentoria:'30',hub:'30',experience:'30',geral:'30',criativos:'30',prospeccoes:'30'};
function getDates(pg){
  const s=periodState[pg]||'30';
  const hoje=new Date();
  const pad=n=>String(n).padStart(2,'0');
  const fim=hoje.getFullYear()+'-'+pad(hoje.getMonth()+1)+'-'+pad(hoje.getDate());
  let ini;
  if(s==='hoje'){ini=fim;}
  else if(s==='7'){const d=new Date(hoje);d.setDate(d.getDate()-6);ini=d.toISOString().split('T')[0];}
  else if(s==='30'){const d=new Date(hoje);d.setDate(d.getDate()-29);ini=d.toISOString().split('T')[0];}
  else if(s==='mes'){ini=hoje.getFullYear()+'-'+(String(hoje.getMonth()+1).padStart(2,'0'))+'-01';}
  else if(s==='todos'){ini='2020-01-01';}
  else if(s==='custom'){
    const df=$('df-'+pg);const dt=$('dt-'+pg);
    if(df&&dt&&df.value&&dt.value){ini=df.value;return{ini,fim:dt.value};}
    const d=new Date(hoje);d.setDate(d.getDate()-29);ini=d.toISOString().split('T')[0];
  }
  return{ini,fim};
}
function selP(btn,pg,val){
  const bar=btn.closest('.pbar-l');
  bar.querySelectorAll('.pb').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  periodState[pg]=val;
  const custRow=$(pg+'-custom-row');
  if(custRow)custRow.style.display=val==='custom'?'flex':'none';
  if(val!=='custom')reload();
}
function applyCustom(pg){periodState[pg]='custom';reload();}

// NAVIGATION
let cur='geral';
const fabMap={
  aeroporto:[],
  geral:[],
  mentoria:[],
  hub:[{label:'+ Lead Hub',cls:'fab-mn',action:"openModal('modal-lead-hb')"}],
  experience:[],
  chat:[]
};
var PAGE_TITLES={aeroporto:'Aeroporto de Leads',geral:'Visão Geral',mentoria:'Tutory Mentoria',hub:'TutoryHub',experience:'Experience',criativos:'Criativos',prospeccoes:'Prospecções',youtube:'YouTube',beijamim:'Prospecções Beijamim',gamificacao:'Leads Gamificação'};
var PAGE_IDS=['aeroporto','geral','mentoria','hub','experience','criativos','prospeccoes','youtube','beijamim','gamificacao'];
function go(id,el){
  // Esconder TODAS as páginas via style direto
  PAGE_IDS.forEach(function(pid){
    var p=document.getElementById('page-'+pid);
    if(p){p.style.display='none';p.classList.remove('active');}
  });
  // Remover active de todos os itens da sidebar
  var allS=document.querySelectorAll('.sb-item');
  for(var i=0;i<allS.length;i++)allS[i].classList.remove('active');
  // Mostrar a página clicada
  var pg=document.getElementById('page-'+id);
  if(pg){pg.style.display='block';pg.classList.add('active');}
  // Ativar item da sidebar
  if(el){el.classList.add('active');var bd=el.querySelector('.sb-bdot');if(bd)bd.style.opacity='1';}
  // Atualizar breadcrumb
  var tEl=document.getElementById('tb-page-title');
  if(tEl)tEl.textContent=PAGE_TITLES[id]||id;
  // Scroll ao topo
  window.scrollTo(0,0);
  cur=id;
  updateFab(id);
  // Renderizar dados da página
  if(id==='aeroporto')renderAeroporto();
  else if(id==='geral')renderGeral();
  else if(id==='mentoria')renderMentoria();
  else if(id==='hub')renderHub();
  else if(id==='experience')renderExperience();
  else if(id==='criativos')renderCriativos();
  else if(id==='prospeccoes')renderProspeccoes(true);
  else if(id==='youtube')renderYouTube();
  else if(id==='beijamim')initBeijamim();
  else if(id==='gamificacao')initGamificacao();
}
function updateFab(id){
  const fa=$('fab-area');
  if(!fa)return;
  const btns=fabMap[id]||[];
  fa.innerHTML=btns.map(b=>`<button class="fab-btn ${b.cls}" onclick="${b.action}">${b.label}</button>`).join('');
}
/* ── SIDEBAR TOGGLE ── */
function toggleSidebar(){
  var sb=document.getElementById('sidebar');
  var tb=document.querySelector('.topbar');
  var pages=document.querySelectorAll('.page');
  var btn=document.getElementById('sb-toggle');
  var hidden=sb&&sb.classList.toggle('sb-hidden');
  if(tb)tb.classList.toggle('sb-hidden',hidden);
  pages.forEach(function(p){p.classList.toggle('sb-hidden',hidden);});
  if(btn)btn.textContent=hidden?'›':'☰';
  try{localStorage.setItem('tutory_sb_hidden',hidden?'1':'');}catch(e){}
}
document.addEventListener('DOMContentLoaded',function(){
  try{
    if(localStorage.getItem('tutory_sb_hidden')==='1'){
      var sb=document.getElementById('sidebar');
      var tb=document.querySelector('.topbar');
      var pages=document.querySelectorAll('.page');
      var btn=document.getElementById('sb-toggle');
      if(sb)sb.classList.add('sb-hidden');
      if(tb)tb.classList.add('sb-hidden');
      pages.forEach(function(p){p.classList.add('sb-hidden');});
      if(btn)btn.textContent='›';
    }
  }catch(e){}
});

function reload(m=false){
  const b=document.querySelector('.ref-btn');if(b)b.classList.add('spin');
  if(cur==='aeroporto')renderAeroporto();else if(cur==='geral')renderGeral();
  else if(cur==='mentoria')renderMentoria(true);
  else if(cur==='hub')renderHub();
  else if(cur==='experience')renderExperience();
  else if(cur==='criativos')renderCriativos();
  else if(cur==='prospeccoes')renderProspeccoes(false);
  else if(cur==='youtube')renderYouTube();
  else if(cur==='beijamim')renderBeijamim();
  else if(cur==='gamificacao')renderGamificacao();
  setTimeout(()=>{if(b)b.classList.remove('spin');},700);
}
setInterval(()=>reload(),5*60*1000);

// MODALS
function openModal(id){
  const m=$(id);if(!m)return;
  m.style.display='flex';
  const today=new Date().toISOString().split('T')[0];
  ['mn-r-data','hb-r-data','ex-r-data'].forEach(f=>{if($(f))$(f).value=today;});
}
function closeModal(id){const m=$(id);if(m)m.style.display='none';}
document.addEventListener('click',e=>{
  if(e.target.classList.contains('modal-overlay'))e.target.style.display='none';
});

// SALVAR RECEITA
async function salvarReceita(plat){
  const prefMap={mentoria:'mn',hub:'hb',experience:'ex'};
  const p=prefMap[plat];
  const data=$(p+'-r-data').value;
  const desc=$(p+'-r-desc').value;
  const val=$(p+'-r-val').value;
  const obs=$(p+'-r-obs').value;
  const msgEl=$(p+'-r-msg');
  if(!data||!val){msgEl.style.display='block';msgEl.style.color='var(--red)';msgEl.textContent='Preencha data e valor.';return;}
  try{
    const tabelaMap={mentoria:'receita_mentoria',hub:'receita_hub',experience:'vendas_experience'};
    const body=plat==='experience'
      ?{data,descricao:desc,valor:parseFloat(val),quantidade:1,observacao:obs}
      :{data,descricao:desc,valor:parseFloat(val),tipo:'entrada',observacao:obs};
    await supaInsert(tabelaMap[plat],body);
    msgEl.style.display='block';msgEl.style.color='var(--gn)';msgEl.textContent='✓ Salvo com sucesso!';
    setTimeout(()=>{closeModal('modal-'+p);msgEl.style.display='none';reload();},1500);
  }catch(e){msgEl.style.display='block';msgEl.style.color='var(--red)';msgEl.textContent='Erro: '+e.message;}
}

// SALVAR LEAD HUB
async function salvarLeadHub(){
  const nome=$('lhb-nome').value;
  const msgEl=$('lhb-msg');
  if(!nome){msgEl.style.display='block';msgEl.style.color='var(--red)';msgEl.textContent='Nome é obrigatório.';return;}
  try{
    await supaInsert('leads_hub',{
      contact_name:nome,
      contact_email:$('lhb-email').value,
      contact_phone:$('lhb-tel').value,
      contact_instagram:$('lhb-insta').value,
      origem:$('lhb-origem').value,
      observacao:$('lhb-obs').value
    });
    msgEl.style.display='block';msgEl.style.color='var(--gn)';msgEl.textContent='✓ Lead salvo!';
    setTimeout(()=>{closeModal('modal-lead-hb');msgEl.style.display='none';renderHub();},1500);
  }catch(e){msgEl.style.display='block';msgEl.style.color='var(--red)';msgEl.textContent='Erro: '+e.message;}
}

// CHAT IA
function setQ(t){$('chat-input').value=t;sendChat();}
function saveClaude(){
  const k=$('claude-key-input').value.trim();
  if(k){sessionStorage.setItem('tutory_claude_key',k);const s=$('key-status');s.style.display='inline';setTimeout(()=>s.style.display='none',2000);}
}
async function sendChat(){
  const input=$('chat-input');
  const btn=$('chat-btn');
  const msgs=$('chat-messages');
  const question=input.value.trim();
  if(!question)return;
  const apiKey=getClaudeKey();
  if(!apiKey){addMsg('assistant','⚠️ Configure sua Claude API Key no campo abaixo para usar o assistente.');return;}
  addMsg('user',question);
  input.value='';
  btn.disabled=true;btn.textContent='...';
  const typingId='typing-'+Date.now();
  msgs.innerHTML+=`<div class="chat-msg assistant" id="${typingId}"><div class="chat-bubble chat-typing">Buscando dados e analisando...</div></div>`;
  msgs.scrollTop=msgs.scrollHeight;
  try{
    const [leads,camps,diags,recMn,recHb,recEx]=await Promise.all([
      supaFetch('leads_mentoria','select=score,classificacao,canal,contact_name,created_at&order=created_at.desc&limit=200'),
      supaFetch('campanhas_mentoria','select=campanha_nome,gasto,ctr,cpc,cpl&order=data.desc&limit=30'),
      supaFetch('diagnosticos','select=*&order=created_at.desc&limit=3'),
      (()=>{const {ini,fim}=getDates('geral');return supaFetch('receita_mentoria',`select=valor&data=gte.${ini}&data=lte.${fim}`);})(),
      (()=>{const {ini,fim}=getDates('geral');return supaFetch('receita_hub',`select=valor&data=gte.${ini}&data=lte.${fim}`);})(),
      supaFetch('vendas_experience','select=valor')
    ]);
    const hot=leads.filter(r=>r.classificacao_manual==='Qualificado').length;
    const warm=leads.filter(r=>r.classificacao_manual==='Pré-qualificado').length;
    const dqp=leads.filter(r=>r.classificacao_manual==='Desqualificação prévia').length;
    const cold=leads.filter(r=>r.classificacao_manual==='Desqualificado').length;
    const today=new Date().toISOString().slice(0,10);
    const todayLeads=leads.filter(r=>r.created_at&&r.created_at.startsWith(today));
    const invest=camps.reduce((a,r)=>a+(+r.gasto||0),0);
    const cpl=leads.length>0?invest/leads.length:0;
    const totMn=recMn.reduce((a,r)=>a+(+r.valor||0),0);
    const totHb=recHb.reduce((a,r)=>a+(+r.valor||0),0);
    const totEx=recEx.reduce((a,r)=>a+(+r.vendas||0),0);
    let context=`Dados reais do sistema Tutory (Supabase):\n\n`;
    context+=`MENTORIA — Leads:\n- Total: ${leads.length}\n- Quentes (score≥8): ${hot}\n- Mornos (5-7): ${warm}\n- Frios (≤4): ${cold}\n- Hoje: ${todayLeads.length}\n\n`;
    context+=`MENTORIA — Campanhas:\n- Investimento total: R$${invest.toFixed(2)}\n- CPL real: R$${cpl.toFixed(2)}\n- Campanhas: ${camps.length}\n\n`;
    context+=`RECEITA:\n- Mentoria: R$${totMn.toFixed(2)}\n- Hub: R$${totHb.toFixed(2)}\n- Experience: R$${totEx.toFixed(2)}\n\n`;
    if(diags.length)context+=`ÚLTIMO DIAGNÓSTICO (${diags[0].plataforma}): ${diags[0].resumo}\n\n`;
    context+=`METAS: CPL Mentoria ≤ R$15, CPL Hub ≤ R$20, CTR ≥ 2%, CPC ≤ R$3, Score Quente ≥ 8`;
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:600,
        system:`Você é analista de marketing da Tutory. Responda com base nos dados reais do Supabase. Seja direto e use números. Responda em português. Máximo 4 parágrafos.`,
        messages:[{role:'user',content:`${context}\n\nPergunta: ${question}`}]
      })
    });
    const data=await res.json();
    $(typingId)?.remove();
    if(data.content&&data.content[0])addMsg('assistant',data.content[0].text);
    else if(data.error)addMsg('assistant',`⚠️ Erro: ${data.error.message}`);
  }catch(e){$(typingId)?.remove();addMsg('assistant','⚠️ Erro ao conectar. Verifique sua API Key.');}
  btn.disabled=false;btn.textContent='Enviar';
  msgs.scrollTop=msgs.scrollHeight;
}
function addMsg(role,text){
  const msgs=$('chat-messages');
  const div=document.createElement('div');
  div.className=`chat-msg ${role}`;
  div.innerHTML=`<div class="chat-bubble">${text.replace(/\n/g,'<br>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
}


// RENDER NOVAS SEÇÕES MENTORIA
function renderMnInvDaily(camps) {
  // Agrupa investimento por dia
  const byDay = {};
  camps.forEach(c => {
    const d = c.data || '';
    if (!d) return;
    byDay[d] = (byDay[d] || 0) + (+c.gasto || 0);
  });
  const dias = Object.keys(byDay).sort();
  const vals = dias.map(d => +byDay[d].toFixed(2));
  const labels = dias.map(d => {
    const p = d.split('-');
    return p[2] + '/' + p[1];
  });
  dc('c-mn-inv-daily');
  const ctx = document.getElementById('c-mn-inv-daily');
  if (!ctx) return;
  CC['c-mn-inv-daily'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: vals,
        borderColor: '#4F8EF7',
        backgroundColor: 'rgba(26,63,203,.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#4F8EF7',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#354560', maxRotation: 0 } },
        y: { grid: GR, ticks: { color: '#354560', callback: v => 'R$' + (v >= 1000 ? (v/1000).toFixed(1)+'K' : v) } }
      }
    }
  });
}

function renderMnWeekCmp(camps) {
  // Esta semana vs semana anterior
  const hoje = new Date();
  const pad = n => String(n).padStart(2,'0');
  const toStr = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  
  const semAtual = [];
  const semAnterior = [];
  for (let i = 6; i >= 0; i--) {
    const d1 = new Date(hoje); d1.setDate(d1.getDate() - i);
    const d2 = new Date(hoje); d2.setDate(d2.getDate() - i - 7);
    semAtual.push(toStr(d1));
    semAnterior.push(toStr(d2));
  }
  
  const byDay = {};
  camps.forEach(c => { if (c.data) byDay[c.data] = (byDay[c.data] || 0) + (+c.gasto || 0); });
  
  const labels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const atual = semAtual.map(d => +(byDay[d] || 0).toFixed(2));
  const anterior = semAnterior.map(d => +(byDay[d] || 0).toFixed(2));
  
  dc('c-mn-week-cmp');
  const ctx = document.getElementById('c-mn-week-cmp');
  if (!ctx) return;
  CC['c-mn-week-cmp'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Esta semana', data: atual, backgroundColor: 'rgba(26,63,203,.7)', borderRadius: 6 },
        { label: 'Semana anterior', data: anterior, backgroundColor: 'rgba(26,63,203,.2)', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: '#7A8BAA', font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#354560' } },
        y: { grid: GR, ticks: { color: '#354560', callback: v => 'R$' + (v >= 1000 ? (v/1000).toFixed(1)+'K' : v) } }
      }
    }
  });
}

function renderMnScoreCanal(leads) {
  const el = document.getElementById('mn-score-canal');
  if (!el) return;
  
  const canais = {};
  leads.forEach(l => {
    const c = l.canal || 'Orgânico';
    if (!canais[c]) canais[c] = { total: 0, count: 0 };
    if (l.score != null) { canais[c].total += +l.score; canais[c].count++; }
  });
  
  const rows = Object.entries(canais)
    .filter(([,v]) => v.count > 0)
    .map(([c, v]) => ({ canal: c, media: v.total / v.count, count: v.count }))
    .sort((a, b) => b.media - a.media);
  
  if (rows.length === 0) {
    el.innerHTML = '<div style="color:var(--sub);font-size:13px;text-align:center;padding:20px;">Aguardando leads com score...</div>';
    return;
  }
  
  const canalIcon = { 'Landing Page': '🌐', 'Typebot': '🤖', 'Respondi': '💬', 'Site Oficial': '🏠' };
  const canalColor = { 'Landing Page': 'var(--mn)', 'Typebot': 'var(--pu)', 'Respondi': 'var(--hb)', 'Site Oficial': 'var(--ex)' };
  
  el.innerHTML = rows.map(r => {
    const pct = Math.min((r.media / 10) * 100, 100);
    const cor = r.media >= 8 ? 'var(--gn)' : r.media >= 5 ? 'var(--hb)' : 'var(--mn)';
    const icon = canalIcon[r.canal] || '🌿';
    return `<div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:600;">${icon} ${r.canal}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:var(--sub);">${r.count} leads</span>
          <span style="font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${cor};">${r.media.toFixed(1)}</span>
        </div>
      </div>
      <div style="height:6px;background:var(--s3);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${cor};border-radius:3px;transition:width .5s;"></div>
      </div>
    </div>`;
  }).join('');
}

function renderMnPrevisao(camps, leads, receita, ini) {
  const el = document.getElementById('mn-previsao');
  if (!el) return;
  
  const hoje = new Date();
  const pad = n => String(n).padStart(2,'0');
  const mesIni = hoje.getFullYear() + '-' + pad(hoje.getMonth()+1) + '-01';
  const totalDias = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).getDate();
  const diaAtual = hoje.getDate();
  const diasRestantes = totalDias - diaAtual;
  
  // Só calcula previsão para mês atual
  const investMes = camps.filter(c => c.data >= mesIni).reduce((a,r) => a + (+r.gasto||0), 0);
  const leadsMes = leads.filter(l => l.created_at && l.created_at >= mesIni + 'T00:00:00').length;
  const recMes = receita.reduce((a,r) => a + (+r.valor||0), 0);
  
  if (diaAtual < 3) {
    el.innerHTML = '<div style="color:var(--sub);font-size:13px;text-align:center;padding:20px;">Aguardando mais dados do mês...</div>';
    return;
  }
  
  const ritmoInv = investMes / diaAtual;
  const ritmoLeads = leadsMes / diaAtual;
  const ritmoRec = recMes / diaAtual;
  
  const prevInv = investMes + (ritmoInv * diasRestantes);
  const prevLeads = Math.round(leadsMes + (ritmoLeads * diasRestantes));
  const prevRec = recMes + (ritmoRec * diasRestantes);
  const prevCPL = prevLeads > 0 ? prevInv / prevLeads : 0;
  const prevROI = prevInv > 0 ? ((prevRec - prevInv) / prevInv * 100) : 0;
  
  const cplOk = prevCPL > 0 && prevCPL <= 15;
  
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="background:var(--s3);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--sub);margin-bottom:6px;">Invest. Previsto</div>
        <div style="font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--mn);">R$${(prevInv/1000).toFixed(1)}K</div>
      </div>
      <div style="background:var(--s3);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--sub);margin-bottom:6px;">Leads Previstos</div>
        <div style="font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--gn);">${prevLeads}</div>
      </div>
      <div style="background:var(--s3);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--sub);margin-bottom:6px;">CPL Previsto</div>
        <div style="font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${cplOk?'var(--gn)':'var(--red)'};">${prevCPL>0?'R$'+prevCPL.toFixed(2):'—'}</div>
      </div>
      <div style="background:var(--s3);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--sub);margin-bottom:6px;">ROI Previsto</div>
        <div style="font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${prevROI>200?'var(--gn)':'var(--hb)'};">${prevROI>0?prevROI.toFixed(0)+'%':'—'}</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--sub);text-align:center;">Baseado no ritmo dos últimos ${diaAtual} dias · ${diasRestantes} dias restantes no mês</div>
  `;
}

// setRef for geral
function setRefGeral(){const e=$('rg');if(e){const {ini,fim}=getDates('geral');e.textContent=ini+' → '+fim;}}



// SUPA UPDATE
async function supaUpdate(tabela, id, dados){
  const res = await fetch(`${SUPA_URL}/rest/v1/${tabela}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(dados)
  });
  if(!res.ok){ const e=await res.text(); throw new Error(e); }
}
