# Guía de uso

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-6b7280)](../GUIDA_ALL_USO.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-6b7280)](../en/USER_GUIDE.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-16615a)](GUIA_DE_USO.md)

## Instalación

La aplicación puede utilizarse en el navegador o instalarse como PWA.

- Android/Chrome: abrir el enlace del centro y elegir **Instalar aplicación** o **Añadir a pantalla de inicio**.
- Windows/Edge: abrir el enlace y elegir **Aplicaciones > Instalar este sitio como una aplicación**.

Para conservar la sesión, no borrar los datos del sitio. Una actualización normal o el cierre de la ventana no deberían exigir un nuevo acceso.

## Residente

1. Abrir el enlace de reservas del centro.
2. Introducir el código personal y la contraseña común.
3. Seleccionar o deseleccionar comidas en la vista mensual o semanal.
4. Abrir **Resumen** para consultar las reservas.
5. Abrir el panel de control para modificar las preferencias de este dispositivo.

El comando **Salir** finaliza deliberadamente la sesión; entrar y salir del panel de control es solo navegación y no debe destruirla.

## Viceadministrador

El viceadministrador accede con su código personal y la contraseña de administradores. Puede utilizar las funciones delegadas, incluida la gestión de personas y la consulta, copia, apertura y distribución de enlaces operativos. No adquiere automáticamente las funciones reservadas al administrador.

## Administrador

El único administrador del centro accede con Google o con un correo verificado y contraseña. Desde el panel gestiona:

- configuración e identidad del centro;
- personas y roles operativos;
- enlaces de reservas, resumen y cocina;
- aspecto y preferencias;
- calendario, registro de actividad y copia de seguridad;
- invitaciones administrativas y transferencia de responsabilidad.

Invitar a un nuevo administrador no transfiere inmediatamente el cargo. La persona debe aceptar y autenticarse; el administrador actual completa después el traspaso mediante la confirmación explícita prevista por la interfaz.

En **Mantenimiento > Archivo de seguridad**, el administrador puede descargar una copia JSON completa. **Cargar** restaura únicamente la configuración del mismo centro: la aplicación muestra un resumen, exige una confirmación escrita y descarga primero el estado actual. Las personas, reservas, roles, contraseñas, enlaces y el registro de actividad permanecen sin cambios.

## Cocina

El enlace de cocina abre un cuadro sintético con comensales, dietas, celebraciones y notas operativas. Las notas se muestran únicamente el día al que pertenecen. Los códigos de dieta llevan el prefijo `D` y pueden disponer de una leyenda configurada por el administrador.

## Recordatorios

Los recordatorios de reservas son opcionales, locales al dispositivo y están inicialmente desactivados. Si se activan, requieren permiso del navegador y pueden desactivarse desde los ajustes de la aplicación o desde la notificación.

## Problemas frecuentes

- **La versión parece antigua:** cerrar completamente la PWA y volver a abrirla; si es necesario, actualizar una vez la página.
- **La sesión no se restaura:** comprobar que el navegador no borre los datos del sitio al cerrarse.
- **Un enlace de cocina o resumen no muestra datos:** pedir al administrador un enlace operativo actualizado que incluya el código del centro.
- **Un comando no está disponible:** comprobar el rol utilizado para acceder.
