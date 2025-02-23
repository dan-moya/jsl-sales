/* import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.types';

type Product = Database['public']['Tables']['products']['Row'] & {
	pending_image?: string | null;
	pending_stock_changes?: number;
};
type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export interface PendingOperation {
	id: string;
	type: 'create' | 'update' | 'delete' | 'stock_update';
	table: string;
	data: any;
	timestamp: number;
	status: 'pending' | 'processing' | 'error';
	error?: string;
	retryCount: number;
	priority: number;
	parentId?: string;
	groupId?: string; // Nuevo campo para agrupar operaciones relacionadas
}

type OperationType = PendingOperation['type'];

interface TypeOrder {
	delete: number;
	update: number;
	create: number;
	stock_update: number;
}

export class OfflineDB extends Dexie {
	products!: Table<Product>;
	sales!: Table<Sale>;
	saleItems!: Table<SaleItem & { product?: Product }>;
	categories!: Table<Category>;
	pendingOperations!: Table<PendingOperation>;

	constructor() {
		super('OfflineDB');
		this.version(6).stores({
			products: 'id, code, name, category_id, is_hidden, pending_stock_changes',
			sales: 'id, date',
			saleItems: 'id, sale_id, product_id',
			categories: 'id, name',
			pendingOperations: 'id, type, table, status, timestamp, priority, parentId, groupId',
		});
	}

	async addPendingOperation(
		type: PendingOperation['type'],
		table: string,
		data: any,
		priority: number = 0,
		parentId?: string,
		groupId?: string // Nuevo parámetro opcional
	) {
		const operation: PendingOperation = {
			id: uuidv4(),
			type,
			table,
			data,
			timestamp: Date.now(),
			status: 'pending',
			retryCount: 0,
			priority,
			parentId,
			groupId: groupId || uuidv4(), // Si no se proporciona, crear uno nuevo
		};
		await this.pendingOperations.add(operation);
		console.log(`[DB] Nueva operación pendiente:`, {
			id: operation.id,
			type,
			table,
			priority,
			parentId,
			groupId: operation.groupId,
		});
	}

	async getFailedOperations() {
		return this.pendingOperations.where('status').equals('error').toArray();
	}

	async getPendingOperations() {
		const operations = await this.pendingOperations
			.where('status')
			.equals('pending')
			.toArray();

		// Ordenar por:
		// 1. Grupo (mantener operaciones relacionadas juntas)
		// 2. Prioridad (mayor a menor)
		// 3. Tipo de operación (delete > update > create)
		// 4. Timestamp (más antiguos primero)
		return operations.sort((a, b) => {
			// Primero por grupo
			if (a.groupId !== b.groupId) {
				return a.groupId!.localeCompare(b.groupId!);
			}

			// Luego por prioridad
			if (b.priority !== a.priority) {
				return b.priority - a.priority;
			}

			// Luego por tipo de operación
			const typeOrder: TypeOrder = {
				delete: 3,
				update: 2,
				create: 1,
				stock_update: 0,
			};

			const typeA = typeOrder[a.type as keyof TypeOrder];
			const typeB = typeOrder[b.type as keyof TypeOrder];

			if (typeA !== typeB) {
				return typeB - typeA;
			}

			// Finalmente por timestamp
			return a.timestamp - b.timestamp;
		});
	}

	async updateOperationStatus(id: string, status: PendingOperation['status'], error?: string) {
		await this.pendingOperations.update(id, {
			status,
			error,
			retryCount: status === 'error' ? (await this.pendingOperations.get(id))!.retryCount + 1 : 0,
		});
		console.log(`[DB] Estado de operación actualizado:`, { id, status, error });
	}

	async clearAllData() {
		await this.transaction(
			'rw',
			this.products,
			this.sales,
			this.saleItems,
			this.categories,
			this.pendingOperations,
			async () => {
				await this.products.clear();
				await this.sales.clear();
				await this.saleItems.clear();
				await this.categories.clear();
				await this.pendingOperations.clear();
			}
		);
	}
}

export const db = new OfflineDB(); */

