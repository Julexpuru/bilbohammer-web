# Bilbohammer - Web del club

Portal del club Bilbohammer desarrollado con Next.js 14 (App Router) y una API integrada que cubre novedades, eventos, la galeria, el directorio de socios y los flujos de administracion (usuarios, roles, juegos, contenidos estaticos y contacto). Este README resume el stack, los pasos de despliegue y las tareas de operacion diaria.

## Caracteristicas destacadas
- Frontend + API en Next.js 14 con TypeScript, Tailwind y componentes reutilizables.
- Autenticacion NextAuth v5 (JWT) con credenciales locales y Google OAuth opcional.
- Roles basados en Prisma (`ADMIN`, `JUNTA`, `REDACTOR`, `SOCIO`, `AMIGO`) usados por middleware y componentes para abrir o cerrar vistas.
- Modulos funcionales del club: novedades segmentadas por tipo, calendario de eventos con filtros, galeria con filtros y subidas, juegos con fichas editables, contacto dinamico, tablon de socios y panel de administracion (gestion de usuarios, roles y cargos).
- Uploads directos a Cloudflare R2 con URLs prefirmadas y CDN (sin base64 ni disco local).
- Politica de cookies en `/politica-de-cookies` con banner GDPR ready (solo cargamos Google Tag Manager al aceptar analiticas).

## Stack tecnico
- **Next.js 14** (App Router, server components, streaming).
- **Prisma ORM + PostgreSQL 16** para todos los datos.
- **NextAuth v5 (JWT)** con adaptador Prisma (`PrismaIntAdapter`) y Google OAuth.
- **Tailwind CSS** y componentes propios para UI.
- **Docker Compose** para desarrollo local completo (web + Postgres + SFTP opcional).
- **Zod**, `tsx` y scripts utilitarios para seeds y migraciones de contenido.

## Requisitos
- Node.js 18+ y npm 10+ (si trabajas sin Docker).
- Docker + Docker Compose (recomendado para tener Postgres listo).
- Acceso a una base de datos Postgres y variables de entorno descritas mas abajo.

## Puesta en marcha rapida
### Opcion 1: Docker Compose (recomendada)
```bash
git clone <repo>
cd bilbohammer
cp web/.env.example web/.env   # completa DATABASE_URL y secretos
docker compose up --build
docker compose exec web npx prisma generate
docker compose exec web npx prisma migrate dev --name init
docker compose exec web npm run seed
```
La aplicacion queda disponible en http://localhost:3000 con un admin inicial `admin@bilbohammer.eus / admin123`. Cambia estas credenciales tras la primera entrada.

### Opcion 2: solo Node (sin Docker)
```bash
cd bilbohammer/web
cp .env.example .env           # rellena DATABASE_URL y claves
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed                   # crea datos demo y usuarios
npm run dev
```
Necesitas que `DATABASE_URL` apunte a una instancia Postgres accesible desde tu maquina (puede ser la misma del Docker `db`).

## Base de datos y seeding
- `npm run seed` genera usuarios de ejemplo (admin, junta, redactores, socios) + juegos, articulos demo, eventos, galerias basicas y contenido de contacto.
- `npm run seed:prod` esta pensado para un entorno ya migrado y solo crea el usuario admin si no existe.
- Credenciales por defecto: `admin@bilbohammer.eus / admin123`. Cambialas en cuanto despliegues.
- Para aplicar migraciones en entorno productivo: `npx prisma migrate deploy`. Si aun no hay migraciones, usa `npx prisma db push` una unica vez.

## Variables de entorno
Define las variables en `web/.env` (para Docker) o en el proveedor de hosting:

