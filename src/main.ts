import './style.css';
import type { Producto, Movimiento, TipoMovimiento } from './interfaces';

/* =========================================================
   1. ESTADO EN MEMORIA
   ========================================================= */

let productos: Producto[] = [];
let movimientos: Movimiento[] = [];
let siguienteIdMovimiento: number = 1;

/* =========================================================
   2. CARGA INICIAL DEL JSON
   ========================================================= */

async function cargarProductos(): Promise<void> {
  const respuesta = await fetch('./productos.json');
  const datos = (await respuesta.json()) as Producto[];
  productos = datos;
}

/* =========================================================
   3. UTILIDADES
   ========================================================= */

function formatearPrecio(valor: number): string {
  return '$' + valor.toFixed(2);
}

function fechaActual(): string {
  return new Date().toLocaleString('es-SV');
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error'): void {
  const contenedor = document.querySelector<HTMLDivElement>('#mensaje');
  if (!contenedor) return;
  contenedor.textContent = texto;
  contenedor.className = 'mensaje ' + tipo;
}

/* =========================================================
   4. RENDERIZADO DEL CATÁLOGO
   ========================================================= */

function renderCatalogo(): void {
  const contenedor = document.querySelector<HTMLDivElement>('#catalogo');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const buscador = document.querySelector<HTMLInputElement>('#buscador');
  const filtro = document.querySelector<HTMLSelectElement>('#filtro-estado');
  const texto = buscador ? buscador.value.toLowerCase() : '';
  const estado = filtro ? filtro.value : 'todos';

  for (const producto of productos) {
    if (texto !== '' && !producto.nombre.toLowerCase().includes(texto)) continue;
    if (estado === 'disponibles' && producto.stock === 0) continue;
    if (estado === 'agotados' && producto.stock > 0) continue;

    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-producto';

    const claseStock = producto.stock === 0 ? 'stock-agotado' : 'stock-ok';
    const textoStock = producto.stock === 0 ? 'Agotado' : 'Stock: ' + producto.stock;

    tarjeta.innerHTML = `
      <h3>${producto.nombre}</h3>
      <p class="categoria">${producto.categoria}</p>
      <p class="precio">${formatearPrecio(producto.precio)}</p>
      <p class="${claseStock}">${textoStock}</p>
    `;

    contenedor.appendChild(tarjeta);
  }

  if (contenedor.children.length === 0) {
    const vacio = document.createElement('p');
    vacio.textContent = 'No se encontraron productos.';
    vacio.className = 'sin-resultados';
    contenedor.appendChild(vacio);
  }
}

/* =========================================================
   5. RENDERIZADO DE SELECTS
   ========================================================= */

function renderSelects(): void {
  const selectCompra = document.querySelector<HTMLSelectElement>('#select-compra');
  const selectRepo = document.querySelector<HTMLSelectElement>('#select-reposicion');
  if (!selectCompra || !selectRepo) return;

  selectCompra.innerHTML = '';
  selectRepo.innerHTML = '';

  for (const producto of productos) {
    const opcionCompra = document.createElement('option');
    opcionCompra.value = String(producto.id);
    opcionCompra.textContent = producto.nombre + ' (' + formatearPrecio(producto.precio) + ')';
    selectCompra.appendChild(opcionCompra);

    const opcionRepo = document.createElement('option');
    opcionRepo.value = String(producto.id);
    opcionRepo.textContent = producto.nombre + ' — stock: ' + producto.stock;
    selectRepo.appendChild(opcionRepo);
  }
}

/* =========================================================
   6. RENDERIZADO DEL HISTORIAL
   ========================================================= */

function renderHistorial(): void {
  const cuerpo = document.querySelector<HTMLTableSectionElement>('#cuerpo-historial');
  if (!cuerpo) return;
  cuerpo.innerHTML = '';

  const filtro = document.querySelector<HTMLSelectElement>('#filtro-movimiento');
  const tipo = filtro ? filtro.value : 'todos';

  for (const mov of movimientos) {
    if (tipo !== 'todos' && mov.tipo !== tipo) continue;

    const fila = cuerpo.insertRow();
    fila.insertCell().textContent = String(mov.id);
    fila.insertCell().textContent = mov.tipo === 'venta' ? 'Venta' : 'Reposición';
    fila.insertCell().textContent = mov.nombreProducto;
    fila.insertCell().textContent = String(mov.cantidad);
    fila.insertCell().textContent = formatearPrecio(mov.precioUnitario);
    fila.insertCell().textContent = formatearPrecio(mov.importe);
    fila.insertCell().textContent = mov.fecha;
  }

  if (cuerpo.rows.length === 0) {
    const fila = cuerpo.insertRow();
    const celda = fila.insertCell();
    celda.colSpan = 7;
    celda.textContent = 'Sin movimientos registrados.';
    celda.className = 'sin-resultados';
  }
}

/* =========================================================
   7. RENDERIZADO DEL RESUMEN
   ========================================================= */

