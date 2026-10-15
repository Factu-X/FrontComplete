# FactuX Frontend

Frontend React/Vite de FactuX, integrado con el backend Express y Supabase Auth.

## Estado actual

Conectado a datos reales:

| HU | Pantalla | Endpoints |
|---|---|---|
| HU-12 | Login, sesión, usuarios | Supabase Auth, `GET /api/auth/me`, `/api/usuarios` |
| HU-04 | Clientes y motocicletas | `/api/clientes`, `/api/clientes/:id/motocicletas`, `/api/motocicletas/:id` |
| HU-01 | Catálogo (con tratamiento y tarifa de IVA por ítem) | `/api/catalogo` |
| HU-02 / HU-03 | Órdenes: recepción, servicios/repuestos, estados y totales calculados por el backend | `/api/ordenes`, `/api/ordenes/:id/detalles` |
| HU-05 | Historial por motocicleta | `GET /api/ordenes?motocicletaId=` |
| — | Dashboard | órdenes, clientes y catálogo reales |

Siguen con datos de prueba (fuera del alcance de la demo): recordatorios, facturación DIAN,
notas crédito, cartera, resumen de facturación, configuración de empresa y pruebas de usabilidad.

## Roles

| Rol | Acceso |
|---|---|
| Administrador | Todo: usuarios, catálogo, configuración, reportes |
| Facturación | Clientes, motocicletas, órdenes, facturas (catálogo solo lectura) |
| Operario | Órdenes: cambia estado, agrega servicios/repuestos y observaciones. No crea ni cancela órdenes |

La UI oculta lo que el rol no puede hacer (`src/lib/roles.ts`), pero quien autoriza es el backend.

## Flujo de una orden

1. Facturación crea la orden: cliente, moto (precarga el último kilometraje), motivo.
2. Se abre el espacio de trabajo de la orden: se agregan servicios/repuestos con un clic y se ajustan cantidades.
3. Estados: `Abierta → En proceso → Finalizada` (también `En proceso → Abierta`, y cancelar si el rol lo permite).
4. No se puede finalizar sin ítems. Las órdenes finalizadas o canceladas quedan de solo lectura.
5. Subtotal, IVA y total siempre vienen del backend.

## Configuración

```bash
npm install
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Usa la publishable key de Supabase. Nunca uses `SERVICE_ROLE_KEY` en el frontend.

## Ejecución local

```bash
cd ../backend && npm run dev   # API en :4000
cd ../FrontComplete && npm run dev
```

## Scripts

```bash
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

## GitHub Actions

`.github/workflows/ci.yml` ejecuta `npm ci`, typecheck, lint, test y build.
`.github/workflows/sonar.yml` corre SonarCloud solo si existen `SONAR_TOKEN`,
`SONAR_PROJECT_KEY` y `SONAR_ORGANIZATION`.

## Pendientes

- Conectar facturas reales (el repo `frontend` tiene una versión de `InvoiceManager` integrada que puede servir de base).
- Manejo global de 401/403 para redirigir al login.
- Pruebas de componentes (requiere agregar jsdom + Testing Library).
