export async function compressImage(file: File, size = 500): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        // Determinar las dimensiones del recorte cuadrado
        const minDimension = Math.min(img.width, img.height);
        const sourceX = (img.width - minDimension) / 2;
        const sourceY = (img.height - minDimension) / 2;

        // Configurar el canvas para el tamaño deseado
        canvas.width = size;
        canvas.height = size;

        // Dibujar la imagen recortada y redimensionada
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          minDimension,
          minDimension,
          0,
          0,
          size,
          size
        );

        // Convertir a Blob/File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al convertir canvas a blob'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8 // 80% de calidad
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export async function createThumbnail(file: File): Promise<File> {
  return compressImage(file, 150);
}