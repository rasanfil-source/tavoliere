# Operaciones, publicación y recuperación

[![Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-16615a)](../OPERATIONS.md)
[![English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-1f4e79)](../en/OPERATIONS.md)
[![Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-bc2f32)](OPERACIONES.md)

[Inicio](../../README.es.md) · [Guía de uso](GUIA_DE_USO.md) · [Arquitectura y seguridad](ARQUITECTURA_Y_SEGURIDAD.md) · [Desarrollo y pruebas](DESARROLLO_Y_PRUEBAS.md)

Este manual reúne los procedimientos ordinarios para mantener Oggi a tavola sin modificar los datos del centro fuera de las funciones previstas.

## Control de sesiones y dispositivos

Antes de intervenir, distingue siempre:

- sesión de residente por sigla;
- sesión de viceadministrador por sigla;
- sesión administrativa Firebase;
- enlace operativo de reservas;
- enlace operativo de cocina.

Cerrar el panel es navegación y no debe destruir la sesión. **Salir** cierra la sesión activa de forma intencionada.

Si se pierde un dispositivo:

1. revoca la sesión personal de la persona afectada;
2. protege la cuenta Google/Firebase si era un dispositivo administrativo;
3. regenera los enlaces operativos si podían ser consultados por terceros;
4. comprueba el registro de actividad.

## Calendario y actualización de datos

El calendario se extiende desde **Mantenimiento**. Conviene ampliarlo antes de su vencimiento para permitir reservas futuras.

Las vistas operativas se actualizan automáticamente:

- cada 5 minutos entre 07:00–10:00 y 13:30–17:30;
- cada 45 minutos durante el resto del día;
- cada 90 minutos entre 23:00 y 07:00.

El cambio de día, semana o mes vuelve a situar la vista en el periodo corriente cuando corresponde. El usuario puede usar también el mando de actualización manual.

## Preparación de una publicación

1. Comprueba `git status` y no mezcles cambios no relacionados.
2. Actualiza código, reglas y documentación coherentemente.
3. Incrementa la versión de la caché solo cuando cambie la carcasa pública.
4. Ejecuta build y suite completa.
5. Comprueba los recorridos críticos en navegador de escritorio y móvil.
6. Crea un commit con un mensaje que describa el resultado y facilite la vuelta atrás.
7. Publica primero la rama de trabajo y después `main` cuando las pruebas sean satisfactorias.
8. Despliega solo los destinos necesarios.

Comandos ordinarios desde la raíz del repositorio:

```powershell
npm run build
npm test
git diff --check
node tools/firebase-cli.mjs --config prototypes/firebase-spark-pwa/firebase.json --project tavola-comune deploy --only hosting
```

Si cambian las reglas:

```powershell
node tools/firebase-cli.mjs --config prototypes/firebase-spark-pwa/firebase.json --project tavola-comune deploy --only firestore:rules
```

No despliegues reglas sin haber ejecutado antes las pruebas con emuladores.

## Lista de comprobación funcional

Verifica al menos:

- residente con sigla y contraseña común;
- viceadministrador con sigla y contraseña de viceadministradores;
- administrador con Google;
- administrador con correo verificado y contraseña;
- entrada y salida del panel;
- paso entre panel, reservas y resumen;
- actualización en Mes, Semana, Resumen y Cocina;
- cierre y reapertura de la PWA instalada;
- cierre de sesión y nuevo acceso con otro rol;
- visibilidad de secciones según capacidades;
- enlace de cocina y enlace de reservas;
- cambio de idioma y carga diferida de los catálogos;
- activación de la nueva versión después de cerrar todas las ventanas.

## Actualización de la PWA

El service worker no obliga a recargar una sesión activa. Después de una publicación:

1. la nueva versión se instala en segundo plano;
2. permanece en espera mientras existe una ventana o pestaña antigua;
3. al cerrar todas las instancias y volver a abrir, se activa la nueva versión.

Si un dispositivo sigue mostrando una versión anterior, cierra completamente la aplicación y todas sus pestañas. Borrar datos o reinstalar es una medida excepcional, no el procedimiento normal.

## Archivo de seguridad

Desde **Mantenimiento → Archivo de seguridad** el administrador actual puede descargar un backup JSON. El archivo contiene configuración y datos operativos admitidos, entre ellos personas, grupos, reglas de comidas, excepciones, notas, operaciones diarias, presentación y auditoría.

No contiene contraseñas, usuarios Firebase, sesiones, tokens, credenciales de enlaces, membresías ni invitaciones administrativas.

Conserva los backups:

- en un lugar privado;
- con una fecha reconocible;
- solo durante el tiempo necesario;
- sin enviarlos por canales públicos.

## Restauración

La restauración es una operación de alto impacto disponible solo para el administrador actual.

Antes de cargar un archivo:

1. descarga un backup del estado actual;
2. comprueba que el archivo pertenezca al centro correcto;
3. no edites manualmente el JSON salvo que conozcas el esquema;
4. realiza la operación con conexión estable;
5. comprueba personas, reglas, calendario, dietas y vistas inmediatamente después.

La restauración recupera únicamente las colecciones permitidas. No restablece cuentas Firebase, contraseñas, sesiones, enlaces operativos ni la cadena de administración.

## Prueba de recuperación con emuladores

Para una simulación segura:

1. inicia los emuladores Firebase;
2. importa una copia de prueba;
3. ejecuta build y pruebas;
4. comprueba los recorridos de acceso y las vistas operativas;
5. restaura el backup en el entorno emulado;
6. repite las comprobaciones y compara los datos esperados.

No utilices datos reales en herramientas no autorizadas ni pruebes borrados masivos directamente en producción.

## Incidentes comunes

### “Comprobando acceso” no termina

Comprueba red, estado Firebase y consola del navegador. Cierra y vuelve a abrir el panel; si persiste, sal y autentícate de nuevo con el método correcto.

### Cocina sin datos

Comprueba primero fecha y huso horario, después el enlace operativo. Si el enlace fue regenerado, distribuye el nuevo sin modificar manualmente el token.

### Administrador no autorizado

Comprueba correo verificado, membresía del centro y estado del traspaso. Restablecer la contraseña no corrige una membresía ausente.

### Nueva versión no visible

Cierra todas las instancias de la PWA y vuelve a abrir. Comprueba la versión del service worker y el commit desplegado antes de borrar cachés.

## Vuelta atrás

Cada publicación estable debe corresponder a un commit identificable. Para volver atrás:

1. identifica el último commit estable;
2. crea un commit de reversión no destructivo;
3. ejecuta de nuevo build, pruebas y comprobaciones críticas;
4. despliega Hosting y, solo si corresponde, las reglas;
5. documenta el motivo de la reversión.

No uses `git reset --hard` sobre un repositorio con cambios del usuario ni restaures un backup de datos para corregir únicamente un problema de interfaz.

## Referencias

- [Guía de uso](GUIA_DE_USO.md)
- [Arquitectura, autenticación y seguridad](ARQUITECTURA_Y_SEGURIDAD.md)
- [Desarrollo y pruebas](DESARROLLO_Y_PRUEBAS.md)
