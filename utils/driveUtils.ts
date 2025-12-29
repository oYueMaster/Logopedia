
export function convertDriveLink(url: string): string {
  // Si no es un link de drive, lo devolvemos tal cual
  if (!url.includes('drive.google.com')) return url;

  let fileId = '';
  
  // Caso 1: Enlace de compartir /file/d/ID/view
  const matchD = url.match(/\/file\/d\/([^/]+)/);
  if (matchD) fileId = matchD[1];

  // Caso 2: Enlace con parámetro id=ID
  const matchId = url.match(/[?&]id=([^&]+)/);
  if (matchId) fileId = matchId[1];

  if (fileId) {
    // Formato para visualización directa
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  return url;
}
