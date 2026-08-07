// tab-gamificacao.js — Leads Gamificação (Judá/Efraim/líder)
/* ════════════════════════════════════════════════════ */
/*  LEADS GAMIFICAÇÃO — JS (3 roles)                   */
/* ════════════════════════════════════════════════════ */
var GAM_TABLE='leads_gamificacao';
var _gamRefreshTimer=null;
var _gamPeriodo='todos';
var _gamDataDe='';
var _gamDataAte='';
var _gamRole='';    // 'gam_juda' | 'gam_efraim' | 'gam_lider' | 'admin'
var _gamEquipe=''; // 'Judá' | 'Efraim' | '' (líder/admin)

var GAM_COLORS={Judá:'#818CF8',Efraim:'#34D399'};
var GAM_DARK  ={Judá:'#6D28D9',Efraim:'#059669'};
var GAM_EMOJIS={Judá:'🟣',Efraim:'🟢'};
var GAM_RGBA  ={Judá:'109,40,217',Efraim:'5,150,105'};
var _gamModal_tipo='hub'; // 'hub' | 'mentoria'

var PON_TABLE='pontuacoes_gamificacao';
var ACOES=[
  {label:'Upgrade Starter Anual',pts:50},
  {label:'Upgrade Basic Anual',pts:100},
  {label:'Upgrade Pro Anual',pts:200},
  {label:'Vendas Starter',pts:100},
  {label:'Vendas Basic',pts:200},
  {label:'Vendas Pro',pts:400},
  {label:'Upgrade Basic Mensal',pts:50},
  {label:'Upgrade Pro Mensal',pts:100},
  {label:'Ativação de Carrinho',pts:50},
  {label:'Inadimplência 5k',pts:100},
  {label:'Renovação Basic',pts:100},
  {label:'Renovação Pro',pts:200},
  {label:'Social Selling',pts:50},
  {label:'SDR Reunião Fechada',pts:100},
  {label:'Recuperação de Inativos',pts:80},
  {label:'Implementações',pts:100},
  {label:'Contratações Rápidas',pts:100},
  {label:'Vendas Mini',pts:50}
];

/* ── SUPABASE HELPERS ── */
async function gamFetch(){return supaFetch(GAM_TABLE,'select=*&order=criado.asc');}
async function gamInsert(body){return supaInsert(GAM_TABLE,body);}
async function gamPatch(id,dados){return supaUpdate(GAM_TABLE,id,dados);}
async function gamDelete(id){
  await fetch(SUPA_URL+'/rest/v1/'+GAM_TABLE+'?id=eq.'+id,{
    method:'DELETE',headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Prefer':'return=minimal'}
  });
}

/* ── PONTUAÇÕES HELPERS ── */
async function ponFetch(equipe){
  var q='select=*&order=criado.desc';
  if(equipe)q+='&equipe=eq.'+encodeURIComponent(equipe);
  return supaFetch(PON_TABLE,q);
}
async function ponInsert(body){return supaInsert(PON_TABLE,body);}
async function ponDelete(id){
  await fetch(SUPA_URL+'/rest/v1/'+PON_TABLE+'?id=eq.'+id,{
    method:'DELETE',headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Prefer':'return=minimal'}
  });
}
async function ponDeleteRecord(id,ctx){
  if(!confirm('Excluir esta pontuação do histórico?'))return;
  try{
    await ponDelete(id);
    if(ctx==='bj')await renderBeijamim();
    else await renderGamTeam();
  }catch(e){alert('Erro ao excluir: '+(e&&e.message?e.message:String(e)));}
}

/* ── PONTUAÇÕES MODAL (compartilhado: Gamificação + Beijamim) ── */
var _ponEquipe=''; // contexto: 'Judá' | 'Efraim' | 'Beijamim'
function _openPonModal(equipe){
  _ponEquipe=equipe;
  var m=document.getElementById('gam-pon-modal');if(!m)return;
  var r=document.getElementById('gam-pon-resp');if(r)r.value='';
  var a=document.getElementById('gam-pon-acao');if(a)a.value='';
  var d=document.getElementById('gam-pon-pts-display');if(d)d.textContent='— pts';
  var btn=document.getElementById('gam-pon-save-btn');if(btn){btn.disabled=false;btn.textContent='💾 Salvar Pontuação';}
  // data padrão = hoje
  var dt=document.getElementById('gam-pon-data');
  if(dt){var t=new Date();var y=t.getFullYear();var mo=String(t.getMonth()+1).padStart(2,'0');var dy=String(t.getDate()).padStart(2,'0');dt.value=y+'-'+mo+'-'+dy;}
  // ocultar campos personalizados
  var cr=document.getElementById('gam-pon-custom-row');if(cr){cr.style.display='none';}
  var cl=document.getElementById('gam-pon-custom-label');if(cl)cl.value='';
  var cp=document.getElementById('gam-pon-custom-pts');if(cp)cp.value='';
  m.style.display='flex';
}
function gamOpenPonModal(){_openPonModal(_gamEquipe);}
function bjOpenPonModal(){_openPonModal('Beijamim');}
function gamClosePonModal(){
  var m=document.getElementById('gam-pon-modal');if(m)m.style.display='none';
}
function gamPonSelectAcao(sel){
  var cr=document.getElementById('gam-pon-custom-row');
  var d=document.getElementById('gam-pon-pts-display');
  if(sel.value==='custom'){
    if(cr)cr.style.display='flex';
    if(d)d.textContent='— pts';
    // atualiza pontos ao digitar no campo personalizado
    var cp=document.getElementById('gam-pon-custom-pts');
    if(cp)cp.oninput=function(){if(d)d.textContent=(this.value&&parseInt(this.value)>0)?parseInt(this.value)+' pts':'— pts';};
  }else{
    if(cr)cr.style.display='none';
    var idx=parseInt(sel.value);
    if(d)d.textContent=(!isNaN(idx)&&ACOES[idx])?ACOES[idx].pts+' pts':'— pts';
  }
}
async function gamSavePontuacao(){
  var resp=(document.getElementById('gam-pon-resp').value||'').trim();
  var acaoVal=document.getElementById('gam-pon-acao').value;
  var dataVal=(document.getElementById('gam-pon-data').value||'').trim();
  if(!resp){alert('Preencha o nome do responsável.');return;}
  if(!dataVal){alert('Preencha a data da ação.');return;}
  if(acaoVal===''||acaoVal===null||acaoVal===undefined){alert('Selecione uma ação.');return;}
  var acaoLabel,acaoPts;
  if(acaoVal==='custom'){
    acaoLabel=(document.getElementById('gam-pon-custom-label').value||'').trim();
    acaoPts=parseInt(document.getElementById('gam-pon-custom-pts').value||'0');
    if(!acaoLabel){alert('Preencha o nome da ação personalizada.');return;}
    if(!acaoPts||acaoPts<1){alert('Preencha a pontuação da ação personalizada.');return;}
  }else{
    var idx=parseInt(acaoVal);
    var acao=ACOES[idx];
    if(!acao){alert('Ação inválida.');return;}
    acaoLabel=acao.label;acaoPts=acao.pts;
  }
  var btn=document.getElementById('gam-pon-save-btn');
  if(btn){btn.disabled=true;btn.textContent='⏳ Salvando...';}
  try{
    // usa a data escolhida como criado (mantém hora atual)
    var t=new Date();var h=String(t.getHours()).padStart(2,'0');var mi=String(t.getMinutes()).padStart(2,'0');var s=String(t.getSeconds()).padStart(2,'0');
    var criadoISO=dataVal+'T'+h+':'+mi+':'+s;
    await ponInsert({equipe:_ponEquipe,responsavel:resp,acao:acaoLabel,pontos:acaoPts,criado:criadoISO});
    gamClosePonModal();
    if(_ponEquipe==='Beijamim'){await renderBeijamim();}
    else{await renderGamTeam();}
  }catch(e){
    alert('Erro ao salvar pontuação: '+(e&&e.message?e.message:String(e)));
    if(btn){btn.disabled=false;btn.textContent='💾 Salvar Pontuação';}
  }
}

