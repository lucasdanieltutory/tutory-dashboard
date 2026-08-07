// tab-youtube.js — integração YouTube
async function exchangeCodeForTokens(code){
  try{
    const resp=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        code,
        client_id:YT_CLIENT_ID,
        client_secret:YT_CLIENT_SECRET,
        redirect_uri:'postmessage',
        grant_type:'authorization_code'
      }).toString()
    });
    return await resp.json();
  }catch(e){console.warn('exchangeCodeForTokens erro:',e);return null;}
}

// ── Renova access_token usando refresh_token (sem interação) ───
async function refreshYtAccessToken(){
  if(!_ytRefreshToken)return false;
  try{
    const resp=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        refresh_token:_ytRefreshToken,
        client_id:YT_CLIENT_ID,
        client_secret:YT_CLIENT_SECRET,
        grant_type:'refresh_token'
      }).toString()
    });
    const tokens=await resp.json();
    if(!tokens.access_token){
      console.warn('Refresh YouTube falhou:',tokens);
      if(tokens.error==='invalid_grant'){
        // Token revogado - limpar e pedir reconexão
        _ytRefreshToken='';
        localStorage.removeItem('tutory_yt_refresh_token');
        await deleteYtRefreshFromSupabase();
      }
      return false;
    }
    const expiry=Date.now()+(tokens.expires_in||3600)*1000;
    localStorage.setItem('tutory_yt_token',tokens.access_token);
    localStorage.setItem('tutory_yt_token_expiry',String(expiry));
    saveYtTokenToSupabase(tokens.access_token,expiry);
    console.log('✅ Token YouTube renovado automaticamente');
    return true;
  }catch(e){console.warn('refreshYtAccessToken erro:',e);return false;}
}

// ── Auto-renovação baseada em refresh token ────────────────────
function setupYtAutoRefresh(){
  if(_ytRefreshTimer)clearTimeout(_ytRefreshTimer);
  const exp=parseInt(localStorage.getItem('tutory_yt_token_expiry')||'0');
  const msLeft=exp-Date.now();
  const delay=Math.max(msLeft-300000,60000); // 5 min antes de expirar, mín 1 min
  _ytRefreshTimer=setTimeout(async()=>{
    const ok=await refreshYtAccessToken();
    if(ok){setupYtAutoRefresh();}
    else if(_ytRefreshToken){setTimeout(async()=>{await refreshYtAccessToken();setupYtAutoRefresh();},300000);}
  },delay);
}

// ── Callback compartilhado do code client ─────────────────────
async function _ytCodeCallback(response){
  if(response.error){console.warn('YT OAuth erro:',response.error);return;}
  const tokens=await exchangeCodeForTokens(response.code);
  if(!tokens||tokens.error){
    console.warn('Erro ao trocar código YouTube:',tokens);
    alert('Erro ao autenticar com YouTube. Tente novamente.');
    return;
  }
  if(tokens.refresh_token){
    _ytRefreshToken=tokens.refresh_token;
    localStorage.setItem('tutory_yt_refresh_token',_ytRefreshToken);
    await saveYtRefreshToSupabase(_ytRefreshToken);
    console.log('🔑 Refresh token YouTube salvo - autenticação permanente ativada!');
  }
  const expiry=Date.now()+(tokens.expires_in||3600)*1000;
  localStorage.setItem('tutory_yt_token',tokens.access_token);
  localStorage.setItem('tutory_yt_token_expiry',String(expiry));
  await saveYtTokenToSupabase(tokens.access_token,expiry);
  setupYtAutoRefresh();
  await renderYouTube();
}

function _makeYtCodeClient(selectAccount){
  return google.accounts.oauth2.initCodeClient({
    client_id:YT_CLIENT_ID,
    scope:YT_SCOPES,
    ux_mode:'popup',
    prompt:'consent',        // força o Google a SEMPRE devolver o refresh token (persiste p/ sempre)
    login_hint:selectAccount?'':('tutory@tutory.com.br'),
    callback:_ytCodeCallback
  });
}

