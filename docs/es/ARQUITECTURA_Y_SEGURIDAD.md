# Arquitectura, autenticación y seguridad

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](../ARCHITETTURA_E_SICUREZZA.md) [![English](https://img.shields.io/badge/language-English-6b7280)](../en/ARCHITECTURE_AND_SECURITY.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-16615a)](ARQUITECTURA_Y_SEGURIDAD.md)

## Objetivos

La arquitectura prioriza la sencillez operativa, la persistencia de las sesiones, el aislamiento entre centros y la compatibilidad con Firebase Spark. La aplicación es una PWA estática: la lógica se ejecuta en el navegador y la autorización definitiva se aplica mediante las reglas de Firestore.

## Componentes

| Componente | Responsabilidad |
| --- | --- |
| `public/index.html` | Estructura accesible de las vistas y del panel |
| `public/app.js` | Orquestación, navegación y renderizado |
| `public/core/auth-state-machine.mjs` | Máquina de estados de autenticación |
| `public/role-policy.mjs` | Matriz centralizada de roles y capacidades |
| `public/*-data.js` | Acceso a los datos por dominio |
| `firestore.rules` | Autorización del lado servidor |
| `public/sw.js` | Caché del app shell y actualización de la PWA |
| `tools/build-public.mjs` | Generación de la carpeta `dist` |

## Máquina de estados de autenticación

Los estados principales son:

```text
signed-out
  ├─ restauración/acceso residente → restoring-resident → resident-ready
  └─ acceso administrador          → admin-checking     → admin-ready

resident-ready ── navegación panel/reservas ── resident-ready
admin-ready    ── navegación panel/reservas ── admin-ready
cualquier estado ── cierre explícito → signing-out → signed-out
```

Principios invariantes:

- el código personal y la contraseña común producen una sesión de residente;
- el código de un vice y la contraseña de administradores producen una sesión `MANAGER` limitada;
- Google o un correo verificado identifican a un administrador Firebase;
- una sesión de residente o vice no elimina ni eleva Firebase Auth;
- una sesión Firebase anterior no concede privilegios al residente actual;
- las respuestas tardías se ignoran mediante revisiones e identificadores de solicitud;
- el panel se muestra únicamente después de conciliar el rol, evitando destellos de controles incorrectos.

## Roles y capacidades

La matriz canónica está en `public/role-policy.mjs`.

- `OWNER`: control completo del centro y transferencia de responsabilidad.
- `ADMIN`: configuración y operatividad completas, excepto la transferencia reservada al responsable.
- `MANAGER`: panel operativo restringido, personas, adaptaciones, operaciones diarias y lectura de enlaces operativos.
- `RESIDENT`: reservas y preferencias del dispositivo.

`MANAGE_MASS` no deriva del rol administrativo: solo se añade cuando la persona tiene el rol litúrgico. El control del frontend nunca sustituye la comprobación de Firestore.

## Sesiones y enlaces operativos

Las sesiones amigables están asociadas al centro y al dispositivo. Los tokens personales persistentes permiten restaurar la sesión sin guardar la contraseña en texto claro. Los enlaces de resumen y cocina incluyen siempre el código del centro; su token es una credencial y no debe publicarse en la documentación ni en los registros.

La cocina recibe datos operativos, no el registro completo. Aunque el contenido sea menos sensible, el enlace sigue siendo revocable y está asociado a un centro.

## Datos de Firestore

El modelo se centra en `centers/{centerId}`. En cada centro se separan:

- configuración y ajustes privados;
- participantes públicos y datos privados;
- administradores y roles;
- reservas, excepciones y operaciones diarias;
- sesiones y tokens de acceso;
- registro de actividad y ajustes operativos.

Las invitaciones administrativas son documentos temporales con estado, caducidad e identidad que los ha consumido. Una transferencia debe dejar siempre un responsable activo y requiere confirmación explícita.

Existe un único flujo canónico: el responsable crea una invitación vinculada a una Persona; el destinatario elige explícitamente **Aceptar** o **Rechazar**; solo después se identifica con Google o con correo y contraseña; la aceptación cambia la invitación de `ACTIVE` a `USED`; por último, el responsable confirma el traspaso, que actualiza de forma atómica el centro, los dos roles, la invitación y el registro de actividad. Abrir un método de autenticación nunca equivale a aceptar el encargo.

Los viceadministradores no usan invitaciones administrativas de Firebase: su acceso deriva exclusivamente de sigla, contraseña de administradores, rol de la Persona y `viceSessions`. La compatibilidad con la antigua solicitud de sustitución de contraseña temporal queda limitada a la lectura de posibles registros históricos; ningún flujo actual puede crear uno nuevo.

## Defensas aplicadas

- correo verificado para el acceso administrativo con contraseña;
- persistencia Firebase configurada antes de observar el estado Auth;
- capacidades centralizadas y reglas Firestore coherentes;
- caducidad y revocación de sesiones y enlaces;
- límites de esquema en las reglas para horarios, perfiles y configuraciones;
- cabeceras de Hosting contra sniffing, framing y permisos innecesarios;
- caché con red como fuente principal, sin caché independiente de datos Firestore en el service worker;
- copias de seguridad excluidas del repositorio.

## Límites aceptados

El plan Spark excluye funciones personalizadas de servidor. Algunas operaciones administrativas son, por tanto, transacciones Firestore iniciadas por el cliente y protegidas por reglas. Los cambios en las reglas requieren siempre pruebas con emuladores y una revisión del principio de mínimo privilegio.
