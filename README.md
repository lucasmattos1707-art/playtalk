# PlayTalk mobile (Capacitor + Android)

Este repositório está organizado para usar **`www/`** como a Web UI do app Capacitor.

## Estrutura

- `www/`: frontend/web assets renderizados no app (single source of truth atual).
- `android/`: projeto nativo Android gerado pelo Capacitor.
- demais pastas (`api/`, `config/`, `docs/`, `server.js`, etc.): código de backend/infra e suporte.

## Fluxo rápido

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

> Se o Android já tiver sido adicionado antes, rode apenas `npx cap sync android` e `npx cap open android`.

## Onde editar o frontend

Por enquanto, edite diretamente em **`www/`**.
Qualquer alteração nessa pasta deve ser seguida de:

```bash
npx cap sync android
```

## APK com erro "pacote invÃ¡lido"

Esse erro costuma acontecer quando o `.apk` de `release` Ã© distribuÃ­do sem assinatura vÃ¡lida ou quando o arquivo foi alterado/corrompido apÃ³s o build.

Fluxo recomendado:

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleRelease
```

O projeto estÃ¡ configurado para:
- assinar `release` com keystore de produÃ§Ã£o (quando variÃ¡veis de ambiente estiverem presentes);
- usar assinatura de `debug` como fallback, evitando gerar `release` sem assinatura.

Para assinatura de produÃ§Ã£o, configure no ambiente:
- `PLAYTALK_UPLOAD_STORE_FILE`
- `PLAYTALK_UPLOAD_STORE_PASSWORD`
- `PLAYTALK_UPLOAD_KEY_ALIAS`
- `PLAYTALK_UPLOAD_KEY_PASSWORD`

SaÃ­da do APK:
- `android/app/build/outputs/apk/release/app-release.apk`

## Atualizar Android automaticamente

Para atualizar o projeto Android automaticamente sempre que houver mudanca em `www/`, rode:

```bash
npm run android:auto-sync
```

Esse comando:
- executa `npm run android:update` ao iniciar;
- observa `www/`;
- quando voce salva um arquivo, roda novo `build + cap sync android`.
