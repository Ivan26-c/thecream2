let carrito = JSON.parse(localStorage.getItem('thecream_carrito')) || [];
let todosLosProductos = [];
let categoriasDb = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracionGlobal();
    cargarBannersPromocionales();
    aplicarTematica();
    cargarProductos();
    actualizarUICarrito();

    // ==========================================
    // HEADER SCROLL EFFECT
    // ==========================================
    const header = document.querySelector('header');
    const promoBanner = document.getElementById('promo-banner');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
            if (promoBanner) promoBanner.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
            if (promoBanner) promoBanner.classList.remove('scrolled');
        }

        if (typeof actualizarProgresoCategorias === 'function') {
            actualizarProgresoCategorias();
        }
    });

    // ==========================================
    // MENÚ HAMBURGUESA
    // ==========================================
    const btnMenu = document.getElementById('btn-menu');
    const menuPrincipal = document.getElementById('menu-principal');

    if (btnMenu && menuPrincipal) {
        btnMenu.addEventListener('click', () => {
            menuPrincipal.classList.toggle('nav-activo');
        });
    }

    // ==========================================
    // EVENTOS DEL CARRITO
    // ==========================================
    const btnAbrir = document.getElementById('btn-abrir-carrito');
    const btnCerrar = document.getElementById('btn-cerrar-carrito');
    const panelCarrito = document.getElementById('cart-panel');

    if (btnAbrir && btnCerrar && panelCarrito) {
        btnAbrir.addEventListener('click', () => {
            panelCarrito.classList.add('open');
        });

        btnCerrar.addEventListener('click', () => {
            panelCarrito.classList.remove('open');
        });
    }

    const btnComprar = document.getElementById('btn-comprar');
    if (btnComprar) {
        btnComprar.addEventListener('click', procesarCompra);
    }
});

async function cargarProductos() {
    const contenedor = document.getElementById('catalogo-dinamico');
    if (!contenedor) return;

    try {
        // Cargar Categorías
        const resCat = await fetch('/api/categorias');
        if (resCat.ok) {
            categoriasDb = await resCat.json();
        }

        // Cargar Productos
        const respuesta = await fetch('/api/productos');
        if (!respuesta.ok) throw new Error('Error al cargar productos');

        todosLosProductos = await respuesta.json();
        renderizarMenuCategorias();
        renderizarProductos(todosLosProductos);
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = '<p style="text-align:center; color: red;">Hubo un error cargando el catálogo.</p>';
    }
}

function renderizarMenuCategorias() {
    const menu = document.getElementById('menu-categorias');
    if (!menu) return;

    let html = `
        <a href="TheCream.html#catalogo-dinamico"
            onclick="if(window.filtrarCategoria) { event.preventDefault(); filtrarCategoria('todo'); }"><i
                class="fa-solid fa-border-all"></i> Ver Todo</a>
    `;

    categoriasDb.forEach(cat => {
        const tieneProductos = todosLosProductos.some(p => p.categoria.toLowerCase() === cat.nombre.toLowerCase() && p.stock > 0);
        if (tieneProductos) {
            const nombreCapitalizado = cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1);
            let idAttr = '';
            let styleAttr = '';
            if (cat.nombre.toLowerCase() === 'especiales') {
                idAttr = 'id="menu-item-especiales"';
                const temaActual = localStorage.getItem('thecream_theme_css');
                if (!temaActual || temaActual === 'null') {
                    styleAttr = 'style="display: none;"';
                }
            }
            html += `
                <a href="TheCream.html#catalogo-dinamico" ${idAttr} ${styleAttr}
                    onclick="if(window.filtrarCategoria) { event.preventDefault(); filtrarCategoria('${cat.nombre}'); }"><i
                        class="${cat.icono}"></i> ${nombreCapitalizado}</a>
            `;
        }
    });

    menu.innerHTML = html;
}

