import type { Staff, StaffSalary, Attendance } from '$lib/db/index';

export interface PayrollCalculation {
	staffId: string;
	staffName: string;
	month: number;
	year: number;
	basicSalary: number;
	workingDays: number;
	presentDays: number;
	absentDays: number;
	lateDays: number;
	leaveDays: number;
	absentDeduction: number;
	lateDeduction: number;
	grossSalary: number;
}

/**
 * Calculate working days in a given month/year (Mon–Sat, 26 days standard)
 * Returns actual calendar Mon–Sat count for the month.
 */
export function getWorkingDaysInMonth(month: number, year: number): number {
	const daysInMonth = new Date(year, month, 0).getDate();
	let count = 0;
	for (let d = 1; d <= daysInMonth; d++) {
		const day = new Date(year, month - 1, d).getDay();
		if (day !== 0) count++; // exclude Sundays
	}
	return count;
}

/**
 * Calculate payroll for a staff member for a given month from their attendance records.
 *
 * Deduction logic:
 * - Each absent day deducts: basicSalary / workingDays
 * - Each late day deducts: (basicSalary / workingDays) * 0.5  (half-day deduction)
 * - Leave days are not deducted (approved paid leave)
 */
export function calculatePayroll(
	staff: Staff,
	month: number,
	year: number,
	attendanceRecords: Attendance[]
): PayrollCalculation {
	const workingDays = getWorkingDaysInMonth(month, year);
	const perDayRate = staff.basic_salary / workingDays;

	const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
	const absentDays = attendanceRecords.filter(a => a.status === 'absent').length;
	const lateDays = attendanceRecords.filter(a => a.status === 'late').length;
	const leaveDays = attendanceRecords.filter(a => a.status === 'leave').length;

	const absentDeduction = Math.round(absentDays * perDayRate);
	const lateDeduction = Math.round(lateDays * perDayRate * 0.5);
	const grossSalary = Math.max(0, staff.basic_salary - absentDeduction - lateDeduction);

	return {
		staffId: staff.id,
		staffName: staff.name,
		month,
		year,
		basicSalary: staff.basic_salary,
		workingDays,
		presentDays,
		absentDays,
		lateDays,
		leaveDays,
		absentDeduction,
		lateDeduction,
		grossSalary
	};
}

/**
 * Build a StaffSalary record (without id/timestamps) from a PayrollCalculation.
 * The caller is responsible for saving to DB.
 */
export function buildSalaryRecord(
	businessId: string,
	calc: PayrollCalculation,
	bonus = 0,
	extraDeductions = 0,
	paymentMethod: StaffSalary['payment_method'] = 'cash',
	remarks = ''
): Omit<StaffSalary, 'id' | 'created_at' | 'last_modified'> {
	const netSalary = Math.max(0, calc.grossSalary + bonus - extraDeductions);
	return {
		business_id: businessId,
		staff_id: calc.staffId,
		month: calc.month,
		year: calc.year,
		basic_salary: calc.basicSalary,
		bonus,
		deductions: calc.absentDeduction + calc.lateDeduction + extraDeductions,
		net_salary: netSalary,
		payment_date: new Date().toISOString().split('T')[0],
		payment_method: paymentMethod,
		remarks,
		is_deleted: false
	};
}

export function formatMonthYear(month: number, year: number): string {
	return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}