/* ── FILTRO LÍDER (gaml) — espelha gamSelPeriod mas com IDs próprios ── */
function gamlSelPeriod(btn,p){
  document.querySelectorAll('.gaml-pb').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
  _gamPeriodo=p;
  var cr=document.getElementById('gaml-custom-row');
  if(cr)cr.style.display=p==='custom'?'flex':'none';
  var lbl=document.getElementById('gaml-period-label');
  var labels={todos:'Todos os registros',hoje:'Hoje',7:'Últimos 7 dias',30:'Últimos 30 dias',mes:'Mês atual',custom:'Período personalizado'};
  if(lbl)lbl.textContent=labels[p]||p;
  if(p!=='custom')renderGamificacao();
}
function gamlApplyCustom(){
  var df=document.getElementById('gaml-df'),dt=document.getElementById('gaml-dt');
  if(!df||!dt||!df.value||!dt.value){alert('Selecione as duas datas.');return;}
  _gamDataDe=df.value;_gamDataAte=dt.value;
  var lbl=document.getElementById('gaml-period-label');
  if(lbl)lbl.textContent=df.value+' → '+dt.value;
  renderGamificacao();
}

/* ── MODAL ── */
function gamOpenModal(tipo){
  tipo=tipo||'hub';
  _gamModal_tipo=tipo;
  var m=document.getElementById('gam-modal');if(!m)return;
  ['gam-inp-nome','gam-inp-insta','gam-inp-tel','gam-inp-obs'].forEach(function(i){var e=document.getElementById(i);if(e)e.value='';});
  var platSel=document.getElementById('gam-inp-plat');if(platSel)platSel.value='';
  document.getElementById('gam-inp-class').value='Pré-qualificado';
  // Plataforma field only for HUB
  var platField=document.getElementById('gam-plat-field');
  if(platField)platField.style.display=tipo==='hub'?'block':'none';
  // Button and title colors
  var c=GAM_COLORS[_gamEquipe]||'#818CF8';
  var cDark=GAM_DARK[_gamEquipe]||'#6D28D9';
  var isHub=tipo==='hub';
  var btnColor=isHub?'linear-gradient(135deg,'+cDark+','+c+')':'linear-gradient(135deg,#2563EB,#60A5FA)';
  var saveBtn=document.getElementById('gam-modal-save');
  if(saveBtn){saveBtn.style.background=btnColor;}
  var titleEl=document.getElementById('gam-modal-title');
  if(titleEl)titleEl.textContent=isHub?'✈️ Adicionar Lead HUB — '+(_gamEquipe||''):'🎓 Adicionar Lead Mentoria — '+(_gamEquipe||'');
  var subEl=document.getElementById('gam-modal-sub');
  if(subEl)subEl.textContent=isHub?'Parceiro/criador de conteúdo para o HUB':'Lead para o produto Mentoria';
  m.style.display='flex';
  setTimeout(function(){var e=document.getElementById('gam-inp-nome');if(e)e.focus();},120);
}
function gamCloseModal(){var m=document.getElementById('gam-modal');if(m)m.style.display='none';}
async function gamSaveLead(){
  var nome=document.getElementById('gam-inp-nome').value.trim();
  var insta=document.getElementById('gam-inp-insta').value.trim().replace(/^@/,'');
  var tel=document.getElementById('gam-inp-tel').value.trim();
  var cls=document.getElementById('gam-inp-class').value;
  var obs=document.getElementById('gam-inp-obs').value.trim();
  var plat=_gamModal_tipo==='hub'?(document.getElementById('gam-inp-plat')?document.getElementById('gam-inp-plat').value:''):'';
  if(!nome){alert('Preencha o nome do lead.');return;}
  var btn=document.getElementById('gam-modal-save');
  if(btn){btn.textContent='⏳ Salvando...';btn.disabled=true;}
  try{
    await gamInsert({nome:nome,instagram:insta,telefone:tel,equipe:_gamEquipe,classificacao:cls,obs:obs,tipo:_gamModal_tipo,plataforma:plat});
    gamCloseModal();await renderGamificacao();
  }catch(e){alert('Erro ao salvar: '+e.message);}
  finally{if(btn){btn.textContent='💾 Salvar Lead';btn.disabled=false;}}
}

/* ── CLASSIFICAÇÃO + DELETE ── */
async function gamSetClass(id,cls){
  try{await gamPatch(id,{classificacao:cls});await renderGamificacao();}
  catch(e){console.error('gamSetClass:',e);}
}
async function gamDeleteLead(id){
  if(!confirm('Remover este lead?'))return;
  try{await gamDelete(id);await renderGamificacao();}
  catch(e){alert('Erro ao remover: '+e.message);}
}

