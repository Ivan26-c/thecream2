# The Cream 2.0 🍰🍦
> Plataforma E-commerce Full-Stack para Postres y Comida Rápida con Panel Administrativo, Control de Inventario en Tiempo Real y Temáticas Estacionales Dinámicas.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript_ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3_Vanilla-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

---

## Descripción del Proyecto

**The Cream 2.0** es una solución de comercio electrónico de extremo a extremo diseñada para marcas de gastronomía, repostería y fast-food. Desarrollada con una arquitectura modular y desacoplada, la plataforma integra un frontend responsivo y de alto impacto visual con un backend robusto en **Node.js / Express** y persistencia en **PostgreSQL**.

El sistema cubre todo el ciclo operativo: desde la exhibición interactiva de productos con precios promocionales por tiempo limitado, hasta el procesamiento transaccional seguro de compras (ACID) y un completo panel administrativo con métricas clave de negocio en tiempo real.

---

## Características Principales

### Tienda Virtual (Experiencia de Cliente)
- **Catálogo Dinámico e Interactivo:** Agrupación y renderizado en tiempo real por categorías (Postres, Helados, Bebidas, Salados, Combos y Especiales).
- **Manejo de Promociones Temporales:** Cálculo automático de precios de oferta y comparación visual con el precio base según fecha de vigencia.
- **Carrito de Compras Persistente:** Manejo de estado del carrito con almacenamiento local (`localStorage`), control de cantidades y recálculo en vivo.
- **Checkout Transaccional Seguro:** Validación atómica en servidor mediante transacciones `BEGIN / COMMIT / ROLLBACK` en PostgreSQL que aseguran consistencia de inventario y evitan sobreventa.
- **Generador de Boleta Digital:** Modal estilizado tipo ticket que resume la compra confirmada y total pagado.
- **Libro de Reclamaciones Virtual:** Formulario digital conforme a normativas de atención al consumidor con registro en base de datos.

### Motor de Temáticas Dinámicas (Hot-Swapping Themes)
- Cambio en caliente del diseño visual de la tienda desde el panel de administración sin reiniciar el servidor ni recompilar código.
- Temáticas soportadas con fondos animados SVG y paletas personalizadas:
  - 💖 **San Valentín:** Fondos animados de corazones y promociones para parejas.
  - 🎄 **Navidad:** Animación de copos de nieve en CSS y temática verde/roja.
  - 🎃 **Halloween:** Estilo gótico festivo con fantasmas flotantes y tonos naranja/negro.
  - ✨ **Año Nuevo:** Fondo dorado con animaciones de fuegos artificiales.
  - 🧁 **Normal (Default):** Estética rosada pastel característica de la marca.

### Panel de Administración (Backoffice)
- **Autenticación y Seguridad:** Acceso restringido para administradores con gestión de sesión mediante tokens.
- **Dashboard con KPIs en Tiempo Real:**
  - Ingresos totales acumulados mediante funciones SQL nativas (`PL/pgSQL`).
  - Contador de ventas y pedidos realizados.
  - Conteo total de productos y alertas visuales de **productos agotados / stock bajo**.
  - Gráfico interactivo tipo Dona con **Chart.js** de los productos más vendidos.
- **Gestión Completa de Inventario (CRUD):**
  - Creación de productos con zona interactiva **Drag & Drop** para subida de imágenes con `Multer`.
  - Creación dinámica de nuevas categorías con selector de íconos FontAwesome.
  - Edición en ventana modal y eliminación permanente con confirmación.
  - Control rápido de stock (+ / -) con actualización instantánea.
  - Búsqueda en tiempo real por nombre o ID y filtrado por categoría.
- **Gestor de Banners Promocionales:** Creación, activación/desactivación y edición de banners para el carrusel de la página principal.
- **Gestor de Reclamaciones:** Visualización de detalles de quejas y actualización de estado (`Pendiente` / `Resuelto`).
- **Configuración Global:** Personalización en vivo de enlaces de redes sociales (WhatsApp, Instagram, TikTok) y selector de color primario corporativo.

---

## Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Backend** | Node.js & Express.js | API RESTful, enrutamiento, middlewares y servicio de estáticos |
| **Base de Datos** | PostgreSQL | Persistencia relacional, integridad referencial, transacciones y funciones almacenadas |
| **Carga de Archivos**| Multer | Procesamiento y filtrado de subida de imágenes (.png, .jpg, .jpeg) |
| **Frontend** | HTML5, CSS3 Vanilla, JS (ES6+) | Arquitectura SPA ligera sin dependencias pesadas, manipulación limpia del DOM |
| **Visualización** | Chart.js | Gráficos estadísticos del panel administrativo |
| **Iconografía** | FontAwesome 6 | Iconos vectoriales en categorías, botones y paneles |
| **Variables de Entorno**| Dotenv | Manejo seguro de credenciales y configuraciones por entorno |

