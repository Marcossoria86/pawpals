# PawPals como app de celular

Esto se armó en dos capas, de la más simple a la más completa:

## 1. Ya instalable, gratis, sin pasar por ninguna tienda (PWA)

Con los cambios de este paquete, la versión web (la que ya está en Render)
ahora se puede "instalar" directo desde el navegador:

- **iPhone**: abrí la web en Safari → botón de compartir (el cuadradito con
  la flecha) → "Agregar a inicio". Queda un ícono propio en la pantalla de
  inicio y abre en pantalla completa, sin la barra de Safari.
- **Android**: abrí la web en Chrome → menú (⋮) → "Instalar app" o "Agregar
  a pantalla de inicio".

No hace falta hacer nada más para esto — ya funciona en cuanto subas estos
cambios a Render.

## 2. App nativa de verdad (para las tiendas)

Se agregó [Capacitor](https://capacitorjs.com), que empaqueta la misma app
web como una app nativa real de iPhone (carpeta `ios/`) y de Android
(carpeta `android/`). Sigue hablando con el mismo backend en Render.

### Antes de compilar: apuntar al backend real

La app nativa no corre en tu compu, así que no puede usar
`http://localhost:4000`. Antes de compilar, editá `frontend/.env` y poné la
URL real de tu API en Render:

```
VITE_API_BASE=https://TU-BACKEND.onrender.com
```

(la url exacta la ves en el dashboard de Render, en el servicio
`pawpals-api`).

### iPhone (necesitás una Mac con Xcode)

1. Instalá [Xcode](https://apps.apple.com/app/xcode/id497799835) desde la
   Mac App Store (gratis).
2. En la terminal, adentro de `frontend/`:
   ```
   npm install
   npm run cap:ios
   ```
   Esto compila la web, la copia adentro del proyecto de iOS, y abre Xcode.
3. En Xcode: conectá tu iPhone por cable (o elegí un simulador), seleccioná
   tu dispositivo arriba, y tocá el botón ▶ (Run).
4. La primera vez, Xcode te va a pedir iniciar sesión con tu Apple ID
   (uno gratis alcanza para instalarla en tu propio iPhone para probarla).
   Puede pedirte "confiar" en el desarrollador desde Ajustes → General →
   VPN y gestión de dispositivos, en el iPhone.

Para **publicarla en la App Store** (que cualquiera la baje) hace falta
además: una cuenta paga de Apple Developer Program (99 USD/año), crear la
ficha en App Store Connect (capturas de pantalla, descripción, política de
privacidad), y pasar la revisión de Apple (unos días). Cuando llegues a ese
paso te ayudo con cada uno.

### Android

1. Instalá [Android Studio](https://developer.android.com/studio) (gratis).
2. En la terminal, adentro de `frontend/`:
   ```
   npm install
   npm run cap:android
   ```
3. En Android Studio: esperá a que sincronice, conectá tu Android por cable
   (con "Depuración USB" activada) o elegí un emulador, y tocá ▶ (Run).

Para publicarla en Google Play: cuenta de desarrollador de Google (pago
único de 25 USD) y crear la ficha en Play Console.

### Cuando cambies algo de la app

Cada vez que edites el código de `frontend/src`, para que el cambio se vea
en la app nativa hay que repetir `npm run cap:ios` o `npm run cap:android`
(recompila la web y la vuelve a copiar adentro del proyecto nativo). La
versión web en Render, en cambio, se actualiza sola con cada `git push`
como ya venimos haciendo.
