# Seguridad

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](SECURITY.md) [![English](https://img.shields.io/badge/language-English-6b7280)](SECURITY.en.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-16615a)](SECURITY.es.md)

## Comunicar una vulnerabilidad

No publicar detalles sensibles en una incidencia abierta. Escribir a [rasanfil@gmail.com](mailto:rasanfil@gmail.com), indicando:

- el componente afectado;
- el procedimiento mínimo para reproducir el problema;
- el posible impacto;
- cualquier propuesta de corrección.

No enviar contraseñas, tokens activos ni datos personales. Si un secreto ya ha quedado expuesto, revocarlo antes de enviar el aviso.

## Límites de seguridad

- La interfaz oculta las acciones no permitidas, pero la autorización efectiva se aplica mediante las reglas de Firestore.
- La sesión de residente y Firebase Auth son identidades independientes.
- Los enlaces operativos deben tratarse como credenciales: distribuirlos únicamente a los destinatarios previstos y regenerarlos si se divulgan.
- Las copias de seguridad no deben añadirse al repositorio.
- Las cuentas administrativas deben utilizar contraseñas únicas, correos verificados y verificación en dos pasos cuando esté disponible.

Para el modelo completo, consultar [Arquitectura, autenticación y seguridad](docs/es/ARQUITECTURA_Y_SEGURIDAD.md).
