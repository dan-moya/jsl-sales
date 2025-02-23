import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Check, Bell } from 'lucide-react';
import { useSalesStore } from '../store/sales';
import { Database } from '../lib/database.types';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import EditSaleDialog from '../components/EditSaleDialog';
import toast from 'react-hot-toast';

type SaleWithItems = Database['public']['Tables']['sales']['Row'] & {
	items: Array<{
		id: string;
		product: Database['public']['Tables']['products']['Row'];
		quantity: number;
		price: number;
	}>;
};

type SortField = 'date' | 'total' | 'payment_method';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function Sales() {
	const { sales, loadSales, deleteSale, updateSale, isOnline, reminders, addReminder, completeReminder } =
		useSalesStore();
	const [reminderNote, setReminderNote] = useState('');
	const [showReminderDialog, setShowReminderDialog] = useState(false);
	const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [showFilters, setShowFilters] = useState(false);
	const [dateRange, setDateRange] = useState({ start: '', end: '' });
	const [paymentMethod, setPaymentMethod] = useState<'ALL' | 'QR' | 'EFECTIVO'>('ALL');
	const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
		field: 'date',
		order: 'desc',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [editingSale, setEditingSale] = useState<SaleWithItems | null>(null);
	const [deleteDialog, setDeleteDialog] = useState<{
		isOpen: boolean;
		sale: SaleWithItems | null;
	}>({
		isOpen: false,
		sale: null,
	});

	useEffect(() => {
		loadSales();
	}, []);

	const handleEditClick = (sale: SaleWithItems) => {
		if (!isOnline) {
			setSelectedSale(sale);
			setShowReminderDialog(true);
		} else {
			setEditingSale(sale);
		}
	};

	const handleAddReminder = async () => {
		if (!selectedSale) return;

		try {
			await addReminder(selectedSale.id, reminderNote);
			toast.success('Recordatorio guardado');
			setShowReminderDialog(false);
			setSelectedSale(null);
			setReminderNote('');
		} catch (error) {
			toast.error('Error al guardar el recordatorio');
		}
	};

	// Filtrar y ordenar ventas
	const filteredSales = sales
		.filter((sale) => {
			const matchesSearch = sale.items.some(
				(item) =>
					item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.product.code.toLowerCase().includes(searchTerm.toLowerCase())
			);

			const matchesPaymentMethod = paymentMethod === 'ALL' || sale.payment_method === paymentMethod;

			const saleDate = new Date(sale.date);
			const matchesDateRange =
				(!dateRange.start || saleDate >= new Date(dateRange.start)) &&
				(!dateRange.end || saleDate <= new Date(dateRange.end));

			return matchesSearch && matchesPaymentMethod && matchesDateRange;
		})
		.sort((a, b) => {
			const order = sortConfig.order === 'asc' ? 1 : -1;

			switch (sortConfig.field) {
				case 'date':
					return (new Date(a.date).getTime() - new Date(b.date).getTime()) * order;
				case 'total':
					return (a.total - b.total) * order;
				case 'payment_method':
					return a.payment_method.localeCompare(b.payment_method) * order;
				default:
					return 0;
			}
		});

	// Calcular paginación
	const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const paginatedSales = filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	// Resetear página cuando cambian los filtros
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, dateRange, paymentMethod, sortConfig]);

	const handleSort = (field: SortField) => {
		setSortConfig((current) => ({
			field,
			order: current.field === field && current.order === 'desc' ? 'asc' : 'desc',
		}));
	};

	const handleDeleteClick = (sale: SaleWithItems) => {
		setDeleteDialog({ isOpen: true, sale });
	};

	const handleConfirmDelete = async () => {
		if (!deleteDialog.sale) return;

		try {
			await deleteSale(deleteDialog.sale.id);
			toast.success('Venta eliminada correctamente');
			setDeleteDialog({ isOpen: false, sale: null });
		} catch (error) {
			console.error('Error al eliminar la venta:', error);
			toast.error('Error al eliminar la venta');
		}
	};

	const handleEditSale = async (updatedSale: SaleWithItems) => {
		try {
			await updateSale(updatedSale);
			toast.success('Venta actualizada correctamente');
			setEditingSale(null);
		} catch (error) {
			console.error('Error al actualizar la venta:', error);
			toast.error('Error al actualizar la venta');
		}
	};

	return (
		<div className="p-4">
			<div className="mb-6">
				<div className="w-full grid grid-cols-12 gap-4 mb-4">
					<div className="col-span-10 flex-1 relative">
						<Search
							className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							placeholder="Buscar por producto o código..."
							className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="col-span-2 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
					>
						<Filter size={20} />
						{/* <span>Filtros</span> */}
					</button>
				</div>

				{showFilters && (
					<div className="p-4 bg-gray-50 rounded-lg space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Fecha inicial
								</label>
								<input
									type="date"
									className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
									value={dateRange.start}
									onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Fecha final</label>
								<input
									type="date"
									className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
									value={dateRange.end}
									onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Método de pago
								</label>
								<select
									className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
									value={paymentMethod}
									onChange={(e) => setPaymentMethod(e.target.value as 'ALL' | 'QR' | 'EFECTIVO')}
								>
									<option value="ALL">Todos</option>
									<option value="EFECTIVO">Efectivo</option>
									<option value="QR">QR</option>
								</select>
							</div>
						</div>
					</div>
				)}
			</div>
			<div className='mb-0.5'>
				<p className="text-sm text-gray-700">
					Mostrando <span className="font-medium">{startIndex + 1}</span> al{' '}
					<span className="font-medium">
						{Math.min(startIndex + ITEMS_PER_PAGE, filteredSales.length)} ventas
					</span>{' '}
					de <span className="font-medium">{filteredSales.length}</span>
				</p>
			</div>

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
									onClick={() => handleSort('date')}
								>
									<div className="flex items-center gap-2">
										Fecha
										<ArrowUpDown size={16} />
									</div>
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Productos
								</th>
								<th
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
									onClick={() => handleSort('payment_method')}
								>
									<div className="flex items-center gap-2">
										Método
										<ArrowUpDown size={16} />
									</div>
								</th>
								<th
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
									onClick={() => handleSort('total')}
								>
									<div className="flex items-center gap-2">
										Total
										<ArrowUpDown size={16} />
									</div>
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-pink-200">
							{paginatedSales.map((sale) => (
								<tr key={sale.id} className="hover:bg-pink-50">
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										<div className="flex flex-col justify-center items-center">
											<p>{new Date(sale.date).toLocaleDateString('es-ES')}</p>
											<p>
												{new Date(sale.date).toLocaleTimeString('en-US', {
													hour: 'numeric',
													minute: '2-digit',
													hour12: true,
												})}
											</p>
										</div>
									</td>
									<td className="px-6 py-4 text-sm text-gray-900">
										<ul className="list-disc list-inside w-52">
											{sale.items.map((item) => (
												<li key={item.id}>
													<span className="font-medium">{item.product.name}</span>
													<span className="italic ml-1">
														({item.quantity} x Bs. {item.price.toFixed(2)})
													</span>
												</li>
											))}
										</ul>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{sale.payment_method}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										Bs. {sale.total.toFixed(2)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<div className="flex justify-end space-x-2">
											{isOnline ? (
												<button
													onClick={() => handleEditClick(sale)}
													className="text-indigo-600 hover:text-indigo-900"
												>
													<Edit2 size={20} />
												</button>
											) : (
												<button
													onClick={() => handleEditClick(sale)}
													className="text-amber-600 hover:text-amber-900"
												>
													<Bell size={20} />
												</button>
											)}
											<button
												onClick={() => handleDeleteClick(sale)}
												className="text-red-600 hover:text-red-900"
											>
												<Trash2 size={20} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{/* Diálogo de recordatorio */}
					{showReminderDialog && (
										<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
											<div className="bg-white rounded-lg max-w-md w-full p-6">
												<h3 className="text-lg font-semibold mb-4">
													Crear recordatorio de edición
												</h3>
												<p className="text-sm text-gray-600 mb-4">
													No hay conexión disponible. Puedes crear un recordatorio para
													editar esta venta cuando vuelvas a estar online.
												</p>
												<textarea
													className="w-full p-2 border rounded-md mb-4"
													placeholder="Nota (opcional)"
													value={reminderNote}
													onChange={(e) => setReminderNote(e.target.value)}
													rows={3}
												/>
												<div className="flex justify-end space-x-3">
													<button
														onClick={() => {
															setShowReminderDialog(false);
															setSelectedSale(null);
															setReminderNote('');
														}}
														className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
													>
														Cancelar
													</button>
													<button
														onClick={handleAddReminder}
														className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
													>
														Guardar recordatorio
													</button>
												</div>
											</div>
										</div>
									)}

									{/* Lista de recordatorios pendientes (mostrar solo cuando hay conexión) */}
									{isOnline && reminders.filter((r) => r.status === 'pending').length > 0 && (
										<div className="fixed bottom-4 right-4">
											<div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
												<h4 className="text-lg font-semibold mb-2">
													Recordatorios pendientes
												</h4>
												<div className="space-y-2">
													{reminders
														.filter((r) => r.status === 'pending')
														.map((reminder) => {
															const sale = sales.find(
																(s) => s.id === reminder.saleId
															);
															return (
																<div
																	key={reminder.id}
																	className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
																>
																	<div>
																		<p className="text-sm font-medium">
																			Venta del{' '}
																			{new Date(
																				sale?.date || ''
																			).toLocaleDateString()}
																		</p>
																		{reminder.note && (
																			<p className="text-xs text-gray-600">
																				{reminder.note}
																			</p>
																		)}
																	</div>
																	<div className="flex space-x-2">
																		<button
																			onClick={() => {
																				if (sale) setEditingSale(sale);
																			}}
																			className="text-indigo-600 hover:text-indigo-900"
																		>
																			<Edit2 size={18} />
																		</button>
																		<button
																			onClick={() =>
																				completeReminder(reminder.id)
																			}
																			className="text-green-600 hover:text-green-900"
																		>
																			<Check size={18} />
																		</button>
																	</div>
																</div>
															);
														})}
												</div>
											</div>
										</div>
									)}
				</div>

				{/* Paginación */}
				<div className="px-6 py-4 flex items-center justify-between border-t">
					<div className="flex-1 flex justify-between sm:hidden">
						<button
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
						>
							Anterior
						</button>
						<button
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
						>
							Siguiente
						</button>
					</div>
					<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p className="text-sm text-gray-700">
								Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
								<span className="font-medium">
									{Math.min(startIndex + ITEMS_PER_PAGE, filteredSales.length)}
								</span>{' '}
								de <span className="font-medium">{filteredSales.length}</span> resultados
							</p>
						</div>
						<div>
							<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
								<button
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									<span className="sr-only">Anterior</span>
									<ChevronLeft className="h-5 w-5" />
								</button>
								{/* Números de página */}
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
								<button
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages}
									className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									<span className="sr-only">Siguiente</span>
									<ChevronRight className="h-5 w-5" />
								</button>
							</nav>
						</div>
					</div>
				</div>
			</div>

			<DeleteConfirmDialog
				isOpen={deleteDialog.isOpen}
				onClose={() => setDeleteDialog({ isOpen: false, sale: null })}
				onConfirm={handleConfirmDelete}
				itemName={`venta del ${
					deleteDialog.sale ? new Date(deleteDialog.sale.date).toLocaleString() : ''
				}`}
				title="Confirmar eliminación de venta"
				message="¿Estás seguro que deseas eliminar esta venta? Esta acción no se puede deshacer."
			/>

			{editingSale && (
				<EditSaleDialog sale={editingSale} onClose={() => setEditingSale(null)} onSave={handleEditSale} />
			)}
		</div>
	);
}
