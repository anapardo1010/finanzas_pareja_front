# 📁 Estructura Completa del Proyecto

```
finanzasFront/
│
├── src/
│   ├── app/
│   │   ├── core/                           # Núcleo de la aplicación
│   │   │   ├── models/                     # Modelos de datos TypeScript
│   │   │   │   ├── response.model.ts       # ResponseModel<T> para API
│   │   │   │   ├── tenant.model.ts         # Tenant + TenantRequest
│   │   │   │   ├── user.model.ts           # User + UserRequest
│   │   │   │   ├── category.model.ts       # Category + CategoryRequest
│   │   │   │   ├── payment-method.model.ts # PaymentMethod + Enum
│   │   │   │   ├── installment.model.ts    # Installment + InstallmentRequest
│   │   │   │   ├── transaction.model.ts    # Transaction + Filters
│   │   │   │   ├── finance-report.model.ts # Reportes financieros
│   │   │   │   └── index.ts                # Barrel export
│   │   │   │
│   │   │   ├── services/                   # Servicios HTTP
│   │   │   │   ├── tenant.service.ts       # CRUD Tenants
│   │   │   │   ├── user.service.ts         # CRUD Users
│   │   │   │   ├── category.service.ts     # CRUD Categories
│   │   │   │   ├── payment-method.service.ts # CRUD Payment Methods
│   │   │   │   ├── transaction.service.ts  # CRUD Transactions + Filters
│   │   │   │   ├── finance-report.service.ts # Reportes y estadísticas
│   │   │   │   └── index.ts                # Barrel export
│   │   │   │
│   │   │   ├── interceptors/               # HTTP Interceptors
│   │   │   │   └── http-error.interceptor.ts # Manejo global de errores
│   │   │   │
│   │   │   └── guards/                     # Route Guards
│   │   │       └── (vacío - para futuro auth)
│   │   │
│   │   ├── shared/                         # Componentes compartidos
│   │   │   ├── components/
│   │   │   │   ├── sidebar/                # Sidebar con Glassmorphism
│   │   │   │   │   ├── sidebar.component.ts
│   │   │   │   │   ├── sidebar.component.html
│   │   │   │   │   └── sidebar.component.scss
│   │   │   │   │
│   │   │   │   └── layout/                 # Layout principal
│   │   │   │       ├── main-layout.component.ts
│   │   │   │       ├── main-layout.component.html
│   │   │   │       └── main-layout.component.scss
│   │   │   │
│   │   │   ├── pipes/                      # Pipes personalizados
│   │   │   │   └── (vacío - para futuros pipes)
│   │   │   │
│   │   │   └── directives/                 # Directivas
│   │   │       └── (vacío - para futuras directivas)
│   │   │
│   │   ├── features/                       # Módulos de negocio
│   │   │   │
│   │   │   ├── dashboard/                  # 📊 Dashboard Principal
│   │   │   │   ├── components/
│   │   │   │   │   ├── summary-card/       # Tarjetas de resumen
│   │   │   │   │   │   ├── summary-card.component.ts
│   │   │   │   │   │   ├── summary-card.component.html
│   │   │   │   │   │   └── summary-card.component.scss
│   │   │   │   │   │
│   │   │   │   │   └── upcoming-payments/  # Próximos pagos MSI
│   │   │   │   │       ├── upcoming-payments.component.ts
│   │   │   │   │       ├── upcoming-payments.component.html
│   │   │   │   │       └── upcoming-payments.component.scss
│   │   │   │   │
│   │   │   │   ├── dashboard.component.ts
│   │   │   │   ├── dashboard.component.html
│   │   │   │   └── dashboard.component.scss
│   │   │   │
│   │   │   ├── transactions/               # 💳 Gestión de Transacciones
│   │   │   │   ├── components/
│   │   │   │   │   └── (pendiente - lista, form, detail)
│   │   │   │   └── transactions.component.ts
│   │   │   │
│   │   │   └── settings/                   # ⚙️ Configuración
│   │   │       ├── components/
│   │   │       │   ├── categories/         # Gestión de categorías
│   │   │       │   │   └── categories.component.ts
│   │   │       │   ├── payment-methods/    # Gestión de métodos de pago
│   │   │       │   │   └── payment-methods.component.ts
│   │   │       │   └── users/              # Gestión de usuarios
│   │   │       │       └── users.component.ts
│   │   │       └── settings.component.ts
│   │   │
│   │   ├── app.component.ts                # Componente raíz
│   │   ├── app.config.ts                   # Configuración de la app
│   │   └── app.routes.ts                   # Rutas con lazy loading
│   │
│   ├── environments/                       # Configuraciones de entorno
│   │   ├── environment.ts                  # Development
│   │   └── environment.prod.ts             # Production
│   │
│   ├── assets/                             # Recursos estáticos
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── styles.scss                         # Estilos globales iOS/macOS
│   ├── index.html                          # HTML principal
│   └── main.ts                             # Bootstrap de Angular
│
├── proxy.conf.json                         # Proxy para backend local
├── angular.json                            # Configuración de Angular
├── tsconfig.json                           # Configuración de TypeScript
├── package.json                            # Dependencias de Node.js
├── README.md                               # Documentación principal
└── GETTING_STARTED.md                      # Guía de inicio rápido

```