/* import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.types';

type Product = Database['public']['Tables']['products']['Row'] & {
	pending_image?: string | null;
	pending_stock_changes?: number;
};
type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export interface PendingOperation {
	id: string;
	type: 'create' | 'update' | 'delete' | 'stock_update';
	table: string;
	data: any;
	timestamp: number;
	status: 'pending' | 'processing' | 'error';
	error?: string;
	retryCount: number;
	priority: number;
	parentId?: string;
	groupId?: string;
}

export class OfflineDB extends Dexie {
	products!: Table<Product>;
	sales!: Table<Sale>;
	saleItems!: Table<SaleItem & { product?: Product }>;
	categories!: Table<Category>;
	pendingOperations!: Table<PendingOperation>;

	constructor() {
		super('OfflineDB');
		this.version(6).stores({
			products: 'id, code, name, category_id, is_hidden, pending_stock_changes',
			sales: 'id, date',
			saleItems: 'id, sale_id, product_id',
			categories: 'id, name',
			pendingOperations: 'id, type, table, status, timestamp, priority, parentId, groupId',
		});
	}

	async addPendingOperation(
		type: PendingOperation['type'],
		table: string,
		data: any,
		priority: number = 0,
		parentId?: string,
		groupId?: string
	) {
		const operation: PendingOperation = {
			id: uuidv4(),
			type,
			table,
			data,
			timestamp: Date.now(),
			status: 'pending',
			retryCount: 0,
			priority,
			parentId,
			groupId: groupId || uuidv4(),
		};
		await this.pendingOperations.add(operation);
		console.log(`[DB] Nueva operación pendiente:`, {
			id: operation.id,
			type,
			table,
			priority,
			parentId,
			groupId: operation.groupId,
		});
	}

	async getFailedOperations() {
		return this.pendingOperations.where('status').equals('error').toArray();
	}

	async getPendingOperations() {
		const operations = await this.pendingOperations
			.where('status')
			.equals('pending')
			.toArray();

		// Ordenar por:
		// 1. Grupo (mantener operaciones relacionadas juntas)
		// 2. Prioridad (mayor a menor)
		// 3. Tipo y tabla
		return operations.sort((a, b) => {
			// Primero por grupo
			if (a.groupId !== b.groupId) {
				return a.groupId!.localeCompare(b.groupId!);
			}

			// Luego por prioridad
			if (b.priority !== a.priority) {
				return b.priority - a.priority;
			}

			// Finalmente por tipo y tabla
			const getTypeScore = (op: PendingOperation) => {
				if (op.table === 'sales') {
					return op.type === 'create' ? 4 : op.type === 'update' ? 3 : 2;
				} else {
					// sale_items
					return op.type === 'delete' ? 5 : op.type === 'create' ? 1 : 0;
				}
			};

			const scoreA = getTypeScore(a);
			const scoreB = getTypeScore(b);

			if (scoreA !== scoreB) {
				return scoreB - scoreA;
			}

			// Si todo es igual, usar timestamp
			return a.timestamp - b.timestamp;
		});
	}

	async updateOperationStatus(id: string, status: PendingOperation['status'], error?: string) {
		await this.pendingOperations.update(id, {
			status,
			error,
			retryCount: status === 'error' ? (await this.pendingOperations.get(id))!.retryCount + 1 : 0,
		});
		console.log(`[DB] Estado de operación actualizado:`, { id, status, error });
	}

	async clearAllData() {
		await this.transaction(
			'rw',
			this.products,
			this.sales,
			this.saleItems,
			this.categories,
			this.pendingOperations,
			async () => {
				await this.products.clear();
				await this.sales.clear();
				await this.saleItems.clear();
				await this.categories.clear();
				await this.pendingOperations.clear();
			}
		);
	}
}

export const db = new OfflineDB(); */

import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.types';

type Product = Database['public']['Tables']['products']['Row'] & {
	pending_image?: string | null;
	pending_stock_changes?: number;
};
type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export interface SaleReminder {
	id: string;
	saleId: string;
	note?: string;
	createdAt: string;
	status: 'pending' | 'completed';
}
export interface PendingOperation {
	id: string;
	type: 'create' | 'update' | 'delete' | 'stock_update';
	table: string;
	data: any;
	timestamp: number;
	status: 'pending' | 'processing' | 'error';
	error?: string;
	retryCount: number;
	priority: number;
	parentId?: string;
	groupId?: string;
}

export class OfflineDB extends Dexie {
	products!: Table<Product>;
	sales!: Table<Sale>;
	saleItems!: Table<SaleItem & { product?: Product }>;
	categories!: Table<Category>;
	pendingOperations!: Table<PendingOperation>;
	saleReminders!: Table<SaleReminder>;

	constructor() {
		super('OfflineDB');
		this.version(6).stores({
			products: 'id, code, name, category_id, is_hidden, pending_stock_changes',
			sales: 'id, date',
			saleItems: 'id, sale_id, product_id',
			categories: 'id, name',
			pendingOperations: 'id, type, table, status, timestamp, priority, parentId, groupId',
			saleReminders: 'id, saleId, status, createdAt'
		});
	}

	async addPendingOperation(
		type: PendingOperation['type'],
		table: string,
		data: any,
		priority: number = 0,
		parentId?: string,
		groupId?: string
	) {
		const operation: PendingOperation = {
			id: uuidv4(),
			type,
			table,
			data,
			timestamp: Date.now(),
			status: 'pending',
			retryCount: 0,
			priority,
			parentId,
			groupId: groupId || uuidv4(),
		};
		await this.pendingOperations.add(operation);
		console.log(`[DB] Nueva operación pendiente:`, {
			id: operation.id,
			type,
			table,
			priority,
			parentId,
			groupId: operation.groupId,
		});
	}

	async getFailedOperations() {
		return this.pendingOperations.where('status').equals('error').toArray();
	}

	async getPendingOperations() {
		const operations = await this.pendingOperations
			.where('status')
			.equals('pending')
			.toArray();

		// Ordenar operaciones por:
		// 1. Prioridad (mayor a menor)
		// 2. Tabla (productos primero)
		// 3. Tipo de operación
		// 4. Timestamp (más antiguas primero)
		return operations.sort((a, b) => {
			// Primero por prioridad
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}

			// Luego por tabla (productos primero)
			if (a.table !== b.table) {
				if (a.table === 'products') return -1;
				if (b.table === 'products') return 1;
				return a.table.localeCompare(b.table);
			}

			// Luego por tipo de operación
			if (a.type !== b.type) {
				const typeOrder = { create: 1, update: 2, delete: 3, stock_update: 0 };
				return typeOrder[a.type] - typeOrder[b.type];
			}

			// Finalmente por timestamp
			return a.timestamp - b.timestamp;
		});
	}

	async updateOperationStatus(id: string, status: PendingOperation['status'], error?: string) {
        await this.pendingOperations.update(id, {
            status,
            error,
            retryCount: status === 'error' ? (await this.pendingOperations.get(id))!.retryCount + 1 : 0,
        });
        console.log(`[DB] Estado de operación actualizado:`, { id, status, error });
    }

	async clearAllData() {
        await this.transaction(
            'rw',
            [this.products, this.sales, this.saleItems, this.categories, this.pendingOperations],
            async () => {
                await this.products.clear();
                await this.sales.clear();
                await this.saleItems.clear();
                await this.categories.clear();
                await this.pendingOperations.clear();
            }
        );
    }
}

export const db = new OfflineDB();