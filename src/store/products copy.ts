import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { Database } from '../lib/database.types';
import { v4 as uuidv4 } from 'uuid';

type Product = Database['public']['Tables']['products']['Row'] & {
	pending_stock_changes?: number;
};
type Category = Database['public']['Tables']['categories']['Row'];

interface ProductsState {
	products: Product[];
	categories: Category[];
	isLoading: boolean;
	searchTerm: string;
	selectedCategory: string | null;
	isOnline: boolean;
	loadProducts: () => Promise<void>;
	loadCategories: () => Promise<void>;
	createProduct: (
		product: Omit<Product, 'id' | 'created_at'> & { pending_image?: string | null }
	) => Promise<void>;
	updateProduct: (id: string, updates: Partial<Product> & { pending_image?: string | null }) => Promise<void>;
	deleteProduct: (id: string) => Promise<void>;
	hideProduct: (id: string) => Promise<void>;
	unhideProduct: (id: string) => Promise<void>;
	checkHasSales: (id: string) => Promise<boolean>;
	checkCodeExists: (code: string, excludeId?: string) => Promise<boolean>;
	setSearchTerm: (term: string) => void;
	setSelectedCategory: (categoryId: string | null) => void;
	setIsOnline: (online: boolean) => void;
	syncPendingOperations: () => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
	products: [],
	categories: [],
	isLoading: false,
	searchTerm: '',
	selectedCategory: null,
	isOnline: navigator.onLine,

	loadProducts: async () => {
		set({ isLoading: true });
		try {
			if (get().isOnline) {
				const { data } = await supabase.from('products').select('*').order('name');

				if (data) {
					const localProducts = await db.products.toArray();
					const mergedProducts = data.map((product) => {
						const localProduct = localProducts.find((p) => p.id === product.id);
						return {
							...product,
							pending_stock_changes: localProduct?.pending_stock_changes || 0,
						};
					});

					await db.products.bulkPut(mergedProducts);
					set({ products: mergedProducts });
				}
			} else {
				const offlineProducts = await db.products.toArray();
				set({ products: offlineProducts });
			}
		} catch (error) {
			console.error('Error loading products:', error);
		} finally {
			set({ isLoading: false });
		}
	},

	loadCategories: async () => {
		try {
			if (get().isOnline) {
				const { data } = await supabase.from('categories').select('*').order('name');

				if (data) {
					await db.categories.bulkPut(data);
					set({ categories: data });
				}
			} else {
				const offlineCategories = await db.categories.toArray();
				set({ categories: offlineCategories });
			}
		} catch (error) {
			console.error('Error loading categories:', error);
		}
	},

	createProduct: async (product) => {
		const { pending_image, ...productData } = product;
		const newProduct = {
			...productData,
			id: uuidv4(),
			created_at: new Date().toISOString(),
			is_hidden: false,
		};

		if (get().isOnline) {
			let imageUrl = product.image_url;

			if (pending_image) {
				try {
					const response = await fetch(pending_image);
					const blob = await response.blob();
					const fileExt = blob.type.split('/')[1] || 'jpg';
					const fileName = `${uuidv4()}.${fileExt}`;

					const { error: uploadError } = await supabase.storage
						.from('products')
						.upload(fileName, blob, {
							cacheControl: '3600',
							upsert: false,
							contentType: blob.type,
						});

					if (uploadError) throw uploadError;

					const {
						data: { publicUrl },
					} = supabase.storage.from('products').getPublicUrl(fileName);

					imageUrl = publicUrl;
				} catch (error) {
					console.error('Error uploading image:', error);
					throw error;
				}
			}

			const { error } = await supabase.from('products').insert({
				...newProduct,
				image_url: imageUrl,
			});
			if (error) throw error;
		} else {
			await db.products.add(newProduct);
			await db.addPendingOperation(
				'create',
				'products',
				{
					...newProduct,
					pending_image,
				},
				5 // Alta prioridad para productos
			);
		}

		set((state) => ({
			products: [...state.products, newProduct],
		}));
	},

	updateProduct: async (id, updates) => {
		const { pending_image, ...updateData } = updates;
		const updatedProduct = { ...updateData, id };

		if (get().isOnline) {
			let imageUrl = updates.image_url;

			if (pending_image) {
				try {
					const response = await fetch(pending_image);
					const blob = await response.blob();
					const fileExt = blob.type.split('/')[1] || 'jpg';
					const fileName = `${uuidv4()}.${fileExt}`;

					const { error: uploadError } = await supabase.storage
						.from('products')
						.upload(fileName, blob, {
							cacheControl: '3600',
							upsert: false,
							contentType: blob.type,
						});

					if (uploadError) throw uploadError;

					const {
						data: { publicUrl },
					} = supabase.storage.from('products').getPublicUrl(fileName);

					imageUrl = publicUrl;
				} catch (error) {
					console.error('Error uploading image:', error);
					throw error;
				}
			}

			const { error } = await supabase
				.from('products')
				.update({ ...updateData, image_url: imageUrl })
				.eq('id', id);
			if (error) throw error;
		} else {
			await db.products.update(id, updateData);
			await db.addPendingOperation(
				'update',
				'products',
				{
					...updatedProduct,
					pending_image,
				},
				5 // Alta prioridad para productos
			);
		}

		set((state) => ({
			products: state.products.map((p) => (p.id === id ? { ...p, ...updateData } : p)),
		}));
	},