async function initYouTubeAuth(){
  if(typeof google==='undefined'||!google.accounts){setTimeout(initYouTubeAuth,500);return;}
  // Cria o code client (para obter refresh token na primeira conexão)
  _ytCodeClient=_makeYtCodeClient(false);
  // Tenta refresh token do localStorage ou Supabase
  if(!_ytRefreshToken)await loadYtRefreshFromSupabase();
  if(_ytRefreshToken){
    console.log('🔑 Refresh token encontrado - renovando automaticamente...');
    const ok=await refreshYtAccessToken();
    if(ok){
      setupYtAutoRefresh();
      if(document.getElementById('page-youtube')&&
         document.getElementById('page-youtube').style.display!=='none'){await renderYouTube();}
      return;
    }
    console.warn('Refresh falhou - aguardando reconexão manual');
  }
  // Sem refresh token → tenta access token do Supabase (compatibilidade)
  const loaded=await loadYtTokenFromSupabase();
  if(loaded){
    const expLoaded=parseInt(localStorage.getItem('tutory_yt_token_expiry')||'0');
    scheduleYtTokenRefresh(Math.floor((expLoaded-Date.now())/1000));
    if(document.getElementById('page-youtube')&&
       document.getElementById('page-youtube').style.display!=='none'){renderYouTube();}
  }
}

function scheduleYtTokenRefresh(expiresInSecs){
  // Legado: quando só temos access token (sem refresh token)
  if(_ytRefreshToken){setupYtAutoRefresh();return;}
  const delay=Math.max((expiresInSecs-300)*1000,5000);
  setTimeout(async()=>{
    if(_ytRefreshToken){await refreshYtAccessToken();setupYtAutoRefresh();}
  },delay);
}

function connectYouTube(forceSwitch){
  if(!_ytCodeClient){initYouTubeAuth();setTimeout(()=>connectYouTube(forceSwitch),700);return;}
  if(forceSwitch)_ytCodeClient=_makeYtCodeClient(true);
  _ytCodeClient.requestCode();
}

function disconnectYouTube(){
  if(_ytRefreshTimer)clearTimeout(_ytRefreshTimer);
  _ytRefreshTimer=null;
  const token=localStorage.getItem('tutory_yt_token');
  if(token&&typeof google!=='undefined'&&google.accounts&&google.accounts.oauth2){
    try{google.accounts.oauth2.revoke(token,()=>{});}catch(e){}
  }
  _ytRefreshToken='';
  localStorage.removeItem('tutory_yt_token');
  localStorage.removeItem('tutory_yt_token_expiry');
  localStorage.removeItem('tutory_yt_refresh_token');
  deleteYtRefreshFromSupabase();
  // Limpar UI
  const connectBtn=$('yt-connect-btn');
  const disconnectBtn=$('yt-disconnect-btn');
  const avatar=$('yt-channel-avatar');
  if(connectBtn){connectBtn.textContent='▶ Conectar YouTube';connectBtn.style.background='#FF0000';}
  if(disconnectBtn)disconnectBtn.style.display='none';
  if(avatar){avatar.style.display='none';avatar.src='';}
  renderYouTube();
}

function setYtPeriod(p,el){
  _ytPeriod=p;
  document.querySelectorAll('.yt-period-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  const customRow=$('yt-custom-row');
  if(p==='custom'){
    if(customRow)customRow.style.display='flex';
    // Pré-preenche com o mês atual
    const today=new Date();
    const firstDay=new Date(today.getFullYear(),today.getMonth(),1);
    const fmt=d=>d.toISOString().split('T')[0];
    const startEl=document.getElementById('yt-custom-start');
    const endEl=document.getElementById('yt-custom-end');
    if(startEl&&!startEl.value)startEl.value=fmt(firstDay);
    if(endEl&&!endEl.value)endEl.value=fmt(today);
    return; // aguarda o usuário clicar Aplicar
  } else {
    if(customRow)customRow.style.display='none';
    renderYouTubeData();
  }
}

function applyYtCustom(){
  const s=document.getElementById('yt-custom-start')?.value;
  const e=document.getElementById('yt-custom-end')?.value;
  if(!s||!e){alert('Selecione as datas de início e fim.');return;}
  if(s>e){alert('A data de início não pode ser maior que a data de fim.');return;}
  _ytCustomStart=s;
  _ytCustomEnd=e;
  renderYouTubeData();
}

function getYtDates(period){
  const fmt=d=>d.toISOString().split('T')[0];
  const today=new Date();
  if(period==='mes'){
    const start=new Date(today.getFullYear(),today.getMonth(),1);
    return{start:fmt(start),end:fmt(today)};
  }
  if(period==='custom'){
    return{start:_ytCustomStart||fmt(new Date(today.getFullYear(),today.getMonth(),1)),
           end:_ytCustomEnd||fmt(today)};
  }
  const start=new Date();
  start.setDate(start.getDate()-parseInt(period));
  return{start:fmt(start),end:fmt(today)};
}

async function fetchYtChannel(){
  const token=getYtToken();if(!token)return null;
  try{
    const r=await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
      {headers:{Authorization:'Bearer '+token}});
    const d=await r.json();
    return d.items&&d.items[0]?d.items[0]:null;
  }catch(e){return null;}
}

