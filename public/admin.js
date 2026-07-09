document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarConfiguracion();
    cargarBannersAdmin();
    
    // Add event listeners for inventory search and filter
    const searchInput = document.getElementById('buscar-producto');
    const filterSelect = document.getElementById('filtro-categoria');
    if (searchInput) searchInput.addEventListener('input', filtrarTabla);
    if (filterSelect) filterSelect.addEventListener('change', filtrarTabla);

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', procesarLogin);
    }

    const formProducto = document.getElementById('form-producto');
    if (formProducto) {
        formProducto.addEventListener('submit', agregarProducto);
        initDragAndDrop();
        initCategoriasForm();
    }
});

// ==========================================
// MÓDULO: ADMINISTRACIÓN DE USUARIOS
// ==========================================
function verificarSesion() {
    const token = localStorage.getItem('thecream_admin_token');
    if (token) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        cargarDatosAvanzados();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
}

async function procesarLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await res.json();
        if (data.success) {
            localStorage.setItem('thecream_admin_token', data.token);
            errorMsg.style.display = 'none';
            verificarSesion();
        } else {
            errorMsg.innerText = data.error;
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        errorMsg.innerText = 'Error de conexión';
        errorMsg.style.display = 'block';
    }
}

function cerrarSesion() {
    localStorage.removeItem('thecream_admin_token');
    verificarSesion();
}

// ==========================================
// MÓDULO: CARGA DE DATOS AVANZADOS
// ==========================================
function cargarDatosAvanzados() {
    cargarTematicas();
    cargarInventario();
    cargarDashboardStats();
    cargarVentas();
    cargarReclamos();
}

