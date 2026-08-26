// tab-beijamim.js — Prospecções Beijamim
async function bjFetch(){
  return supaFetch(BJ_TABLE,'select=*&order=criado.asc');
}
async function bjInsert(body){
  return supaInsert(BJ_TABLE,body);
}
async function bjPatch(id,dados){
  return supaUpdate(BJ_TABLE,id,dados);
}
async function bjDelete(id){
  await fetch(SUPA_URL+'/rest/v1/'+BJ_TABLE+'?id=eq.'+id,{
    method:'DELETE',
    headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Prefer':'return=minimal'}
  });
}

/* Seed automático: se tabela vazia insere os 14 leads iniciais */
async function bjSeedIfEmpty(){
  try{
    var r=await supaFetch(BJ_TABLE,'select=id&limit=1');
    if(r&&r.length===0){
      for(var i=0;i<BJ_INITIAL.length;i++){
        await bjInsert(BJ_INITIAL[i]);
      }
    }
  }catch(e){ console.warn('bjSeed:',e); }
}

/* ── MODAL ── */
function bjOpenModal(tipo){
  _bjModal_tipo=tipo||'hub';
  var m=document.getElementById('bj-modal');
  if(!m)return;
  document.getElementById('bj-modal-title').textContent=(tipo==='hub'?'➕ Adicionar Lead HUB':'➕ Adicionar Lead Mentoria');
  document.getElementById('bj-modal-sub').textContent=(tipo==='hub'?'Parceiro para o HUB':'Lead prospectado para Mentoria');
  var btn=document.getElementById('bj-modal-tipo');
  btn.style.background=tipo==='hub'?'linear-gradient(135deg,#EA580C,#FB923C)':'linear-gradient(135deg,#2563EB,#60A5FA)';
  ['bj-inp-nome','bj-inp-insta','bj-inp-obs'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('bj-inp-plat').value='';
  document.getElementById('bj-inp-class').value='Pré-qualificado';
  /* Plataforma só aparece no modal HUB */
  var pf=document.getElementById('bj-plat-field');
  if(pf)pf.style.display=tipo==='hub'?'block':'none';
  m.style.display='flex';
  setTimeout(function(){var el=document.getElementById('bj-inp-nome');if(el)el.focus();},120);
}
function bjCloseModal(){
  var m=document.getElementById('bj-modal');
  if(m)m.style.display='none';
}
async function bjSaveLead(){
  var nome=document.getElementById('bj-inp-nome').value.trim();
  var insta=document.getElementById('bj-inp-insta').value.trim().replace(/^@/,'');
  var plat=document.getElementById('bj-inp-plat').value;
  var cls=document.getElementById('bj-inp-class').value;
  var obs=document.getElementById('bj-inp-obs').value.trim();
  if(!nome){alert('Preencha o nome do lead.');return;}
  var btn=document.getElementById('bj-modal-tipo');
  if(btn){btn.textContent='⏳ Salvando...';btn.disabled=true;}
  try{
    await bjInsert({tipo:_bjModal_tipo,nome:nome,instagram:insta,plataforma:plat,obs:obs,classificacao:cls});
    bjCloseModal();
    await renderBeijamim();
  }catch(e){alert('Erro ao salvar: '+e.message);}
  finally{if(btn){btn.textContent='💾 Salvar Lead';btn.disabled=false;}}
}

/* ── CLASSIFICAÇÃO INLINE ── */
async function bjSetClass(id,cls){
  try{
    await bjPatch(id,{classificacao:cls});
    await renderBeijamim();
  }catch(e){console.error('bjSetClass:',e);}
}

/* ── OBSERVAÇÃO INLINE (debounce 1s) ── */
var _bjObsTimer={};
function bjSetObs(id,val){
  clearTimeout(_bjObsTimer[id]);
  _bjObsTimer[id]=setTimeout(async function(){
    try{ await bjPatch(id,{obs:val}); }catch(e){ console.error('bjSetObs:',e); }
  },1000);
}

/* ── REMOVER LEAD ── */
async function bjDeleteLead(id){
  if(!confirm('Remover este lead?'))return;
  try{
    await bjDelete(id);
    await renderBeijamim();
  }catch(e){alert('Erro ao remover: '+e.message);}
}

/* ── BADGE CLASSIFICAÇÃO ── */
function bjBadge(cls,id){
  var opts=['Qualificado','Pré-qualificado','Desqualificado'];
  var colors={Qualificado:'#22C55E','Pré-qualificado':'#EAB308',Desqualificado:'#EF4444'};
  var emoji={Qualificado:'✅','Pré-qualificado':'⭐',Desqualificado:'🚫'};
  var btns=opts.map(function(o){
    var active=o===cls;
    var bg=active?colors[o]:'transparent';
    var border=active?colors[o]:'var(--brd2)';
    var color=active?'#fff':'var(--sub)';
    var fw=active?'700':'500';
    return '<button onclick="bjSetClass(\''+id+'\',\''+o+'\')" style="background:'+bg+';border:1px solid '+border+';color:'+color+';border-radius:7px;padding:3px 8px;font-size:10px;font-weight:'+fw+';cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;white-space:nowrap;">'+emoji[o]+' '+o+'</button>';
  }).join('');
  return '<div style="display:flex;flex-direction:column;gap:4px;">'+btns+'</div>';
}

/* ── FILTRO DE PERÍODO ── */
var _bjPeriodo='todos';
var _bjDataDe='';
var _bjDataAte='';
function bjSelPeriod(btn,p){
  document.querySelectorAll('.bj-pb').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
  _bjPeriodo=p;
  var cr=document.getElementById('bj-custom-row');
  if(cr)cr.style.display=p==='custom'?'flex':'none';
  var lbl=document.getElementById('bj-period-label');
  var labels={todos:'Todos os registros',hoje:'Hoje',7:'Últimos 7 dias',30:'Últimos 30 dias',mes:'Mês atual',custom:'Período personalizado'};
  if(lbl)lbl.textContent=labels[p]||p;
  if(p!=='custom')renderBeijamim();
}
function bjApplyCustom(){
  _bjDataDe=document.getElementById('bj-df').value;
  _bjDataAte=document.getElementById('bj-dt').value;
  renderBeijamim();
}
function bjFilterByDate(leads){
  if(_bjPeriodo==='todos')return leads;
  var now=new Date();
  var ini,fim;
  var pad=function(n){return n<10?'0'+n:n;};
  var today=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
  if(_bjPeriodo==='hoje'){
    ini=today+'T00:00:00'; fim=today+'T23:59:59';
  } else if(_bjPeriodo==='7'){
    var d7=new Date(now);d7.setDate(d7.getDate()-6);
    ini=d7.getFullYear()+'-'+pad(d7.getMonth()+1)+'-'+pad(d7.getDate())+'T00:00:00';
    fim=today+'T23:59:59';
  } else if(_bjPeriodo==='30'){
    var d30=new Date(now);d30.setDate(d30.getDate()-29);
    ini=d30.getFullYear()+'-'+pad(d30.getMonth()+1)+'-'+pad(d30.getDate())+'T00:00:00';
    fim=today+'T23:59:59';
  } else if(_bjPeriodo==='mes'){
    ini=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-01T00:00:00';
    fim=today+'T23:59:59';
  } else if(_bjPeriodo==='custom'){
    ini=_bjDataDe?_bjDataDe+'T00:00:00':null;
    fim=_bjDataAte?_bjDataAte+'T23:59:59':null;
  }
  return leads.filter(function(l){
    if(!l.criado)return true;
    var d=l.criado.slice(0,19);
    if(ini&&d<ini)return false;
    if(fim&&d>fim)return false;
    return true;
  });
}

/* ── HELPERS ── */
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function bjFormatDate(iso){
  if(!iso)return '—';
  var d=new Date(iso);
  var pad=function(n){return n<10?'0'+n:n;};
  return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2);
}
function bjInstaLink(ig){
  if(!ig)return '<span style="color:var(--dim);">—</span>';
  return '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+igLink(ig)+'</div>';
}
function bjPlatBadge(plat){
  var c={Hotmart:'#FF6B35',Kiwify:'#8B5CF6',Eduzz:'#3B82F6',Herospark:'#F59E0B',Hubla:'#10B981',Monetizze:'#EF4444',Braip:'#6366F1',Outro:'#6B7280'};
  var pc=c[plat]||'#6B7280';
  return plat?'<span style="display:inline-block;background:'+pc+'22;color:'+pc+';border:1px solid '+pc+'55;border-radius:5px;padding:2px 6px;font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">'+escHtml(plat)+'</span>':'<span style="color:var(--dim);">—</span>';
}
/* Observação compacta com botão Salvar */
function bjObsTd(id,val){
  return '<div style="position:relative;">'
    +'<textarea id="bj_obs_'+id+'" style="width:100%;background:var(--s2);border:1px solid var(--brd2);border-radius:7px;padding:6px 8px 22px 8px;color:var(--txt);font-size:11px;resize:none;font-family:\'Plus Jakarta Sans\',sans-serif;outline:none;height:52px;box-sizing:border-box;transition:border-color .15s;" placeholder="Observação..." onfocus="this.style.borderColor=\'var(--mn)\'" onblur="this.style.borderColor=\'var(--brd2)\'">'+escHtml(val||'')+'</textarea>'
    +'<button id="bj_obs_btn_'+id+'" onclick="bjSaveObs(\''+id+'\')" style="position:absolute;bottom:5px;right:6px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#22C55E;border-radius:5px;padding:1px 8px;font-size:9px;font-weight:700;cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;letter-spacing:.3px;transition:all .15s;" onmouseover="this.style.background=\'rgba(34,197,94,.22)\'" onmouseout="this.style.background=\'rgba(34,197,94,.12)\'">💾 salvar</button>'
    +'</div>';
}
async function bjSaveObs(id){
  var ta=document.getElementById('bj_obs_'+id);
  var btn=document.getElementById('bj_obs_btn_'+id);
  if(!ta||!btn)return;
  btn.textContent='⏳ Salvando...';btn.disabled=true;
  try{
    await bjPatch(id,{obs:ta.value});
    btn.textContent='✅ Salvo!';btn.style.color='#22C55E';btn.style.borderColor='rgba(34,197,94,.3)';
    setTimeout(function(){btn.textContent='💾 Salvar';btn.style.color='';btn.style.borderColor='';btn.disabled=false;},2000);
  }catch(e){
    btn.textContent='❌ Erro';btn.style.color='#EF4444';
    setTimeout(function(){btn.textContent='💾 Salvar';btn.style.color='';btn.disabled=false;},2000);
  }
}
/* Nome com ellipsis fixo */
function bjNomeTd(nome){
  return '<td style="overflow:hidden;" title="'+escHtml(nome)+'"><div style="font-size:12px;font-weight:600;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escHtml(nome)+'</div></td>';
}
function bjDateTd(iso){
  return '<td style="font-size:11px;color:var(--sub);white-space:nowrap;vertical-align:middle;">'+bjFormatDate(iso)+'</td>';
}
function bjDelBtn(id){return '<button onclick="bjDeleteLead(\''+id+'\')" title="Remover" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#EF4444;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;margin:0 auto;">✕</button>';}