---

## 🎨 Características por Módulo

### Core (`src/app/core/`)
- **Models**: Interfaces TypeScript mapeadas 1:1 con entidades del backend
- **Services**: Servicios inyectables con HttpClient + Observable
- **Interceptors**: Manejo global de errores HTTP
- **Guards**: Protección de rutas (pendiente implementar)

### Shared (`src/app/shared/`)
- **Sidebar**: Navegación lateral con glassmorphism
- **Layout**: Estructura principal de la aplicación
- **Components**: Reutilizables en múltiples módulos

### Features (`src/app/features/`)

#### Dashboard
- ✅ Resumen financiero (Balance, Ingresos, Gastos)
- ✅ Tarjetas con estilo iOS
- ✅ Próximos pagos MSI
- ✅ Integración con FinanceReportService

#### Transactions (Pendiente)
- 📝 Lista de transacciones
- 📝 Formulario crear/editar
- 📝 Detalle de transacción
- 📝 Filtros avanzados

#### Settings (Pendiente)
- 📝 Gestión de categorías
- 📝 Gestión de métodos de pago
- 📝 Gestión de usuarios
- 📝 Configuración de tenant

---

## 🔌 Integración Backend-Frontend

### Flujo de Datos

```
┌─────────────────┐
│   Component     │  ← Usuario interactúa
└────────┬────────┘
         │
         ↓ inject
┌─────────────────┐
│    Service      │  ← Lógica HTTP
└────────┬────────┘
         │
         ↓ HttpClient
┌─────────────────┐
│  Interceptor    │  ← Manejo errores
└────────┬────────┘
         │
         ↓ fetch
┌─────────────────┐
│  Backend API    │  ← Spring Boot
│  localhost:8080 │
└─────────────────┘
```

### Ejemplo de Uso

```typescript
// 1. Inyectar el servicio en el componente
constructor(private transactionService: TransactionService) {}

// 2. Llamar al método del servicio
this.transactionService.getTransactionsByTenant(tenantId)
  .subscribe({
    next: (transactions) => {
      console.log('✅ Transacciones:', transactions);
    },
    error: (err) => {
      console.error('❌ Error:', err);
    }
  });
```

---

## 🎯 Rutas Configuradas

```typescript
/                           → Redirect to /dashboard
/dashboard                  → Dashboard principal ✅
/transactions               → Lista de transacciones 📝
/categories                 → Gestión de categorías 📝
/payment-methods            → Métodos de pago 📝
/users                      → Gestión de usuarios 📝
/settings                   → Configuración general 📝
```

**Leyenda:**
- ✅ Implementado
- 📝 Pendiente / En desarrollo

---

## 📦 Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| `angular.json` | Configuración del proyecto Angular |
| `tsconfig.json` | Configuración de TypeScript |
| `package.json` | Dependencias y scripts npm |
| `proxy.conf.json` | Proxy al backend local |
| `environment.ts` | Variables de entorno (dev) |
| `environment.prod.ts` | Variables de entorno (prod) |

---

## 🚀 Comandos de Desarrollo

```bash
# Desarrollo normal
ng serve

# Desarrollo con proxy (conecta al backend)
ng serve --proxy-config proxy.conf.json

# Build de producción
ng build --configuration production

# Tests
ng test

# Linting
ng lint

# Generar nuevo componente
ng generate component features/nombre-modulo/nombre-componente --standalone
```

---

## 📚 Convenciones de Código

- ✅ **Standalone Components** (Angular 17+)
- ✅ **RxJS Observables** para manejo asíncrono
- ✅ **Barrel Exports** (`index.ts`) para imports limpios
- ✅ **Lazy Loading** en rutas secundarias
- ✅ **Tipado fuerte** con TypeScript
- ✅ **SCSS** para estilos
- ✅ **BEM-like** naming en CSS

---

**Estructura generada automáticamente para ParejaFinanzas** 🚀
