# Arquitectura, autenticación y seguridad

[![Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-16615a)](../ARCHITETTURA_E_SICUREZZA.md)
[![English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-1f4e79)](../en/ARCHITECTURE_AND_SECURITY.md)
[![Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-bc2f32)](ARQUITECTURA_Y_SEGURIDAD.md)

[Inicio](../../README.es.md) · [Guía de uso](GUIA_DE_USO.md) · [Desarrollo y pruebas](DESARROLLO_Y_PRUEBAS.md) · [Operaciones](OPERACIONES.md)

Este documento describe la arquitectura efectiva de Oggi a tavola. La aplicación es una PWA estática compatible con el plan Firebase Spark; la seguridad no depende de ocultar botones, sino de reglas Firestore, identidad y capacidades verificadas.

## Componentes

- **Firebase Hosting** distribuye la PWA estática.
- **Cloud Firestore** conserva configuración, personas, reservas, operaciones diarias, sesiones y auditoría.
- **Firebase Authentication** autentica al administrador y proporciona identidades técnicas secundarias para operaciones protegidas.
- **Service worker** almacena la carcasa de la aplicación y activa las actualizaciones sin recargar una sesión activa.
- **Módulos del cliente** separan política de roles, autenticación, enlaces, panel, reservas, traducciones y vistas.

No se utilizan Cloud Functions ni servicios de pago en el flujo ordinario.

## Máquina de estados de autenticación

La interfaz converge hacia un único contexto de acceso:

1. `RESTORING`: se restauran preferencias, sesión personal y Firebase Auth;
2. `ANONYMOUS`: no existe una sesión utilizable;
3. `PERSONAL_RESIDENT`: sigla y contraseña común;
4. `PERSONAL_MANAGER`: sigla y contraseña de viceadministradores;
5. `FIREBASE_ADMIN`: identidad Firebase autorizada para el centro;
6. `OPERATIONAL_LINK`: acceso limitado por token a reservas o cocina.

Una sesión personal activa tiene precedencia sobre una identidad Firebase residual para las capacidades del usuario actual. Por tanto, un residente no hereda privilegios de un administrador que usó antes el mismo navegador. Al mismo tiempo, navegar entre reservas y panel no destruye innecesariamente ninguna sesión.

Durante la restauración las áreas protegidas permanecen ocultas hasta que el estado está reconciliado, evitando destellos de botones o paneles incorrectos. Un temporizador de seguridad evita que la interfaz quede bloqueada indefinidamente en la comprobación.

## Roles y capacidades

La política central está en `public/role-policy.mjs`.

| Rol técnico | Significado | Capacidades principales |
| --- | --- | --- |
| `OWNER` | Administrador actual del centro | Todas las capacidades |
| `ADMIN` | Administrador aceptado durante una transición | Gestión administrativa excepto traspaso, administradores y restauración |
| `MANAGER` | Viceadministrador | Panel, personas, eliminación de residentes, operaciones diarias y lectura de enlaces |
| `RESIDENT` | Residente | Reservas propias y preferencias permitidas |

`OWNER` no es una segunda persona distinta del administrador: es el nombre técnico del único administrador actualmente responsable.

La capacidad `MANAGE_MASS` no se hereda por ser administrador o viceadministrador. Se añade únicamente cuando la persona tiene asignada la función litúrgica. Agenda del centro, en cambio, forma parte de las operaciones diarias de administrador y viceadministradores.

La interfaz consulta capacidades para mostrar las acciones; las reglas Firestore repiten los controles para impedir accesos directos no autorizados.

## Sesiones personales

El acceso por sigla crea una sesión asociada al centro y al participante:

- duración de la sesión: 30 días;
- renovación durante el uso;
- token personal revocable de larga duración: 9000 días;
- la revocación elimina la posibilidad de restaurar o renovar la sesión en el dispositivo perdido.

Las contraseñas compartidas no se guardan en claro. Su almacenamiento y comparación utilizan material criptográfico con sal. Los documentos de sesión no conceden por sí solos capacidades distintas de las resueltas para la persona y el centro.

## Autenticación administrativa

El administrador usa Google o correo verificado y contraseña mediante Firebase Authentication. La autorización requiere además una membresía administrativa válida para el centro. Tener una cuenta Firebase no basta.