function renderResumen(): void {
  const ingresos = document.querySelector<HTMLElement>('#resumen-ingresos');
  const unidades = document.querySelector<HTMLElement>('#resumen-unidades');
  if (!ingresos || !unidades) return;

  let totalIngresos = 0;
  let totalUnidades = 0;

  for (const mov of movimientos) {
    if (mov.tipo === 'venta') {
      totalIngresos += mov.importe;
      totalUnidades += mov.cantidad;
    }
  }

  ingresos.textContent = formatearPrecio(totalIngresos);
  unidades.textContent = String(totalUnidades);
}

/* =========================================================
   8. REGISTRO DE MOVIMIENTOS
   ========================================================= */

function registrarMovimiento(
  tipo: TipoMovimiento,
  producto: Producto,
  cantidad: number,
  precioUnitario: number
): void {
  const movimiento: Movimiento = {
    id: siguienteIdMovimiento,
    tipo: tipo,
    idProducto: producto.id,
    nombreProducto: producto.nombre,
    cantidad: cantidad,
    precioUnitario: tipo === 'venta' ? precioUnitario : 0,
    importe: tipo === 'venta' ? precioUnitario * cantidad : 0,
    fecha: fechaActual()
  };
  movimientos.push(movimiento);
  siguienteIdMovimiento++;
}

/* =========================================================
   9. OPERACIONES: COMPRAR Y REPONER
   ========================================================= */

function comprar(): void {
  const select = document.querySelector<HTMLSelectElement>('#select-compra');
  const input = document.querySelector<HTMLInputElement>('#cantidad-compra');
  if (!select || !input) return;

  const idProducto = Number(select.value);
  const cantidad = Number(input.value);

  if (input.value === '' || isNaN(cantidad)) {
    mostrarMensaje('Debes indicar una cantidad.', 'error');
    return;
  }
  if (!Number.isInteger(cantidad)) {
    mostrarMensaje('La cantidad debe ser un número entero.', 'error');
    return;
  }
  if (cantidad <= 0) {
    mostrarMensaje('La cantidad debe ser mayor que cero.', 'error');
    return;
  }

  const producto = productos.find((p) => p.id === idProducto);
  if (!producto) {
    mostrarMensaje('Producto no encontrado.', 'error');
    return;
  }
  if (cantidad > producto.stock) {
    mostrarMensaje(
      'No hay existencias suficientes. Disponible: ' + producto.stock + '.',
      'error'
    );
    return;
  }

  // Se congela el precio actual en el movimiento (regla de negocio 4)
  const precioActual = producto.precio;
  producto.stock = producto.stock - cantidad;
  registrarMovimiento('venta', producto, cantidad, precioActual);

  input.value = '';
  mostrarMensaje(
    'Compra realizada: ' + cantidad + ' x ' + producto.nombre +
      ' = ' + formatearPrecio(precioActual * cantidad) + '.',
    'ok'
  );

  renderCatalogo();
  renderSelects();
  renderHistorial();
  renderResumen();
}

function reponer(): void {
  const select = document.querySelector<HTMLSelectElement>('#select-reposicion');
  const input = document.querySelector<HTMLInputElement>('#cantidad-reposicion');
  if (!select || !input) return;

  const idProducto = Number(select.value);
  const cantidad = Number(input.value);

  if (input.value === '' || isNaN(cantidad)) {
    mostrarMensaje('Debes indicar una cantidad.', 'error');
    return;
  }
  if (!Number.isInteger(cantidad)) {
    mostrarMensaje('La cantidad debe ser un número entero.', 'error');
    return;
  }
  if (cantidad <= 0) {
    mostrarMensaje('La cantidad debe ser mayor que cero.', 'error');
    return;
  }

  const producto = productos.find((p) => p.id === idProducto);
  if (!producto) {
    mostrarMensaje('Producto no encontrado.', 'error');
    return;
  }

  producto.stock = producto.stock + cantidad;
  registrarMovimiento('reposicion', producto, cantidad, 0);

  input.value = '';
  mostrarMensaje(
    'Reposición realizada: +' + cantidad + ' unidades de ' + producto.nombre + '.',
    'ok'
  );

  renderCatalogo();
  renderSelects();
  renderHistorial();
  renderResumen();
}

/* =========================================================
   10. EVENTOS E INICIALIZACIÓN
   ========================================================= */

function conectarEventos(): void {
  const btnComprar = document.querySelector<HTMLButtonElement>('#btn-comprar');
  const btnReponer = document.querySelector<HTMLButtonElement>('#btn-reponer');
  const buscador = document.querySelector<HTMLInputElement>('#buscador');
  const filtroEstado = document.querySelector<HTMLSelectElement>('#filtro-estado');
  const filtroMov = document.querySelector<HTMLSelectElement>('#filtro-movimiento');

  if (btnComprar) btnComprar.addEventListener('click', comprar);
  if (btnReponer) btnReponer.addEventListener('click', reponer);
  if (buscador) buscador.addEventListener('input', renderCatalogo);
  if (filtroEstado) filtroEstado.addEventListener('change', renderCatalogo);
  if (filtroMov) filtroMov.addEventListener('change', renderHistorial);
}

async function iniciar(): Promise<void> {
  await cargarProductos();
  renderCatalogo();
  renderSelects();
  renderHistorial();
  renderResumen();
  conectarEventos();
}

iniciar();