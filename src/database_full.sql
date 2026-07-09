-- ==========================================
-- SCRIPT DE BASE DE DATOS: THE CREAM 2.0
-- ==========================================


-- ==========================================
-- FUNCIÓN: fn_calcular_ingresos_totales()
-- ==========================================

CREATE FUNCTION public.fn_calcular_ingresos_totales() RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total), 0) INTO v_total FROM pedidos;
    
    RETURN v_total;
END;
$$;



-- ==========================================
-- PROCEDIMIENTO ALMACENADO: sp_procesar_compra(integer, integer, character varying)
-- ==========================================

CREATE PROCEDURE public.sp_procesar_compra(IN p_id_producto integer, IN p_cantidad integer, IN p_cliente_nombre character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_stock_actual INT;
    v_precio DECIMAL(10,2);
    v_id_pedido INT;
BEGIN
    SELECT stock, precio INTO v_stock_actual, v_precio 
    FROM productos WHERE id = p_id_producto;

    IF v_stock_actual < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente. Solo quedan % unidades.', v_stock_actual;
    END IF;

    UPDATE productos 
    SET stock = stock - p_cantidad 
    WHERE id = p_id_producto;

    INSERT INTO pedidos (cliente_nombre, total, estado) 
    VALUES (p_cliente_nombre, (v_precio * p_cantidad), 'Pagado')
    RETURNING id INTO v_id_pedido;

    INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario)
    VALUES (v_id_pedido, p_id_producto, p_cantidad, v_precio);

END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;


-- ==========================================
-- TABLA: detalle_pedidos
-- ==========================================

CREATE TABLE public.detalle_pedidos (
    id integer NOT NULL,
    id_pedido integer,
    id_producto integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL
);



-- ==========================================
-- SECUENCIA (Auto-incremental): detalle_pedidos_id_seq
-- ==========================================

CREATE SEQUENCE public.detalle_pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



-- ==========================================
-- SEQUENCE OWNED BY: detalle_pedidos_id_seq
-- ==========================================

ALTER SEQUENCE public.detalle_pedidos_id_seq OWNED BY public.detalle_pedidos.id;



-- ==========================================
-- TABLA: pedidos
-- ==========================================

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    cliente_nombre character varying(100) NOT NULL,
    cliente_correo character varying(100),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total numeric(10,2) NOT NULL,
    estado character varying(20) DEFAULT 'Pendiente'::character varying
);



-- ==========================================
-- SECUENCIA (Auto-incremental): pedidos_id_seq
-- ==========================================

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



-- ==========================================
-- SEQUENCE OWNED BY: pedidos_id_seq
-- ==========================================

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;



-- ==========================================
-- TABLA: productos
-- ==========================================

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    icono character varying(50) NOT NULL
);

ALTER TABLE public.categorias OWNER TO postgres;

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.categorias_id_seq OWNER TO postgres;
ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    imagen character varying(255),
    stock integer DEFAULT 0 NOT NULL,
    categoria character varying(50),
    id_tematica integer,
    precio_promocional numeric(10,2),
    fecha_fin_promocion timestamp with time zone
);



-- ==========================================
-- SECUENCIA (Auto-incremental): productos_id_seq
-- ==========================================

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



-- ==========================================
-- SEQUENCE OWNED BY: productos_id_seq
-- ==========================================

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;



-- ==========================================
-- TABLA: tematicas
-- ==========================================

CREATE TABLE public.tematicas (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    archivo_css character varying(100),
    activa_actualmente boolean DEFAULT false
);



-- ==========================================
-- SECUENCIA (Auto-incremental): tematicas_id_seq
-- ==========================================

CREATE SEQUENCE public.tematicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



-- ==========================================
-- SEQUENCE OWNED BY: tematicas_id_seq
-- ==========================================

ALTER SEQUENCE public.tematicas_id_seq OWNED BY public.tematicas.id;



-- ==========================================
-- TABLA: usuarios
-- ==========================================

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(100) NOT NULL,
    rol character varying(20) DEFAULT 'cliente'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);



-- ==========================================
-- SECUENCIA (Auto-incremental): usuarios_id_seq
-- ==========================================

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



-- ==========================================
-- SEQUENCE OWNED BY: usuarios_id_seq
-- ==========================================

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;



-- ==========================================
-- VALOR POR DEFECTO: detalle_pedidos id
-- ==========================================

ALTER TABLE ONLY public.detalle_pedidos ALTER COLUMN id SET DEFAULT nextval('public.detalle_pedidos_id_seq'::regclass);



-- ==========================================
-- VALOR POR DEFECTO: pedidos id
-- ==========================================

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);



-- ==========================================
-- VALOR POR DEFECTO: productos id
-- ==========================================

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);



-- ==========================================
-- VALOR POR DEFECTO: tematicas id
-- ==========================================

ALTER TABLE ONLY public.tematicas ALTER COLUMN id SET DEFAULT nextval('public.tematicas_id_seq'::regclass);



-- ==========================================
-- VALOR POR DEFECTO: usuarios id
-- ==========================================

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
--

