// tab-criativos.js — banco de criativos
function bcrLoad(){
  try{
    _bcrData=JSON.parse(localStorage.getItem('tutory_criativos_v2')||'[]');
    if(!_bcrData.length&&!localStorage.getItem('tutory_criativos_seeded')){
      _bcrData=_bcrSeed.slice();
      localStorage.setItem('tutory_criativos_v2',JSON.stringify(_bcrData));
      localStorage.setItem('tutory_criativos_seeded','1');
    }
  }catch(e){_bcrData=[];}
}

function bcrSave(){
  localStorage.setItem('tutory_criativos_v2',JSON.stringify(_bcrData));
}

function bcrFiltro(btn,nicho){
  _bcrFiltro=nicho;
  document.querySelectorAll('#bcr-filtros .pb').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  bcrRender();
}

function bcrOpenModal(id){
  bcrLoad();
  var edit=id?_bcrData.find(r=>r.id===id):null;
  var m=document.getElementById('bcr-modal');
  if(!m)return;
  var ti=document.getElementById('bcr-modal-title');
  if(ti)ti.textContent=edit?'✏️ Editar Criativo':'🎬 Adicionar Criativo';
  document.getElementById('bcr-m-id').value=edit?edit.id:'';
  document.getElementById('bcr-m-link').value=edit?edit.link:'';
  document.getElementById('bcr-m-pessoa').value=edit?edit.pessoa:'';
  document.getElementById('bcr-m-nicho').value=edit?edit.nicho:'';
  document.getElementById('bcr-m-cenario').value=edit?edit.cenario:'';
  document.getElementById('bcr-m-ganho').value=edit?edit.ganho:'';
  document.getElementById('bcr-m-tempo').value=edit?edit.tempo:'';
  var platEl=document.getElementById('bcr-m-plat');
  if(platEl)platEl.value=edit?(edit.plat||'Instagram'):'Instagram';
  m.style.display='flex';
}

function bcrCloseModal(){
  var m=document.getElementById('bcr-modal');
  if(m)m.style.display='none';
}

function bcrSaveCriativo(){
  bcrLoad();
  var id=document.getElementById('bcr-m-id').value;
  var link=document.getElementById('bcr-m-link').value.trim();
  var pessoa=document.getElementById('bcr-m-pessoa').value;
  var nicho=document.getElementById('bcr-m-nicho').value;
  var cenario=document.getElementById('bcr-m-cenario').value.trim();
  var ganho=document.getElementById('bcr-m-ganho').value.trim();
  var tempo=document.getElementById('bcr-m-tempo').value.trim();
  var plat=(document.getElementById('bcr-m-plat')?.value)||'Instagram';
  if(!link){alert('Informe o link do anúncio.');return;}
  if(!pessoa){alert('Selecione quem gravou.');return;}
  if(!nicho){alert('Selecione o nicho.');return;}
  var hoje=new Date();
  var dataStr=hoje.toISOString().split('T')[0];
  if(id){
    var idx=_bcrData.findIndex(r=>r.id===id);
    if(idx>=0)_bcrData[idx]={..._bcrData[idx],link,pessoa,nicho,cenario,ganho,tempo,plat};
  }else{
    _bcrData.unshift({id:'cr_'+Date.now(),data:dataStr,link,pessoa,nicho,cenario,ganho,tempo,plat,analiseIA:'',criadoEm:Date.now()});
  }
  bcrSave();bcrCloseModal();bcrRender();
}

function bcrDelete(id){
  if(!confirm('Remover este criativo do banco?'))return;
  bcrLoad();
  _bcrData=_bcrData.filter(r=>r.id!==id);
  bcrSave();bcrRender();
}

