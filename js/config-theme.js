// config-theme.js — modal de configurações, tema, logout
function openConfig(){
  const overlay=document.getElementById('cfg-overlay');
  if(!overlay)return;
  // Atualizar dados do usuário
  const email=sessionStorage.getItem('tutory_user')||'admin@tutory.com';
  const role=sessionStorage.getItem('tutory_role')||'admin';
  const emailEl=document.getElementById('cfg-user-email');
  if(emailEl)emailEl.textContent=email;
  const badge=document.getElementById('cfg-role-badge');
  if(badge){
    badge.textContent=role.toUpperCase();
    badge.className='cfg-access-badge '+(role==='admin'?'admin':'sdr');
  }
  // Atualizar ícone
  const icon=overlay.querySelector('.cfg-access-icon');
  if(icon)icon.textContent=role==='admin'?'👑':'🎯';
  // Atualizar status do token Meta
  const _mt=getMetaToken();
  const metaSt=document.getElementById('cfg-meta-status');
  if(metaSt){metaSt.textContent=_mt?'● Ativo':'● Sem token';metaSt.className='cfg-int-status '+(_mt?'on':'off');}
  const metaInp=document.getElementById('cfg-meta-token-inp');
  if(metaInp&&_mt)metaInp.value=_mt;
  overlay.classList.add('open');
}
function closeConfig(){
  const overlay=document.getElementById('cfg-overlay');
  if(overlay)overlay.classList.remove('open');
}
function toggleTheme(){
  const isLight=document.documentElement.classList.toggle('light-mode');
  localStorage.setItem('tutory_theme',isLight?'light':'dark');
  const icon=document.getElementById('theme-icon');
  const lbl=document.getElementById('theme-label');
  if(icon)icon.textContent=isLight?'🌙':'☀️';
  if(lbl)lbl.textContent=isLight?'Modo Escuro':'Modo Claro';
}
function doLogout(){
  if(!confirm('Deseja sair do dashboard?'))return;
  sessionStorage.removeItem('tutory_auth');
  sessionStorage.removeItem('tutory_role');
  sessionStorage.removeItem('tutory_user');
  const ls=document.getElementById('login-screen');
  if(ls)ls.style.display='flex';
  document.getElementById('usr').value='';
  document.getElementById('pwd').value='';
}

/* ════════════════════════════════════════════════════════
   PROSPECÇÕES BEIJAMIM — Supabase engine (real-time)
   Tabela: prospeccoes_beijamim
   ════════════════════════════════════════════════════════ */
var BJ_TABLE='prospeccoes_beijamim';
var _bjPieChart=null;
var _bjModal_tipo='hub';
var _bjRefreshTimer=null;

/* Leads iniciais (seed na 1ª vez que a tabela estiver vazia) */
var BJ_INITIAL=[
  {tipo:'hub',nome:'Deltamat Curso de Matemática',        instagram:'cursodeltamat',               plataforma:'Hotmart',   obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Maria Helena Alves | Inglês Militar', instagram:'teachermariahelena',          plataforma:'Kiwify',    obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Rodrigo Rodrigues',                   instagram:'profrodrigoues',              plataforma:'Hotmart',   obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Gabriel Tersi',                       instagram:'delegadotersi',               plataforma:'Eduzz',     obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'GPS da Aprovação',                    instagram:'gpsdaaprovacao.oficial',      plataforma:'Hotmart',   obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'CURSO PRESSÃO',                       instagram:'cursopressao',                plataforma:'Herospark', obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Professor Rudi',                      instagram:'professor_rudi',              plataforma:'Hotmart',   obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Elite Policial',                      instagram:'elitepolicialofc',            plataforma:'Hubla',     obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Polícia Penal',                       instagram:'policiapenal_ppmg',           plataforma:'Hotmart',   obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Santiago',                            instagram:'_wandersonsantiago',          plataforma:'Kiwify',    obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Carreiras Policiais',                 instagram:'carreirapolicial190',         plataforma:'Kiwify',    obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Aprovação Tribunais',                 instagram:'aprovacao.tribunais',         plataforma:'Hotmart',   obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Fabrício Guimarães',                  instagram:'prof.fabricioguimaraes',      plataforma:'Hotmart',   obs:'',classificacao:'Pré-qualificado'},
  {tipo:'hub',nome:'Preparatório Roberto Quintino',       instagram:'preparatorio_robertoquintino',plataforma:'Eduzz',     obs:'',classificacao:'Pré-qualificado'},
];

/* ── SUPABASE HELPERS ── */