	deleteProduct: async (id: string) => {
		try {
			if (get().isOnline) {
				const product = get().products.find((p) => p.id === id);
	
				if (product?.image_url) {
					const fileName = product.image_url.split('/').pop();
					if (fileName) {
						await supabase.storage.from('products').remove([fileName]);
					}
				}
	
				const { error } = await supabase.from('products').delete().eq('id', id);
				if (error) throw error;
	
				// 4. Eliminar el producto de IndexedDB
				await db.products.delete(id);
	
				// 5. Eliminar cualquier operación pendiente relacionada con este producto
				const pendingOps = await db.pendingOperations
					.where('table')
					.equals('products')
					.filter((op) => op.data.id === id)
					.toArray();
	
				for (const op of pendingOps) {
					await db.pendingOperations.delete(op.id);
				}
			} else {
				await db.products.delete(id);
				await db.addPendingOperation('delete', 'products', { id }, 5); // Alta prioridad para productos
			}
	
			set((state) => ({
				products: state.products.filter((p) => p.id !== id),
			}));
		} catch (error) {
			console.error('Error al eliminar producto:', error);
			throw error;
		}
	},

	hideProduct: async (id: string) => {
		const updates = { is_hidden: true };

		if (get().isOnline) {
			const { error } = await supabase.from('products').update(updates).eq('id', id);

			if (error) throw error;
		} else {
			await db.products.update(id, updates);
			await db.addPendingOperation('update', 'products', { id, ...updates });
		}

		set((state) => ({
			products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
		}));
	},

	unhideProduct: async (id: string) => {
		const updates = { is_hidden: false };

		if (get().isOnline) {
			const { error } = await supabase.from('products').update(updates).eq('id', id);

			if (error) throw error;
		} else {
			await db.products.update(id, updates);
			await db.addPendingOperation('update', 'products', { id, ...updates });
		}

		set((state) => ({
			products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
		}));
	},

	checkHasSales: async (id: string) => {
		if (get().isOnline) {
			const { data: saleItems } = await supabase
				.from('sale_items')
				.select('id')
				.eq('product_id', id)
				.limit(1);

			return saleItems ? saleItems.length > 0 : false;
		} else {
			const saleItems = await db.saleItems.where('product_id').equals(id).limit(1).toArray();
			return saleItems.length > 0;
		}
	},

	checkCodeExists: async (code: string, excludeId?: string) => {
		if (!code.trim()) return false;

		if (get().isOnline) {
			const query = supabase.from('products').select('id').eq('code', code);

			if (excludeId) {
				query.neq('id', excludeId);
			}

			const { data } = await query.maybeSingle();
			return !!data;
		} else {
			const product = await db.products
				.where('code')
				.equals(code)
				.filter((p) => p.id !== excludeId)
				.first();

			return !!product;
		}
	},

	setSearchTerm: (term) => set({ searchTerm: term }),
	setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
	setIsOnline: (online) => set({ isOnline: online }),