// ==========================================
// MÓDULO: TEMÁTICAS
// ==========================================
async function cargarTematicas() {
    try {
        const res = await fetch('/api/tematicas');
        const tematicas = await res.json();

        const select = document.getElementById('select-tematica');
        select.innerHTML = '';

        tematicas.forEach(t => {
            const isSelected = t.activa_actualmente ? 'selected' : '';
            select.innerHTML += `<option value="${t.id}" ${isSelected}>${t.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error al cargar temáticas', error);
    }
}

async function cambiarTematica() {
    const select = document.getElementById('select-tematica');
    const id = select.value;

    try {
        const res = await fetch('/api/tematicas/activar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            cargarInventario();
            const btn = document.getElementById('btn-aplicar-tematica');
            if (btn) {
                const textOriginal = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Aplicado!';
                btn.style.backgroundColor = '#2ecc71';
                btn.style.boxShadow = '0 4px 15px rgba(46, 204, 113, 0.4)';
                setTimeout(() => {
                    btn.innerHTML = textOriginal;
                    btn.style.backgroundColor = '';
                    btn.style.boxShadow = '';
                }, 2500);
            }
        } else {
            alert('Error al cambiar temática');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarIngresos() {
    try {
        const res = await fetch('/api/admin/ingresos');
        const data = await res.json();
        document.getElementById('total-ingresos').innerText = `S/ ${parseFloat(data.total).toFixed(2)}`;
    } catch (error) {
        console.error('Error cargando ingresos', error);
    }
}

async function cargarVentas() {
    try {
        const respuesta = await fetch('/api/admin/ventas');
        const ventas = await respuesta.json();

        const tbody = document.querySelector('#tabla-ventas tbody');
        tbody.innerHTML = '';

        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay ventas registradas.</td></tr>';
            return;
        }

        ventas.forEach(v => {
            const fecha = new Date(v.fecha).toLocaleString();
            const cliente = v.cliente_nombre || 'Cliente Web';
            const detallesStr = encodeURIComponent(JSON.stringify(v.detalles));

            tbody.innerHTML += `
                <tr>
                    <td><strong>#${v.id_pedido.toString().padStart(5, '0')}</strong></td>
                    <td><small>${fecha}</small></td>
                    <td>${cliente}</td>
                    <td style="color:var(--primary); font-weight:bold;">S/ ${parseFloat(v.total).toFixed(2)}</td>
                    <td>
                        <button class="btn-secundario" style="padding: 5px 10px; font-size: 0.85rem; border-radius: 5px;" onclick="mostrarBoletaModal('${v.id_pedido}', '${fecha}', '${cliente}', ${v.total}, '${detallesStr}')">
                            <i class="fa-solid fa-receipt"></i> Ver Boleta
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error al cargar ventas:', error);
    }
}

function mostrarBoletaModal(id, fecha, cliente, total, detallesStr) {
    const detalles = JSON.parse(decodeURIComponent(detallesStr));

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
    overlay.id = 'modal-boleta-admin';

    let htmlProductos = '';
    detalles.forEach(p => {
        htmlProductos += `
            <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 0.95rem; margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                <span style="flex: 1; text-align: left;">${p.cantidad}x ${p.producto}</span>
                <span style="min-width: 70px; text-align: right;">S/ ${parseFloat(p.subtotal).toFixed(2)}</span>
            </div>
        `;
    });

    overlay.innerHTML = `
        <div style="background: white; width: 350px; padding: 30px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); position: relative; border-top: 15px solid var(--primary); font-family: var(--font-text);">
            <button type="button" onclick="document.getElementById('modal-boleta-admin').remove()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #aaa;">&times;</button>
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="font-family: var(--font-logo); color: var(--primary); font-size: 2.5rem; margin: 0;">The Cream</h2>
                <p style="font-size: 0.9rem; color: #666; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Boleta N° ${id.padStart(5, '0')}</p>
                <p style="font-size: 0.8rem; color: #999; margin: 5px 0 0 0;">Fecha: ${fecha}</p>
                <p style="font-size: 0.85rem; color: var(--dark); margin: 5px 0 0 0; font-weight: bold;">Cliente: ${cliente}</p>
            </div>
            
            <div style="margin-bottom: 20px; border-top: 2px dashed #ccc; border-bottom: 2px dashed #ccc; padding: 15px 0; max-height: 250px; overflow-y: auto;">
                ${htmlProductos}
            </div>
            
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.3rem; margin-bottom: 20px;">
                <span>TOTAL:</span>
                <span style="color: var(--primary);">S/ ${parseFloat(total).toFixed(2)}</span>
            </div>

            <button onclick="document.getElementById('modal-boleta-admin').remove()" style="width: 100%; background: var(--dark); color: white; border: none; padding: 12px; font-weight: bold; font-size: 1.1rem; border-radius: 8px; cursor: pointer; transition: background 0.3s;">
                Cerrar
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
}

// ==========================================
// MÓDULO: GESTIÓN DE INVENTARIO
// ==========================================
let todosLosProductosAdmin = [];

async function cargarInventario() {
    try {
        const respuesta = await fetch('/api/productos');
        todosLosProductosAdmin = await respuesta.json();
        renderizarTablaInventario(todosLosProductosAdmin);
    } catch (error) {
        console.error('Error al cargar inventario:', error);
    }
}

function renderizarTablaInventario(productos) {
    const tbody = document.querySelector('#tabla-productos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    productos.forEach(p => {
        let rowClass = '';
        if (p.stock === 0) {
            rowClass = 'stock-cero';
        } else if (p.stock <= 5) {
            rowClass = 'stock-bajo';
        }
        
        // Promotion logic
        let promoBadge = '';
        let precioHtml = `S/ ${parseFloat(p.precio).toFixed(2)}`;
        if (p.precio_promocional && p.fecha_fin_promocion) {
            const fechaFin = new Date(p.fecha_fin_promocion);
            if (fechaFin > new Date()) {
                promoBadge = `<span style="background: #e74c3c; color: white; padding: 2px 5px; border-radius: 4px; font-size: 0.8rem; margin-left: 5px;">OFERTA</span>`;
                precioHtml = `<span style="text-decoration: line-through; color: #999; font-size: 0.9rem;">S/ ${parseFloat(p.precio).toFixed(2)}</span><br><strong style="color: #e74c3c;">S/ ${parseFloat(p.precio_promocional).toFixed(2)}</strong>`;
            }
        }

        tbody.innerHTML += `
            <tr class="${rowClass}">
                <td>${p.id}</td>
                <td><strong>${p.nombre}</strong> ${promoBadge}<br><small>${p.categoria}</small></td>
                <td>${precioHtml}</td>
                <td style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="cambiarStock(${p.id}, -1)" style="background-color: #e74c3c; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-weight: bold; font-size: 1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">-</button>
                    <span style="font-weight: bold; font-size: 1rem; min-width: 25px; text-align: center;">${p.stock}</span>
                    <button onclick="cambiarStock(${p.id}, 1)" style="background-color: #2ecc71; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-weight: bold; font-size: 1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">+</button>
                </td>
                <td>
                    <button class="btn-quitar" style="background: none; border: none; color: var(--primary); font-size: 1.3rem; cursor: pointer; transition: transform 0.2s; margin-right: 10px;" onclick="abrirModalEdicion(${p.id})" title="Editar Producto" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-quitar" style="background: none; border: none; color: #e74c3c; font-size: 1.3rem; cursor: pointer; transition: transform 0.2s;" onclick="eliminarProducto(${p.id})" title="Eliminar Producto" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });
}

function filtrarTabla() {
    const term = document.getElementById('buscar-producto').value.toLowerCase();
    const cat = document.getElementById('filtro-categoria').value.toLowerCase();
    
    const filtrados = todosLosProductosAdmin.filter(p => {
        const matchSearch = p.nombre.toLowerCase().includes(term) || p.id.toString().includes(term);
        const matchCat = cat === 'todas' || p.categoria.toLowerCase() === cat;
        return matchSearch && matchCat;
    });
    
    renderizarTablaInventario(filtrados);
}

// ==========================================
// MÓDULO: GESTIÓN DE PRODUCTOS Y DRAG & DROP
// ==========================================

function initDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('p-imagen-file');
    const imgPreview = document.getElementById('img-preview');
    const dropText = document.getElementById('drop-text');

    if (!dropZone || !fileInput) return;

    // Prevenir el comportamiento por defecto del navegador (abrir archivo)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Efectos visuales al arrastrar
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    // Manejar el archivo cuando se suelta
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            fileInput.files = files; // Asignar al input oculto
            handleFiles(files[0]);
        }
    }, false);

    // Manejar el archivo cuando se selecciona manualmente con clic
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFiles(this.files[0]);
        }
    });

    // Mostrar vista previa
    function handleFiles(file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(e) {
                imgPreview.src = e.target.result;
                imgPreview.style.display = 'block';
                dropText.textContent = 'Archivo seleccionado: ' + file.name;
            }
        } else {
            mostrarAlertaBonita('Por favor selecciona solo imágenes PNG o JPG', 'error');
            fileInput.value = '';
        }
    }

    // Drag and Drop para Edición
    const dropZoneEdit = document.getElementById('e-drop-zone');
    const fileInputEdit = document.getElementById('e-imagen-file');
    const imgPreviewEdit = document.getElementById('e-img-preview');
    const dropTextEdit = document.getElementById('e-drop-text');

    if (dropZoneEdit && fileInputEdit) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZoneEdit.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZoneEdit.addEventListener(eventName, () => dropZoneEdit.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZoneEdit.addEventListener(eventName, () => dropZoneEdit.classList.remove('dragover'), false);
        });
        dropZoneEdit.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInputEdit.files = files;
                handleFilesEdit(files[0]);
            }
        }, false);
        fileInputEdit.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                handleFilesEdit(this.files[0]);
            }
        });
        function handleFilesEdit(file) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function(e) {
                    imgPreviewEdit.src = e.target.result;
                    imgPreviewEdit.style.display = 'block';
                    dropTextEdit.textContent = 'Nueva imagen seleccionada: ' + file.name;
                }
            } else {
                mostrarAlertaBonita('Por favor selecciona solo imágenes PNG o JPG', 'error');
                fileInputEdit.value = '';
            }
        }
    }

    // Drag and Drop para Banners
    const dropZoneBanner = document.getElementById('b-drop-zone');
    const fileInputBanner = document.getElementById('b-imagen-file');
    const imgPreviewBanner = document.getElementById('b-img-preview');
    const dropTextBanner = document.getElementById('b-drop-text');

    if (dropZoneBanner && fileInputBanner) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZoneBanner.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZoneBanner.addEventListener(eventName, () => dropZoneBanner.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZoneBanner.addEventListener(eventName, () => dropZoneBanner.classList.remove('dragover'), false);
        });
        dropZoneBanner.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInputBanner.files = files;
                handleFilesBanner(files[0]);
            }
        }, false);
        fileInputBanner.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                handleFilesBanner(this.files[0]);
            }
        });
        function handleFilesBanner(file) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function(e) {
                    imgPreviewBanner.src = e.target.result;
                    imgPreviewBanner.style.display = 'block';
                    dropTextBanner.textContent = 'Banner seleccionado: ' + file.name;
                }
            } else {
                mostrarAlertaBonita('Por favor selecciona solo imágenes', 'error');
                fileInputBanner.value = '';
            }
        }
    }
}

