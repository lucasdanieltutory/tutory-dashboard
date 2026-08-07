// core.js — login, autenticação, tokens Meta/YouTube/Google Ads, helpers Supabase (supaFetch/supaInsert)
const _CREDS={'admin@tutory.com':'tutory@admin2026','beatriz.vasconcelos@tutory.com.br':'tutory@sdr2026','beijamim@tutory.com.br':'tutory@beijamim2026','juda@tutory.com.br':'tutory@juda2026','efraim@tutory.com.br':'tutory@efraim2026','lider@tutory.com.br':'tutory@lider2026'};
function doLogin(){
  const u=(document.getElementById('usr')||{value:''}).value.trim().toLowerCase();
  const v=document.getElementById('pwd').value;
  const role=_CREDS[u]===v?(u.startsWith('admin')?'admin':u.startsWith('beijamim')?'beijamim':u.startsWith('juda')?'gam_juda':u.startsWith('efraim')?'gam_efraim':u.startsWith('lider')?'gam_lider':'sdr'):'';
  if(role){
    sessionStorage.setItem('tutory_auth','1');
    sessionStorage.setItem('tutory_role',role);
    document.getElementById('login-screen').style.display='none';
    _applyRole(role);
  } else {
    document.getElementById('lerr').classList.add('show');
    setTimeout(()=>document.getElementById('lerr').classList.remove('show'),3000);
  }
}
function _applyRole(role){
  if(role==='sdr'){
    document.querySelectorAll('.sb-item').forEach(t=>{
      if(!t.textContent.includes('Prospec'))t.style.display='none';
    });
  } else if(role==='beijamim'){
    document.querySelectorAll('.sb-item').forEach(t=>{
      if(!t.textContent.includes('Beijamim'))t.style.display='none';
    });
    const bj=document.querySelector('.sb-item[onclick*="beijamim"]');
    if(bj)bj.click();
  } else if(role==='gam_juda'||role==='gam_efraim'||role==='gam_lider'){
    document.querySelectorAll('.sb-item').forEach(t=>{
      if(!t.textContent.includes('Gamificação'))t.style.display='none';
    });
    const gm=document.querySelector('.sb-item[onclick*="gamificacao"]');
    if(gm)gm.click();
  }
}
if(sessionStorage.getItem('tutory_auth')==='1'){
  document.addEventListener('DOMContentLoaded',function(){
    const s=document.getElementById('login-screen');
    if(s)s.style.display='none';
    _applyRole(sessionStorage.getItem('tutory_role')||'admin');
  });
}

// CONFIG SUPABASE
const SUPA_URL='https://stgzgtpcuhtayglignik.supabase.co';
const SUPA_KEY='sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';
// META ADS API
const META_ACCOUNT='act_1448033875601177';
const META_APP_ID='754854064155303';
const META_APP_SECRET='ba8b85346ded8d82f117e87a85a1f054';
const _META_FALLBACK='EAAKuiShZA6qcBRSwOPpOjaxns9CnCtDmXbsLPVMYrY00naDV5Ag2KVWLVJlp9DCdIh2cMnHtlvZBEg3vtOz6AKV0F2GHWmEP1cpgFBV09wq2y1Nf9oxBnAYH9tbOVOYRlCLXawZBUppg7gcpG66r7E906XCYmEEPmgD6nigzEYrocrxjgMdu8DGynXPYCLfUsK4hqvj1o8MLanxuxKTC65QKlrHVkLacDugAvSdRmwsxyyPyh03U0RjcdlZCZA13Sk64LQWW5wBCu8ynFXsCK';

function getMetaToken(){
  const stored=localStorage.getItem('tutory_meta_token');
  const expiry=parseInt(localStorage.getItem('tutory_meta_token_expiry')||'0');
  if(stored&&expiry&&Date.now()<expiry-86400000)return stored.trim();
  if(stored&&!expiry)return stored.trim(); // token sem prazo (curto)
  return _META_FALLBACK;
}

