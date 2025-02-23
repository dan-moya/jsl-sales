import { supabase } from './supabase';

let isStorageInitialized = false;

export async function setupStorage() {
  // Evitar inicialización múltiple
  if (isStorageInitialized) {
    return;
  }

  try {
    // Verificar si el bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error al listar buckets:', listError);
      return;
    }

    const productsBucket = buckets?.find(b => b.name === 'products');
    
    if (!productsBucket) {
      // Solo intentar crear el bucket si no existe
      const { error: createError } = await supabase.storage.createBucket('products', {
        public: true,
        fileSizeLimit: 5242880, // 5MB limit
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'image/svg+xml'
        ]
      });
      
      if (createError) {
        // Si el error es de permisos, lo ignoramos ya que el bucket probablemente ya existe
        if (createError.message.includes('row-level security')) {
          console.log('El bucket ya existe o no tenemos permisos para crearlo');
        } else {
          console.error('Error al crear el bucket:', createError);
        }
      }
    }

    // Marcar como inicializado
    isStorageInitialized = true;
    console.log('Storage configurado correctamente');
  } catch (error) {
    console.error('Error al configurar storage:', error);
  }
}