function abrirModalEdicion(id) {
    const p = todosLosProductosAdmin.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('e-id').value = p.id;
    document.getElementById('e-nombre').value = p.nombre;
    document.getElementById('e-desc').value = p.descripcion;
    document.getElementById('e-precio').value = p.precio;
    document.getElementById('e-stock').value = p.stock;
    
    document.getElementById('e-precio-promo').value = p.precio_promocional || '';
    if (p.fecha_fin_promocion) {
        // Format for datetime-local
        const date = new Date(p.fecha_fin_promocion);
        const iso = date.toISOString();
        document.getElementById('e-fecha-promo').value = iso.slice(0, 16);
    } else {
        document.getElementById('e-fecha-promo').value = '';
    }
    
    const catSelect = document.getElementById('e-categoria');
    if (catSelect) catSelect.value = p.categoria;

    document.getElementById('e-img-preview').style.display = 'none';
    document.getElementById('e-drop-text').textContent = 'Sube una nueva foto si deseas cambiarla';
    document.getElementById('e-imagen-file').value = '';

    document.getElementById('modal-editar').style.display = 'flex';
}

function cerrarModalEdicion() {
    document.getElementById('modal-editar').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const formEditar = document.getElementById('form-editar');
    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('e-id').value;
            const precio = parseFloat(document.getElementById('e-precio').value);
            const precioPromoStr = document.getElementById('e-precio-promo').value;
            
            if (precioPromoStr) {
                const precioPromo = parseFloat(precioPromoStr);
                if (precioPromo >= precio) {
                    mostrarAlertaBonita('El precio de promoción debe ser menor al precio original', 'error');
                    return;
                }
            }

            const formData = new FormData();
            formData.append('nombre', document.getElementById('e-nombre').value);
            formData.append('descripcion', document.getElementById('e-desc').value);
            formData.append('precio', precio);
            formData.append('stock', document.getElementById('e-stock').value);
            formData.append('categoria', document.getElementById('e-categoria').value);
            formData.append('precio_promocional', precioPromoStr);
            formData.append('fecha_fin_promocion', document.getElementById('e-fecha-promo').value);
            
            const fileInput = document.getElementById('e-imagen-file');
            if (fileInput.files.length > 0) {
                formData.append('imagenArchivo', fileInput.files[0]);
            }

            try {
                const res = await fetch(`/api/admin/productos/${id}`, {
                    method: 'PUT',
                    body: formData
                });
                
                if (res.ok) {
                    mostrarAlertaBonita('Producto actualizado con éxito', 'success');
                    cerrarModalEdicion();
                    cargarInventario();
                } else {
                    mostrarAlertaBonita('Error al actualizar el producto', 'error');
                }
            } catch (err) {
                console.error(err);
                mostrarAlertaBonita('Error de conexión', 'error');
            }
        });
    }
});