async function fetchYtAnalytics(startDate,endDate){
  const token=getYtToken();if(!token)return null;
  try{
    const p=new URLSearchParams({ids:'channel==MINE',startDate,endDate,
      metrics:'views,estimatedMinutesWatched,subscribersGained,subscribersLost',
      dimensions:'day',sort:'day'});
    const r=await fetch('https://youtubeanalytics.googleapis.com/v2/reports?'+p,
      {headers:{Authorization:'Bearer '+token}});
    return await r.json();
  }catch(e){return null;}
}

async function fetchYtRevenue(startDate,endDate){
  const token=getYtToken();if(!token)return null;
  try{
    const p=new URLSearchParams({ids:'channel==MINE',startDate,endDate,
      metrics:'estimatedRevenue,adImpressions,monetizedPlaybacks',
      dimensions:'day',sort:'day'});
    const r=await fetch('https://youtubeanalytics.googleapis.com/v2/reports?'+p,
      {headers:{Authorization:'Bearer '+token}});
    const d=await r.json();
    if(d.error)return null; // canal não monetizado ou sem permissão
    return d;
  }catch(e){return null;}
}

async function fetchYtTopVideos(){
  const token=getYtToken();if(!token)return[];
  try{
    // Busca top 10 vídeos por views de todos os tempos via Analytics API
    const today=new Date().toISOString().split('T')[0];
    const p=new URLSearchParams({ids:'channel==MINE',startDate:'2015-01-01',endDate:today,
      metrics:'views,estimatedMinutesWatched',dimensions:'video',sort:'-views',maxResults:'10'});
    const ra=await fetch('https://youtubeanalytics.googleapis.com/v2/reports?'+p,
      {headers:{Authorization:'Bearer '+token}});
    const da=await ra.json();
    if(da.rows&&da.rows.length){
      const videoIds=da.rows.map(row=>row[0]).join(',');
      const rd=await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id='+videoIds,
        {headers:{Authorization:'Bearer '+token}});
      const dd=await rd.json();
      if(dd.items&&dd.items.length){
        return da.rows.map(row=>{
          const vid=dd.items.find(v=>v.id===row[0]);
          if(!vid)return null;
          return{...vid,_analyticsViews:row[1],_analyticsWatchMin:row[2]};
        }).filter(Boolean);
      }
    }
    // Fallback: uploads recentes ordenados por views
    return await fetchYtRecentVideos(token);
  }catch(e){return await fetchYtRecentVideos(null);}
}

async function fetchYtRecentVideos(token){
  if(!token)token=getYtToken();
  if(!token)return[];
  try{
    const rc=await fetch('https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true',
      {headers:{Authorization:'Bearer '+token}});
    const dc=await rc.json();
    const uploadsId=dc.items&&dc.items[0]?dc.items[0].contentDetails.relatedPlaylists.uploads:null;
    if(!uploadsId)return[];
    const rp=await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId='+uploadsId+'&maxResults=20',
      {headers:{Authorization:'Bearer '+token}});
    const dp=await rp.json();
    if(!dp.items||!dp.items.length)return[];
    const ids=dp.items.map(i=>i.snippet.resourceId.videoId).join(',');
    const rv=await fetch('https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id='+ids,
      {headers:{Authorization:'Bearer '+token}});
    const dv=await rv.json();
    return(dv.items||[]).sort((a,b)=>parseInt(b.statistics?.viewCount||0)-parseInt(a.statistics?.viewCount||0)).slice(0,10);
  }catch(e){return[];}
}

function ytFmt(n){
  n=parseInt(n||0);
  if(n>=1000000)return(n/1000000).toFixed(1)+'M';
  if(n>=1000)return(n/1000).toFixed(1)+'K';
  return n.toString();
}

