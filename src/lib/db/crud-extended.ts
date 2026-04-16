import { db, type Attendance, type LeaveRequest, type LeaveBalance, type Task, type TaskStatus, type TaskPriority, type Loan, type Branch, type BOM, type Product } from '$lib/db/index';
import { generateId, now } from '$lib/utils/helpers';

// ─── Attendance & Leave Management ─────────────────────────────────────────

export async function markAttendance(businessId: string, staffId: string, status: 'present' | 'absent' | 'late' | 'leave', checkIn?: string): Promise<Attendance> {
	const today = new Date().toISOString().split('T')[0];
	const existing = await db.attendance.where(['business_id', 'staff_id', 'date']).equals([businessId, staffId, today]).first();
	
	if (existing) {
		await db.attendance.update(existing.id, { status, check_in: checkIn || existing.check_in, last_modified: now() });
		return existing;
	}
	
	const attendance: Attendance = {
		id: generateId(),
		business_id: businessId,
		staff_id: staffId,
		date: today,
		check_in: checkIn || now(),
		check_out: '',
		work_hours: 0,
		late_by_minutes: 0,
		status,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.attendance.add(attendance);
	return attendance;
}

export async function getAttendance(businessId: string, date?: string): Promise<Attendance[]> {
	const targetDate = date || new Date().toISOString().split('T')[0];
	return db.attendance
		.where(['business_id', 'date'])
		.equals([businessId, targetDate])
		.filter(a => !a.is_deleted)
		.toArray();
}

export async function createLeaveRequest(businessId: string, staffId: string, leaveType: LeaveRequest['leave_type'], startDate: string, endDate: string, reason: string): Promise<LeaveRequest> {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
	
	const request: LeaveRequest = {
		id: generateId(),
		business_id: businessId,
		staff_id: staffId,
		leave_type: leaveType,
		start_date: startDate,
		end_date: endDate,
		days_count: days,
		reason,
		status: 'pending',
		approved_by: '',
		approval_date: '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.leave_requests.add(request);
	return request;
}

export async function approveLeaveRequest(id: string, approvedBy: string, approve: boolean): Promise<void> {
	await db.leave_requests.update(id, {
		status: approve ? 'approved' : 'rejected',
		approved_by: approvedBy,
		approval_date: now(),
		last_modified: now()
	});
}

export async function getLeaveRequests(businessId: string, staffId?: string, status?: string): Promise<LeaveRequest[]> {
	let results = await db.leave_requests.where('business_id').equals(businessId).filter(r => !r.is_deleted).toArray();
	if (staffId) results = results.filter(r => r.staff_id === staffId);
	if (status) results = results.filter(r => r.status === status);
	return results.sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export async function initializeLeaveBalances(businessId: string, staffId: string, year: number): Promise<LeaveBalance[]> {
	const balances: LeaveBalance[] = [
		{ id: generateId(), business_id: businessId, staff_id: staffId, leave_type: 'casual', total_days: 12, used_days: 0, available_days: 12, year, is_deleted: false, created_at: now(), last_modified: now() },
		{ id: generateId(), business_id: businessId, staff_id: staffId, leave_type: 'sick', total_days: 10, used_days: 0, available_days: 10, year, is_deleted: false, created_at: now(), last_modified: now() },
		{ id: generateId(), business_id: businessId, staff_id: staffId, leave_type: 'earned', total_days: 15, used_days: 0, available_days: 15, year, is_deleted: false, created_at: now(), last_modified: now() }
	];
	await db.leave_balances.bulkAdd(balances);
	return balances;
}

// ─── Tasks & Projects ───────────────────────────────────────────────────────

export async function createTask(businessId: string, title: string, assignedTo: string, priority: TaskPriority = 'medium', dueDate?: string): Promise<Task> {
	const task: Task = {
		id: generateId(),
		business_id: businessId,
		title,
		description: '',
		assigned_to: assignedTo,
		task_status: 'todo',
		task_priority: priority,
		due_date: dueDate || '',
		completed_at: '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.tasks.add(task);
	return task;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
	const update: any = { task_status: status, last_modified: now() };
	if (status === 'done') {
		update.completed_at = now();
	}
	await db.tasks.update(id, update);
}

export async function getTasks(businessId: string, assignedTo?: string, status?: TaskStatus): Promise<Task[]> {
	let results = await db.tasks.where('business_id').equals(businessId).filter(t => !t.is_deleted).toArray();
	if (assignedTo) results = results.filter(t => t.assigned_to === assignedTo);
	if (status) results = results.filter(t => t.task_status === status);
	return results.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export async function deleteTask(id: string): Promise<void> {
	await db.tasks.update(id, { is_deleted: true, last_modified: now() });
}

// ─── Production/BOM ─────────────────────────────────────────────────────────

export async function createBOM(businessId: string, productId: string, name: string, items: { component_product_id: string; quantity_required: number }[]): Promise<BOM> {
	const bom: BOM = {
		id: generateId(),
		business_id: businessId,
		product_id: productId,
		name,
		items: items.map(i => ({ id: generateId(), product_id: productId, component_product_id: i.component_product_id, quantity_required: i.quantity_required, is_deleted: false })),
		is_active: true,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.bom.add(bom);
	return bom;
}

export async function getBOMs(businessId: string, productId?: string): Promise<BOM[]> {
	let bom = await db.bom.where('business_id').equals(businessId).filter(b => !b.is_deleted && b.is_active).toArray();
	if (productId) bom = bom.filter(b => b.product_id === productId);
	return bom;
}

export async function calculateProductionCost(businessId: string, productId: string, quantity: number): Promise<number> {
	const boms = await getBOMs(businessId, productId);
	if (!boms.length) return 0;
	
	const bom = boms[0];
	const products = await db.products.where('business_id').equals(businessId).filter(p => !p.is_deleted).toArray();
	
	let totalCost = 0;
	for (const item of bom.items) {
		const component = products.find(p => p.id === item.component_product_id);
		if (component) {
			totalCost += (component.purchase_price || 0) * item.quantity_required * quantity;
		}
	}
	return totalCost;
}

// ─── Loans ───────────────────────────────────────────────────────────────────

export async function createLoan(businessId: string, staffId: string, principal: number, interestRate: number, tenureMonths: number): Promise<Loan> {
	const monthlyRate = interestRate / 12 / 100;
	const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
	const totalAmount = emi * tenureMonths;
	const totalInterest = totalAmount - principal;
	
	const startDate = new Date();
	const endDate = new Date();
	endDate.setMonth(endDate.getMonth() + tenureMonths);
	
	const loan: Loan = {
		id: generateId(),
		business_id: businessId,
		staff_id: staffId,
		loan_type: 'personal',
		principal_amount: principal,
		interest_rate: interestRate,
		tenure_months: tenureMonths,
		monthly_emi: Math.round(emi),
		total_interest: Math.round(totalInterest),
		total_amount: Math.round(totalAmount),
		amount_paid: 0,
		amount_remaining: Math.round(totalAmount),
		start_date: startDate.toISOString().split('T')[0],
		end_date: endDate.toISOString().split('T')[0],
		status: 'active',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.loans.add(loan);
	return loan;
}

export async function getLoans(businessId: string, staffId?: string, status?: string): Promise<Loan[]> {
	let results = await db.loans.where('business_id').equals(businessId).filter(l => !l.is_deleted).toArray();
	if (staffId) results = results.filter(l => l.staff_id === staffId);
	if (status) results = results.filter(l => l.status === status);
	return results.sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export async function repayLoan(id: string, amount: number): Promise<void> {
	const loan = await db.loans.get(id);
	if (!loan) return;
	
	const newPaid = loan.amount_paid + amount;
	const newRemaining = loan.amount_remaining - amount;
	
	await db.loans.update(id, {
		amount_paid: newPaid,
		amount_remaining: Math.max(0, newRemaining),
		status: newRemaining <= 0 ? 'completed' : 'active',
		last_modified: now()
	});
}

// ─── Branches ────────────────────────────────────────────────────────────────

export async function createBranch(businessId: string, name: string, address: string, phone: string, email: string, gstin: string): Promise<Branch> {
	const branch: Branch = {
		id: generateId(),
		business_id: businessId,
		name,
		address,
		phone,
		email,
		gstin,
		is_active: true,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.branches.add(branch);
	return branch;
}

export async function getBranches(businessId: string): Promise<Branch[]> {
	return db.branches.where('business_id').equals(businessId).filter(b => !b.is_deleted).toArray();
}

export async function updateBranch(id: string, data: Partial<Branch>): Promise<void> {
	await db.branches.update(id, { ...data, last_modified: now() });
}