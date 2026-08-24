# Guía de uso de Oggi a tavola

🇮🇹 [![Italiano](https://img.shields.io/badge/Italiano-6b7280)](../GUIDA_ALL_USO.md) 🇬🇧 [![English](https://img.shields.io/badge/English-6b7280)](../en/USER_GUIDE.md) 🇪🇸 [![Español](https://img.shields.io/badge/Espa%C3%B1ol-16615a)](GUIA_DE_USO.md)

[Inicio](../../README.es.md) · [Arquitectura y seguridad](ARQUITECTURA_Y_SEGURIDAD.md) · [Desarrollo y pruebas](DESARROLLO_Y_PRUEBAS.md) · [Operaciones](OPERACIONES.md)

Oggi a tavola es una aplicación web instalable para organizar las reservas de comidas de un centro. Esta guía describe el comportamiento efectivo de la aplicación; las autorizaciones siguen siendo comprobadas por las reglas de Firestore y no solo por la interfaz.

## Instalación y primer acceso

La aplicación puede usarse en el navegador o instalarse como PWA desde Chrome o Edge. Al instalarla aparece como **Oggi a tavola** y conserva la sesión en ese dispositivo hasta que el usuario cierre sesión, se revoque la sesión o caduque.

En la primera apertura se muestra la presentación configurada por el administrador. En las aperturas siguientes aparece solo la pantalla de inicio breve. La preferencia de apertura elegida en **Aspecto** —Mes o Semana— se restaura también después de cerrar y volver a abrir la aplicación.

Cada dispositivo mantiene sus propias preferencias de aspecto, idioma y recordatorios.

## Formas de acceso y funciones

| Persona | Acceso | Funciones principales |
| --- | --- | --- |
| Residente | Sigla personal + contraseña común | Reservas propias, resumen y preferencias del dispositivo |
| Viceadministrador | Sigla personal + contraseña de viceadministradores | Funciones del residente, Agenda del centro, gestión de personas y enlaces operativos |
| Administrador actual | Google o correo verificado + contraseña | Configuración completa, gestión del centro y traspaso de responsabilidad |
| Encargado de celebraciones | Función personal asignada | Modificación de la celebración del día |

El centro tiene un único administrador actual. En el código este estado se llama `OWNER`; `ADMIN` se utiliza técnicamente durante invitaciones o transiciones y no representa un segundo responsable permanente.

La función **Celebraciones litúrgicas** se asigna expresamente a una persona. No se concede automáticamente al administrador ni al viceadministrador.

## Acceso de residentes y viceadministradores

1. Introduce tu sigla.
2. Introduce la contraseña común para acceder como residente, o la contraseña de viceadministradores si tienes esa función.
3. Pulsa **Entrar**.

Una sesión personal dura hasta 30 días y se renueva mientras se utiliza. El centro conserva un token revocable de larga duración para permitir esa renovación. Una sesión personal no hereda privilegios de una sesión Firebase anterior del mismo navegador.

## Acceso del administrador

El administrador entra desde el acceso administrativo con Google o con correo y contraseña. El correo debe coincidir con el usuario autorizado del centro y, cuando se usa contraseña, debe estar verificado.

El acceso mediante Google y mediante correo representa a la misma persona solo si Firebase los ha vinculado correctamente. La contraseña administrativa no se guarda en la configuración del centro: la gestiona Firebase Authentication y se restablece mediante correo.

## Reservar comidas

### Vista mensual

La vista mensual muestra Colación, Almuerzo y Cena para cada día. Selecciona una casilla para cambiar el estado de una comida. Los mandos múltiples permiten aplicar una elección a varios días o comidas; su posición, izquierda o derecha, se configura en **Aspecto**.

El día actual permanece resaltado. Al cambiar de mes, la vista pasa automáticamente al nuevo mes actual. El mes corriente y el siguiente pueden precargarse; los posteriores se cargan al seleccionarlos.

### Vista semanal

La vista semanal presenta los mismos datos en una tabla más compacta. La columna de los días sigue la misma posición elegida para los mandos múltiples de la vista mensual. Al cambiar de semana, la aplicación muestra automáticamente la nueva semana actual.

Los plazos de reserva se aplican según el huso horario configurado por el centro. Después del plazo, una casilla puede mostrarse cerrada y ya no acepta cambios.

### Selecciones múltiples y acciones colectivas

Las selecciones múltiples modifican únicamente las reservas de la persona que ha iniciado sesión. No cambian las elecciones de otros residentes y omiten las comidas cuyo plazo ya ha terminado o que pertenecen al pasado.

En la **vista mensual**:

- **M** aplica la elección a todas las comidas modificables del mes mostrado;
- el mando con el calendario la aplica a todas las comidas modificables de esa semana;
- los mandos Desayuno, Almuerzo y Cena actúan sobre la misma comida durante toda la semana;
- cada casilla individual continúa modificando solo esa comida y ese día.

En la **vista semanal**:

- el mando general actúa sobre todas las comidas modificables de la semana;
- el mando situado junto a un día actúa solo sobre las comidas de ese día;
- el encabezado de Desayuno, Almuerzo o Cena actúa sobre esa columna durante toda la semana;
- cada casilla sigue siendo un mando individual.

Cada mando colectivo funciona como un interruptor coherente. Si en su ámbito existe al menos una comida no reservada, reserva todas las que todavía se pueden modificar. Si ya están todas reservadas, las desmarca todas. En un estado mixto, el primer toque completa la selección y el siguiente la vacía. La vista **Futura** utiliza la misma regla en los mandos disponibles.

La cuadrícula muestra el resultado inmediatamente mientras continúa el guardado. Un mensaje indica cuántas reservas se han guardado; si ocurre un error, la aplicación restaura o vuelve a cargar los estados no confirmados. No se solicita una confirmación adicional porque la acción puede deshacerse con otro toque mientras el plazo siga abierto.

La posición izquierda o derecha elegida en **Aspecto** se aplica de manera coherente tanto a los mandos del mes como a la columna de días de la semana.

### Agenda del centro

La Agenda del centro permite a administradores y viceadministradores registrar enfermos, invitados y otras variaciones operativas. Las celebraciones son independientes y solo puede modificarlas una persona autorizada expresamente.

## Resumen y cocina

El **Resumen** muestra comensales, dietas, invitados, enfermos y celebración sin permitir modificar reservas. Si están habilitados los contactos, se puede tocar el nombre de una persona para llamarla o escribirle por WhatsApp.

La vista **Cocina** utiliza un enlace operativo específico y presenta solo la información necesaria para el servicio. No concede acceso administrativo ni a los datos privados del centro. El enlace debe considerarse una credencial: hay que compartirlo solo con quien lo necesita y regenerarlo si se difunde por error.

Colación se refiere al día siguiente cuando aparece junto con el almuerzo y la cena de hoy.

Las notas de cocina corresponden al día indicado y las notas de días anteriores no deben mostrarse en la vista operativa actual.

## Dietas

Las dietas se identifican con códigos `D1`–`D999`. El administrador puede asociar a cada código una etiqueta breve para la cocina, por ejemplo `D3 = sin lactosa`.

En el resumen y en cocina:

- una sola dieta se muestra como `D3`, sin `× 1`;
- varias dietas iguales se muestran como `D3 × 4`;
- los colores son estables y ayudan a reconocer rápidamente los códigos, pero el código textual siempre permanece visible.

## Recordatorios

Los recordatorios de reserva están desactivados de forma predeterminada y se activan por separado en cada dispositivo desde **Aspecto**. El navegador debe conceder permiso para las notificaciones. La aplicación avisa antes del plazo cuando el dispositivo y el navegador permiten ejecutar la notificación; no es un servicio garantizado con la aplicación totalmente cerrada en todos los sistemas.

## Panel de control

El panel muestra solo las secciones autorizadas para la sesión actual.

### Configuración

Disponible para el administrador actual. Incluye identidad del centro, presentación inicial, horarios límite, contraseñas compartidas, icono y opciones operativas globales.

### Personas

Permite crear y modificar residentes, grupos, contactos, dietas y funciones. Administrador y viceadministradores pueden eliminar residentes; la operación requiere confirmación y deja una traza de actividad.

### Enlaces operativos

Administrador y viceadministradores pueden abrir, copiar y compartir los enlaces de reservas y cocina. Solo quien posee la capacidad de gestión puede regenerarlos.

### Aspecto

Contiene preferencias del dispositivo: vista de apertura, tema, paleta, aspecto del resumen y cocina, orden de residentes, posición de mandos múltiples, idioma y recordatorios.

Valores restablecibles:

| Opción | Valor predeterminado |
| --- | --- |
| Vista de apertura | Mes |
| Aspecto | Esencial |
| Paleta | Tinta |
| Resumen | Original |
| Cocina | Original |
| Residentes en el resumen | Nombre |
| Mandos múltiples | Derecha |
| Idioma | Italiano |
| Recordatorios | Desactivados |

### Administrador

Gestiona invitaciones y traspaso de responsabilidad. El flujo correcto es:

1. el administrador actual elige una persona y crea la invitación;
2. el destinatario abre el enlace, se autentica y acepta;
3. el sistema conserva el nombre y el correo verificado del destinatario;
4. el administrador actual confirma el traspaso escribiendo la palabra solicitada;
5. la nueva identidad pasa a ser el administrador actual y la anterior pierde los privilegios administrativos, conservando su ficha personal para las reservas.

No hay que crear dos administradores permanentes ni modificar manualmente documentos Firestore para completar el proceso.

### Mantenimiento

Incluye extensión del calendario, registro de actividad y archivo de seguridad. El backup JSON contiene la configuración y los datos operativos admitidos, pero no contraseñas, usuarios Firebase, sesiones, credenciales de enlaces ni la cadena de administración. La restauración sirve para recuperar la configuración del centro, no para sustituir Firebase Authentication.

## Uso de varios centros

Las sesiones personales y administrativas están asociadas al centro. Abrir un enlace de otro centro no debe conceder derechos por una sesión anterior. Comprueba siempre el nombre del centro antes de cambiar datos.

## Solución de problemas

### Después de actualizar aparece una pantalla antigua

Cierra todas las ventanas y pestañas instaladas de Oggi a tavola y vuelve a abrirla. El service worker activa la nueva versión cuando ya no quedan clientes de la versión anterior; no fuerza recargas mientras se está trabajando.

### El panel queda en “Comprobando acceso”

Comprueba la conexión y vuelve a abrir el panel. Si persiste, cierra sesión y entra de nuevo con el método apropiado. No combines una sesión de residente con la expectativa de conservar privilegios administrativos.

### El correo del administrador se considera no autorizado

Comprueba que el correo sea el autorizado para el centro, esté verificado y que la invitación o el traspaso se haya completado. Restablecer la contraseña no autoriza por sí solo un correo distinto.

### La cocina no muestra datos

Abre de nuevo el enlace operativo actual. Si el token fue regenerado, el enlace antiguo deja de ser válido.

### Un dispositivo se ha perdido

El administrador debe revocar la sesión personal desde la gestión de personas y, si es necesario, regenerar los enlaces operativos. Para una cuenta administrativa también hay que proteger la cuenta Google/Firebase.

## Más información

- [Arquitectura, autenticación y seguridad](ARQUITECTURA_Y_SEGURIDAD.md)
- [Desarrollo y pruebas](DESARROLLO_Y_PRUEBAS.md)
- [Operaciones, publicación y recuperación](OPERACIONES.md)