var _bjTdOvf='style="overflow:hidden;vertical-align:middle;"';
/* ── ROWS ── */
/* HUB: Data | Nome | Instagram | Plataforma | Obs | Classificação | Del = 7 colunas */
function bjRowHub(lead){
  return '<tr>'+bjDateTd(lead.criado)+bjNomeTd(lead.nome)
    +'<td '+_bjTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td '+_bjTdOvf+'>'+bjPlatBadge(lead.plataforma)+'</td>'
    +'<td style="vertical-align:middle;">'+bjObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+bjBadge(lead.classificacao,lead.id)+'</td>'
    +'<td style="text-align:center;vertical-align:middle;">'+bjDelBtn(lead.id)+'</td></tr>';
}
/* MENTORIA: Data | Nome | Instagram | Obs | Classificação | Del = 6 colunas */
function bjRowMn(lead){
  return '<tr>'+bjDateTd(lead.criado)+bjNomeTd(lead.nome)
    +'<td '+_bjTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;">'+bjObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+bjBadge(lead.classificacao,lead.id)+'</td>'
    +'<td style="text-align:center;vertical-align:middle;">'+bjDelBtn(lead.id)+'</td></tr>';
}
/* QUALIFICADOS HUB: Data | Nome | Instagram | Plataforma | Obs | Status = 6 colunas */
function bjRowQHub(lead){
  return '<tr>'+bjDateTd(lead.criado)+bjNomeTd(lead.nome)
    +'<td '+_bjTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td '+_bjTdOvf+'>'+bjPlatBadge(lead.plataforma)+'</td>'
    +'<td style="vertical-align:middle;">'+bjObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+mkStatusBadge(lead.status,lead.id,'bjSetStatus')+'</td></tr>';
}
/* QUALIFICADOS MENTORIA: Data | Nome | Instagram | Obs | Status = 5 colunas */
function bjRowQMn(lead){
  return '<tr>'+bjDateTd(lead.criado)+bjNomeTd(lead.nome)
    +'<td '+_bjTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;">'+bjObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+mkStatusBadge(lead.status,lead.id,'bjSetStatus')+'</td></tr>';
}

