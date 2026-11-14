'use strict';

function fail(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function installGirlsChallenge(app, { pool, authenticate, authorizeAdmin, isAdminRecord, staticDir, sharp }) {
  let schemaPromise;
  async function ensureSchema() {
    if (!pool) throw fail('Banco de dados indisponível.', 503);
    if (!schemaPromise) {
      schemaPromise = pool.query(`
        CREATE TABLE IF NOT EXISTS public.girls_challenge_participants (
          slot smallint PRIMARY KEY CHECK (slot IN (1,2)),
          user_id integer UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
          display_name text NOT NULL DEFAULT '',
          photo_mime text,
          photo_data bytea,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS public.girls_challenge_activities (
          id bigserial PRIMARY KEY,
          title text NOT NULL,
          description text NOT NULL DEFAULT '',
          position integer NOT NULL DEFAULT 0,
          is_demo boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS public.girls_challenge_progress (
          activity_id bigint NOT NULL REFERENCES public.girls_challenge_activities(id) ON DELETE CASCADE,
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          completed_at timestamptz,
          experience text NOT NULL DEFAULT '', learning text NOT NULL DEFAULT '',
          feelings text NOT NULL DEFAULT '', awakened text NOT NULL DEFAULT '',
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY(activity_id,user_id)
        );
        INSERT INTO public.girls_challenge_participants(slot,display_name) VALUES(1,'Anna Clara'),(2,'Thata') ON CONFLICT DO NOTHING;
        CREATE TABLE IF NOT EXISTS public.girls_challenge_progress_by_slot (
          activity_id bigint NOT NULL REFERENCES public.girls_challenge_activities(id) ON DELETE CASCADE,
          participant_slot smallint NOT NULL REFERENCES public.girls_challenge_participants(slot) ON DELETE CASCADE,
          completed_at timestamptz,
          experience text NOT NULL DEFAULT '', learning text NOT NULL DEFAULT '',
          feelings text NOT NULL DEFAULT '', awakened text NOT NULL DEFAULT '',
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY(activity_id,participant_slot)
        );
        INSERT INTO public.girls_challenge_progress_by_slot(activity_id,participant_slot,completed_at,experience,learning,feelings,awakened,updated_at)
          SELECT g.activity_id,p.slot,g.completed_at,g.experience,g.learning,g.feelings,g.awakened,g.updated_at
          FROM public.girls_challenge_progress g JOIN public.girls_challenge_participants p ON p.user_id=g.user_id
          ON CONFLICT(activity_id,participant_slot) DO NOTHING;
        UPDATE public.girls_challenge_participants SET user_id=NULL,
          display_name=CASE slot WHEN 1 THEN 'Anna Clara' ELSE 'Thata' END,
          photo_mime=NULL,photo_data=NULL,updated_at=now();
        INSERT INTO public.girls_challenge_activities(title,description,position,is_demo)
          SELECT 'Atividade demonstrativa ' || n, 'Exemplo para visualizar a jornada. Edite ou remova esta atividade para inserir o conteúdo real.', n, true
          FROM generate_series(1,3) AS n
          WHERE NOT EXISTS (SELECT 1 FROM public.girls_challenge_activities);
      `).catch(error => { schemaPromise = null; throw error; });
    }
    await schemaPromise;
  }
  const route = handler => async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { await handler(req, res); }
    catch (error) {
      const status = Number(error.statusCode) || 500;
      if (status >= 500) console.warn('[desafio-meninas]', error.message);
      res.status(status).json({ success: false, message: status === 500 ? 'Não foi possível concluir essa ação.' : error.message });
    }
  };
  async function selectedParticipant(req, required = true) {
    await ensureSchema();
    const value=req.query?.slot??req.body?.slot;
    if(value===undefined||value===null||value===''){if(required)throw fail('Escolha seu nome para abrir a jornada.');return null;}
    const slot=Number(value);if(![1,2].includes(slot))throw fail('Participante inválida.');
    const result=await pool.query('SELECT slot,display_name FROM public.girls_challenge_participants WHERE slot=$1',[slot]);
    if(!result.rows.length)throw fail('Participante não encontrada.',404);
    return {slot:Number(result.rows[0].slot),name:result.rows[0].display_name};
  }
  app.get(['/desafio-meninas', '/desafio-meninas/', '/desafio-meninas/index.html'], route(async (_req, res) => {
    res.sendFile(require('node:path').join(staticDir, 'desafio-meninas', 'index.html'));
  }));
  app.get('/api/desafio-meninas', route(async (req, res) => {
    const me = await selectedParticipant(req,false);
    const [participants, activities, progress] = await Promise.all([
      pool.query('SELECT slot,display_name,(photo_data IS NOT NULL) AS has_photo FROM public.girls_challenge_participants ORDER BY slot'),
      pool.query('SELECT id,title,description,position,is_demo FROM public.girls_challenge_activities ORDER BY position,id'),
      pool.query('SELECT activity_id,participant_slot,completed_at,experience,learning,feelings,awakened,updated_at FROM public.girls_challenge_progress_by_slot')
    ]);
    const records = progress.rows;
    res.json({ success:true, me, participants:participants.rows.map(p=>({ slot:Number(p.slot), name:p.display_name, hasPhoto:p.has_photo, isMe:Number(p.slot)===me?.slot })),
      activities:activities.rows.map(a=>({id:String(a.id),title:a.title,description:a.description,position:Number(a.position),demo:a.is_demo,
        participants:participants.rows.map(p=>{const r=records.find(x=>String(x.activity_id)===String(a.id)&&Number(x.participant_slot)===Number(p.slot));return {slot:Number(p.slot),completed:Boolean(r?.completed_at),completedAt:r?.completed_at||null,reflection:me&&Number(p.slot)===me.slot?{experience:r?.experience||'',learning:r?.learning||'',feelings:r?.feelings||'',awakened:r?.awakened||''}:null};})})),
      history:records.filter(r=>me&&Number(r.participant_slot)===me.slot&&(r.completed_at||r.experience||r.learning||r.feelings||r.awakened)).map(r=>{const a=activities.rows.find(x=>String(x.id)===String(r.activity_id));return {title:a?.title||'Atividade removida',completedAt:r.completed_at,experience:r.experience,learning:r.learning,feelings:r.feelings,awakened:r.awakened};}).sort((a,b)=>new Date(b.completedAt||0)-new Date(a.completedAt||0)) });
  }));
  app.get('/api/desafio-meninas/photo/:slot', route(async (req,res)=>{
    await ensureSchema();const slot=Number(req.params.slot);if(![1,2].includes(slot))throw fail('Participante inválida.');
    const row=await pool.query('SELECT p.photo_mime,p.photo_data FROM public.girls_challenge_participants p WHERE p.slot=$1',[slot]);
    if(!row.rows[0]?.photo_data)return res.status(404).end();
    res.type(row.rows[0].photo_mime).send(row.rows[0].photo_data);
  }));
  app.put('/api/desafio-meninas/profile', expressJson(), route(async (req,res)=>{
    const me=await selectedParticipant(req);const name=String(req.body?.name||'').trim();
    if(name.length>80)throw fail('O nome deve ter até 80 caracteres.');
    if(name) await pool.query('UPDATE public.girls_challenge_participants SET display_name=$1,updated_at=now() WHERE slot=$2',[name,me.slot]);
    if(req.body?.photo){
      const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.photo));if(!match)throw fail('Use uma foto PNG, JPG ou WebP.');
      const raw=Buffer.from(match[2],'base64');if(raw.length>5*1024*1024)throw fail('A foto deve ter até 5 MB.');
      const out=await sharp(raw,{limitInputPixels:25000000}).rotate().resize(640,640,{fit:'cover',position:'attention'}).webp({quality:82}).toBuffer();
      await pool.query("UPDATE public.girls_challenge_participants SET photo_mime='image/webp',photo_data=$1,updated_at=now() WHERE slot=$2",[out,me.slot]);
    }
    res.json({success:true});
  }));
  app.put('/api/desafio-meninas/progress/:activityId', expressJson(), route(async(req,res)=>{
    const me=await selectedParticipant(req),id=String(req.params.activityId);if(!/^\d+$/.test(id))throw fail('Atividade inválida.');
    const exists=await pool.query('SELECT 1 FROM public.girls_challenge_activities WHERE id=$1',[id]);if(!exists.rows.length)throw fail('Atividade não encontrada.',404);
    const fields=['experience','learning','feelings','awakened'];const values=fields.map(k=>String(req.body?.[k]||'').trim());
    if(values.some(v=>v.length>2500))throw fail('Cada resposta pode ter até 2.500 caracteres.');
    const completed=Boolean(req.body?.completed);if(completed&&!values[0])throw fail('Conte um pouco sobre o que você vivenciou antes de concluir.');
    await pool.query(`INSERT INTO public.girls_challenge_progress_by_slot(activity_id,participant_slot,experience,learning,feelings,awakened,completed_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $7 THEN now() ELSE NULL END,now())
      ON CONFLICT(activity_id,participant_slot) DO UPDATE SET experience=EXCLUDED.experience,learning=EXCLUDED.learning,feelings=EXCLUDED.feelings,awakened=EXCLUDED.awakened,
      completed_at=CASE WHEN $7 THEN COALESCE(girls_challenge_progress_by_slot.completed_at,now()) ELSE NULL END,updated_at=now()`,[id,me.slot,...values,completed]);
    res.json({success:true});
  }));
  app.get('/api/admin/desafio-meninas', route(async(req,res)=>{
    await authorizeAdmin(req);await ensureSchema();
    const [participants,activities,progress]=await Promise.all([
      pool.query('SELECT slot,display_name FROM public.girls_challenge_participants ORDER BY slot'),
      pool.query('SELECT id,title,description,position,is_demo FROM public.girls_challenge_activities ORDER BY position,id'),
      pool.query('SELECT activity_id,participant_slot,completed_at FROM public.girls_challenge_progress_by_slot')
    ]);
    res.json({success:true,participants:participants.rows,activities:activities.rows.map(a=>({...a,id:String(a.id),participants:progress.rows.filter(p=>String(p.activity_id)===String(a.id)).map(p=>({slot:Number(p.participant_slot),completed:Boolean(p.completed_at),completedAt:p.completed_at}))}))});
  }));
  app.put('/api/admin/desafio-meninas/activities', expressJson(), route(async(req,res)=>{
    await authorizeAdmin(req);await ensureSchema();const items=req.body?.activities;if(!Array.isArray(items)||items.length>200)throw fail('A lista de atividades é inválida.');
    const normalized=items.map((a,i)=>{const title=String(a.title||'').trim(),description=String(a.description||'').trim();if(!title||title.length>160||description.length>2500)throw fail('Confira os títulos (até 160 caracteres) e descrições (até 2.500).');return {id:/^\d+$/.test(String(a.id||''))?String(a.id):null,title,description,position:i+1};});
    const client=await pool.connect();try{await client.query('BEGIN');const keep=[];for(const a of normalized){if(a.id){await client.query('UPDATE public.girls_challenge_activities SET title=$1,description=$2,position=$3,is_demo=false WHERE id=$4',[a.title,a.description,a.position,a.id]);keep.push(a.id);}else{const r=await client.query('INSERT INTO public.girls_challenge_activities(title,description,position) VALUES($1,$2,$3) RETURNING id',[a.title,a.description,a.position]);keep.push(String(r.rows[0].id));}}if(keep.length)await client.query('DELETE FROM public.girls_challenge_activities WHERE id <> ALL($1::bigint[])', [keep]);else await client.query('DELETE FROM public.girls_challenge_activities');await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    res.json({success:true});
  }));
}

function expressJson(){ return require('express').json({limit:'8mb'}); }
module.exports = { installGirlsChallenge };
