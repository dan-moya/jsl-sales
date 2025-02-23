import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useProductsStore } from './products';
import { db, SaleReminder } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

type Product = Database['public']['Tables']['products']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];

type SaleWithItems = Sale & {
	items: Array<SaleItem & { product: Product }>;
};

type PendingOperation = {
	id: string;
	type: 'create' | 'update' | 'delete' | 'stock_update';
	table: string;
	data: any;
	priority: number;
	timestamp: number;
	parentId?: string;
	groupId?: string;
	status: 'pending' | 'processing' | 'error';
	error?: string;
	retryCount: number;
};

/* type SaleStats = {
	totalAmount: number;
	netProfit: number;
	count: number;
  }; */

  type ProductSaleStats = {
	productId: string;
	productName: string;
	totalQuantity: number;
  };

interface SalesState {
	isOnline: boolean;
	isLoading: boolean;
	sales: SaleWithItems[];
	todaySales: number;
	yesterdaySales: number;
	monthSales: number;
	totalSales: number;
	todaySalesList: SaleWithItems[];
	yesterdaySalesList: SaleWithItems[];
	monthSalesList: SaleWithItems[];
	allSales: SaleWithItems[];
	weekSales: number;
	weekSalesList: SaleWithItems[];
	netProfits: {
	  today: number;
	  yesterday: number;
	  week: number;
	  month: number;
	  total: number;
	};
	productStats: {
		totalStock: number;
		uniqueProducts: number;
		mostSoldToday: ProductSaleStats | null;
		mostSoldThisWeek: ProductSaleStats | null;
		mostSoldThisMonth: ProductSaleStats | null;
		mostSoldOverall: ProductSaleStats | null;
	};
	reminders: SaleReminder[]; // Añadir esto
	setIsOnline: (status: boolean) => void;
	loadSales: () => Promise<void>;
	createSale: (
	  items: Array<{ productId: string; quantity: number; price: number }>,
	  paymentMethod: 'QR' | 'EFECTIVO'
	) => Promise<void>;
	deleteSale: (saleId: string) => Promise<void>;
	updateSale: (updatedSale: SaleWithItems) => Promise<void>;
	syncPendingSales: () => Promise<void>;
	addReminder: (saleId: string, note?: string) => Promise<void>;
	completeReminder: (reminderId: string) => Promise<void>;
	loadReminders: () => Promise<void>;
  }