// ── YouTube token sync (Supabase) ──────────────────────────────
async function saveYtTokenToSupabase(token,expiry){
  try{
    await fetch(`${SUPA_URL}/rest/v1/configuracoes`,{
      method:'POST',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,
        'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({chave:'yt_token',valor:token,expiry:expiry})
    });
  }catch(e){}
}

async function loadYtTokenFromSupabase(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/configuracoes?chave=eq.yt_token&limit=1`,{
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}
    });
    if(!r.ok)return false;
    const d=await r.json();
    if(!d||!d[0]||!d[0].valor)return false;
    const token=d[0].valor;
    const expiry=parseInt(d[0].expiry||0);
    if(!expiry||Date.now()>expiry-60000)return false;
    localStorage.setItem('tutory_yt_token',token);
    localStorage.setItem('tutory_yt_token_expiry',String(expiry));
    return true;
  }catch(e){return false;}
}

async function saveYtRefreshToSupabase(token){
  try{
    await fetch(`${SUPA_URL}/rest/v1/configuracoes`,{
      method:'POST',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,
        'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({chave:'yt_refresh_token',valor:token,expiry:9999999999999})
    });
    console.log('🔑 Refresh token YouTube salvo no Supabase (permanente)');
  }catch(e){}
}

async function loadYtRefreshFromSupabase(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/configuracoes?chave=eq.yt_refresh_token&limit=1`,{
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}
    });
    if(!r.ok)return false;
    const d=await r.json();
    if(!d||!d[0]||!d[0].valor)return false;
    _ytRefreshToken=d[0].valor;
    localStorage.setItem('tutory_yt_refresh_token',_ytRefreshToken);
    return true;
  }catch(e){return false;}
}

async function deleteYtRefreshFromSupabase(){
  try{
    await fetch(`${SUPA_URL}/rest/v1/configuracoes?chave=eq.yt_refresh_token`,{
      method:'DELETE',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}
    });
  }catch(e){}
}
// ───────────────────────────────────────────────────────────────

async function saveTokenToSupabase(token, expiry){
  try{
    await fetch(`${SUPA_URL}/rest/v1/configuracoes`,{
      method:'POST',
      headers:{
        'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,
        'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'
      },
      body:JSON.stringify({chave:'meta_token',valor:token,expiry:expiry})
    });
  }catch(e){}
}

