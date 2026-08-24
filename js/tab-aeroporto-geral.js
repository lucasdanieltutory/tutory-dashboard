// tab-aeroporto-geral.js — Aeroporto de Leads e Visão Geral (+ atribuição, UF)
async function renderAeroporto(){
  if(cur!=='aeroporto')return;
  try{
    var rng=_apDateRange();
    // Supabase queries — mesma fonte da aba Mentoria
    var [leads,camps,leadsAllMonth]=await Promise.all([
      supaFetch('leads_mentoria','select=*&created_at=gte.'+rng.ini+'T00:00:00&created_at=lte.'+rng.fim+'T23:59:59&order=created_at.desc'),
      supaFetch('campanhas_mentoria','select=gasto&data=gte.'+rng.fim.slice(0,7)+'-01'+'&data=lte.'+rng.fim).catch(function(){return[];}), 
      supaFetch('leads_mentoria','select=id,created_at,classificacao_manual&created_at=gte.'+todayOfMonth()+'T00:00:00&created_at=lte.'+rng.fim+'T23:59:59')
    ]);
    var totLeads=leads?leads.length:0;
    var _metaAp=[];try{_metaAp=await fetchMetaInsights(rng.fim.slice(0,7)+"-01",rng.fim);}catch(e){}var _msAp=metaSumByPlatform(_metaAp);var investMensal=_msAp&&_msAp.total>0?_msAp.mentoria:(camps?camps.reduce(function(a,r){return a+(+r.gasto||0);},0):0);
    var qualif=leads?leads.filter(function(r){return r.classificacao_manual==='Qualificado';}).length:0;
    var invest=camps?camps.reduce(function(a,r){return a+(+r.gasto||0);},0):0;
    var cpl=totLeads>0?invest/totLeads:0;
    var cplQ=qualif>0?invest/qualif:0;
    // Metas — contagens filtradas
    var now=new Date();
    var todayStr=now.toISOString().slice(0,10);
    var weekStart=new Date(now);weekStart.setDate(weekStart.getDate()-weekStart.getDay()||7);
    var weekStr=weekStart.toISOString().slice(0,10);
    var monthStr=todayStr.slice(0,7)+'-01';
    var leadsHoje=leads?leads.filter(function(r){return r.created_at&&r.created_at.slice(0,10)===todayStr;}).length:0;
    var leadsSemana=leads?leads.filter(function(r){return r.created_at&&r.created_at.slice(0,10)>=weekStr;}).length:0;
    var leadsMes=_apPeriodo==='mes'?totLeads:(leads?leads.filter(function(r){return r.created_at&&r.created_at.slice(0,10)>=monthStr;}).length:0);
    var _wDay=now.getDay();var _wOff=_wDay===0?-6:1-_wDay;var _wMon=new Date(now);_wMon.setDate(now.getDate()+_wOff);var _wMonStr=_wMon.toISOString().slice(0,10);var _leadsSemAll=leadsAllMonth?leadsAllMonth.filter(function(r){return r.created_at&&r.created_at.slice(0,10)>=_wMonStr;}):[];var leadsSemanaCount=_leadsSemAll.length;var qualifSemana=_leadsSemAll.filter(function(r){return r.classificacao_manual==='Qualificado';}).length;var qualifMes=leadsAllMonth?leadsAllMonth.filter(function(r){return r.classificacao_manual==='Qualificado';}).length:0;var preQMes=leadsAllMonth?leadsAllMonth.filter(function(r){return(r.classificacao_manual||'').indexOf('Pré')===0;}).length:0;var desqPMes=leadsAllMonth?leadsAllMonth.filter(function(r){return r.classificacao_manual==='Desqualificação prévia';}).length:0;var desqMes=leadsAllMonth?leadsAllMonth.filter(function(r){return r.classificacao_manual==='Desqualificado';}).length:0;var leadsMesTot=leadsAllMonth?leadsAllMonth.length:0;var qualifHoje=leadsAllMonth?leadsAllMonth.filter(function(r){return r.created_at&&r.created_at.slice(0,10)===todayStr&&r.classificacao_manual==='Qualificado';}).length:0;var cplMensal=leadsMesTot>0&&investMensal>0?investMensal/leadsMesTot:0;var cplQMensal=qualifMes>0&&investMensal>0?investMensal/qualifMes:0;var investMensalStr=investMensal>0?'R'+String.fromCharCode(36)+investMensal.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0}):'—';var cplMensalStr=cplMensal>0?'R'+String.fromCharCode(36)+cplMensal.toFixed(2).replace('.',','):'—';var cplQMensalStr=cplQMensal>0?'R'+String.fromCharCode(36)+cplQMensal.toFixed(2).replace('.',','):'—';

    // ── Metas ──
    _apMetas.semanal=Math.ceil(_apMetas.mensal/4);
    _apMetas.diaria=Math.ceil(_apMetas.mensal/30);
    var bD=_apGoalBar(qualifHoje,_apMetas.diaria);
    var bS=_apGoalBar(qualifSemana,_apMetas.semanal);
    var bM=_apGoalBar(qualifMes,_apMetas.mensal);
    var gd=document.getElementById('ap-goals');
    if(gd)gd.innerHTML=
      '<div class="ap-goal">'+
        '<div class="ap-goal-header"><span class="ap-goal-label">Meta Diária — Qualif.</span><span class="ap-goal-count">'+qualifHoje+' / '+_apMetas.diaria+'</span></div>'+
        '<div class="ap-goal-nums-row">'+
          '<div class="ap-goal-num-cell"><div class="ap-goal-big-val">'+leadsHoje+'</div><div class="ap-goal-big-lbl">LEADS DO DIA</div></div>'+
          '<div class="ap-goal-num-cell gn"><div class="ap-goal-big-val gn">'+qualifHoje+'</div><div class="ap-goal-big-lbl">QUALIF. HOJE</div></div>'+
        '</div>'+
        '<div class="ap-goal-track"><div class="ap-goal-fill '+bD.cls+'" style="width:'+bD.p+'%"></div></div>'+
        '<span class="ap-goal-pct">'+bD.p+'% concluído</span>'+
      '</div>'+
      '<div class="ap-goal">'+
        '<div class="ap-goal-header"><span class="ap-goal-label">Meta Semanal — Qualif.</span><span class="ap-goal-count">'+qualifSemana+' / '+_apMetas.semanal+'</span></div>'+
        '<div class="ap-goal-nums-row">'+
          '<div class="ap-goal-num-cell"><div class="ap-goal-big-val">'+leadsSemanaCount+'</div><div class="ap-goal-big-lbl">LEADS DA SEMANA</div></div>'+
          '<div class="ap-goal-num-cell gn"><div class="ap-goal-big-val gn">'+qualifSemana+'</div><div class="ap-goal-big-lbl">QUALIF. SEMANA</div></div>'+
        '</div>'+
        '<div class="ap-goal-track"><div class="ap-goal-fill '+bS.cls+'" style="width:'+bS.p+'%"></div></div>'+
        '<span class="ap-goal-pct">'+bS.p+'% concluído</span>'+
      '</div>'+
      '<div class="ap-goal ap-goal-featured">'+
        '<div class="ap-goal-header"><span class="ap-goal-label">Meta Mensal — Qualif.</span><span class="ap-goal-count">'+qualifMes+' / '+_apMetas.mensal+'</span></div>'+
        '<div class="ap-goal-nums-row">'+
          '<div class="ap-goal-num-cell"><div class="ap-goal-big-val">'+leadsMesTot+'</div><div class="ap-goal-big-lbl">LEADS DO MÊS</div></div>'+
          '<div class="ap-goal-num-cell gn"><div class="ap-goal-big-val gn">'+qualifMes+'</div><div class="ap-goal-big-lbl">QUALIFICADOS</div></div>'+
        '</div>'+
        '<div class="ap-goal-sub">'+
          '<span class="ap-goal-tag bl">💰 '+investMensalStr+'</span>'+
          '<span class="ap-goal-tag yw">CPL '+cplMensalStr+'</span>'+
          '<span class="ap-goal-tag or">CPL Q '+cplQMensalStr+'</span>'+
        '</div>'+
        '<div class="ap-goal-track"><div class="ap-goal-fill '+bM.cls+'" style="width:'+bM.p+'%"></div></div>'+
        '<span class="ap-goal-pct">'+bM.p+'% concluído</span>'+
      '</div>';
    // Detectar novos leads (animação)
    var newIds=new Set();
    if(leads)leads.forEach(function(r){if(!_apLeadIds.has(r.id))newIds.add(r.id);});
    if(leads)leads.forEach(function(r){_apLeadIds.add(r.id);});
    // Métricas
    // Tabela de leads
    var tb=document.getElementById('ap-tbody');
    if(tb){
      if(!leads||!leads.length){
        tb.innerHTML='<tr><td colspan="9" class="ap-empty">Nenhum lead encontrado no período</td></tr>';
      } else {
        tb.innerHTML=leads.map(function(r){
          var isNew=newIds.has(r.id);
          var dt=r.created_at?new Date(r.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
          return'<tr class="'+(isNew?'ap-row-new':'')+'">'+
            '<td>'+dt+'</td>'+
            '<td style="font-weight:600;color:#fff;">'+(r.contact_name||'—')+'</td>'+
            '<td style="color:#7AABFF;">'+(r.contact_instagram?r.contact_instagram:'—')+'</td>'+
            '<td><div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;">'+platChip(r.plataforma_origem||r.plataforma_ad)+canalChip(r.canal)+'</div></td>'+
            '<td>'+(r.cargo||r.cargo_lp||'—')+'</td>'+
            '<td>'+(r.faturamento||'—')+'</td>'+
            '<td style="color:var(--sub);font-size:11px;">'+(r.contact_email||'—')+'</td>'+
            '<td style="color:#4ADE80;font-size:11px;">'+(r.contact_phone||'—')+'</td>'+
            '<td>'+_apBadge(r.classificacao_manual)+'</td>'+
            '</tr>';
        }).join('');
      }
    }
    if(window._apChartHora){window._apChartHora.destroy();window._apChartHora=null;}if(window._apChartQ){window._apChartQ.destroy();window._apChartQ=null;}var ctxH=document.getElementById('ap-chart-hora');var hlEl=document.getElementById('ap-chart-hora-label');var _htEl=document.getElementById('ap-chart-hora-title');if(_htEl)_htEl.textContent='Leads por Dia — Mês Atual';var _allM=leadsAllMonth||[];var _dayMap={};var _dayQMap={};_allM.forEach(function(r){if(!r.created_at)return;var d=r.created_at.slice(0,10);_dayMap[d]=(_dayMap[d]||0)+1;if(r.classificacao_manual==='Qualificado')_dayQMap[d]=(_dayQMap[d]||0)+1;});var _mStr=rng.fim.slice(0,7)+'-01';var _mEnd=new Date(rng.fim);var _mDate=new Date(_mStr);var _wDay2=_mEnd.getDay();var _wMon2=new Date(_mEnd);_wMon2.setDate(_mEnd.getDate()-(_wDay2===0?6:_wDay2-1));var _dayLabels=[];var _dayData=[];var _dayQData=[];var _dayColors=[];var _dayBorderColors=[];while(_mDate<=_mEnd){var _dk=_mDate.toISOString().slice(0,10);var _dn=_mDate.getDate();var _inWeek=_mDate>=_wMon2;_dayLabels.push(_dn.toString());var _dv=_dayMap[_dk]||0;var _dqv=_dayQMap[_dk]||0;_dayData.push(_dv);_dayQData.push(_dqv);_dayColors.push(_inWeek?'rgba(129,140,248,0.75)':'rgba(59,130,246,0.55)');_dayBorderColors.push(_inWeek?'#818cf8':'#3b82f6');_mDate.setDate(_mDate.getDate()+1);}var _peakVal=Math.max.apply(null,_dayData);var _peakIdx=_dayData.indexOf(_peakVal);if(_peakVal>0){_dayColors[_peakIdx]='rgba(34,211,160,0.9)';_dayBorderColors[_peakIdx]='#22d3a0';}var _peakDay=_peakVal>0?_dayLabels[_peakIdx]+'/'+rng.fim.slice(5,7):'—';if(hlEl)hlEl.textContent=_peakVal>0?'Pico: dia '+_peakDay+' ('+_peakVal+' leads)':'';if(ctxH&&typeof Chart!=='undefined'){window._apChartHora=new Chart(ctxH,{type:'bar',data:{labels:_dayLabels,datasets:[{label:'Leads/dia',data:_dayData,backgroundColor:_dayColors,borderColor:_dayBorderColors,borderWidth:1,borderRadius:4,order:2},{label:'Qualificados',data:_dayQData,type:'line',borderColor:'#22d3a0',backgroundColor:'rgba(34,211,160,.1)',borderWidth:2,pointBackgroundColor:_dayQData.map(function(v){return v>0?'#22d3a0':'transparent';}),pointRadius:_dayQData.map(function(v){return v>0?4:0;}),pointHoverRadius:6,fill:true,tension:.35,order:1}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'top',align:'end',labels:{color:'rgba(255,255,255,.45)',font:{size:10},boxWidth:10,boxHeight:10,padding:14}},tooltip:{backgroundColor:'rgba(8,12,24,.97)',borderColor:'rgba(255,255,255,.08)',borderWidth:1,callbacks:{title:function(c){return 'Dia '+c[0].label+'/'+rng.fim.slice(5,7);},label:function(c){return' '+c.dataset.label+': '+c.raw;}}}},scales:{x:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:_dayLabels.map(function(_,i){return i===_peakIdx?'#22d3a0':_dayColors[i].indexOf('129,140')>-1?'rgba(200,200,255,.6)':'rgba(255,255,255,.22)';}),font:{size:9},maxRotation:0}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.25)',font:{size:9},stepSize:1},beginAtZero:true}}}});}  var _mLeads=leadsAllMonth||[];var _qM=_mLeads.filter(function(r){return r.classificacao_manual==='Qualificado';}).length;var _preM=_mLeads.filter(function(r){return(r.classificacao_manual||'').indexOf('Pré')===0;}).length;var _dpM=_mLeads.filter(function(r){return r.classificacao_manual==='Desqualificação prévia';}).length;var _dqM=_mLeads.filter(function(r){return r.classificacao_manual==='Desqualificado';}).length;var _pendM=_mLeads.length-_qM-_preM-_dpM-_dqM;if(_pendM<0)_pendM=0;var ctxQ=document.getElementById('ap-chart-qualif');if(ctxQ&&typeof Chart!=='undefined'&&_mLeads.length>0){window._apChartQ=new Chart(ctxQ,{type:'doughnut',data:{labels:['Qualificado','Pre-qualificado','Desq. Previa','Desqualificado','Pendente'],datasets:[{data:[_qM,_preM,_dpM,_dqM,_pendM],backgroundColor:['rgba(34,211,160,.85)','rgba(251,191,36,.85)','rgba(251,146,60,.85)','rgba(239,68,68,.8)','rgba(99,102,241,.7)'],borderColor:['#22d3a0','#fbbf24','#fb923c','#ef4444','#6366f1'],borderWidth:1,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(10,14,26,.95)',borderColor:'rgba(255,255,255,.1)',borderWidth:1,callbacks:{label:function(c){return' '+c.label+': '+c.raw}}}}}});}var _qlEl=document.getElementById('ap-qualif-legend');if(_qlEl){_qlEl.innerHTML='<div class="ap-ql-item"><span class="ap-ql-dot" style="background:#22d3a0"></span><span class="ap-ql-label">Qualificado</span><span class="ap-ql-val gn">'+_qM+'</span></div>'+'<div class="ap-ql-item"><span class="ap-ql-dot" style="background:#fbbf24"></span><span class="ap-ql-label">Pre-qualificado</span><span class="ap-ql-val yw">'+_preM+'</span></div>'+'<div class="ap-ql-item"><span class="ap-ql-dot" style="background:#fb923c"></span><span class="ap-ql-label">Desq. Previa</span><span class="ap-ql-val or">'+_dpM+'</span></div>'+'<div class="ap-ql-item"><span class="ap-ql-dot" style="background:#ef4444"></span><span class="ap-ql-label">Desqualificado</span><span class="ap-ql-val rd">'+_dqM+'</span></div>'+'<div class="ap-ql-item"><span class="ap-ql-dot" style="background:#6366f1"></span><span class="ap-ql-label">Pendente</span><span class="ap-ql-val">'+_pendM+'</span></div>';}  _apStartClock();
    // Auto-refresh a cada 30s
    if(_apInterval)clearInterval(_apInterval);
    _apInterval=setInterval(function(){if(cur==='aeroporto')renderAeroporto();else clearInterval(_apInterval);},30000);
  }catch(e){console.error('renderAeroporto:',e);}
}
function todayOfMonth(){return new Date().toISOString().slice(0,7)+'-01';}

// RENDER GERAL
async function renderGeral(){
  try{
    const {ini:gIni,fim:gFim}=getDates('geral');
    const [leads,recMn,recHb,recEx,diagMn,campMn,campHb,campEx,leadsHubReal]=await Promise.all([
      supaFetch('leads_mentoria',`select=score,classificacao,classificacao_manual&created_at=gte.${gIni}T00:00:00&created_at=lte.${gFim}T23:59:59&order=created_at.desc`),
      supaFetch('receita_mentoria',`select=valor&data=gte.${gIni}&data=lte.${gFim}`),
      supaFetch('receita_hub',`select=valor&data=gte.${gIni}&data=lte.${gFim}`),
      supaFetch('campanhas_experience',`select=vendas&data=gte.${gIni}&data=lte.${gFim}`),
      supaFetch('diagnosticos','select=resumo,plataforma&order=created_at.desc&limit=3'),
      supaFetch('campanhas_mentoria',`select=gasto&data=gte.${gIni}&data=lte.${gFim}`),
      supaFetch('campanhas_hub',`select=gasto&data=gte.${gIni}&data=lte.${gFim}`),
      supaFetch('campanhas_experience',`select=gasto&data=gte.${gIni}&data=lte.${gFim}`),
      // "Leads Hub" oficial = contagem real de cadastros em leads_hub (Slack/Make),
      // igual à Mentoria usa leads_mentoria — não mais o registro reportado pela
      // Meta nem a planilha manual de campanhas_hub.leads.
      supaFetch('leads_hub',`select=id&created_at=gte.${gIni}T00:00:00&created_at=lte.${gFim}T23:59:59`)
    ]);
    const totMn=recMn.reduce((a,r)=>a+(+r.valor||0),0);
    const totHb=recHb.reduce((a,r)=>a+(+r.valor||0),0);
    const totEx=recEx.reduce((a,r)=>a+(+r.vendas||0),0);
    const totR=totMn+totHb+totEx;
    // Meta API priority, fallback to Supabase
    const _metaG=await fetchMetaInsights(gIni,gFim);
    const _msG=metaSumByPlatform(_metaG);
    const totInvMn=_msG.total>0?_msG.mentoria:campMn.reduce((a,r)=>a+(+r.gasto||0),0);
    const totInvHb=_msG.total>0?_msG.hub:campHb.reduce((a,r)=>a+(+r.gasto||0),0);
    const totInvEx=_msG.total>0?_msG.experience:campEx.reduce((a,r)=>a+(+r.gasto||0),0);
    const totInv=totInvMn+totInvHb+totInvEx;
    const totRoi=totInv>0?(totR-totInv)/totInv*100:0;
    const hot=leads.filter(r=>r.classificacao_manual==='Qualificado').length;
    const warm=leads.filter(r=>r.classificacao_manual==='Pré-qualificado').length;
    const dqp=leads.filter(r=>r.classificacao_manual==='Desqualificação prévia').length;
    const cold=leads.filter(r=>r.classificacao_manual==='Desqualificado').length;
    if($('g-rec'))$('g-rec').textContent=fmt.brlK(totR);
    if($('g-inv'))$('g-inv').textContent=fmt.brlK(totInv);
    if($('g-inv-mn'))$('g-inv-mn').textContent=fmt.brlK(totInvMn);
    if($('g-inv-hb'))$('g-inv-hb').textContent=fmt.brlK(totInvHb);
    if($('g-inv-ex'))$('g-inv-ex').textContent=fmt.brlK(totInvEx);
    if($('g-roi'))$('g-roi').textContent=totInv>0?fmt.pct(totRoi):'—';
    // ── Sincroniza KPIs com histData: mesma fonte do relatório ──
    // Meses já fechados mantidos como estavam antes da mudança de critério de
    // "Leads Hub" — Ago/2026 em diante fica de fora, usa contagem real de leads_hub.
    const _sHD={'2025-11':{iMn:8907.13,iHb:3019.70,iEx:0,lMn:80,lHb:66,hot:null},'2025-12':{iMn:10711.03,iHb:3120.99,iEx:0,lMn:70,lHb:59,hot:null},'2026-01':{iMn:12060.48,iHb:4390.54,iEx:0,lMn:112,lHb:71,hot:39},'2026-02':{iMn:16935.56,iHb:5674.59,iEx:0,lMn:169,lHb:67,hot:19},'2026-03':{iMn:26394.82,iHb:8532.08,iEx:0,lMn:145,lHb:62,hot:17},'2026-04':{iMn:22896.85,iHb:6708.03,iEx:0,lMn:312,lHb:67,hot:46},'2026-05':{iMn:18815.66,iHb:8619.64,iEx:0,lMn:177,lHb:131,hot:52},'2026-06':{iMn:14284.24,iHb:10203.81,iEx:0,lMn:99,lHb:162,hot:26},'2026-07':{iMn:20409.05,iHb:9094.47,iEx:0,lMn:133,lHb:103,hot:48}};
    const _allHM=[{y:2025,m:11},{y:2025,m:12},{y:2026,m:1},{y:2026,m:2},{y:2026,m:3},{y:2026,m:4},{y:2026,m:5},{y:2026,m:6}];
    const _kI=gIni.slice(0,7),_kF=gFim.slice(0,7);
    const _mhPer=_allHM.filter(hm=>{const k=`${hm.y}-${String(hm.m).padStart(2,'0')}`;return k>=_kI&&k<=_kF;});
    const _dynMhG={};
    await Promise.all(_mhPer.filter(hm=>!_sHD[`${hm.y}-${String(hm.m).padStart(2,'0')}`]).map(async hm=>{
      const k=`${hm.y}-${String(hm.m).padStart(2,'0')}`;
      const _ins=await fetchMetaInsights(`${k}-01`,new Date(hm.y,hm.m,0).toISOString().slice(0,10));
      _dynMhG[k]=metaSumByPlatform(_ins);
    }));
    const _hIni='2025-11-01',_hFim=new Date().toISOString().slice(0,10);
    const [_hLeads,_hLeadsHb]=await Promise.all([
      supaFetch('leads_mentoria',`select=classificacao_manual,created_at&created_at=gte.${_hIni}T00:00:00&created_at=lte.${_hFim}T23:59:59`),
      supaFetch('leads_hub',`select=created_at&created_at=gte.${_hIni}T00:00:00&created_at=lte.${_hFim}T23:59:59`)
    ]);
    const _inMo=(d,y,m)=>{if(!d)return false;const dt=new Date(d.slice(0,10));return dt.getFullYear()===y&&dt.getMonth()+1===m;};
    let _hdLMn=0,_hdLHb=0,_hdHot=0,_hdIMn=0,_hdIHb=0,_hdIEx=0;
    for(const hm of _mhPer){
      const k=`${hm.y}-${String(hm.m).padStart(2,'0')}`;
      const sd=_sHD[k];
      if(sd){_hdLMn+=sd.lMn;_hdLHb+=sd.lHb;_hdHot+=(sd.hot||0);_hdIMn+=sd.iMn;_hdIHb+=sd.iHb;_hdIEx+=sd.iEx;continue;}
      const arr=_hLeads.filter(r=>_inMo(r.created_at,hm.y,hm.m));
      _hdLMn+=arr.length;
      _hdHot+=arr.filter(r=>r.classificacao_manual==='Qualificado').length;
      const _ms=_dynMhG[k]||{mentoria:0,hub:0,experience:0,total:0,leads_hub:0};
      _hdLHb+=_hLeadsHb.filter(r=>_inMo(r.created_at,hm.y,hm.m)).length;
      _hdIMn+=_ms.mentoria;_hdIHb+=_ms.hub;_hdIEx+=_ms.experience;
    }
    const _hdIT=_hdIMn+_hdIHb+_hdIEx;
    if($('g-leads'))$('g-leads').textContent=fmt.num(_hdLMn||leads.length);
    if($('g-hot'))$('g-hot').textContent=_hdHot||hot;
    // Fallback ao vivo (igual aos demais KPIs): se o histórico por mês der 0
    // (ex.: mês atual fora de _allHM), usa a contagem real de leads_hub do período.
    const _lhbVal=_hdLHb||leadsHubReal.length;
    if($('g-leads-hb'))$('g-leads-hb').textContent=_lhbVal?fmt.num(_lhbVal):'—';
    if($('g-inv'))$('g-inv').textContent=fmt.brlK(_hdIT||totInv);
    if($('g-inv-mn'))$('g-inv-mn').textContent=fmt.brlK(_hdIMn||totInvMn);
    if($('g-inv-hb'))$('g-inv-hb').textContent=fmt.brlK(_hdIHb||totInvHb);
    if($('g-inv-ex'))$('g-inv-ex').textContent=fmt.brlK(_hdIEx||totInvEx);
    // Gastos por plataforma: Google Ads (search/display) + YouTube (vídeo) + LinkedIn + Total Geral
    (async()=>{
      const _metaTot=_hdIT||totInv;
      let gAds=0,gYt=0;
      try{
        if(!getGadsToken()){await loadGadsRefreshFromSupabase();if(_gadsRefreshToken)await refreshGadsAccessToken();}
        const _gs=gadsSumByType(await fetchGAdsCampaigns(gIni,gFim));
        if(_gs){gAds=(_gs.mentoria.cost||0)+(_gs.hub.cost||0);gYt=(_gs.youtube.cost||0);}
      }catch(e){}
      const _li=0; // LinkedIn ainda sem integração de API — mostra "—"
      if($('g-inv-gads'))$('g-inv-gads').textContent=gAds>0?fmt.brlK(gAds):'—';
      if($('g-inv-yt'))$('g-inv-yt').textContent=gYt>0?fmt.brlK(gYt):'—';
      if($('g-inv-li'))$('g-inv-li').textContent=_li>0?fmt.brlK(_li):'—';
      if($('g-inv-total'))$('g-inv-total').textContent=fmt.brlK(_metaTot+gAds+gYt+_li);
    })();
    // Prospecções na Visão Geral
    supaFetch('prospeccoes','select=id').then(pr=>{
      if($('g-pr-total'))$('g-pr-total').textContent=pr?pr.length:'—';
    }).catch(()=>{});
    if($('g-ing'))$('g-ing').textContent=totEx||'—';
    if($('cc-mn'))$('cc-mn').textContent=fmt.brlK(totMn);
    if($('cc-hb'))$('cc-hb').textContent=fmt.brlK(totHb);
    if($('cc-hb-s'))$('cc-hb-s').textContent='Receita lançada';
    if($('cc-ex'))$('cc-ex').textContent=fmt.brlK(totEx);
    if($('cc-ex-s'))$('cc-ex-s').textContent=recEx.length+' vendas';
    if($('dl-hot'))$('dl-hot').textContent=hot;
    if($('dl-warm'))$('dl-warm').textContent=warm;
    if($('dl-cold'))$('dl-cold').textContent=cold;
    if($('dl-dq'))$('dl-dq').textContent=dqp;
    mkD('c-g-pie',['Qualificado','Pré-qualificado','Desq. prévia','Desqualificado'],[hot,warm,dqp,cold],['#22C55E','#EAB308','#F97316','#EF4444']);
    if($('g-diag-box')&&diagMn.length){
      const d=diagMn[0];
      $('g-diag-box').innerHTML=`<div style="font-size:13px;color:var(--sub);line-height:1.6">${d.resumo||'—'}</div><div style="font-size:11px;color:var(--dim);margin-top:8px">Plataforma: ${d.plataforma}</div>`;
    }
  }catch(e){console.error('renderGeral:',e);}
}

// RENDER MENTORIA
// ── Origem geográfica: deriva a UF pelo DDD do telefone ────────
const _UF_DDD={11:'SP',12:'SP',13:'SP',14:'SP',15:'SP',16:'SP',17:'SP',18:'SP',19:'SP',21:'RJ',22:'RJ',24:'RJ',27:'ES',28:'ES',31:'MG',32:'MG',33:'MG',34:'MG',35:'MG',37:'MG',38:'MG',41:'PR',42:'PR',43:'PR',44:'PR',45:'PR',46:'PR',47:'SC',48:'SC',49:'SC',51:'RS',53:'RS',54:'RS',55:'RS',61:'DF',62:'GO',64:'GO',63:'TO',65:'MT',66:'MT',67:'MS',68:'AC',69:'RO',71:'BA',73:'BA',74:'BA',75:'BA',77:'BA',79:'SE',81:'PE',87:'PE',82:'AL',83:'PB',84:'RN',85:'CE',88:'CE',86:'PI',89:'PI',91:'PA',93:'PA',94:'PA',92:'AM',97:'AM',95:'RR',96:'AP',98:'MA',99:'MA'};
function ufFromPhone(p){
  if(!p)return null;
  let n=String(p).replace(/\D/g,'');
  if(n.startsWith('55'))n=n.slice(2);
  return _UF_DDD[parseInt(n.slice(0,2))]||null;
}
function renderUFSection(leads){
  const tot={},qual={};let semUF=0;
  (leads||[]).forEach(r=>{
    const u=ufFromPhone(r.contact_phone);
    if(!u){semUF++;return;}
    tot[u]=(tot[u]||0)+1;
    if(r.classificacao_manual==='Qualificado')qual[u]=(qual[u]||0)+1;
  });
  const n=(leads||[]).length;
  const cobEl=$('mn-uf-cob');
  if(cobEl)cobEl.textContent=n?`${n-semUF}/${n} com DDD · ${Object.keys(tot).length} estados`:'—';
  const bars=(obj,color,modo)=>{
    const top=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if(!top.length)return '<div style="color:var(--sub);font-size:13px;padding:12px;">Sem dados no período</div>';
    const max=top[0][1]||1;
    return top.map(([uf,v],i)=>{
      const t=tot[uf]||0;
      const conv=t>0?Math.round((qual[uf]||0)/t*100):0;
      const extra=modo==='qual'?`${v} · ${conv}%`:`${v} · ${qual[uf]||0} qual.`;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
        <span style="width:16px;font-size:11px;color:var(--sub)">${i+1}</span>
        <span style="width:26px;font-size:12px;font-weight:700;">${uf}</span>
        <div style="flex:1;height:16px;background:rgba(255,255,255,.06);border-radius:5px;overflow:hidden;">
          <div style="height:100%;width:${Math.round(v/max*100)}%;background:${color};border-radius:5px;"></div>
        </div>
        <span style="width:80px;text-align:right;font-size:11px;color:var(--sub)">${extra}</span>
      </div>`;
    }).join('');
  };
  const q=$('mn-uf-qual');if(q)q.innerHTML=bars(qual,'#22C55E','qual');
  const t2=$('mn-uf-tot');if(t2)t2.innerHTML=bars(tot,'#6AAAFF','tot');
}

// ── Atribuição: plataforma real e anúncio de origem ────────────
function _escAtr(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderAtribuicao(leads,cobId,tableId){
  cobId=cobId||'mn-atr-cob';tableId=tableId||'mn-atr-table';
  const arr=leads||[];
  const porAd={};let comAd=0,comCamp=0,comSet=0;
  arr.forEach(r=>{
    const isQ=r.classificacao_manual==='Qualificado';
    const isD=r.classificacao_manual==='Desqualificado';
    const ad=(r.utm_content||'').trim();
    const camp=(r.utm_campaign||'').trim();
    const set=(r.utm_term||'').trim(); // utm_term = conjunto de anúncios (ad set)
    if(camp)comCamp++;
    if(set)comSet++;
    if(!ad)return; // agrupamento é por anúncio; sem anúncio não entra na tabela
    comAd++;
    if(!porAd[ad])porAd[ad]={campanha:camp,conjunto:set,tot:0,qual:0,desq:0};
    if(!porAd[ad].campanha&&camp)porAd[ad].campanha=camp;
    if(!porAd[ad].conjunto&&set)porAd[ad].conjunto=set;
    porAd[ad].tot++;
    if(isQ)porAd[ad].qual++;
    if(isD)porAd[ad].desq++;
  });
  const cob=$(cobId);
  if(cob)cob.textContent=arr.length?`${comAd}/${arr.length} anúncio · ${comCamp}/${arr.length} campanha · ${comSet}/${arr.length} conjunto`:'—';
  const tbody=$(tableId);
  if(!tbody)return;
  const linhas=Object.entries(porAd).sort((a,b)=>b[1].qual-a[1].qual||b[1].desq-a[1].desq||b[1].tot-a[1].tot);
  if(!linhas.length){
    tbody.innerHTML='<tr><td colspan="7" style="color:var(--sub);font-size:13px;padding:20px;text-align:center;line-height:1.7;">Ainda sem dados de origem.<br><span style="font-size:11px;color:var(--dim)">Configure as UTMs no Typebot e nos anúncios para popular esta seção.</span></td></tr>';
    return;
  }
  tbody.innerHTML=linhas.map(([ad,v])=>{
    const taxa=v.tot>0?Math.round(v.qual/v.tot*100):0;
    const taxaCor=taxa>=30?'#22C55E':taxa>=10?'#EAB308':'var(--sub)';
    return `<tr>
      <td style="font-size:12px;font-weight:700;color:#C084FC;white-space:normal;word-break:break-word;max-width:280px;">${_escAtr(ad)}</td>
      <td style="font-size:12px;font-weight:600;color:#38BDF8;white-space:normal;word-break:break-word;">${v.campanha?_escAtr(v.campanha):'—'}</td>
      <td style="font-size:12px;font-weight:600;color:#FBBF24;white-space:normal;word-break:break-word;">${v.conjunto?_escAtr(v.conjunto):'—'}</td>
      <td style="text-align:center;font-size:13px;font-weight:700;color:#22C55E;">${v.qual}</td>
      <td style="text-align:center;font-size:13px;font-weight:700;color:#EF4444;">${v.desq}</td>
      <td style="text-align:center;font-size:12px;color:var(--sub);">${v.tot}</td>
      <td style="text-align:center;font-size:12px;font-weight:700;color:${taxaCor};">${taxa}%</td>
    </tr>`;
  }).join('');
}

