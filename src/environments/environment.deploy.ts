/**
 * Build de ensayo. Mismas optimizaciones que producción, pero habla con el
 * backend local del ambiente deploy (puerto 8081), nunca con Cloud Run.
 */
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8081/api/v1',
  showLocalCredentials: false,
  localCredentials: [] as {
    rol: string;
    codigoEmpresa: string;
    numeroUsuario: string;
    password: string;
  }[],
};
