export type MetrixInstanceStatus = 'ACTIVE' | 'SUSPENDED';

export interface MetrixInstance {
  id:                   string;
  databaseName:         string;
  codigoEmpresa?:       string | null;
  empresaNombre:        string;
  licensePackageId:     string;
  licensePackageNombre: string;
  pricingModel?:        'PER_BRANCH' | 'FLAT_MONTHLY' | 'PER_USER' | null;
  orderId:              string;
  adminNumeroUsuario:   string;
  adminNombre:          string;
  contactoEmail:        string;
  status:               MetrixInstanceStatus;
  createdAt:            string;
  maxUsuarios?:         number | null;
  maxSucursales?:       number | null;
  effectiveMaxSucursales?: number | null;
  sucursalesContratadas?: number | null;
  featureCodes?:        string[];
  paidAt?:              string | null;
  onTrial?:             boolean;
  trialEndsAt?:         string | null;
  suspensionReason?:    'MANUAL' | 'TRIAL_EXPIRED' | null;
}

export type PasswordResetStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONSUMED' | 'EXPIRED';

export interface PasswordResetRequest {
  id: string;
  instanceId: string;
  codigoEmpresa: string;
  empresaNombre: string;
  numeroUsuario: string;
  adminNombre: string;
  destinationEmailMasked: string | null;
  status: PasswordResetStatus;
  requestedAt: string;
  expiresAt?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  consumedAt?: string | null;
  rejectReason?: string | null;
  resetUrl?: string | null;
  emailSent?: boolean | null;
}