async function initCategoriasForm() {
    const select = document.getElementById('p-categoria');
    const selectEdit = document.getElementById('e-categoria');
    const selectFiltro = document.getElementById('filtro-categoria');
    const containerNueva = document.getElementById('nueva-categoria-container');
    const iconPicker = document.getElementById('icon-picker');
    const inputIcono = document.getElementById('p-nueva-cat-icono');
    
    try {
        const res = await fetch('/api/categorias');
        if (res.ok) {
            const categorias = await res.json();
            let options = '';
            let filterOptions = '<option value="todas">Todas las categorías</option>';
            
            categorias.forEach(cat => {
                const nombreCap = cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1);
                options += `<option value="${cat.nombre}">${nombreCap}</option>`;
                filterOptions += `<option value="${cat.nombre}">${nombreCap}</option>`;
            });
            
            if (select) select.innerHTML = options + `<option value="nueva" style="font-weight: bold; color: var(--primary);">➕ Crear Nueva Categoría</option>`;
            if (selectEdit) selectEdit.innerHTML = options;
            if (selectFiltro) selectFiltro.innerHTML = filterOptions;
        }
    } catch (e) {
        console.error('Error cargando categorías:', e);
    }

    if (select) {
        select.addEventListener('change', (e) => {
            if (e.target.value === 'nueva') {
                containerNueva.style.display = 'block';
                document.getElementById('p-nueva-cat-nombre').required = true;
                inputIcono.required = true;
            } else {
                containerNueva.style.display = 'none';
                document.getElementById('p-nueva-cat-nombre').required = false;
                inputIcono.required = false;
            }
        });
    }

    if (iconPicker) {
        const icons = iconPicker.querySelectorAll('i');
        icons.forEach(icon => {
            icon.addEventListener('click', () => {
                icons.forEach(i => i.classList.remove('selected'));
                icon.classList.add('selected');
                inputIcono.value = icon.getAttribute('data-icon');
            });
        });
    }
}

