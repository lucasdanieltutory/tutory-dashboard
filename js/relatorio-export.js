// relatorio-export.js — exportação de relatório PDF/CSV
async function exportarRelatorio(){
  // Abrir janela IMEDIATAMENTE (antes de qualquer await — exigência do browser)
  const w=window.open('','_blank');
  if(w)w.document.write('<html><body style="font-family:sans-serif;padding:40px;color:#333"><h2>⏳ Gerando relatório...</h2><p>Aguarde, buscando dados e gerando diagnóstico de IA.</p></body></html>');
  // Garantir chave (prompt síncrono)
  const _ckCheck=localStorage.getItem('tutory_claude_key');
  if(!_ckCheck){
    const _k=prompt('Cole sua Claude API Key (sk-ant-...):\nEla ficará salva permanentemente no navegador.','');
    if(_k)localStorage.setItem('tutory_claude_key',_k.trim());
  }
  const btn=document.querySelector('[onclick="exportarRelatorio()"]');
  if(btn){btn.textContent='⏳ Gerando...';btn.disabled=true;}
  try{
    const {ini,fim}=getDates(cur); // usa o período ativo do painel no momento do clique
    const _fp=s=>{const[,m,d]=s.split('-');return`${d}/${m}`;};
    const periodo=ini===fim?`${_fp(ini)} · ${ini.split('-')[0]}`:`${_fp(ini)} a ${_fp(fim)} · ${fim.split('-')[0]}`;
    const dataGeracao=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});

    // ── Fetch dados período atual ──
    const [leads,campMn,campHb,campEx,anMn,anHb,leadsHubTable,_histMensalRows]=await Promise.all([
      supaFetch('leads_mentoria',`select=*&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59`),
      supaFetch('campanhas_mentoria',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('campanhas_hub',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('campanhas_experience',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('anuncios_mentoria',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('anuncios_hub',`select=*&data=gte.${ini}&data=lte.${fim}`),
      supaFetch('leads_hub',`select=id&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59`),
      // Histórico de meses fechados — era hardcoded aqui (staticHistData) e
      // duplicado de novo em tab-aeroporto-geral.js. Agora 1 fonte só.
      supaFetch('historico_mensal','select=*').catch(()=>[]),
    ]);

    // ── Fetch histórico Nov/2025 → HOJE (sempre, independente do período) ──
    const histIni='2025-11-01';
    const histFim=new Date().toISOString().slice(0,10);
    const [hLeadsMn,hCampsMn,hCampsHb,hLeadsHb]=await Promise.all([
      supaFetch('leads_mentoria',`select=classificacao_manual,created_at&created_at=gte.${histIni}T00:00:00&created_at=lte.${histFim}T23:59:59`),
      supaFetch('campanhas_mentoria',`select=gasto,leads,data&data=gte.${histIni}&data=lte.${histFim}`),
      supaFetch('campanhas_hub',`select=gasto,data&data=gte.${histIni}&data=lte.${histFim}`),
      supaFetch('leads_hub',`select=classificacao_manual,created_at&created_at=gte.${histIni}T00:00:00&created_at=lte.${histFim}T23:59:59`),
    ]);

    // ── KPIs ──
    const brl=v=>'R$'+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    const num=v=>v.toLocaleString('pt-BR');
    // Investimento: Meta API em tempo real, fallback Supabase
    const _metaRel=await fetchMetaInsights(ini,fim);
    const _msRel=metaSumByPlatform(_metaRel);
    const invMn=_msRel.total>0?_msRel.mentoria:campMn.reduce((a,r)=>a+(+r.gasto||0),0);
    const invHb=_msRel.total>0?_msRel.hub:campHb.reduce((a,r)=>a+(+r.gasto||0),0);
    const invEx=_msRel.total>0?_msRel.experience:campEx.reduce((a,r)=>a+(+r.gasto||0),0);
    const invTotal=invMn+invHb+invEx;
    const leadsMn=leads.length;
    // Leads Hub = "Leads Cadastrados" de verdade — contagem real da tabela
    // leads_hub (Slack/Make), igual à Mentoria usa leads_mentoria.length.
    // Não usa mais contagem de registro reportada pela Meta nem campanhas_hub.leads
    // (planilha manual) — essas divergiam do que realmente caiu no banco.
    const leadsHb=leadsHubTable.length;
    const vendasEx=campEx.reduce((a,r)=>a+(+r.vendas||0),0);
    const qualMn=hLeadsMn.filter(r=>r.created_at&&r.created_at.slice(0,10)>=ini&&r.created_at.slice(0,10)<=fim&&r.classificacao_manual==='Qualificado').length;
    const cplMn=leadsMn>0?invMn/leadsMn:0;
    const cplHb=leadsHb>0?invHb/leadsHb:0;
    const custoEx=vendasEx>0?invEx/vendasEx:0;

    // Google Ads (via plataforma_ad + dados manuais por período)
    const gglLeads=leads.filter(r=>r.plataforma_ad==='google').length;
    const gglHot=leads.filter(r=>r.plataforma_ad==='google'&&r.classificacao_manual==='Qualificado').length;
    const gglManual={
      '2026-04':{inv:1663.38,impressoes:178725,cliques:1810,searchLeads:10,searchCpl:99.37,demandInscritos:1385,demandCusto:0.48},
    };
    const gglData=gglManual[fim.slice(0,7)]||null;

    // Leads por canal (normaliza case para evitar duplicatas site/Site)
    const _normC=s=>{if(!s)return'Desconhecido';const t=s.trim().toLowerCase();if(t==='instagram'||t==='orgânico'||t==='organico'||t==='organi'||t==='orgânica'||t==='organica')return'Orgânico';return s.trim().split(/\s+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');};
    const canais={};
    leads.forEach(r=>{const c=_normC(r.canal);canais[c]=(canais[c]||0)+1;});
    const canalQual={};
    leads.filter(r=>r.classificacao_manual==='Qualificado').forEach(r=>{const c=_normC(r.canal);canalQual[c]=(canalQual[c]||0)+1;});
    const melhorCanal=Object.entries(canalQual).sort((a,b)=>b[1]-a[1])[0];

    // Criativos — top campanhas por leads
    const nomeBase=n=>n?(n.replace(/\s*\[.*$/,'').replace(/\s*-\s*\[.*$/,'').trim()):'?';
    const crSet=new Set([...anMn,...anHb].map(r=>nomeBase(r.anuncio_nome)));
    const crTotal=crSet.size;
    const campMap={};
    anMn.forEach(r=>{
      const k=nomeBase(r.anuncio_nome);
      if(!campMap[k])campMap[k]={nome:k,gasto:0,leads:0,cliques:0,impressoes:0};
      campMap[k].gasto+=(+r.gasto||0);campMap[k].leads+=(+r.leads||0);
      campMap[k].cliques+=(+r.cliques||0);campMap[k].impressoes+=(+r.impressoes||0);
    });
    const topCamps=Object.values(campMap).filter(c=>c.leads>0).sort((a,b)=>b.leads-a.leads).slice(0,8);
    const campRows=topCamps.length?topCamps.map(c=>{
      const cpl=c.leads>0?c.gasto/c.leads:0;
      const ctr=c.impressoes>0?(c.cliques/c.impressoes*100):0;
      const badge=cpl>0&&cpl<80?'gn':cpl<=150?'yw':'rd';
      return`<tr><td><strong style="font-size:12px;">${c.nome}</strong></td><td style="text-align:center;font-weight:700;color:#16A34A;">${c.leads}</td><td style="text-align:right;">${brl(c.gasto)}</td><td style="text-align:right;"><span class="badge ${badge}">${cpl>0?brl(cpl):'—'}</span></td><td style="text-align:right;">${ctr>0?ctr.toFixed(1)+'%':'—'}</td></tr>`;
    }).join(''):`<tr><td colspan="5" style="text-align:center;color:#94A3B8;font-style:italic;padding:16px;">Sem dados de criativos no período</td></tr>`;

    // Criativos Hub
    const campHbMap={};
    anHb.forEach(r=>{
      const k=nomeBase(r.anuncio_nome);
      if(!campHbMap[k])campHbMap[k]={nome:k,gasto:0,leads:0};
      campHbMap[k].gasto+=(+r.gasto||0);campHbMap[k].leads+=(+r.leads||0);
    });
    const topCampsHb=Object.values(campHbMap).filter(c=>c.leads>0).sort((a,b)=>b.leads-a.leads).slice(0,5);
    const campHbRows=topCampsHb.length?topCampsHb.map(c=>{
      const cpl=c.leads>0?c.gasto/c.leads:0;
      const badge=cpl>0&&cpl<120?'gn':cpl<=200?'yw':'rd';
      return`<tr><td><strong style="font-size:12px;">${c.nome}</strong></td><td style="text-align:center;font-weight:700;color:#EA580C;">${c.leads}</td><td style="text-align:right;">${brl(c.gasto)}</td><td style="text-align:right;"><span class="badge ${badge}">${cpl>0?brl(cpl):'—'}</span></td></tr>`;
    }).join(''):`<tr><td colspan="4" style="text-align:center;color:#94A3B8;font-style:italic;padding:16px;">Sem dados de criativos Hub no período</td></tr>`;

    // Comparativo histórico
    const _inMonth=(dateStr,y,m)=>{if(!dateStr)return false;const d=new Date(dateStr.slice(0,10));return d.getFullYear()===y&&d.getMonth()+1===m;};
    // Vem da tabela historico_mensal (era hardcoded aqui — ver sql/004-historico-mensal.sql)
    const staticHistData={};
    (_histMensalRows||[]).forEach(r=>{staticHistData[r.mes]={iMn:+r.invest_mentoria||0,iHb:+r.invest_hub||0,iEx:+r.invest_experience||0,lMn:r.leads_mentoria||0,lHb:r.leads_hub||0,hot:r.qualificados_mentoria};});
    // Gera meses dinamicamente: Nov/2025 → mês atual. Evita manutenção manual
    // e o zeramento do relatório quando o período cai num mês fora da lista.
    const _histAbbr=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const histMonths=(()=>{const a=[];const now=new Date();const ey=now.getFullYear(),em=now.getMonth()+1;let y=2025,m=11;while(y<ey||(y===ey&&m<=em)){a.push({label:`${_histAbbr[m-1]}/${y}`,y,m});m++;if(m>12){m=1;y++;}}return a;})();
    // Busca Meta API para meses recentes sem dados estáticos (investimento em tempo real)
    const _dynMonths=histMonths.filter(hm=>{const k=`${hm.y}-${String(hm.m).padStart(2,'0')}`;return!staticHistData[k];});
    const _dynMeta={};
    await Promise.all(_dynMonths.map(async hm=>{
      const k=`${hm.y}-${String(hm.m).padStart(2,'0')}`;
      const _dIni=`${k}-01`;
      const _dFim=new Date(hm.y,hm.m,0).toISOString().slice(0,10);
      const _ins=await fetchMetaInsights(_dIni,_dFim);
      _dynMeta[k]=metaSumByPlatform(_ins);
    }));
    const histData=histMonths.map(hm=>{
      const sqKey=`${hm.y}-${String(hm.m).padStart(2,'0')}`;
      const sd=staticHistData[sqKey];
      // Qual. Hub = contagem real de classificacao_manual='Qualificado' em
      // leads_hub no mês — dado genuíno, calculado sempre ao vivo (mesmo nos
      // meses com Invest./Leads congelados), já que "qualificar um lead" é
      // uma ação manual recente que não estava na planilha antiga.
      const hotHb=hLeadsHb.filter(r=>_inMonth(r.created_at,hm.y,hm.m)&&r.classificacao_manual==='Qualificado').length;
      if(sd){
        const cpMn=sd.lMn>0?sd.iMn/sd.lMn:0;
        const cpHb=sd.lHb>0?sd.iHb/sd.lHb:0;
        return{...hm,...sd,iT:sd.iMn+sd.iHb+sd.iEx,cpMn,cpHb,hotHb,hasData:true};
      }
      // Dados dinâmicos: investimento da Meta API + leads do Supabase
      const lMnArr=hLeadsMn.filter(r=>_inMonth(r.created_at,hm.y,hm.m));
      const cHb=hCampsHb.filter(r=>_inMonth(r.data,hm.y,hm.m));
      const lMn=lMnArr.length;
      const hot=lMnArr.filter(r=>r.classificacao_manual==='Qualificado').length;
      const _ms=_dynMeta[sqKey]||{mentoria:0,hub:0,experience:0,total:0,leads_hub:0};
      // Leads Hub = "Leads Cadastrados" de verdade — contagem real de leads_hub
      // (mesmo critério da Mentoria com leads_mentoria), não mais o número
      // reportado pela Meta nem a planilha manual de campanhas_hub.
      const lHb=hLeadsHb.filter(r=>_inMonth(r.created_at,hm.y,hm.m)).length;
      const cMn=hCampsMn.filter(r=>_inMonth(r.data,hm.y,hm.m));
      const iMn=_ms.total>0?_ms.mentoria:cMn.reduce((s,r)=>s+(+r.gasto||0),0);
      const iHb=_ms.total>0?_ms.hub:cHb.reduce((s,r)=>s+(+r.gasto||0),0);
      const iEx=_ms.total>0?_ms.experience:0;
      const cpMn=lMn>0?iMn/lMn:0;
      const cpHb=lHb>0?iHb/lHb:0;
      return{...hm,lMn,lHb,hot,hotHb,iMn,iHb,iEx,iT:iMn+iHb+iEx,cpMn,cpHb,hasData:lMn>0||iMn>0};
    });
    // ── Totais do período via histData (fonte única de verdade) ──
    const _periodoHist=histData.filter(h=>{const k=`${h.y}-${String(h.m).padStart(2,'0')}`;return k>=ini.slice(0,7)&&k<=fim.slice(0,7)&&h.hasData;});
    // Se _periodoHist vier vazio (período fora dos meses agregados), usa os
    // valores ao vivo do período já calculados acima como fallback.
    const _hasHist=_periodoHist.length>0;
    const _relIT=_hasHist?_periodoHist.reduce((s,h)=>s+h.iT,0):invTotal;
    const _relIMn=_hasHist?_periodoHist.reduce((s,h)=>s+(h.iMn||0),0):invMn;
    const _relIHb=_hasHist?_periodoHist.reduce((s,h)=>s+(h.iHb||0),0):invHb;
    const _relIEx=_hasHist?_periodoHist.reduce((s,h)=>s+(h.iEx||0),0):invEx;
    const _relLMn=_hasHist?_periodoHist.reduce((s,h)=>s+h.lMn,0):leadsMn;
    const _relLHb=_hasHist?_periodoHist.reduce((s,h)=>s+h.lHb,0):leadsHb;
    const _relHot=_hasHist?_periodoHist.reduce((s,h)=>s+(h.hot||0),0):qualMn;
    const _relCplMn=_relLMn>0?_relIMn/_relLMn:0;
    const _relCplHb=_relLHb>0?_relIHb/_relLHb:0;
    const _perHot=_relHot;
    const curDate=new Date(fim+'T12:00:00');
    const historicoRows=histData.map(hm=>{
      const isCur=hm.y===curDate.getFullYear()&&hm.m===curDate.getMonth()+1;
      const rowStyle=isCur?' style="background:#EFF6FF;font-weight:700;"':'';
      if(!hm.hasData)return`<tr${rowStyle}><td>${hm.label}${isCur?' ◀':''}</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td><td style="text-align:right;color:#CBD5E1;">—</td></tr>`;
      return`<tr${rowStyle}><td>${hm.label}${isCur?' ◀':''}</td><td style="text-align:right;">${(hm.iMn||0)>0?brl(hm.iMn||0):'—'}</td><td style="text-align:right;">${(hm.iHb||0)>0?brl(hm.iHb||0):'—'}</td><td style="text-align:right;font-weight:700;">${hm.iT>0?brl(hm.iT):'—'}</td><td style="text-align:right;">${hm.lMn||'—'}</td><td style="text-align:right;">${hm.lHb||'—'}</td><td style="text-align:right;color:#16A34A;font-weight:700;">${hm.hot||'—'}</td><td style="text-align:right;color:#16A34A;font-weight:700;">${hm.hotHb||'—'}</td><td style="text-align:right;">${hm.cpMn>0?brl(hm.cpMn):'—'}</td><td style="text-align:right;">${hm.cpHb>0?brl(hm.cpHb):'—'}</td></tr>`;
    }).join('');
    // Linha de total
    const _hd=histData.filter(h=>h.hasData);
    const _totIT=_hd.reduce((s,h)=>s+h.iT,0);
    const _totIMn=_hd.reduce((s,h)=>s+(h.iMn||0),0);
    const _totIHb=_hd.reduce((s,h)=>s+(h.iHb||0),0);
    const _totLMn=_hd.reduce((s,h)=>s+h.lMn,0);
    const _totLHb=_hd.reduce((s,h)=>s+h.lHb,0);
    const _totHot=_hd.reduce((s,h)=>s+(h.hot||0),0);
    const _totHotHb=_hd.reduce((s,h)=>s+(h.hotHb||0),0);
    const _totCpMn=_totLMn>0?_totIMn/_totLMn:0;
    const _totCpHb=_totLHb>0?_totIHb/_totLHb:0;
    const totalRow=`<tr style="background:#1E293B;color:#F1F5F9;font-weight:700;border-top:2px solid #334155;"><td>TOTAL</td><td style="text-align:right;">${brl(_totIMn)}</td><td style="text-align:right;">${brl(_totIHb)}</td><td style="text-align:right;">${brl(_totIT)}</td><td style="text-align:right;">${_totLMn}</td><td style="text-align:right;">${_totLHb}</td><td style="text-align:right;color:#4ADE80;">${_totHot}</td><td style="text-align:right;color:#4ADE80;">${_totHotHb}</td><td style="text-align:right;">${_totCpMn>0?brl(_totCpMn):'—'}</td><td style="text-align:right;">${_totCpHb>0?brl(_totCpHb):'—'}</td></tr>`;

    // Insight de crescimento (Por que os Leads Subiram)
    const mesesComDados=histData.filter(h=>h.hasData);
    const primMes=mesesComDados[0];
    const ultMes=mesesComDados[mesesComDados.length-1];
    const growthLeads=primMes&&ultMes&&primMes.lMn>0?Math.round((ultMes.lMn-primMes.lMn)/primMes.lMn*100):null;
    const growthQual=primMes&&ultMes&&primMes.hot>0?Math.round((ultMes.hot-primMes.hot)/primMes.hot*100):null;
    const growthCpl=primMes&&ultMes&&primMes.cpMn>0?Math.round((ultMes.cpMn-primMes.cpMn)/primMes.cpMn*100):null;
    const growthLeadsStr=growthLeads!==null?(growthLeads>=0?`+${growthLeads}%`:`${growthLeads}%`):'N/D';
    const growthQualStr=growthQual!==null?(growthQual>=0?`+${growthQual}%`:`${growthQual}%`):'N/D';
    const growthCplStr=growthCpl!==null?(growthCpl<=0?`${growthCpl}% (melhora)`:` +${growthCpl}% (piora)`):'N/D';
    const melhorCanalNome=melhorCanal?melhorCanal[0]:'—';
    const melhorCanalQtd=melhorCanal?melhorCanal[1]:0;

    // ── Diagnóstico Estratégico IA ──
    btn.textContent='🧠 Analisando...';
    let diagnosticoHTML='';
    let _apiKey=getClaudeKey();
    if(_apiKey){
      try{
        const _histResumo=histData.filter(h=>h.hasData).map(h=>`${h.label}: Invest R$${h.iT.toFixed(0)} | Leads MN ${h.lMn} | Leads HB ${h.lHb} | Qual ${h.hot!=null?h.hot:'—'} | CPL MN ${h.cpMn>0?'R$'+h.cpMn.toFixed(2):'—'} | CPL HB ${h.cpHb>0?'R$'+h.cpHb.toFixed(2):'—'}`).join('\n');
        const _topResumo=topCamps.slice(0,6).map(c=>`- ${c.nome}: ${c.leads} leads | CPL R$${(c.gasto/c.leads).toFixed(2)} | Gasto R$${c.gasto.toFixed(0)}`).join('\n');
        const _canaisResumo=Object.entries(canais).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`${c}: ${n}`).join(' | ');
        const _taxaQual=leadsMn>0?((qualMn/leadsMn)*100).toFixed(1):0;
        const _gglCtx='';

        const _prompt=`PERÍODO ANALISADO: ${periodo}

INVESTIMENTO:
- Total: R$${invTotal.toFixed(2)} | Mentoria: R$${invMn.toFixed(2)} | Hub: R$${invHb.toFixed(2)} | Experience: R$${invEx.toFixed(2)}

LEADS E QUALIDADE:
- Mentoria: ${leadsMn} leads | CPL R$${cplMn.toFixed(2)} | Qualificados: ${qualMn} (taxa ${_taxaQual}%)
- Hub: ${leadsHb} leads | CPL R$${cplHb.toFixed(2)}
- Experience: ${vendasEx} vendas
- Melhor canal qualificados: ${melhorCanalNome} (${melhorCanalQtd} qualificados)

CANAIS: ${_canaisResumo}

TOP CRIATIVOS MENTORIA:
${_topResumo||'Sem dados de criativos no período'}

HISTÓRICO MENSAL (Nov/2025 → hoje):
${_histResumo}

VARIAÇÃO HISTÓRICA: Leads ${growthLeadsStr} | Qualificados ${growthQualStr} | CPL ${growthCplStr}`;

        const _res=await fetch('https://api.anthropic.com/v1/messages',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-api-key':_apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
          body:JSON.stringify({
            model:'claude-sonnet-4-6',
            max_tokens:2500,
            system:`Você é especialista sênior em marketing digital e performance de aquisição. Analise os dados e gere diagnóstico em 6 blocos HTML. Regras obrigatórias: (1) use APENAS os números fornecidos, sem inventar; (2) sem travessões ou hífens nos textos; (3) máximo 2 frases por parágrafo intro; (4) máximo 4 bullets por bloco; (5) bullets curtos e diretos com métrica no início em negrito; (6) sem linguagem de IA ou jargão vago; (7) tom executivo, objetivo.

Retorne APENAS este HTML exato, sem markdown, sem blocos de código:

<div class="diag-block-full diag-visao"><div class="diag-label">📊 Visão Geral</div><p>[2 frases resumindo performance do período com números]</p></div>
<div class="diag-grid"><div class="diag-block diag-ok"><div class="diag-label">✅ O que está funcionando</div><ul><li><strong>[métrica]</strong> [explicação curta]</li></ul></div><div class="diag-block diag-nok"><div class="diag-label">⚠️ O que não está funcionando</div><ul><li><strong>[métrica]</strong> [explicação curta]</li></ul></div></div>
<div class="diag-grid"><div class="diag-block diag-opp"><div class="diag-label">🚀 Oportunidades de escala</div><ul><li><strong>[ação]</strong> [motivo com número]</li></ul></div><div class="diag-block diag-atencao"><div class="diag-label">🔔 Pontos de atenção</div><ul><li><strong>[risco]</strong> [contexto com número]</li></ul></div></div>
<div class="diag-block-full diag-rec"><div class="diag-label">⚡ Recomendações práticas</div><ul><li><strong>[Imediato]</strong> [ação específica]</li><li><strong>[Esta semana]</strong> [ação específica]</li><li><strong>[Próximo mês]</strong> [ação específica]</li></ul></div>`,
            messages:[{role:'user',content:_prompt}]
          })
        });
        const _data=await _res.json();
        if(_data.content&&_data.content[0])diagnosticoHTML=_data.content[0].text;
        else if(_data.error)diagnosticoHTML=`<div class="diag-block diag-atencao"><h4>Erro</h4><p>${_data.error.message}</p></div>`;
      }catch(_e){
        diagnosticoHTML=`<div class="diag-block diag-atencao"><h4>Erro de conexão</h4><p>Não foi possível conectar à API. Verifique sua chave Claude.</p></div>`;
      }
    }else{
      diagnosticoHTML=`<div class="info-box yellow"><div class="info-box-title">⚡ Configure a Claude API Key</div><p>Para gerar o diagnóstico estratégico automático, configure sua chave no painel principal (ícone de configurações) e exporte novamente.</p></div>`;
    }

    // ── Logo ──
    const logoSrc=document.querySelector('.login-logo img')?.src||'';

    // ── Gerar HTML do relatório (formato original restaurado) ──
    const html_rel=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Relatório Tutory — ${periodo}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Plus Jakarta Sans',sans-serif;background:#F8FAFC;color:#1E293B;}
      .page{max-width:900px;margin:0 auto;padding:40px 48px;}
      .cover{background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#1E40AF 100%);color:#fff;border-radius:24px;padding:60px 56px;margin-bottom:40px;position:relative;overflow:hidden;}
      .cover::before{content:'';position:absolute;top:-80px;right:-80px;width:320px;height:320px;background:rgba(99,179,237,.12);border-radius:50%;}
      .cover::after{content:'';position:absolute;bottom:-60px;left:-60px;width:240px;height:240px;background:rgba(147,197,253,.08);border-radius:50%;}
      .cover-logo{display:flex;align-items:center;gap:14px;margin-bottom:48px;position:relative;z-index:1;}
      .cover-logo span{font-size:28px;font-weight:800;letter-spacing:2px;}
      .cover-title{font-size:42px;font-weight:800;line-height:1.15;margin-bottom:12px;position:relative;z-index:1;}
      .cover-sub{font-size:16px;opacity:.75;margin-bottom:40px;position:relative;z-index:1;}
      .cover-meta{display:flex;gap:40px;position:relative;z-index:1;}
      .cover-meta-item label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.6;display:block;margin-bottom:4px;}
      .cover-meta-item span{font-size:15px;font-weight:600;}
      .section{margin-bottom:32px;}
      .section-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#2563EB;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #DBEAFE;}
      .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
      .kpi-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
      .kpi-card{background:#fff;border-radius:16px;padding:20px 22px;border:1px solid #E2E8F0;box-shadow:0 1px 8px rgba(0,0,0,.05);}
      .kpi-card.accent{background:linear-gradient(135deg,#1E3A5F,#2563EB);color:#fff;border:none;}
      .kpi-card.accent .kpi-label,.kpi-card.accent .kpi-sub{color:rgba(255,255,255,.75);}
      .kpi-card.accent .kpi-value{color:#fff;}
      .kpi-card.green{border-left:4px solid #16A34A;}
      .kpi-card.orange{border-left:4px solid #EA580C;}
      .kpi-card.google{border-left:4px solid #4285F4;}
      .kpi-label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748B;margin-bottom:6px;}
      .kpi-value{font-size:26px;font-weight:800;color:#0F172A;line-height:1;margin-bottom:4px;}
      .kpi-sub{font-size:11px;color:#94A3B8;}
      .plat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
      .plat-card{background:#fff;border-radius:16px;padding:20px 22px;border-left:4px solid #ccc;border-top:1px solid #E2E8F0;border-right:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;}
      .plat-card.mn{border-left-color:#1a3fcb;}
      .plat-card.hb{border-left-color:#FB923C;}
      .plat-card.ex{border-left-color:#FBBF24;}
      .plat-card.gg{border-left-color:#4285F4;}
      .plat-name{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748B;margin-bottom:10px;}
      .plat-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F1F5F9;}
      .plat-row:last-child{border-bottom:none;}
      .plat-row label{font-size:12px;color:#64748B;}
      .plat-row span{font-size:13px;font-weight:700;color:#1E293B;}
      table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.05);margin-bottom:24px;}
      th{background:#F8FAFC;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748B;padding:12px 16px;text-align:left;border-bottom:2px solid #E2E8F0;}
      td{padding:12px 16px;font-size:13px;border-bottom:1px solid #F1F5F9;}
      tr:last-child td{border-bottom:none;}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;}
      .badge.gn{background:#DCFCE7;color:#16A34A;}
      .badge.yw{background:#FEF9C3;color:#CA8A04;}
      .badge.rd{background:#FEE2E2;color:#DC2626;}
      .info-box{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;margin-bottom:20px;}
      .info-box.green{background:#F0FDF4;border-color:#BBF7D0;}
      .info-box.yellow{background:#FEFCE8;border-color:#FDE68A;}
      .info-box-title{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2563EB;margin-bottom:8px;}
      .info-box.green .info-box-title{color:#16A34A;}
      .info-box.yellow .info-box-title{color:#CA8A04;}
      .info-box p{font-size:13px;color:#374151;line-height:1.6;}
      .growth-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
      .growth-card{background:#fff;border-radius:12px;padding:16px;border:1px solid #E2E8F0;text-align:center;}
      .growth-card .g-label{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#64748B;margin-bottom:8px;}
      .growth-card .g-value{font-size:22px;font-weight:800;margin-bottom:4px;}
      .growth-card .g-sub{font-size:11px;color:#94A3B8;}
      .up{color:#16A34A;}.down{color:#DC2626;}.neutral{color:#64748B;}
      .footer{text-align:center;padding:32px 0 16px;border-top:2px solid #E2E8F0;margin-top:40px;}
      .footer-text{font-size:11px;color:#94A3B8;}
      .diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
      .diag-block{border-radius:14px;padding:20px 22px;margin-bottom:0;border:1px solid #E2E8F0;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.04);}
      .diag-block-full{border-radius:14px;padding:20px 22px;margin-bottom:14px;border:1px solid #E2E8F0;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.04);}
      .diag-label{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-bottom:12px;}
      .diag-block p,.diag-block-full p{font-size:13px;line-height:1.7;color:#374151;margin-bottom:8px;}
      .diag-block ul,.diag-block-full ul{padding-left:0;margin-top:8px;list-style:none;}
      .diag-block li,.diag-block-full li{font-size:13px;line-height:1.6;color:#374151;margin-bottom:6px;padding-left:18px;position:relative;}
      .diag-block li::before,.diag-block-full li::before{content:'›';position:absolute;left:0;font-weight:700;}
      .diag-visao .diag-label{background:#DBEAFE;color:#1D4ED8;}.diag-visao .diag-block li::before{color:#2563EB;}
      .diag-ok .diag-label{background:#DCFCE7;color:#15803D;}.diag-ok li::before{color:#16A34A;}
      .diag-nok .diag-label{background:#FEE2E2;color:#B91C1C;}.diag-nok li::before{color:#DC2626;}
      .diag-opp .diag-label{background:#EDE9FE;color:#6D28D9;}.diag-opp li::before{color:#7C3AED;}
      .diag-atencao .diag-label{background:#FEF3C7;color:#B45309;}.diag-atencao li::before{color:#D97706;}
      .diag-rec .diag-label{background:#E0F2FE;color:#0369A1;}.diag-rec li::before{color:#0284C7;}
      .diag-block strong,.diag-block-full strong{color:#0F172A;font-weight:700;}
      .btn-baixar-pdf{position:fixed;top:20px;right:20px;z-index:9999;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1E3A5F,#2563EB);color:#fff;border:none;border-radius:12px;padding:12px 22px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(37,99,235,.45);}
      @page{size:A4 portrait;margin:12mm 10mm;}
      @media print{
        body{background:#fff;}
        .page{padding:0;max-width:100%!important;}
        *{box-shadow:none!important;}
        .cover{background:#1a237e!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
        .cover,.cover *{color:#fff!important;}
        .kpi-card.accent{background:linear-gradient(135deg,#1E3A5F,#2563EB)!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
        .btn-baixar-pdf{display:none!important;}
        table{font-size:9px!important;width:100%!important;}
        th{padding:5px 6px!important;font-size:8px!important;}
        td{padding:5px 6px!important;font-size:9px!important;}
        .section{page-break-inside:avoid;}
        tr{page-break-inside:avoid;}
      }
    </style>
</head><body>
    <button class="btn-baixar-pdf" onclick="window.print()">⬇ Baixar PDF</button>
    <div class="page">

      <!-- CAPA -->
      <div class="cover">
        <div class="cover-logo">
          <img src="${logoSrc}" style="width:40px;height:40px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,.15);">
          <span>TUTORY</span>
        </div>
        <div class="cover-title">Relatório de<br>Marketing Intelligence</div>
        <div class="cover-sub">Performance consolidada de campanhas, leads e criativos</div>
        <div class="cover-meta">
          <div class="cover-meta-item"><label>Período</label><span>${periodo}</span></div>
          <div class="cover-meta-item"><label>Gerado em</label><span>${dataGeracao}</span></div>
          <div class="cover-meta-item"><label>Emitido por</label><span>Marketing Tutory</span></div>
        </div>
      </div>

      <!-- KPIs CONSOLIDADOS -->
      <div class="section">
        <div class="section-title">📊 Visão Consolidada</div>
        <div class="kpi-grid">
          <div class="kpi-card accent">
            <div class="kpi-label">Investimento Total</div>
            <div class="kpi-value">${brl(_relIT)}</div>
            <div class="kpi-sub">Meta Ads · todas as plataformas</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Leads Mentoria</div>
            <div class="kpi-value">${num(_relLMn)}</div>
            <div class="kpi-sub">Total captados no período</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Leads Hub</div>
            <div class="kpi-value">${num(_relLHb)}</div>
            <div class="kpi-sub">Registros concluídos</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-label">Leads Qualificados</div>
            <div class="kpi-value">${num(_relHot)}</div>
            <div class="kpi-sub">Classificação manual</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Vendas Experience</div>
            <div class="kpi-value">${num(vendasEx)}</div>
            <div class="kpi-sub">Ingressos do evento</div>
          </div>
        </div>
      </div>

      <!-- POR PLATAFORMA -->
      <div class="section">
        <div class="section-title">🎯 Desempenho por Plataforma</div>
        <div class="plat-grid">
          <div class="plat-card mn">
            <div class="plat-name">🎓 Mentoria</div>
            <div class="plat-row"><label>Investimento</label><span>${brl(_relIMn)}</span></div>
            <div class="plat-row"><label>Leads</label><span>${num(_relLMn)}</span></div>
            <div class="plat-row"><label>CPL</label><span>${_relCplMn>0?brl(_relCplMn):'—'}</span></div>
            <div class="plat-row"><label>Qualificados</label><span style="color:#16A34A;">${num(_relHot)}</span></div>
          </div>
          <div class="plat-card hb">
            <div class="plat-name">🏪 Hub</div>
            <div class="plat-row"><label>Investimento</label><span>${brl(_relIHb)}</span></div>
            <div class="plat-row"><label>Leads</label><span>${num(_relLHb)}</span></div>
            <div class="plat-row"><label>CPL</label><span>${_relCplHb>0?brl(_relCplHb):'—'}</span></div>
          </div>
          <div class="plat-card ex">
            <div class="plat-name">🎟 Experience</div>
            <div class="plat-row"><label>Investimento</label><span>${brl(_relIEx)}</span></div>
            <div class="plat-row"><label>Vendas</label><span>${num(vendasEx)}</span></div>
            <div class="plat-row"><label>Custo/Ingresso</label><span>${vendasEx>0?brl(_relIEx/vendasEx):'—'}</span></div>
          </div>
        </div>
      </div>

      <!-- LEADS POR CANAL -->
      <div class="section">
        <div class="section-title">📡 Leads por Canal — Mentoria</div>
        <table>
          <thead><tr><th>Canal</th><th>Total Leads</th><th>Qualificados</th><th>Taxa</th></tr></thead>
          <tbody>
            ${Object.entries(canais).filter(([c])=>c!=='Organico').sort((a,b)=>b[1]-a[1]).map(([c,tot])=>{
              const q=canalQual[c]||0;
              const taxa=tot>0?Math.round(q/tot*100):0;
              const badge=taxa>=30?'gn':taxa>=15?'yw':'rd';
              return`<tr><td><strong>${c}</strong></td><td>${num(tot)}</td><td>${num(q)}</td><td><span class="badge ${badge}">${taxa}%</span></td></tr>`;
            }).join('')}
            ${melhorCanal?`<tr style="background:#F0FDF4;"><td colspan="4" style="font-size:12px;color:#16A34A;font-weight:700;">🏆 Canal com mais qualificados: ${melhorCanalNome} (${melhorCanalQtd} leads qualificados)</td></tr>`:''}
          </tbody>
        </table>
      </div>

      <!-- CAMPANHAS HUB -->
      ${topCampsHb.length>0?`
      <div class="section">
        <div class="section-title">🏪 Campanhas com Resultado — Hub</div>
        <table>
          <thead><tr><th style="width:44%">Campanha / Criativo</th><th style="text-align:center;">Leads</th><th style="text-align:right;">Invest.</th><th style="text-align:right;">CPL</th></tr></thead>
          <tbody>${campHbRows}</tbody>
        </table>
      </div>`:''}

      <!-- COMPARATIVO MÊS A MÊS -->
      <div class="section">
        <div class="section-title">📅 Comparativo Mês a Mês — Nov/2025 → ${periodo.split(' ')[0]}</div>
        <table>
          <thead><tr>
            <th>Mês</th>
            <th style="text-align:right;">Invest. MN</th>
            <th style="text-align:right;">Invest. HB</th>
            <th style="text-align:right;">Total</th>
            <th style="text-align:right;">Leads MN</th>
            <th style="text-align:right;">Leads HB</th>
            <th style="text-align:right;">Qual. Mentoria</th>
            <th style="text-align:right;">Qual. HUB</th>
            <th style="text-align:right;">CPL MN</th>
            <th style="text-align:right;">CPL HB</th>
          </tr></thead>
          <tbody>${historicoRows}${totalRow}</tbody>
        </table>
        <p style="font-size:11px;color:#94A3B8;margin-top:-16px;">◀ Período atual &nbsp;·&nbsp; — Sem dados registrados</p>
      </div>

      <!-- COMPARATIVO ANUAL 2026 -->
      <div class="section">
        <div class="section-title">📆 Comparativo Anual — 2026</div>
        <table>
          <thead><tr>
            <th>Mês</th>
            <th style="text-align:right;">Invest. MN</th>
            <th style="text-align:right;">Invest. HB</th>
            <th style="text-align:right;">Total</th>
            <th style="text-align:right;">Leads MN</th>
            <th style="text-align:right;">Leads HB</th>
            <th style="text-align:right;">Qual. Mentoria</th>
            <th style="text-align:right;">Qual. HUB</th>
            <th style="text-align:right;">CPL MN</th>
            <th style="text-align:right;">CPL HB</th>
          </tr></thead>
          <tbody>${(()=>{
            const _2026=histData.filter(h=>h.y===2026);
            const rows=_2026.map(hm=>{
              const isCur=hm.y===curDate.getFullYear()&&hm.m===curDate.getMonth()+1;
              const rowStyle=isCur?' style="background:#EFF6FF;font-weight:700;"':'';
              if(!hm.hasData)return`<tr${rowStyle}><td>${hm.label}${isCur?' ◀':''}</td><td colspan="9" style="text-align:center;color:#CBD5E1;">—</td></tr>`;
              return`<tr${rowStyle}><td>${hm.label}${isCur?' ◀':''}</td><td style="text-align:right;">${(hm.iMn||0)>0?brl(hm.iMn||0):'—'}</td><td style="text-align:right;">${(hm.iHb||0)>0?brl(hm.iHb||0):'—'}</td><td style="text-align:right;font-weight:700;">${hm.iT>0?brl(hm.iT):'—'}</td><td style="text-align:right;">${hm.lMn||'—'}</td><td style="text-align:right;">${hm.lHb||'—'}</td><td style="text-align:right;color:#16A34A;font-weight:700;">${hm.hot||'—'}</td><td style="text-align:right;color:#16A34A;font-weight:700;">${hm.hotHb||'—'}</td><td style="text-align:right;">${hm.cpMn>0?brl(hm.cpMn):'—'}</td><td style="text-align:right;">${hm.cpHb>0?brl(hm.cpHb):'—'}</td></tr>`;
            });
            const _d=_2026.filter(h=>h.hasData);
            const _tIT=_d.reduce((s,h)=>s+h.iT,0);
            const _tIMn=_d.reduce((s,h)=>s+(h.iMn||0),0);
            const _tIHb=_d.reduce((s,h)=>s+(h.iHb||0),0);
            const _tLMn=_d.reduce((s,h)=>s+h.lMn,0);
            const _tLHb=_d.reduce((s,h)=>s+h.lHb,0);
            const _tHot=_d.reduce((s,h)=>s+(h.hot||0),0);
            const _tHotHb=_d.reduce((s,h)=>s+(h.hotHb||0),0);
            const _tCpMn=_tLMn>0?_tIMn/_tLMn:0;
            const _tCpHb=_tLHb>0?_tIHb/_tLHb:0;
            rows.push(`<tr style="background:#1E293B;color:#F1F5F9;font-weight:700;border-top:2px solid #334155;"><td>TOTAL 2026</td><td style="text-align:right;">${brl(_tIMn)}</td><td style="text-align:right;">${brl(_tIHb)}</td><td style="text-align:right;">${brl(_tIT)}</td><td style="text-align:right;">${_tLMn}</td><td style="text-align:right;">${_tLHb}</td><td style="text-align:right;color:#4ADE80;">${_tHot}</td><td style="text-align:right;color:#4ADE80;">${_tHotHb}</td><td style="text-align:right;">${_tCpMn>0?brl(_tCpMn):'—'}</td><td style="text-align:right;">${_tCpHb>0?brl(_tCpHb):'—'}</td></tr>`);
            return rows.join('');
          })()}</tbody>
        </table>
        <p style="font-size:11px;color:#94A3B8;margin-top:-16px;">◀ Período atual &nbsp;·&nbsp; — Sem dados registrados</p>
      </div>

      <!-- COMPARATIVO DO PERÍODO SELECIONADO -->
      <div class="section">
        <div class="section-title">📊 Comparativo do Período — ${periodo}</div>
        <table>
          <thead><tr>
            <th>Mês</th>
            <th style="text-align:right;">Invest. MN</th>
            <th style="text-align:right;">Invest. HB</th>
            <th style="text-align:right;">Total</th>
            <th style="text-align:right;">Leads MN</th>
            <th style="text-align:right;">Leads HB</th>
            <th style="text-align:right;">Qual. Mentoria</th>
            <th style="text-align:right;">Qual. HUB</th>
            <th style="text-align:right;">CPL MN</th>
            <th style="text-align:right;">CPL HB</th>
          </tr></thead>
          <tbody>${(()=>{
            const _per=histData.filter(h=>{
              const k=`${h.y}-${String(h.m).padStart(2,'0')}`;
              const kIni=ini.slice(0,7);
              const kFim=fim.slice(0,7);
              return k>=kIni&&k<=kFim&&h.hasData;
            });
            if(!_per.length)return`<tr><td colspan="10" style="text-align:center;color:#94A3B8;padding:16px;">Sem dados no período selecionado</td></tr>`;
            const rows=_per.map(hm=>{
              const isCur=hm.y===curDate.getFullYear()&&hm.m===curDate.getMonth()+1;
              const rowStyle=isCur?' style="background:#EFF6FF;font-weight:700;"':'';
              return`<tr${rowStyle}><td>${hm.label}${isCur?' ◀':''}</td><td style="text-align:right;">${(hm.iMn||0)>0?brl(hm.iMn||0):'—'}</td><td style="text-align:right;">${(hm.iHb||0)>0?brl(hm.iHb||0):'—'}</td><td style="text-align:right;font-weight:700;">${hm.iT>0?brl(hm.iT):'—'}</td><td style="text-align:right;">${hm.lMn||'—'}</td><td style="text-align:right;">${hm.lHb||'—'}</td><td style="text-align:right;color:#16A34A;font-weight:700;">${hm.hot||'—'}</td><td style="text-align:right;color:#16A34A;font-weight:700;">${hm.hotHb||'—'}</td><td style="text-align:right;">${hm.cpMn>0?brl(hm.cpMn):'—'}</td><td style="text-align:right;">${hm.cpHb>0?brl(hm.cpHb):'—'}</td></tr>`;
            });
            const _d=_per;
            const _pIT=_d.reduce((s,h)=>s+h.iT,0);
            const _pIMn=_d.reduce((s,h)=>s+(h.iMn||0),0);
            const _pIHb=_d.reduce((s,h)=>s+(h.iHb||0),0);
            const _pLMn=_d.reduce((s,h)=>s+h.lMn,0);
            const _pLHb=_d.reduce((s,h)=>s+h.lHb,0);
            const _pHot=_d.reduce((s,h)=>s+(h.hot||0),0);
            const _pHotHb=_d.reduce((s,h)=>s+(h.hotHb||0),0);
            const _pCpMn=_pLMn>0?_pIMn/_pLMn:0;
            const _pCpHb=_pLHb>0?_pIHb/_pLHb:0;
            rows.push(`<tr style="background:#1E293B;color:#F1F5F9;font-weight:700;border-top:2px solid #334155;"><td>TOTAL</td><td style="text-align:right;">${brl(_pIMn)}</td><td style="text-align:right;">${brl(_pIHb)}</td><td style="text-align:right;">${brl(_pIT)}</td><td style="text-align:right;">${_pLMn}</td><td style="text-align:right;">${_pLHb}</td><td style="text-align:right;color:#4ADE80;">${_pHot}</td><td style="text-align:right;color:#4ADE80;">${_pHotHb}</td><td style="text-align:right;">${_pCpMn>0?brl(_pCpMn):'—'}</td><td style="text-align:right;">${_pCpHb>0?brl(_pCpHb):'—'}</td></tr>`);
            return rows.join('');
          })()}</tbody>
        </table>
        <p style="font-size:11px;color:#94A3B8;margin-top:-16px;">◀ Período atual &nbsp;·&nbsp; Dados filtrados pelo período selecionado no dashboard</p>
      </div>

      <!-- RODAPÉ -->
      <div class="footer">
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;">
          <img src="${logoSrc}" style="width:24px;height:24px;border-radius:5px;object-fit:contain;">
          <span style="font-size:14px;font-weight:700;color:#64748B;letter-spacing:2px;">TUTORY</span>
        </div>
        <div class="footer-text">Relatório gerado em ${dataGeracao} · tutory-dashboard.vercel.app · Confidencial</div>
      </div>

    </div>

</body></html>`;

    if(w){w.document.open();w.document.write(html_rel);w.document.close();}
    else{const b=document.createElement('a');const u=URL.createObjectURL(new Blob([html_rel],{type:'text/html'}));b.href=u;b.download='relatorio-tutory.html';b.click();}
  }catch(e){
    console.error('Erro ao gerar relatório:',e);
    alert('Erro ao gerar relatório: '+e.message);
  }finally{
    if(btn){btn.textContent='📊 Exportar Relatório';btn.disabled=false;}
  }
}

// AUTO-REFRESH LEADS A CADA 30S
setInterval(()=>{
  if(cur==='mentoria'){
    const lcount=$('mn-lcount');
    const {ini,fim}=getDates('mentoria');
    supaFetch('leads_mentoria',`select=id&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59`).then(leads=>{
      if(!leads)return;
      const novo=leads.length;
      const atual=parseInt((lcount?.textContent||'0').replace(/\D/g,''))||0;
      if(novo!==atual){
        if(lcount){lcount.style.color='var(--gn)';setTimeout(()=>{if(lcount)lcount.style.color='';},2000);}
        renderMentoria();
      }
    }).catch(()=>{});
  }
},30000);

// EXPORTAR LEADS CSV
async function exportarLeadsCSV(){
  const {ini,fim}=getDates('mentoria');
  const leads=await supaFetch('leads_mentoria',`select=*&created_at=gte.${ini}T00:00:00&created_at=lte.${fim}T23:59:59&order=created_at.desc`);
  if(!leads||!leads.length){alert('Nenhum lead no período.');return;}
  const cols=['created_at','contact_name','contact_instagram','contact_phone','contact_email','score','classificacao','canal','cargo','faturamento','momento','proxima_acao'];
  const header=cols.join(',');
  const rows=leads.map(r=>cols.map(c=>'"'+String(r[c]||'').replace(/"/g,'""')+'"').join(','));
  const csv='\uFEFF'+header+'\n'+rows.join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`leads-${ini}-a-${fim}.csv`;a.click();
  URL.revokeObjectURL(url);
}

function normCanal(c){
  var cl=(c||'').toLowerCase().trim();
  if(cl.includes('typebot'))return'Typebot';
  if(cl==='lp'||cl==='landing page'||cl==='landingpage')return'LP';
  if(cl==='site'||cl==='site oficial')return'Site';
  return'Orgânico';
}
async function deleteMnLead(id,btn){
  if(!confirm('Excluir este lead permanentemente?'))return;
  btn.disabled=true;btn.textContent='…';
  const SUPA_URL='https://stgzgtpcuhtayglignik.supabase.co';
  const SUPA_KEY='sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/leads_mentoria?id=eq.${id}`,{
      method:'DELETE',
      headers:{'apikey':SUPA_KEY,'Authorization':`Bearer ${SUPA_KEY}`,'Prefer':'return=minimal'}
    });
    if(r.ok){
      const row=btn.closest('tr');if(row)row.remove();
      if(window._mnCacheData&&window._mnCacheData[0])window._mnCacheData[0]=window._mnCacheData[0].filter(l=>String(l.id)!==String(id));
      if(window._mnLeads)window._mnLeads=window._mnLeads.filter(l=>String(l.id)!==String(id));
      // Atualiza contadores em tela sem novo fetch
      const newTot=window._mnLeads?window._mnLeads.length:null;
      if(newTot!==null){
        const _upd=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
        _upd('mn-tot',fmt.num(newTot));
        _upd('mn-lcount',newTot+' leads');
        _upd('mn-all-lcount',newTot+' leads');
        _upd('vg-leads-total',fmt.num(newTot));
        const newHot=window._mnLeads.filter(r=>r.classificacao_manual==='Qualificado').length;
        _upd('mn-hot',newHot);
        _upd('vg-hot-total',newHot);
      }
    }
    else{alert('Erro ao excluir.');btn.disabled=false;btn.textContent='🗑';}
  }catch(e){alert('Erro: '+e.message);btn.disabled=false;btn.textContent='🗑';}
}
// LEADS QUENTES POR CANAL
function renderHotCanal(leads){
  const el=$('mn-hot-canal');if(!el)return;
  const canais={};
  leads.forEach(l=>{
    const c=normCanal(l.canal);
    if(!canais[c])canais[c]={total:0,hot:0};
    canais[c].total++;
    if(l.classificacao_manual==='Qualificado')canais[c].hot++;
  });
  const rows=Object.entries(canais).filter(([,v])=>v.total>0).sort((a,b)=>b[1].hot-a[1].hot);
  if(!rows.length){el.innerHTML='<div style="color:var(--sub);font-size:13px;text-align:center;padding:20px;">Aguardando leads...</div>';return;}
  const maxHot=Math.max(...rows.map(([,v])=>v.hot),1);
  el.innerHTML=rows.map(([c,v])=>{
    const pct=Math.round(v.hot/maxHot*100);
    const taxa=Math.round(v.hot/v.total*100);
    return`<div style="margin-bottom:14px;display:flex;align-items:center;gap:12px;">
      <div style="width:130px;flex-shrink:0;">${canalChip(c)}</div>
      <div style="flex:1;height:8px;background:var(--s3);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:var(--red);border-radius:4px;transition:width .5s;"></div>
      </div>
      <div style="width:90px;text-align:right;flex-shrink:0;">
        <span style="font-size:14px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--red);">${v.hot}</span>
        <span style="font-size:11px;color:var(--sub);"> qualificados (${taxa}%)</span>
      </div>
    </div>`;
  }).join('');
}

// CRIATIVOS ÚNICOS

// ═══════════════════════════════════════════════
// RENDER CRIATIVOS
// ═══════════════════════════════════════════════
// BANCO DE CRIATIVOS
// ═══════════════════════════════════════════════
var _bcrFiltro='';
var _bcrData=[];

var _bcrSeed=[
  {id:'cr_seed_1',data:'2026-07-02',link:'https://www.instagram.com/p/DYDPzGOgNfb/#advertiser',pessoa:'Nicole',nicho:'Mentoria',cenario:'Praça de Alimentação',ganho:'Ei, Servidor Público. Você não precisa ficar correndo atrás de renda Extra depois do seu trabalho.',tempo:'27 Segundos',plat:'Instagram',analiseIA:'Gancho rápido e atrativo, cenário visualmente bonito e câmera bem posicionada. Top 1 criativo durante meses.',criadoEm:1751500000000},
  {id:'cr_seed_2',data:'2026-07-02',link:'https://www.instagram.com/p/DYDP2IkgCrv/#advertiser',pessoa:'Leticia',nicho:'Mentoria',cenario:'Mostrando a Plataforma por dentro',ganho:'O Aluno fica ansioso e não sabe oque estudar.',tempo:'30 Segundos',plat:'Instagram',analiseIA:'Mostrando a Plataforma gera mais confiança pro lead entrar e querer entender o anúncio. Anúncio focado para um Público mais quente.',criadoEm:1751500001000},
  {id:'cr_seed_3',data:'2026-07-02',link:'https://www.instagram.com/p/DZtCufYANBH/#advertiser',pessoa:'Gabriela Carso',nicho:'Hub',cenario:'Sala de marketing',ganho:'Eu vou te mostrar como criar um Infoproduto em 1 hora',tempo:'2 Minutos',plat:'Instagram',analiseIA:'Qualidade do vídeo Perfeita, cenário e cor atrativo. Legenda e edição bem feita.',criadoEm:1751500002000},
  {id:'cr_seed_4',data:'2026-07-02',link:'https://www.instagram.com/p/DZtCuQegNLE/#advertiser',pessoa:'Lucas',nicho:'Hub',cenario:'Sala de marketing',ganho:'Mentor ou mentora de Concursos Públicos.',tempo:'45 Segundos',plat:'Instagram',analiseIA:'Gancho saturado. Pop-up acima do Lucas atraiu e segurou o lead. Devemos gravar mais nessa posição da sala.',criadoEm:1751500003000},
  {id:'cr_seed_5',data:'2026-07-02',link:'https://www.instagram.com/p/DZtCuVHgFrn/#advertiser',pessoa:'Leticia',nicho:'Hub',cenario:'Sala de Marketing React',ganho:'Ouve só oque a Adriana Figueiredo acabou de Falar.',tempo:'1min e 20 Segundos',plat:'Instagram',analiseIA:'Trabalhar mais com React, principalmente nos maiores clientes que dão mais confiança e Credibilidade para o Público quente.',criadoEm:1751500004000}
];