function bcrNichoChip(nicho){
  var map={
    'Mentoria':'<span style="background:var(--mn-bg);border:1px solid var(--mn-b);color:var(--mn);padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Mentoria</span>',
    'Hub':'<span style="background:var(--hb-bg);border:1px solid var(--hb-b);color:var(--hb);padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Hub</span>',
    'Ecossistema':'<span style="background:var(--ex-bg);border:1px solid var(--ex-b);color:var(--ex);padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Ecossistema</span>',
    'Evento':'<span style="background:var(--gn-bg);border:1px solid var(--gn-b);color:var(--gn);padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Evento</span>'
  };
  return map[nicho]||'<span style="background:var(--s2);border:1px solid var(--brd2);color:var(--sub);padding:2px 8px;border-radius:6px;font-size:11px;">'+nicho+'</span>';
}

async function bcrAnalisarIA(id){
  bcrLoad();
  var r=_bcrData.find(x=>x.id===id);
  if(!r)return;
  var apiKey=localStorage.getItem('tutory_anthropic_key')||'';
  if(!apiKey){
    apiKey=prompt('Cole sua Anthropic API Key (salva só no seu navegador):');
    if(!apiKey)return;
    localStorage.setItem('tutory_anthropic_key',apiKey.trim());
    apiKey=apiKey.trim();
  }
  var btn=document.getElementById('bcr-ia-btn-'+id);
  if(btn){btn.innerHTML='⏳ Analisando...';btn.disabled=true;}
  var promptTxt='Você é especialista em tráfego pago e marketing de performance no Brasil.\n\nAnalise este anúncio:\n- Nicho: '+r.nicho+'\n- Quem gravou: '+r.pessoa+'\n- Cenário: '+(r.cenario||'Não informado')+'\n- Hook/Ganho: '+(r.ganho||'Não informado')+'\n- Duração: '+(r.tempo||'Não informado')+'\n- Plataforma: '+(r.plat||'Instagram')+'\n- Link: '+r.link+'\n\nForneça:\n✅ O que está BOM (2 pontos diretos)\n⚠️ O que MELHORAR (2 pontos diretos)\n🎯 Como melhorar nos próximos vídeos (1-2 ações)\n\nSeja direto. Máximo 130 palavras.';
  try{
    var resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:400,messages:[{role:'user',content:promptTxt}]})
    });
    if(!resp.ok){var er=await resp.json();throw new Error(er.error?.message||'Erro '+resp.status);}
    var data=await resp.json();
    var analise=data.content?.[0]?.text||'Sem resposta';
    var idx=_bcrData.findIndex(x=>x.id===id);
    if(idx>=0)_bcrData[idx].analiseIA=analise;
    bcrSave();bcrRender();
    bcrViewIA(id);
  }catch(e){
    alert('Erro na análise: '+e.message);
    if(btn){btn.innerHTML='🤖 Analisar';btn.disabled=false;}
  }
}

function bcrViewIA(id){
  bcrLoad();
  var r=_bcrData.find(x=>x.id===id);
  if(!r||!r.analiseIA)return;
  var m=document.getElementById('bcr-ia-view');
  if(!m)return;
  document.getElementById('bcr-ia-text').textContent=r.analiseIA;
  var lk=document.getElementById('bcr-ia-link');
  if(lk)lk.href=r.link;
  var rb=document.getElementById('bcr-ia-reanalisar');
  if(rb)rb.onclick=function(){document.getElementById('bcr-ia-view').style.display='none';bcrAnalisarIA(id);};
  m.style.display='flex';
}