async function agregarProducto(e) {
    e.preventDefault();

    const precio = parseFloat(document.getElementById('p-precio').value);
    const precioPromoStr = document.getElementById('p-precio-promo').value;

    if (precioPromoStr) {
        const precioPromo = parseFloat(precioPromoStr);
        if (precioPromo >= precio) {
            mostrarAlertaBonita('El precio de promoción debe ser menor al precio original', 'error');
            return;
        }
    }

    const formData = new FormData();
    formData.append('nombre', document.getElementById('p-nombre').value);
    formData.append('descripcion', document.getElementById('p-desc').value);
    formData.append('precio', precio);
    formData.append('stock', document.getElementById('p-stock').value);
    formData.append('precio_promocional', precioPromoStr);
    formData.append('fecha_fin_promocion', document.getElementById('p-fecha-promo').value);
    formData.append('categoria', document.getElementById('p-categoria').value);
    
    if (document.getElementById('p-categoria').value === 'nueva') {
        const nuevaCat = document.getElementById('p-nueva-cat-nombre').value;
        const nuevoIcon = document.getElementById('p-nueva-cat-icono').value;
        if (!nuevaCat || !nuevoIcon) {
            mostrarAlertaBonita('Completa el nombre y selecciona un ícono para la nueva categoría', 'error');
            return;
        }
        formData.append('nuevaCategoria', nuevaCat);
        formData.append('iconoCategoria', nuevoIcon);
    }

    const fileInput = document.getElementById('p-imagen-file');
    if (fileInput.files.length > 0) {
        formData.append('imagenArchivo', fileInput.files[0]);
    } else {
        mostrarAlertaBonita('Debes subir una imagen para el producto', 'error');
        return;
    }

    try {
        const res = await fetch('/api/admin/productos', {
            method: 'POST',
            body: formData // No se envía 'Content-Type', el navegador lo pone automáticamente con el boundary para FormData
        });

        if (res.ok) {
            mostrarAlertaBonita('¡Producto agregado con éxito!', 'success');
            document.getElementById('form-producto').reset();
            document.getElementById('img-preview').style.display = 'none';
            document.getElementById('drop-text').textContent = 'Arrastra aquí tu imagen o haz clic para subir';
            document.getElementById('nueva-categoria-container').style.display = 'none';
            const icons = document.querySelectorAll('#icon-picker i');
            icons.forEach(i => i.classList.remove('selected'));
            initCategoriasForm(); // Recargar las opciones de categoría por si se agregó una nueva
            cargarInventario();
        } else {
            const data = await res.json();
            mostrarAlertaBonita('Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarAlertaBonita('Hubo un problema al agregar el producto', 'error');
    }
}

function eliminarProducto(id) {
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

    overlay.innerHTML = `
        <div style="background: white; width: 350px; padding: 30px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); text-align: center; font-family: var(--font-text);">
            <div style="color: #e74c3c; font-size: 3rem; margin-bottom: 15px;">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style="color: var(--dark); font-size: 1.2rem; margin-bottom: 10px;">¿Eliminar Producto?</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 25px;">Esta acción es permanente y no se puede deshacer.</p>
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-eliminar" style="flex: 1; padding: 10px; background: #f1f3f5; color: #495057; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Cancelar</button>
                <button id="btn-confirmar-eliminar" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Sí, eliminar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-cancelar-eliminar').onclick = () => overlay.remove();
    document.getElementById('btn-confirmar-eliminar').onclick = async () => {
        overlay.remove();
        try {
            const res = await fetch(`/api/admin/productos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarAlertaBonita('Producto eliminado permanentemente', 'success');
                cargarInventario();
            } else {
                const data = await res.json();
                mostrarAlertaBonita('Error al eliminar: ' + (data.error || 'Desconocido'), 'error');
            }
        } catch (error) {
            mostrarAlertaBonita('Hubo un problema de conexión', 'error');
        }
    };
}

