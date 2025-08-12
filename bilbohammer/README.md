# Bilbohammer — Web del club

Stack elegido por sencillez y mantenibilidad:
- **Next.js 14 (App Router, TypeScript)** para frontend **y** API.
- **Tailwind CSS** para estilos.
- **Prisma + Postgres** para datos (con enum de **roles**).
- **NextAuth** (JWT) con **Credentials** y Google opcional.
- **Docker Compose** para desarrollo local.

## Puesta en marcha (dev)

1) Requisitos: Docker y Docker Compose.
2) Clona el repo y entra en la carpeta `bilbohammer`.
3) Levanta todo:
```bash
docker compose up --build
```
La primera vez puede tardar porque instalará dependencias.

4) Abre otra terminal (o usa `docker compose exec`):
```bash
# Generar cliente Prisma y aplicar migraciones
docker compose exec web npx prisma generate
docker compose exec web npx prisma migrate dev --name init

# Sembrar usuario admin (admin@bilbohammer.eus / admin123)
docker compose exec web npm run seed
```

5) Visita: http://localhost:3000

## Acceso administrador
- Email: `admin@bilbohammer.eus`
- Contraseña: `admin123`
> Cambia estas credenciales en producción.

## Estructura
```
bilbohammer/
  docker-compose.yml
  web/
    Dockerfile
    .env(.example)
    prisma/
      schema.prisma
      seed.ts
    src/
      app/ (App Router)
        api/auth/[...nextauth]/route.ts
        (páginas: /, /novedades, /galeria, /sobre-nosotros, /admin)
      components/ (Nav, Footer)
      lib/ (auth, prisma, roles)
    tailwind.config.ts, postcss.config.mjs, tsconfig.json
```

## Roles previstos
- `ADMIN`, `BOARD` (Junta), `MEMBER` (Socio), `FRIEND` (Amigo).
La protección de `/admin` se hace vía **middleware** + sesión NextAuth.

## Despliegue futuro
- Puede desplegarse en Vercel + una base de datos Postgres gestionada (Railway, Supabase, Neon).
- O en un VPS con Docker (Render, Fly.io, Hetzner).

## Edición de archivos por SFTP (opcional)
En `docker-compose.yml` tienes un servicio `sftp` **comentado**. Si lo quieres usar en local:
- Descomenta el bloque y ejecuta `docker compose up -d sftp`.
- Conéctate por SFTP a `localhost:2222` con usuario `editor` / pass `editor`.
- La carpeta `/home/editor/web` apunta a `./web`.

> Para producción, **recomendado Git** y CI/CD, no FTP/SFTP.

## Notas
- `.env` ya apunta al contenedor `db`. Copia `.env.example` si la pierdes.
- Si usas Google OAuth, rellena `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
- Para producción, cambia `NEXTAUTH_SECRET` y usa HTTPS.
