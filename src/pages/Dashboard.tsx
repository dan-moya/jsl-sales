import { useEffect, useState } from 'react';
import { ShoppingBag, Store, CircleDollarSign, Blocks, Shirt, ShoppingCart, Power } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useProductsStore } from '../store/products';
import { useSalesStore } from '../store/sales';
import { Link, Routes, Route } from 'react-router-dom';
import DashboardStats from '../components/DashboardStats';
import ProductList from '../components/ProductList';
import ProductForm from '../components/ProductForm';
import NewSale from '../components/NewSale';
import Sales from './Sales';

export default function Dashboard() {
	const logout = useAuthStore((state) => state.logout);
	const { loadProducts, loadCategories } = useProductsStore();
	const { loadSales } = useSalesStore();
	const [showNewProduct, setShowNewProduct] = useState(false);
	const [showNewSale, setShowNewSale] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	useEffect(() => {
		loadProducts();
		loadCategories();
		loadSales();
	}, []);

	return (
		<div className="min-h-screen bg-zinc-50">
			<nav className="bg-pink-50 shadow-sm">
				<div className="max-w-scre mx-auto px-0 sm:px-6 lg:px-8">
					<div className="bg-pink-600 relative">
						<h1 className="flex gap-x-2 items-center justify-center">
							<Store className="text-white" size={18} />
							<div className="text-white font-bold flex items-center justify-center gap-x-1 md:text-2xl">
								<span className="text-md">LIS</span>
								<span className="text-md">JSL</span>
							</div>
						</h1>
						<div className='flex items-center absolute top-0.5 right-1.5'>
							<button
								onClick={logout}
								className="bg-amber-200 text-black p-0.5 font-extrabold rounded-full"
								>
								<Power className="" size={16} />
							</button>
						</div>
					</div>

					<div className="flex justify-center h-16">
						<div className="flex items-center justify-center">
							<Link
								to="/"
								className="px-3.5 py-2.5 rounded-md text-base font-medium text-gray-900 hover:bg-pink-200 hover:font-extrabold"
								onClick={() => setIsMenuOpen(false)}
							>
								<div className="flex flex-col items-center">
									<CircleDollarSign className="mr-2" size={20} />
									Ingresos
								</div>
							</Link>
							<Link
								to="/products"
								className="px-3.5 py-2.5 rounded-md text-base font-medium text-gray-900 hover:bg-pink-200 hover:font-extrabold"
								onClick={() => setIsMenuOpen(false)}
							>
								<div className="flex flex-col justify-center items-center">
									<Blocks className="mr-2" size={20} />
									Productos
								</div>
							</Link>
							<Link
								to="/sales"
								className="px-3.5 py-2.5 rounded-md text-base font-medium text-gray-900 hover:bg-pink-200 hover:font-extrabold"
								onClick={() => setIsMenuOpen(false)}
							>
								<div className="flex flex-col justify-center items-center">
									<ShoppingBag className="mr-2" size={20} />
									Ventas
								</div>
							</Link>
						</div>
					</div>

					<div className='flex justify-center pt-3 gap-x-5 bg-zinc-50'>
						<button
							onClick={() => {
								setShowNewProduct(true);
								setIsMenuOpen(false);
							}}
							className="flex items-center px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md"
						>
							<Shirt size={22} />
						</button>
						<button
							onClick={() => {
								setShowNewSale(true);
								setIsMenuOpen(false);
							}}
							className="flex items-center px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
						>
							<ShoppingCart size={22} />
						</button>
					</div>
				</div>
			</nav>

			<main className="max-w-7xl mx-auto pt-4 pb-6 px-4 sm:px-6 lg:px-8 bg-zinc-50">
				{/* <DashboardStats />
                <ProductList /> */}
				<Routes>
					<Route
						path="/"
						element={
							<>
								<DashboardStats />
								{/* <ProductList /> */}
							</>
						}
					/>
					<Route path="/products" element={<ProductList />} />
					<Route path="/sales" element={<Sales />} />
				</Routes>
			</main>

			{showNewProduct && <ProductForm onClose={() => setShowNewProduct(false)} />}

			{showNewSale && <NewSale onClose={() => setShowNewSale(false)} />}
		</div>
	);
}