export const useSalesStore = create<SalesState>((set, get) => ({
	isLoading: false,
	sales: [],
	todaySales: 0,
	yesterdaySales: 0,
	monthSales: 0,
	totalSales: 0,
	todaySalesList: [],
	yesterdaySalesList: [],
	monthSalesList: [],
	allSales: [],
	weekSales: 0,
	weekSalesList: [],
	netProfits: {
		today: 0,
		yesterday: 0,
		week: 0,
		month: 0,
		total: 0
	},
	productStats: {
		totalStock: 0,
		uniqueProducts: 0,
		mostSoldToday: null,
		mostSoldThisWeek: null,
		mostSoldThisMonth: null,
		mostSoldOverall: null,
	},
	isOnline: navigator.onLine,
	reminders: [],

	addReminder: async (saleId: string, note?: string) => {
		const reminder: SaleReminder = {
		  id: uuidv4(),
		  saleId,
		  note,
		  createdAt: new Date().toISOString(),
		  status: 'pending'
		};
	
		await db.saleReminders.add(reminder);
		set(state => ({
			...state, //nuevo
		  reminders: [...state.reminders, reminder]
		}));
	  },
	
	  completeReminder: async (reminderId: string) => {
		await db.saleReminders.update(reminderId, { status: 'completed' });
		set(state => ({
			...state, //nuevo
		  reminders: state.reminders.map(r => 
			r.id === reminderId ? { ...r, status: 'completed' } : r
		  )
		}));
	  },
	
	/* loadReminders: async () => {
		const reminders = await db.saleReminders.toArray();
		set({ reminders });
	}, */

	loadReminders: async () => {
		const reminders = await db.saleReminders.toArray();
		set((state) => ({
			...state,
			reminders
		}));
	},

	setIsOnline: (online) =>
		set({
			isOnline: online,
		}),

	loadSales: async () => {
		set({ isLoading: true });
		try {
			let salesData: SaleWithItems[] = [];

			if (get().isOnline) {
				const { data: sales, error: salesError } = await supabase
					.from('sales')
					.select('*')
					.order('date', { ascending: false });

				if (salesError) throw salesError;

				if (sales) {
					const salesWithItems = await Promise.all(
						sales.map(async (sale) => {
							const { data: saleItems, error: itemsError } = await supabase
								.from('sale_items')
								.select('*, product:products(*)')
								.eq('sale_id', sale.id);

							if (itemsError) throw itemsError;

							return {
								...sale,
								items: saleItems || [],
							};
						})
					);

					await db.sales.clear();
					await db.saleItems.clear();

					for (const sale of salesWithItems) {
						await db.sales.put({
							id: sale.id,
							date: sale.date,
							payment_method: sale.payment_method,
							total: sale.total,
							created_at: sale.created_at,
						});

						for (const item of sale.items) {
							await db.saleItems.put({
								...item,
								product: item.product,
							});
						}
					}

					salesData = salesWithItems;
				}
			}

			const offlineSales = await db.sales.toArray();
			const salesWithItems = await Promise.all(
				offlineSales.map(async (sale) => {
					const items = await db.saleItems.where('sale_id').equals(sale.id).toArray();

					const itemsWithProducts = await Promise.all(
						items.map(async (item) => {
							const product = await db.products.get(item.product_id);
							if (!product) {
								console.warn(`Product not found locally for item with ID ${item.product_id}`);
								return null;
							}
							return { ...item, product };
						})
					);

					return {
						...sale,
						items: itemsWithProducts.filter(
							(item): item is SaleItem & { product: Product } => item !== null
						),
					};
				})
			);

			const allSales = get().isOnline
				? [
						...salesData,
						...salesWithItems.filter((sale) => {
							const exists = salesData.some((onlineSale) => onlineSale.id === sale.id);
							return !exists && sale.items.length > 0;
						}),
				  ]
				: salesWithItems;

			await processSalesData(allSales, set);
		} catch (error) {
			console.error('Error al cargar las ventas:', error);
		} finally {
			set({ isLoading: false });
		}
	},

	createSale: async (items, paymentMethod) => {
		const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
		const saleId = uuidv4();
		const now = new Date().toISOString();
		const groupId = uuidv4(); // Generar un groupId único para todas las operaciones relacionadas

		const newSale = {
			id: saleId,
			date: now,
			payment_method: paymentMethod,
			total,
			created_at: now,
		};

		const saleItems = items.map((item) => ({
			id: uuidv4(),
			sale_id: saleId,
			product_id: item.productId,
			quantity: item.quantity,
			price: item.price,
			created_at: now,
		}));

		try {
			await db.sales.add(newSale);
			console.log('[OFFLINE] Venta guardada:', saleId);

			for (const item of saleItems) {
				const product = await db.products.get(item.product_id);
				if (product) {
					await db.saleItems.add({
						...item,
						product,
					});

					const newStock = Math.max(0, product.stock - item.quantity);
					const newPendingChanges = (product.pending_stock_changes || 0) + item.quantity;

					await db.products.update(item.product_id, {
						stock: newStock,
						pending_stock_changes: newPendingChanges,
					});
				}
			}

			if (get().isOnline) {
				const { error: saleError } = await supabase.from('sales').insert(newSale);

				if (saleError) {
					throw saleError;
				}

				const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);

				if (itemsError) {
					await supabase.from('sales').delete().eq('id', saleId);
					throw itemsError;
				}

				for (const item of saleItems) {
					const { data: product } = await supabase
						.from('products')
						.select('stock')
						.eq('id', item.product_id)
						.single();

					if (product) {
						const newStock = Math.max(0, product.stock - item.quantity);
						await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
					}
				}
			} else {
				// Crear la venta con alta prioridad
				await db.addPendingOperation('create', 'sales', newSale, 3, undefined, groupId);
				
				// Crear los items con prioridad menor y vinculados a la venta
				for (const item of saleItems) {
					await db.addPendingOperation('create', 'sale_items', item, 2, saleId, groupId);
				}
				console.log('[OFFLINE] Operaciones pendientes guardadas');
			}

			await get().loadSales();
			await useProductsStore.getState().loadProducts();
		} catch (error) {
			console.error('[ERROR] Error creating sale:', error);
			throw error;
		}
	},

	deleteSale: async (saleId: string) => {
		try {
			const saleItems = await db.saleItems.where('sale_id').equals(saleId).toArray();
			const groupId = uuidv4(); // Generar un groupId único para todas las operaciones relacionadas

			if (get().isOnline) {
				// Primero actualizar el stock
				for (const item of saleItems) {
					const { data: product } = await supabase
						.from('products')
						.select('stock')
						.eq('id', item.product_id)
						.single();

					if (product) {
						const newStock = product.stock + item.quantity;
						const { error: updateError } = await supabase
							.from('products')
							.update({ stock: newStock })
							.eq('id', item.product_id);

						if (updateError) throw updateError;
					}
				}

				// Luego eliminar los items
				const { error: itemsError } = await supabase.from('sale_items').delete().eq('sale_id', saleId);
				if (itemsError) throw itemsError;

				// Finalmente eliminar la venta
				const { error: saleError } = await supabase.from('sales').delete().eq('id', saleId);
				if (saleError) throw saleError;
			} else {
				// Actualizar stock local
				for (const item of saleItems) {
					const product = await db.products.get(item.product_id);
					if (product) {
						const newStock = product.stock + item.quantity;
						const newPendingChanges = (product.pending_stock_changes || 0) - item.quantity;

						await db.products.update(item.product_id, {
							stock: newStock,
							pending_stock_changes: newPendingChanges,
						});
					}
				}

				// Primero eliminar los items con alta prioridad
				for (const item of saleItems) {
					await db.addPendingOperation('delete', 'sale_items', { id: item.id }, 3, undefined, groupId);
				}
				
				// Luego eliminar la venta con menor prioridad
				await db.addPendingOperation('delete', 'sales', { id: saleId }, 2, undefined, groupId);
			}

			// Actualizar estado local
			await db.saleItems.where('sale_id').equals(saleId).delete();
			await db.sales.delete(saleId);

			set((state) => ({
				sales: state.sales.filter((sale) => sale.id !== saleId),
			}));

			await get().loadSales();
			await useProductsStore.getState().loadProducts();
		} catch (error) {
			console.error('Error deleting sale:', error);
			throw error;
		}
	},

	updateSale: async (updatedSale: SaleWithItems) => {
		try {
			console.log('[UPDATE_SALE] Iniciando actualización de venta:', {
				id: updatedSale.id,
				items: updatedSale.items.length,
				isOnline: get().isOnline,
			});

			const originalSale = get().sales.find((s) => s.id === updatedSale.id);
			if (!originalSale) {
				throw new Error('Venta no encontrada');
			}

			const groupId = uuidv4(); // Generar un groupId único para todas las operaciones relacionadas

			// Calcular cambios de stock
			const quantityChanges = new Map<string, number>();
			originalSale.items.forEach((item) => {
				const current = quantityChanges.get(item.product.id) || 0;
				quantityChanges.set(item.product.id, current + item.quantity);
			});

			updatedSale.items.forEach((item) => {
				const current = quantityChanges.get(item.product.id) || 0;
				quantityChanges.set(item.product.id, current - item.quantity);
			});

			if (get().isOnline) {
				// 1. Eliminar items antiguos
				const { error: deleteError } = await supabase
					.from('sale_items')
					.delete()
					.eq('sale_id', updatedSale.id);

				if (deleteError) throw deleteError;

				// 2. Actualizar la venta principal
				const { error: saleError } = await supabase
					.from('sales')
					.update({
						payment_method: updatedSale.payment_method,
						total: updatedSale.total,
					})
					.eq('id', updatedSale.id);

				if (saleError) throw saleError;

				// 3. Crear nuevos items
				const { error: itemsError } = await supabase.from('sale_items').insert(
					updatedSale.items.map(item => ({
						id: item.id,
						sale_id: updatedSale.id,
						product_id: item.product.id,
						quantity: item.quantity,
						price: item.price,
						created_at: new Date().toISOString()
					}))
				);

				if (itemsError) throw itemsError;

				// 4. Actualizar stock
				for (const [productId, stockChange] of quantityChanges) {
					const { data: product } = await supabase
						.from('products')
						.select('stock')
						.eq('id', productId)
						.single();

					if (product) {
						const newStock = Math.max(0, product.stock + stockChange);
						await supabase
							.from('products')
							.update({ stock: newStock })
							.eq('id', productId);
					}
				}
			} else {
				// 1. Obtener items originales
				const originalItems = await db.saleItems.where('sale_id').equals(updatedSale.id).toArray();

				// 2. Eliminar items antiguos (prioridad más alta)
				for (const item of originalItems) {
					await db.addPendingOperation(
						'delete',
						'sale_items',
						{ id: item.id },
						4, // Prioridad más alta
						updatedSale.id,
						groupId
					);
				}

				// 3. Actualizar la venta principal (prioridad media)
				await db.addPendingOperation(
					'update',
					'sales',
					{
						id: updatedSale.id,
						payment_method: updatedSale.payment_method,
						total: updatedSale.total,
						date: updatedSale.date,
						created_at: updatedSale.created_at
					},
					3,
					undefined,
					groupId
				);

				// 4. Crear nuevos items (prioridad más baja)
				for (const item of updatedSale.items) {
					const newItemData = {
						id: uuidv4(),
						sale_id: updatedSale.id,
						product_id: item.product.id,
						quantity: item.quantity,
						price: item.price,
						created_at: new Date().toISOString()
					};

					await db.addPendingOperation(
						'create',
						'sale_items',
						newItemData,
						2,
						updatedSale.id,
						groupId
					);
				}

				// 5. Actualizar stock local
				for (const [productId, stockChange] of quantityChanges) {
					const product = await db.products.get(productId);
					if (product) {
						const newStock = Math.max(0, product.stock + stockChange);
						const pendingChange = (product.pending_stock_changes || 0) - stockChange;

						await db.products.update(productId, {
							stock: newStock,
							pending_stock_changes: pendingChange,
						});
					}
				}

				// 6. Actualizar estado local
				await db.sales.put({
					id: updatedSale.id,
					date: updatedSale.date,
					payment_method: updatedSale.payment_method,
					total: updatedSale.total,
					created_at: updatedSale.created_at
				});

				// Actualizar items localmente
				await db.saleItems.where('sale_id').equals(updatedSale.id).delete();
				for (const item of updatedSale.items) {
					await db.saleItems.put({
						...item,
						product: item.product
					});
				}
			}

			set((state) => ({
				sales: state.sales.map((sale) => (sale.id === updatedSale.id ? updatedSale : sale)),
			}));

			await get().loadSales();
			await useProductsStore.getState().loadProducts();

		} catch (error) {
			console.error('[UPDATE_SALE] Error al actualizar venta:', error);
			throw error;
		}
	},

	syncPendingSales: async () => {
		if (!get().isOnline) {
			console.log('[SYNC] No hay conexión, abortando sincronización');
			return;
		}

		try {
			// Primero sincronizar los productos
			console.log('[SYNC] Sincronizando productos primero...');
			await useProductsStore.getState().syncPendingOperations();

			console.log('[SYNC] Iniciando sincronización de ventas...');
			const pendingOperations = await db.getPendingOperations();

			// Agrupar operaciones por groupId
			const groupedOps = new Map<string, PendingOperation[]>();
			pendingOperations.forEach(op => {
				const group = op.groupId || op.id;
				if (!groupedOps.has(group)) {
					groupedOps.set(group, []);
				}
				groupedOps.get(group)!.push(op);
			});

			// Procesar cada grupo de operaciones
			for (const [groupId, operations] of groupedOps) {
				try {
					console.log(`[SYNC] Procesando grupo ${groupId} con ${operations.length} operaciones`);

					// Verificar si hay operaciones de productos pendientes
					const hasProductOps = operations.some(op => op.table === 'products');
					if (hasProductOps) {
						console.log(`[SYNC] Saltando grupo ${groupId} - contiene operaciones de productos`);
						continue;
					}

					// Ordenar operaciones por prioridad (mayor a menor)
					const sortedOps = operations.sort((a, b) => b.priority - a.priority);

					for (const op of sortedOps) {
						try {
							console.log(`[SYNC] Ejecutando operación:`, {
								id: op.id,
								type: op.type,
								table: op.table,
								priority: op.priority
							});

							// Verificar que el producto existe antes de crear/actualizar sale_items
							if (op.table === 'sale_items' && op.type === 'create') {
								const { data: product } = await supabase
									.from('products')
									.select('id')
									.eq('id', op.data.product_id)
									.single();

								if (!product) {
									console.log(`[SYNC] Producto ${op.data.product_id} no encontrado, esperando sincronización`);
									continue;
								}
							}

							switch (op.type) {
								case 'delete':
									const { error: deleteError } = await supabase
										.from(op.table)
										.delete()
										.eq('id', op.data.id);
									if (deleteError) throw deleteError;
									break;

								case 'update':
									const { error: updateError } = await supabase
										.from(op.table)
										.update(op.data)
										.eq('id', op.data.id);
									if (updateError) throw updateError;
									break;

								case 'create':
									const { error: createError } = await supabase
										.from(op.table)
										.insert(op.data);
									if (createError) throw createError;
									break;
							}

							// Marcar operación como completada
							await db.pendingOperations.delete(op.id);
							console.log(`[SYNC] Operación completada:`, op.id);

						} catch (error: any) {
							console.error(`[SYNC] Error en operación ${op.id}:`, error);
							
							// Si el error es de clave foránea, esperar y continuar
							if (error.code === '23503') {
								console.log(`[SYNC] Error de clave foránea, esperando dependencias`);
								continue;
							}
							
							await db.updateOperationStatus(op.id, 'error', error.message);
							// Continuar con la siguiente operación
						}
					}
				} catch (error) {
					console.error(`[SYNC] Error en grupo ${groupId}:`, error);
				}
			}
			
			// Recargar datos
			await get().loadSales();
			console.log('[SYNC] Sincronización completada exitosamente');

		} catch (error) {
			console.error('[SYNC] Error en sincronización:', error);
			throw error;
		}
	},
}));