INSERT INTO public.detalle_pedidos (id, id_pedido, id_producto, cantidad, precio_unitario) VALUES (1, 1, 2, 2, 10.00);
INSERT INTO public.detalle_pedidos (id, id_pedido, id_producto, cantidad, precio_unitario) VALUES (2, 2, 1, 1, 8.00);


--
--

INSERT INTO public.pedidos (id, cliente_nombre, cliente_correo, fecha, total, estado) VALUES (1, 'Cliente Web', NULL, '2026-07-01 14:07:19.177781', 20.00, 'Pagado');
INSERT INTO public.pedidos (id, cliente_nombre, cliente_correo, fecha, total, estado) VALUES (2, 'Cliente Web', NULL, '2026-07-01 14:07:19.177781', 8.00, 'Pagado');


--
--

INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (21, 'Corazón de Fresa', 'Cheesecake en forma de corazón con jalea de fresas frescas.', 12.00, 'https://cdn.pixabay.com/photo/2017/02/11/14/19/valentines-day-2057745_1280.jpg', 15, 'especiales', 2);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (22, 'Cupcakes Enamorados', 'Caja de 2 cupcakes red velvet con frosting especial.', 9.00, 'https://cdn.pixabay.com/photo/2015/02/09/20/39/cupcakes-629853_1280.jpg', 20, 'especiales', 2);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (23, 'Milkshake Flechazo', 'Batido de fresa y cereza con doble crema y chispas.', 10.00, 'https://cdn.pixabay.com/photo/2016/11/22/19/27/beverage-1850198_1280.jpg', 30, 'especiales', 2);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (2, 'Cheesecake de Fresa', 'Base de galleta crujiente y jalea fresca de fresas locales.', 10.00, 'postres/CheesecakeDeFresa.jpg', 22, 'postres', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (1, 'Torta de Chocolate', 'Bizcocho extra húmedo con doble relleno de fudge artesanal.', 8.00, 'postres/torta.jpg', 48, 'postres', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (4, 'Ensalada de Frutas', 'Frutas frescas de estación con yogur y miel.', 7.00, 'postres/EnsaladaDeFrutas.jpg', 20, 'postres', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (7, 'Torta 3 Leches', 'Bizcocho bañado en tres tipos de leche, súper suave.', 8.50, 'postres/Torta-3-leches.jpg', 15, 'postres', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (8, 'Alfajores con Natilla', 'Suaves alfajores rellenos con natilla piurana.', 5.00, 'postres/alfajores-natilla.jpg', 40, 'postres', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (13, 'Crema Volteada', 'Postre clásico peruano con extra caramelo.', 6.00, 'postres/crema-volteada.jpg', 25, 'postres', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (18, 'Pie de Limón', 'Base crocante con crema de limón y merengue.', 7.50, 'postres/pie-limon.jpg', 15, 'postres', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (5, 'Raspadilla', 'Hielo raspado con jarabes artesanales de frutas.', 4.00, 'helados/Raspadillas.jpg', 30, 'helados', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (15, 'Helado de Algarrobina', 'Helado cremoso con el toque norteño de algarrobina.', 5.50, 'helados/helado-algarrobina.jpg', 40, 'helados', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (9, 'Chicha Morada', 'Bebida refrescante de maíz morado.', 3.00, 'bebidas/chicha.jpg', 100, 'bebidas', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (14, 'Frozen de Frutas', 'Bebida helada de pura fruta natural.', 6.50, 'bebidas/frozen.jpg', 30, 'bebidas', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (16, 'Limonada Frozen', 'Limonada helada, perfecta para el calor.', 5.00, 'bebidas/limonada-frozen.jpg', 50, 'bebidas', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (17, 'Milkshake de Oreo', 'Batido de helado con galleta Oreo y crema batida.', 9.00, 'bebidas/milkshake-oreo.jpg', 20, 'bebidas', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (3, 'Empanada Mixta Horneada', 'Rellena de jamón, queso fundido y un toque de orégano.', 5.00, 'salados/empanada.jpg', 100, 'salados', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (6, 'Salchipapa', 'Papas fritas crujientes con hot dog ahumado y salsas.', 8.00, 'salados/Salchipapa.jpg', 50, 'salados', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (19, 'Sándwich Triple', 'Clásico triple de pollo, palta y huevo.', 7.00, 'salados/sandwich-triple.jpg', 25, 'salados', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (20, 'Tequeños', 'Rellenos de queso andino, acompañados de guacamole.', 6.00, 'salados/tequenos.jpg', 35, 'salados', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (10, 'Combo Familiar', 'Ideal para compartir. Incluye postres, salados y bebidas.', 35.00, 'combos/combo-familiar.jpg', 10, 'combos', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (11, 'Combo Pareja', '2 Postres y 2 Bebidas a elección.', 20.00, 'combos/combo-pareja.jpg', 15, 'combos', NULL);
INSERT INTO public.productos (id, nombre, descripcion, precio, imagen, stock, categoria, id_tematica) VALUES (12, 'Combo Salado', 'Empanadas, tequeños y chicha morada.', 15.00, 'combos/combo-salado.jpg', 20, 'combos', NULL);


--
--

INSERT INTO public.tematicas (id, nombre, archivo_css, activa_actualmente) VALUES (1, 'Normal', NULL, false);
INSERT INTO public.tematicas (id, nombre, archivo_css, activa_actualmente) VALUES (2, 'San Valentín', 'sanvalentin.css', true);
INSERT INTO public.tematicas (id, nombre, archivo_css, activa_actualmente) VALUES (3, 'Navidad', 'navidad.css', false);
INSERT INTO public.tematicas (id, nombre, archivo_css, activa_actualmente) VALUES (4, 'Año Nuevo', 'anonuevo.css', false);
INSERT INTO public.tematicas (id, nombre, archivo_css, activa_actualmente) VALUES (5, 'Halloween', 'halloween.css', false);


--
--

INSERT INTO public.usuarios (id, username, password, rol, fecha_creacion) VALUES (1, 'admin', '123456', 'admin', '2026-07-01 14:03:10.444071');



-- ==========================================
-- SEQUENCE SET: detalle_pedidos_id_seq
-- ==========================================

SELECT pg_catalog.setval('public.detalle_pedidos_id_seq', 2, true);



-- ==========================================
-- SEQUENCE SET: pedidos_id_seq
-- ==========================================

SELECT pg_catalog.setval('public.pedidos_id_seq', 2, true);



-- ==========================================
-- SEQUENCE SET: productos_id_seq
-- ==========================================

SELECT pg_catalog.setval('public.productos_id_seq', 23, true);



-- ==========================================
-- SEQUENCE SET: tematicas_id_seq
-- ==========================================

SELECT pg_catalog.setval('public.tematicas_id_seq', 5, true);



-- ==========================================
-- SEQUENCE SET: usuarios_id_seq
-- ==========================================

SELECT pg_catalog.setval('public.usuarios_id_seq', 1, true);



-- ==========================================
-- RESTRICCIÓN (Llave Primaria/Única): detalle_pedidos detalle_pedidos_pkey
-- ==========================================

ALTER TABLE ONLY public.detalle_pedidos
    ADD CONSTRAINT detalle_pedidos_pkey PRIMARY KEY (id);



-- ==========================================
-- RESTRICCIÓN (Llave Primaria/Única): pedidos pedidos_pkey
-- ==========================================

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);



-- ==========================================
-- RESTRICCIÓN (Llave Primaria/Única): productos productos_pkey
-- ==========================================

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);



-- ==========================================
-- RESTRICCIÓN (Llave Primaria/Única): tematicas tematicas_pkey
-- ==========================================

ALTER TABLE ONLY public.tematicas
    ADD CONSTRAINT tematicas_pkey PRIMARY KEY (id);



-- ==========================================
-- RESTRICCIÓN (Llave Primaria/Única): usuarios usuarios_pkey
-- ==========================================

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);



-- ==========================================
-- RESTRICCIÓN (Llave Primaria/Única): usuarios usuarios_username_key
-- ==========================================

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);



-- ==========================================
-- LLAVE FORÁNEA: detalle_pedidos detalle_pedidos_id_pedido_fkey
-- ==========================================

ALTER TABLE ONLY public.detalle_pedidos
    ADD CONSTRAINT detalle_pedidos_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id);



-- ==========================================
-- LLAVE FORÁNEA: detalle_pedidos detalle_pedidos_id_producto_fkey
-- ==========================================

ALTER TABLE ONLY public.detalle_pedidos
    ADD CONSTRAINT detalle_pedidos_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id);



-- ==========================================
-- LLAVE FORÁNEA: productos productos_id_tematica_fkey
-- ==========================================

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_id_tematica_fkey FOREIGN KEY (id_tematica) REFERENCES public.tematicas(id);


--
-- PostgreSQL database dump complete
--

-- Custom additions for The Cream 2.0 (Contact & Complaints)
CREATE TABLE public.mensajes_contacto (
    id SERIAL PRIMARY KEY,
    nombre character varying(255) NOT NULL,
    correo character varying(255) NOT NULL,
    asunto character varying(100) NOT NULL,
    mensaje text NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.libro_reclamaciones (
    id SERIAL PRIMARY KEY,
    dni_cliente character varying(20) NOT NULL,
    nombre_cliente character varying(255) NOT NULL,
    correo character varying(255) NOT NULL,
    detalle_reclamo text NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA: configuracion_global
-- ==========================================

CREATE TABLE public.configuracion_global (
    id integer NOT NULL,
    whatsapp character varying(50),
    tiktok character varying(255),
    instagram character varying(255)
);

INSERT INTO public.configuracion_global (id, whatsapp, tiktok, instagram) 
VALUES (1, '984527421', 'https://tiktok.com', 'https://instagram.com');

-- TABLA: banners_promocionales
CREATE TABLE public.banners_promocionales (
    id integer NOT NULL,
    texto character varying(255),
    imagen character varying(255),
    activo boolean DEFAULT true
);

ALTER TABLE public.banners_promocionales
    ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME public.banners_promocionales_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );

ALTER TABLE ONLY public.banners_promocionales
    ADD CONSTRAINT banners_promocionales_pkey PRIMARY KEY (id);