async function renderYouTubeData(){
  const token=getYtToken();
  if(!token)return;
  const{start,end}=getYtDates(_ytPeriod);
  // Busca tudo em paralelo
  const[analytics,topVideos,revenueData]=await Promise.all([
    fetchYtAnalytics(start,end),
    fetchYtTopVideos(),
    fetchYtRevenue(start,end)
  ]);

  // Se retornou erro de autorização, mostrar aviso
  if(analytics&&analytics.error){
    console.warn('YouTube Analytics erro:',analytics.error);
    if(analytics.error.code===403||analytics.error.code===401){
      const tb=$('yt-top-videos');
      if(tb)tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;color:#f59e0b;">⚠️ Conecte com tutory@tutory.com.br para ver analytics</td></tr>';
      return;
    }
  }

  // KPIs do analytics
  let totalViews=0,totalWatch=0,totalSubsGained=0,totalSubsLost=0;
  const labels=[],dataViews=[],dataSubs=[],dataSubsCum=[];
  if(analytics&&analytics.rows){
    analytics.rows.forEach(row=>{
      const[day,views,watch,gained,lost]=row;
      totalViews+=views;totalWatch+=watch;
      totalSubsGained+=gained;totalSubsLost+=lost;
      labels.push(day.slice(5));
      dataViews.push(views);
      dataSubs.push(gained-lost);
    });
    let cum=0;dataSubs.forEach(v=>{cum+=v;dataSubsCum.push(cum);});
  }

  if($('yt-views'))$('yt-views').textContent=ytFmt(totalViews);
  if($('yt-watchtime'))$('yt-watchtime').textContent=Math.round(totalWatch/60).toLocaleString('pt-BR')+'h';
  if($('yt-subs-gained'))$('yt-subs-gained').textContent=(totalSubsGained>0?'+':'')+ytFmt(totalSubsGained);
  const periodLabel=_ytPeriod==='mes'?'Mês atual':_ytPeriod==='custom'?(_ytCustomStart+' → '+_ytCustomEnd):'Últimos '+_ytPeriod+' dias';
  if($('yt-chart-period-label'))$('yt-chart-period-label').textContent=periodLabel;

  // KPI Monetização
  const revEl=$('yt-revenue');
  const revSub=$('yt-revenue-sub');
  if(revEl){
    if(revenueData&&revenueData.rows&&revenueData.rows.length){
      let totalRev=0;
      revenueData.rows.forEach(row=>{totalRev+=parseFloat(row[1]||0);});
      // Converte USD → BRL (aproximado)
      const brl=totalRev*5.7;
      revEl.textContent='R$ '+brl.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      if(revSub)revSub.textContent='Receita AdSense no período';
    } else {
      revEl.textContent='—';
      if(revSub)revSub.textContent=revenueData===null?'Canal não monetizado':'No período (AdSense)';
    }
  }

  // Gráfico inscritos (área)
  const ctxS=document.getElementById('yt-chart-subs');
  if(ctxS){
    if(_ytChartSubs)_ytChartSubs.destroy();
    _ytChartSubs=new Chart(ctxS,{type:'line',data:{labels,datasets:[{
      label:'Novos Inscritos',data:dataSubsCum,fill:true,
      backgroundColor:'rgba(255,0,0,0.15)',borderColor:'#FF0000',
      borderWidth:2,pointRadius:0,tension:0.4
    }]},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},
      scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{maxTicksLimit:8,color:'#888',font:{size:10}}},
              y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#888',font:{size:10}}}}}});
  }

  // Gráfico views (barras)
  const ctxV=document.getElementById('yt-chart-views');
  if(ctxV){
    if(_ytChartViews)_ytChartViews.destroy();
    _ytChartViews=new Chart(ctxV,{type:'bar',data:{labels,datasets:[{
      label:'Views',data:dataViews,
      backgroundColor:'rgba(255,0,0,0.6)',borderColor:'#FF0000',borderWidth:0,borderRadius:3
    }]},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},
      scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8,color:'#888',font:{size:10}}},
              y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#888',font:{size:10}}}}}});
  }

  // Top vídeos
  const tb=$('yt-top-videos');
  if(tb){
    if(!topVideos.length){
      tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--sub);">Nenhum vídeo encontrado</td></tr>';
    } else {
      tb.innerHTML=topVideos.map((v,i)=>{
        const views=v._analyticsViews!=null?ytFmt(v._analyticsViews):ytFmt(v.statistics?.viewCount);
        const watchH=v._analyticsWatchMin!=null?Math.round(v._analyticsWatchMin/60).toLocaleString('pt-BR')+'h':'—';
        const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`<span style="color:var(--sub);font-size:11px;">${i+1}</span>`;
        return`<tr style="border-top:1px solid var(--brd2);">
          <td style="padding:8px 12px;text-align:center;width:36px;">${medal}</td>
          <td style="padding:8px 12px;max-width:300px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${v.snippet.thumbnails?.default?.url||''}" style="width:52px;height:38px;object-fit:cover;border-radius:4px;flex-shrink:0;">
              <a href="https://youtube.com/watch?v=${v.id}" target="_blank" style="font-size:11px;color:var(--txt);line-height:1.4;text-decoration:none;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${v.snippet.title}</a>
            </div>
          </td>
          <td style="padding:8px 12px;text-align:right;font-weight:800;color:#FF0000;">${views}</td>
          <td style="padding:8px 12px;text-align:right;color:var(--sub);">${watchH}</td>
          <td style="padding:8px 12px;text-align:right;color:#22c55e;">❤️ ${ytFmt(v.statistics?.likeCount)}</td>
        </tr>`;
      }).join('');
    }
  }
}

