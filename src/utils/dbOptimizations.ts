import { supabase } from '../lib/supabase';

// Función para limpiar datos antiguos manteniendo historial
export async function cleanupOldData() {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Limpiar solo datos no esenciales
    await supabase
      .from('auth.audit_log_entries')
      .delete()
      .lt('created_at', threeMonthsAgo.toISOString());

    await supabase
      .from('auth.refresh_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Mantener particiones actualizadas
    await supabase.rpc('maintain_partitions');

    console.log('Mantenimiento de base de datos completado');
  } catch (error) {
    console.error('Error en mantenimiento:', error);
  }
}

// Función para refrescar vistas materializadas
export async function refreshMaterializedViews() {
  try {
    // Refrescar vista diaria
    await supabase.rpc('refresh_sales_summary');
    
    // Refrescar vista histórica anual
    const { error } = await supabase.rpc('refresh_materialized_view', {
      view_name: 'history.sales_yearly_summary'
    });
    
    if (error) throw error;
    console.log('Vistas materializadas actualizadas');
  } catch (error) {
    console.error('Error actualizando vistas:', error);
  }
}

// Programar mantenimiento
export function scheduleCleanup() {
  // Ejecutar limpieza cada semana
  setInterval(cleanupOldData, 7 * 24 * 60 * 60 * 1000);
  
  // Refrescar vistas materializadas cada día a las 3am
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() === 0) {
      refreshMaterializedViews();
    }
  }, 60 * 60 * 1000);
}