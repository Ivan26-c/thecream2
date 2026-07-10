// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware for case-insensitive static files (fixes GitHub upload issue)
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    
    // Only apply to /imagenes
    if (!req.path.toLowerCase().startsWith('/imagenes/')) return next();

    const publicPath = path.join(__dirname, 'public');
    const reqPath = decodeURIComponent(req.path);
    const exactFilePath = path.join(publicPath, reqPath);
    if (fs.existsSync(exactFilePath)) {
        return next();
    }
    
    const parts = reqPath.split('/').filter(p => p);
    let currentDir = publicPath;
    let found = true;
    for (const part of parts) {
        if (!fs.existsSync(currentDir)) { found = false; break; }
        if (!fs.statSync(currentDir).isDirectory()) { found = false; break; }
        const files = fs.readdirSync(currentDir);
        const match = files.find(f => f.toLowerCase() === part.toLowerCase());
        if (match) {
            currentDir = path.join(currentDir, match);
        } else {
            found = false;
            break;
        }
    }
    
    if (found && fs.statSync(currentDir).isFile()) {
        return res.sendFile(currentDir);
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

const db = require('./src/db');

// Inicialización de la tabla 'categorias' si no existe
const initCategorias = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS public.categorias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(50) UNIQUE NOT NULL,
                icono VARCHAR(50) NOT NULL
            )
        `);
        // Migración inicial
        await db.query(`
            INSERT INTO public.categorias (nombre, icono) VALUES 
            ('especiales', 'fa-solid fa-star'),
            ('postres', 'fa-solid fa-cake-candles'),
            ('helados', 'fa-solid fa-ice-cream'),
            ('bebidas', 'fa-solid fa-glass-water'),
            ('salados', 'fa-solid fa-pizza-slice'),
            ('combos', 'fa-solid fa-gift')
            ON CONFLICT (nombre) DO NOTHING
        `);
    } catch (err) {
        console.error('Error inicializando categorias:', err);
    }
};
const initBanners = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS public.banners_promocionales (
                id SERIAL PRIMARY KEY,
                texto VARCHAR(255),
                imagen VARCHAR(255),
                activo BOOLEAN DEFAULT true
            )
        `);
        // Opcional: remover columnas antiguas para limpiar, aunque no es estricto
        await db.query(`ALTER TABLE public.configuracion_global DROP COLUMN IF EXISTS banner_activo;`);
        await db.query(`ALTER TABLE public.configuracion_global DROP COLUMN IF EXISTS banner_texto;`);
        await db.query(`ALTER TABLE public.configuracion_global DROP COLUMN IF EXISTS banner_imagen;`);
        console.log('Tabla banners_promocionales verificada/creada');
    } catch (err) {
        console.error('Error al inicializar banners:', err.message);
    }
};

initCategorias().then(() => initBanners());

// Configuración de Multer para la subida de imágenes
const uploadDir = path.join(__dirname, 'public', 'imagenes', 'productos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo formato .png, .jpg y .jpeg es permitido!'));
    }
});

// ==========================================
// RUTAS FRONTEND
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'TheCream.html'));
});