async function cambiarStock(id, cantidad) {
    try {
        const res = await fetch(`/api/admin/productos/${id}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad })
        });

        if (res.ok) {
            cargarInventario();
        } else {
            const data = await res.json();
            alert('Error al cambiar stock: ' + (data.error || 'Desconocido'));
        }
    } catch (error) {
        alert('Hubo un problema de conexión');
    }
}

// ==========================================
// MÓDULO: MENSAJES Y RECLAMOS
// ==========================================
let todosLosReclamos = [];

async function cargarReclamos() {
    try {
        const res = await fetch('/api/admin/reclamos');
        todosLosReclamos = await res.json();
        renderizarTablaReclamos(todosLosReclamos);
    } catch (err) {
        console.error('Error al cargar reclamos:', err);
    }
}

function renderizarTablaReclamos(reclamos) {
    const tbody = document.querySelector('#tabla-reclamos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (reclamos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #777;">No hay reclamos que mostrar.</td></tr>';
        return;
    }

    reclamos.forEach(r => {
        const tr = document.createElement('tr');
        const estadoLabel = r.estado === 'Resuelto' 
            ? '<span style="background: #2ecc71; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Resuelto</span>' 
            : '<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Pendiente</span>';
        
        tr.innerHTML = `
            <td style="font-size: 0.9rem;">${new Date(r.fecha).toLocaleString()}</td>
            <td>${r.dni_cliente}</td>
            <td style="font-weight: bold;">${r.nombre_cliente}</td>
            <td>${r.correo}</td>
            <td>${estadoLabel}</td>
            <td style="display: flex; gap: 5px;">
                <button class="btn-secundario" style="padding: 5px 10px; font-size: 0.85rem; border-radius: 5px;" onclick="verDetalleReclamo(${r.id})" title="Ver Detalles">
                    <i class="fa-solid fa-eye"></i> Leer
                </button>
                ${r.estado !== 'Resuelto' ? `
                <button class="btn-secundario" style="background-color: #2ecc71; color: white; border: none; padding: 5px 10px; font-size: 0.85rem; border-radius: 5px;" onclick="marcarReclamoResuelto(${r.id})" title="Marcar como Resuelto">
                    <i class="fa-solid fa-check"></i>
                </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function verDetalleReclamo(id) {
    const r = todosLosReclamos.find(x => x.id === id);
    if (!r) return;
    document.getElementById('vr-cliente').textContent = r.nombre_cliente;
    document.getElementById('vr-dni').textContent = r.dni_cliente;
    document.getElementById('vr-correo').textContent = r.correo;
    document.getElementById('vr-fecha').textContent = new Date(r.fecha).toLocaleString();
    document.getElementById('vr-mensaje').textContent = r.detalle_reclamo;
    document.getElementById('modal-ver-reclamo').style.display = 'flex';
}

async function marcarReclamoResuelto(id) {
    try {
        const res = await fetch(`/api/admin/reclamos/${id}/estado`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('thecream_admin_token')}`
            },
            body: JSON.stringify({ estado: 'Resuelto' })
        });
        if (res.ok) {
            mostrarAlertaBonita('Reclamo marcado como resuelto', 'success');
            cargarReclamos();
        } else {
            mostrarAlertaBonita('Error al actualizar estado', 'error');
        }
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchReclamo = document.getElementById('buscar-reclamo');
    const filterReclamo = document.getElementById('filtro-estado-reclamo');

    function filtrarReclamos() {
        const term = searchReclamo.value.toLowerCase();
        const estado = filterReclamo.value;
        const filtrados = todosLosReclamos.filter(r => {
            const matchSearch = r.nombre_cliente.toLowerCase().includes(term) || r.dni_cliente.includes(term);
            const matchEstado = estado === 'todos' || r.estado === estado;
            return matchSearch && matchEstado;
        });
        renderizarTablaReclamos(filtrados);
    }

    if (searchReclamo) searchReclamo.addEventListener('input', filtrarReclamos);
    if (filterReclamo) filterReclamo.addEventListener('change', filtrarReclamos);
});

