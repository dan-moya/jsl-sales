import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	itemName: string;
	hasSales?: boolean;
	title?: string;
	message?: string;
	confirmText?: string;
}

export default function DeleteConfirmDialog({
	isOpen,
	onClose,
	onConfirm,
	itemName,
	hasSales,
	title = 'Confirmar eliminación',
	message = `¿Estás seguro que deseas eliminar el producto: `,
	confirmText = 'Eliminar',
}: DeleteConfirmDialogProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-lg max-w-md w-full p-6 transform transition-all scale-100 animate-in fade-in duration-200">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
						<X size={20} />
					</button>
				</div>

				<div className="mb-6">
					{hasSales ? (
						<div className="bg-yellow-50 text-yellow-800 p-4 rounded-md mb-4">
							<div className="flex items-center mb-2">
								<AlertTriangle className="mr-2" size={20} />
								<span className="font-semibold">Advertencia</span>
							</div>
							<p className="text-sm mb-2">
								El producto <span className="font-semibold">{itemName}</span> tiene ventas
								registradas.
							</p>
							<p className="text-sm">
								No es posible eliminar productos con ventas registradas. Puedes ocultarlo en su
								lugar.
							</p>
						</div>
					) : (
						<div className="bg-red-50 text-red-800 p-4 rounded-md mb-4">
							<p className="text-sm">
								{message} <span className="text-base font-semibold">{itemName}</span>?
							</p>
							{confirmText === 'Eliminar' && (
								<p className="text-xs mt-2">Esta acción no se puede deshacer.</p>
							)}
						</div>
					)}
				</div>

				<div className="flex sm:flex-row justify-end gap-3">
					{!hasSales && (
						<button
							onClick={onConfirm}
							className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
						>
							{confirmText}
						</button>
					)}
                    <button
						onClick={onClose}
						className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	);
}