function bcrRenderCharts(all){
  var hoje=new Date();
  var diasLabel=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var diaSemana=hoje.getDay();
  var inicioSemana=new Date(hoje);
  inicioSemana.setDate(hoje.getDate()-diaSemana);
  inicioSemana.setHours(0,0,0,0);
  var contagemSemana=Array(7).fill(0);
  all.forEach(r=>{
    if(!r.data)return;
    var d=new Date(r.data+'T12:00:00');
    var diff=Math.floor((d-inicioSemana)/86400000);
    if(diff>=0&&diff<7)contagemSemana[diff]++;
  });
  var maxS=Math.max.apply(null,contagemSemana.concat([1]));
  var cS=document.getElementById('bcr-chart-semana');
  if(cS){
    cS.innerHTML='<div style="display:flex;align-items:flex-end;gap:6px;height:90px;">'
      +contagemSemana.map(function(v,i){
        var pct=Math.round(v/maxS*100);
        var isHoje=i===diaSemana;
        return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">'
          +'<div style="font-size:10px;color:var(--sub);min-height:14px;">'+(v?v:'')+'</div>'
          +'<div style="width:100%;height:'+(Math.max(pct,4))+'%;background:'+(isHoje?'linear-gradient(135deg,#6366F1,#8B5CF6)':'var(--s2)')+';border-radius:3px 3px 0 0;min-height:4px;transition:height 0.3s;"></div>'
          +'<div style="font-size:10px;color:'+(isHoje?'var(--txt)':'var(--sub)')+';font-weight:'+(isHoje?700:400)+';margin-top:2px;">'+diasLabel[i]+'</div>'
          +'</div>';
      }).join('')
      +'</div>';
  }
  var nichos=['Mentoria','Hub','Ecossistema','Evento'];
  var coresNicho={'Mentoria':'var(--mn)','Hub':'var(--hb)','Ecossistema':'var(--ex)','Evento':'var(--gn)'};
  var mesAtual=hoje.toISOString().substring(0,7);
  var mesData=all.filter(function(r){return r.data&&r.data.startsWith(mesAtual);});
  var contagemMes={};
  nichos.forEach(function(n){contagemMes[n]=mesData.filter(function(r){return r.nicho===n;}).length;});
  var maxM=Math.max.apply(null,nichos.map(function(n){return contagemMes[n];}).concat([1]));
  var cM=document.getElementById('bcr-chart-mes');
  if(cM){
    cM.innerHTML='<div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">'
      +nichos.map(function(n){
        var v=contagemMes[n];
        var pct=Math.round(v/maxM*100);
        return'<div style="display:flex;align-items:center;gap:8px;">'
          +'<div style="width:78px;font-size:11px;color:var(--sub);text-align:right;">'+n+'</div>'
          +'<div style="flex:1;background:var(--s2);border-radius:4px;height:16px;overflow:hidden;">'
          +'<div style="width:'+Math.max(pct,2)+'%;height:100%;background:'+coresNicho[n]+';border-radius:4px;transition:width 0.4s;"></div>'
          +'</div>'
          +'<div style="width:18px;font-size:12px;color:var(--txt);font-weight:700;">'+v+'</div>'
          +'</div>';
      }).join('')
      +'</div>';
  }
}

