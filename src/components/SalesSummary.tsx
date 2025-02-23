import { X } from 'lucide-react';
import { Database } from '../lib/database.types';

type SaleWithItems = Database['public']['Tables']['sales']['Row'] & {
	items: Array<
		Database['public']['Tables']['sale_items']['Row'] & {
			product: Database['public']['Tables']['products']['Row'];
		}
	>;
};

interface SalesSummaryProps {
	title: string;
	sales: SaleWithItems[];
	onClose: () => void;
}

export default function SalesSummary({ title, sales, onClose }: SalesSummaryProps) {
	const total = sales.reduce((sum, sale) => sum + sale.total, 0);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg max-w-4xl w-full p-6">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-2xl font-bold">{title}</h2>
					<button onClick={onClose} className="text-gray-500 hover:text-gray-700">
						<X size={24} />
					</button>
				</div>

				<div className="overflow-auto max-h-[60vh]">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Fecha
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Productos
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Método
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Total
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{sales.map((sale) => (
								<tr key={sale.id}>
									<td className="px-6 py-4 whitespace-nowrap">
										{new Date(sale.date).toLocaleString()}
									</td>
									<td className="px-6 py-4">
										<ul className="list-disc list-inside">
											{sale.items.map((item) => (
												<li key={item.id}>
													{item.product.name} ({item.quantity} x Bs.{' '}
													{item.price.toFixed(2)})
												</li>
											))}
										</ul>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">{sale.payment_method}</td>
									<td className="px-6 py-4 whitespace-nowrap font-medium">
										Bs. {sale.total.toFixed(2)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="mt-6 text-right text-2xl font-bold">Total: Bs. {total.toFixed(2)}</div>
			</div>
		</div>
	);
}
