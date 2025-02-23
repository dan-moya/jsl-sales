import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useProductsStore } from '../store/products';
import { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { setupStorage } from '../lib/storage';
import { compressImage } from '../utils/imageCompression';
import ImagePreview from './ImagePreview';
import LoadingButton from './LoadingButton';
import toast from 'react-hot-toast';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductFormProps {
	product?: Product;
	onClose: () => void;
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
	const { categories, createProduct, updateProduct, checkCodeExists } = useProductsStore();
	const [isLoading, setIsLoading] = useState(false);
	const [isCheckingCode, setIsCheckingCode] = useState(false);
	const [codeError, setCodeError] = useState('');
	const [formData, setFormData] = useState({
		code: product?.code || '',
		name: product?.name || '',
		category_id: product?.category_id || '',
		// purchase_price: product?.purchase_price?.toString() || '0', // 0 por defecto en el llenado por defecto del input
		purchase_price: product?.purchase_price?.toString() || '',
		sale_price: product?.sale_price?.toString() || '',
		stock: product?.stock?.toString() || '',
		image_url: product?.image_url || '',
		// por si acaso quitar el de abajo
		// is_hidden: false,
	});
	const [image, setImage] = useState<File | null>(null);
	const [pendingImageData, setPendingImageData] = useState<string | null>(null);

	const purchasePrice = parseFloat(formData.purchase_price) || 0;
    const salePrice = parseFloat(formData.sale_price) || 0;
    const stock = parseInt(formData.stock) || 0;

    const netProfitPerUnit = salePrice - purchasePrice;
    const totalNetProfit = netProfitPerUnit * stock;

	useEffect(() => {
		setupStorage().catch(console.error);
	}, []);

	// Verificar código único cuando cambia
	useEffect(() => {
		const checkCode = async () => {
			if (formData.code.trim()) {
				setIsCheckingCode(true);
				try {
					const exists = await checkCodeExists(formData.code, product?.id);
					setCodeError(exists ? 'Este código ya está en uso' : '');
				} catch (error) {
					console.error('Error al verificar código:', error);
				} finally {
					setIsCheckingCode(false);
				}
			} else {
				setCodeError('El código es requerido');
			}
		};

		const timeoutId = setTimeout(checkCode, 300);
		return () => clearTimeout(timeoutId);
	}, [formData.code, product?.id]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (codeError || isCheckingCode) {
			toast.error(codeError || 'Verificando código...');
			return;
		}

		setIsLoading(true);
		try {
			let imageUrl = formData.image_url;

			if (image) {
				const compressedImage = await compressImage(image);
				const reader = new FileReader();
				reader.readAsDataURL(compressedImage);

				// Si estamos offline, guardamos la imagen en IndexedDB
				if (!navigator.onLine) {
					const base64Data = await new Promise<string>((resolve) => {
						reader.onloadend = () => resolve(reader.result as string);
					});
					setPendingImageData(base64Data);
					imageUrl = base64Data; // Usamos el base64 temporalmente
				} else {
					const fileExt = compressedImage.name.split('.').pop();
					const fileName = `${Math.random()}.${fileExt}`;

					const { error: uploadError } = await supabase.storage
						.from('products')
						.upload(fileName, compressedImage, {
							cacheControl: '3600',
							upsert: false,
						});

					if (uploadError) throw uploadError;

					const {
						data: { publicUrl },
					} = supabase.storage.from('products').getPublicUrl(fileName);

					imageUrl = publicUrl;
				}
			}

			const productData = {
				...formData,
				purchase_price: parseFloat(formData.purchase_price),
				sale_price: parseFloat(formData.sale_price),
				stock: parseInt(formData.stock),
				image_url: imageUrl,
				pending_image: pendingImageData,
				is_hidden: false, // recién añadido
			};

			if (product) {
				await updateProduct(product.id, productData);
				toast.success('Producto actualizado');
			} else {
				await createProduct(productData);
				toast.success('Producto creado');
			}
			onClose();
		} catch (error: any) {
			console.error('Error:', error);
			toast.error(error.message || 'Error al guardar el producto');
		} finally {
			setIsLoading(false);
		}
	};

	const isFormValid =
		!codeError &&
		!isCheckingCode &&
		formData.code.trim() !== '' &&
		formData.name.trim() !== '' &&
		formData.category_id !== '' &&
		parseFloat(formData.purchase_price) >= 0 &&
		parseFloat(formData.sale_price) >= 0 &&
		parseInt(formData.stock) >= 0;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-zinc-50 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
				<div className="sticky top-0 bg-pink-200 px-6 py-4 border-b flex justify-between items-center">
					<h2 className="text-xl font-bold">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
					<button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
						<X size={24} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div className=''>
						<div className='flex gap-x-5'>
							<label className="block text-md font-medium text-gray-700 p-0.5">Código: </label>
							<div className="relative">
								<input
									type="text"
									required
									className={`w-full rounded-md shadow-md p-0.5 ring-2 ring-pink-300 focus:outline-none ${
										codeError
											? 'border focus:border-red-500 focus:ring-2 focus:ring-red-500'
											: 'border focus:border-green-500 focus:ring-2 focus:ring-green-500 ring-inset'
									}`}
									value={formData.code}
									onChange={(e) => setFormData({ ...formData, code: e.target.value })}
									placeholder='Ej. 01'
								/>
								{isCheckingCode && (
									<div className="absolute right-2 top-1/2 -translate-y-1/2">
										<div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
									</div>
								)}
								{!codeError && (
									<div className="absolute right-2 top-1/2 -translate-y-1/2">
										<Check className='rounded-full bg-green-300 text-black p-0.5' size={20} />
									</div>
								)}
							</div>
						</div>
						{codeError && <p className="mt-1 text-sm text-red-600">{codeError}</p>}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
						<input
							type="text"
							required
							className="w-full rounded-md shadow-md p-0.5 ring-2 ring-pink-300 focus:outline-none"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							placeholder='Escriba el nombre del producto'
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
						<select
							required
							className="w-full rounded-md shadow-md p-0.5 ring-2 ring-pink-300 outline-none"
							value={formData.category_id}
							onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
						>
							<option value="">Seleccionar categoría</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Precio de compra
							</label>
							<input
								type="number"
								required
								min="0"
								step="0.01"
								className="w-full rounded-md shadow-md p-0.5 ring-2 ring-pink-300 focus:outline-none"
								value={formData.purchase_price}
								onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
								placeholder='0'
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Precio de venta
							</label>
							<input
								type="number"
								required
								min="0"
								step="0.01"
								className="w-full rounded-md shadow-md p-0.5 ring-2 ring-pink-300 focus:outline-none"
								value={formData.sale_price}
								onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
								placeholder='0'
							/>
						</div>
					</div>

					<div className="grid grid-cols-5 md:grid-cols-2 gap-6">
						<div className='col-span-1 w-16'>
							<label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
							<input
								type="number"
								required
								min="0"
								className="w-full rounded-md shadow-md p-0.5 ring-2 ring-pink-300 focus:outline-none"
								value={formData.stock}
								onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
								placeholder='0'
							/>
						</div>
						<div className='col-span-4 ml-7 w-48 bg-pink-100 p-2 rounded-lg'>
							<p className="text-sm font-semibold underline">Ganancia:</p>
							{/* <p>Costo total: Bs. {(purchasePrice * stock).toFixed(2)}</p> */}
							<p className='text-sm'>Unidad:
								<span className='text-base px-2.5 font-medium'>Bs. {netProfitPerUnit.toFixed(2)}</span>
							</p>
							<p className='text-sm'>Total:
								<span className='text-base px-6 font-medium'>Bs. {totalNetProfit.toFixed(2)}</span>
							</p>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
						<div className='flex justify-between items-center'>
							<input
								type="file"
								accept="image/*"
								className="w-full"
								onChange={(e) => setImage(e.target.files?.[0] || null)}
							/>
							<ImagePreview file={image} currentUrl={formData.image_url} />
						</div>
					</div>

					<div className="flex justify-end space-x-3 pt-4">
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
							disabled={!isFormValid}
							className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{product ? 'Actualizar' : 'Crear'}
						</LoadingButton>
					</div>
				</form>
			</div>
		</div>
	);
}
