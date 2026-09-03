export type MetrixInstanceStatus = 'ACTIVE' | 'SUSPENDED';

export interface MetrixInstance {
  id:                   string;
  databaseName:         string;
  empresaNombre:        string;
  licensePackageId:     string;
  licensePackageNombre: string;
  orderId:              string;
  adminNumeroUsuario:   string;
  adminNombre:          string;
  contactoEmail:        string;
  status:               MetrixInstanceStatus;
  createdAt:            string;
  maxUsuarios?:         number | null;
  maxSucursales?:       number | null;
  sucursalesContratadas?: number | null;
  featureCodes?:        string[];
  paidAt?:              string | null;
}
