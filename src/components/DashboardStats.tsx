import { useState } from 'react';
import { Eye, EyeOff, LineChart as ChartLine, Boxes } from 'lucide-react';
import { useSalesStore } from '../store/sales';
// import { useProductsStore } from '../store/products';
import SalesPDF from './SalesPDF';

export default function DashboardStats() {
	const [showAmounts, setShowAmounts] = useState(true);
	const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'total' | null>(null);
	const {
		todaySales,
		yesterdaySales,
		weekSales,
		monthSales,
		totalSales,
		todaySalesList,
		yesterdaySalesList,
		weekSalesList,
		monthSalesList,
		allSales,
		netProfits,
		productStats
	} = useSalesStore();

	const formatAmount = (amount: number) => {
		if (!showAmounts) return '****';
		return `Bs. ${amount.toFixed(2)}`;
	};

	const getPeriodSales = () => {
		switch (selectedPeriod) {
			case 'today':
				return { title: 'VENTAS DE HOY', sales: todaySalesList };
			case 'yesterday':
				return { title: 'VENTAS DE AYER', sales: yesterdaySalesList };
			case 'week':
				return { title: 'VENTAS DE ESTA SEMANA', sales: weekSalesList };
			case 'month':
				return { title: 'VENTAS DE ESTE MES', sales: monthSalesList };
			case 'total':
				return { title: 'VENTA TOTAL', sales: allSales };
			default:
				return null;
		}
	};

	return (
		<>
			<div className="space-y-6 p-4">
				{/* Sección de Ventas */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<ChartLine size={26} className="text-emerald-500" />
							<h2 className="text-2xl font-bold pl-1 pr-3">Ventas</h2>
						</div>
						<button
							onClick={() => setShowAmounts(!showAmounts)}
							className="text-gray-600 hover:text-gray-800"
						>
							{showAmounts ? <EyeOff size={20} /> : <Eye size={20} />}
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
						{/* HOY */}
						<div className="bg-white rounded-lg p-4 shadow-lg border-t-4 border-amber-400">
							<div className="flex justify-between items-center mb-2">
								<h3 className="font-bold text-lg">HOY</h3>
								<button
									onClick={() => setSelectedPeriod('today')}
									className="text-xs font-semibold bg-amber-500 text-white px-2 py-1 rounded-lg hover:bg-amber-600"
								>
									PDF
								</button>
							</div>
							<div className="space-y-2">
								<p className="flex justify-between">
									<span className="text-gray-600">Vendido:</span>
									<span className="font-semibold">{formatAmount(todaySales)}</span>
								</p>
								<p className="flex justify-between">
									<span className="text-gray-600">Ganancia:</span>
									<span className="font-semibold text-green-600">{formatAmount(netProfits.today)}</span>
								</p>
							</div>
						</div>

						{/* AYER */}
						<div className="bg-white rounded-lg p-4 shadow-lg border-t-4 border-sky-400">
							<div className="flex justify-between items-center mb-2">
								<h3 className="font-bold text-lg">AYER</h3>
								<button
									onClick={() => setSelectedPeriod('yesterday')}
									className="text-xs bg-sky-500 text-white px-2 py-1 rounded hover:bg-sky-600"
								>
									PDF
								</button>
							</div>
							<div className="space-y-2">
								<p className="flex justify-between">
									<span className="text-gray-600">Vendido:</span>
									<span className="font-semibold">{formatAmount(yesterdaySales)}</span>
								</p>
								<p className="flex justify-between">
									<span className="text-gray-600">Ganancia:</span>
									<span className="font-semibold text-green-600">{formatAmount(netProfits.yesterday)}</span>
								</p>
							</div>
						</div>

						{/* ESTA SEMANA */}
						<div className="bg-white rounded-lg p-4 shadow-lg border-t-4 border-purple-400">
							<div className="flex justify-between items-center mb-2">
								<h3 className="font-bold text-lg">ESTA SEMANA</h3>
								<button
									onClick={() => setSelectedPeriod('week')}
									className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
								>
									PDF
								</button>
							</div>
							<div className="space-y-2">
								<p className="flex justify-between">
									<span className="text-gray-600">Vendido:</span>
									<span className="font-semibold">{formatAmount(weekSales)}</span>
								</p>
								<p className="flex justify-between">
									<span className="text-gray-600">Ganancia:</span>
									<span className="font-semibold text-green-600">{formatAmount(netProfits.week)}</span>
								</p>
							</div>
						</div>

						{/* ESTE MES */}
						<div className="bg-white rounded-lg p-4 shadow-lg border-t-4 border-emerald-400">
							<div className="flex justify-between items-center mb-2">
								<h3 className="font-bold text-lg">ESTE MES</h3>
								<button
									onClick={() => setSelectedPeriod('month')}
									className="text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600"
								>
									PDF
								</button>
							</div>
							<div className="space-y-2">
								<p className="flex justify-between">
									<span className="text-gray-600">Vendido:</span>
									<span className="font-semibold">{formatAmount(monthSales)}</span>
								</p>
								<p className="flex justify-between">
									<span className="text-gray-600">Ganancia:</span>
									<span className="font-semibold text-green-600">{formatAmount(netProfits.month)}</span>
								</p>
							</div>
						</div>

						{/* TOTAL */}
						<div className="bg-white rounded-lg p-4 shadow-lg border-t-4 border-fuchsia-400">
							<div className="flex justify-between items-center mb-2">
								<h3 className="font-bold text-lg">TOTAL</h3>
								<button
									onClick={() => setSelectedPeriod('total')}
									className="text-xs bg-fuchsia-500 text-white px-2 py-1 rounded hover:bg-fuchsia-600"
								>
									PDF
								</button>
							</div>
							<div className="space-y-2">
								<p className="flex justify-between">
									<span className="text-gray-600">Vendido:</span>
									<span className="font-semibold">{formatAmount(totalSales)}</span>
								</p>
								<p className="flex justify-between">
									<span className="text-gray-600">Ganancia:</span>
									<span className="font-semibold text-green-600">{formatAmount(netProfits.total)}</span>
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Sección de Productos */}
				<div className="space-y-4">
					<div className="flex items-center">
						<Boxes size={26} className="text-blue-500" />
						<h2 className="text-2xl font-bold pl-1">Productos</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Estadísticas de Productos */}
						<div className="bg-white rounded-lg p-4 shadow-lg">
							<h3 className="font-bold text-lg mb-3">Inventario</h3>
							<div className="space-y-2">
								<div className="">
									<p className="text-gray-700">
										<span className="font-semibold pr-2 text-xl">{productStats.totalStock}</span>Productos en Total.
										</p>
								</div>
								{/* <div className="">
									<p className="text-gray-700">
										<span className="font-semibold pr-2 text-xl">{productStats.uniqueProducts}</span>Productos diferentes.
										</p>
								</div> */}
							</div>
						</div>

						{/* Productos más vendidos */}
						<div className="bg-white rounded-lg p-4 shadow-lg">
							<h3 className="font-bold text-lg mb-3">Más Vendidos</h3>
							<div className="space-y-4">
								{productStats.mostSoldToday && (
									<div className='flex items-center justify-between border-b-2 border-amber-400'>
										<p className="text-gray-600 mb-1 font-medium">Hoy:</p>
										<div className='flex flex-col items-end'>
											<p className="font-semibold">{productStats.mostSoldToday.productName}</p>
											<p className="text-sm text-gray-500">
												Vendidos: {productStats.mostSoldToday.totalQuantity} unidades
											</p>
										</div>
									</div>
								)}
								{productStats.mostSoldThisWeek && (
									<div className='flex items-center justify-between border-b-2 border-purple-400'>
										<p className="text-gray-600 mb-1 font-medium">Esta semana:</p>
										<div className='flex flex-col items-end'>
											<p className="font-semibold">{productStats.mostSoldThisWeek.productName}</p>
											<p className="text-sm text-gray-500">
												Vendidos: {productStats.mostSoldThisWeek.totalQuantity} unidades
											</p>
										</div>
									</div>
								)}
								{productStats.mostSoldThisMonth && (
									<div className='flex items-center justify-between border-b-2 border-emerald-400'>
										<p className="text-gray-600 mb-1 font-medium">Este mes:</p>
										<div className='flex flex-col items-end'>
											<p className="font-semibold">{productStats.mostSoldThisMonth.productName}</p>
											<p className="text-sm text-gray-500">
												Vendidos: {productStats.mostSoldThisMonth.totalQuantity} unidades
											</p>
										</div>
									</div>
								)}
								{productStats.mostSoldOverall && (
									<div className='flex items-center justify-between border-b-2 border-pink-400'>
										<p className="text-gray-600 mb-1 font-medium">General:</p>
										<div className='flex flex-col items-end'>
											<p className="font-semibold">{productStats.mostSoldOverall.productName}</p>
											<p className="text-sm text-gray-500">
												Vendidos: {productStats.mostSoldOverall.totalQuantity} unidades
											</p>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{selectedPeriod && getPeriodSales() && (
				<SalesPDF
					title={getPeriodSales()!.title}
					sales={getPeriodSales()!.sales}
					onClose={() => setSelectedPeriod(null)}
				/>
			)}
		</>
	);
}