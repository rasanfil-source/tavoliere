# Desarrollo y pruebas

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](../SVILUPPO_E_TEST.md) [![English](https://img.shields.io/badge/language-English-6b7280)](../en/DEVELOPMENT_AND_TESTING.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-16615a)](DESARROLLO_Y_PRUEBAS.md)

## Requisitos

- Node.js `24.12.0`, como se indica en `.nvmrc`;
- npm;
- PowerShell 7 en Windows;
- Java 21 para los emuladores Firebase (también se admite el runtime portátil de `.tools`).

## Instalación

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm install"
```

## Servidor local

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/dev-server.mjs 4180"
```

El servidor expone la build de desarrollo en `http://127.0.0.1:4180`. Utilizar únicamente credenciales y centros autorizados; no copiar datos reales en las fixtures.

## Estructura del repositorio

```text
prototypes/firebase-spark-pwa/
  public/      fuentes de la PWA
  dist/        paquete generado y publicado
  scripts/     validadores locales
  firebase.json
  firestore.rules
tests/
  firebase-spark/   pruebas de aplicación y estáticas
  firebase-rules/   pruebas de las reglas
tools/              build, validación, deploy, backup y verificación
docs/               documentación mantenida
```

No modificar directamente `dist`: ejecutar la build después de cambiar `public`.

## Comandos principales

```powershell
# Suite de aplicación y traducciones
pwsh.exe -NoLogo -NoProfile -Command "npm test"

# Solo frontend
pwsh.exe -NoLogo -NoProfile -Command "npm run test:firebase"

# Validación de catálogos i18n
pwsh.exe -NoLogo -NoProfile -Command "npm run test:i18n"

# Reglas Firestore con emuladores
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"

# Build de producción
pwsh.exe -NoLogo -NoProfile -Command "npm run build"

# Proceso previo a la publicación
pwsh.exe -NoLogo -NoProfile -Command "npm run predeploy:gate"
```

## Criterios mínimos de aceptación

Para autenticación y autorización, comprobar:

1. residente con código personal y contraseña común;
2. vice con código personal y contraseña de administradores;
3. administrador con Google;
4. administrador con correo verificado y contraseña;
5. entrada y salida del panel;
6. paso del panel a las reservas y regreso;
7. actualización en cada estado;
8. cierre de sesión y nuevo acceso;
9. cierre y reapertura de la PWA;
10. pestañas y controles correctos para cada rol.

Para cambios visuales, comprobar en el navegador al menos un ancho móvil y uno de escritorio, sin depender únicamente de pruebas estáticas.

## Internacionalización

Los idiomas de la interfaz son italiano, inglés, francés, español y alemán. Cada clave nueva debe estar presente en todos los catálogos de `public/i18n`. El validador rechaza claves ausentes, valores vacíos y placeholders incoherentes.

La documentación pública se mantiene por defecto en italiano, con ediciones completas en inglés y español enlazadas mediante distintivos de idioma.

## Datos de prueba

- No guardar credenciales reales en el código ni en las pruebas.
- No incluir en commits URL con tokens operativos.
- Conservar copias de seguridad y diagnósticos solo en carpetas ignoradas por Git.
- Preferir emuladores y fixtures sintéticas para pruebas destructivas.