---

## Estructura del Proyecto

```plaintext
TheCream2.0/
├── .env.example            # Plantilla de variables de entorno seguras
├── .gitignore              # Archivos y carpetas excluidos del control de versiones
├── README.md               # Documentación general del proyecto
├── package.json            # Metadatos del proyecto y dependencias
├── server.js               # Servidor principal Express y definición de endpoints API
├── src/
│   ├── db.js               # Pool de conexiones a PostgreSQL con soporte SSL y fallback
│   └── database_full.sql   # Esquema DDL completo, tablas, funciones y datos semilla
└── public/                 # Archivos servidos al cliente (Frontend)
    ├── thecream.html       # Página principal (Catálogo, Carrito y Checkout)
    ├── nosotros.html       # Historia de la marca, visión, misión y sedes
    ├── contacto.html       # Canales de atención y Libro de Reclamaciones
    ├── admin.html          # Panel administrativo con login, KPIs y gestión
    ├── app.js              # Lógica del cliente (Catálogo, Temáticas, Carrito)
    ├── admin.js            # Lógica administrativa (CRUD, Gráficos, Sesión)
    ├── styles.css          # Sistema de diseño base de la tienda
    ├── admin.css           # Estilos del panel de control
    ├── sanvalentin.css     # Hoja de estilo temática: San Valentín
    ├── navidad.css         # Hoja de estilo temática: Navidad
    ├── halloween.css       # Hoja de estilo temática: Halloween
    ├── anonuevo.css        # Hoja de estilo temática: Año Nuevo
    └── imagenes/           # Recursos visuales y directorio de subida de productos
```

---

## Instalación y Puesta en Marcha Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- [PostgreSQL](https://www.postgresql.org/) (instalado localmente o una instancia en la nube como Neon, Supabase o Render)

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/thecream.git
cd thecream
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la Base de Datos
1. Crea una base de datos vacía en PostgreSQL llamada `thecream_db`.
2. Ejecuta el script SQL para crear las tablas, funciones y datos iniciales:
   ```bash
   psql -U postgres -d thecream_db -f src/database_full.sql
   ```
   *(También puedes abrir `src/database_full.sql` en pgAdmin o en el editor SQL de tu proveedor en la nube y ejecutar la consulta).*

### 4. Configurar Variables de Entorno
Copia el archivo de ejemplo `.env.example` y renómbralo a `.env`:
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales:
```env
PORT=3000

# Para base de datos local:
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thecream_db

# O si usas Neon / Render / Railway:
# DATABASE_URL=postgresql://usuario:password@host/nombre_db?sslmode=require
```

### 5. Iniciar la Aplicación
```bash
npm start
```
Abre tu navegador en `http://localhost:3000` para ver la tienda o en `http://localhost:3000/admin.html` para ingresar al panel de administración.

> **Credenciales de prueba para el panel admin:**  
> **Usuario:** `admin`  
> **Contraseña:** `admin123` *(configurable en la tabla `usuarios`)*

---

## Endpoints Principales de la API

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/productos` | Obtiene los productos activos (considera temática actual) |
| `GET` | `/api/categorias` | Lista las categorías disponibles |
| `POST` | `/api/checkout` | Procesa un pedido con transacción SQL y descuenta stock |
| `GET` | `/api/tematica-activa` | Retorna la temática festiva en vigencia |
| `POST` | `/api/login` | Autenticación del usuario administrador |
| `GET` | `/api/admin/dashboard-stats` | KPIs (ingresos, ventas, stock agotado) y top de ventas |
| `POST` | `/api/admin/productos` | Crea un producto nuevo (soporta subida multipart con Multer) |
| `PUT` | `/api/admin/productos/:id` | Actualiza un producto existente |
| `PUT` | `/api/admin/productos/:id/stock`| Ajusta el inventario de un producto (+/-) |
| `DELETE` | `/api/admin/productos/:id` | Elimina permanentemente un producto |
| `GET` | `/api/admin/ventas` | Historial detallado de pedidos para emisión de boletas |
| `POST` | `/api/reclamos` | Registro de quejas en el Libro de Reclamaciones |
| `GET/PUT` | `/api/admin/config` | Consulta y actualización de configuración global de marca |
