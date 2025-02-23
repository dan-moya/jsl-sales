import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type SaleItem = {
	product: {
		name: string;
		code?: string | null;
		purchase_price?: number | null;
	};
	quantity: number;
	price: number;
};

type Sale = {
	date: string;
	total: number;
	items: SaleItem[];
	payment_method: string;
};

function groupSalesByPeriod(sales: Sale[]) {
	return sales.reduce((acc, sale) => {
		const date = new Date(sale.date);
		const year = date.getFullYear();
		const month = date.getMonth();

		if (!acc[year]) {
			acc[year] = {};
		}
		if (!acc[year][month]) {
			acc[year][month] = [];
		}

		acc[year][month].push(sale);
		return acc;
	}, {} as Record<number, Record<number, Sale[]>>);
}

const MONTHS = [
	'ENERO',
	'FEBRERO',
	'MARZO',
	'ABRIL',
	'MAYO',
	'JUNIO',
	'JULIO',
	'AGOSTO',
	'SEPTIEMBRE',
	'OCTUBRE',
	'NOVIEMBRE',
	'DICIEMBRE',
];

export async function generateSalesPDF(title: string, sales: Sale[]) {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.width;
	const pageHeight = doc.internal.pageSize.height;
	const margin = 20;
	let yPos = margin;

	// Encabezado
	doc.setFontSize(20);
    doc.setTextColor('#EC4899')
    doc.setFont('calibri', 'bold')
	doc.text('REPORTE DE VENTAS - LIS JSL', pageWidth / 2, yPos, { align: 'center' });

	yPos += 15;
	doc.setFontSize(12);
	const now = new Date();
    doc.setTextColor('#212f3d')
    doc.setFont('calibri', 'normal')
	doc.text(`FECHA DE CONSULTA:`,margin, yPos);
    doc.setFont('calibri', 'bold')
	doc.text(`${now.toLocaleDateString("es-ES", {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })}`, 67, yPos);
    doc.setFont('calibri', 'normal')
    doc.text(`Hora:`, 158, yPos);
    doc.setFont('calibri', 'bold')
    doc.text(`${now.toLocaleTimeString("en-US")}`, 170, yPos);
    doc.setFont('calibri', 'bold')

	yPos += 12;
	doc.setFontSize(14);
    doc.setTextColor('#BE185D')
	doc.text(title, margin, yPos);
	yPos += 6;

	if (title.includes('TOTAL')) {
		// Para reporte total, agrupar por año y mes
		const groupedSales = groupSalesByPeriod(sales);

		for (const year of Object.keys(groupedSales).sort().reverse()) {
			if (yPos > pageHeight - 40) {
				doc.addPage();
				yPos = margin;
			}

			doc.setFontSize(16);
			doc.text(`AÑO ${year}`, margin, yPos);
			yPos += 10;

			for (const month of Object.keys(groupedSales[Number(year)]).sort()) {
				const monthSales = groupedSales[Number(year)][Number(month)];

				if (yPos > pageHeight - 40) {
					doc.addPage();
					yPos = margin;
				}

				doc.setFontSize(14);
				doc.text(MONTHS[Number(month)], margin, yPos);
				yPos += 10;

				await generateSalesTable(doc, monthSales, yPos);
				yPos = (doc as any).lastAutoTable.finalY + 20;
			}
		}
	} else {
		// Para reportes diarios o mensuales
		await generateSalesTable(doc, sales, yPos);
	}

	return doc;
}

async function generateSalesTable(doc: jsPDF, sales: Sale[], startY: number) {
	const tableData = [];
	let totalVentas = 0;
	let totalCostos = 0;

	for (const sale of sales) {
		for (const item of sale.items) {
			const date = new Date(sale.date);
			const subtotal = item.quantity * item.price;
			const costoTotal = item.quantity * (item.product?.purchase_price || 0);

			totalVentas += subtotal;
			totalCostos += costoTotal;

			// Mostramos el código y nombre original del producto, sin modificaciones
			const productCode = item.product?.code?.split('--')[0] || 'N/A';
			const productName = item.product?.name?.split(' (eliminado')[0] || 'N/A';

			tableData.push([
				`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
				productCode,
				productName,
				item.quantity,
				`Bs. ${item.price.toFixed(2)}`,
				`Bs. ${subtotal.toFixed(2)}`,
				sale.payment_method,
			]);
		}
	}

	autoTable(doc, {
		startY,
		head: [['Fecha y Hora', 'Código', 'Producto', 'Cantidad', 'Precio', 'Subtotal', 'Método']],
        headStyles: {
            fillColor: '#EC4899'
        },
		body: tableData,
		styles: {
			overflow: 'linebreak',
			cellPadding: 2,
			fontSize: 8,
            halign: 'center'
		},
		columnStyles: {
			0: { cellWidth: 30 },
			1: { cellWidth: 20, halign: 'center' },
			2: { cellWidth: 40 },
			3: { cellWidth: 17, halign: 'center' },
			4: { cellWidth: 20, halign: 'center' },
			5: { cellWidth: 25, halign: 'center' },
			6: { cellWidth: 20, halign: 'center' },
		},
		margin: { left: 20, right: 20 },
		didDrawPage: function (data) {
			if (data.settings.margin) {
				data.settings.margin.top = 20;
				data.settings.margin.bottom = 20;
			}
		},
	});

	const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setTextColor('#212f3d')
	doc.setFontSize(9);
    doc.setFont('calibri', 'bold')
	doc.text(`Total de Ventas: Bs.`, 20, finalY);
	doc.setFontSize(12);
	doc.text(`${totalVentas.toFixed(2)}`, 50, finalY);
	doc.setFontSize(9);
	doc.text(`Ganancia Neta: Bs. `, 20, finalY + 7);
	doc.setFontSize(12);
	doc.text(`${(totalVentas - totalCostos).toFixed(2)}`, 50, finalY + 7);
}