	/* NEW */
	syncPendingOperations: async () => {
		if (!get().isOnline) return;

		try {
			// 1. Obtener productos con cambios pendientes antes de sincronproducts.ts:384 Error syncing operation 7114c799-ad3d-4ad4-8058-7785c561d53a: {code: '23503', details: 'Key is not present in table "products".', hint: null, message: 'insert or update on table "sale_items" violates foreign key constraint "sale_items_product_id_fkey"'}izar otras operaciones
			const productsWithChanges = await db.products
				.filter(
					(product) =>
						typeof product.pending_stock_changes === 'number' && product.pending_stock_changes != 0 //! era > 0, FUNCIONABA ANTES DE INTENTAR SINCRONIZAR EL STOCK AL ELIMINAR UNA VENTA EN OFFLINE
				)
				.toArray();

			// console.log('Productos con cambios pendientes antes de sincronizar:', productsWithChanges);

			// 2. Sincronizar cambios de stock
			for (const product of productsWithChanges) {
				if (!product.pending_stock_changes) continue;

				console.log('Procesando producto:', {
					id: product.id,
					pendingChanges: product.pending_stock_changes,
					currentStock: product.stock,
				});

				const { data: currentProduct, error: selectError } = await supabase
					.from('products')
					.select('stock')
					.eq('id', product.id)
					.single();

				if (selectError) {
					console.error('Error al obtener producto de Supabase:', selectError);
					continue;
				}

				if (currentProduct) {
					const pendingChanges = product.pending_stock_changes || 0;
					const newStock = Math.max(0, currentProduct.stock - pendingChanges);

					console.log('Actualizando stock:', {
						id: product.id,
						oldStock: currentProduct.stock,
						pendingChanges: product.pending_stock_changes,
						newStock,
					});

					const { error: updateError } = await supabase
						.from('products')
						.update({ stock: newStock })
						.eq('id', product.id);

					if (!updateError) {
						// Actualizar localmente
						await db.products.update(product.id, {
							stock: newStock,
							pending_stock_changes: 0,
						});

						console.log('Stock actualizado correctamente:', {
							id: product.id,
							newStock,
						});
					} else {
						console.error('Error al actualizar stock:', updateError);
					}
				}
			}

			// 3. Sincronizar otras operaciones pendientes
			const pendingOps = await db.getPendingOperations();

			for (const op of pendingOps) {
				try {
					switch (op.type) {
						case 'create': {
							const { pending_image, ...productData } = op.data;

							if (pending_image) {
								const response = await fetch(pending_image);
								const blob = await response.blob();
								const fileExt = response.headers.get('content-type')?.split('/')[1] || 'jpg';
								const fileName = `${uuidv4()}.${fileExt}`;

								const { error: uploadError } = await supabase.storage
									.from('products')
									.upload(fileName, blob, {
										cacheControl: '3600',
										upsert: false,
									});

								if (uploadError) throw uploadError;

								const {
									data: { publicUrl },
								} = supabase.storage.from('products').getPublicUrl(fileName);

								productData.image_url = publicUrl;
							}

							const { error: insertError } = await supabase.from(op.table).insert(productData);
							if (insertError) throw insertError;
							break;
						}
						case 'update': {
							const { pending_image, ...updateData } = op.data;

							if (pending_image) {
								const response = await fetch(pending_image);
								const blob = await response.blob();
								const fileExt = 'jpg';
								const fileName = `${uuidv4()}.${fileExt}`;

								const { error: uploadError } = await supabase.storage
									.from('products')
									.upload(fileName, blob, {
										cacheControl: '3600',
										upsert: false,
									});

								if (uploadError) throw uploadError;

								const {
									data: { publicUrl },
								} = supabase.storage.from('products').getPublicUrl(fileName);

								updateData.image_url = publicUrl;
							}

							const { error: updateError } = await supabase
								.from(op.table)
								.update(updateData)
								.eq('id', op.data.id);
							if (updateError) throw updateError;
							break;
						}
						case 'delete':
							const { error: deleteError } = await supabase
								.from(op.table)
								.delete()
								.eq('id', op.data.id);
							if (deleteError) throw deleteError;
							break;
					}
					await db.pendingOperations.delete(op.id);
				} catch (error) {
					console.error(`Error syncing operation ${op.id}:`, error);
					// await db.updateOperationStatus(op.id, 'error', error.message || 'Unknown error');
				}
			}

			await get().loadProducts();
		} catch (error) {
			console.error('Error en sincronización:', error);
			throw error;
		}
	},
}));

// Funciones auxiliares
/* async function syncProductStock(product: Product) {
	const { data: currentProduct, error: selectError } = await supabase
	  .from('products')
	  .select('stock')
	  .eq('id', product.id)
	  .single();
  
	if (selectError) throw selectError;
  
	if (currentProduct) {
	  const pendingChanges = product.pending_stock_changes || 0;
	  const newStock = Math.max(0, currentProduct.stock - pendingChanges);
  
	  const { error: updateError } = await supabase
		.from('products')
		.update({ stock: newStock })
		.eq('id', product.id);
  
	  if (!updateError) {
		await db.products.update(product.id, {
		  stock: newStock,
		  pending_stock_changes: 0,
		});
	  } else {
		throw updateError;
	  }
	}
  }
  
  async function syncOperation(op: PendingOperation) {
	switch (op.type) {
	  case 'create': {
		const { pending_image, ...productData } = op.data;
  
		if (pending_image) {
		  const imageUrl = await uploadImage(pending_image);
		  productData.image_url = imageUrl;
		}
  
		const { error } = await supabase.from(op.table).insert(productData);
		if (error) throw error;
		break;
	  }
	  case 'update': {
		const { pending_image, ...updateData } = op.data;
  
		if (pending_image) {
		  const imageUrl = await uploadImage(pending_image);
		  updateData.image_url = imageUrl;
		}
  
		const { error } = await supabase
		  .from(op.table)
		  .update(updateData)
		  .eq('id', op.data.id);
		if (error) throw error;
		break;
	  }
	  case 'delete': {
		const { error } = await supabase
		  .from(op.table)
		  .delete()
		  .eq('id', op.data.id);
		if (error) throw error;
		break;
	  }
	}
	await db.pendingOperations.delete(op.id);
  }
  
  async function uploadImage(base64Image: string): Promise<string> {
	const response = await fetch(base64Image);
	const blob = await response.blob();
	const fileExt = blob.type.split('/')[1] || 'jpg';
	const fileName = `${uuidv4()}.${fileExt}`;
  
	const { error: uploadError } = await supabase.storage
	  .from('products')
	  .upload(fileName, blob, {
		cacheControl: '3600',
		upsert: false,
	  });
  
	if (uploadError) throw uploadError;
  
	const { data: { publicUrl } } = supabase.storage
	  .from('products')
	  .getPublicUrl(fileName);
  
	return publicUrl;
  } */