async function renderYouTube(){
  const token=getYtToken();
  const disconnected=$('yt-disconnected');
  const kpis=$('yt-kpis');
  const filterBar=$('yt-filter-bar');
  const connectBtn=$('yt-connect-btn');
  const disconnectBtn=$('yt-disconnect-btn');

  if(!token){
    if(disconnected)disconnected.style.display='block';
    if(kpis)kpis.style.display='none';
    if(filterBar)filterBar.style.display='none';
    if(connectBtn){connectBtn.textContent='▶ Conectar YouTube';connectBtn.style.background='#FF0000';connectBtn.style.display='flex';}
    if(disconnectBtn)disconnectBtn.style.display='none';
    if($('yt-channel-name'))$('yt-channel-name').textContent='YouTube';
    if($('yt-channel-sub'))$('yt-channel-sub').textContent='Conecte sua conta para ver os dados';
    return;
  }

  if(disconnected)disconnected.style.display='none';
  if(kpis)kpis.style.display='block';
  if(filterBar)filterBar.style.display='flex';
  if(connectBtn){connectBtn.textContent='✅ Conectado';connectBtn.style.background='#16a34a';}
  if(disconnectBtn)disconnectBtn.style.display='inline-block';

  // Info do canal
  const ch=await fetchYtChannel();
  if(ch){
    const channelTitle=ch.snippet.title||'';
    if($('yt-channel-name'))$('yt-channel-name').textContent=channelTitle;
    if($('yt-channel-sub'))$('yt-channel-sub').textContent=ytFmt(ch.statistics.subscriberCount)+' inscritos · '+ytFmt(ch.statistics.videoCount)+' vídeos';
    if($('yt-subs-total'))$('yt-subs-total').textContent=ytFmt(ch.statistics.subscriberCount);
    if($('yt-video-count'))$('yt-video-count').textContent=ytFmt(ch.statistics.videoCount);
    const avatar=$('yt-channel-avatar');
    if(avatar){avatar.src=ch.snippet.thumbnails?.default?.url||'';avatar.style.display='block';}
    // Verifica se é o canal certo
    const lower=(channelTitle||'').toLowerCase();
    const isTutory=lower.includes('tutory');
    if(!isTutory){
      if($('yt-channel-sub'))$('yt-channel-sub').innerHTML=
        '⚠️ <span style="color:#f59e0b;">Conta errada: <b>'+channelTitle+'</b>. Clique em "Trocar conta" abaixo.</span>';
      if(connectBtn){connectBtn.textContent='🔄 Trocar conta';connectBtn.style.background='#f59e0b';connectBtn.onclick=()=>connectYouTube(true);}
    } else {
      if(connectBtn){connectBtn.textContent='✅ Conectado';connectBtn.style.background='#16a34a';connectBtn.onclick=()=>{};}
    }
  } else {
    // Canal não encontrado — conta errada ou sem canal
    if($('yt-channel-name'))$('yt-channel-name').textContent='Conta errada';
    if($('yt-channel-sub'))$('yt-channel-sub').innerHTML=
      '⚠️ <span style="color:#f59e0b;">Conecte com <b>tutory@tutory.com.br</b> para ver os dados do canal</span>';
    if(connectBtn){connectBtn.textContent='🔄 Trocar conta';connectBtn.style.background='#f59e0b';connectBtn.onclick=()=>connectYouTube(true);}
  }
  await renderYouTubeData();
}

// INIT
document.addEventListener('DOMContentLoaded',async ()=>{
  // Restaurar tema salvo
  if(localStorage.getItem('tutory_theme')==='light'){
    document.documentElement.classList.add('light-mode');
    const _ti=document.getElementById('theme-icon');const _tl=document.getElementById('theme-label');
    if(_ti)_ti.textContent='🌙';if(_tl)_tl.textContent='Modo Escuro';
  }
  const saved=sessionStorage.getItem('tutory_claude_key');
  if(saved&&$('claude-key-input'))$('claude-key-input').value=saved;
  // Inicializa token Meta (troca para longa duração se necessário)
  await initMetaToken();
  initYouTubeAuth();
  initGoogleAdsAuth();
  renderGeral();updateFab('geral');
});

