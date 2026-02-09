# 🚀 Guía de Inicio - ParejaFinanzas

Esta guía te ayudará a levantar tanto el **backend** como el **frontend** para comenzar a desarrollar.

---

## 📋 Prerequisitos

### Backend (Spring Boot)
- ✅ JDK 21 o superior
- ✅ Maven 3.6+
- ✅ PostgreSQL 12+
- ✅ Base de datos `pareja_finanzas` creada

### Frontend (Angular)
- ✅ Node.js 18+ y npm
- ✅ Angular CLI 17+ (`npm install -g @angular/cli`)

---

## 🔧 Paso 1: Configurar la Base de Datos

1. **Crear la base de datos PostgreSQL:**
```sql
CREATE DATABASE pareja_finanzas;
```

2. **Configurar credenciales** en el backend:
Archivo: `finanzas/src/main/resources/application.yml`
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/pareja_finanzas
    username: tu_usuario
    password: tu_password
```

---

## 🟢 Paso 2: Levantar el Backend

Desde la carpeta del backend:

```bash
cd /ruta/al/backend/finanzas

# Compilar el proyecto
mvn clean install

# Ejecutar el servidor
mvn spring-boot:run
```

✅ **El backend estará corriendo en:** `http://localhost:8080`

### Verificar que funciona:
```bash
curl http://localhost:8080/api/tenants
```

O abrir en el navegador:
```
http://localhost:8080/swagger-ui.html
```

---

## 🔵 Paso 3: Instalar Dependencias del Frontend

Desde la carpeta del frontend:

```bash
cd /Users/anagabrielapardo/Punto\ de\ venta/Repositorios/finanzasFront

# Instalar todas las dependencias de Node.js
npm install
```

---

## 🎨 Paso 4: Levantar el Frontend

### Opción 1: Con proxy (Recomendado)
```bash
ng serve --proxy-config proxy.conf.json
```

### Opción 2: Sin proxy
```bash
npm start
# o
ng serve
```

✅ **El frontend estará corriendo en:** `http://localhost:4200`

---

## 🧪 Paso 5: Probar la Integración

1. **Abrir el navegador** en `http://localhost:4200`

2. **Ver el Dashboard** - debería cargar automáticamente

3. **Verificar la conexión al backend:**
   - Abre las DevTools del navegador (F12)
   - Ve a la pestaña "Network"
   - Deberías ver peticiones a `/api/reports/summary/1`

4. **Si hay datos mock en el backend**, deberías ver:
   - Balance Total
   - Ingresos del Mes
   - Gastos del Mes
   - Próximos Pagos MSI

---

## 🛠️ Comandos Útiles

### Backend
```bash
# Compilar sin tests
mvn clean install -DskipTests

# Ejecutar solo tests
mvn test

# Ver logs en tiempo real
tail -f logs/application.log
```

### Frontend
```bash
# Desarrollo con hot-reload
ng serve

# Build de producción
ng build --configuration production

# Ejecutar tests
ng test

# Linting
ng lint
```

---

## 🐛 Troubleshooting

### ❌ Error: "Backend no responde"

**Solución:**
```bash
# Verificar que el backend esté corriendo
curl http://localhost:8080/api/tenants

# Verificar el puerto
lsof -i :8080
```

### ❌ Error CORS

**Solución:** Agregar en tu backend Spring Boot:
```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:4200")
                    .allowedMethods("GET", "POST", "PUT", "DELETE");
            }
        };
    }
}
```

### ❌ Error: "Cannot GET /api/..."

**Solución:** Verificar que estés usando el proxy:
```bash
ng serve --proxy-config proxy.conf.json
```

### ❌ Frontend no carga

**Solución:**
```bash
# Limpiar caché de npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Reiniciar el servidor
ng serve
```

---

## 📊 Crear Datos de Prueba

Para poblar la base de datos con datos de prueba, puedes ejecutar:

```sql
-- Crear un tenant
INSERT INTO tenant (name, is_active, created_at) 
VALUES ('Pareja Demo', true, NOW());

-- Crear usuarios
INSERT INTO "user" (name, email, tenant_id, is_active, created_at) 
VALUES 
  ('Ana', 'ana@example.com', 1, true, NOW()),
  ('Carlos', 'carlos@example.com', 1, true, NOW());

-- Crear categorías
INSERT INTO category (name, description, tenant_id, is_active) 
VALUES 
  ('Comida', 'Gastos de alimentación', 1, true),
  ('Transporte', 'Gastos de transporte', 1, true),
  ('Entretenimiento', 'Ocio y diversión', 1, true);

-- Crear métodos de pago
INSERT INTO payment_method (name, type, tenant_id, is_active) 
VALUES 
  ('Tarjeta Crédito', 'CREDIT_CARD', 1, true),
  ('Efectivo', 'CASH', 1, true);
```

---

## 🎯 Próximos Pasos

1. ✅ **Backend y Frontend corriendo**
2. 📝 **Crear transacciones desde el frontend**
3. 📊 **Ver reportes en el dashboard**
4. 🎨 **Personalizar los estilos**
5. 🔐 **Implementar autenticación**

---

## 📚 Documentación Adicional

- **Backend API:** `http://localhost:8080/swagger-ui.html`
- **Documentación Angular:** https://angular.io/docs
- **Repositorio Backend:** `/ruta/al/backend`
- **Repositorio Frontend:** `/Users/anagabrielapardo/Punto de venta/Repositorios/finanzasFront`

---

## 🆘 Ayuda

Si encuentras problemas:

1. Revisa los logs del backend
2. Revisa la consola del navegador (F12)
3. Verifica que ambos servidores estén corriendo
4. Asegúrate de que PostgreSQL esté activo

---

**¡Listo para desarrollar!** 🚀

Backend: `http://localhost:8080`  
Frontend: `http://localhost:4200`  
Swagger: `http://localhost:8080/swagger-ui.html`
