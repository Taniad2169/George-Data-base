/* Haitian Global directory: Supabase connection. The publishable key is safe in browser code; RLS protects rows. */
(() => {
  'use strict';
  const url = 'https://fnoizxstszexmtjonlgw.supabase.co';
  const key = 'sb_publishable_PB3BtFz-iCkQ-CE_5Z3v3g_SaUa5lcf';
  if (!window.supabase?.createClient) { console.error('Supabase library unavailable'); return; }
  const db = window.supabase.createClient(url, key);
  const ownerEmail = 'thewebswann@gmail.com';
  const demoIds = new Set(businesses.map(b => b.id));
  const businessFields = ['slug','name','category','secondary','city','region','country','description','services','languages','phone','whatsapp','website','hours','established','mode','featured','status'];
  let admin = false;
  const safe = value => escapeHTML(value ?? '');
  const dateLabel = value => value ? new Date(value).toLocaleDateString() : '';
  const notify = (message) => toast(message);

  async function loadDirectory() {
    const [{data: rows, error}, {data: reviews, error: reviewError}] = await Promise.all([
      db.from('businesses').select('id,slug,name,category,secondary,city,region,country,description,services,languages,phone,whatsapp,website,hours,established,mode,featured,joined,status,is_demo').eq('status','published').order('name'),
      db.from('reviews').select('id,business_id,reviewer_name,rating,comment,created_at').eq('status','approved')
    ]);
    if (error || reviewError) { console.error('Directory load failed', error || reviewError); notify('Live listings are temporarily unavailable.'); return; }
    const real = (rows || []).map(b => ({
      ...b, id:1000000000+Number(b.id), dbId:b.id, secondary:b.secondary||[], services:b.services||[], languages:b.languages||[],
      joined:b.joined||'', reviews:(reviews||[]).filter(r=>r.business_id===b.id).map(r=>({
        name:r.reviewer_name,rating:r.rating,comment:r.comment,date:dateLabel(r.created_at)
      }))
    }));
    businesses.splice(0, businesses.length, ...businesses.filter(b=>demoIds.has(b.id)), ...real);
    for (const b of real) {
      for (const c of [b.category,...b.secondary]) if(c && !categories.includes(c)) {
        categories.push(c); document.querySelector('#category')?.add(new Option(c,c));
      }
    }
    render();
    route();
  }
  trackSearch = term => {
    const category = String(term||'').trim().slice(0,80);
    if (!category) return;
    db.from('search_events').insert({category}).then(({error})=>{if(error) console.warn('Search metric unavailable',error)});
  };
  const originalProfile = showProfile;
  showProfile = function(b) {
    originalProfile(b);
    if (!demoIds.has(b.id)) {
      const content = document.querySelector('#profileContent');
      content.innerHTML = content.innerHTML.replaceAll('Demonstration review', 'Approved review').replaceAll('demonstration reviews', 'approved reviews');
    }
  };
  const reviewForm = document.querySelector('#reviewForm');
  reviewForm.onsubmit = async event => {
    event.preventDefault();
    const businessId = Number(document.querySelector('#reviewDialog').dataset.businessId);
    if (demoIds.has(businessId)) { notify('This is a demonstration listing. Reviews open when the real listing is published.'); return; }
    const rating = Number(document.querySelector('#starInput').dataset.value);
    if (!rating) { notify('Please select a star rating.'); return; }
    const submit = reviewForm.querySelector('[type="submit"]');
    submit.disabled = true;
    const {error} = await db.from('reviews').insert({
      business_id:businesses.find(b=>b.id===businessId)?.dbId, reviewer_name:document.querySelector('#reviewerName').value.trim(),
      rating, comment:document.querySelector('#reviewText').value.trim(), status:'pending'
    });
    submit.disabled = false;
    if (error) { console.error(error); notify('Review could not be saved. Please try again.'); return; }
    document.querySelector('#reviewDialog').close();
    reviewForm.reset(); delete document.querySelector('#starInput').dataset.value;
    document.querySelectorAll('#starInput button').forEach(b=>b.classList.remove('on'));
    notify('Thank you! Your review is waiting for approval.');
  };

  const adminButton = document.querySelector('#adminOpen');
  adminButton.hidden = false;
  adminButton.onclick = showAdmin;
  const dialog = document.createElement('dialog');
  dialog.id = 'liveAdmin';
  dialog.setAttribute('aria-label','Directory administration');
  dialog.style.cssText = 'width:min(960px,94vw);max-height:90vh;border:0;border-radius:16px;padding:28px;box-shadow:0 24px 70px #102e5b55;color:#0b2a45';
  document.body.append(dialog);
  dialog.addEventListener('click', e=>{if(e.target===dialog)dialog.close()});
  const header = '<button id="liveClose" type="button" style="float:right;border:0;background:transparent;font-size:24px" aria-label="Close">×</button><h2>Haitian Global · Admin</h2>';
  function mount(html) {
    dialog.innerHTML = header + html;
    dialog.querySelector('#liveClose').onclick = () => dialog.close();
    if (!dialog.open) dialog.showModal();
  }
  async function verifyAdmin() {
    const {data:{user}} = await db.auth.getUser();
    admin = user?.email?.toLowerCase() === ownerEmail;
    return admin;
  }
  async function showAdmin() {
    if (await verifyAdmin()) return dashboard();
    mount('<p>Sign in with the directory owner account to manage listings and reviews.</p><form id="liveLogin"><label>Email<br><input type="email" required autocomplete="username" value="'+ownerEmail+'" style="width:100%;padding:10px"></label><br><label>Password<br><input type="password" required autocomplete="current-password" style="width:100%;padding:10px"></label><br><button type="submit">Sign in</button> <button type="button" id="liveSignup">Create owner login</button> <button type="button" id="liveReset">Forgot password?</button><p id="liveError" role="alert"></p></form>');
    dialog.querySelector('#liveLogin').onsubmit = async e => {
      e.preventDefault();
      const email = e.target.querySelector('[type=email]').value.trim();
      const password = e.target.querySelector('[type=password]').value;
      if(email.toLowerCase()!==ownerEmail){dialog.querySelector('#liveError').textContent='Use the directory owner email.';return}
      const {error} = await db.auth.signInWithPassword({email,password});
      if(error){dialog.querySelector('#liveError').textContent=error.message;return}
      if(await verifyAdmin()) dashboard();
    };
    dialog.querySelector('#liveSignup').onclick = async () => {
      const form=dialog.querySelector('#liveLogin'),email=form.querySelector('[type=email]').value.trim(),password=form.querySelector('[type=password]').value;
      if(email.toLowerCase()!==ownerEmail || password.length<8){dialog.querySelector('#liveError').textContent='Use the owner email and a password of at least 8 characters.';return}
      const {error}=await db.auth.signUp({email,password});
      dialog.querySelector('#liveError').textContent=error?.message||'Check the owner email for the confirmation link, then sign in.';
    };
    dialog.querySelector('#liveReset').onclick = async () => {
      const {error}=await db.auth.resetPasswordForEmail(ownerEmail,{redirectTo:location.origin+location.pathname});
      dialog.querySelector('#liveError').textContent=error?.message||'Check the owner email for the recovery link.';
    };
  }
  async function dashboard(section='businesses') {
    if(!await verifyAdmin()){dialog.close();return showAdmin()}
    mount('<p><button id="liveBusinesses">Businesses</button> <button id="liveReviews">Review queue</button> <button id="liveAnalytics">Search analytics</button> <button id="liveSignout">Sign out</button></p><div id="liveBody"></div>');
    dialog.querySelector('#liveBusinesses').onclick=()=>businessManager();
    dialog.querySelector('#liveReviews').onclick=()=>reviewManager();
    dialog.querySelector('#liveAnalytics').onclick=()=>analyticsManager();
    dialog.querySelector('#liveSignout').onclick=async()=>{await db.auth.signOut();admin=false;dialog.close();showAdmin()};
    ({businesses:businessManager,reviews:reviewManager,analytics:analyticsManager})[section]();
  }
  function formField(name, value='') {
    const label=name.replace(/_/g,' ');
    if(['description'].includes(name)) return '<label>'+safe(label)+'<br><textarea name="'+name+'" rows="3" style="width:100%">'+safe(value)+'</textarea></label>';
    if(['featured'].includes(name)) return '<label><input type="checkbox" name="'+name+'" '+(value?'checked':'')+'> Featured</label>';
    if(name==='country') return '<label>Country<br><select name="country">'+['United States','Canada','France','Haiti'].map(x=>'<option '+(x===value?'selected':'')+'>'+x+'</option>').join('')+'</select></label>';
    if(name==='status') return '<label>Status<br><select name="status">'+['draft','published','archived'].map(x=>'<option '+(x===value?'selected':'')+'>'+x+'</option>').join('')+'</select></label>';
    return '<label>'+safe(label)+'<br><input name="'+name+'" value="'+safe(Array.isArray(value)?value.join(', '):value)+'" style="width:100%;padding:8px"></label>';
  }
  async function businessManager(editId) {
    const {data,error}=await db.from('businesses').select('*').order('updated_at',{ascending:false});
    const root=dialog.querySelector('#liveBody'); if(error){root.textContent=error.message;return}
    const selected=(data||[]).find(b=>b.id===editId)||{};
    root.innerHTML='<h3>'+(editId?'Edit business':'Add business')+'</h3><p>Only published records appear in public search. Demo listings remain labeled on the page.</p><form id="liveBusinessForm" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">'+businessFields.map(f=>formField(f,selected[f])).join('')+'<button type="submit" style="background:#96dafa;border:0;padding:12px;font-weight:bold">Save business</button></form><p id="liveSaveError" role="alert"></p><h3>Saved records</h3><div id="liveRows"></div>';
    root.querySelector('#liveRows').innerHTML=(data||[]).map(b=>'<p><button type="button" data-edit="'+b.id+'">Edit</button> '+safe(b.name)+' · '+safe(b.city)+' · '+safe(b.status)+'</p>').join('')||'<p>No saved businesses yet.</p>';
    root.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>businessManager(Number(button.dataset.edit)));
    root.querySelector('#liveBusinessForm').onsubmit=async e=>{
      e.preventDefault(); const raw=new FormData(e.target),row={};
      for(const f of businessFields) {
        if(f==='featured') row[f]=e.target.elements[f].checked;
        else if(['secondary','services','languages'].includes(f)) row[f]=String(raw.get(f)||'').split(',').map(x=>x.trim()).filter(Boolean);
        else if(f==='established') row[f]=raw.get(f)?Number(raw.get(f)):null;
        else row[f]=String(raw.get(f)||'').trim();
      }
      const query=editId?db.from('businesses').update(row).eq('id',editId):db.from('businesses').insert(row);
      const {error}=await query;
      if(error){root.querySelector('#liveSaveError').textContent=error.message;return}
      await loadDirectory(); await businessManager();
      notify('Business saved.');
    };
  }
  async function reviewManager() {
    const {data,error}=await db.from('reviews').select('id,business_id,reviewer_name,rating,comment,status,created_at,businesses(name)').order('created_at',{ascending:false});
    const root=dialog.querySelector('#liveBody'); if(error){root.textContent=error.message;return}
    root.innerHTML='<h3>Review queue</h3>'+(data||[]).map(r=>'<article style="border-top:1px solid #afd0f0;padding:12px"><b>'+safe(r.businesses?.name||'Business')+'</b> · '+safe(r.reviewer_name)+' · '+r.rating+' ★<p>'+safe(r.comment)+'</p><small>'+safe(r.status)+' · '+dateLabel(r.created_at)+'</small><p><button data-review="'+r.id+'" data-status="approved">Approve</button> <button data-review="'+r.id+'" data-status="rejected">Reject</button></p></article>').join('')||'<p>No submitted reviews yet.</p>';
    root.querySelectorAll('[data-review]').forEach(button=>button.onclick=async()=>{
      const {error}=await db.from('reviews').update({status:button.dataset.status}).eq('id',Number(button.dataset.review));
      if(error){notify(error.message);return}await loadDirectory();reviewManager();
    });
  }
  async function analyticsManager() {
    const {data,error}=await db.from('search_events').select('category').limit(10000);
    const root=dialog.querySelector('#liveBody'); if(error){root.textContent=error.message;return}
    const count={}; for(const row of data||[])count[row.category]=(count[row.category]||0)+1;
    root.innerHTML='<h3>Search analytics</h3><p>Category searches across visitors (latest 10,000).</p>'+Object.entries(count).sort((a,b)=>b[1]-a[1]).map(([name,n])=>'<p>'+safe(name)+' · '+n+'<span style="display:block;background:#afd0f0;width:'+Math.min(100,n*5)+'%;height:12px"></span></p>').join('')||'<p>No searches yet.</p>';
  }
  loadDirectory();
})();