**Core / infraestructura**
- `DATABASE_URL`: cadena completa de Postgres.
- `APP_BASE_URL`: URL publica del frontend (ej. https://bilbohammer.es).
- `AUTH_URL` y `NEXTAUTH_URL`: URL que NextAuth usara para callbacks (generalmente igual que `APP_BASE_URL`).
- `CORS_ALLOWED_ORIGINS`: lista separada por comas para las apps que consumen la API.
- `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`: credenciales R2 (S3 compatible).
- `STORAGE_PUBLIC_BASE`: base CDN para archivos subidos (ej. `https://cdn.bilbohammer.es/uploads`).
- `NEXT_PUBLIC_UPLOAD_BASE`: misma base CDN para render en cliente.
- `NEXT_PUBLIC_ASSETS_BASE` (opcional): base CDN para assets estaticos (`/public/assets`).

**Autenticacion**
- `AUTH_SECRET` / `NEXTAUTH_SECRET`: clave usada para firmar JWT.
- `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`: credenciales de Google OAuth (si no las pones, el boton sigue oculto).

**Correo saliente (opcional)**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

**Notificaciones push y recordatorios**
- `VAPID_PUBLIC_KEY` y `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: misma clave publica VAPID, la segunda expuesta al navegador.
- `VAPID_PRIVATE_KEY`: clave privada VAPID, solo servidor.
- `VAPID_SUBJECT`: contacto del emisor push, previsto como `mailto:no-reply@bilbohammer.es`.
- `NOTIFICATIONS_CRON_SECRET`: secreto para invocar `/api/notifications/dispatch-reminders` desde el cron de produccion.

**Variables publicas (expuestas al navegador)**
- `NEXT_PUBLIC_INSTAGRAM_PROFILE`
- `NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID`
- `NEXT_PUBLIC_YOUTUBE_VIDEO_ID`
- `NEXT_PUBLIC_GTM_ID` (GTM-WBXCJ8QS en produccion ahora mismo).

**SEO y control de bots**
- `SEO_ROBOTS_BLOCKED_BOTS`: user-agents que apareceran bloqueados en `robots.txt`.
- `SEO_ROBOTS_THROTTLED_BOTS`: user-agents a los que se aplicara `crawl-delay` en `robots.txt` (opcional).
- `SEO_ROBOTS_CRAWL_DELAY_SECONDS`: segundos de `crawl-delay` para `SEO_ROBOTS_THROTTLED_BOTS`.
- `BOT_BLOCKED_USER_AGENTS`: bloqueo duro en middleware (HTTP 403), incluso si ignoran `robots.txt`.
- `BOT_TRUSTED_INDEXER_USER_AGENTS`: bots de indexacion permitidos para no romper SEO.
- `BOT_RATE_LIMIT_ENABLED`: activa limitacion por IP para trafico automatizado detectado.
- `BOT_RATE_LIMIT_WINDOW_SECONDS` y `BOT_RATE_LIMIT_MAX_REQUESTS`: ventana y cupo de requests.
- `BOT_RATE_LIMIT_PATH_PREFIXES`: rutas protegidas por rate-limit (`/` aplica a todo el sitio).
- `BOT_RATE_LIMIT_EXEMPT_PATHS`: rutas exentas (por defecto `robots.txt` y `sitemap.xml`).

## Scripts disponibles
- `npm run dev`: Next.js en modo desarrollo.
- `npm run build`: genera el cliente Prisma y compila el proyecto (usa en CI).
- `npm run start`: arranca la build en modo produccion.
- `npm run lint`: reglas ESLint/Next.
- `npm run seed` / `npm run seed:prod`: semillas descritas arriba.
- `npm run migrate:legacy-media`: script auxiliar para mover iconos y assets de juegos antiguos.
- `npm run migrate:uploads-r2`: migra ficheros legacy desde `storage/uploads` a R2.
- `npm run normalize:upload-urls`: normaliza URLs legacy en BD a la base CDN.
- `npm run sync:public-assets`: sube `public/assets` a R2 (prefijo `assets/`).
- `npx prisma migrate dev --name <nombre>`: crea una migracion nueva.

## Estructura del repo
```
bilbohammer/
|-- docker-compose.yml
|-- README.md
`-- web/
    |-- package.json / tsconfig / tailwind / Dockerfile
    |-- .env, .env.example, .env.production
    |-- prisma/
    |   |-- schema.prisma
    |   |-- seed.ts, seed.production.ts
    |   `-- migrations/
    |-- public/ (assets estaticos, favicon)
    |-- storage/uploads (legacy, solo para migraciones puntuales)
    `-- src/
        |-- app/ (App Router + API routes)
        |-- components/ (UI compartida, cookies, perfil, eventos, galeria...)
        |-- lib/ (auth, roles, gallery, uploads, juegos, contact-content)
        `-- providers/, constants/, scripts/...
```

## Roles y permisos a alto nivel
| Rol      | Capacidades clave |
|----------|-------------------|
| `ADMIN`  | Acceso total. Gestiona usuarios, roles, invitaciones, juegos, contacto, eventos, galeria, tablon y contenidos de novedades. |
| `JUNTA`  | Puede gestionar practicamente lo mismo que `ADMIN`: crear/editar eventos y galeria, actualizar contacto y juegos, asignar cargos del tablon y usar las herramientas del panel. |
| `REDACTOR` | Crear y editar articulos de novedades (publicos o privados) y vincularlos con eventos. |
| `SOCIO`  | Accede a la pestana privada de novedades, al tablon de socios, al contacto con Discord y a las fichas con datos internos. |
| `AMIGO`  | Cuenta registrada sin permisos especiales. Ve contenido publico y puede completar su perfil mientras espera promocion. |

La logica de comprobacion esta centralizada en `src/lib/roles.ts` y los middlewares/guardas de cada pagina. Consulta `MANUAL_FUNCIONAL.md` para la descripcion funcional completa.

## Uploads y ficheros estaticos
- Las subidas usan URLs prefirmadas a R2; el backend solo guarda la URL final (no base64, no disco local).
- `/uploads/*` redirige al CDN cuando `STORAGE_PUBLIC_BASE` esta configurado.
- `public/assets` son estaticos del repo; puedes mantenerlos en la imagen o sincronizarlos a R2 con `npm run sync:public-assets` y `NEXT_PUBLIC_ASSETS_BASE`.
- Estructura recomendada en R2: `uploads/` para contenido generado por usuarios y `assets/` para estaticos versionados.
- `public/uploads` y `storage/uploads` son legacy y solo se usan para migraciones.

## Despliegue
1. Prepara una base de datos Postgres gestionada (Neon, Supabase, Railway, RDS...) y copia la URL en `DATABASE_URL`.
2. Ejecuta `npm run build` (o deja que Vercel lo haga). Antes de arrancar, corre `npx prisma migrate deploy` o `npx prisma db push`.
3. Configura las variables en la plataforma (APP_BASE_URL, NEXTAUTH_URL, AUTH_SECRET, SMTP si aplica, VAPID y `NOTIFICATIONS_CRON_SECRET` para push/recordatorios, etc.).
4. Publica la carpeta `web` en Vercel, Render, Fly.io o un VPS con Docker. Si usas Render, deja el start command como `npm start` para que Next.js respete el `PORT` inyectado por la plataforma y configura `APP_BASE_URL` con la URL publica final. Si usas Vercel, anade `NEXT_PUBLIC_GTM_ID` para que el banner pueda cargar GTM en produccion.
5. Configura las variables de R2/CDN y ejecuta las migraciones de uploads/URLs si vienes de storage local.

## Seguridad y cumplimiento
- El `middleware.ts` fuerza HTTPS en produccion, anade HSTS, Content-Security-Policy (upgrade-insecure-requests) y cabeceras de seguridad comunes.
- Las APIs controlan CORS con `APP_BASE_URL` y `CORS_ALLOWED_ORIGINS` (en dev ya se permiten localhost/127.0.0.1).
- Banner de cookies y pagina detallada en `/politica-de-cookies` con consentimiento granular para GTM/Analytics. Sin consentimiento no se ejecuta ningun script de terceros.
- Las subidas validan el content-type y generan claves unicas en R2 con cache-control largo.

## Documentacion extra
- `MANUAL_FUNCIONAL.md`: explica cada seccion funcional y como operan los distintos roles.
- El directorio `docs/` (si lo creas) puede albergar diagramas o notas adicionales.

Si detectas un bug o necesitas ampliar el flujo de permisos, revisa `MANUAL_FUNCIONAL.md` y los hooks en `src/lib/roles.ts` antes de modificar componentes.
