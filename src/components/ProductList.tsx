import { useState, useEffect, useCallback } from 'react';
import { Search, EyeOff, Eye, Filter, Trash2, X, Package, DollarSign, TrendingUp } from 'lucide-react';
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

	const { sales } = useSalesStore();
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [showHidden, setShowHidden] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
	const [productStats, setProductStats] = useState<{
		totalSold: number;
		totalRevenue: number;
		totalProfit: number;
	} | null>(null);
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

	const [hasSales, setHasSales] = useState<{ [key: string]: boolean }>({});
	useEffect(() => {
		const fetchSalesData = async () => {
			const salesData: { [key: string]: boolean } = {};
			const promises = products.map(async (product) => {
				const sales = await checkHasSales(product.id);
				salesData[product.id] = sales;
			});
			await Promise.all(promises);
			setHasSales(salesData);
		};
		fetchSalesData();
	}, [products, checkHasSales]);

	const handleImagePreview = (product: Product) => {
		setPreviewImage(product.image_url);
		setPreviewProduct(product);

		// Calcular estadísticas de ventas
		const productSales = sales.flatMap((sale) => sale.items.filter((item) => item.product.id === product.id));

		const totalSold = productSales.reduce((sum, item) => sum + item.quantity, 0);
		const totalRevenue = productSales.reduce((sum, item) => sum + item.price * item.quantity, 0);
		const totalProfit = productSales.reduce(
			(sum, item) => sum + (item.price - product.purchase_price) * item.quantity,
			0
		);

		setProductStats({
			totalSold,
			totalRevenue,
			totalProfit,
		});
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
			<div className="grid grid-cols-1 gap-y-3">
				{paginatedProducts.map((product) => (
					<div
						key={product.id}
						className={`hover:bg-gray-50 ${
							product.is_hidden ? 'opacity-60' : ''
						} border border-gray-100 rounded-lg p-1.5 shadow-md`}
					>
						<div className="grid grid-cols-12">
							<div className="col-span-12">
								<div className="mb-1">
									<p className="text-xs">
										Código: <span className="underline font-medium">{product.code}</span>
									</p>
									<p className="text-base font-medium">{product.name}</p>
								</div>

								<div className="grid grid-cols-12">
									<div
										onClick={() => handleImagePreview(product)}
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
									<div className="col-span-6 flex flex-col justify-center">
										<p className="text-sm">
											Compra:{' '}
											<span className="text-sm font-medium">
												Bs. {product.purchase_price.toFixed(2)}
											</span>
										</p>
										<p className="text-sm">
											Venta:{' '}
											<span className="text-sm font-medium">
												Bs. {product.sale_price.toFixed(2)}
											</span>
										</p>
									</div>
									<div className="col-span-1 flex justify-center items-center">
										<button
											onClick={() => setEditingProduct(product)}
											className="text-indigo-600 hover:text-indigo-900 p-0.5"
										>
											{/* <Edit2 size={18} /> */}
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-lg font-bold ${
													product.stock === 0
														? 'bg-red-100 text-red-800'
														: 'bg-green-100 text-green-800'
												}`}
											>
												{product.stock}
											</span>
										</button>
									</div>
									<div className="col-span-2 flex items-center justify-center pl-2">
										{hasSales[product.id] !== undefined ? (
											hasSales[product.id] ? (
												product.is_hidden ? (
													<button
														onClick={() => handleUnhide(product)}
														className="text-green-600 hover:text-green-900"
													>
														<Eye size={18} />
													</button>
												) : (
													<button
														onClick={() => handleHideClick(product)}
														className="text-yellow-600 hover:text-yellow-900"
													>
														<EyeOff size={18} />
													</button>
												)
											) : (
												<button
													onClick={() => handleDeleteClick(product)}
													className="text-red-600 hover:text-red-900"
												>
													<Trash2 size={18} />
												</button>
											)
										) : (
											// Placeholder while loading
											<div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin"></div>
										)}
									</div>
								</div>
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
									Mostrando{' '}
									<span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a{' '}
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

			{/* Image Preview Modal with Sales Stats */}
			{previewImage && previewProduct && productStats && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
					onClick={() => {
						setPreviewImage(null);
						setPreviewProduct(null);
						setProductStats(null);
					}}
				>
					<div
						className="relative max-w-3xl max-h-[90vh] bg-white rounded-lg p-4"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => {
								setPreviewImage(null);
								setPreviewProduct(null);
								setProductStats(null);
							}}
							className="absolute top-2 right-2 bg-red-500 rounded-full p-0.5 text-white z-10"
						>
							<X size={24} />
						</button>

						<div className="flex flex-col md:flex-row gap-3">
							<div className="flex-1">
								<img
									src={previewImage}
									alt={previewProduct.name}
									className="w-full h-auto object-contain rounded-lg"
								/>
							</div>

							<div className="flex-1">
								<div className="flex items-center gap-4">
									<p className="text-sm text-gray-600">Código: {previewProduct.code}</p>
									<p className="text-xs bg-pink-500 p-1 rounded-lg font-medium text-white">
										{categories.find((c) => c.id === previewProduct.category_id)?.name}
									</p>
								</div>
								<h3 className="text-lg font-semibold mb-1.5">{previewProduct.name}</h3>
								<div className="grid grid-cols-1 gap-3.5 ">
									<div className="bg-blue-50 p-3.5 rounded-lg flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<Package className="text-blue-500" size={24} />
											<p className="text-sm text-blue-600">Unidades Vendidas:</p>
										</div>
										<p className="text-xl font-bold text-blue-700 text-center">
											{productStats.totalSold} de{' '}
											{previewProduct.stock + productStats.totalSold}
											{productStats.totalSold >=
												previewProduct.stock + productStats.totalSold && (
												<p className=" text-xs text-green-600">(¡Todo vendido!)</p>
											)}
										</p>
									</div>

									<div className="bg-green-50 p-3.5 rounded-lg flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<DollarSign className="text-green-500" size={24} />
											<p className="text-sm text-green-600">Total vendido:</p>
										</div>
										<p className="text-xl font-bold text-green-700">
											Bs. {productStats.totalRevenue.toFixed(2)}
										</p>
									</div>

									<div className="bg-purple-50 p-3.5 rounded-lg flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<TrendingUp className="text-purple-500" size={24} />
											<p className="text-sm text-purple-600">Ganancia Neta:</p>
										</div>
										<p className="text-xl font-bold text-purple-700 pr-1">
											Bs. {productStats.totalProfit.toFixed(2)}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
