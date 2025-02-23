import { Minus, Plus, Trash2 } from 'lucide-react';
import { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

interface SaleItem {
	product: Product;
	quantity: number;
}

interface SaleItemListProps {
	items: SaleItem[];
	onUpdateQuantity: (index: number, newQuantity: number) => void;
	onRemoveItem: (index: number) => void;
}

export default function SaleItemList({ items, onUpdateQuantity, onRemoveItem }: SaleItemListProps) {
	return (
		<div className="space-y-0.5">
			{items.map((item, index) => {

            const maxAvailable = item.product.stock;
                return (
                    <div key={index} className='grid grid-cols-12 shadow-sm rounded-sm p-3'>
                        <div className='col-span-11'>
                            <div className="flex flex-col items-start justify-center bg-gray-50 rounded-lg">
                                <div className="flex flex-col">
                                    <h3 className="font-semibold">{item.product.name}</h3>
                                    {/* <p className="text-sm text-gray-500">Bs. {item.product.sale_price.toFixed(2)} c/u</p> */}
                                    <p className="text-sm text-gray-500">Stock restante: {maxAvailable - item.quantity}</p>
                                </div>

                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                                            disabled={item.quantity <= 1}
                                            className="p-1 rounded-full bg-pink-200 hover:bg-pink-400 disabled:opacity-50"
                                        >
                                            <Minus size={20} />
                                        </button>

                                        <input
                                            type="number"
                                            min="1"
                                            max={item.product.stock}
                                            className="w-6 text-center rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value) || 1;
                                                onUpdateQuantity(index, Math.min(item.product.stock, Math.max(1, value)));
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                onUpdateQuantity(index, Math.min(item.product.stock, item.quantity + 1))
                                            }
                                            disabled={item.quantity >= item.product.stock}
                                            className="p-1 rounded-full bg-pink-300 hover:bg-pink-400 disabled:opacity-50"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    <div className="w-24 text-right font-medium">
                                        Bs. {(item.product.sale_price * item.quantity).toFixed(2)}
                                    </div>

                                </div>
                            </div>
                        </div>
                        <div className='col-span-1 flex justify-center items-center'>
                            <button
                                type="button"
                                onClick={() => onRemoveItem(index)}
                                className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                )
            })}
		</div>
	);
}
