const C=window.WASSCE_CONFIG;
const db=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_PUBLISHABLE_KEY);
let user=null,role='student',profile=null,resources=[],testKey='',questions=[],qi=0,score=0,answers=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tests={
 math:{title:'Core Mathematics Quick Practice',questions:[['If a trader buys an item for GH₵450 and makes 20% profit, what is the selling price?',['GH₵500','GH₵520','GH₵540','GH₵560'],2],['Which is equal to 72 km/h?',['10 m/s','20 m/s','30 m/s','40 m/s'],1],['n(A)=20, n(B)=15 and n(A∩B)=8. Find n(A∪B).',['27','28','35','43'],0],['12.5% of GH₵3,200 is?',['GH₵200','GH₵300','GH₵400','GH₵500'],2],['√48 + √75 − 2√3 equals?',['5√3','7√3','9√3','11√3'],1]]},
 science:{title:'Integrated Science Quick Practice',questions:[['Which organelle contains chlorophyll?',['Nucleus','Vacuole','Chloroplast','Ribosome'],2],['The main function of a plant cell wall is?',['Support','Digestion','Respiration','Movement'],0],['Which is a renewable energy source?',['Coal','Natural gas','Solar','Diesel'],2],['Erosion involves the wearing away and transport of?',['Soil/material','Sound','Light','Heat'],0],['Oxidation may involve?',['Gain of oxygen','Freezing','Melting only','No chemical change'],0]]},
 government:{title:'Government Quick Practice',questions:[['ECOWAS is a?',['Regional organization','Political party','Court','Military rank'],0],['Rule of law means?',['Leaders are above law','Everyone is subject to law','Only judges obey law','Laws are optional'],1],['The legislature primarily?',['Makes laws','Runs schools','Conducts elections only','Interprets weather'],0],['A referendum is?',['A public vote on a specific issue','A court ruling','A budget','A census'],0],['A constitution provides a?',['Framework for government','Market price list','School timetable','Weather forecast'],0]]}
};
function toast(t){const el=$('toast');if(el){el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}else alert(t)}
async function init(){
 const {data}=await db.auth.getUser();
 user=data.user||null;
 if(user) await loadProfile();
 db.auth.onAuthStateChange(async(_event,session)=>{user=session?.user||null;role='student';profile=null;if(user)await loadProfile();updateUI();await loadResources();await dashboard();if(role==='admin')await loadAdmin();});
 await loadResources();updateUI();await dashboard();
}
async function loadProfile(){const q=await db.from('profiles').select('*').eq('id',user.id).maybeSingle();profile=q.data;role=profile?.role||'student';user.displayName=profile?.full_name||user.user_metadata?.full_name||user.email;}
async function loadResources(){
 const q=await db.from('resources').select('*').eq('published',true).order('created_at',{ascending:false});
 if(q.error){$('status').textContent='Supabase resource query error';toast(q.error.message);return}
 resources=q.data||[];$('count').textContent=resources.length;$('subjects').textContent=new Set(resources.map(r=>r.subject)).size;fillFilters();render();
}
function fillFilters(){
 const opts=(id,vals,label)=>$(id).innerHTML='<option value="">All '+label+'</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
 opts('subject',[...new Set(resources.map(r=>r.subject))].sort(),'subjects');opts('type',[...new Set(resources.map(r=>r.type))].sort(),'types');opts('year',[...new Set(resources.map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a),'years');
}
async function getSavedIds(){if(!user)return new Set();const q=await db.from('saved_resources').select('resource_id').eq('user_id',user.id);return new Set((q.data||[]).map(x=>x.resource_id));}
async function render(){
 const q=($('search').value||'').toLowerCase(),s=$('subject').value,t=$('type').value,y=$('year').value,saved=await getSavedIds();
 const a=resources.filter(r=>(!q||`${r.title} ${r.subject} ${r.year} ${r.paper}`.toLowerCase().includes(q))&&(!s||r.subject===s)&&(!t||r.type===t)&&(!y||String(r.year)===y));
 $('cards').innerHTML=a.map(r=>{const isSaved=saved.has(r.id);return `<article class="card"><div class="tag">PDF · ${esc(r.type)}</div><h3>${esc(r.title)}</h3><p>${esc(r.subject)} · ${esc(r.paper||'General')} ${r.year?'· '+esc(r.year):''}</p><div class="cardActions"><button class="save ${isSaved?'saved':''}" data-id="${r.id}">${isSaved?'♥ Saved':'♡ Save'}</button><a href="${esc(r.file_url)}" target="_blank" rel="noopener">Open</a><a class="download" href="${esc(r.file_url)}" download>Download</a></div></article>`}).join('')||'<div class="empty">No resources found.</div>';
 document.querySelectorAll('.save').forEach(b=>b.onclick=()=>save(b.dataset.id));
}
async function save(id){
 if(!user){openAuth();return}
 const q=await db.from('saved_resources').select('resource_id').eq('user_id',user.id).eq('resource_id',id).maybeSingle();
 if(q.data){const r=await db.from('saved_resources').delete().eq('user_id',user.id).eq('resource_id',id);if(r.error)toast(r.error.message);else toast('Removed from saved resources.');}
 else {const r=await db.from('saved_resources').insert({user_id:user.id,resource_id:id});if(r.error)toast(r.error.message);else toast('Saved to your account.');}
 await render();await dashboard();
}
function updateUI(){$('authBtn').textContent=user?'Account':'Sign in';$('adminBtn').classList.toggle('hidden',role!=='admin');$('status').textContent=user?`Signed in securely · ${role}`:'Supabase backend connected';}
let authMode=true;
function openAuth(){ $('authModal').classList.remove('hidden');setAuthMode(); }
function setAuthMode(){$('authTitle').textContent=authMode?'Create your account':'Welcome back';$('fullName').classList.toggle('hidden',!authMode);$('switchAuth').textContent=authMode?'Already have an account? Sign in':'Create an account';$('authMsg').textContent='';}
$('authForm').onsubmit=async e=>{e.preventDefault();$('authMsg').textContent='Working…';const email=$('email').value.trim(),password=$('password').value;const r=authMode?await db.auth.signUp({email,password,options:{data:{full_name:$('fullName').value.trim()}}}):await db.auth.signInWithPassword({email,password});if(r.error){$('authMsg').textContent=r.error.message;return}$('authMsg').textContent=authMode?'Account created. Check your email if confirmation is enabled.':'Signed in successfully.';setTimeout(()=>$('authModal').classList.add('hidden'),700)};
$('switchAuth').onclick=()=>{authMode=!authMode;setAuthMode()};
$('google').onclick=async()=>{const r=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href}});if(r.error)$('authMsg').textContent=r.error.message};
$('reset').onclick=async()=>{if(!$('email').value){$('authMsg').textContent='Enter your email first.';return}const r=await db.auth.resetPasswordForEmail($('email').value.trim(),{redirectTo:location.href});$('authMsg').textContent=r.error?.message||'Password reset email sent.'};
async function dashboard(){
 if(!user){$('dashboard').innerHTML='<div class="empty"><b>Sign in to see your personal progress.</b><p>Your saved resources and practice results will be stored in Supabase.</p><button class="btn" onclick="openAuth()">Sign in</button></div>';return}
 const [saved,results]=await Promise.all([db.from('saved_resources').select('resource_id',{count:'exact',head:true}).eq('user_id',user.id),db.from('practice_results').select('score,total,percentage,test_title,completed_at').eq('user_id',user.id).order('completed_at',{ascending:false})]);
 const rows=results.data||[],avg=rows.length?Math.round(rows.reduce((a,x)=>a+Number(x.percentage),0)/rows.length):0;
 $('savedCount').textContent=saved.count||0;
 $('dashboard').innerHTML=`<div class="dashHead"><div><span class="pill">${esc(role)}</span><h3>${esc(user.displayName||user.email)}</h3><p>${esc(user.email)}</p></div><button class="btn ghost" id="logout">Log out</button></div><div class="dashStats"><div><b>${saved.count||0}</b><small>Saved</small></div><div><b>${rows.length}</b><small>Practice attempts</small></div><div><b>${avg}%</b><small>Average score</small></div></div><div class="history"><h3>Recent practice results</h3>${rows.slice(0,8).map(r=>`<div class="historyRow"><span>${esc(r.test_title)}</span><b>${r.score}/${r.total} · ${Math.round(Number(r.percentage))}%</b><small>${new Date(r.completed_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No practice attempts yet.</p>'}</div>`;
 $('logout').onclick=async()=>{await db.auth.signOut()};
}
function startTest(k){if(!user){openAuth();return}testKey=k;questions=tests[k].questions;qi=0;score=0;answers=[];$('testModal').classList.remove('hidden');showQ();}
function showQ(){if(qi>=questions.length){finishTest();return}const q=questions[qi];$('test').innerHTML=`<label>QUESTION ${qi+1} OF ${questions.length}</label><h2>${esc(q[0])}</h2><div class="answers">${q[1].map((a,i)=>`<button data-a="${i}">${String.fromCharCode(65+i)}. ${esc(a)}</button>`).join('')}</div>`;document.querySelectorAll('.answers button').forEach(b=>b.onclick=()=>{const chosen=+b.dataset.a;answers.push({question:qi+1,chosen,correct:q[2]});if(chosen===q[2])score++;qi++;showQ()});}
async function finishTest(){const total=questions.length,p=Math.round(score/total*100);const r=await db.from('practice_results').insert({user_id:user.id,test_key:testKey,test_title:tests[testKey].title,score,total,answers});if(r.error){$('test').innerHTML=`<div class="result"><h2>${score}/${total}</h2><p>Score: ${p}%</p><p class="error">Result could not be saved: ${esc(r.error.message)}</p><button class="btn" data-close="testModal">Done</button></div>`;}else{$('test').innerHTML=`<div class="result"><div class="trophy">🏆</div><h2>${score}/${total}</h2><p>Your score: ${p}%</p><p>Saved securely to your Supabase account.</p><button class="btn" id="doneTest">Done</button></div>`;$('doneTest').onclick=async()=>{$('testModal').classList.add('hidden');await dashboard()}}
}
async function loadAdmin(){if(role!=='admin')return;const q=await db.from('resources').select('*').order('created_at',{ascending:false});if(q.error){toast(q.error.message);return}const list=q.data||[];$('adminList').innerHTML=list.map(r=>`<div class="adminRow"><div><b>${esc(r.title)}</b><small>${esc(r.subject)} · ${esc(r.type)} · ${r.published?'Published':'Hidden'}</small></div><div class="adminActions"><button data-edit="${r.id}">Edit</button><button data-toggle="${r.id}">${r.published?'Unpublish':'Publish'}</button><button data-delete="${r.id}" class="danger">Delete</button></div></div>`).join('')||'<p class="muted">No resources.</p>';
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteResource(b.dataset.delete));document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>toggleResource(b.dataset.toggle));document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editResource(b.dataset.edit));
}
async function deleteResource(id){if(!confirm('Delete this resource from the database?'))return;const r=await db.from('resources').delete().eq('id',id);if(r.error){toast(r.error.message);return}toast('Resource deleted.');await loadAdmin();await loadResources();}
async function toggleResource(id){const row=resources.find(x=>x.id===id);const q=await db.from('resources').select('published').eq('id',id).single();if(q.error){toast(q.error.message);return}const r=await db.from('resources').update({published:!q.data.published}).eq('id',id);if(r.error)toast(r.error.message);else{toast(!q.data.published?'Resource published.':'Resource hidden.');await loadAdmin();await loadResources();}}
async function editResource(id){const q=await db.from('resources').select('*').eq('id',id).single();if(q.error){toast(q.error.message);return}const r=q.data;const title=prompt('Resource title:',r.title);if(title===null)return;const subject=prompt('Subject:',r.subject);if(subject===null)return;const year=prompt('Year:',r.year||'');const type=prompt('Type:',r.type);if(type===null)return;const paper=prompt('Paper / Section:',r.paper||'');const desc=prompt('Description:',r.description||'');const u=await db.from('resources').update({title,subject,year:year?Number(year):null,type,paper,description:desc}).eq('id',id);if(u.error)toast(u.error.message);else{toast('Resource updated.');await loadAdmin();await loadResources();}}
$('search').oninput=render;$('subject').onchange=render;$('type').onchange=render;$('year').onchange=render;$('searchTop').oninput=e=>{$('search').value=e.target.value;location.hash='library';render()};$('authBtn').onclick=()=>user?dashboard():openAuth();$('signupBtn').onclick=()=>{authMode=true;openAuth()};document.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>$(x.dataset.close).classList.add('hidden'));document.querySelectorAll('[data-test]').forEach(x=>x.onclick=()=>startTest(x.dataset.test));
$('adminBtn').onclick=async()=>{if(role!=='admin')return;await loadAdmin();$('adminModal').classList.remove('hidden')};
$('uploadForm').onsubmit=async e=>{e.preventDefault();if(role!=='admin'){toast('Admin access required.');return}const f=$('pdf').files[0];if(!f||f.type!=='application/pdf'){toast('Please choose a PDF.');return}if(f.size>25*1024*1024){toast('PDF must be 25 MB or smaller.');return}$('uploadMsg').textContent='Uploading PDF…';const path=`${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;const u=await db.storage.from(C.STORAGE_BUCKET).upload(path,f,{contentType:'application/pdf',upsert:false});if(u.error){$('uploadMsg').textContent=u.error.message;return}const url=db.storage.from(C.STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;const r=await db.from('resources').insert({title:$('rTitle').value.trim(),subject:$('rSubject').value.trim(),year:+$('rYear').value||null,type:$('rType').value,paper:$('rPaper').value.trim(),description:$('rDesc').value.trim(),file_path:path,file_url:url,storage_provider:'supabase',published:$('rPublished').checked,created_by:user.id});if(r.error){await db.storage.from(C.STORAGE_BUCKET).remove([path]);$('uploadMsg').textContent=r.error.message;return}$('uploadForm').reset();$('uploadMsg').textContent='Uploaded and saved to Supabase.';await loadAdmin();await loadResources();};
let deferredInstallPrompt=null;
function installApp(){
 if(deferredInstallPrompt){deferredInstallPrompt.prompt();deferredInstallPrompt.userChoice.finally(()=>{deferredInstallPrompt=null;$('installBtn')?.classList.add('hidden')});return;}
 toast('If Install app is not shown, open Chrome menu (⋮) and choose “Install app” or “Add to Home screen”.');
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installBtn')?.classList.remove('hidden');$('installHero')?.classList.remove('hidden')});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;$('installBtn')?.classList.add('hidden');toast('WASSCEPASSCO installed successfully.');});
$('installBtn')?.addEventListener('click',installApp);$('installHero')?.addEventListener('click',installApp);
// Make the Account button actually take the user to the dashboard.
const originalAuthBtnHandler=$('authBtn').onclick;
$('authBtn').onclick=async()=>{if(user){location.hash='progress';await dashboard()}else{openAuth()}};
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('PWA service worker:',e));}
init();
// ===============================
// WASSCEPASSCO PWA INSTALLATION
// ===============================

let deferredInstallPrompt = null;

const installAppBtn = document.getElementById("installAppBtn");

// Capture Android/Chrome install prompt
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  deferredInstallPrompt = event;

  if (installAppBtn) {
    installAppBtn.hidden = false;
  }
});

// Install button
if (installAppBtn) {
  installAppBtn.addEventListener("click", async () => {

    if (!deferredInstallPrompt) {
      alert(
        "WASSCEPASSCO is ready to be installed. " +
        "If the install window does not appear, open Chrome's ⋮ menu and choose 'Install app' or 'Add to Home screen'."
      );
      return;
    }

    deferredInstallPrompt.prompt();

    const result = await deferredInstallPrompt.userChoice;

    console.log("PWA installation result:", result.outcome);

    deferredInstallPrompt = null;
    installAppBtn.hidden = true;
  });
}

// Detect successful installation
window.addEventListener("appinstalled", () => {
  console.log("WASSCEPASSCO installed successfully.");

  deferredInstallPrompt = null;

  if (installAppBtn) {
    installAppBtn.hidden = true;
  }
});

// Hide install button when already running as an installed app
function isInstalledPWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

if (isInstalledPWA() && installAppBtn) {
  installAppBtn.hidden = true;
}

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js?v=5", {
        scope: "./"
      })
      .then((registration) => {
        console.log(
          "WASSCEPASSCO service worker registered:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error(
          "WASSCEPASSCO service worker registration failed:",
          error
        );
      });
  });
}
