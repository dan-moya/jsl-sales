import { useState, useEffect, useId } from 'react';
import { Search } from 'lucide-react';
import { useProductsStore } from '../store/products';
import { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductSearchProps {
	onSelect: (product: Product) => void;
}

export default function ProductSearch({ onSelect }: ProductSearchProps) {
	const searchId = useId();  // Generar ID único para el componente
	const [searchTerm, setSearchTerm] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [showHidden, setShowHidden] = useState(false);
	const { products } = useProductsStore();

	const filteredProducts = products.filter(
		(product) =>
			(product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				product.code.toLowerCase().includes(searchTerm.toLowerCase())) &&
			product.stock > 0 &&
			(showHidden ? true : !product.is_hidden)
	);

	useEffect(() => {
		const handleClickOutside = () => setIsOpen(false);
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, []);

	return (
		<div className="space-y-4">
			<div className="relative" onClick={(e) => e.stopPropagation()}>
				<div className="relative">
					<Search
						className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
						size={20}
					/>
					<input
						type="text"
						id={`${searchId}-search`}  // ID único
						className="pl-10 p-1 w-full rounded-md border-gray-300 shadow-lg focus:border-indigo-500 focus:ring-indigo-500"
						placeholder="Buscar productos..."
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setIsOpen(true);
						}}
						onFocus={() => setIsOpen(true)}
					/>
				</div>

				{isOpen && filteredProducts.length > 0 && (
					<div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto">
						{filteredProducts.map((product) => (
							<button
								key={product.id}
								className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
								onClick={() => {
									onSelect(product);
									setSearchTerm('');
									setIsOpen(false);
								}}
							>
								<div>
									<div className="font-medium">{product.name}</div>
									<div className="text-sm text-gray-500">Código: {product.code}</div>
								</div>
								<div className="text-right">
									<div className="font-medium">Bs. {product.sale_price.toFixed(2)}</div>
									<div className="text-sm text-gray-500">Stock: {product.stock}</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			<div className="flex items-center">
				<label className="inline-flex items-center" htmlFor={`${searchId}-show-hidden`}>
					<input
						type="checkbox"
						id={`${searchId}-show-hidden`}  // ID único
						className="form-checkbox text-indigo-600"
						checked={showHidden}
						onChange={(e) => setShowHidden(e.target.checked)}
					/>
					<span className="ml-2">Mostrar productos ocultos</span>
				</label>
			</div>
		</div>
	);
}
