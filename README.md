# PlayTalk

Este repositorio usa `www/` como frontend principal e `server.js` como servidor Node/Express.

## Estrutura

- `www/`: frontend estatico do app.
- `server.js`: backend principal e rotas da aplicacao.
- `scripts/`: tarefas de build, deploy e manutencao.
- `dist/`: saida gerada pelo build estatico.

## Fluxo rapido

```bash
npm install
npm run build
npm start
```

## Onde editar

Edite o frontend diretamente em `www/`.
Quando quiser regenerar os arquivos estaticos, rode:

```bash
npm run build
```
