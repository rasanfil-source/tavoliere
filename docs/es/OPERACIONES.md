# Operaciones, publicación y recuperación

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](../OPERATIONS.md) [![English](https://img.shields.io/badge/language-English-6b7280)](../en/OPERATIONS.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-16615a)](OPERACIONES.md)

## Gestión operativa de las sesiones

Entrar y salir del panel es navegación y no destruye la sesión. El comando **Salir** finaliza deliberadamente el acceso del dispositivo.

### Dispositivo perdido o no disponible

Revocar un solo dispositivo requiere su token, que normalmente no está disponible a distancia. En caso de riesgo, el administrador debe **suspender temporalmente a la persona**: la operación revoca las credenciales operativas conocidas y **bloquea todos sus dispositivos**. Tras la comprobación, la persona puede reactivarse y acceder de nuevo.

La desactivación de un centro conserva los datos: **la acción no se presenta como una eliminación definitiva** y debe indicar claramente que la información permanecerá guardada.

Los enlaces operativos deben regenerarse cuando se sospeche que han llegado a destinatarios no previstos.

## Controles previos a la publicación

1. Comprobar que el worktree contenga únicamente los cambios previstos.
2. Ejecutar pruebas, validación i18n y pruebas de reglas.
3. Ejecutar la build y comprobar `git diff --check`.
4. Probar en el navegador los recorridos modificados en móvil y escritorio.
5. Crear un commit descriptivo que sirva como punto de retorno.
6. Publicar Hosting; incluir Firestore solo si han cambiado reglas o índices.
7. Verificar los hashes servidos por el sitio público.

## Deploy

Hosting y reglas:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run deploy:firebase"
```

Solo Hosting:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/firebase-cli.mjs --config firebase.json --project tavola-comune deploy --only hosting"
```

El wrapper ejecuta la build antes del deploy y utiliza la configuración de `prototypes/firebase-spark-pwa`.

Verificación de la publicación:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run release:verify"
```

## Copias de seguridad

Desde **Mantenimiento**, el responsable puede descargar una copia completa del centro en formato JSON. El archivo contiene datos personales y operativos:

- guardarlo cifrado o en un espacio de acceso restringido;
- no enviarlo por correo electrónico sin protección;
- no añadirlo a Git;
- comprobar que sea legible antes de considerarlo una copia válida.

El botón **Cargar** del mismo recuadro ofrece una restauración prudente y limitada a la configuración. Acepta una copia JSON del mismo centro, muestra su fecha y número de documentos, exige escribir `RESTAURAR` y descarga automáticamente una nueva copia de seguridad antes de aplicar los cambios. Restaura la identidad visual, las vistas, el idioma, los horarios límite, la compartición de contactos, la leyenda de dietas y el icono. No modifica personas, reservas, administradores, contraseñas, enlaces operativos ni el registro de actividad.

La carga desde el panel no equivale a una recuperación completa de la base de datos. La recuperación completa de los datos operativos sigue siendo un procedimiento técnico controlado que debe probarse primero en el emulador.

Inspección local sin escrituras:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run backup:inspect -- <ruta-backup.json>"
```

## Prueba de recuperación

Probar primero la recuperación en el emulador:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run test:backup-restore-emulator -- <ruta-backup.json>"
```

Una recuperación real modifica datos: requiere autorización explícita, una copia previa, identificación exacta del centro y verificación posterior. No borrar ni sobrescribir datos de producción para diagnosticar un problema de interfaz.

## Volver a una versión anterior

1. Identificar el commit estable anterior.
2. Crear una reversión trazable sin borrar el historial.
3. Volver a ejecutar pruebas y build.
4. Publicar de nuevo Hosting y, si es necesario, las reglas compatibles.
5. Verificar la publicación pública.

Firebase Hosting también conserva el historial de publicaciones, pero el commit Git sigue siendo la fuente que permite reconstruir exactamente código, pruebas y documentación.
