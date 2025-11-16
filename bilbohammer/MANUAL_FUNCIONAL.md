# Manual funcional de Bilbohammer

Este documento resume que muestra cada seccion de la web, que flujos hay implementados y como se relacionan con los roles (`PUBLICO`, `AMIGO`, `SOCIO`, `REDACTOR`, `JUNTA`, `ADMIN`). La informacion se ha extraido del codigo actual (`src/app`, `src/components`, `src/lib`).

## 1. Roles y niveles de acceso

| Rol | Acceso destacado |
| --- | ---------------- |
| Publico | Navega por inicio, novedades abiertas, eventos, galeria, sobre nosotros, login y registro. |
| Amigo | Usuario registrado sin rol de socio. Puede iniciar sesion y editar su perfil, pero no accede a contenido privado. |
| Socio | Ve la pestana privada de novedades, el tablon de socios, la invitacion a Discord y aparece en los listados internos. |
| Redactor | Todas las capacidades de socio y ademas puede crear/editar articulos en `/novedades`. |
| Junta | Administra eventos, galeria, juegos, contacto, tablon, asignaciones de junta y todo el panel de usuarios. |
| Admin | Lo mismo que la junta mas las operaciones criticas (eliminar usuarios, resetear contrasenas, etc.). |

## 2. Paginas publicas e informacion del club

### 2.1 Inicio (`/`)
- Componentes `HeroCarousel`, `FeedTabs`, `EventsCalendar` e `InstagramFeed`.
- La pagina carga anuncios y eventos desde Prisma y muestra lineas privadas cuando hay sesion (`initialByType.NOTICIA_PRIVADA`).
- Socios, redactores, junta y admin ven la pestana privada; el resto se queda con anuncios/eventos.

### 2.2 Novedades (`/novedades`)
- `NovedadesContent` trae articulos agrupados (noticias, cronicas, solo socios), permite buscar por texto y acotar por fechas.
- El detalle (`/novedades/[category]/[slug]`) oculta las piezas de `members` a quien no sea socio ni gestor.
- Botones:
  - `Crear noticia` aparece si el rol es `ADMIN`, `JUNTA` o `REDACTOR`.
  - `/novedades/nueva` y `/novedades/[category]/[slug]/editar` renderizan `ArticleEditor`, que admite bloques de tipo parrafo, titular, cita o imagen, subida de banner, tags y enlace opcional a un evento (`linkEventId`).
- Comentarios: `ArticleDetailView` permite comentar cuando hay sesion iniciada.

### 2.3 Eventos
- `EventsExplore` (ruta `/eventos`) incluye busqueda, filtros por organizador (Bilbohammer vs otros), tipo (torneo, liga, workshop, social), juego (`useGamesCatalog`), precio, eventos pasados y orden asc/desc. La carga es paginada con un boton Ver mas.
- El boton `Crear evento` solo aparece para junta y admin (`userCanManageEvents`).
- Ficha (`/eventos/[slug]`):
  - Tabs dinamicos: descripcion, archivos/enlaces, clasificacion (rankings + destacados), cronica, galeria y ubicacion. Cada tab se puede activar/desactivar desde `EventForm`.
  - Muestra banners, estado (`EventStatusBadge`), etiquetas, organizadores (usuarios internos + organizaciones externas) y datos de ubicacion, precios y plazas.
  - Si `userCanEditEvent` devuelve true (admin, junta o persona asignada como organizer) aparece `Editar evento`.
- Formularios `/eventos/nuevo` y `/eventos/[slug]/editar` (`EventForm`):
  - Campos clave: fechas, timezone, ubicacion (texto, lat/lon, enlace de Google Maps), precios general/socios, aforo, flags `isInternal` y `isMembersOnly`, tabs visibles, resumen y recap.
  - Configura tags, organizadores, organizaciones colaboradoras, adjuntos (PDF, reglamentos), links externos, highlights (`FIRST`, `SECOND`, `THIRD`, `AWARD`), rankings, album asociado y cronica vinculada a una noticia.

### 2.4 Galeria
- `/galeria` usa `GalleryPageContent`: hero aleatorio, filtros (`GalleryFilters`) por juego/formato/ano/etiquetas, tarjetas de album y fotos sueltas con visor (`GalleryViewer`).
- Boton `Subir contenido` visible para junta/admin (`canUpload`). El modal (`GalleryContentUploader`) permite:
  - Elegir modo `album` o `standalone`.
  - Subir imagenes, establecer titulo, fecha, ubicacion, tags, juego y formato.
  - Buscar colaboradores dentro del club (`/api/members/search`) y fijar portada.
- `/galeria/[albumId]` renderiza `AlbumDetailView`:
  - Si `editAccess` es `admin` (junta/admin) el usuario puede editar y eliminar el album. Si es `edit` (colaborador) puede actualizar fotos y metadatos. El resto solo visualiza.