app.get('/api/categorias', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categorias ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

app.get('/api/productos', async (req, res) => {
    try {
        const query = `
            SELECT p.* 
            FROM productos p
            LEFT JOIN tematicas t ON p.id_tematica = t.id
            WHERE p.id_tematica IS NULL OR t.activa_actualmente = TRUE
            ORDER BY p.categoria, p.nombre
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// ==========================================
// PROCESAMIENTO DE COMPRA (CHECKOUT)
// ==========================================
app.post('/api/checkout', async (req, res) => {
    const carrito = req.body;

    if (!carrito || carrito.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
    }

    try {
        await db.query('BEGIN');

        let totalPedido = 0;
        for (const item of carrito) {
            const resProd = await db.query('SELECT precio, precio_promocional, fecha_fin_promocion, stock, nombre FROM productos WHERE id = $1', [item.id]);
            if (resProd.rows.length === 0) throw new Error(`El producto no existe`);
            if (resProd.rows[0].stock < item.cantidad) throw new Error(`Stock insuficiente`);
            
            let precioUsar = parseFloat(resProd.rows[0].precio);
            const pPromo = resProd.rows[0].precio_promocional;
            const fFin = resProd.rows[0].fecha_fin_promocion;
            if (pPromo && fFin && new Date(fFin) > new Date()) {
                precioUsar = parseFloat(pPromo);
            }
            
            totalPedido += precioUsar * item.cantidad;
        }

        const resPedido = await db.query(
            'INSERT INTO pedidos (cliente_nombre, total, estado) VALUES ($1, $2, $3) RETURNING id',
            ['Cliente Web', totalPedido, 'Pagado']
        );
        const idBoleta = resPedido.rows[0].id;

        for (const item of carrito) {
            const resPrecio = await db.query('SELECT precio, precio_promocional, fecha_fin_promocion FROM productos WHERE id = $1', [item.id]);
            let precioReal = parseFloat(resPrecio.rows[0].precio);
            const pP = resPrecio.rows[0].precio_promocional;
            const fF = resPrecio.rows[0].fecha_fin_promocion;
            if (pP && fF && new Date(fF) > new Date()) {
                precioReal = parseFloat(pP);
            }

            await db.query(
                'INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [idBoleta, item.id, item.cantidad, precioReal]
            );
            await db.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2',
                [item.cantidad, item.id]
            );
        }

        await db.query('COMMIT');
        res.json({ mensaje: '¡Compra procesada con éxito!' });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error en checkout:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// API: ADMIN DASHBOARD STATS
// ==========================================
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        const ingRes = await db.query('SELECT fn_calcular_ingresos_totales() AS total_ingresos');
        const ingresos = ingRes.rows[0].total_ingresos || 0;
        
        const venRes = await db.query('SELECT COUNT(*) as count FROM pedidos');
        const ventasCount = venRes.rows[0].count;

        const prodRes = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) as agotados FROM productos');
        const productosTotal = prodRes.rows[0].total;
        const productosAgotados = prodRes.rows[0].agotados || 0;

        const catRes = await db.query(`
            SELECT p.nombre as label, CAST(SUM(dp.cantidad) AS INTEGER) as count
            FROM detalle_pedidos dp
            JOIN productos p ON p.id = dp.id_producto
            GROUP BY p.nombre
            ORDER BY count DESC
            LIMIT 5
        `);
        
        res.json({
            ingresos: parseFloat(ingresos).toFixed(2),
            ventas: ventasCount,
            productos: productosTotal,
            agotados: productosAgotados,
            chartData: catRes.rows
        });
    } catch (err) {
        console.error('Error dashboard stats:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================
// API: ADMIN (INGRESOS TOTALES)
// ==========================================

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM usuarios WHERE username = $1 AND password = $2 AND rol = $3', [username, password, 'admin']);
        if (result.rows.length > 0) {
            res.json({ success: true, token: 'fake-jwt-token-para-aprender' });
        } else {
            res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.get('/api/admin/ingresos', async (req, res) => {
    try {
        const result = await db.query('SELECT fn_calcular_ingresos_totales() AS total_ingresos');
        res.json({ total: result.rows[0].total_ingresos });
    } catch (err) {
        res.status(500).json({ error: 'Error al calcular ingresos' });
    }
});

app.get('/api/admin/ventas', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id AS id_pedido,
                p.fecha,
                p.cliente_nombre,
                p.total,
                json_agg(
                    json_build_object(
                        'producto', prod.nombre,
                        'cantidad', dp.cantidad,
                        'precio', dp.precio_unitario,
                        'subtotal', dp.cantidad * dp.precio_unitario
                    )
                ) AS detalles
            FROM pedidos p
            INNER JOIN detalle_pedidos dp ON p.id = dp.id_pedido
            INNER JOIN productos prod ON dp.id_producto = prod.id
            GROUP BY p.id
            ORDER BY p.fecha DESC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener reporte' });
    }
});

// ==========================================
// GESTIÓN DE INVENTARIO Y TEMÁTICAS
// ==========================================

app.post('/api/admin/productos', upload.single('imagenArchivo'), async (req, res) => {
    let { nombre, descripcion, precio, stock, categoria, nuevaCategoria, iconoCategoria, precio_promocional, fecha_fin_promocion } = req.body;
    let imagen = '';

    if (req.file) {
        imagen = `productos/${req.file.filename}`;
    }
    
    precio_promocional = precio_promocional ? parseFloat(precio_promocional) : null;
    fecha_fin_promocion = fecha_fin_promocion ? fecha_fin_promocion : null;

    if (precio_promocional !== null && precio !== null && precio_promocional >= parseFloat(precio)) {
        return res.status(400).json({ error: 'El precio promocional debe ser menor al precio original' });
    }

    try {
        if (categoria === 'nueva' && nuevaCategoria && iconoCategoria) {
            categoria = nuevaCategoria.toLowerCase().trim();
            await db.query(
                'INSERT INTO categorias (nombre, icono) VALUES ($1, $2) ON CONFLICT (nombre) DO NOTHING',
                [categoria, iconoCategoria]
            );
        }

        await db.query(
            'INSERT INTO productos (nombre, descripcion, precio, stock, categoria, imagen, precio_promocional, fecha_fin_promocion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [nombre, descripcion, precio, stock, categoria, imagen, precio_promocional, fecha_fin_promocion]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al agregar producto' });
    }
});

app.put('/api/admin/productos/:id', upload.single('imagenArchivo'), async (req, res) => {
    let { nombre, descripcion, precio, stock, categoria, nuevaCategoria, iconoCategoria, precio_promocional, fecha_fin_promocion } = req.body;
    const { id } = req.params;
    
    precio_promocional = precio_promocional ? parseFloat(precio_promocional) : null;
    fecha_fin_promocion = fecha_fin_promocion ? fecha_fin_promocion : null;

    if (precio_promocional !== null && precio !== null && precio_promocional >= parseFloat(precio)) {
        return res.status(400).json({ error: 'El precio promocional debe ser menor al precio original' });
    }

    try {
        if (categoria === 'nueva' && nuevaCategoria && iconoCategoria) {
            categoria = nuevaCategoria.toLowerCase().trim();
            await db.query(
                'INSERT INTO categorias (nombre, icono) VALUES ($1, $2) ON CONFLICT (nombre) DO NOTHING',
                [categoria, iconoCategoria]
            );
        }

        if (req.file) {
            const imagen = `productos/${req.file.filename}`;
            await db.query(
                'UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, stock = $4, categoria = $5, imagen = $6, precio_promocional = $7, fecha_fin_promocion = $8 WHERE id = $9',
                [nombre, descripcion, precio, stock, categoria, imagen, precio_promocional, fecha_fin_promocion, id]
            );
        } else {
            await db.query(
                'UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, stock = $4, categoria = $5, precio_promocional = $6, fecha_fin_promocion = $7 WHERE id = $8',
                [nombre, descripcion, precio, stock, categoria, precio_promocional, fecha_fin_promocion, id]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

app.put('/api/admin/productos/:id/stock', async (req, res) => {
    const { id } = req.params;
    const { cantidad } = req.body;
    try {
        await db.query('UPDATE productos SET stock = stock + $1 WHERE id = $2', [cantidad, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar stock' });
    }
});

app.delete('/api/admin/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM productos WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al borrar producto. Asegúrate de que no esté en ningún pedido.' });
    }
});

app.get('/api/tematicas', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tematicas ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener temáticas' });
    }
});

app.post('/api/tematicas/activar', async (req, res) => {
    const { id } = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE tematicas SET activa_actualmente = FALSE');
        await db.query('UPDATE tematicas SET activa_actualmente = TRUE WHERE id = $1', [id]);
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: 'Error al cambiar temática' });
    }
});

// ==========================================
// TEMÁTICAS, CONTACTO Y RECLAMOS
// ==========================================

app.get('/api/tematica-activa', async (req, res) => {
    try {
        const result = await db.query('SELECT nombre, archivo_css FROM tematicas WHERE activa_actualmente = TRUE');
        if (result.rows.length > 0) {
            res.json({ nombre: result.rows[0].nombre, archivo_css: result.rows[0].archivo_css });
        } else {
            res.json({ nombre: 'Normal', archivo_css: null });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/contacto', async (req, res) => {
    const { nombre, correo, asunto, mensaje } = req.body;
    if (!nombre || !correo || !asunto || !mensaje) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    try {
        await db.query(
            'INSERT INTO mensajes_contacto (nombre, correo, asunto, mensaje) VALUES ($1, $2, $3, $4)',
            [nombre, correo, asunto, mensaje]
        );
        res.json({ success: true, mensaje: '¡Mensaje enviado con éxito! Te responderemos pronto.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al enviar el mensaje' });
    }
});

app.post('/api/reclamos', async (req, res) => {
    const { dni_cliente, nombre_cliente, correo, detalle_reclamo } = req.body;
    if (!dni_cliente || !nombre_cliente || !correo || !detalle_reclamo) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    try {
        await db.query(
            'INSERT INTO libro_reclamaciones (dni_cliente, nombre_cliente, correo, detalle_reclamo) VALUES ($1, $2, $3, $4)',
            [dni_cliente, nombre_cliente, correo, detalle_reclamo]
        );
        res.json({ success: true, mensaje: 'Tu reclamo ha sido registrado correctamente en nuestro Libro Virtual.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar el reclamo' });
    }
});

app.get('/api/admin/contactos', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM mensajes_contacto ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener contactos' });
    }
});

app.get('/api/admin/reclamos', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM libro_reclamaciones ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener reclamos' });
    }
});

app.put('/api/admin/reclamos/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        await db.query('UPDATE libro_reclamaciones SET estado = $1 WHERE id = $2', [estado, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar estado del reclamo' });
    }
});

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================

app.get('/api/config', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM configuracion_global WHERE id = 1');
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener la configuración' });
    }
});

app.put('/api/admin/config', upload.single('bannerImagen'), async (req, res) => {
    try {
        const { whatsapp, tiktok, instagram, color_primario } = req.body;
        
        await db.query(
            'UPDATE configuracion_global SET whatsapp = $1, tiktok = $2, instagram = $3, color_primario = $4 WHERE id = 1',
            [whatsapp, tiktok, instagram, color_primario || '#ff758f']
        );
        res.json({ mensaje: 'Configuración actualizada' });
    } catch (err) {
        console.error('Error al actualizar config:', err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ==========================================
// BANNERS PROMOCIONALES
// ==========================================

// Obtener banners (Público, solo activos)
app.get('/api/banners', async (req, res) => {
    try {
        const resDB = await db.query('SELECT * FROM banners_promocionales WHERE activo = true ORDER BY id DESC');
        res.json(resDB.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener banners' });
    }
});

// Obtener todos los banners (Admin)
app.get('/api/admin/banners', async (req, res) => {
    try {
        const resDB = await db.query('SELECT * FROM banners_promocionales ORDER BY id DESC');
        res.json(resDB.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener banners' });
    }
});

// Crear banner
app.post('/api/admin/banners', upload.single('imagen'), async (req, res) => {
    try {
        const { texto, descripcion, mostrar_boton, activo } = req.body;
        let imagen = '';
        if (req.file) {
            imagen = 'productos/' + req.file.filename;
        }

        const resDB = await db.query(
            'INSERT INTO banners_promocionales (texto, descripcion, mostrar_boton, imagen, activo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [texto, descripcion, mostrar_boton === 'true', imagen, activo === 'true']
        );
        res.json(resDB.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear banner' });
    }
});

// Actualizar banner
app.put('/api/admin/banners/:id', upload.single('imagen'), async (req, res) => {
    try {
        const { id } = req.params;
        const { texto, descripcion, mostrar_boton, activo, imagenActual } = req.body;
        
        let imagen = imagenActual;
        if (req.file) {
            imagen = 'productos/' + req.file.filename;
        }

        const resDB = await db.query(
            'UPDATE banners_promocionales SET texto = $1, descripcion = $2, mostrar_boton = $3, activo = $4, imagen = $5 WHERE id = $6 RETURNING *',
            [texto, descripcion, mostrar_boton === 'true', activo === 'true', imagen, id]
        );
        res.json(resDB.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar banner' });
    }
});

// Eliminar banner
app.delete('/api/admin/banners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM banners_promocionales WHERE id = $1', [id]);
        res.json({ mensaje: 'Banner eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar banner' });
    }
});

// ==========================================
// INICIALIZACIÓN
// ==========================================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