function renderizarProductos(productos) {
    const contenedor = document.getElementById('catalogo-dinamico');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    if (productos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; width: 100%;">No hay productos disponibles en esta categoría.</p>';
        return;
    }

    const productosDisponibles = productos.filter(p => p.stock > 0);
    const productosPorCategoria = agruparPorCategoria(productosDisponibles);
    let htmlContent = '';

    // Usamos el orden de la base de datos (id) para ordenar las categorías.
    const ordenCategorias = categoriasDb.map(c => c.nombre.toLowerCase());

    const categorias = Object.keys(productosPorCategoria).sort((a, b) => {
        let indexA = ordenCategorias.indexOf(a.toLowerCase());
        let indexB = ordenCategorias.indexOf(b.toLowerCase());
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    for (const categoria of categorias) {
        const items = productosPorCategoria[categoria];
        const tituloCategoria = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        const idCat = 'cat-' + categoria.toLowerCase();

        // Buscar ícono
        const catObj = categoriasDb.find(c => c.nombre.toLowerCase() === categoria.toLowerCase());
        const iconoHtml = catObj ? `<i class="${catObj.icono}" style="margin-right: 10px; color: var(--primary);"></i>` : '';

        const gridClass = categoria.toLowerCase() === 'combos' ? 'grid-combos' : 'grid-productos';

        htmlContent += `
                <h3 class="categoria-titulo" id="${idCat}">${iconoHtml}${tituloCategoria}</h3>
                <div class="${gridClass}">
            `;

        items.forEach(producto => {
            const agotado = producto.stock <= 0;
            const nombreEscapado = producto.nombre.replace(/'/g, "\\'");

            let promoBadge = '';
            let precioHtml = `<span class="precio-tag">S/ ${parseFloat(producto.precio).toFixed(2)}</span>`;
            let precioParaCarrito = producto.precio;

            if (producto.precio_promocional && producto.fecha_fin_promocion) {
                const fechaFin = new Date(producto.fecha_fin_promocion);
                if (fechaFin > new Date()) {
                    promoBadge = `<div class="promo-badge"><i class="fa-solid fa-tag"></i> OFERTA</div>`;
                    precioHtml = `
                        <div style="display: flex; align-items: center; justify-content: center;">
                            <span class="precio-original">S/ ${parseFloat(producto.precio).toFixed(2)}</span>
                            <span class="precio-promo">S/ ${parseFloat(producto.precio_promocional).toFixed(2)}</span>
                        </div>
                    `;
                    precioParaCarrito = producto.precio_promocional;
                }
            }

            htmlContent += `
                    <div class="producto-card">
                        ${promoBadge}
                        <img loading="lazy" src="imagenes/${producto.imagen}" alt="${producto.nombre}" onerror="this.src='https://via.placeholder.com/300x200?text=Postre'">
                        <div class="producto-info">
                            <h4>${producto.nombre}</h4>
                            <p>${producto.descripcion}</p>
                            ${precioHtml}
                            
                            ${agotado ? '<p style="color:red; font-weight:bold; margin-top:5px;">Agotado</p>' : ''}
                            
                            <button class="btn-principal ${agotado ? 'btn-agotado' : ''}" style="margin-top: 15px; width: 100%; padding: 10px; font-size: 1rem; border-radius: 8px;" 
                                onclick="agregarAlCarrito(${producto.id}, '${nombreEscapado}', ${precioParaCarrito})" 
                                ${agotado ? 'disabled' : ''}>
                                ${agotado ? 'Sin Stock' : '<i class="fa-solid fa-cart-plus" style="margin-right: 5px;"></i> Añadir al Carrito'}
                            </button>
                        </div>
                    </div>
                `;
        });

        htmlContent += `</div>`;
    }

    contenedor.innerHTML = htmlContent;
}

function filtrarCategoria(categoria) {
    if (categoria === 'todo') {
        const cat = document.getElementById('catalogo-dinamico');
        if (cat) cat.scrollIntoView({ behavior: 'smooth' });
    } else {
        const catHeader = document.getElementById('cat-' + categoria.toLowerCase());
        if (catHeader) {
            catHeader.scrollIntoView({ behavior: 'smooth' });
        } else {
            const cat = document.getElementById('catalogo-dinamico');
            if (cat) cat.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function agruparPorCategoria(productos) {
    return productos.reduce((acc, producto) => {
        const cat = producto.categoria || 'Otros';
        if (!acc[cat]) {
            acc[cat] = [];
        }
        acc[cat].push(producto);
        return acc;
    }, {});
}

function actualizarProgresoCategorias() {
    const titulos = document.querySelectorAll('.categoria-titulo');
    const headerOffset = 250;

    titulos.forEach(titulo => {
        const grid = titulo.nextElementSibling;
        if (!grid || (!grid.classList.contains('grid-productos') && !grid.classList.contains('grid-combos'))) return;

        const rect = grid.getBoundingClientRect();
        const gridTop = rect.top;
        const gridHeight = rect.height;

        let progress = 0;

        if (gridTop > headerOffset) {
            progress = 0;
        } else if (gridTop + gridHeight < headerOffset) {
            progress = 100;
        } else {
            const scrolledPast = headerOffset - gridTop;
            progress = (scrolledPast / gridHeight) * 100;
        }

        progress = Math.max(0, Math.min(100, progress));
        titulo.style.setProperty('--progreso', `${progress}%`);
    });
}

// ==========================================
// MÓDULO: TEMÁTICAS FESTIVAS
// ==========================================
async function aplicarTematica() {
    try {
        const res = await fetch('/api/tematica-activa');
        const data = await res.json();

        if (data.archivo_css && data.archivo_css !== 'null') {
            localStorage.setItem('thecream_theme_css', data.archivo_css);
            const preload = document.getElementById('theme-css-preload');
            if (preload && preload.getAttribute('href') !== data.archivo_css) {
                preload.remove();
            }
            if (!document.querySelector(`link[href="${data.archivo_css}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = data.archivo_css;
                document.head.appendChild(link);
            }

            const heroTitle = document.querySelector('.hero h2');
            if (heroTitle && data.nombre !== 'Normal') {
                heroTitle.textContent = `Endulza tu ${data.nombre}`;
            }

            const logoImg = document.querySelector('.logo');
            const promoBanner = document.getElementById('promo-banner');
            const menuEspeciales = document.getElementById('menu-item-especiales');

            if (data.nombre === 'San Valentín') {
                if (logoImg) logoImg.src = 'imagenes/inicio/logo_san_valentin.png';
                if (promoBanner) {
                    promoBanner.style.display = 'block';
                    const heroSection = document.getElementById('hero-carousel');
                    if (heroSection) {
                        heroSection.parentNode.insertBefore(promoBanner, heroSection.nextSibling);
                    }
                }
                if (menuEspeciales) menuEspeciales.style.display = 'block';

                const heroIndicators = document.querySelector('.hero-indicators');
                if (heroIndicators) {
                    const slideHTML = `
                        <div class="hero-slide" style="background-image: linear-gradient(var(--overlay-color, rgba(217, 4, 41, 0.2)), var(--overlay-color, rgba(217, 4, 41, 0.2))), url('imagenes/inicio/banner-san-valentin.jpg');">
                            <div class="hero-content">
                                <h2>¡Especiales de San Valentín!</h2>
                                <p>Celebra el amor con nuestros postres temáticos de edición limitada. ¡Solo por este mes!</p>
                                <a href="javascript:void(0)" class="btn-principal" style="margin-top: 15px;" onclick="if(window.filtrarCategoria) { event.preventDefault(); filtrarCategoria('especiales'); }">Ver Especiales</a>
                            </div>
                        </div>
                    `;
                    heroIndicators.insertAdjacentHTML('beforebegin', slideHTML);
                    heroIndicators.insertAdjacentHTML('beforeend', '<div class="indicator"><div class="progress"></div></div>');
                }
            } else if (data.nombre === 'Navidad') {
                if (logoImg) logoImg.src = 'imagenes/inicio/logo_navidad.png';
                if (promoBanner) {
                    promoBanner.innerHTML = '<p><i class="fa-solid fa-tree" style="color: #0b6e4f;"></i> ¡Promoción Navideña: Por la compra de 2 postres te llevas un helado gratis! <i class="fa-solid fa-tree" style="color: #0b6e4f;"></i></p>';
                    promoBanner.style.display = 'block';
                    const heroSection = document.getElementById('hero-carousel');
                    if (heroSection) {
                        heroSection.parentNode.insertBefore(promoBanner, heroSection.nextSibling);
                    }
                }
                if (menuEspeciales) menuEspeciales.style.display = 'block';

                const heroIndicators = document.querySelector('.hero-indicators');
                if (heroIndicators) {
                    const slideHTML = `
                        <div class="hero-slide" style="background-image: linear-gradient(var(--overlay-color, rgba(11, 110, 79, 0.4)), var(--overlay-color, rgba(200, 29, 37, 0.4))), url('imagenes/inicio/fondo_navidad.jpg'); background-size: cover; background-position: center;">
                            <div class="hero-content">
                                <h2>¡Descubre la Magia de la Navidad!</h2>
                                <p>Prueba nuestra nueva colección navideña con panetón, galletas de jengibre y mucho más.</p>
                                <a href="javascript:void(0)" class="btn-principal" style="margin-top: 15px;" onclick="if(window.filtrarCategoria) { event.preventDefault(); filtrarCategoria('especiales'); }">Ver Especiales Navideños</a>
                            </div>
                        </div>
                    `;
                    heroIndicators.insertAdjacentHTML('beforebegin', slideHTML);
                    heroIndicators.insertAdjacentHTML('beforeend', '<div class="indicator"><div class="progress"></div></div>');
                }
            } else if (data.nombre === 'Año Nuevo') {
                if (logoImg) logoImg.src = 'imagenes/inicio/logo_ano_nuevo.png';
                if (promoBanner) {
                    promoBanner.innerHTML = '<p><i class="fa-solid fa-glass-cheers" style="color: #000;"></i> ¡Promoción Especial de Año Nuevo! 20% de descuento en pedidos por adelantado para tus fiestas. <i class="fa-solid fa-glass-cheers" style="color: #000;"></i></p>';
                    promoBanner.style.display = 'block';
                    const heroSection = document.getElementById('hero-carousel');
                    if (heroSection) {
                        heroSection.parentNode.insertBefore(promoBanner, heroSection.nextSibling);
                    }
                }
                if (menuEspeciales) menuEspeciales.style.display = 'block';

                const heroIndicators = document.querySelector('.hero-indicators');
                if (heroIndicators) {
                    const slideHTML = `
                        <div class="hero-slide" style="background-image: linear-gradient(var(--overlay-color, rgba(0, 0, 0, 0.6)), var(--overlay-color, rgba(0, 0, 0, 0.6))), url('imagenes/inicio/fondo_anonuevo.png'); background-size: cover; background-position: center;">
                            <div class="hero-content">
                                <h2 style="color: #ffd700;">¡Recibe el 2027 con Dulzura!</h2>
                                <p>Celebra la llegada del nuevo año con nuestras tortas especiales y packs de fiesta.</p>
                                <a href="javascript:void(0)" class="btn-principal" style="margin-top: 15px;" onclick="if(window.filtrarCategoria) { event.preventDefault(); filtrarCategoria('especiales'); }">Ver Especiales Año Nuevo</a>
                            </div>
                        </div>
                    `;
                    heroIndicators.insertAdjacentHTML('beforebegin', slideHTML);
                    heroIndicators.insertAdjacentHTML('beforeend', '<div class="indicator"><div class="progress"></div></div>');
                }
            } else if (data.nombre === 'Halloween') {
                if (logoImg) logoImg.src = 'imagenes/inicio/logo_halloween.png';
                if (promoBanner) {
                    promoBanner.innerHTML = '<p><i class="fa-solid fa-ghost" style="color: #000;"></i> ¡Si vienes disfrazado te regalamos un helado! <i class="fa-solid fa-spider" style="color: #000;"></i></p>';
                    promoBanner.style.display = 'block';
                    const heroSection = document.getElementById('hero-carousel');
                    if (heroSection) {
                        heroSection.parentNode.insertBefore(promoBanner, heroSection.nextSibling);
                    }
                }
                if (menuEspeciales) menuEspeciales.style.display = 'block';

                const heroIndicators = document.querySelector('.hero-indicators');
                if (heroIndicators) {
                    const slideHTML = `
                        <div class="hero-slide" style="background-image: linear-gradient(var(--overlay-color, rgba(0, 0, 0, 0.7)), var(--overlay-color, rgba(230, 126, 34, 0.3))), url('imagenes/inicio/fondo_halloween.jpg'); background-size: cover; background-position: center;">
                            <div class="hero-content">
                                <h2 style="color: #ff9f43; text-shadow: 2px 2px 10px #d35400;">¡Endulza tu Halloween!</h2>
                                <p style="color: white;">Nuestros postres terroríficamente deliciosos te están esperando.</p>
                                <a href="javascript:void(0)" class="btn-principal" style="margin-top: 15px; background: #e67e22 !important; color: white !important;" onclick="if(window.filtrarCategoria) { event.preventDefault(); filtrarCategoria('especiales'); }">Ver Especiales Halloween</a>
                            </div>
                        </div>
                    `;
                    heroIndicators.insertAdjacentHTML('beforebegin', slideHTML);
                    heroIndicators.insertAdjacentHTML('beforeend', '<div class="indicator"><div class="progress"></div></div>');
                }
            } else {
                if (logoImg) logoImg.src = 'imagenes/inicio/thecream.jpg';
                if (promoBanner) promoBanner.style.display = 'none';
                if (menuEspeciales) menuEspeciales.style.display = 'none';
            }
        } else {
            localStorage.setItem('thecream_theme_css', 'null');
            const preload = document.getElementById('theme-css-preload');
            if (preload) preload.remove();

            const logoImg = document.querySelector('.logo');
            const promoBanner = document.getElementById('promo-banner');
            const menuEspeciales = document.getElementById('menu-item-especiales');
            if (logoImg) logoImg.src = 'imagenes/inicio/thecream.jpg';
            if (promoBanner) promoBanner.style.display = 'none';
            if (menuEspeciales) menuEspeciales.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al aplicar temática CSS', error);
    } finally {
        iniciarCarrusel();
    }
}

// ==========================================
// MÓDULO: CATÁLOGO DINÁMICO
// ==========================================

// === LÓGICA DEL CARRITO ===

function agregarAlCarrito(id, nombre, precioOriginalNoUsar) {
    const itemExistente = carrito.find(item => item.id === id);
    const pInfo = todosLosProductos.find(p => p.id === id);

    let precioReal = precioOriginalNoUsar;
    if (pInfo) {
        precioReal = pInfo.precio;
        if (pInfo.precio_promocional && pInfo.fecha_fin_promocion) {
            if (new Date(pInfo.fecha_fin_promocion) > new Date()) {
                precioReal = pInfo.precio_promocional;
            }
        }
    }

    if (itemExistente) {
        itemExistente.cantidad++;
        itemExistente.precio = parseFloat(precioReal); // Update to current valid price
    } else {
        carrito.push({
            id: id,
            nombre: nombre,
            precio: parseFloat(precioReal),
            cantidad: 1
        });
    }

    guardarCarrito();
    actualizarUICarrito();

    const btnCart = document.getElementById('btn-abrir-carrito');
    if (btnCart) {
        btnCart.style.transform = 'scale(1.2)';
        setTimeout(() => btnCart.style.transform = 'scale(1)', 200);
    }
}

function quitarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    guardarCarrito();
    actualizarUICarrito();
}

function cambiarCantidadCarrito(id, cambio) {
    const item = carrito.find(i => i.id === id);
    if (item) {
        item.cantidad += cambio;
        if (item.cantidad <= 0) {
            quitarDelCarrito(id);
        } else {
            guardarCarrito();
            actualizarUICarrito();
        }
    }
}

function guardarCarrito() {
    localStorage.setItem('thecream_carrito', JSON.stringify(carrito));
}

function actualizarUICarrito() {
    const contenedorItems = document.getElementById('cart-items');
    const spanTotal = document.getElementById('cart-total-price');
    const spanCount = document.getElementById('cart-count');

    if (!contenedorItems || !spanTotal || !spanCount) return;

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    spanCount.textContent = totalItems;

    if (carrito.length === 0) {
        contenedorItems.innerHTML = '<p style="text-align:center; color: #888; margin-top: 20px;">Tu carrito está vacío.</p>';
        spanTotal.textContent = '0.00';
        return;
    }

    let html = '';
    let total = 0;

    carrito.forEach(item => {
        // Validar el precio actual por si la oferta expiró mientras estaba en el carrito
        const pInfo = todosLosProductos.find(p => p.id === item.id);
        if (pInfo) {
            let precioReal = pInfo.precio;
            if (pInfo.precio_promocional && pInfo.fecha_fin_promocion) {
                if (new Date(pInfo.fecha_fin_promocion) > new Date()) {
                    precioReal = pInfo.precio_promocional;
                }
            }
            item.precio = parseFloat(precioReal);
        }

        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p style="color: var(--text-muted); font-size: 0.9rem; display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                        <button onclick="cambiarCantidadCarrito(${item.id}, -1)" style="background-color: #e74c3c; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-weight: bold; font-size: 1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">-</button>
                        <span style="font-weight: bold; font-size: 1rem; min-width: 15px; text-align: center;">${item.cantidad}</span>
                        <button onclick="cambiarCantidadCarrito(${item.id}, 1)" style="background-color: #2ecc71; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-weight: bold; font-size: 1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">+</button>
                        <span> x S/ ${item.precio.toFixed(2)} = </span>
                        <strong style="color: var(--primary); font-size: 1rem;">S/ ${subtotal.toFixed(2)}</strong>
                    </p>
                </div>
                <button class="btn-quitar" style="background: none; border: none; color: #e74c3c; font-size: 1.3rem; cursor: pointer; transition: transform 0.2s;" onclick="quitarDelCarrito(${item.id})" title="Eliminar del carrito" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });

    contenedorItems.innerHTML = html;
    spanTotal.textContent = total.toFixed(2);
}

// === CHECKOUT (PROCESAR COMPRA) ===
async function procesarCompra() {
    const btnComprar = document.getElementById('btn-comprar');
    const textoOriginal = btnComprar.innerText;

    if (carrito.length === 0) {
        btnComprar.innerText = '¡El carrito está vacío!';
        btnComprar.style.backgroundColor = '#e74c3c';

        // Animación de agitación (shake)
        let posiciones = [10, -10, 10, -10, 5, -5, 0];
        posiciones.forEach((p, i) => {
            setTimeout(() => { btnComprar.style.transform = `translateX(${p}px)`; }, i * 40);
        });

        setTimeout(() => {
            btnComprar.innerText = textoOriginal;
            btnComprar.style.backgroundColor = '';
        }, 2500);
        return;
    }

    btnComprar.innerText = 'Procesando...';
    btnComprar.disabled = true;

    try {
        const respuesta = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(carrito)
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || 'Error al procesar la compra');
        }

        const copiaCarrito = [...carrito];

        carrito = [];
        guardarCarrito();
        actualizarUICarrito();

        cargarProductos();

        const panelCarrito = document.getElementById('cart-panel');
        if (panelCarrito) panelCarrito.classList.remove('open');

        mostrarBoletaExito(copiaCarrito, data.mensaje);

        btnComprar.innerText = textoOriginal;
        btnComprar.disabled = false;

    } catch (error) {
        btnComprar.innerText = error.message;
        btnComprar.style.backgroundColor = '#e74c3c';

        let posiciones = [10, -10, 10, -10, 5, -5, 0];
        posiciones.forEach((p, i) => {
            setTimeout(() => { btnComprar.style.transform = `translateX(${p}px)`; }, i * 40);
        });

        setTimeout(() => {
            btnComprar.innerText = textoOriginal;
            btnComprar.style.backgroundColor = '';
            btnComprar.disabled = false;
        }, 3500);
    }
}

// === LOGICA DEL CARRUSEL HERO ===
let carruselInterval;

function iniciarCarrusel() {
    const slides = document.querySelectorAll('.hero-slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;

    // Find the currently active slide
    slides.forEach((slide, idx) => {
        if (slide.classList.contains('active')) currentSlide = idx;
    });

    if (carruselInterval) clearInterval(carruselInterval);

    if (slides.length > 0) {
        carruselInterval = setInterval(() => {
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');

            const oldProgress = indicators[currentSlide].querySelector('.progress');
            if (oldProgress) {
                oldProgress.style.animation = 'none';
                oldProgress.offsetHeight;
                oldProgress.style.animation = null;
            }

            currentSlide = (currentSlide + 1) % slides.length;

            slides[currentSlide].classList.add('active');
            indicators[currentSlide].classList.add('active');
        }, 5000);
    }
}

// === BOLETA MODAL DE ÉXITO ===
function mostrarBoletaExito(productos, mensajeServidor) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(3px)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    overlay.id = 'modal-boleta';

    const fecha = new Date().toLocaleString();
    let total = 0;

    let htmlProductos = '';
    productos.forEach(p => {
        const sub = p.cantidad * p.precio;
        total += sub;
        htmlProductos += `
            <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 0.95rem; margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                <span style="flex: 1; text-align: left;">${p.cantidad}x ${p.nombre}</span>
                <span style="min-width: 70px; text-align: right;">S/ ${sub.toFixed(2)}</span>
            </div>
        `;
    });

    const logoSrc = document.querySelector('.logo') ? document.querySelector('.logo').getAttribute('src') : 'imagenes/inicio/thecream.jpg';

    overlay.innerHTML = `
        <div style="background: white; width: 350px; padding: 30px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); position: relative; border-top: 15px solid var(--primary); font-family: var(--font-text);">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${logoSrc}" alt="Logo The Cream" style="max-height: 90px; width: auto; object-fit: contain; margin-bottom: 10px; border-radius: 8px;">
                <p style="font-size: 0.9rem; color: #666; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Boleta Electrónica</p>
                <p style="font-size: 0.8rem; color: #999; margin: 5px 0 0 0;">Fecha: ${fecha}</p>
            </div>
            
            <div style="margin-bottom: 20px; border-top: 2px dashed #ccc; border-bottom: 2px dashed #ccc; padding: 15px 0; max-height: 200px; overflow-y: auto;">
                ${htmlProductos}
            </div>
            
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.3rem; margin-bottom: 20px;">
                <span>TOTAL:</span>
                <span style="color: var(--primary);">S/ ${total.toFixed(2)}</span>
            </div>

            <div style="text-align: center; background: #e8f8f5; color: #1abc9c; padding: 12px; border-radius: 8px; margin-bottom: 25px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i> 
                <span>${mensajeServidor}</span>
            </div>

            <button onclick="document.getElementById('modal-boleta').remove()" style="width: 100%; background: var(--primary); color: white; border: none; padding: 14px; font-weight: bold; font-size: 1.1rem; border-radius: 8px; cursor: pointer; transition: background 0.3s; box-shadow: 0 4px 10px rgba(233, 30, 99, 0.3);">
                Cerrar Boleta
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
}

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================

async function cargarConfiguracionGlobal() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const config = await res.json();

            // Actualizar enlaces de WhatsApp
            if (config.whatsapp) {
                const enlacesWs = document.querySelectorAll('a[href*="wa.me"], .link-whatsapp');
                enlacesWs.forEach(a => {
                    const url = new URL(a.href);
                    // mantener el texto del mensaje si existe
                    const texto = url.searchParams.get('text') || '';
                    a.href = `https://wa.me/${config.whatsapp.replace(/\+/g, '')}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
                });

                // Actualizar texto en contactos
                const textosWs = document.querySelectorAll('.txt-whatsapp');
                textosWs.forEach(el => el.textContent = config.whatsapp);
            }

            // Actualizar enlaces sociales en footer (si los hay)
            const enlacesInsta = document.querySelectorAll('.link-instagram');
            const enlacesTiktok = document.querySelectorAll('.link-tiktok');
            if (config.instagram) enlacesInsta.forEach(a => a.href = config.instagram);
            if (config.tiktok) enlacesTiktok.forEach(a => a.href = config.tiktok);

            // Inyectar color primario y secundario inteligente
            if (config.color_primario) {
                document.documentElement.style.setProperty('--primary', config.color_primario);

                // Buscar inteligentemente un color similar más oscuro para combinar
                let hex = String(config.color_primario).replace(/[^0-9a-f]/gi, '');
                if (hex.length < 6) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                let lum = -0.3; // 30% más oscuro
                let rgb = "#", c, i;
                for (i = 0; i < 3; i++) {
                    c = parseInt(hex.substr(i * 2, 2), 16);
                    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
                    rgb += ("00" + c).substr(c.length);
                }
                document.documentElement.style.setProperty('--secondary', rgb);
            }

        }
    } catch (error) {
        console.error('Error al cargar config:', error);
    }
}

async function cargarBannersPromocionales() {
    try {
        const res = await fetch('/api/banners');
        if (!res.ok) return;
        const banners = await res.json();
        if (banners.length === 0) return;

        const heroCarousel = document.getElementById('hero-carousel');
        if (heroCarousel) {
            const indicatorsContainer = heroCarousel.querySelector('.hero-indicators');

            banners.forEach((banner, index) => {
                const slide = document.createElement('div');
                slide.className = 'hero-slide';

                let bgStyle = 'linear-gradient(var(--overlay-color, rgba(0,0,0,0.6)), var(--overlay-color, rgba(0,0,0,0.6)))';
                if (banner.imagen) {
                    bgStyle = `linear-gradient(var(--overlay-color, rgba(0,0,0,0.6)), var(--overlay-color, rgba(0,0,0,0.6))), url('imagenes/${banner.imagen}')`;
                }
                slide.style.backgroundImage = bgStyle;

                slide.innerHTML = `
                    <div class="hero-content">
                        ${banner.texto ? `<h2>${banner.texto}</h2>` : `<h2>¡Promoción Especial!</h2>`}
                        ${banner.descripcion ? `<p>${banner.descripcion}</p>` : ''}
                        ${banner.mostrar_boton ? `<a href="#catalogo" class="btn-principal" style="margin-top: 15px;">Ver Catálogo</a>` : ''}
                    </div>
                `;

                if (indicatorsContainer) {
                    heroCarousel.insertBefore(slide, indicatorsContainer);

                    const newIndicator = document.createElement('div');
                    newIndicator.className = 'indicator';
                    newIndicator.innerHTML = '<div class="progress"></div>';
                    indicatorsContainer.appendChild(newIndicator);
                } else {
                    heroCarousel.appendChild(slide);
                }
            });

            iniciarCarrusel();
        }
    } catch (err) {
        console.error('Error al cargar banners:', err);
    }
}
