import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import type { Producto, Movimiento, TipoMovimiento } from "./interfaces";

/* =========================================================
   1. ESTADO
   ========================================================= */

let productos: Producto[] = [];
let movimientos: Movimiento[] = [];
let siguienteIdMovimiento: number = 1;

/* =========================================================
   2. CARGA DEL JSON
   ========================================================= */

function cargarProductos(): void {
  const ruta = path.join(process.cwd(), "consola", "productos.json");
  const texto = fs.readFileSync(ruta, "utf-8");
  productos = JSON.parse(texto) as Producto[];
}

/* =========================================================
   3. UTILIDADES
   ========================================================= */

function formatearPrecio(valor: number): string {
  return "$" + valor.toFixed(2);
}

function fechaActual(): string {
  return new Date().toLocaleString("es-SV");
}

function pausar(rl: readline.Interface): Promise<void> {
  return new Promise((resolve) => {
    rl.question("\nPresiona Enter para continuar...", () => resolve());
  });
}

function preguntar(rl: readline.Interface, texto: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => resolve(respuesta.trim()));
  });
}

/* =========================================================
   4. VISTAS
   ========================================================= */

function mostrarCatalogo(): void {
  console.log("\n--- CATÁLOGO ---");
  console.log("ID  Nombre                      Categoría         Precio   Stock");
  console.log("------------------------------------------------------------------");
  for (const p of productos) {
    const nombre = p.nombre.padEnd(27, " ");
    const categoria = p.categoria.padEnd(17, " ");
    const precio = formatearPrecio(p.precio).padStart(7, " ");
    const stock = String(p.stock).padStart(5, " ");
    console.log(`${String(p.id).padStart(2, " ")}  ${nombre} ${categoria} ${precio} ${stock}`);
  }
}

function mostrarHistorial(): void {
  console.log("\n--- HISTORIAL DE MOVIMIENTOS ---");
  if (movimientos.length === 0) {
    console.log("Sin movimientos registrados.");
    return;
  }
  console.log("ID  Tipo         Producto                    Cant  Precio   Importe  Fecha");
  console.log("------------------------------------------------------------------------------");
  for (const m of movimientos) {
    const tipo = (m.tipo === "venta" ? "Venta" : "Reposición").padEnd(12, " ");
    const nombre = m.nombreProducto.padEnd(27, " ");
    console.log(
      `${String(m.id).padStart(2, " ")}  ${tipo} ${nombre} ${String(m.cantidad).padStart(4, " ")}  ${formatearPrecio(m.precioUnitario).padStart(7, " ")}  ${formatearPrecio(m.importe).padStart(7, " ")}  ${m.fecha}`
    );
  }
}

function mostrarResumen(): void {
  let ingresos = 0;
  let unidades = 0;
  for (const m of movimientos) {
    if (m.tipo === "venta") {
      ingresos += m.importe;
      unidades += m.cantidad;
    }
  }
  console.log("\n--- RESUMEN ---");
  console.log("Ingresos totales: " + formatearPrecio(ingresos));
  console.log("Unidades vendidas: " + unidades);
}

/* =========================================================
   5. OPERACIONES
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
    precioUnitario: tipo === "venta" ? precioUnitario : 0,
    importe: tipo === "venta" ? precioUnitario * cantidad : 0,
    fecha: fechaActual(),
  };
  movimientos.push(movimiento);
  siguienteIdMovimiento++;
}

async function comprar(rl: readline.Interface): Promise<void> {
  mostrarCatalogo();
  const idTexto = await preguntar(rl, "\nID del producto a comprar (0 para cancelar): ");
  const id = Number(idTexto);
  if (id === 0) {
    console.log("Compra cancelada.");
    return;
  }
  const producto = productos.find((p) => p.id === id);
  if (!producto) {
    console.log("Producto no encontrado.");
    return;
  }

  const cantTexto = await preguntar(rl, "Cantidad: ");
  const cantidad = Number(cantTexto);

  if (cantTexto === "" || isNaN(cantidad)) {
    console.log("Error: debes indicar una cantidad.");
    return;
  }
  if (!Number.isInteger(cantidad)) {
    console.log("Error: la cantidad debe ser un número entero.");
    return;
  }
  if (cantidad <= 0) {
    console.log("Error: la cantidad debe ser mayor que cero.");
    return;
  }
  if (cantidad > producto.stock) {
    console.log("Error: no hay existencias suficientes. Disponible: " + producto.stock + ".");
    return;
  }

  const precioActual = producto.precio;
  producto.stock = producto.stock - cantidad;
  registrarMovimiento("venta", producto, cantidad, precioActual);
  console.log(
    "Compra realizada: " + cantidad + " x " + producto.nombre +
      " = " + formatearPrecio(precioActual * cantidad)
  );
}

async function reponer(rl: readline.Interface): Promise<void> {
  mostrarCatalogo();
  const idTexto = await preguntar(rl, "\nID del producto a reponer (0 para cancelar): ");
  const id = Number(idTexto);
  if (id === 0) {
    console.log("Reposición cancelada.");
    return;
  }
  const producto = productos.find((p) => p.id === id);
  if (!producto) {
    console.log("Producto no encontrado.");
    return;
  }

  const cantTexto = await preguntar(rl, "Unidades a agregar: ");
  const cantidad = Number(cantTexto);

  if (cantTexto === "" || isNaN(cantidad)) {
    console.log("Error: debes indicar una cantidad.");
    return;
  }
  if (!Number.isInteger(cantidad)) {
    console.log("Error: la cantidad debe ser un número entero.");
    return;
  }
  if (cantidad <= 0) {
    console.log("Error: la cantidad debe ser mayor que cero.");
    return;
  }

  producto.stock = producto.stock + cantidad;
  registrarMovimiento("reposicion", producto, cantidad, 0);
  console.log("Reposición realizada: +" + cantidad + " unidades de " + producto.nombre + ".");
}

/* =========================================================
   6. MENÚ PRINCIPAL
   ========================================================= */

async function menu(rl: readline.Interface): Promise<void> {
  let salir = false;
  while (!salir) {
    console.log("\n=== SNACKUNIVO — VERSIÓN CONSOLA ===");
    console.log("1. Ver catálogo");
    console.log("2. Comprar producto");
    console.log("3. Reponer producto");
    console.log("4. Ver historial");
    console.log("5. Ver resumen");
    console.log("0. Salir");

    const opcion = await preguntar(rl, "Elige una opción: ");

    switch (opcion) {
      case "1":
        mostrarCatalogo();
        await pausar(rl);
        break;
      case "2":
        await comprar(rl);
        await pausar(rl);
        break;
      case "3":
        await reponer(rl);
        await pausar(rl);
        break;
      case "4":
        mostrarHistorial();
        await pausar(rl);
        break;
      case "5":
        mostrarResumen();
        await pausar(rl);
        break;
      case "0":
        salir = true;
        console.log("Saliendo de SnackUNIVO...");
        break;
      default:
        console.log("Opción no válida. Intenta de nuevo.");
    }
  }
  rl.close();
}

/* =========================================================
   7. INICIO
   ========================================================= */

async function iniciar(): Promise<void> {
  try {
    cargarProductos();
  } catch (error) {
    console.error("No se pudo cargar consola/productos.json:", error);
    return;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await menu(rl);
}

iniciar();