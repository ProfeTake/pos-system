# Base de datos (Demo) — Servidor

Este servidor usa SQLite + Drizzle ORM, pensado en modo DEMO con datos de ejemplo. Más adelante puedes borrar estos datos y migrar a tu propia base.

## Rutas de archivos

- Archivo SQLite por defecto: `server/sqlite.db` (configurable con `DB_FILE` en `.env`).
- Esquema Drizzle: `src/db/schema.ts`.
- Seed mínimo (usuario admin): `src/db/seed.ts`.
- Seed de ejemplo completo: `src/scripts/seed.ts` (protegido por `SAMPLE_DATA=true`).

## Comandos útiles

1. Aplicar esquema (crear tablas)

```powershell
npm run db:push
```

2. Seed mínimo (solo usuario admin: admin/admin123)

```powershell
npm run db:seed:admin
```

3. Seed de ejemplo completo (requerido `SAMPLE_DATA=true`)

```powershell
$env:SAMPLE_DATA="true"; npm run db:seed:sample
```

4. Resetear la base (ELIMINA archivos `sqlite.db*`)

```powershell
npm run db:reset
```

Luego vuelve a crear el esquema y (opcional) seed:

```powershell
npm run db:push; npm run db:seed:admin
```

## Notas de seguridad

- El seed de ejemplo está bloqueado: solo corre si `SAMPLE_DATA=true` para evitar uso accidental en producción.
- Para cambiar la ruta de la base, añade a `.env` dentro de `server/`:

```env
DB_FILE=./data/mydb.sqlite
```

## Migración a tu propia base

- Ejecuta `npm run db:reset` para limpiar.
- Ejecuta `npm run db:push` para recrear tablas vacías.
- Crea tus usuarios y datos reales según tu operación.
