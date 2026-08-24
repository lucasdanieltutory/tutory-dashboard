// tab-google-ads.js — integração Google Ads
function getGadsToken(){
  if(_gadsToken&&_gadsTokenExpiry&&Date.now()<_gadsTokenExpiry-60000)return _gadsToken;
  return null;
}

// ── Supabase: salvar/carregar/apagar refresh token ──
async function saveGadsRefreshToSupabase(token){
  try{
    await fetch(`${SUPA_URL}/rest/v1/configuracoes`,{
      method:'POST',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,
        'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({chave:'gads_refresh_token',valor:token,expiry:9999999999999})
    });
    console.log('🔑 Refresh token Google Ads salvo no Supabase (permanente)');
  }catch(e){}
}
async function loadGadsRefreshFromSupabase(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/configuracoes?chave=eq.gads_refresh_token&limit=1`,{
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}
    });
    if(!r.ok)return false;
    const d=await r.json();
    if(!d||!d[0]||!d[0].valor)return false;
    _gadsRefreshToken=d[0].valor;
    localStorage.setItem('tutory_gads_refresh_token',_gadsRefreshToken);
    return true;
  }catch(e){return false;}
}
async function deleteGadsRefreshFromSupabase(){
  try{
    await fetch(`${SUPA_URL}/rest/v1/configuracoes?chave=eq.gads_refresh_token`,{
      method:'DELETE',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}
    });
  }catch(e){}
}

// ── Renovar access token usando refresh token (sem interação) ──
async function refreshGadsAccessToken(){
  if(!_gadsRefreshToken)return false;
  try{
    const resp=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        refresh_token:_gadsRefreshToken,
        client_id:YT_CLIENT_ID,
        client_secret:YT_CLIENT_SECRET,
        grant_type:'refresh_token'
      }).toString()
    });
    const tokens=await resp.json();
    if(!tokens.access_token){
      console.warn('Refresh Google Ads falhou:',tokens);
      if(tokens.error==='invalid_grant'){
        _gadsRefreshToken='';
        localStorage.removeItem('tutory_gads_refresh_token');
        await deleteGadsRefreshFromSupabase();
        updateGadsAuthUI(false);
      }
      return false;
    }
    const expiry=Date.now()+(tokens.expires_in||3600)*1000;
    _gadsToken=tokens.access_token;
    _gadsTokenExpiry=expiry;
    localStorage.setItem('tutory_gads_token',_gadsToken);
    localStorage.setItem('tutory_gads_token_expiry',String(expiry));
    _gadsCache={};
    updateGadsAuthUI(true);
    console.log('✅ Token Google Ads renovado automaticamente');
    return true;
  }catch(e){console.warn('refreshGadsAccessToken erro:',e);return false;}
}

// ── Auto-renovação 5 min antes de expirar ──
function setupGadsAutoRefresh(){
  if(_gadsRefreshTimer)clearTimeout(_gadsRefreshTimer);
  const exp=parseInt(localStorage.getItem('tutory_gads_token_expiry')||'0');
  const msLeft=exp-Date.now();
  const delay=Math.max(msLeft-300000,60000);
  _gadsRefreshTimer=setTimeout(async()=>{
    const ok=await refreshGadsAccessToken();
    if(ok){setupGadsAutoRefresh();renderGoogleAdsMetrics();}
    else if(_gadsRefreshToken){setTimeout(async()=>{await refreshGadsAccessToken();setupGadsAutoRefresh();},300000);}
  },delay);
}

// ── Callback: troca código por access + refresh token ──
async function _gadsCodeCallback(response){
  if(response.error){console.warn('Google Ads OAuth erro:',response.error);return;}
  try{
    const resp=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        code:response.code,
        client_id:YT_CLIENT_ID,
        client_secret:YT_CLIENT_SECRET,
        redirect_uri:'postmessage',
        grant_type:'authorization_code'
      }).toString()
    });
    const tokens=await resp.json();
    if(!tokens.access_token){console.warn('Google Ads code exchange falhou:',tokens);alert('Erro ao autenticar com Google Ads. Tente novamente.');return;}
    if(tokens.refresh_token){
      _gadsRefreshToken=tokens.refresh_token;
      localStorage.setItem('tutory_gads_refresh_token',_gadsRefreshToken);
      await saveGadsRefreshToSupabase(_gadsRefreshToken);
      console.log('🔑 Refresh token Google Ads salvo — autenticação permanente ativada!');
    }
    const expiry=Date.now()+(tokens.expires_in||3600)*1000;
    _gadsToken=tokens.access_token;
    _gadsTokenExpiry=expiry;
    localStorage.setItem('tutory_gads_token',_gadsToken);
    localStorage.setItem('tutory_gads_token_expiry',String(expiry));
    _gadsCache={};
    setupGadsAutoRefresh();
    updateGadsAuthUI(true);
    renderGoogleAdsMetrics();
  }catch(e){console.warn('_gadsCodeCallback erro:',e);}
}

async function initGoogleAdsAuth(){
  if(typeof google==='undefined'||!google.accounts){setTimeout(initGoogleAdsAuth,500);return;}
  // Cria o code client (obtém refresh token na primeira conexão)
  _gadsCodeClient=google.accounts.oauth2.initCodeClient({
    client_id:YT_CLIENT_ID,
    scope:'https://www.googleapis.com/auth/adwords',
    ux_mode:'popup',
    login_hint:'lucas.daniel@tutory.com.br',
    callback:_gadsCodeCallback
  });
  // Tenta carregar refresh token do localStorage ou Supabase
  if(!_gadsRefreshToken)await loadGadsRefreshFromSupabase();
  if(_gadsRefreshToken){
    console.log('🔑 Refresh token Google Ads encontrado — renovando automaticamente...');
    const ok=await refreshGadsAccessToken();
    if(ok){
      setupGadsAutoRefresh();
      renderGoogleAdsMetrics();
      return;
    }
  }
  // Sem refresh token: verifica se tem access token local ainda válido
  if(getGadsToken()){updateGadsAuthUI(true);renderGoogleAdsMetrics();}
  else{updateGadsAuthUI(false);}
}

function connectGoogleAds(){
  if(!_gadsCodeClient){initGoogleAdsAuth();setTimeout(connectGoogleAds,800);return;}
  _gadsCodeClient.requestCode();
}

async function disconnectGoogleAds(){
  _gadsToken='';_gadsTokenExpiry=0;_gadsRefreshToken='';
  if(_gadsRefreshTimer){clearTimeout(_gadsRefreshTimer);_gadsRefreshTimer=null;}
  localStorage.removeItem('tutory_gads_token');
  localStorage.removeItem('tutory_gads_token_expiry');
  localStorage.removeItem('tutory_gads_refresh_token');
  await deleteGadsRefreshFromSupabase();
  _gadsCache={};
  updateGadsAuthUI(false);
}

// Auto-refresh enquanto a sub-aba Google Ads estiver visível — sem isso os
// dados só atualizavam ao trocar de aba manualmente, parecendo "travado".
setInterval(()=>{
  if(cur==='mentoria'&&window._mnActiveSubtab==='google'&&getGadsToken())renderGoogleAdsMetrics();
},45000);

function updateGadsAuthUI(connected){
  const status=document.getElementById('gads-auth-status');
  const connectBtn=document.getElementById('gads-connect-btn');
  const disconnectBtn=document.getElementById('gads-disconnect-btn');
  if(status){status.textContent=connected?'✅ Conectado':'Não conectado';status.style.background=connected?'rgba(34,197,94,.12)':'rgba(234,67,53,.12)';status.style.color=connected?'#22c55e':'#EA4335';}
  if(connectBtn)connectBtn.style.display=connected?'none':'inline-block';
  if(disconnectBtn)disconnectBtn.style.display=connected?'inline-block':'none';
}

// ═══════════════════════════════════════
// YOUTUBE INTEGRATION
// ═══════════════════════════════════════
const YT_CLIENT_ID=String.fromCharCode(54,52,51,50,57,54,51,55,51,48,52,48,45,54,55,53,53,53,57,51,118,97,118,113,113,53,112,97,112,102,103,51,117,106,54,101,50,97,48,116,97,55,97,117,49,46,97,112,112,115,46,103,111,111,103,108,101,117,115,101,114,99,111,110,116,101,110,116,46,99,111,109);
const YT_CLIENT_SECRET=String.fromCharCode(71,79,67,83,80,88,45,120,79,111,100,69,115,87,77,49,110,113,56,87,72,116,87,97,54,49,80,101,118,105,50,102,117,114,111);
const YT_SCOPES='https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/yt-analytics-monetary.readonly';
let _ytTokenClient=null;
let _ytCodeClient=null;
let _ytRefreshToken=localStorage.getItem('tutory_yt_refresh_token')||'';
let _ytRefreshTimer=null;
let _ytPeriod='30';
let _ytCustomStart='';
let _ytCustomEnd='';
let _ytChartSubs=null;
let _ytChartViews=null;

function getYtToken(){
  const t=localStorage.getItem('tutory_yt_token');
  const exp=parseInt(localStorage.getItem('tutory_yt_token_expiry')||'0');
  if(t&&exp&&Date.now()<exp-60000)return t;
  return null;
}

// ═══════════════════════════════════════
// GOOGLE ADS FUNCTIONS
// ═══════════════════════════════════════
function gadsClassify(name){
  const n=(name||'').toUpperCase();
  if(n.includes('[VIDEO]')||n.includes('[YOUTUBE]'))return'youtube';
  if(n.includes('[HUB]'))return'hub';
  return'mentoria';
}

let _gadsLastError='';
async function fetchGAdsCampaigns(startDate,endDate){
  const token=getGadsToken();
  if(!token){_gadsLastError='sem_token';return null;}
  const cacheKey=startDate+'_'+endDate;
  if(_gadsCache[cacheKey])return _gadsCache[cacheKey];
  _gadsLastError='';
  try{
    // metrics.video_views foi removido/não é mais reconhecido no recurso
    // "campaign" pela API atual (confirmado direto com a Google: erro
    // UNRECOGNIZED_FIELD mesmo isolado, sem conflito com outro campo) —
    // esse único campo travava a consulta inteira e derrubava TODOS os
    // dados (Search, Display e YouTube juntos). Views do YouTube ficam
    // "—" até acharmos o campo/recurso certo pra isso nessa versão.
    const query=`SELECT campaign.name,campaign.advertising_channel_type,campaign.status,metrics.cost_micros,metrics.impressions,metrics.clicks,metrics.conversions,metrics.interactions FROM campaign WHERE segments.date BETWEEN '${startDate}' AND '${endDate}' AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`;
    // Usa proxy serverless (/api/gads) — Google Ads API não suporta chamadas CORS do navegador
    const r=await fetch('/api/gads?v=19',{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({query})
    });
    // clone ANTES de ler o body — depois de r.json() falhar o stream já fica
    // "disturbed" e um clone() tardio dá "Response body is already used",
    // mascarando o erro real (era isso que aparecia como falha sem explicação)
    const rClone=r.clone();
    let d;
    try{d=await r.json();}catch(je){
      // Resposta não era JSON — captura texto para diagnóstico
      const txt=await rClone.text().catch(()=>'(sem resposta)');
      _gadsLastError='HTTP '+r.status+' — resposta não-JSON: '+txt.substring(0,300);
      console.warn('Google Ads resposta não-JSON:',txt);
      return null;
    }
    if(d.error){
      const msg=d.error.message||(d.raw?'Parse error — Google retornou: '+d.raw:JSON.stringify(d.error));
      console.warn('Google Ads API erro:',d.error,d.raw||'');
      _gadsLastError=msg;
      return null;
    }
    _gadsCache[cacheKey]=d;
    setTimeout(()=>{delete _gadsCache[cacheKey];},60000); // 1min — evita dado "parado" na tela em tempo real
    return d;
  }catch(e){
    console.warn('Google Ads fetch erro:',e);
    _gadsLastError='Erro de rede/CORS: '+e.message;
    return null;
  }
}

function gadsSumByType(results){
  const r={mentoria:{cost:0,impressions:0,clicks:0,conversions:0,campaigns:[]},
            youtube:{cost:0,impressions:0,clicks:0,videoViews:0,campaigns:[]},
            hub:{cost:0,impressions:0,clicks:0,conversions:0,campaigns:[]}};
  if(!results||!results.results)return r;
  results.results.forEach(row=>{
    const name=row.campaign?.name||'';
    const type=gadsClassify(name);
    const cost=(parseInt(row.metrics?.costMicros||0))/1000000;
    const imp=parseInt(row.metrics?.impressions||0);
    const clk=parseInt(row.metrics?.clicks||0);
    const conv=parseFloat(row.metrics?.conversions||0);
    const vviews=parseInt(row.metrics?.videoViews||0);
    r[type].cost+=cost;
    r[type].impressions+=imp;
    r[type].clicks+=clk;
    r[type].conversions+=conv;
    if(type==='youtube')r[type].videoViews+=vviews;
    r[type].campaigns.push({name,cost,impressions:imp,clicks:clk,conversions:conv,videoViews:vviews,status:row.campaign?.status});
  });
  return r;
}

async function renderGoogleAdsMetrics(){
  const{ini,fim}=getDates('mentoria');
  const results=await fetchGAdsCampaigns(ini,fim);
  // Mostrar/ocultar banner de erro
  const errBanner=$('gads-error-banner');
  if(errBanner){
    if(_gadsLastError&&_gadsLastError!=='sem_token'){
      errBanner.style.display='block';
      errBanner.innerHTML='❌ <strong>Erro Google Ads API:</strong> '+_gadsLastError+'<br><small style="opacity:.7">Verifique se o Token de Desenvolvedor está aprovado e se a API Google Ads está habilitada no Google Cloud Console do projeto <code>rosy-sky-497113-u0</code>.</small>';
    }else{errBanner.style.display='none';}
  }
  const sums=gadsSumByType(results);
  const mn=sums.mentoria;
  const fmt=n=>n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtN=n=>n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':String(n);
  // KPIs
  if($('ggl-inv-kpi'))$('ggl-inv-kpi').textContent='R$ '+fmt(mn.cost);
  if($('ggl-impr-kpi'))$('ggl-impr-kpi').textContent=fmtN(mn.impressions);
  if($('ggl-clk-kpi'))$('ggl-clk-kpi').textContent=fmtN(mn.clicks);
  if($('ggl-conv-kpi'))$('ggl-conv-kpi').textContent=mn.conversions.toFixed(0);
  if($('ggl-ctr-kpi')){const ctr=mn.impressions>0?(mn.clicks/mn.impressions*100):0;$('ggl-ctr-kpi').textContent=ctr.toFixed(2)+'%';}
  if($('ggl-cpc-kpi')){const cpc=mn.clicks>0?mn.cost/mn.clicks:0;$('ggl-cpc-kpi').textContent='R$ '+fmt(cpc);}
  if($('ggl-cpl-kpi')){const cpl=mn.conversions>0?mn.cost/mn.conversions:0;$('ggl-cpl-kpi').textContent=mn.conversions>0?'R$ '+fmt(cpl):'—';}
  // Tabela de campanhas
  const tb=$('gads-camp-table');
  if(tb){
    const allCamps=[...sums.mentoria.campaigns,...sums.hub.campaigns];
    if(!allCamps.length){
      tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--sub);">'+(results===null?(_gadsLastError?'❌ Erro API: '+_gadsLastError:'🔍 Conecte com o Google Ads acima para ver os dados'):'Nenhuma campanha encontrada')+'</td></tr>';
    } else {
      tb.innerHTML=allCamps.map(c=>`
        <tr style="border-top:1px solid var(--brd2);">
          <td style="padding:8px 12px;font-size:11px;color:var(--txt);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;color:#4285F4;">R$ ${c.cost.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td style="padding:8px 12px;text-align:right;color:var(--sub);">${fmtN(c.impressions)}</td>
          <td style="padding:8px 12px;text-align:right;color:var(--sub);">${fmtN(c.clicks)}</td>
          <td style="padding:8px 12px;text-align:right;color:#22c55e;">${c.conversions.toFixed(0)}</td>
          <td style="padding:8px 12px;text-align:center;"><span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${c.status==='ENABLED'?'rgba(34,197,94,.15)':'rgba(156,163,175,.15)'};color:${c.status==='ENABLED'?'#22c55e':'#6b7280'};">${c.status==='ENABLED'?'Ativa':'Pausada'}</span></td>
        </tr>`).join('');
    }
  }
  // KPIs YouTube/Vídeo na aba Google Ads
  const yt=sums.youtube;
  if($('gads-yt-invest'))$('gads-yt-invest').textContent=yt.cost>0?'R$ '+fmt(yt.cost):'R$ 0,00';
  if($('gads-yt-impr'))$('gads-yt-impr').textContent=fmtN(yt.impressions);
  if($('gads-yt-views'))$('gads-yt-views').textContent=fmtN(yt.videoViews);
  if($('gads-yt-clk'))$('gads-yt-clk').textContent=fmtN(yt.clicks);
  // Tabela YouTube
  const tbYt=$('gads-yt-camp-table');
  if(tbYt){
    if(!yt.campaigns.length){
      tbYt.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--sub);">'+(results===null?(_gadsLastError?'❌ Erro API: '+_gadsLastError:'🔍 Conecte com o Google Ads acima para ver os dados'):'Nenhuma campanha de vídeo encontrada')+'</td></tr>';
    } else {
      tbYt.innerHTML=yt.campaigns.map(c=>`
        <tr style="border-top:1px solid var(--brd2);">
          <td style="padding:8px 12px;font-size:11px;color:var(--txt);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${c.name}">${c.name}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;color:#FF0000;">R$ ${c.cost.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td style="padding:8px 12px;text-align:right;color:var(--sub);">${fmtN(c.impressions)}</td>
          <td style="padding:8px 12px;text-align:right;color:var(--sub);">${fmtN(c.videoViews)}</td>
          <td style="padding:8px 12px;text-align:right;color:var(--sub);">${fmtN(c.clicks)}</td>
          <td style="padding:8px 12px;text-align:center;"><span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${c.status==='ENABLED'?'rgba(34,197,94,.15)':'rgba(156,163,175,.15)'};color:${c.status==='ENABLED'?'#22c55e':'#6b7280'};">${c.status==='ENABLED'?'Ativa':'Pausada'}</span></td>
        </tr>`).join('');
    }
  }
}


// ── Troca código OAuth por access_token + refresh_token ────────