function mostrarAlertaBonita(mensaje, tipo) {
    const color = tipo === 'success' ? '#2ecc71' : '#e74c3c';
    const icon = tipo === 'success' ? 'fa-circle-check' : 'fa-circle-xmark';

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    overlay.style.backdropFilter = 'blur(2px)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';

    overlay.innerHTML = `
        <div style="background: white; width: 300px; padding: 30px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); text-align: center; font-family: var(--font-text);">
            <div style="color: ${color}; font-size: 4rem; margin-bottom: 15px;">
                <i class="fa-solid ${icon}"></i>
            </div>
            <h3 style="color: var(--dark); font-size: 1.2rem; margin-bottom: 10px;">${tipo === 'success' ? '¡Éxito!' : 'Oops...'}</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 25px;">${mensaje}</p>
            <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; padding: 12px; background: var(--dark); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Aceptar</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

let dashboardChartInstance = null;

async function cargarDashboardStats() {
    try {
        const res = await fetch('/api/admin/dashboard-stats');
        const data = await res.json();

        // 1. Actualizar KPIs
        document.getElementById('kpi-ingresos').innerText = `S/ ${data.ingresos}`;
        document.getElementById('kpi-pedidos').innerText = data.ventas;
        document.getElementById('kpi-productos').innerText = data.productos;
        document.getElementById('kpi-agotados').innerText = data.agotados;

        // 2. Renderizar Gráfico
        const ctx = document.getElementById('dashboardChart').getContext('2d');
        
        // Destruir gráfico anterior si existe (para evitar superposiciones al recargar)
        if (dashboardChartInstance) {
            dashboardChartInstance.destroy();
        }

        const labels = data.chartData.map(d => d.label);
        const counts = data.chartData.map(d => d.count);

        dashboardChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Productos',
                    data: counts,
                    backgroundColor: [
                        '#c2295a', // primary
                        '#ff7eb3', // primary light
                        '#ffd166', // yellow
                        '#06d6a0', // green
                        '#118ab2', // blue
                        '#073b4c'  // dark blue
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: window.innerWidth <= 768 ? 0 : 10
                },
                plugins: {
                    legend: {
                        display: true,
                        position: window.innerWidth > 768 ? 'right' : 'bottom',
                        labels: {
                            font: {
                                family: "'Nunito', sans-serif",
                                size: window.innerWidth <= 768 ? 10 : 12
                            },
                            boxWidth: window.innerWidth <= 768 ? 12 : 40,
                            padding: window.innerWidth <= 768 ? 8 : 10
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error('Error al cargar stats del dashboard:', err);
    }
}

// ==========================================
// MÓDULO: NAVEGACIÓN SPA (PESTAÑAS)
// ==========================================
function switchTab(tabId) {
    // 1. Ocultar todas las pestañas
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => pane.classList.remove('active'));

    // 2. Quitar active de todos los links
    const links = document.querySelectorAll('.sidebar-menu li');
    links.forEach(link => link.classList.remove('active'));

    // 3. Mostrar la pestaña seleccionada
    document.getElementById(tabId).classList.add('active');

    // 4. Marcar el link como activo
    const activeLink = Array.from(links).find(link => link.getAttribute('onclick').includes(tabId));
    if (activeLink) activeLink.classList.add('active');
}

// ==========================================
// MÓDULO: CONFIGURACIÓN GLOBAL
// ==========================================

async function cargarConfiguracion() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const config = await res.json();
            document.getElementById('c-whatsapp').value = config.whatsapp || '';
            document.getElementById('c-tiktok').value = config.tiktok || '';
            document.getElementById('c-instagram').value = config.instagram || '';
            
            if (config.color_primario) {
                document.getElementById('c-color-primario').value = config.color_primario;
                document.documentElement.style.setProperty('--primary', config.color_primario);
                
                let hex = String(config.color_primario).replace(/[^0-9a-f]/gi, '');
                if (hex.length < 6) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
                let lum = -0.3;
                let rgb = "#", c, i;
                for (i = 0; i < 3; i++) {
                    c = parseInt(hex.substr(i*2,2), 16);
                    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
                    rgb += ("00"+c).substr(c.length);
                }
                document.documentElement.style.setProperty('--secondary', rgb);
            }
        }
    } catch (err) {
        console.error('Error al cargar config:', err);
    }
}

const formConfig = document.getElementById('form-config');
if (formConfig) {
    formConfig.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('whatsapp', document.getElementById('c-whatsapp').value);
        formData.append('tiktok', document.getElementById('c-tiktok').value);
        formData.append('instagram', document.getElementById('c-instagram').value);
        formData.append('color_primario', document.getElementById('c-color-primario').value);
        
        try {
            const res = await fetch('/api/admin/config', {
                method: 'PUT',
                body: formData
            });
            if (res.ok) {
                mostrarAlertaBonita('Configuración guardada correctamente', 'success');
                cargarConfiguracion();
            } else {
                mostrarAlertaBonita('Error al guardar configuración', 'error');
            }
        } catch (err) {
            console.error(err);
            mostrarAlertaBonita('Error de conexión', 'error');
        }
    });
}

// ==========================================
// GESTIÓN DE BANNERS (CRUD)
// ==========================================

async function cargarBannersAdmin() {
    try {
        const res = await fetch('/api/admin/banners', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('thecream_admin_token')}` }
        });
        if (!res.ok) throw new Error('Error al cargar banners');
        const banners = await res.json();
        
        const contenedor = document.getElementById('contenedor-banners');
        contenedor.innerHTML = '';
        
        banners.forEach(b => {
            const card = document.createElement('div');
            card.className = 'producto-card';
            card.style.position = 'relative';
            
            card.innerHTML = `
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; z-index: 1;">ID: #${b.id}</div>
                <div class="producto-img" style="height: 150px; background-color: #f5f5f5;">
                    ${b.imagen ? `<img src="imagenes/${b.imagen}" alt="Banner" style="width:100%; height:100%; object-fit: cover;">` : '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#999;"><i class="fa-solid fa-image fa-3x"></i></div>'}
                </div>
                <div class="producto-info" style="padding: 15px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: var(--dark); font-size: 1rem; min-height: 24px;">${b.texto || 'Sin texto'}</h4>
                    ${b.descripcion ? `<p style="font-size: 0.85rem; color: #666; margin-bottom: 10px; max-height: 40px; overflow: hidden;">${b.descripcion}</p>` : ''}
                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <span style="font-size: 0.9rem; color: var(--text-muted);">Activo:</span>
                        <label class="switch">
                            <input type="checkbox" onchange="toggleBannerStatus(${b.id}, this.checked, '${b.texto || ''}', '${b.descripcion || ''}', ${b.mostrar_boton}, '${b.imagen || ''}')" ${b.activo ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <div class="producto-acciones" style="display: flex; justify-content: center; gap: 10px;">
                        <button class="btn-editar" onclick="editarBanner(${b.id}, '${b.texto || ''}', '${b.descripcion || ''}', ${b.mostrar_boton}, '${b.imagen || ''}', ${b.activo})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-eliminar" onclick="eliminarBanner(${b.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            contenedor.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}

function abrirModalBanner() {
    document.getElementById('form-banner').reset();
    document.getElementById('b-id').value = '';
    document.getElementById('b-imagen-actual').value = '';
    document.getElementById('b-descripcion').value = '';
    document.getElementById('b-mostrar-boton').checked = true;
    document.getElementById('b-img-preview').style.display = 'none';
    document.getElementById('b-drop-text').textContent = 'Arrastra aquí tu imagen o haz clic para subir';
    document.getElementById('modal-banner-titulo').textContent = 'Nuevo Banner';
    document.getElementById('modal-banner').style.display = 'flex';
}

function cerrarModalBanner() {
    document.getElementById('modal-banner').style.display = 'none';
}

function editarBanner(id, texto, descripcion, mostrar_boton, imagen, activo) {
    abrirModalBanner();
    document.getElementById('modal-banner-titulo').textContent = 'Editar Banner';
    document.getElementById('b-id').value = id;
    document.getElementById('b-texto').value = texto;
    document.getElementById('b-descripcion').value = descripcion;
    document.getElementById('b-mostrar-boton').checked = mostrar_boton;
    document.getElementById('b-activo').checked = activo;
    document.getElementById('b-imagen-actual').value = imagen;
    
    if (imagen) {
        const preview = document.getElementById('b-img-preview');
        preview.src = `imagenes/${imagen}`;
        preview.style.display = 'block';
        document.getElementById('b-drop-text').textContent = 'Imagen actual';
    }
}

function eliminarBanner(id) {
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

    overlay.innerHTML = `
        <div style="background: white; width: 350px; padding: 30px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); text-align: center; font-family: var(--font-text);">
            <div style="color: #e74c3c; font-size: 3rem; margin-bottom: 15px;">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style="color: var(--dark); font-size: 1.2rem; margin-bottom: 10px;">¿Eliminar Banner?</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 25px;">Esta acción es permanente y no se puede deshacer.</p>
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-banner" style="flex: 1; padding: 10px; background: #f1f3f5; color: #495057; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Cancelar</button>
                <button id="btn-confirmar-banner" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Sí, eliminar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-cancelar-banner').onclick = () => overlay.remove();
    document.getElementById('btn-confirmar-banner').onclick = async () => {
        overlay.remove();
        try {
            const res = await fetch(`/api/admin/banners/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('thecream_admin_token')}` }
            });
            if (res.ok) {
                mostrarAlertaBonita('Banner eliminado', 'success');
                cargarBannersAdmin();
            } else {
                mostrarAlertaBonita('Error al eliminar', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    };
}

async function toggleBannerStatus(id, estado, textoActual, descripcionActual, mostrarBotonActual, imagenActual) {
    try {
        const formData = new FormData();
        formData.append('activo', estado);
        formData.append('texto', textoActual);
        formData.append('descripcion', descripcionActual);
        formData.append('mostrar_boton', mostrarBotonActual);
        formData.append('imagenActual', imagenActual);

        const res = await fetch(`/api/admin/banners/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('thecream_admin_token')}` },
            body: formData
        });
        if (!res.ok) {
            mostrarAlertaBonita('Error al cambiar estado', 'error');
            cargarBannersAdmin();
        }
    } catch (err) {
        console.error(err);
        cargarBannersAdmin();
    }
}

