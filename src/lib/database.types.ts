export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			categories: {
				Row: {
					id: string;
					name: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					created_at?: string;
				};
			};
			products: {
				Row: {
					id: string;
					code: string;
					name: string;
					category_id: string;
					purchase_price: number;
					sale_price: number;
					stock: number;
					image_url: string | null;
					created_at: string;
					is_hidden: boolean;
					pending_stock_changes?: number;
				};
				Insert: {
					id?: string;
					code: string;
					name: string;
					category_id: string;
					purchase_price: number;
					sale_price: number;
					stock: number;
					image_url?: string | null;
					created_at?: string;
					is_hidden?: boolean;
					pending_stock_changes?: number;
				};
				Update: {
					id?: string;
					code?: string;
					name?: string;
					category_id?: string;
					purchase_price?: number;
					sale_price?: number;
					stock?: number;
					image_url?: string | null;
					created_at?: string;
					is_hidden?: boolean;
					pending_stock_changes?: number;
				};
			};
			sales: {
				Row: {
					id: string;
					date: string;
					payment_method: 'QR' | 'EFECTIVO';
					total: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					date?: string;
					payment_method: 'QR' | 'EFECTIVO';
					total: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					date?: string;
					payment_method?: 'QR' | 'EFECTIVO';
					total?: number;
					created_at?: string;
				};
			};
			sale_items: {
				Row: {
					id: string;
					sale_id: string;
					product_id: string;
					quantity: number;
					price: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					sale_id: string;
					product_id: string;
					quantity: number;
					price: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					sale_id?: string;
					product_id?: string;
					quantity?: number;
					price?: number;
					created_at?: string;
				};
			};
		};
	};
}