function bcrRender(){
  bcrLoad();
  var q=(document.getElementById('bcr-search')?.value||'').toLowerCase();
  var rows=_bcrData.filter(function(r){
    if(_bcrFiltro&&r.nicho!==_bcrFiltro)return false;
    if(q&&!(r.link+r.pessoa+r.nicho+r.cenario+r.ganho).toLowerCase().includes(q))return false;
    return true;
  });
  var all=_bcrData;
  function el(id){return document.getElementById(id);}
  if(el('bcr-kpi-total'))el('bcr-kpi-total').textContent=all.length;
  if(el('bcr-kpi-mn'))el('bcr-kpi-mn').textContent=all.filter(function(r){return r.nicho==='Mentoria';}).length;
  if(el('bcr-kpi-hb'))el('bcr-kpi-hb').textContent=all.filter(function(r){return r.nicho==='Hub';}).length;
  if(el('bcr-kpi-eco'))el('bcr-kpi-eco').textContent=all.filter(function(r){return r.nicho==='Ecossistema';}).length;
  if(el('bcr-kpi-ev'))el('bcr-kpi-ev').textContent=all.filter(function(r){return r.nicho==='Evento';}).length;
  if(el('bcr-count'))el('bcr-count').textContent=rows.length+' criativo'+(rows.length!==1?'s':'');
  bcrRenderCharts(all);
  var tbody=el('bcr-tbody');
  if(!tbody)return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--sub);padding:32px;font-style:italic;">Nenhum criativo'+(q||_bcrFiltro?' para este filtro.':' cadastrado ainda.')+'</td></tr>';
    return;
  }
  var platIcons={'Instagram':'📸','Facebook':'📘','YouTube':'▶️','TikTok':'🎵'};
  tbody.innerHTML=rows.map(function(r,i){
    var rankBadge=i===0?'🥇':i===1?'🥈':i===2?'🥉':'<span style="color:var(--sub);font-weight:700;">'+(i+1)+'</span>';
    var temIA=r.analiseIA&&r.analiseIA.length>10;
    var iaBtnHtml=temIA
      ?'<button id="bcr-ia-btn-'+r.id+'" data-id="'+r.id+'" onclick="bcrViewIA(this.dataset.id)" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border:none;border-radius:6px;color:#fff;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;">✅ Ver análise</button>'
      :'<button id="bcr-ia-btn-'+r.id+'" data-id="'+r.id+'" onclick="bcrAnalisarIA(this.dataset.id)" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;background:var(--s2);border:1px solid var(--brd2);border-radius:6px;color:var(--sub);font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap;">🤖 Analisar</button>';
    var dataFmt=r.data?r.data.split('-').reverse().join('/'):'—';
    var platIcon=platIcons[r.plat||'Instagram']||'🎬';
    return'<tr>'
      +'<td style="text-align:center;font-size:18px;">'+rankBadge+'</td>'
      +'<td class="mo" style="font-size:11px;white-space:nowrap;">'+dataFmt+'</td>'
      +'<td><a href="'+r.link+'" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:var(--mn-bg);border:1px solid var(--mn-b);border-radius:6px;color:#6AAAFF;font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap;">'+platIcon+' Ver</a></td>'
      +'<td style="font-size:12px;font-weight:600;color:var(--txt);">'+(r.pessoa||'—')+'</td>'
      +'<td>'+bcrNichoChip(r.nicho)+'</td>'
      +'<td style="font-size:11px;color:var(--sub);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+(r.cenario||'')+'">'+(r.cenario||'—')+'</td>'
      +'<td style="font-size:11px;color:var(--txt);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+(r.ganho||'')+'">'+(r.ganho||'—')+'</td>'
      +'<td class="mo" style="font-size:11px;white-space:nowrap;">'+(r.tempo||'—')+'</td>'
      +'<td>'+iaBtnHtml+'</td>'
      +'<td><div style="display:flex;gap:4px;">'
        +'<button data-id="'+r.id+'" onclick="bcrOpenModal(this.dataset.id)" title="Editar" style="padding:5px 8px;background:var(--s2);border:1px solid var(--brd2);border-radius:6px;color:var(--sub);font-size:11px;cursor:pointer;">✏️</button>'
        +'<button data-id="'+r.id+'" onclick="bcrDelete(this.dataset.id)" title="Remover" style="padding:5px 8px;background:var(--s2);border:1px solid var(--brd2);border-radius:6px;color:#F87171;font-size:11px;cursor:pointer;">🗑️</button>'
      +'</div></td>'
      +'</tr>';
  }).join('');
}

function renderCriativos(){
  bcrRender();
}

// GOOGLE ADS API
// ═══════════════════════════════════════
const GADS_CUSTOMER_ID='4301688199'; // Conta de Anúncios Tutory (430-168-8199)
const GADS_LOGIN_CUSTOMER_ID='5041220639'; // MCC TUTORY MCC (504-122-0639)
const GADS_DEV_TOKEN='yfK8K1bqpXm-V9FrO8UX3Q';
let _gadsToken=localStorage.getItem('tutory_gads_token')||'';
let _gadsTokenExpiry=parseInt(localStorage.getItem('tutory_gads_token_expiry')||'0');
let _gadsRefreshToken=localStorage.getItem('tutory_gads_refresh_token')||'';
let _gadsCodeClient=null;
let _gadsRefreshTimer=null;
let _gadsCache={};

