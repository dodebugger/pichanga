# Proyecto Pichanga (Vue 3 + Vite)

Aplicación web para registrar jugadores y pagos sin backend ni base de datos.

## Funcionalidades

- Registro de jugador con:
  - Nombre
  - Monto
  - Modalidad (`YAPE` o `EFECTIVO`)
- Validaciones antes de guardar.
- Persistencia local con `LocalStorage`.
- Tabla de registros con fecha y acción de eliminar.
- Botón para limpiar todos los registros.
- Reporte HTML con:
  - Lista de jugadores
  - Totales por modalidad
  - Total general
  - Cantidad total de jugadores
- Exportación del reporte a archivo `.html`.
- Impresión del reporte.

## Ejecución local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
```

## ¿Cómo funciona el guardado local?

- Los registros se guardan en el navegador usando `LocalStorage` bajo la llave `pichanga-records`.
- Cada vez que agregas, eliminas o limpias registros, la app actualiza ese valor en `LocalStorage`.
- Al abrir de nuevo la app, los datos se cargan desde `LocalStorage` automáticamente.
- No se usa backend ni base de datos.

## Publicar en GitHub Pages

La configuración ya está incluida en `.github/workflows/deploy.yml`.

1. Crea un repositorio en GitHub y sube este proyecto.
2. Asegúrate de trabajar en la rama `main`.
3. Haz push:

```bash
git add .
git commit -m "feat: app de registro de pagos pichanga"
git push origin main
```

4. En GitHub, ve a `Settings > Pages`.
5. En `Build and deployment`, selecciona `Source: GitHub Actions`.
6. Espera que termine el workflow `Deploy to GitHub Pages`.
7. Tu app quedará publicada en la URL de Pages del repositorio.

## Estructura principal

- `src/App.vue`: lógica principal (formulario, tabla, reporte, acciones).
- `src/style.css`: estilos responsive.
- `vite.config.js`: configuración de Vite para despliegue (`base: "./"`).
- `.github/workflows/deploy.yml`: despliegue automático a GitHub Pages.