/* ── PIE CHART ── */
function bjDrawPie(qual,pre,desq){
  var canvas=document.getElementById('bj-pie');
  if(!canvas)return;
  if(_bjPieChart){_bjPieChart.destroy();_bjPieChart=null;}
  var total=qual+pre+desq;
  if(!total){
    var ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='var(--brd2)';
    ctx.beginPath();ctx.arc(80,80,70,0,Math.PI*2);ctx.fill();
    document.getElementById('bj-legend').innerHTML='<span style="color:var(--sub);font-size:11px;">Nenhum lead ainda</span>';
    return;
  }
  if(typeof Chart!=='undefined'){
    _bjPieChart=new Chart(canvas,{
      type:'doughnut',
      data:{
        labels:['Qualificados','Pré-qualificados','Desqualificados'],
        datasets:[{data:[qual,pre,desq],backgroundColor:['#22C55E','#EAB308','#EF4444'],borderWidth:2,borderColor:'var(--s1)',hoverOffset:6}]
      },
      options:{responsive:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var pct=total?Math.round(ctx.raw/total*100):0;return ' '+ctx.raw+' ('+pct+'%)';}}}}}
    });
    document.getElementById('bj-legend').innerHTML=
      '<div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;background:#22C55E;border-radius:3px;display:inline-block;flex-shrink:0;"></span><span style="color:var(--txt);font-weight:600;">Qualificados</span><span style="color:var(--sub);">'+qual+'</span></div>'+
      '<div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;background:#EAB308;border-radius:3px;display:inline-block;flex-shrink:0;"></span><span style="color:var(--txt);font-weight:600;">Pré-qualificados</span><span style="color:var(--sub);">'+pre+'</span></div>'+
      '<div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;background:#EF4444;border-radius:3px;display:inline-block;flex-shrink:0;"></span><span style="color:var(--txt);font-weight:600;">Desqualificados</span><span style="color:var(--sub);">'+desq+'</span></div>'+
      '<div style="border-top:1px solid var(--brd);margin-top:4px;padding-top:4px;color:var(--sub);font-size:11px;">Total: '+total+' leads</div>';
  }
}

