# 💑 ParejaFinanzas - Frontend

Sistema de gestión financiera para parejas desarrollado con **Angular 17+** y diseño estilo **macOS/iOS**.

## 🎨 Características de Diseño

- **Glassmorphism**: Efectos de transparencia y blur estilo macOS
- **Tipografía San Francisco**: Sistema de fuentes de Apple
- **Micro-interacciones**: Transiciones suaves y animaciones elegantes
- **Modo oscuro**: Soporte automático según preferencias del sistema
- **Diseño responsivo**: Adaptable a todos los dispositivos

## 🏗️ Arquitectura del Proyecto

```
src/app/
├── core/                      # Funcionalidad central
│   ├── models/               # Interfaces TypeScript
│   ├── services/             # Servicios HTTP
│   ├── interceptors/         # Interceptores HTTP
│   └── guards/               # Route guards
├── shared/                    # Componentes compartidos
│   ├── components/
│   │   ├── sidebar/          # Sidebar con glassmorphism
│   │   └── layout/           # Layout principal
│   ├── pipes/
│   └── directives/
├── features/                  # Módulos de funcionalidad
│   ├── dashboard/            # Dashboard principal
│   ├── transactions/         # Gestión de transacciones
│   └── settings/             # Configuración
```

## 🚀 Inicio Rápido

### Prerequisitos
- **Node.js** 18+ y npm
- **Angular CLI** 17+
- **Backend** Spring Boot corriendo en `http://localhost:8080`

### Instalación

1. **Instalar dependencias**
```bash
npm install
```

2. **Iniciar el servidor de desarrollo**
```bash
npm start
# O con proxy:
ng serve --proxy-config proxy.conf.json
```

3. **Abrir en el navegador**: `http://localhost:4200`

## 📡 Endpoints del Backend

- `GET /api/reports/summary/{tenantId}` - Resumen financiero
- `GET /api/transactions/tenant/{tenantId}` - Listar transacciones
- `POST /api/transactions` - Crear transacción
- `PUT /api/transactions/{id}` - Actualizar transacción
- `DELETE /api/transactions/{id}` - Eliminar transacción

## 🎯 Componentes Principales

### Dashboard
- Balance Total
- Ingresos del Mes
- Gastos del Mes
- Próximos Pagos MSI

### Sidebar
Navegación con glassmorphism:
- Dashboard, Transacciones, Categorías, Métodos de Pago, Usuarios, Configuración

## 🔧 Configuración

**environment.ts**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  apiTimeout: 30000,
  enableDebugLogs: true
};
```

## 🚦 Estado del Proyecto

### ✅ Completado
- Estructura de carpetas (core/shared/features)
- Interfaces TypeScript para todas las entidades
- Servicios HTTP con Observable
- Layout principal con sidebar glassmorphism
- Dashboard con tarjetas de resumen
- Estilos globales iOS/macOS

### 🔄 Próximos pasos
- Módulo de Transacciones completo
- Formularios de creación/edición
- Autenticación y guards
- Charts y visualizaciones

---

**ParejaFinanzas** - Gestión financiera para parejas 💑
