import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { useSalesStore } from '../store/sales';
import { Database } from '../lib/database.types';
import ProductSearch from './ProductSearch';
import SaleItemList from './SaleItemList';
import toast from 'react-hot-toast';
import LoadingButton from './LoadingButton';

type Product = Database['public']['Tables']['products']['Row'];

interface SaleItem {
	product: Product;
	quantity: number;
}

interface NewSaleProps {
	onClose: () => void;
}

export default function NewSale({ onClose }: NewSaleProps) {
	const formId = useId();  // Añade esto
	const [items, setItems] = useState<SaleItem[]>([]);
	const [paymentMethod, setPaymentMethod] = useState<'QR' | 'EFECTIVO'>('EFECTIVO');
	const [isLoading, setIsLoading] = useState(false);
	const { createSale } = useSalesStore();

	const handleAddProduct = (product: Product) => {
		const existingIndex = items.findIndex((item) => item.product.id === product.id);

		if (existingIndex >= 0) {
			const newQuantity = Math.min(items[existingIndex].quantity + 1, items[existingIndex].product.stock);

			handleUpdateQuantity(existingIndex, newQuantity);
		} else {
			setItems([...items, { product, quantity: 1 }]);
		}
	};

	const handleUpdateQuantity = (index: number, newQuantity: number) => {
		setItems(items.map((item, i) => (i === index ? { ...item, quantity: newQuantity } : item)));
	};

	const handleRemoveItem = (index: number) => {
		setItems(items.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (items.length === 0) {
			toast.error('Agregue al menos un producto');
			return;
		}

		setIsLoading(true);
		try {
			await createSale(
				items.map((item) => ({
					productId: item.product.id,
					quantity: item.quantity,
					price: item.product.sale_price,
				})),
				paymentMethod
			);
			toast.success('Venta registrada');
			onClose();
		} catch (error) {
			console.error('Error al registrar la venta:', error);
			toast.error('Error al registrar la venta');
		} finally {
			setIsLoading(false);
		}
	};

	const total = items.reduce((sum, item) => sum + item.quantity * item.product.sale_price, 0);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-zinc-50 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
				<div className="sticky top-0 bg-pink-200 px-6 py-4 border-b flex justify-between items-center">
					<h2 className="text-xl font-bold">Nueva Venta</h2>
					<button onClick={onClose} className="text-pink-500 hover:text-pink-700 transition-colors">
						<X size={24} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					<ProductSearch onSelect={handleAddProduct} />

					{items.length > 0 && (
						<SaleItemList
							items={items}
							onUpdateQuantity={handleUpdateQuantity}
							onRemoveItem={handleRemoveItem}
						/>
					)}

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
                            <p className='text-2xl font-semibold'><span className='text-xl'>Bs. </span>{total.toFixed(2)}</p>
                        </div>
					</div>

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
							className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-pink-600 hover:bg-pink-700"
						>
							Registrar Venta
						</LoadingButton>
					</div>
				</form>
			</div>
		</div>
	);
}
