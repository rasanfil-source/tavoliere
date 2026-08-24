# Cómo contribuir a Tutti a tavola

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-6b7280)](CONTRIBUTING.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-6b7280)](CONTRIBUTING.en.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-16615a)](CONTRIBUTING.es.md)

Gracias por tu interés en el proyecto. Antes de proponer un cambio, abre un aviso o [escribe a HappyDuck](mailto:rasanfil@gmail.com), describiendo el problema, los pasos para reproducirlo y el resultado esperado.

## Reglas de trabajo

1. Limitar cada cambio a un objetivo verificable.
2. No incluir en el repositorio contraseñas, tokens, enlaces operativos, identificadores reales ni copias del centro.
3. Mantener la independencia entre la sesión de residente y Firebase Auth.
4. Aplicar los permisos tanto en la interfaz como en las reglas de Firestore.
5. Actualizar todos los idiomas al añadir una clave de interfaz.
6. No modificar gráficos o funciones ajenas sin una petición explícita.

## Comprobaciones requeridas

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm test"
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
pwsh.exe -NoLogo -NoProfile -Command "npm run build"
```

Los cambios de autenticación deben cubrir al menos acceso, actualización, persistencia, cierre de sesión, cambio de vista y visibilidad por rol. Los cambios visuales deben comprobarse en el navegador, tanto en escritorio como en móvil.

## Commits

Utilizar mensajes breves y descriptivos, por ejemplo:

- `fix(auth): restore session after refresh`
- `feat(kitchen): add diet legend`
- `docs: rewrite project documentation`

Cada publicación debe corresponder a un commit reconocible, para permitir la recuperación.