El cliente puede utilizar una instancia Firebase secundaria para ejecutar operaciones técnicas sin reemplazar la identidad visible. Esto evita que una autenticación auxiliar interfiera con la sesión principal.

La contraseña del administrador pertenece a Firebase Authentication y nunca debe escribirse en documentos de configuración, backups o registros.

## Modelo Firestore

Los datos se agrupan bajo `centers/{centerId}`. Entre las colecciones y documentos principales se encuentran:

- configuración pública y privada;
- `participants` y proyecciones públicas;
- grupos, tipos de comida, plazos y excepciones;
- reservas y operaciones diarias;
- notas de cocina y estado diario;
- sesiones personales y de viceadministradores;
- membresías e invitaciones administrativas;
- eventos de auditoría.

Los enlaces operativos contienen el identificador del centro y una credencial específica. El enlace de cocina expone únicamente la vista y las lecturas previstas por sus reglas; no es una sesión administrativa.

## Traspaso de responsabilidad

El traspaso es una transición controlada:

1. `OWNER` crea una invitación para una persona existente;
2. el destinatario se autentica con Firebase y acepta;
3. se registran UID, correo verificado y nombre seleccionado;
4. el `OWNER` confirma el traspaso;
5. una transacción actualiza el administrador vigente, la membresía y el estado de la invitación;
6. el acceso administrativo anterior se revoca, manteniendo la ficha de residente.

El backend rechaza el traspaso si la invitación no está aceptada, la identidad no coincide o quien confirma ya no posee la capacidad necesaria. La interfaz debe derivar el estado de los datos actuales, no de antiguas invitaciones revocadas.

## Dietas, notas y celebraciones

Los códigos de dieta admitidos son `D1`–`D999`. Las etiquetas se normalizan y son breves; el código permanece visible para no depender solo del color.

Las notas de cocina están limitadas a 1000 caracteres, 50 entradas por día y 8000 caracteres totales diarios. La fecha se calcula en el huso horario del centro.

La celebración es un único valor diario. Su escritura requiere la función personal correspondiente y es independiente de la Agenda del centro.

## Internacionalización

El italiano está incluido en la carga inicial. Inglés y español se cargan bajo demanda cuando el dispositivo cambia de idioma. Si una clave no está disponible, se usa el italiano, pero las pruebas impiden publicar claves técnicas visibles o catálogos incompletos.

## PWA, caché y actualización

El service worker aplica una estrategia de carcasa versionada. Una nueva versión se instala en segundo plano y espera a que se cierren todas las ventanas y pestañas de la versión anterior. En la apertura siguiente toma el control. No se usa una recarga forzada durante una operación, para evitar regresiones de estado y pantallas intermedias.

El manifiesto incluye iconos `any` y `maskable`; Android puede así aplicar su máscara sin inventar bordes irregulares.

## Backup y restauración

El archivo JSON incluye únicamente las colecciones admitidas de configuración y operación: grupos, participantes, proyecciones públicas, tipos y reglas de comidas, excepciones, notas de cocina, operaciones y estado diarios, recursos, presentación y auditoría.

Quedan excluidos:

- contraseñas y secretos;
- usuarios Firebase;
- membresías, invitaciones y traspaso administrativo;
- sesiones y tokens personales;
- credenciales de los enlaces operativos.

La restauración valida formato, centro y colecciones permitidas. No debe utilizarse para clonar la identidad de un administrador ni para sustituir Firebase Authentication.

## Principios de seguridad

- privilegio mínimo y capacidades explícitas;
- separación entre sesión personal, administrativa y enlace operativo;
- autorización tanto en interfaz como en reglas;
- tokens revocables y regenerables;
- ninguna contraseña o credencial en logs y backups;
- operaciones destructivas confirmadas y auditadas;
- datos de cada centro aislados por ruta e identidad;
- pruebas con emuladores antes de publicar reglas.

## Referencias

- [Guía de uso](GUIA_DE_USO.md)
- [Desarrollo y pruebas](DESARROLLO_Y_PRUEBAS.md)
- [Operaciones, publicación y recuperación](OPERACIONES.md)