async function processSalesData(sales: SaleWithItems[], set: (state: Partial<SalesState>) => void) {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	
	// Calcular inicio de semana (Lunes)
	const weekStart = new Date(today);
	weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
	weekStart.setHours(0, 0, 0, 0);
	
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
	// Filtrar ventas por período
	const todaySales = sales.filter((sale) => new Date(sale.date) >= today);
	const yesterdaySales = sales.filter((sale) => new Date(sale.date) >= yesterday && new Date(sale.date) < today);
	const weekSales = sales.filter((sale) => new Date(sale.date) >= weekStart);
	const monthSales = sales.filter((sale) => new Date(sale.date) >= firstDayOfMonth);
  
	// Calcular ganancias netas
	const calculateNetProfit = (salesList: SaleWithItems[]): number => {
	  return salesList.reduce((total, sale) => {
		const saleProfit = sale.items.reduce((profit, item) => {
		  const costPrice = item.product.purchase_price || 0;
		  return profit + (item.price - costPrice) * item.quantity;
		}, 0);
		return total + saleProfit;
	  }, 0);
	};
  
	// Función optimizada para calcular estadísticas de productos
	const calculateProductStats = (salesList: SaleWithItems[]): Map<string, ProductSaleStats> => {
	  const stats = new Map<string, ProductSaleStats>();
	  
	  salesList.forEach(sale => {
		sale.items.forEach(item => {
		  const existing = stats.get(item.product.id);
		  if (existing) {
			existing.totalQuantity += item.quantity;
		  } else {
			stats.set(item.product.id, {
			  productId: item.product.id,
			  productName: item.product.name,
			  totalQuantity: item.quantity
			});
		  }
		});
	  });
	  
	  return stats;
	};
  
	// Calcular estadísticas de productos por período
	const todayStats = calculateProductStats(todaySales);
	const weekStats = calculateProductStats(weekSales);
	const monthStats = calculateProductStats(monthSales);
	const overallStats = calculateProductStats(sales);
  
	// Función para obtener el producto más vendido
	const getMostSold = (stats: Map<string, ProductSaleStats>): ProductSaleStats | null => {
	  if (stats.size === 0) return null;
	  return Array.from(stats.values()).reduce<ProductSaleStats>((max, current) => 
		current.totalQuantity > max.totalQuantity ? current : max
	  , Array.from(stats.values())[0]);
	};
  
	// Calcular total de stock y productos únicos
	const products = await db.products.toArray();
	const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
	const uniqueProducts = products.filter(p => !p.name.includes('(eliminado)')).length;
  
	set({
	  sales,
	  todaySales: todaySales.reduce((sum, sale) => sum + sale.total, 0),
	  yesterdaySales: yesterdaySales.reduce((sum, sale) => sum + sale.total, 0),
	  weekSales: weekSales.reduce((sum, sale) => sum + sale.total, 0),
	  monthSales: monthSales.reduce((sum, sale) => sum + sale.total, 0),
	  totalSales: sales.reduce((sum, sale) => sum + sale.total, 0),
	  todaySalesList: todaySales,
	  yesterdaySalesList: yesterdaySales,
	  weekSalesList: weekSales,
	  monthSalesList: monthSales,
	  allSales: sales,
	  netProfits: {
		today: calculateNetProfit(todaySales),
		yesterday: calculateNetProfit(yesterdaySales),
		week: calculateNetProfit(weekSales),
		month: calculateNetProfit(monthSales),
		total: calculateNetProfit(sales)
	  },
	  productStats: {
		totalStock,
		uniqueProducts,
		mostSoldToday: getMostSold(todayStats),
		mostSoldThisWeek: getMostSold(weekStats),
		mostSoldThisMonth: getMostSold(monthStats),
		mostSoldOverall: getMostSold(overallStats)
	  }
	});
  }