async function loadTokenFromSupabase(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/configuracoes?chave=eq.meta_token&limit=1`,{
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}
    });
    if(!r.ok)return false;
    const d=await r.json();
    if(!d||!d[0]||!d[0].valor)return false;
    const token=d[0].valor;
    const expiry=d[0].expiry||0;
    if(expiry&&Date.now()>expiry-86400000)return false; // expirado
    // Salva localmente
    localStorage.setItem('tutory_meta_token',token);
    if(expiry)localStorage.setItem('tutory_meta_token_expiry',String(expiry));
    console.log('✅ Token Meta carregado do Supabase');
    return true;
  }catch(e){return false;}
}

async function exchangeLongLivedToken(shortToken){
  try{
    const url='https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token'
      +'&client_id='+META_APP_ID
      +'&client_secret='+META_APP_SECRET
      +'&fb_exchange_token='+shortToken;
    const res=await fetch(url);
    const data=await res.json();
    if(data.access_token){
      // expires_in===0 → token de Usuário do Sistema: nunca expira
      const neverExpires=('expires_in' in data)&&Number(data.expires_in)===0;
      if(neverExpires){
        localStorage.setItem('tutory_meta_token',data.access_token);
        localStorage.removeItem('tutory_meta_token_expiry');
        saveTokenToSupabase(data.access_token, 0); // 0 = permanente
        console.log('✅ Token Meta permanente (Usuário do Sistema) salvo.');
        return data.access_token;
      }
      const expiresIn=data.expires_in||5183944; // ~60 dias padrão
      const expiry=Date.now()+expiresIn*1000;
      localStorage.setItem('tutory_meta_token',data.access_token);
      localStorage.setItem('tutory_meta_token_expiry',String(expiry));
      // Salva no Supabase para todos os navegadores
      saveTokenToSupabase(data.access_token, expiry);
      const expiryDate=new Date(expiry).toLocaleDateString('pt-BR');
      console.log('✅ Token Meta de longa duração obtido. Expira em:',expiryDate);
      return data.access_token;
    }
    console.warn('Erro ao trocar token:',data.error&&data.error.message);
    return null;
  }catch(e){console.warn('exchangeLongLivedToken:',e);return null;}
}

async function initMetaToken(){
  const stored=localStorage.getItem('tutory_meta_token');
  const expiry=parseInt(localStorage.getItem('tutory_meta_token_expiry')||'0');
  const isValid=stored&&expiry&&Date.now()<expiry-86400000;
  if(isValid){
    // Token local válido — sincroniza pro Supabase para todos os outros navegadores
    saveTokenToSupabase(stored,expiry);
    return;
  }
  // Tenta buscar do Supabase (token salvo por outro navegador)
  const fromSupa=await loadTokenFromSupabase();
  if(fromSupa){
    Object.keys(_metaCache).forEach(k=>delete _metaCache[k]);
    return;
  }
  // Tenta trocar fallback por token de 60 dias
  localStorage.removeItem('tutory_meta_token');
  localStorage.removeItem('tutory_meta_token_expiry');
  const longLived=await exchangeLongLivedToken(_META_FALLBACK);
  if(longLived){
    Object.keys(_metaCache).forEach(k=>delete _metaCache[k]);
    console.log('✅ Token Meta renovado automaticamente por 60 dias');
  }
}

const _metaCache={};
async function fetchMetaInsights(since,until){
  const token=getMetaToken();
  const _ck=since+'|'+until;
  if(_metaCache[_ck])return _metaCache[_ck];
  if(!token)return null;
  try{
    const fields='campaign_name,spend,impressions,clicks,reach,actions';
    const tr=JSON.stringify({since:since,until:until});
    const url='https://graph.facebook.com/v19.0/'+META_ACCOUNT+'/insights?fields='+encodeURIComponent(fields)+'&time_range='+encodeURIComponent(tr)+'&level=campaign&limit=500&access_token='+token;
    const res=await fetch(url);
    const data=await res.json();
    if(data.error){
      console.warn('Meta API:',data.error.message);
      // Mostra banner de aviso se token inválido/expirado
      if(data.error.code===190||data.error.type==='OAuthException'){
        let _b=document.getElementById('meta-token-banner');
        if(!_b){
          _b=document.createElement('div');
          _b.id='meta-token-banner';
          _b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#7F1D1D,#991B1B);color:#fff;padding:10px 20px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,.4);';
          _b.innerHTML='<span>⚠️ Token Meta Ads expirado — os investimentos exibidos são dados desatualizados.</span>'
            +'<button onclick="openMetaTokenModal()" style="background:#1877F2;border:none;color:#fff;padding:5px 16px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">🔑 Renovar Token (60 dias)</button>';
          document.body.prepend(_b);
        }
      }
      return null;
    }
    // Handle pagination
    let rows=data.data||[];
    let next=data.paging&&data.paging.next;
    while(next){
      const r2=await fetch(next);const d2=await r2.json();
      rows=rows.concat(d2.data||[]);
      next=d2.paging&&d2.paging.next;
    }
    _metaCache[_ck]=rows;return rows;
  }catch(e){console.warn('Meta fetch:',e);return null;}
}
function metaClassify(name){
  const n=(name||'').toLowerCase();
  if(n.includes('hub'))return'hub';
  if(n.includes('experience'))return'experience';
  if(n.includes('mentoria'))return'mentoria';
  if(n.includes('gms'))return'mentoria';
  // Todas as demais campanhas da conta são de Mentoria por padrão
  // (Hub e Experience sempre têm suas palavras no nome)
  return'mentoria';
}
function metaGetRegistros(actions){
  // Pega "Registros concluídos" (complete_registration) ou "lead"
  if(!actions||!actions.length)return 0;
  const reg=actions.find(a=>a.action_type==='complete_registration')||
            actions.find(a=>a.action_type==='lead')||
            actions.find(a=>a.action_type==='onsite_conversion.lead_grouped');
  return reg?parseInt(reg.value||0):0;
}
function metaSumByPlatform(insights){
  const r={mentoria:0,hub:0,experience:0,total:0,
           leads_mentoria:0,leads_hub:0,leads_experience:0};
  if(!insights||!insights.length)return r;
  insights.forEach(function(c){
    const spend=parseFloat(c.spend||0);
    const plat=metaClassify(c.campaign_name);
    const regs=metaGetRegistros(c.actions);
    if(plat){
      r[plat]=(r[plat]||0)+spend;
      r.total+=spend;
      r['leads_'+plat]=(r['leads_'+plat]||0)+regs;
    }
  });
  return r;
}
async function saveMetaToken(){
  const inp=document.getElementById('cfg-meta-token-inp');
  if(!inp)return;
  const t=inp.value.trim();
  if(!t)return;
  const st=document.getElementById('cfg-meta-status');
  if(st){st.textContent='⏳ Trocando por token de 60 dias...';st.className='cfg-int-status';}
  // Tenta trocar por token de longa duração
  const longLived=await exchangeLongLivedToken(t);
  if(longLived){
    const expiry=parseInt(localStorage.getItem('tutory_meta_token_expiry')||'0');
    const expiryDate=new Date(expiry).toLocaleDateString('pt-BR');
    if(st){st.textContent='● Ativo até '+expiryDate;st.className='cfg-int-status on';}
    alert('✅ Token de 60 dias ativado! Expira em: '+expiryDate+'\nAtualizando dados...');
  } else {
    // Não trocou (ex.: token permanente de Usuário do Sistema) — salva direto
    localStorage.setItem('tutory_meta_token',t);
    localStorage.removeItem('tutory_meta_token_expiry');
    saveTokenToSupabase(t, 0); // 0 = permanente, vale em qualquer dispositivo
    if(st){st.textContent='● Ativo (permanente)';st.className='cfg-int-status on';}
    alert('✅ Token salvo (permanente). Atualizando dados...');
  }
  Object.keys(_metaCache).forEach(k=>delete _metaCache[k]);
  location.reload();
}

function openMetaTokenModal(){
  let m=document.getElementById('meta-token-modal');
  if(m){m.style.display='flex';return;}
  m=document.createElement('div');
  m.id='meta-token-modal';
  m.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;';
  m.innerHTML=`
    <div style="background:#1a1a2e;border:1px solid #333;border-radius:16px;padding:28px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.6);">
      <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:6px;">🔑 Renovar Token Meta Ads</div>
      <div style="font-size:12px;color:#aaa;margin-bottom:20px;">Token de 60 dias — você só precisa fazer isso a cada 2 meses</div>
      <div style="background:#0f172a;border-radius:10px;padding:14px;margin-bottom:16px;font-size:12px;color:#94a3b8;line-height:1.8;">
        <b style="color:#fff;">Passo 1:</b> Clique no botão abaixo para abrir o Graph API Explorer<br>
        <b style="color:#fff;">Passo 2:</b> Clique em <b style="color:#60a5fa;">"Generate Access Token"</b><br>
        <b style="color:#fff;">Passo 3:</b> Marque <b style="color:#60a5fa;">ads_read</b> → Gerar → Copiar<br>
        <b style="color:#fff;">Passo 4:</b> Cole o token abaixo e clique Salvar
      </div>
      <a href="https://developers.facebook.com/tools/explorer/?app_id=754854064155303&method=GET&path=me&version=v19.0" target="_blank"
        style="display:block;text-align:center;background:#1877F2;color:#fff;text-decoration:none;border-radius:8px;padding:10px;font-size:13px;font-weight:700;margin-bottom:14px;">
        🔗 Abrir Graph API Explorer
      </a>
      <div style="display:flex;gap:8px;">
        <input id="meta-modal-token-inp" type="text" placeholder="Cole aqui o token copiado..."
          style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:9px 12px;font-size:12px;color:#fff;outline:none;">
        <button onclick="saveMetaTokenFromModal()"
          style="background:#22c55e;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">
          Salvar
        </button>
      </div>
      <button onclick="document.getElementById('meta-token-modal').style.display='none'"
        style="width:100%;margin-top:12px;background:transparent;border:1px solid #333;border-radius:8px;padding:8px;font-size:12px;color:#666;cursor:pointer;">
        Fechar
      </button>
    </div>`;
  document.body.appendChild(m);
}
async function saveMetaTokenFromModal(){
  const inp=document.getElementById('meta-modal-token-inp');
  if(!inp||!inp.value.trim()){alert('Cole o token primeiro.');return;}
  const t=inp.value.trim();
  inp.disabled=true;
  const longLived=await exchangeLongLivedToken(t);
  if(longLived){
    const expiry=parseInt(localStorage.getItem('tutory_meta_token_expiry')||'0');
    const expiryDate=new Date(expiry).toLocaleDateString('pt-BR');
    document.getElementById('meta-token-modal').style.display='none';
    const b=document.getElementById('meta-token-banner');if(b)b.remove();
    Object.keys(_metaCache).forEach(k=>delete _metaCache[k]);
    alert('✅ Token de 60 dias ativado!\nExpira em: '+expiryDate+'\nAtualizando dados...');
    location.reload();
  } else {
    // Não trocou (ex.: já é token permanente de Usuário do Sistema) — salva direto
    localStorage.setItem('tutory_meta_token',t);
    localStorage.removeItem('tutory_meta_token_expiry');
    saveTokenToSupabase(t, 0); // 0 = permanente, vale em qualquer dispositivo
    document.getElementById('meta-token-modal').style.display='none';
    const b=document.getElementById('meta-token-banner');if(b)b.remove();
    Object.keys(_metaCache).forEach(k=>delete _metaCache[k]);
    alert('✅ Token salvo (permanente). Atualizando dados...');
    location.reload();
  }
}

async function connectMetaFacebook(){
  if(typeof FB==='undefined'){alert('SDK do Facebook ainda carregando, aguarde 2 segundos e tente novamente.');return;}
  FB.login(async function(response){
    if(!response||!response.authResponse){
      // Usuário cancelou
      return;
    }
    const shortToken=response.authResponse.accessToken;
    const banner=document.getElementById('meta-token-banner');
    if(banner)banner.remove();
    // Exibe aviso de carregamento
    const _st=document.getElementById('cfg-meta-status');
    if(_st){_st.textContent='⏳ Obtendo token de 60 dias...';_st.className='cfg-int-status';}
    const longLived=await exchangeLongLivedToken(shortToken);
    if(longLived){
      const expiry=parseInt(localStorage.getItem('tutory_meta_token_expiry')||'0');
      const expiryDate=new Date(expiry).toLocaleDateString('pt-BR');
      Object.keys(_metaCache).forEach(k=>delete _metaCache[k]);
      alert('✅ Meta Ads conectado!\nToken válido por 60 dias (até '+expiryDate+').\nAtualizando dados...');
      location.reload();
    } else {
      alert('Erro ao trocar token. Tente novamente.');
    }
  },{scope:'ads_read',return_scopes:true});
}

function getClaudeKey(){return(localStorage.getItem('tutory_claude_key')||'').trim();}
const CLAUDE_KEY=null;

async function supaFetch(table, params=''){
  const r=await fetch(`${SUPA_URL}/rest/v1/${table}?${params}`,{
    headers:{
      'apikey':SUPA_KEY,
      'Authorization':'Bearer '+SUPA_KEY,
      'Content-Type':'application/json'
    }
  });
  if(!r.ok) throw new Error('Supabase error: '+r.status);
  return r.json();
}

async function supaInsert(table, body){
  const r=await fetch(`${SUPA_URL}/rest/v1/${table}`,{
    method:'POST',
    headers:{
      'apikey':SUPA_KEY,
      'Authorization':'Bearer '+SUPA_KEY,
      'Content-Type':'application/json',
      'Prefer':'return=minimal'
    },
    body:JSON.stringify(body)
  });
  if(!r.ok){const e=await r.text();throw new Error(e);}
  return true;
}
