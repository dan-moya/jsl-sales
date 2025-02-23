import { X } from 'lucide-react';

interface SyncProgressProps {
	progress: number;
	message: string;
	isVisible: boolean;
	onClose?: () => void;
}

export default function SyncProgress({ progress, message, isVisible, onClose }: SyncProgressProps) {
	if (!isVisible) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md relative">
				{onClose && (
					<button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
						<X size={20} />
					</button>
				)}

				<h3 className="text-lg font-semibold mb-4">{message}</h3>

				<div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
					<div
						className="h-full bg-pink-500 rounded-full transition-all duration-300 ease-in-out"
						style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
					/>
				</div>

				<p className="text-center text-sm text-gray-600">{progress.toFixed(0)}% completado</p>
			</div>
		</div>
	);
}
