(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = { data:null, openId:null, admin:null, timer:null };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const toast = message => { const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(state.timer);state.timer=setTimeout(()=>el.classList.remove('show'),2600); };
  async function request(url, options={}) {
    const response=await fetch(url,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    const data=response.status===204?{}:await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message|| (response.status===401?'Entre na sua conta para continuar.':'Não foi possível concluir essa ação.'));
    return data;
  }
  function date(value, withTime=false) { if(!value)return '';const d=new Date(value);if(Number.isNaN(+d))return '';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(d); }
  function reflection(activity) { return activity.participants.find(p=>p.slot===state.data.me.slot)?.reflection||{experience:'',learning:'',feelings:'',awakened:''}; }
  function renderPeople() {
    const host=$('#companions');host.innerHTML='';
    state.data.participants.forEach((p,i)=>{
      const node=$('#participantTemplate').content.firstElementChild.cloneNode(true);
      $('.participant-name',node).textContent=p.name;$('.participant-caption',node).textContent=p.isMe?'Seu espaço · sua jornada':'Caminhando ao seu lado';
      const av=$('.avatar',node);av.textContent=(p.name||'').trim().slice(0,1).toLocaleUpperCase('pt-BR')||'✿';
      if(p.hasPhoto){const img=new Image();img.src=`/api/desafio-meninas/photo/${p.slot}?v=${Date.now()}`;img.alt=`Foto de ${p.name}`;av.replaceChildren(img);}
      const input=$('.photo-input',node);$('.avatar-wrap',node).setAttribute('aria-label',p.isMe?'Adicionar ou trocar sua foto':'Foto da participante');
      if(!p.isMe){$('.photo-edit',node).remove();}else{$('.avatar-wrap',node).addEventListener('click',()=>input.click());input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast('A foto deve ter até 5 MB.');return;}const dataUrl=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(file)});try{await request(`/api/desafio-meninas/profile?slot=${state.data.me.slot}`,{method:'PUT',body:JSON.stringify({photo:dataUrl})});toast('Sua foto foi atualizada ✨');await load(state.data.me.slot);}catch(e){toast(e.message)}});}
      host.append(node);if(i===0&&state.data.participants.length>1){const c=document.createElement('span');c.className='connection';c.setAttribute('aria-hidden','true');c.textContent='♡';host.append(c);}
    });
  }
  function renderProgress() {
    const acts=state.data.activities,people=state.data.participants;
    const totals=people.map(p=>({p,done:acts.filter(a=>a.participants.find(x=>x.slot===p.slot)?.completed).length}));
    const total=acts.length*people.length,completed=totals.reduce((n,x)=>n+x.done,0),pct=total?Math.round(completed/total*100):0;
    $('#overallPct').textContent=`${pct}%`;$('#sharedBar').style.width=`${pct}%`;
    $('#countSummary').textContent=`${completed} de ${total} passos individuais concluídos`;
    const both=acts.filter(a=>a.participants.length>1&&a.participants.every(p=>p.completed)).length;
    $('#sharedSummary').textContent=acts.length?(both===acts.length&&acts.length?'Todas as etapas concluídas pelas duas!':`${both} ${both===1?'etapa concluída':'etapas concluídas'} pelas duas`):'Adicionem a primeira atividade quando estiverem prontas';
    $('#peopleProgress').innerHTML=totals.map(({p,done})=>`<div class="person-progress"><div class="person-line"><strong>${esc(p.isMe?'Você':p.name)}</strong><span>${acts.length?Math.round(done/acts.length*100):0}% · ${done}/${acts.length}</span></div><div class="mini-track"><i style="width:${acts.length?done/acts.length*100:0}%"></i></div></div>`).join('');
    $('#activityCount').textContent=`${acts.length} ${acts.length===1?'etapa':'etapas'}`;
  }
  function renderActivities() {
    const host=$('#activityList');
    if(!state.data.activities.length){host.innerHTML='<div class="empty-state"><b>A jornada está pronta para começar</b>Toque no botão + para adicionar a primeira atividade.</div>';return;}
    host.innerHTML=state.data.activities.map((a,i)=>{
      const own=a.participants.find(p=>p.slot===state.data.me.slot)||{completed:false};const other=a.participants.find(p=>p.slot!==state.data.me.slot)||{completed:false};const r=reflection(a);const both=own.completed&&other.completed;const open=state.openId===a.id;
      return `<article class="activity-card ${own.completed?'done':''}" data-activity="${esc(a.id)}"><div class="activity-top" role="button" tabindex="0" aria-expanded="${open}" data-toggle="${esc(a.id)}"><span class="step-number">${String(i+1).padStart(2,'0')}</span><div><h3 class="activity-title">${esc(a.title)} ${a.demo?'<span class="count-chip">DEMONSTRAÇÃO</span>':''}</h3><p class="activity-desc">${esc(a.description)}</p></div><span class="activity-status">${own.completed?'✓ Concluída':(r.experience?'Em andamento':'Pendente')}</span></div><div class="activity-details" ${open?'':'hidden'}>${both?'<div class="both-done">✦ Etapa concluída pelas duas! Um passo compartilhado na história de vocês.</div>':''}<p class="reflection-title">O que você vivenciou nesta atividade?</p><textarea class="reflection" data-field="experience" maxlength="2500" placeholder="Escreva do seu jeito. Uma frase já pode guardar muito…">${esc(r.experience)}</textarea><div class="optional-grid"><input class="field" data-field="learning" maxlength="2500" placeholder="O que você aprendeu? (opcional)" value="${esc(r.learning)}"><input class="field" data-field="feelings" maxlength="2500" placeholder="Como você se sentiu? (opcional)" value="${esc(r.feelings)}"><input class="field" data-field="awakened" maxlength="2500" placeholder="O que despertou em você? (opcional)" value="${esc(r.awakened)}"></div><div class="activity-actions"><span class="date-note">${own.completed?`Concluída em ${date(own.completedAt)}`:'Este diário pode ser visto por quem tiver o link.'}</span><div class="action-buttons"><button class="button button-soft" data-delete="${esc(a.id)}" type="button" aria-label="Excluir atividade" title="Excluir atividade"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 3v6m4-6v6"/></svg></button><button class="button button-soft" data-save="${esc(a.id)}">Salvar relato</button><button class="button button-primary" data-complete="${esc(a.id)}">${own.completed?'Atualizar conclusão':'Concluir atividade'}</button></div></div></div></article>`;
    }).join('');
  }
  function renderHistory() {
    const host=$('#historyList'),items=state.data.history;
    if(!items.length){host.innerHTML='<div class="empty-state"><b>As memórias começam com um passo</b>Quando você salvar um relato ou concluir uma atividade, sua história aparecerá aqui.</div>';return;}
    host.innerHTML=`<div class="timeline">${items.map(x=>`<article class="memory"><div class="memory-card"><h3 class="memory-title">${esc(x.title)}</h3><span class="memory-date">${x.completedAt?`Concluída em ${date(x.completedAt)}`:'Relato salvo'}</span>${x.experience?`<p class="memory-text">${esc(x.experience)}</p>`:''}${x.learning?`<p class="memory-prompt">O que aprendeu</p><p class="memory-text">${esc(x.learning)}</p>`:''}${x.feelings?`<p class="memory-prompt">Como se sentiu</p><p class="memory-text">${esc(x.feelings)}</p>`:''}${x.awakened?`<p class="memory-prompt">O que despertou</p><p class="memory-text">${esc(x.awakened)}</p>`:''}</div></article>`).join('')}</div>`;
  }
  function renderChooser() {
    $('#participantChoices').innerHTML=state.data.participants.map(p=>`<button class="choice-card" type="button" data-slot="${p.slot}"><span class="choice-avatar">${esc(p.name.trim().slice(0,1).toLocaleUpperCase('pt-BR'))}</span><span class="choice-name">${esc(p.name)}</span><span class="choice-hint">Abrir minha jornada&nbsp; →</span></button>`).join('');
    $('#welcomeChooser').hidden=false;$('#journeyView').hidden=true;
  }
  function render() {renderPeople();renderProgress();renderActivities();renderHistory();$('#welcomeChooser').hidden=true;$('#journeyView').hidden=false;}
  async function load(slot=null) { try { state.data=await request(`/api/desafio-meninas${slot?`?slot=${slot}`:''}`);if(!state.data.me){renderChooser();return;}render(); } catch(e) {$('#welcomeChooser').hidden=false;$('#journeyView').hidden=true;$('#participantChoices').innerHTML=`<div class="empty-state"><b>Não foi possível abrir a jornada</b>${esc(e.message)}</div>`;} }
  async function saveActivity(id, complete) { const slot=state.data.me.slot;const card=$(`[data-activity="${CSS.escape(id)}"]`);const values={};$$('[data-field]',card).forEach(x=>values[x.dataset.field]=x.value);values.completed=complete||card.classList.contains('done');try{const btn=complete?$(`[data-complete="${CSS.escape(id)}"]`,card):$(`[data-save="${CSS.escape(id)}"]`,card);btn.disabled=true;await request(`/api/desafio-meninas/progress/${encodeURIComponent(id)}?slot=${slot}`,{method:'PUT',body:JSON.stringify(values)});toast(complete?'Atividade registrada. Que bom que você viveu esse momento ✨':'Relato salvo com carinho ✨');card.classList.add('shake');await load(slot);state.openId=id;renderActivities();}catch(e){toast(e.message);} }
  async function addActivity(event) { event.preventDefault();const form=$('#addActivityForm'),button=form.querySelector('[type="submit"]'),title=$('#newActivityTitle').value.trim(),description=$('#newActivityDescription').value.trim();if(!title){$('#newActivityTitle').focus();return;}button.disabled=true;try{await request('/api/desafio-meninas/activities',{method:'POST',body:JSON.stringify({title,description})});$('#addActivityDialog').close();form.reset();state.openId=null;await load(state.data.me?.slot);toast('Atividade adicionada ✨');}catch(e){toast(e.message);}finally{button.disabled=false;} }
  async function deleteActivity(id) { const activity=state.data.activities.find(a=>a.id===id);if(!activity)return;if(!confirm(`Excluir “${activity.title}” e os relatos associados? Esta ação não pode ser desfeita.`))return;try{await request(`/api/desafio-meninas/activities/${encodeURIComponent(id)}`,{method:'DELETE'});state.openId=null;await load(state.data.me?.slot);toast('Atividade excluída.');}catch(e){toast(e.message);} }
  async function openAdmin() { try {state.admin=await request('/api/admin/desafio-meninas');renderAdmin();$('#manageDialog').showModal();}catch(e){toast(e.message);} }
  function renderAdmin() {
    const activitySection=`<section class="manage-section"><h3>Etapas da jornada</h3><div id="adminActivities">${d.activities.map(a=>adminRow(a,d.participants)).join('')}</div><button class="button button-soft" id="addActivity">＋ Adicionar atividade</button><button class="button button-primary admin-save" id="saveActivities">Salvar atividades</button><p class="date-note">Use as setas para ordenar. Atividades demonstrativas são exemplos editáveis. Remover uma etapa pede confirmação.</p></section>`;
    $('#manageContent').innerHTML=activitySection;
    $('#addActivity').onclick=()=>$('#adminActivities').insertAdjacentHTML('beforeend',adminRow({title:'',description:'',id:''}));
    $('#adminActivities').addEventListener('click',e=>{const row=e.target.closest('.manage-activity');if(!row)return;const move=e.target.closest('[data-move]');if(move){const sibling=move.dataset.move==='up'?row.previousElementSibling:row.nextElementSibling;if(sibling)move.dataset.move==='up'?row.parentElement.insertBefore(row,sibling):row.parentElement.insertBefore(sibling,row);return;}const b=e.target.closest('[data-remove]');if(!b)return;const title=row.querySelector('[data-title]').value||'esta atividade';if(confirm(`Excluir “${title}” e os relatos associados? Esta ação não pode ser desfeita.`))row.remove();});
    $('#saveActivities').onclick=async()=>{const activities=$$('.manage-activity').map(row=>({id:row.dataset.id||'',title:$('[data-title]',row).value,description:$('[data-description]',row).value}));try{await request('/api/admin/desafio-meninas/activities',{method:'PUT',body:JSON.stringify({activities})});toast('Jornada atualizada ✨');$('#manageDialog').close();await load(state.data.me?.slot);}catch(e){toast(e.message)}};
  }
  function adminRow(a, participants=[]){const done=(a.participants||[]).map(p=>{const person=participants.find(x=>Number(x.slot)===Number(p.slot));return `${p.completed?'✓':'○'} ${person?.display_name||`participante ${p.slot}`}`}).join(' · ');return `<div class="manage-activity" data-id="${esc(a.id||'')}"><div><input class="field" data-title maxlength="160" placeholder="Título da atividade" value="${esc(a.title||'')}"><textarea class="field" data-description maxlength="2500" placeholder="O que precisa ser feito?">${esc(a.description||'')}</textarea><span class="date-note">${esc(done||'Sem registros ainda')} ${a.demo?'· Exemplo':''}</span></div><div class="manage-order"><button class="remove-row" data-move="up" type="button" aria-label="Mover para cima">↑</button><button class="remove-row" data-move="down" type="button" aria-label="Mover para baixo">↓</button></div><button class="remove-row" data-remove type="button" aria-label="Excluir atividade">×</button></div>`;}
  $('#activityList').addEventListener('click',e=>{const remove=e.target.closest('[data-delete]');if(remove)return deleteActivity(remove.dataset.delete);const save=e.target.closest('[data-save]');if(save)return saveActivity(save.dataset.save,false);const done=e.target.closest('[data-complete]');if(done)return saveActivity(done.dataset.complete,true);const toggle=e.target.closest('[data-toggle]');if(toggle){state.openId=state.openId===toggle.dataset.toggle?null:toggle.dataset.toggle;renderActivities();}});
  $('#activityList').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-toggle]')){e.preventDefault();state.openId=state.openId===e.target.dataset.toggle?null:e.target.dataset.toggle;renderActivities();}});
  $('#manageBtn').addEventListener('click',openAdmin);
  $('#addActivityButton').addEventListener('click',()=>{$('#addActivityDialog').showModal();$('#newActivityTitle').focus();});
  $('#addActivityForm').addEventListener('submit',addActivity);
  $$('[data-close-add]').forEach(button=>button.addEventListener('click',()=>$('#addActivityDialog').close()));
  $('#participantChoices').addEventListener('click',e=>{const button=e.target.closest('[data-slot]');if(button)load(Number(button.dataset.slot));});
  $('#switchParticipant').addEventListener('click',()=>load());
  $$('.nav-pill').forEach(btn=>btn.addEventListener('click',()=>{$$('.nav-pill').forEach(x=>x.classList.toggle('active',x===btn));$('#activitiesSection').classList.toggle('hidden',btn.dataset.section!=='activities');$('#historySection').classList.toggle('hidden',btn.dataset.section!=='history');}));
  request('/auth/session').then(session=>{if(session?.user?.is_admin)$('#manageBtn').classList.remove('admin-hidden');}).catch(()=>{});
  load();
})();
