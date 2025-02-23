import { useState, useId } from 'react';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { Database } from '../lib/database.types';
import LoadingButton from './LoadingButton';
import ProductSearch from './ProductSearch';

type Product = Database['public']['Tables']['products']['Row'];
type SaleWithItems = Database['public']['Tables']['sales']['Row'] & {
	items: Array<{
		id: string;
		product: Product;
		quantity: number;
		price: number;
	}>;
};

interface EditSaleDialogProps {
	sale: SaleWithItems;
	onClose: () => void;
	onSave: (updatedSale: SaleWithItems) => Promise<void>;
}

export default function EditSaleDialog({ sale, onClose, onSave }: EditSaleDialogProps) {
	const formId = useId();  // Generar ID único para el formulario
	const [isLoading, setIsLoading] = useState(false);
	const [items, setItems] = useState(sale.items);
	const [paymentMethod, setPaymentMethod] = useState<'QR' | 'EFECTIVO'>(sale.payment_method);

	const handleAddProduct = (product: Product) => {
		const existingIndex = items.findIndex((item) => item.product.id === product.id);

		if (existingIndex >= 0) {
			// Si el producto ya está en la venta, aumentar cantidad si hay stock disponible
			const currentItem = items[existingIndex];
			const originalQuantity = sale.items.find((i) => i.product.id === product.id)?.quantity || 0;
			const maxAvailable = product.stock + originalQuantity;

			if (currentItem.quantity < maxAvailable) {
				handleUpdateQuantity(existingIndex, currentItem.quantity + 1);
			}
		} else {
			// Si es un nuevo producto, agregar con cantidad 1
			setItems([
				...items,
				{
					id: crypto.randomUUID(),
					product,
					quantity: 1,
					price: product.sale_price,
				},
			]);
		}
	};

	const handleUpdateQuantity = (index: number, newQuantity: number) => {
		const item = items[index];
		const originalQuantity = sale.items.find((i) => i.product.id === item.product.id)?.quantity || 0;
		const maxAvailable = item.product.stock + originalQuantity;

		// Asegurar que la nueva cantidad esté entre 1 y el máximo disponible
		const validQuantity = Math.min(Math.max(1, newQuantity), maxAvailable);

		setItems(items.map((item, i) => (i === index ? { ...item, quantity: validQuantity } : item)));
	};

	const handleUpdatePrice = (index: number, newPrice: number) => {
		setItems(items.map((item, i) => (i === index ? { ...item, price: newPrice } : item)));
	};

	const handleRemoveItem = (index: number) => {
		setItems(items.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (items.length === 0) return;

		setIsLoading(true);
		try {
			const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
			await onSave({
				...sale,
				items,
				total,
				payment_method: paymentMethod,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-zinc-50 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
			<div className="sticky top-0 bg-pink-200 px-6 py-4 border-b flex justify-between items-center">
					<h2 className="text-xl font-bold">Editar Venta</h2>
					<button onClick={onClose} className="text-pink-500 hover:text-pink-700 transition-colors">
						<X size={24} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					<ProductSearch onSelect={handleAddProduct} />

					<div className="space-y-4">
						{items.map((item, index) => {
							const originalQuantity =
								sale.items.find((i) => i.product.id === item.product.id)?.quantity || 0;
							const maxAvailable = item.product.stock + originalQuantity;

							return (
								<div key={index} className='grid grid-cols-12 shadow-sm rounded-sm p-3'>
									<div className="col-span-11">
										<div className="flex flex-col items-start justify-center bg-gray-50 rounded-lg">
											<div className="flex flex-col">
												<h3 className="font-semibold">{item.product.name}</h3>
												{/* <p className="text-sm text-gray-500">Bs. {item.product.sale_price.toFixed(2)} c/u</p> */}
												<p className="text-sm text-gray-500">
													Stock disponible: {maxAvailable - item.quantity}
												</p>
											</div>

											<div className="flex items-center gap-3 mt-1">
												<div className="flex items-center gap-2">
													<button
														type="button"
														onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
														className="p-1 rounded-full bg-pink-200 hover:bg-pink-400 disabled:opacity-50"
													>
														<Minus size={20} />
													</button>

													<input
														type="number"
														min="1"
														max={maxAvailable}
                                            			className="w-6 text-center rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
														value={item.quantity}
														onChange={(e) =>
															handleUpdateQuantity(index, parseInt(e.target.value) || 1)
														}
													/>

													<button
														type="button"
														onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
														disabled={item.quantity >= maxAvailable}
														className="p-1 rounded-full bg-pink-300 hover:bg-pink-400 disabled:opacity-50"
													>
														<Plus size={20} />
													</button>
												</div>

												<div className="w-24 text-right font-medium">
													Bs. {(item.price * item.quantity).toFixed(2)}
												</div>
											</div>
											<div className='flex items-center gap-x-11 mt-1.5'>
												<label className='text-sm' htmlFor={`${formId}-edit-price-${item.product.id}`}>Editar precio: </label>
												<div className='ml-0.5'>
													<span>Bs. </span>
													<input
														type="number"
														id={`${formId}-edit-price-${item.product.id}`}  // ID único por producto
														min="0"
														step="0.01"
														className="w-14 rounded-md border border-pink-50 shadow-sm focus:border-pink-500 focus:ring-pink-500 ml-0.5"
														value={item.price}
														onChange={(e) =>
															handleUpdatePrice(index, parseFloat(e.target.value) || 0)
														}
													/>
												</div>
											</div>
										</div>
									</div>

									<div className="col-span-1 flex justify-center items-center">
										<button
											type="button"
											onClick={() => handleRemoveItem(index)}
											className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
										>
											<Trash2 size={20} />
										</button>
									</div>
								</div>
							);
						})}
					</div>

					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t gap-4 sm:gap-0">
						<div className="flex sm:flex-row gap-4">
							<label className="inline-flex items-center text-lg" htmlFor={`${formId}-efectivo`}>
								<input
									type="radio"
									className="form-radio accent-pink-400 "
									id={`${formId}-efectivo`}  // ID único
									name="paymentMethod"
									value="EFECTIVO"
									checked={paymentMethod === 'EFECTIVO'}
									onChange={(e) => setPaymentMethod(e.target.value as 'EFECTIVO')}
								/>
								<span className="ml-2">Efectivo</span>
							</label>
							<label className="inline-flex items-center text-lg">
								<input
									type="radio"
									className="form-radio accent-pink-400"
									name="paymentMethod"
									value="QR"
									checked={paymentMethod === 'QR'}
									onChange={(e) => setPaymentMethod(e.target.value as 'QR')}
								/>
								<span className="ml-2">QR</span>
							</label>
						</div>
						<div className="flex w-full justify-between">
                            <p className='text-xl font-medium'>Total: </p>
                            <p className='text-2xl font-semibold'>
								<span className='text-xl'>Bs. </span>
								{items.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2)}
								</p>
                        </div>
					</div>

					<div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
						<div className="flex justify-center sm:flex-row sm:justify-end gap-3">
							<button
								type="button"
								onClick={onClose}
								disabled={isLoading}
								className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								Cancelar
							</button>
							<LoadingButton
								type="submit"
								isLoading={isLoading}
								disabled={items.length === 0}
								className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-pink-600 hover:bg-pink-700"
							>
								Guardar Cambios
							</LoadingButton>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