/* ── FILTRO DE PERÍODO ── */
function gamSelPeriod(btn,p){
  document.querySelectorAll('.gam-pb').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
  _gamPeriodo=p;
  var cr=document.getElementById('gam-custom-row');if(cr)cr.style.display=p==='custom'?'flex':'none';
  var lbl=document.getElementById('gam-period-label');
  var labels={todos:'Todos os registros',hoje:'Hoje',7:'Últimos 7 dias',30:'Últimos 30 dias',mes:'Mês atual',custom:'Período personalizado'};
  if(lbl)lbl.textContent=labels[p]||p;
  if(p!=='custom')renderGamificacao();
}
function gamApplyCustom(){
  _gamDataDe=document.getElementById('gam-df').value;
  _gamDataAte=document.getElementById('gam-dt').value;
  renderGamificacao();
}
function gamFilterByDate(leads){
  if(_gamPeriodo==='todos')return leads;
  var now=new Date(),ini,fim;
  var pad=function(n){return n<10?'0'+n:n;};
  var today=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
  if(_gamPeriodo==='hoje'){ini=today+'T00:00:00';fim=today+'T23:59:59';}
  else if(_gamPeriodo==='7'){var d7=new Date(now);d7.setDate(d7.getDate()-6);ini=d7.getFullYear()+'-'+pad(d7.getMonth()+1)+'-'+pad(d7.getDate())+'T00:00:00';fim=today+'T23:59:59';}
  else if(_gamPeriodo==='30'){var d30=new Date(now);d30.setDate(d30.getDate()-29);ini=d30.getFullYear()+'-'+pad(d30.getMonth()+1)+'-'+pad(d30.getDate())+'T00:00:00';fim=today+'T23:59:59';}
  else if(_gamPeriodo==='mes'){ini=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-01T00:00:00';fim=today+'T23:59:59';}
  else if(_gamPeriodo==='custom'){ini=_gamDataDe?_gamDataDe+'T00:00:00':null;fim=_gamDataAte?_gamDataAte+'T23:59:59':null;}
  return leads.filter(function(l){
    if(!l.criado)return true;
    var d=l.criado.slice(0,19);
    if(ini&&d<ini)return false;
    if(fim&&d>fim)return false;
    return true;
  });
}

/* ── CELL HELPERS ── */
function gamObsTd(id,val){
  return '<div style="position:relative;">'
    +'<textarea id="gam_obs_'+id+'" style="width:100%;background:var(--s2);border:1px solid var(--brd2);border-radius:7px;padding:6px 8px 22px 8px;color:var(--txt);font-size:11px;resize:none;font-family:\'Plus Jakarta Sans\',sans-serif;outline:none;height:52px;box-sizing:border-box;" placeholder="Observação...">'+escHtml(val||'')+'</textarea>'
    +'<button id="gam_obs_btn_'+id+'" onclick="gamSaveObs(\''+id+'\')" style="position:absolute;bottom:5px;right:6px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#22C55E;border-radius:5px;padding:1px 8px;font-size:9px;font-weight:700;cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;">💾 salvar</button>'
    +'</div>';
}
async function gamSaveObs(id){
  var ta=document.getElementById('gam_obs_'+id),btn=document.getElementById('gam_obs_btn_'+id);
  if(!ta||!btn)return;
  btn.textContent='⏳...';btn.disabled=true;
  try{await gamPatch(id,{obs:ta.value});btn.textContent='✅';setTimeout(function(){btn.textContent='💾 salvar';btn.disabled=false;},2000);}
  catch(e){btn.textContent='❌';setTimeout(function(){btn.textContent='💾 salvar';btn.disabled=false;},2000);}
}
function gamTelTd(id,val){
  var waLink='';
  if(val){var waN=val.replace(/\D/g,'');var waNum=waN.startsWith('55')?waN:'55'+waN;waLink='<a href="https://wa.me/'+waNum+'" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#25D366;font-size:10px;font-weight:700;text-decoration:none;margin-top:3px;">💬 Abrir WhatsApp</a>';}
  return '<div>'
    +'<div style="position:relative;">'
    +'<input id="gam_tel_'+id+'" type="text" value="'+escHtml(val||'')+'" placeholder="📞 adicionar" style="width:100%;background:var(--s2);border:1px solid var(--brd2);border-radius:6px;padding:5px 28px 5px 7px;color:var(--txt);font-size:11px;font-family:\'Plus Jakarta Sans\',sans-serif;outline:none;box-sizing:border-box;" onkeydown="if(event.key===\'Enter\')gamSaveTel(\''+id+'\')">'
    +'<button id="gam_tel_btn_'+id+'" onclick="gamSaveTel(\''+id+'\')" style="position:absolute;right:3px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--sub);font-size:13px;cursor:pointer;padding:2px 4px;" title="Salvar">💾</button>'
    +'</div>'
    +waLink
    +'</div>';
}
async function gamSaveTel(id){
  var inp=document.getElementById('gam_tel_'+id),btn=document.getElementById('gam_tel_btn_'+id);
  if(!inp||!btn)return;
  btn.textContent='⏳';btn.disabled=true;
  try{await gamPatch(id,{telefone:inp.value.trim()});btn.textContent='✅';setTimeout(function(){btn.textContent='💾';btn.disabled=false;},1500);}
  catch(e){btn.textContent='❌';setTimeout(function(){btn.textContent='💾';btn.disabled=false;},1500);}
}
function gamNomeTd(nome){
  return '<td style="overflow:hidden;" title="'+escHtml(nome)+'"><div style="font-size:12px;font-weight:600;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escHtml(nome)+'</div></td>';
}
function gamDateTd(iso){return '<td style="font-size:11px;color:var(--sub);white-space:nowrap;vertical-align:middle;">'+bjFormatDate(iso)+'</td>';}
var _gamTdOvf='style="overflow:hidden;vertical-align:middle;"';
function gamBadge(cls,id){
  var opts=['Qualificado','Pré-qualificado','Desqualificado'];
  var colors={Qualificado:'#22C55E','Pré-qualificado':'#EAB308',Desqualificado:'#EF4444'};
  var emoji={Qualificado:'✅','Pré-qualificado':'⭐',Desqualificado:'🚫'};
  return '<div style="display:flex;flex-direction:column;gap:4px;">'+opts.map(function(o){
    var a=o===cls;
    return '<button onclick="gamSetClass(\''+id+'\',\''+o+'\')" style="background:'+(a?colors[o]:'transparent')+';border:1px solid '+(a?colors[o]:'var(--brd2)')+';color:'+(a?'#fff':'var(--sub)')+';border-radius:7px;padding:3px 8px;font-size:10px;font-weight:'+(a?'700':'500')+';cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;white-space:nowrap;">'+emoji[o]+' '+o+'</button>';
  }).join('')+'</div>';
}

/* ── STATUS BADGE (Beirajamim + Gamificação) ── */
var _stC={'Reunião Agendada':{c:'#10B981',bg:'rgba(16,185,129,.18)',b:'rgba(16,185,129,.4)',i:'📅'},
          'Aguardando'      :{c:'#F59E0B',bg:'rgba(245,158,11,.18)',b:'rgba(245,158,11,.4)',i:'⏳'},
          'Perdido'         :{c:'#EF4444',bg:'rgba(239,68,68,.18)',b:'rgba(239,68,68,.4)', i:'❌'}};
function mkStatusBadge(status,id,fn){
  var cur=status||'Aguardando';
  var s=_stC[cur]||_stC['Aguardando'];
  var dd='std_'+id.replace(/-/g,'');
  var opts=['Reunião Agendada','Aguardando','Perdido'];
  return '<div class="st-dd">'
    +'<button onclick="var m=document.getElementById(\''+dd+'\');m.classList.toggle(\'open\')" '
    +'style="width:100%;background:'+s.bg+';border:1px solid '+s.b+';color:'+s.c+';border-radius:8px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:\'Plus Jakarta Sans\',sans-serif;letter-spacing:.3px;text-align:center;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;">'+s.i+' '+cur+' ▾</button>'
    +'<div id="'+dd+'" class="st-dd-menu">'
    +opts.map(function(o){
      var sm=_stC[o];var a=o===cur;
      return '<button onclick="'+fn+'(\''+id+'\',\''+o+'\');document.getElementById(\''+dd+'\').classList.remove(\'open\')" '
        +'style="display:block;width:100%;text-align:left;background:'+(a?sm.bg:'transparent')+';border:'+(a?'1px solid '+sm.b:'1px solid transparent')+';color:'+sm.c+';border-radius:7px;padding:6px 10px;font-size:11px;font-weight:'+(a?'700':'500')+';cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;white-space:nowrap;transition:background .1s;">'+sm.i+' '+o+'</button>';
    }).join('')
    +'</div></div>';
}
async function bjSetStatus(id,status){
  try{
    var r=await bjPatch(id,{status:status});
    renderBeijamim();
  }catch(e){
    console.error('bjSetStatus:',e);
    if(e&&e.message&&e.message.includes('does not exist')){
      alert('⚠️ Coluna "status" não existe na tabela.\nRode no Supabase SQL Editor:\nALTER TABLE prospeccoes_beijamim ADD COLUMN IF NOT EXISTS status text DEFAULT \'Aguardando\';');
    }
  }
}
async function gamSetStatus(id,status){
  try{
    await gamPatch(id,{status:status});
    await renderGamificacao();
  }catch(e){
    console.error('gamSetStatus:',e);
    if(e&&e.message&&e.message.includes('does not exist')){
      alert('⚠️ Coluna "status" não existe na tabela.\nRode no Supabase SQL Editor:\nALTER TABLE leads_gamificacao ADD COLUMN IF NOT EXISTS status text DEFAULT \'Aguardando\';');
    }
  }
}

/* ── LÍDER/ADMIN: funções que roteiam para a tabela correta ── */
async function liderSetClass(id,cls,source,equipe){
  try{
    if(source==='bj'){await bjPatch(id,{classificacao:cls});}
    else{await gamPatch(id,{classificacao:cls});}
    await renderGamLider();
  }catch(e){console.error('liderSetClass:',e);}
}
async function liderSetStatus(id,status,source){
  try{
    if(source==='bj'){await bjPatch(id,{status:status});}
    else{await gamPatch(id,{status:status});}
    await renderGamLider();
  }catch(e){console.error('liderSetStatus:',e);}
}
// Badge de classificação para o Líder — passa source e equipe codificados
function liderBadge(cls,id,source,equipe){
  var opts=['Qualificado','Pré-qualificado','Desqualificado'];
  var colors={Qualificado:'#22C55E','Pré-qualificado':'#EAB308',Desqualificado:'#EF4444'};
  var emoji={Qualificado:'✅','Pré-qualificado':'⭐',Desqualificado:'🚫'};
  var src=encodeURIComponent(source||'gam');
  var eq=encodeURIComponent(equipe||'');
  return '<div style="display:flex;flex-direction:column;gap:4px;">'+opts.map(function(o){
    var a=o===cls;
    return '<button onclick="liderSetClass(\''+id+'\',\''+o+'\',decodeURIComponent(\''+src+'\'),decodeURIComponent(\''+eq+'\'))" style="background:'+(a?colors[o]:'transparent')+';border:1px solid '+(a?colors[o]:'var(--brd2)')+';color:'+(a?'#fff':'var(--sub)')+';border-radius:7px;padding:3px 8px;font-size:10px;font-weight:'+(a?'700':'500')+';cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;white-space:nowrap;">'+emoji[o]+' '+o+'</button>';
  }).join('')+'</div>';
}
// Row aeroporto para Líder/Admin: Data|Equipe|Nome|Instagram|Plataforma|Tel|Obs|Class
function liderRowHub(lead){
  var src=lead._source||'gam';var eq=lead._equipe||'';
  var eqColors={'Judá':'#A78BFA','Efraim':'#10B981','Beijamim':'#FB923C'};
  var eqBadge='<span style="background:rgba(129,140,248,.12);color:'+(eqColors[eq]||'#818CF8')+';border:1px solid '+(eqColors[eq]||'#818CF8')+'55;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;white-space:nowrap;">'+escHtml(eq||'—')+'</span>';
  var platBadge=lead.plataforma?'<span style="background:rgba(99,102,241,.15);color:#818CF8;border:1px solid rgba(99,102,241,.3);border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600;white-space:nowrap;">'+escHtml(lead.plataforma)+'</span>':'<span style="color:var(--sub);font-size:10px;">—</span>';
  return '<tr>'+gamDateTd(lead.criado)
    +'<td style="vertical-align:middle;text-align:center;">'+eqBadge+'</td>'
    +gamNomeTd(lead.nome)
    +'<td '+_gamTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;text-align:center;">'+platBadge+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+liderBadge(lead.classificacao,lead.id,src,eq)+'</td>'
    +'</tr>';
}
// Row qualificados para Líder/Admin: Data|Equipe|Nome|Instagram|Plataforma|Tel|Obs|Status
function liderRowQHub(lead){
  var src=lead._source||'gam';var eq=lead._equipe||'';
  var eqColors={'Judá':'#A78BFA','Efraim':'#10B981','Beijamim':'#FB923C'};
  var eqBadge='<span style="background:rgba(129,140,248,.12);color:'+(eqColors[eq]||'#818CF8')+';border:1px solid '+(eqColors[eq]||'#818CF8')+'55;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;white-space:nowrap;">'+escHtml(eq||'—')+'</span>';
  var platBadge=lead.plataforma?'<span style="background:rgba(99,102,241,.15);color:#818CF8;border:1px solid rgba(99,102,241,.3);border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600;white-space:nowrap;">'+escHtml(lead.plataforma)+'</span>':'<span style="color:var(--sub);font-size:10px;">—</span>';
  var fnStatus='liderSetStatus';
  var dd='std_'+lead.id.replace(/-/g,'');
  var cur=lead.status||'Aguardando';
  var s=_stC[cur]||_stC['Aguardando'];
  var opts=['Reunião Agendada','Aguardando','Perdido'];
  var statusBadge='<div class="st-dd">'
    +'<button onclick="var m=document.getElementById(\''+dd+'\');m.classList.toggle(\'open\')" '
    +'style="width:100%;background:'+s.bg+';border:1px solid '+s.b+';color:'+s.c+';border-radius:8px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:\'Plus Jakarta Sans\',sans-serif;text-align:center;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;">'+s.i+' '+cur+' ▾</button>'
    +'<div id="'+dd+'" class="st-dd-menu">'
    +opts.map(function(o){var sm=_stC[o];var a=o===cur;
      return '<button onclick="liderSetStatus(\''+lead.id+'\',\''+o+'\',\''+src+'\');document.getElementById(\''+dd+'\').classList.remove(\'open\')" '
        +'style="display:block;width:100%;text-align:left;background:'+(a?sm.bg:'transparent')+';border:'+(a?'1px solid '+sm.b:'1px solid transparent')+';color:'+sm.c+';border-radius:7px;padding:6px 10px;font-size:11px;font-weight:'+(a?'700':'500')+';cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;white-space:nowrap;">'+sm.i+' '+o+'</button>';
    }).join('')+'</div></div>';
  return '<tr>'+gamDateTd(lead.criado)
    +'<td style="vertical-align:middle;text-align:center;">'+eqBadge+'</td>'
    +gamNomeTd(lead.nome)
    +'<td '+_gamTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;text-align:center;">'+platBadge+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+statusBadge+'</td>'
    +'</tr>';
}

/* ── ROW FUNÇÕES ── */
/* HUB: Data|Nome|Instagram|Plataforma|Telefone|Obs|Class|Del = 8 cols */
function gamRowHub(lead){
  var platBadge=lead.plataforma?'<span style="background:rgba(99,102,241,.15);color:#818CF8;border:1px solid rgba(99,102,241,.3);border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600;white-space:nowrap;">'+escHtml(lead.plataforma)+'</span>':'<span style="color:var(--sub);font-size:10px;">—</span>';
  return '<tr>'+gamDateTd(lead.criado)+gamNomeTd(lead.nome)
    +'<td '+_gamTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;text-align:center;">'+platBadge+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+gamBadge(lead.classificacao,lead.id)+'</td>'
    +'<td style="text-align:center;vertical-align:middle;"><button onclick="gamDeleteLead(\''+lead.id+'\')" title="Remover" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#EF4444;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;margin:0 auto;">✕</button></td>'
    +'</tr>';
}
/* MENTORIA: Data|Nome|Instagram|Telefone|Obs|Class|Del = 7 cols */
function gamRowMn(lead){
  return '<tr>'+gamDateTd(lead.criado)+gamNomeTd(lead.nome)
    +'<td '+_gamTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+gamBadge(lead.classificacao,lead.id)+'</td>'
    +'<td style="text-align:center;vertical-align:middle;"><button onclick="gamDeleteLead(\''+lead.id+'\')" title="Remover" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#EF4444;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;margin:0 auto;">✕</button></td>'
    +'</tr>';
}
/* QUAL HUB: Data|Nome|Instagram|Plataforma|Telefone|Obs|Status = 7 cols */
function gamRowQHub(lead){
  var platBadge=lead.plataforma?'<span style="background:rgba(99,102,241,.15);color:#818CF8;border:1px solid rgba(99,102,241,.3);border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600;white-space:nowrap;">'+escHtml(lead.plataforma)+'</span>':'<span style="color:var(--sub);font-size:10px;">—</span>';
  return '<tr>'+gamDateTd(lead.criado)+gamNomeTd(lead.nome)
    +'<td '+_gamTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;text-align:center;">'+platBadge+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+mkStatusBadge(lead.status,lead.id,'gamSetStatus')+'</td>'
    +'</tr>';
}
/* QUAL MENTORIA: Data|Nome|Instagram|Telefone|Obs|Status = 6 cols */
function gamRowQMn(lead){
  return '<tr>'+gamDateTd(lead.criado)+gamNomeTd(lead.nome)
    +'<td '+_gamTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+mkStatusBadge(lead.status,lead.id,'gamSetStatus')+'</td>'
    +'</tr>';
}
/* LÍDER HUB: Data|Nome|Instagram|Plataforma|Telefone|Obs|Class = 7 cols */
function gamRowLider(lead){
  var platBadge=lead.plataforma?'<span style="background:rgba(99,102,241,.15);color:#818CF8;border:1px solid rgba(99,102,241,.3);border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600;white-space:nowrap;">'+escHtml(lead.plataforma)+'</span>':'<span style="color:var(--sub);font-size:10px;">—</span>';
  return '<tr>'+gamDateTd(lead.criado)+gamNomeTd(lead.nome)
    +'<td '+_gamTdOvf+'>'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;text-align:center;">'+platBadge+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'<td style="vertical-align:middle;">'+gamBadge(lead.classificacao,lead.id)+'</td>'
    +'</tr>';
}

/* ── PIE CHART (genérico por canvasId) ── */
function gamDrawPieOn(canvasId,legendId,qual,pre,desq){
  var canvas=document.getElementById(canvasId);if(!canvas)return;
  if(canvas._gc){canvas._gc.destroy();canvas._gc=null;}
  var total=qual+pre+desq;
  var leg=document.getElementById(legendId);
  if(!total){
    var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='var(--brd2)';ctx.beginPath();ctx.arc(80,80,70,0,Math.PI*2);ctx.fill();
    if(leg)leg.innerHTML='<span style="color:var(--sub);font-size:11px;">Nenhum lead ainda</span>';
    return;
  }
  if(typeof Chart!=='undefined'){
    canvas._gc=new Chart(canvas,{
      type:'doughnut',
      data:{labels:['Qualificados','Pré-qualificados','Desqualificados'],
        datasets:[{data:[qual,pre,desq],backgroundColor:['#22C55E','#EAB308','#EF4444'],borderWidth:2,borderColor:'var(--s1)',hoverOffset:6}]},
      options:{responsive:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){var pct=total?Math.round(c.raw/total*100):0;return ' '+c.raw+' ('+pct+'%)';}}}}
      }
    });
    if(leg)leg.innerHTML=
      '<div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;background:#22C55E;border-radius:3px;display:inline-block;"></span><span style="color:var(--txt);font-weight:600;">Qualificados</span><span style="color:var(--sub);">'+qual+'</span></div>'+
      '<div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;background:#EAB308;border-radius:3px;display:inline-block;"></span><span style="color:var(--txt);font-weight:600;">Pré-qualificados</span><span style="color:var(--sub);">'+pre+'</span></div>'+
      '<div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;background:#EF4444;border-radius:3px;display:inline-block;"></span><span style="color:var(--txt);font-weight:600;">Desqualificados</span><span style="color:var(--sub);">'+desq+'</span></div>'+
      '<div style="border-top:1px solid var(--brd);margin-top:4px;padding-top:4px;color:var(--sub);font-size:11px;">Total: '+total+' leads</div>';
  }
}

