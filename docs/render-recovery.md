# Recuperar o deploy Render do PlayTalk

Este guia existe para facilitar a volta do projeto quando precisar recriar a conta do Render, o banco Postgres ou a URL do backend.

## O que precisa existir

Para o PlayTalk voltar a funcionar com login e recursos do servidor, voce precisa recriar:

- 1 banco Postgres
- 1 web service Node.js apontando para este repositorio
- as variaveis de ambiente do backend

O frontend nao depende mais de uma URL fixa antiga do Render. Quando ele estiver sendo servido pelo mesmo backend, ele passa a usar a origem atual automaticamente.

## Variaveis importantes

Baseie a configuracao em [`.env.example`](/P:/playtalk-main/.env.example).

Essenciais para login e banco:

- `DATABASE_URL`
- `DATABASE_SSL=true`
- `JWT_SECRET`
- `PORT` (opcional no Render; ele injeta a porta)

Necessarias para recursos de IA e midia:

- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_CONTENT_ROOT`
- `R2_CONTENT_DAYS`
- `R2_CONTENT_PHASES`
- `R2_CONTENT_MARKER_FILE`
- `R2_CONTENT_CONCURRENCY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID_HARRY`
- `ELEVENLABS_MODEL_ID`
- `OPENAI_API_KEY`
- `OPENAI_IMAGE_MODEL`
- `OPENAI_TEXT_MODEL`

## Como recriar no Render

1. Crie um banco Postgres novo no Render.
2. Copie a `External Database URL` ou outra connection string compativel e salve como `DATABASE_URL` no web service.
3. Crie um novo web service para este repositorio.
4. Use `npm install` como build command.
5. Use `npm start` como start command.
6. Preencha no web service todas as variaveis citadas acima.
7. Garanta `DATABASE_SSL=true` se estiver usando o Postgres do Render.

## Preparar o banco novo

Depois que a `DATABASE_URL` estiver valida, inicialize a tabela de usuarios:

```bash
node scripts/init-users-table.js
```

Esse script:

- cria `public.users` se ela ainda nao existir;
- adiciona `avatar_image` e `created_at` se o schema estiver incompleto;
- nao apaga dados existentes.

Se voce estiver em uma maquina local com `.env`, o script ja le esse arquivo automaticamente.

## Validacao rapida

Depois do deploy:

1. abra a URL nova do backend no navegador;
2. confirme que o servidor esta entregando as paginas do app e abra [`auth.html`](/P:/playtalk-main/www/auth.html);
3. crie um usuario novo;
4. confirme que cadastro e login respondem sem erro;
5. teste um recurso que dependa de R2, OpenAI ou ElevenLabs, se esses recursos forem necessarios.

## Se o frontend estiver em outro dominio

Se voce publicar o frontend separado do backend, pode definir a base da API manualmente no navegador:

```js
localStorage.setItem('playtalk_api_base_url', 'https://SEU-BACKEND.onrender.com');
location.reload();
```

Para limpar depois:

```js
localStorage.removeItem('playtalk_api_base_url');
location.reload();
```

## Observacao importante

Se a conta antiga do Render sumiu e nao existe backup/export do banco antigo, os dados que estavam naquele Postgres provavelmente nao podem ser recuperados a partir deste repositorio sozinho. O codigo volta; os dados antigos so voltam se houver backup, export SQL ou acesso a algum dump.