const formBanner = document.getElementById('form-banner');
if (formBanner) {
    formBanner.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('b-id').value;
        const texto = document.getElementById('b-texto').value;
        const descripcion = document.getElementById('b-descripcion').value;
        const activo = document.getElementById('b-activo').checked;
        const mostrar_boton = document.getElementById('b-mostrar-boton').checked;
        const file = document.getElementById('b-imagen-file').files[0];
        const imagenActual = document.getElementById('b-imagen-actual').value;

        const formData = new FormData();
        formData.append('texto', texto);
        formData.append('descripcion', descripcion);
        formData.append('activo', activo);
        formData.append('mostrar_boton', mostrar_boton);
        if (file) formData.append('imagen', file);
        if (imagenActual) formData.append('imagenActual', imagenActual);

        const url = id ? `/api/admin/banners/${id}` : '/api/admin/banners';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('thecream_admin_token')}` },
                body: formData
            });

            if (res.ok) {
                mostrarAlertaBonita('Banner guardado correctamente', 'success');
                cerrarModalBanner();
                cargarBannersAdmin();
            } else {
                mostrarAlertaBonita('Error al guardar banner', 'error');
            }
        } catch (err) {
            console.error(err);
            mostrarAlertaBonita('Error de conexión', 'error');
        }
    });
}