/* ── PIE CHART DE PONTOS (segmentos livres) ── */
var _PTR_COLORS=['#818CF8','#60A5FA','#10B981','#F59E0B','#F87171','#A78BFA','#FBBF24','#4ADE80','#38BDF8','#FB923C','#E879F9','#2DD4BF','#FCA5A5','#C4B5FD','#6EE7B7','#FDE68A','#93C5FD','#D8B4FE','#86EFAC','#34D399'];
function gamDrawPtsOn(canvasId,legendId,segments){
  var canvas=document.getElementById(canvasId);if(!canvas)return;
  if(canvas._gc){canvas._gc.destroy();canvas._gc=null;}
  var total=segments.reduce(function(s,x){return s+x.value;},0);
  var leg=document.getElementById(legendId);
  if(!total){
    var ctx2=canvas.getContext('2d');ctx2.clearRect(0,0,canvas.width,canvas.height);
    ctx2.fillStyle='var(--brd2)';ctx2.beginPath();ctx2.arc(70,70,60,0,Math.PI*2);ctx2.fill();
    if(leg)leg.innerHTML='<span style="color:var(--sub);font-size:11px;">Nenhuma pontuação ainda</span>';
    return;
  }
  if(typeof Chart!=='undefined'){
    canvas._gc=new Chart(canvas,{
      type:'doughnut',
      data:{
        labels:segments.map(function(s){return s.label;}),
        datasets:[{data:segments.map(function(s){return s.value;}),backgroundColor:segments.map(function(s){return s.color;}),borderWidth:2,borderColor:'var(--s1)',hoverOffset:6}]
      },
      options:{responsive:false,cutout:'60%',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){var pct=total?Math.round(c.raw/total*100):0;return ' '+c.raw+' pts ('+pct+'%)';}}}}}
    });
    if(leg)leg.innerHTML=segments.map(function(s){
      var pct=total?Math.round(s.value/total*100):0;
      return '<div style="display:flex;align-items:center;gap:6px;">'
        +'<span style="width:9px;height:9px;background:'+s.color+';border-radius:2px;flex-shrink:0;display:inline-block;"></span>'
        +'<span style="color:var(--txt);font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+s.label+'</span>'
        +'<span style="color:var(--sub);font-weight:700;white-space:nowrap;">'+s.value+'pts</span>'
        +'<span style="color:var(--sub);font-size:9px;min-width:24px;text-align:right;">'+pct+'%</span>'
        +'</div>';
    }).join('')+'<div style="border-top:1px solid var(--brd);margin-top:5px;padding-top:4px;color:var(--sub);font-size:10px;font-weight:700;">Total: '+total+' pts</div>';
  }
}