### 2.5 Sobre nosotros
- `Quienes somos`: pagina estatica con historia y valores.
- `Juegos`: `GameCard` muestra descripcion, inversion, tiempo de partida, curva de aprendizaje, contacto y numero de socios por juego. Junta/Admin pueden reordenar juegos, editar contenido (`/api/admin/game-info/:slug`) y crear nuevos desde `NewGameForm`.
- `Contacto`: muestra WhatsApp, Instagram, correo, Discord, plan de visitas y condiciones de alta basadas en `siteContent.contact-page`. Socios ven el bloque de Discord (`canSeeDiscord`). Junta/Admin ven controles de edicion (PATCH `/api/admin/contact-content`). El componente tambien muestra el contador de socios activos (consulta Prisma).
- `Tablon de socios`: acceso restringido a cuentas con `SOCIO`, `JUNTA` o `ADMIN`.
  - Estructura en piramide (`BOARD_SLOT_CONFIG`) mostrando presidencia, cargos y vocalias. Junta/Admin pueden asignar y quitar personas con los botones `Asignar`.
  - Listado completo de socios ordenado alfabeticamente (`toMemberCard`), con etiquetas de rol y fecha de alta.
  - Boton `Ponme cara` permite a cada persona subir una foto facial (usa `/api/upload/avatar` y luego PATCH `/api/me/profile` con `facePhotoUrl`). Solo el propio usuario ve el control de subida.

### 2.6 Politica de cookies y consentimiento
- Banner (`CookieConsentBanner`) aparece hasta aceptar o rechazar las cookies de analitica. Solo al aceptar se monta `GtmLoader` con `NEXT_PUBLIC_GTM_ID`.
- La pagina `/politica-de-cookies` documenta cookies tecnicas de NextAuth, almacenamiento local (`bh-cookie-consent`, `bh-theme`) y las cookies que coloca Google cuando se ha dado permiso.

## 3. Espacio personal

### 3.1 Mi perfil (`/mi-perfil`)
- Server component que carga datos del usuario (`prisma.user`) y los muestra con `Avatar`, roles, email, resumen de membresia y biografia.
- `GamesSection` lista los juegos con iconos y facciones (mapeadas con `toUiId`). `EventsTabs` ensena los eventos que el usuario ha organizado o en los que aparece en rankings/highlights.
- `ClientEditWrapper` (modal) permite editar:
  - Nombre, nick, descripcion, fecha de alta (almacenada al primer dia del mes), avatar (`/api/upload/avatar`), juegos marcados y facciones para W40K/AoS/TOW.
  - Las altas/bajas de juegos se sincronizan con `userGame` y las facciones con los enums Prisma correspondientes (`PATCH /api/me/profile`).

### 3.2 Login, registro e invitaciones
- `/login`: formulario credenciales + boton Google (NextAuth). Incluye enlace a `/register`.
- `/register`: cualquier persona puede crear cuenta. Entra como `AMIGO` a la espera de que la junta le asigne otro rol.
- `/register/invite/[token]`: valida invitaciones (`UserInvite`), pre rellena correo y rol, expira enlaces usados o caducados y muestra error si el email ya existe.
- Cambios de contrasena locales se gestionan desde Admin > Gestion de usuarios (boton Cambiar contrasena).

## 4. Panel de administracion

### 4.1 Resumen (`/admin`)
- Simple tarjeta que valida la sesion y recuerda los modulos activos. Se puede ampliar con accesos directos.

### 4.2 Gestion de usuarios (`/admin/gestion-usuarios`)
- `UserManagementView` renderiza la tabla definida en `table-config.ts`. Controles principales:
  - Edicion en linea de nombre, nick, email, roles, etiquetas, estado, fechas de membresia y descripcion. Cambios pendientes se guardan por lotes (`/api/admin/users/bulk-update`).
  - Exportar CSV de todos los usuarios.
  - Historial (`/api/admin/users/history`) con registro de cambios (campos modificados, quien lo hizo y cuando).
  - Modal de edicion avanzada (boton Editar usuario) para tocar campos adicionales, activar/desactivar cuentas, etc.
  - Reset de contrasena (`/api/admin/users/:id/password`) y borrado (`DELETE /api/admin/users/:id`).
  - Invitar por correo (`/api/admin/user-invitations`) con copia al portapapeles.
  - Filtros rapidos por rol y busqueda textual.
- Solo junta y admin acceden a la pagina. El resto ve Acceso restringido.

### 4.3 Gestion documental (`/admin/gestion-documental`)
- Vista protegida para junta/admin que por ahora solo muestra un mensaje informando que los flujos de actas y archivos internos se definiran mas adelante.

### 4.4 APIs administrativas complementarias
- `/api/admin/games` y `/api/admin/game-info/:slug`: altas/bajas de juegos y edicion de fichas.
- `/api/admin/contact-content`: guardado de la pagina de contacto.
- `/api/admin/board-assignments`: asignacion de cargos del tablon.
- `/api/members/search`: buscador de miembros activo por nombre, nick o email (usado en tablon y galeria).
- `/api/upload/*`: subida de ficheros (avatar, fotos de cara) en `storage/uploads`.

## 5. Notas finales
- Los ficheros subidos se sirven desde `/uploads/[...path]` (ver `src/app/uploads/[...path]/route.ts`). Se puede cambiar la raiz con `UPLOADS_ROOT` y el prefijo publico con `UPLOADS_PUBLIC_PREFIX`.
- `middleware.ts` aplica HTTPS, cabeceras de seguridad y CORS dinamico. Si despliegas detras de un proxy, asegurate de reenviar `x-forwarded-proto`.
- Antes de habilitar nuevos servicios de terceros revisa el banner de cookies y actualiza `/politica-de-cookies` y `CookieConsentBanner` para respetar el consentimiento.

Con este manual puedes localizar que datos vive en cada seccion y que rol debe ejecutar cada accion operativa dentro de la web.
