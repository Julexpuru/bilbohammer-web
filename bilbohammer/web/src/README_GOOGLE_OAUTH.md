
# Configuración de Login con Google (OAuth 2.0) para Bilbohammer

Este documento describe cómo configurar Google OAuth para que los usuarios puedan iniciar sesión con su cuenta de Google en el proyecto **Bilbohammer**.

---

## 1. Conceptos clave
- **Gratis**: el uso de OAuth para obtener `email`, `name` y `picture` es gratuito incluso en producción, mientras no uses APIs de pago.
- **Testing vs Production**:
  - **Testing**: solo pueden iniciar sesión las cuentas listadas como *Test users* (hasta 100). No requiere publicar la app.
  - **Production**: cualquier persona con Google puede iniciar sesión. Google puede pedir **Política de Privacidad** y **Términos de uso** si publicas.

---

## 2. Paso a paso para configurar

### 2.1 Crear proyecto (si no tienes uno)
1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Selecciona **Nuevo proyecto**, ponle nombre (p.ej. `Bilbohammer Auth`) y crea.

### 2.2 Configurar pantalla de consentimiento
1. Ve a: **APIs & Services** → **OAuth consent screen**.
2. Selecciona **User Type** → **External** (permite que cualquier cuenta de Google use el login).
3. Rellena:
   - **App name**: Bilbohammer
   - **User support email**: tu correo
   - **Developer contact email**: tu correo
4. **Scopes**: añade `email` y `profile`.
5. **Test users**: añade tu correo (y otros de prueba si lo dejas en Testing).
6. Guarda.

### 2.3 Crear credenciales OAuth
1. Ve a **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. **Application type**: Web application.
3. **Authorized JavaScript origins**:
   - `http://localhost:3000` (desarrollo local)
   - `https://tudominio.com` (producción, cuando lo tengas)
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://tudominio.com/api/auth/callback/google`
5. Crea y copia:
   - **Client ID** → `AUTH_GOOGLE_ID`
   - **Client Secret** → `AUTH_GOOGLE_SECRET`

### 2.4 Variables de entorno
En `.env` del proyecto:
```
AUTH_GOOGLE_ID=tu-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=tu-client-secret
AUTH_URL=http://localhost:3000            # en producción: https://tudominio.com
AUTH_SECRET=                              # generar con: openssl rand -base64 32
DATABASE_URL=                             # conexión a base de datos
```

### 2.5 Probar en local
1. Arranca la app (`npm run dev` o equivalente).
2. Ve a `/login` y pulsa **Continuar con Google**.
3. Si está en Testing, solo los *Test users* podrán entrar.

### 2.6 Pasar a producción
1. En Google Cloud, añade en **Authorized JavaScript origins** y **Authorized redirect URIs** el dominio real (`https://tudominio.com`).
2. En la pantalla de consentimiento, pulsa **Publish App** para pasar a producción.
3. Añade `AUTH_URL=https://tudominio.com` en `.env` del servidor.

---

## 3. Limitaciones y notas
- **Testing**: limitado a 100 *Test users*. Ideal para desarrollo y pruebas internas.
- **Production**: acceso abierto; Google puede pedir URL de Política de Privacidad y/o Términos de uso.
- **Scopes**: mantener solo `openid`, `email`, `profile` para login básico y gratuito.
- **Coste**: gratis para login básico, sin límite de usuarios reales mientras no uses APIs de pago.

---

## 4. Recomendaciones
- Crear una **Política de Privacidad** simple y enlazarla en la pantalla de consentimiento.
- Verificar tu dominio en Google Search Console cuando uses dominio propio.
- Mantener seguras las variables de entorno (`.env`) y no subirlas a repos públicos.

---

**Última revisión:** Agosto 2025