/* ── EXPORT CSV ── */
async function gamExportCSV(tipo){
  try{
    var allLeads=await gamFetch();
    var leads=allLeads.filter(function(l){return l.equipe===_gamEquipe;});
    if(tipo)leads=leads.filter(function(l){return (l.tipo||'hub')===tipo;});
    if(!leads.length){alert('Nenhum lead para exportar.');return;}
    var header='Nome,Instagram,Telefone,Plataforma,Tipo,Classificação,Observação,Data\n';
    var rows=leads.map(function(l){return['"'+l.nome+'"','@'+(l.instagram||''),l.telefone||'',l.plataforma||'',l.tipo||'hub',l.classificacao,'"'+(l.obs||'')+'"',l.criado?l.criado.slice(0,10):''].join(',');}).join('\n');
    var blob=new Blob(['﻿'+header+rows],{type:'text/csv;charset=utf-8;'});
    var suffix=tipo?'_'+tipo:'';
    var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='leads_gam_'+(_gamEquipe||'geral').toLowerCase()+suffix+'.csv';a.click();URL.revokeObjectURL(url);
  }catch(e){alert('Erro ao exportar: '+e.message);}
}
async function gamExportCSVLider(){
  try{
    var leads=await gamFetch();
    if(!leads.length){alert('Nenhum lead para exportar.');return;}
    var header='Nome,Instagram,Telefone,Classificação,Observação,Data\n';
    var rows=leads.map(function(l){return['"'+l.nome+'"','@'+(l.instagram||''),l.telefone||'',l.classificacao,'"'+(l.obs||'')+'"',l.criado?l.criado.slice(0,10):''].join(',');}).join('\n');
    var blob=new Blob(['﻿'+header+rows],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='leads_gam_geral.csv';a.click();URL.revokeObjectURL(url);
  }catch(e){alert('Erro ao exportar: '+e.message);}
}

/* ── RENDER EQUIPE ── */
async function renderGamTeam(){
  var allLeads=await gamFetch();
  var leads=gamFilterByDate(allLeads).filter(function(l){return l.equipe===_gamEquipe;});
  // Split by tipo (fallback to 'hub' for older records without tipo column)
  var hubLeads=leads.filter(function(l){return (l.tipo||'hub')==='hub';});
  var mnLeads=leads.filter(function(l){return l.tipo==='mentoria';});
  var total=leads.length;
  var hubTotal=hubLeads.length;
  var mnTotal=mnLeads.length;
  var qual=leads.filter(function(l){return l.classificacao==='Qualificado';}).length;
  var reunioes=leads.filter(function(l){return l.classificacao==='Qualificado'&&l.status==='Reunião Agendada';}).length;
  var hubQual=hubLeads.filter(function(l){return l.classificacao==='Qualificado';}).length;
  var hubReunioes=hubLeads.filter(function(l){return l.classificacao==='Qualificado'&&l.status==='Reunião Agendada';}).length;
  var mnQual=mnLeads.filter(function(l){return l.classificacao==='Qualificado';}).length;
  var mnReunioes=mnLeads.filter(function(l){return l.classificacao==='Qualificado'&&l.status==='Reunião Agendada';}).length;
  var pre=leads.filter(function(l){return l.classificacao==='Pré-qualificado';}).length;
  var desq=leads.filter(function(l){return l.classificacao==='Desqualificado';}).length;
  // Fetch bonus pontuações
  var bonusList=[];
  try{bonusList=await ponFetch(_gamEquipe);}catch(e){console.warn('ponFetch:',e);}
  var bonusTotal=bonusList.reduce(function(s,p){return s+(parseInt(p.pontos)||0);},0);
  var ptsLeads=qual*20+reunioes*50;
  var ptsTotal=ptsLeads+bonusTotal;
  function sk(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
  // KPIs
  sk('gam-t-total',total);
  sk('gam-t-hub-total',hubTotal);
  sk('gam-t-mn-total',mnTotal);
  sk('gam-t-qual',qual);
  sk('gam-t-reunioes',reunioes);
  sk('gam-t-pts-total',ptsTotal+' pts');
  sk('gam-t-pts-hub',(hubQual*20+hubReunioes*50)+' pts');
  sk('gam-t-pts-mn',(mnQual*20+mnReunioes*50)+' pts');
  // Counts
  sk('gam-t-hub-count',hubTotal+' leads');
  sk('gam-t-mn-count',mnTotal+' leads');
  // Pie chart: qualifications
  gamDrawPieOn('gam-t-pie','gam-t-legend',qual,pre,desq);
  // Pie chart: points breakdown
  var ptsSegs=[];
  if(hubQual*20>0)ptsSegs.push({label:'Leads HUB',value:hubQual*20,color:_PTR_COLORS[0]});
  if(mnQual*20>0)ptsSegs.push({label:'Leads Mentoria',value:mnQual*20,color:_PTR_COLORS[1]});
  if(reunioes*50>0)ptsSegs.push({label:'Reuniões Agendadas',value:reunioes*50,color:_PTR_COLORS[2]});
  var bonusByAcao={};
  bonusList.forEach(function(p){var k=p.acao||'Outros';bonusByAcao[k]=(bonusByAcao[k]||0)+(parseInt(p.pontos)||0);});
  var ci=3;
  Object.keys(bonusByAcao).forEach(function(acao){ptsSegs.push({label:acao,value:bonusByAcao[acao],color:_PTR_COLORS[ci%_PTR_COLORS.length]});ci++;});
  gamDrawPtsOn('gam-t-pts-pie','gam-t-pts-legend',ptsSegs);
  // HUB table
  var hubTb=document.getElementById('gam-t-hub-tbody');
  if(hubTb)hubTb.innerHTML=hubLeads.length?hubLeads.map(gamRowHub).join(''):'<tr class="er"><td colspan="8">Nenhum lead HUB no período selecionado.</td></tr>';
  // Mentoria table
  var mnTb=document.getElementById('gam-t-mn-tbody');
  if(mnTb)mnTb.innerHTML=mnLeads.length?mnLeads.map(gamRowMn).join(''):'<tr class="er"><td colspan="7">Nenhum lead Mentoria no período selecionado.</td></tr>';
  // Qualificados HUB
  var qHub=hubLeads.filter(function(l){return l.classificacao==='Qualificado';});
  sk('gam-t-qhub-count',qHub.length+' leads');
  sk('gam-t-qhub-pts',qHub.length*20+' pts');
  var qHubTb=document.getElementById('gam-t-qhub-tbody');
  if(qHubTb)qHubTb.innerHTML=qHub.length?qHub.map(gamRowQHub).join(''):'<tr class="er"><td colspan="6">Nenhum lead HUB qualificado no período.</td></tr>';
  // Qualificados Mentoria
  var qMn=mnLeads.filter(function(l){return l.classificacao==='Qualificado';});
  sk('gam-t-qmn-count',qMn.length+' leads');
  sk('gam-t-qmn-pts',qMn.length*20+' pts');
  var qMnTb=document.getElementById('gam-t-qmn-tbody');
  if(qMnTb)qMnTb.innerHTML=qMn.length?qMn.map(gamRowQMn).join(''):'<tr class="er"><td colspan="5">Nenhum lead Mentoria qualificado no período.</td></tr>';
  // Histórico de pontos
  sk('gam-t-hist-count',bonusList.length+' registro'+(bonusList.length!==1?'s':''));
  sk('gam-t-bonus-pts',bonusTotal+' pts');
  var histTb=document.getElementById('gam-t-hist-tbody');
  if(histTb){
    if(bonusList.length){
      histTb.innerHTML=bonusList.map(function(p){
        var d=p.criado?p.criado.substring(0,10).split('-').reverse().join('/'):'—';
        return '<tr>'
          +'<td style="vertical-align:middle;font-size:11px;color:var(--sub);">'+d+'</td>'
          +'<td style="vertical-align:middle;font-weight:600;">'+escHtml(p.responsavel||'—')+'</td>'
          +'<td style="vertical-align:middle;">'+escHtml(p.acao||'—')+'</td>'
          +'<td style="vertical-align:middle;text-align:center;white-space:nowrap;"><span style="color:#F59E0B;font-size:13px;font-weight:800;">+'+(p.pontos||0)+'</span><span style="color:#F59E0B;font-size:10px;font-weight:600;margin-left:2px;">pts</span></td>'
          +'<td style="vertical-align:middle;text-align:center;"><button onclick="ponDeleteRecord(\''+p.id+'\',\'gam\')" title="Excluir" style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:6px;width:26px;height:26px;color:#EF4444;font-size:13px;cursor:pointer;line-height:1;padding:0;">✕</button></td>'
          +'</tr>';
      }).join('');
    }else{
      histTb.innerHTML='<tr class="er"><td colspan="5">Nenhuma pontuação registrada ainda.</td></tr>';
    }
  }
}

/* ── ROW LÍDER QUALIFICADOS ── */
function gamRowTeamQual(lead){
  return '<tr>'+gamDateTd(lead.criado)+gamNomeTd(lead.nome)
    +'<td style="vertical-align:middle;">'+bjInstaLink(lead.instagram)+'</td>'
    +'<td style="vertical-align:middle;">'+gamTelTd(lead.id,lead.telefone)+'</td>'
    +'<td style="vertical-align:middle;">'+gamObsTd(lead.id,lead.obs)+'</td>'
    +'</tr>';
}

/* ── RENDER LÍDER ── */
async function renderGamLider(){
  // Busca leads das duas tabelas: leads_gamificacao (Judá/Efraim) + prospeccoes_beijamim
  var allGam=await gamFetch();
  var allBj=await bjFetch();
  // Tagging de origem e equipe
  allGam.forEach(function(l){l._source='gam';l._equipe=l.equipe||'Judá';});
  allBj.forEach(function(l){l._source='bj';l._equipe='Beijamim';});
  var allLeads=allGam.concat(allBj);
  // Líder vê apenas leads HUB (tipo='hub' ou sem tipo, que defaulta para hub)
  var leads=gamFilterByDate(allLeads).filter(function(l){return (l.tipo||'hub')==='hub';});
  var total=leads.length;
  var qual=leads.filter(function(l){return l.classificacao==='Qualificado';}).length;
  var reunioes=leads.filter(function(l){return l.classificacao==='Qualificado'&&l.status==='Reunião Agendada';}).length;
  var pre=leads.filter(function(l){return l.classificacao==='Pré-qualificado';}).length;
  var desq=leads.filter(function(l){return l.classificacao==='Desqualificado';}).length;
  function sk(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
  sk('gaml-total',total);sk('gaml-qual',qual);sk('gaml-pre',pre);sk('gaml-desq',desq);
  sk('gaml-reunioes',reunioes);
  sk('gaml-count',total+' leads');
  gamDrawPieOn('gaml-pie','gaml-legend',qual,pre,desq);
  var tbody=document.getElementById('gaml-tbody');
  if(tbody)tbody.innerHTML=leads.length?leads.map(liderRowHub).join(''):'<tr class="er"><td colspan="8">Nenhum lead HUB no período selecionado.</td></tr>';
  var qLeads=leads.filter(function(l){return l.classificacao==='Qualificado';});
  sk('gaml-qcount',qLeads.length+' leads');
  var qtb=document.getElementById('gaml-qtbody');
  if(qtb)qtb.innerHTML=qLeads.length?qLeads.map(liderRowQHub).join(''):'<tr class="er"><td colspan="8">Nenhum lead HUB qualificado no período.</td></tr>';
}

/* ── RENDER PRINCIPAL ── */
async function renderGamificacao(){
  if(_gamRefreshTimer)clearInterval(_gamRefreshTimer);
  _gamRefreshTimer=setInterval(function(){
    if(document.getElementById('page-gamificacao')&&document.getElementById('page-gamificacao').style.display!=='none'){renderGamificacao();}
    else{clearInterval(_gamRefreshTimer);}
  },30000);
  try{
    var isTeam=(_gamRole==='gam_juda'||_gamRole==='gam_efraim');
    if(isTeam)await renderGamTeam();else await renderGamLider();
  }catch(e){console.error('renderGamificacao:',e);}
}

/* ── INIT (determina role + view + cores) ── */
async function initGamificacao(){
  _gamRole=sessionStorage.getItem('tutory_role')||'admin';
  _gamEquipe=_gamRole==='gam_juda'?'Judá':_gamRole==='gam_efraim'?'Efraim':'';
  var isTeam=(_gamRole==='gam_juda'||_gamRole==='gam_efraim');
  // Show/hide views
  var tv=document.getElementById('gam-view-team'),lv=document.getElementById('gam-view-lider');
  if(tv)tv.style.display=isTeam?'block':'none';
  if(lv)lv.style.display=isTeam?'none':'block';
  if(isTeam){
    var c=GAM_COLORS[_gamEquipe]||'#818CF8';
    var cDark=GAM_DARK[_gamEquipe]||'#6D28D9';
    var rgb=GAM_RGBA[_gamEquipe]||'109,40,217';
    var em=GAM_EMOJIS[_gamEquipe]||'';
    // Header texts
    var el;
    el=document.getElementById('gam-t-eyebrow');if(el){el.textContent='EQUIPE '+_gamEquipe.toUpperCase()+' · TUTORY GAMIFICAÇÃO';el.style.color=c;}
    el=document.getElementById('gam-t-title');if(el)el.textContent='Aeroporto de Prospecções — '+_gamEquipe;
    el=document.getElementById('gam-t-sub');if(el)el.textContent='Leads da equipe '+_gamEquipe+' · HUB & Mentoria · Qualifique e pontue cada lead ✈️';
    // Pie card border
    el=document.getElementById('gam-t-pie-card');if(el)el.style.borderLeftColor=c;
    // HUB airport card border + title
    el=document.getElementById('gam-t-hub-card');if(el)el.style.borderLeftColor=c;
    el=document.getElementById('gam-t-hub-title');if(el)el.style.color=c;
    // HUB add button (team color)
    el=document.getElementById('gam-t-addbtn-hub');if(el){el.style.background='linear-gradient(135deg,'+cDark+','+c+')';el.style.boxShadow='0 4px 14px '+c+'55';}
    // Qualificados HUB section
    el=document.getElementById('gam-t-qhub-section');if(el){el.style.borderLeftColor=c;el.style.borderColor='rgba('+rgb+',.25)';el.style.background='linear-gradient(135deg,rgba('+rgb+',.08),rgba('+rgb+',.03))';}
    el=document.getElementById('gam-t-qhub-badge');if(el)el.style.background=c;
    el=document.getElementById('gam-t-qhub-name');if(el){el.textContent=em+' HUB';el.style.color=c;}
    el=document.getElementById('gam-t-qhub-pts-box');if(el){el.style.background='rgba('+rgb+',.15)';el.style.borderColor='rgba('+rgb+',.3)';}
    el=document.getElementById('gam-t-qhub-pts');if(el)el.style.color=c;
    // Colors by class
    document.querySelectorAll('.gam-t-color').forEach(function(k){k.style.color=c;});
    document.querySelectorAll('.gam-t-kpi-color').forEach(function(k){k.style.borderTopColor=c;});
  }
  await renderGamificacao();
}
