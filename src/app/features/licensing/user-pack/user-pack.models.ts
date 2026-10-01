export interface UserPackStatus {
  disponible: boolean;
  motivoNoDisponible?: string | null;
  usuariosPorPaquete: number;
  precio: number;
  moneda: string;
  maxUsuariosPlan?: number | null;
  usuariosExtraVigentes: number;
  maxUsuariosEfectivo?: number | null;
  vigente: boolean;
  vigenteHasta?: string | null;
  vencido: boolean;
  periodoDias: number;
}

export interface UserPackOrder {
  orderId: string;
  usuarios: number;
  monto: number;
  moneda: string;
  paymentStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentProvider?: 'SIMULATED' | 'MERCADOPAGO' | null;
  preferenceId?: string | null;
  paidAt?: string | null;
  periodoInicio?: string | null;
  periodoFin?: string | null;
}
