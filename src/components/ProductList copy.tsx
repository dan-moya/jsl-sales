/* import { useState } from 'react';
import { Search, Edit2, EyeOff, Eye, Filter, Trash2 } from 'lucide-react';
import { useProductsStore } from '../store/products';
import ProductForm from './ProductForm';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { Database } from '../lib/database.types';
import toast from 'react-hot-toast';

type Product = Database['public']['Tables']['products']['Row'];

export default function ProductList() {
	const {
		products,
		categories,
		searchTerm,
		selectedCategory,
		setSearchTerm,
		setSelectedCategory,
		deleteProduct,
		hideProduct,
		unhideProduct,
		checkHasSales,
	} = useProductsStore();
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [showHidden, setShowHidden] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState<{
		isOpen: boolean;
		product: Product | null;
		hasSales: boolean;
	}>({
		isOpen: false,
		product: null,
		hasSales: false,
	});
	const [hideDialog, setHideDialog] = useState<{
		isOpen: boolean;
		product: Product | null;
	}>({
		isOpen: false,
		product: null,
	});

	const filteredProducts = products.filter((product) => {
		const matchesSearch =
			product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			product.code.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
		const matchesVisibility = showHidden ? product.is_hidden : !product.is_hidden;
		return matchesSearch && matchesCategory && matchesVisibility;
	});

	const handleDeleteClick = async (product: Product) => {
		try {
			const hasSales = await checkHasSales(product.id);
			setDeleteDialog({ isOpen: true, product, hasSales });
		} catch (error) {
			console.error('Error al verificar ventas:', error);
			toast.error('Error al verificar el producto');
		}
	};

	const handleConfirmDelete = async () => {
		if (!deleteDialog.product) return;

		try {
			await deleteProduct(deleteDialog.product.id);
			toast.success('Producto eliminado correctamente');
			setDeleteDialog({ isOpen: false, product: null, hasSales: false });
		} catch (error) {
			console.error('Error al eliminar:', error);
			toast.error('Error al eliminar el producto');
		}
	};

	const handleHideClick = (product: Product) => {
		setHideDialog({ isOpen: true, product });
	};

	const handleConfirmHide = async () => {
		if (!hideDialog.product) return;

		try {
			await hideProduct(hideDialog.product.id);
			toast.success('Producto ocultado correctamente');
			setHideDialog({ isOpen: false, product: null });
		} catch (error) {
			console.error('Error al ocultar:', error);
			toast.error('Error al ocultar el producto');
		}
	};

	const handleUnhide = async (product: Product) => {
		try {
			await unhideProduct(product.id);
			toast.success('Producto visible nuevamente');
		} catch (error) {
			console.error('Error al mostrar:', error);
			toast.error('Error al mostrar el producto');
		}
	};

	return (
		<div className="p-4">
			<div className="mb-6">
				<div className="flex items-center gap-4 mb-4">
					<div className="flex-1 relative">
						<Search
							className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							placeholder="Buscar productos..."
							className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="flex items-center gap-2 px-2 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
					>
						<Filter size={20} />
					</button>
				</div>

				{showFilters && (
					<div className="p-2 bg-gray-50 rounded-lg space-y-4">
						<select
							className="w-full p-2 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
							value={selectedCategory || ''}
							onChange={(e) => setSelectedCategory(e.target.value || null)}
						>
							<option value="">Todas las categorías</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>

						<div className="flex items-center">
							<label className="inline-flex items-center">
								<input
									type="checkbox"
									className="form-checkbox text-indigo-600"
									checked={showHidden}
									onChange={(e) => setShowHidden(e.target.checked)}
								/>
								<span  className="ml-2">Mostrar productos ocultos</span>
							</label>
						</div>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{filteredProducts.map((product) => (
					<div
						key={product.id}
						className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
							product.is_hidden ? 'opacity-75' : ''
						}`}
					>
						<div className="sm:aspect-w-4 sm:aspect-h-3">
							{product.image_url ? (
								<img
									src={product.image_url}
									alt={product.name}
									className="w-full h-48 object-cover"
								/>
							) : (
								<div className="w-full h-48 bg-gray-100 flex items-center justify-center">
									<span className="text-gray-400">Sin imagen</span>
								</div>
							)}
						</div>

						<div className="p-4">
							<div className="mb-2">
								<span className="text-sm text-gray-500">Código:</span>
								<span className="ml-2 font-medium">{product.code}</span>
							</div>

							<h3 className="text-lg font-semibold mb-2 line-clamp-2">{product.name}</h3>

							<div className="mb-2">
								<span className="text-sm text-gray-500">Categoría:</span>
								<span className="ml-2">
									{categories.find((c) => c.id === product.category_id)?.name}
								</span>
							</div>

							<div className="mb-2">
								<span className="text-sm text-gray-500">Precio compra:</span>
								<span className="ml-2">Bs. {product.purchase_price.toFixed(2)}</span>
							</div>

							<div className="mb-2">
								<span className="text-sm text-gray-500">Precio venta:</span>
								<span className="ml-2">Bs. {product.sale_price.toFixed(2)}</span>
							</div>

							<div className="mb-4">
								<span className="text-sm text-gray-500">Stock:</span>
								<span
									className={`ml-2 font-bold ${
										product.stock === 0 ? 'text-red-600' : 'text-green-600'
									}`}
								>
									{product.stock}
								</span>
							</div>

							<div className="flex justify-end space-x-2 pt-2 border-t">
								<button
									onClick={() => setEditingProduct(product)}
									className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
								>
									<Edit2 size={20} />
								</button>
								{product.is_hidden ? (
									<button
										onClick={() => handleUnhide(product)}
										className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
									>
										<Eye size={20} />
									</button>
								) : (
									<button
										onClick={() => handleHideClick(product)}
										className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
									>
										<EyeOff size={20} />
									</button>
								)}
								{!product.is_hidden && (
									<button
										onClick={() => handleDeleteClick(product)}
										className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
									>
										<Trash2 size={20} />
									</button>
								)}
							</div>
						</div>
					</div>
				))}
			</div>

			{editingProduct && <ProductForm product={editingProduct} onClose={() => setEditingProduct(null)} />}

			<DeleteConfirmDialog
				isOpen={deleteDialog.isOpen}
				onClose={() => setDeleteDialog({ isOpen: false, product: null, hasSales: false })}
				onConfirm={handleConfirmDelete}
				itemName={deleteDialog.product?.name || ''}
				hasSales={deleteDialog.hasSales}
			/>

			<DeleteConfirmDialog
				isOpen={hideDialog.isOpen}
				onClose={() => setHideDialog({ isOpen: false, product: null })}
				onConfirm={handleConfirmHide}
				itemName={hideDialog.product?.name || ''}
				title="Ocultar Producto"
				message="¿Estás seguro que deseas ocultar este producto? Podrás volver a mostrarlo cuando lo desees."
				confirmText="Ocultar"
			/>
		</div>
	);
}
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, Edit2, EyeOff, Eye, Filter, Trash2, X, MoreVertical, Package, DollarSign, TrendingUp } from 'lucide-react';
import { useProductsStore } from '../store/products';
import { useSalesStore } from '../store/sales';
import ProductForm from './ProductForm';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { Database } from '../lib/database.types';
import toast from 'react-hot-toast';

type Product = Database['public']['Tables']['products']['Row'];

const ITEMS_PER_PAGE = 5; // 50

export default function ProductList() {
	const {
		products,
		categories,
		searchTerm,
		selectedCategory,
		setSearchTerm,
		setSelectedCategory,
		deleteProduct,
		hideProduct,
		unhideProduct,
		checkHasSales,
	} = useProductsStore();
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [showHidden, setShowHidden] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [deleteDialog, setDeleteDialog] = useState<{
		isOpen: boolean;
		product: Product | null;
		hasSales: boolean;
	}>({
		isOpen: false,
		product: null,
		hasSales: false,
	});
	const [hideDialog, setHideDialog] = useState<{
		isOpen: boolean;
		product: Product | null;
	}>({
		isOpen: false,
		product: null,
	});
	const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
	const [hasSales, setHasSales] = useState<{ [key: string]: boolean }>({});

    const toggleMenu = async (index: number, productId: string) => {
        if (openMenuIndex === index) {
            setOpenMenuIndex(null);
        } else {
            const sales = await checkHasSales(productId);
            setHasSales((prev) => ({ ...prev, [productId]: sales }));
            setOpenMenuIndex(index);
        }
    };

	// Memoized filter function
	const getFilteredProducts = useCallback(() => {
		return products.filter((product) => {
			const matchesSearch =
				product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				product.code.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
			const matchesVisibility = showHidden ? product.is_hidden : !product.is_hidden;
			return matchesSearch && matchesCategory && matchesVisibility;
		});
	}, [products, searchTerm, selectedCategory, showHidden]);

	// Pagination
	const filteredProducts = getFilteredProducts();
	const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
	const paginatedProducts = filteredProducts.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedCategory, showHidden]);

	const handleDeleteClick = async (product: Product) => {
		try {
			const hasSales = await checkHasSales(product.id);
			setDeleteDialog({ isOpen: true, product, hasSales });
		} catch (error) {
			console.error('Error al verificar ventas:', error);
			toast.error('Error al verificar el producto');
		}
	};

	const handleConfirmDelete = async () => {
		if (!deleteDialog.product) return;

		try {
			await deleteProduct(deleteDialog.product.id);
			toast.success('Producto eliminado correctamente');
			setDeleteDialog({ isOpen: false, product: null, hasSales: false });
		} catch (error) {
			console.error('Error al eliminar:', error);
			toast.error('Error al eliminar el producto');
		}
	};

	const handleHideClick = (product: Product) => {
		setHideDialog({ isOpen: true, product });
	};

	const handleConfirmHide = async () => {
		if (!hideDialog.product) return;

		try {
			await hideProduct(hideDialog.product.id);
			toast.success('Producto ocultado correctamente');
			setHideDialog({ isOpen: false, product: null });
		} catch (error) {
			console.error('Error al ocultar:', error);
			toast.error('Error al ocultar el producto');
		}
	};

	const handleUnhide = async (product: Product) => {
		try {
			await unhideProduct(product.id);
			toast.success('Producto visible nuevamente');
		} catch (error) {
			console.error('Error al mostrar:', error);
			toast.error('Error al mostrar el producto');
		}
	};

	return (
		<div className="p-4">
			<div className="mb-6">
				<div className="flex items-center gap-4 mb-4">
					<div className="flex-1 relative">
						<Search
							className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							placeholder="Buscar productos..."
							className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="flex items-center gap-2 px-2 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
					>
						<Filter size={20} />
					</button>
				</div>

				{showFilters && (
					<div className="p-4 bg-gray-50 rounded-lg space-y-4">
						<select
							className="w-full p-2 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
							value={selectedCategory || ''}
							onChange={(e) => setSelectedCategory(e.target.value || null)}
						>
							<option value="">Todas las categorías</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>

						<div className="flex items-center">
							<label className="inline-flex items-center">
								<input
									type="checkbox"
									className="form-checkbox text-indigo-600"
									checked={showHidden}
									onChange={(e) => setShowHidden(e.target.checked)}
								/>
								<span className="ml-2">Mostrar productos ocultos</span>
							</label>
						</div>
					</div>
				)}
			</div>

			{/* CHECKPOINT */}
			<div className='grid grid-cols-1 gap-y-3'>
				{paginatedProducts.map((product, index) => (
					<div
						key={product.id}
						className={`hover:bg-gray-50 ${product.is_hidden ? 'opacity-60' : ''} border border-gray-100 rounded-lg p-1 shadow-sm`}
					>
						<div className='grid grid-cols-12'>
							<div className='col-span-10'>
								<div>
									<p className='text-xs'>
										Código: <span className='underline font-medium'>{product.code}</span>
									</p>
									<p className='text-base'>{product.name}</p>
								</div>

								<div className='grid grid-cols-10'>
									<div
										onClick={() => setPreviewImage(product.image_url)}
										className="cursor-pointer col-span-3"
									>
										{product.image_url ? (
											<img
												src={product.image_url}
												alt={product.name}
												className="h-16 w-16 object-cover rounded"
												loading="lazy"
											/>
										) : (
											<div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
												<span className="text-xs text-gray-400">Sin imagen</span>
											</div>
										)}
									</div>
									<div className='col-span-6 flex flex-col justify-center'>
										{/* <p>{categories.find((c) => c.id === product.category_id)?.name}</p> */}
										<p className='text-sm'>
											Compra: <span className='text-sm font-medium'>Bs. {product.purchase_price.toFixed(2)}</span>
										</p>
										<p className='text-sm'>
											Venta: <span className='text-sm font-medium'>Bs. {product.sale_price.toFixed(2)}</span>
										</p>
									</div>
									<div className="col-span-1 flex justify-center items-center">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-base font-medium ${
													product.stock === 0
														? 'bg-red-100 text-red-800'
														: 'bg-green-100 text-green-800'
												}`}
											>
												{product.stock}
											</span>
									</div>
								</div>
							</div>
							<div className="col-span-2 flex flex-col items-end justify-center pr-1">
                                {openMenuIndex === index ? (
									<div className='flex flex-col items-center justify-center border border-gray-200 rounded-lg shadow-md p-2 space-y-2.5 -mx-2'>
										<button
											onClick={() => setOpenMenuIndex(null)}
											className="bg-red-500 text-white font-extrabold p-0.5 rounded-full"
										>
											<X size={18} />
										</button>
										<button
											onClick={() => setEditingProduct(product)}
											className="text-indigo-600 hover:text-indigo-900 p-0.5"
										>
											<Edit2 size={18} />
										</button>
										{hasSales[product.id] ? (
											product.is_hidden ? (
												<button
													onClick={() => handleUnhide(product)}
													className="text-green-600 hover:text-green-900 p-0.5"
												>
													<Eye size={18} />
												</button>
											) : (
												<button
													onClick={() => handleHideClick(product)}
													className="text-yellow-600 hover:text-yellow-900 p-0.5"
												>
													<EyeOff size={18} />
												</button>
											)
										) : (
											<button
												onClick={() => handleDeleteClick(product)}
												className="text-red-600 hover:text-red-900 p-0.5"
											>
												<Trash2 size={18} />
											</button>
										)}
									</div>
								) : (
									<button
									onClick={() => toggleMenu(index, product.id)}
										className="text-gray-600 hover:text-gray-900"
									>
										<MoreVertical size={18} />
									</button>
								)}
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="bg-white rounded-lg shadow overflow-hidden">
				{/* Pagination */}
				{totalPages > 1 && (
					<div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
						<div className="flex-1 flex justify-between sm:hidden">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
							>
								Anterior
							</button>
							<button
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
							>
								Siguiente
							</button>
						</div>
						<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
							<div>
								<p className="text-sm text-gray-700">
									Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>{' '}
									a{' '}
									<span className="font-medium">
										{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}
									</span>{' '}
									de <span className="font-medium">{filteredProducts.length}</span> resultados
								</p>
							</div>
							<div>
								<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNumber;
										if (totalPages <= 5) {
											pageNumber = i + 1;
										} else if (currentPage <= 3) {
											pageNumber = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNumber = totalPages - 4 + i;
										} else {
											pageNumber = currentPage - 2 + i;
										}

										return (
											<button
												key={pageNumber}
												onClick={() => setCurrentPage(pageNumber)}
												className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
													currentPage === pageNumber
														? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
														: 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
												}`}
											>
												{pageNumber}
											</button>
										);
									})}
								</nav>
							</div>
						</div>
					</div>
				)}
			</div>

			{editingProduct && <ProductForm product={editingProduct} onClose={() => setEditingProduct(null)} />}

			<DeleteConfirmDialog
				isOpen={deleteDialog.isOpen}
				onClose={() => setDeleteDialog({ isOpen: false, product: null, hasSales: false })}
				onConfirm={handleConfirmDelete}
				itemName={deleteDialog.product?.name || ''}
				hasSales={deleteDialog.hasSales}
			/>

			<DeleteConfirmDialog
				isOpen={hideDialog.isOpen}
				onClose={() => setHideDialog({ isOpen: false, product: null })}
				onConfirm={handleConfirmHide}
				itemName={hideDialog.product?.name || ''}
				title="Ocultar Producto"
				message="¿Estás seguro que deseas ocultar este producto? Podrás volver a mostrarlo cuando lo desees."
				confirmText="Ocultar"
			/>

			{/* Image Preview Modal */}
			{previewImage && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
					onClick={() => setPreviewImage(null)}
				>
					<div className="relative max-w-3xl max-h-[90vh] bg-white rounded-lg p-2">
						<button
							onClick={() => setPreviewImage(null)}
							className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
						>
							<X size={24} />
						</button>
						<img
							src={previewImage}
							alt="Vista previa"
							className="max-h-[85vh] w-auto object-contain rounded-lg"
						/>
					</div>
				</div>
			)}
		</div>
	);
}