export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
}

export type TipoMovimiento = "venta" | "reposicion";

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
  fecha: string;
}