/* ── EXPORT CSV ── */
async function bjExportCSV(tipo){
  try{
    var leads=(await bjFetch()).filter(function(l){return l.tipo===tipo;});
    if(!leads.length){alert('Nenhum lead para exportar.');return;}
    var header='Nome,Instagram,Plataforma,Classificação,Observação,Data\n';
    var rows=leads.map(function(l){
      return ['"'+l.nome+'"','@'+l.instagram,l.plataforma,l.classificacao,'"'+(l.obs||'')+'"',l.criado?l.criado.slice(0,10):''].join(',');
    }).join('\n');
    var blob=new Blob(['﻿'+header+rows],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download='prosp_'+tipo+'_beijamim.csv';a.click();
    URL.revokeObjectURL(url);
  }catch(e){alert('Erro ao exportar: '+e.message);}
}

/* ── RENDER PRINCIPAL (async — busca do Supabase) ── */
async function renderBeijamim(){
  /* Auto-refresh a cada 30s enquanto a aba estiver ativa */
  if(_bjRefreshTimer)clearInterval(_bjRefreshTimer);
  _bjRefreshTimer=setInterval(function(){
    if(document.getElementById('page-beijamim')&&
       document.getElementById('page-beijamim').style.display!=='none'){
      renderBeijamim();
    } else {
      clearInterval(_bjRefreshTimer);
    }
  },30000);

  /* Diagnóstico: mostrar loading visível */
  var _diagEl=document.getElementById('bj-diag');
  if(_diagEl)_diagEl.textContent='⏳ Carregando dados...';

  try{
    var allLeads=await bjFetch();
    var leads=bjFilterByDate(allLeads);
    var hub=leads.filter(function(l){return l.tipo==='hub';});
    var mn=leads.filter(function(l){return l.tipo==='mentoria';});
    var total=leads.length;
    var totalHub=hub.length;
    var totalMn=mn.length;
    var qual=leads.filter(function(l){return l.classificacao==='Qualificado';}).length;
    var pre=leads.filter(function(l){return l.classificacao==='Pré-qualificado';}).length;
    var desq=leads.filter(function(l){return l.classificacao==='Desqualificado';}).length;
    var qualHub=hub.filter(function(l){return l.classificacao==='Qualificado';}).length;
    var qualMn=mn.filter(function(l){return l.classificacao==='Qualificado';}).length;
    var reunioesBJ=leads.filter(function(l){return l.classificacao==='Qualificado'&&l.status==='Reunião Agendada';}).length;

    function setKpi(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
    setKpi('bj-total',total);
    setKpi('bj-hub-total',totalHub);
    setKpi('bj-mn-total',totalMn);
    setKpi('bj-qual',qual);
    setKpi('bj-reunioes',reunioesBJ);
    setKpi('bj-pts-hub',qualHub*20+' pts');
    setKpi('bj-pts-mn',qualMn*20+' pts');
    setKpi('bj-hub-count',totalHub+' leads');
    setKpi('bj-mn-count',totalMn+' leads');

    bjDrawPie(qual,pre,desq);

    /* Aeroportos */
    var hubTbody=document.getElementById('bj-hub-tbody');
    var mnTbody=document.getElementById('bj-mn-tbody');
    if(hubTbody) hubTbody.innerHTML=hub.length?hub.map(bjRowHub).join(''):'<tr class="er"><td colspan="7">Nenhum lead HUB no período selecionado.</td></tr>';
    if(mnTbody)  mnTbody.innerHTML=mn.length?mn.map(bjRowMn).join(''):'<tr class="er"><td colspan="6">Nenhum lead Mentoria no período selecionado.</td></tr>';

    /* Seções de qualificados */
    var qualHub=hub.filter(function(l){return l.classificacao==='Qualificado';});
    var qualMn=mn.filter(function(l){return l.classificacao==='Qualificado';});
    setKpi('bj-qhub-count',qualHub.length+' leads');
    setKpi('bj-qmn-count',qualMn.length+' leads');
    setKpi('bj-qhub-pts',qualHub.length*20+' pts');
    setKpi('bj-qmn-pts',qualMn.length*20+' pts');
    var qhubT=document.getElementById('bj-qhub-tbody');
    var qmnT=document.getElementById('bj-qmn-tbody');
    if(qhubT) qhubT.innerHTML=qualHub.length?qualHub.map(bjRowQHub).join(''):'<tr class="er"><td colspan="7">Nenhum lead HUB qualificado no período.</td></tr>';
    if(qmnT)  qmnT.innerHTML=qualMn.length?qualMn.map(bjRowQMn).join(''):'<tr class="er"><td colspan="6">Nenhum lead Mentoria qualificado no período.</td></tr>';
    /* Histórico de pontuações bônus */
    var bjBonus=[];
    try{bjBonus=await ponFetch('Beijamim');}catch(e){console.warn('ponFetch Beijamim:',e);}
    var bjBonusTotal=bjBonus.reduce(function(s,p){return s+(parseInt(p.pontos)||0);},0);
    setKpi('bj-pts-total',(qual*20+reunioesBJ*50+bjBonusTotal)+' pts');
    setKpi('bj-hist-count',bjBonus.length+' registro'+(bjBonus.length!==1?'s':''));
    setKpi('bj-bonus-pts',bjBonusTotal+' pts');
    /* Gráfico de pontos */
    var bjPtsSegs=[];
    if(qualHub.length*20>0)bjPtsSegs.push({label:'Leads HUB',value:qualHub.length*20,color:'#FB923C'});
    if(qualMn.length*20>0)bjPtsSegs.push({label:'Leads Mentoria',value:qualMn.length*20,color:'#60A5FA'});
    if(reunioesBJ*50>0)bjPtsSegs.push({label:'Reuniões Agendadas',value:reunioesBJ*50,color:'#10B981'});
    var bjBonusByAcao={};
    bjBonus.forEach(function(p){var k=p.acao||'Outros';bjBonusByAcao[k]=(bjBonusByAcao[k]||0)+(parseInt(p.pontos)||0);});
    var bjCi=3;
    Object.keys(bjBonusByAcao).forEach(function(acao){bjPtsSegs.push({label:acao,value:bjBonusByAcao[acao],color:_PTR_COLORS[bjCi%_PTR_COLORS.length]});bjCi++;});
    gamDrawPtsOn('bj-pts-pie','bj-pts-legend',bjPtsSegs);
    var bjHistTb=document.getElementById('bj-hist-tbody');
    if(bjHistTb){
      if(bjBonus.length){
        bjHistTb.innerHTML=bjBonus.map(function(p){
          var d=p.criado?p.criado.substring(0,10).split('-').reverse().join('/'):'—';
          return '<tr>'
            +'<td style="vertical-align:middle;font-size:11px;color:var(--sub);">'+d+'</td>'
            +'<td style="vertical-align:middle;font-weight:600;">'+escHtml(p.responsavel||'—')+'</td>'
            +'<td style="vertical-align:middle;">'+escHtml(p.acao||'—')+'</td>'
            +'<td style="vertical-align:middle;text-align:center;white-space:nowrap;"><span style="color:#F59E0B;font-size:13px;font-weight:800;">+'+(p.pontos||0)+'</span><span style="color:#F59E0B;font-size:10px;font-weight:600;margin-left:2px;">pts</span></td>'
            +'<td style="vertical-align:middle;text-align:center;"><button onclick="ponDeleteRecord(\''+p.id+'\',\'bj\')" title="Excluir" style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:6px;width:26px;height:26px;color:#EF4444;font-size:13px;cursor:pointer;line-height:1;padding:0;">✕</button></td>'
            +'</tr>';
        }).join('');
      }else{
        bjHistTb.innerHTML='<tr class="er"><td colspan="5">Nenhuma pontuação registrada ainda.</td></tr>';
      }
    }
    if(_diagEl)_diagEl.style.display='none';
  }catch(e){
    console.error('[BJ] ERRO em renderBeijamim:',e);
    if(_diagEl){_diagEl.style.background='rgba(239,68,68,.18)';_diagEl.style.color='#EF4444';_diagEl.textContent='❌ Erro: '+e.message;}
    var hubTbody=document.getElementById('bj-hub-tbody');
    if(hubTbody)hubTbody.innerHTML='<tr class="er"><td colspan="6">⚠️ Erro: '+e.message+'</td></tr>';
  }
}

/* Seed + render no primeiro acesso */
async function initBeijamim(){
  await bjSeedIfEmpty();
  await renderBeijamim();
}
