import { useEffect } from 'react';
import { generateSalesPDF } from '../utils/pdf';

interface SalesPDFProps {
	title: string;
	sales: Array<{
		date: string;
		total: number;
		items: Array<{
			product: {
                code: string;
				name: string;
				image_url: string | null;
				is_deleted: boolean
			};
			quantity: number;
			price: number;
		}>;
		payment_method: string;
	}>;
	onClose: () => void;
}

export default function SalesPDF({ title, sales }: SalesPDFProps) {
	useEffect(() => {
		const showPDF = async () => {
			try {
				const doc = await generateSalesPDF(title, sales);
				const pdfBlob = doc.output('blob');
				const pdfUrl = URL.createObjectURL(pdfBlob);
				window.open(pdfUrl, '_blank');
			} catch (error) {
				console.error('Error al generar PDF:', error);
			}
		};

		showPDF();
	}, [title, sales]);

	return null;
}
