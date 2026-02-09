# 🎨 Guía de Diseño - Sistema iOS/macOS Style

Esta guía documenta el sistema de diseño implementado en ParejaFinanzas, inspirado en las Human Interface Guidelines de Apple.

---

## 🎯 Principios de Diseño

### 1. **Claridad**
- Contenido prioritario con jerarquía visual clara
- Textos legibles con tipografía San Francisco
- Espaciado generoso entre elementos

### 2. **Profundidad**
- Capas visuales con glassmorphism
- Sombras sutiles para jerarquía
- Transiciones suaves entre estados

### 3. **Consistencia**
- Componentes reutilizables
- Patrones de interacción predecibles
- Sistema de colores coherente

---

## 🎨 Sistema de Colores

### Colores Primarios (iOS)

```scss
// Primary Blue (iOS)
$primary: #007aff;
$primary-hover: #0051d5;

// Success Green
$success: #34c759;

// Danger Red
$danger: #ff3b30;

// Warning Orange
$warning: #ff9500;

// Text Colors
$text-primary: #1d1d1f;
$text-secondary: #6e6e73;
$text-muted: #a1a1a6;
```

### Colores de Fondo

```scss
// Light Mode
$bg-gradient-start: #f5f7fa;
$bg-gradient-end: #e8edf2;

// Dark Mode
$bg-dark-gradient-start: #1c1c1e;
$bg-dark-gradient-end: #2c2c2e;

// Glassmorphism
$glass-light: rgba(255, 255, 255, 0.7);
$glass-dark: rgba(30, 30, 30, 0.8);
```

---

## 📐 Sistema de Espaciado

Basado en múltiplos de 8px (sistema iOS):

```scss
$spacing-1: 8px;   // gap-1, mt-1, p-1
$spacing-2: 16px;  // gap-2, mt-2, p-2
$spacing-3: 24px;  // gap-3, mt-3, p-3
$spacing-4: 32px;  // gap-4, mt-4, p-4
$spacing-5: 40px;
$spacing-6: 48px;
```

---

## ✏️ Tipografía

### Fuentes

```scss
font-family: 
  -apple-system,          // macOS/iOS
  BlinkMacSystemFont,     // Chrome en macOS
  'SF Pro Display',       // Apple
  'SF Pro Text',          // Apple
  'Inter',                // Fallback moderno
  'Segoe UI',             // Windows
  'Roboto',               // Android
  sans-serif;
```

### Jerarquía de Tamaños

```scss
h1: 32px (2rem)   - font-weight: 700
h2: 28px (1.75rem) - font-weight: 700
h3: 24px (1.5rem)  - font-weight: 700
h4: 20px (1.25rem) - font-weight: 600
h5: 18px (1.125rem)- font-weight: 600
h6: 16px (1rem)    - font-weight: 600

body: 16px (1rem)  - font-weight: 400
small: 14px        - font-weight: 400
```

### Letter Spacing

```scss
h1, h2, h3: letter-spacing: -0.02em;  // Tighter para títulos
body: letter-spacing: 0;               // Normal
```

---

## 🔘 Componentes

### Botones

#### Primary Button
```scss
.btn-primary {
  padding: 12px 24px;
  background: #007aff;
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
  
  &:hover {
    background: #0051d5;
    transform: translateY(-2px);
  }
}
```

#### Secondary Button
```scss
.btn-secondary {
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.05);
  color: #1d1d1f;
  border-radius: 12px;
  font-weight: 600;
  
  &:hover {
    background: rgba(0, 0, 0, 0.08);
  }
}
```

### Cards

```scss
.card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
}
```

### Input Fields

```scss
input, textarea {
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  
  &:focus {
    border-color: #007aff;
    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
  }
}
```

---

## 🌊 Glassmorphism

Efecto de cristal esmerilado característico de macOS Big Sur+:

```scss
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

// Sidebar con glassmorphism
.sidebar {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}
```

---

## 🔄 Animaciones y Transiciones

### Timing Functions (iOS-style)

```scss
// Easing por defecto de iOS
$ease-out: cubic-bezier(0.4, 0, 0.2, 1);

// Para elementos interactivos
transition: all 0.2s $ease-out;

// Para elementos más grandes (modales, sheets)
transition: all 0.3s $ease-out;
```

### Animaciones Comunes

```scss
// Fade In
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Slide In
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// Spin (para loading)
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 📱 Border Radius

Siguiendo el diseño de iOS:

```scss
$radius-sm: 8px;    // Elementos pequeños (badges, chips)
$radius-md: 12px;   // Botones, inputs
$radius-lg: 16px;   // Cards pequeñas
$radius-xl: 20px;   // Cards grandes
$radius-2xl: 24px;  // Modales
```

---

## 🌗 Dark Mode

Sistema automático según preferencias del usuario:

```scss
@media (prefers-color-scheme: dark) {
  body {
    background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%);
    color: #f5f5f7;
  }
  
  .card {
    background: rgba(50, 50, 50, 0.9);
    border-color: rgba(255, 255, 255, 0.12);
  }
  
  input {
    background: rgba(60, 60, 60, 0.9);
    color: #f5f5f7;
    border-color: rgba(255, 255, 255, 0.12);
  }
}
```

---

## 🖱️ Estados Interactivos

### Hover
```scss
// Elevación suave
&:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
```

### Active/Press
```scss
&:active {
  transform: translateY(0) scale(0.98);
}
```

### Focus
```scss
&:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
}
```

### Disabled
```scss
&:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## 🎭 Iconos

Usamos **Material Icons** con estilos iOS:

```html
<!-- Iconos en el sidebar -->
<span class="material-icons">dashboard</span>

<!-- Tamaños -->
.material-icons {
  font-size: 20px;  // Pequeño
  font-size: 22px;  // Normal (sidebar)
  font-size: 24px;  // Grande (headers)
  font-size: 48px;  // Extra grande (estados vacíos)
}
```

---

## 📐 Layout Grid

```scss
// Dashboard Grid
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

// Responsive breakpoints
$mobile: 768px;
$tablet: 1024px;
$desktop: 1280px;
```

---

## 🎪 Skeleton Loading

```scss
.skeleton-card {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.8) 25%,
    rgba(255, 255, 255, 0.9) 50%,
    rgba(255, 255, 255, 0.8) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## 📏 Scrollbars Personalizados

Estilo macOS:

```scss
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  
  &:hover {
    background: rgba(0, 0, 0, 0.3);
  }
}
```

---

## ✅ Checklist de Implementación

Al crear nuevos componentes, asegúrate de:

- ✅ Usar border-radius de 12px o más
- ✅ Aplicar glassmorphism en elementos flotantes
- ✅ Incluir transiciones suaves (0.2s - 0.3s)
- ✅ Implementar estados hover/active/focus
- ✅ Soportar modo oscuro
- ✅ Usar tipografía San Francisco (system fonts)
- ✅ Mantener espaciado consistente (múltiplos de 8px)
- ✅ Aplicar sombras sutiles para profundidad
- ✅ Animaciones con ease-out
- ✅ Iconos Material Icons

---

## 📚 Referencias

- **Apple HIG**: https://developer.apple.com/design/human-interface-guidelines/
- **SF Pro Font**: https://developer.apple.com/fonts/
- **macOS Big Sur Design**: https://www.apple.com/macos/
- **iOS Design Principles**: https://developer.apple.com/design/tips/

---

**Sistema de diseño implementado en ParejaFinanzas** 🎨
