# PawPals — prototipo funcional (versión web real)

Esta es la primera versión "de verdad" de PawPals: ya no son datos simulados en el navegador, sino una app con dos servicios reales que hablan entre sí:

- **`backend/`** — API en Node.js + Express, con una base de datos SQLite real (usuarios, mascotas, publicaciones, likes y solicitudes de citas de juego). Incluye registro e inicio de sesión con contraseña.
- **`frontend/`** — La interfaz en React (Vite), con el mismo diseño del prototipo, pero ahora conectada a la API real en vez de datos en memoria.

Viene sembrada con 5 mascotas y usuarios de ejemplo. Para entrar con una cuenta ya creada:

```
correo:      camila@example.com
contraseña:  pawpals123
```

También puedes crear tu propia cuenta y perfil de mascota desde la pantalla de registro.

## Probarlo en tu computadora (antes de publicarlo)

Necesitas [Node.js](https://nodejs.org) 22.5 o superior instalado (usamos el módulo de SQLite incluido en Node, así no hace falta compilar nada nativo).

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env.example .env
npm start
# queda escuchando en http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev
# abre la URL que te muestre, normalmente http://localhost:5173
```

## Probarlo en tu celular (sin subirlo a internet todavía)

Si tu celular está conectado al **mismo Wi-Fi** que tu computadora, puedes verlo ahí mismo sin necesidad de Render ni GitHub:

1. En tu computadora, con las dos terminales corriendo (backend y frontend), busca la IP local de tu computadora:
   ```
   ipconfig getifaddr en0
   ```
   (Si no te muestra nada, prueba `ipconfig getifaddr en1`, o revisa en Configuración → Wi-Fi → Detalles → Dirección IP). Te va a dar algo como `192.168.1.23`.
2. Edita (o vuelve a crear) el archivo `.env` de `backend/` con:
   ```
   PORT=4000
   CLIENT_ORIGIN=http://TU_IP:5173
   JWT_SECRET=cambia-esto-por-algo-secreto
   NODE_ENV=development
   ```
3. Edita el archivo `.env` de `frontend/` con:
   ```
   VITE_API_BASE=http://TU_IP:4000
   ```
   (en ambos casos, reemplaza `TU_IP` por lo que te dio el paso 1, por ejemplo `192.168.1.23`).
4. Reinicia ambas terminales (`Ctrl + C` y vuelve a correr `npm start` en backend, `npm run dev` en frontend).
5. En tu celular (misma red Wi-Fi), abre el navegador y entra a `http://TU_IP:5173`.

Esto solo funciona mientras tu computadora esté prendida y conectada a esa red — es perfecto para probarlo ya mismo, pero para que cualquiera lo abra desde cualquier lado (datos móviles, otra red, etc.) sí hace falta publicarlo en Render como se explica abajo.

## Publicarlo con una URL real y gratis (Render)

Este paquete incluye un archivo `render.yaml` para que Render cree los dos servicios (API + sitio web) de un solo golpe. Son unos 10 minutos, la mayoría esperando a que termine de construir.

1. **Sube este código a GitHub.** Si no tienes cuenta, créala en [github.com](https://github.com) (gratis). Crea un repositorio nuevo (puede ser privado) y sube el contenido de esta carpeta `pawpals/` — puedes arrastrar los archivos desde la web de GitHub si no usas git desde la terminal.
2. **Crea una cuenta en [Render](https://render.com)** (puedes entrar directamente con tu cuenta de GitHub).
3. En el dashboard de Render, elige **New → Blueprint** y selecciona el repositorio que acabas de subir. Render va a leer `render.yaml` automáticamente y va a proponer crear dos servicios: `pawpals-api` (backend) y `pawpals-web` (frontend). Confírmalo.
4. Espera a que ambos terminen de construir (verás "Live" en verde en cada uno). Cada servicio tendrá su propia URL, algo como `https://pawpals-api-xxxx.onrender.com` y `https://pawpals-web-xxxx.onrender.com`.
5. **Conecta uno con el otro** (un solo paso manual, porque Render necesita que existan primero para darles URL):
   - Entra al servicio `pawpals-api` → pestaña **Environment** → variable `CLIENT_ORIGIN` → pega ahí la URL de `pawpals-web`.
   - Entra al servicio `pawpals-web` → pestaña **Environment** → variable `VITE_API_BASE` → pega ahí la URL de `pawpals-api`.
   - Guarda ambos; Render los va a volver a desplegar solo (tarda 1-2 minutos).
6. Abre la URL de `pawpals-web` desde tu celular o donde quieras. Esa es tu app en vivo.

No debería pedirte tarjeta de crédito para estos dos servicios gratuitos. Si en algún paso Render te la solicita, puedes cancelar sin costo — dímelo y buscamos una alternativa.

### Una limitación importante del plan gratuito

Render **no conserva archivos en disco** en el plan gratuito: cada vez que el servicio se reinicia o se "duerme" por inactividad (pasa tras ~15 minutos sin uso), la base de datos SQLite vuelve a su estado inicial (las 5 mascotas de ejemplo). Es decir, para *mostrar la idea a otras personas* funciona perfecto, pero **no sirve todavía para usuarios reales que esperan que sus datos se queden guardados para siempre**.

Cuando quieras dar ese salto, el siguiente paso es cambiar la base de datos a un Postgres gratuito y persistente (por ejemplo Neon o Supabase, que no se borran solos) — es un cambio acotado en `backend/src/db.js`, avísame cuando quieras que lo hagamos.

Lo mismo aplica a las **fotos, historias y videos de reels que suban los usuarios**: se guardan en `backend/uploads/`, que también es disco efímero en el plan gratuito de Render. Para que ese contenido se quede guardado para siempre (sobre todo los videos, que pesan más), el paso natural es moverlo a un almacenamiento externo (por ejemplo Cloudinary o un bucket S3, ambos con capa gratuita) en vez del disco del propio servidor — también lo podemos hacer cuando quieras avanzar a usuarios reales.

## Qué sigue

Con la web ya validada, el plan (como hablamos) es construir la app móvil con React Native compartiendo esta misma API — así el backend no se duplica, igual que hace Facebook con su web en React y su app en React Native.
