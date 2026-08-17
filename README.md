# TabSpace

Extension de Chrome (Manifest V3) para guardar marcadores propios, sincronizados
con la carpeta privada de la app en tu Google Drive (`appDataFolder`): no aparece
en tu Drive normal, solo esta app puede leerla o escribirla.

## Superficies

Por ahora la extension tiene solo tres pantallas, a proposito:

- **Nueva pestaña** (`newtab.tsx`): elemento central de la extension. Tablero
  oscuro con los marcadores agrupados por su primera tag.
- **Popup** (`popup.tsx`): se abre al pulsar el icono de la extension. Es solo
  un formulario rapido para guardar la pestaña activa, con confirmacion visual
  al guardar — no lista ni gestiona marcadores.
- **Ajustes** (`options.tsx`): sincronizar manualmente, cerrar sesion,
  exportar/importar JSON.

(Hubo un panel lateral en un momento dado; se quito para mantener el alcance
reducido. Si hace falta mas adelante, se puede volver a añadir con la
Side Panel API de Chrome.)

## Stack

- **UI**: Next.js (Pages Router, `output: 'export'`) + TypeScript + Tailwind.
  Cada `src/pages/*.tsx` compila a su `.html` estatico correspondiente.
- **Background**: service worker MV3 en TypeScript (`src/background`),
  empaquetado aparte con esbuild (Next no compila service workers).
- **Datos**: Google Drive API v3, un unico archivo `bookmarks.json` dentro de
  `appDataFolder`. Cache local en `chrome.storage.local` con sync
  "ultima escritura gana" (por `updatedAt`) para poder usarlo offline.
- **Auth**: `chrome.identity.getAuthToken` (usa la sesion de Chrome, sin
  manejar redirect URIs a mano).

## Estructura

```
src/
  pages/          newtab.tsx, popup.tsx, options.tsx, _app.tsx, _document.tsx
  components/     UI (tablero de marcadores, formulario, favicon)
  lib/            auth.ts, drive.ts, storage.ts, sync.ts, types.ts, useBookmarks.ts
  background/     service worker (menu contextual "Guardar en TabSpace")
manifest.template.json   plantilla del manifest (el client_id se inyecta al build)
scripts/build.mjs        orquesta next build + esbuild + copia todo a dist/
scripts/generate-extension-key.mjs   fija el ID de la extension para dev
```

## 1. Instalar dependencias

```
npm install
```

## 2. Crear el OAuth Client ID en Google Cloud Console

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) y crea
   (o reutiliza) un proyecto.
2. **APIs y servicios -> Biblioteca**: habilita **Google Drive API**.
3. **APIs y servicios -> Pantalla de consentimiento OAuth**: configurala en
   modo "Externo" (o "Interno" si usas Google Workspace), con tu email como
   usuario de prueba. No hace falta verificacion para uso personal.
4. Fija el ID de la extension antes de crear el client, para que no cambie
   cada vez que recargues la extension en desarrollo:
   ```
   npm run gen-key
   ```
   Copia el `"key": "..."` que imprime dentro de `manifest.template.json`
   (a la altura de `"manifest_version"`), y guarda el ID de extension que
   te muestra.
5. **Credenciales -> Crear credenciales -> ID de cliente de OAuth** ->
   tipo **Extension de Chrome**. Pega el ID de extension del paso anterior
   como "Item ID".
6. Copia el Client ID generado (`....apps.googleusercontent.com`).

## 3. Configurar variables de entorno

```
cp .env.example .env
```

Y pon el Client ID en `GOOGLE_OAUTH_CLIENT_ID`.

## 4. Build y carga en Chrome

```
npm run build
```

Esto genera `dist/` con `manifest.json`, `newtab.html`, `popup.html`,
`options.html`, `background.js` e iconos.

En Chrome: `chrome://extensions` -> activa "Modo de desarrollador" ->
"Cargar descomprimida" -> selecciona la carpeta `dist/`.

Como fijaste la clave en el manifest (paso 2.4), el ID no cambia entre
recargas, asi que el login de Google seguira funcionando cada vez que
reconstruyas y recargues.

## 5. Desarrollo de la UI

Para iterar rapido en el diseño del popup/options en el navegador normal
(sin recargar la extension cada vez):

```
npm run dev
```

Abre `http://localhost:3000/newtab`, `/popup` o `/options`. Ojo: ahi `chrome.*` no
existe, asi que las llamadas a Drive/identity fallaran en ese modo; sirve
sobre todo para maquetar UI. Para probar el flujo real (login, guardar,
sync) hay que compilar (`npm run build`) y recargar la extension.

## Notas

- El unico scope pedido es `drive.appdata`: la extension nunca ve ni toca
  tus archivos normales de Drive.
- Los iconos en `public/icons/` son un placeholder generado por script;
  cambialos cuando tengas un diseño definitivo.
- Los marcadores borrados se marcan con `deleted: true` en vez de
  eliminarse del todo, para que el borrado se propague entre dispositivos
  en la siguiente sincronizacion en vez de "revivir".
