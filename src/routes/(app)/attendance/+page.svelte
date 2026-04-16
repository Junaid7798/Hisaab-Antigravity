<script lang="ts">
	import { onMount } from 'svelte';
	import { getBusiness, getStaff } from '$lib/db/crud';
	import { markAttendance, getAttendance, createLeaveRequest, getLeaveRequests, approveLeaveRequest, initializeLeaveBalances } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatDate } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import Modal from '$lib/components/Modal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import type { Staff, Attendance, LeaveRequest } from '$lib/db/index';
	import { fade, slide } from 'svelte/transition';

	let staff = $state<Staff[]>([]);
	let attendance = $state<Attendance[]>([]);
	let leaveRequests = $state<LeaveRequest[]>([]);
	let businessId = $state('');
	let loading = $state(true);
	let selectedDate = $state(new Date().toISOString().split('T')[0]);
	let activeTab = $state<'attendance' | 'leave'>('attendance');

	// Leave form
	let showLeaveModal = $state(false);
	let leaveStaffId = $state('');
	let leaveType = $state<LeaveRequest['leave_type']>('casual');
	let leaveStart = $state('');
	let leaveEnd = $state('');
	let leaveReason = $state('');
	let submittingLeave = $state(false);

	const statusConfig = {
		present: { label: 'Present', icon: 'check_circle', color: 'text-green-600 bg-green-50' },
		absent: { label: 'Absent', icon: 'cancel', color: 'text-red-600 bg-red-50' },
		late: { label: 'Late', icon: 'schedule', color: 'text-amber-600 bg-amber-50' },
		leave: { label: 'On Leave', icon: 'event_busy', color: 'text-blue-600 bg-blue-50' }
	};

	const leaveTypeLabels: Record<LeaveRequest['leave_type'], string> = {
		casual: 'Casual Leave',
		sick: 'Sick Leave',
		earned: 'Earned Leave',
		unpaid: 'Unpaid Leave',
		work_from_home: 'Work From Home'
	};

	const leaveStatusConfig = {
		pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
		approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
		rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
	};

	// Map attendance by staffId for quick lookup
	let attendanceMap = $derived(
		new Map(attendance.map(a => [a.staff_id, a]))
	);

	// Stats
	let presentCount = $derived(attendance.filter(a => a.status === 'present').length);
	let absentCount = $derived(attendance.filter(a => a.status === 'absent').length);
	let lateCount = $derived(attendance.filter(a => a.status === 'late').length);
	let onLeaveCount = $derived(attendance.filter(a => a.status === 'leave').length);
	let unmarkedCount = $derived(staff.filter(s => s.is_active && !attendanceMap.has(s.id)).length);

	async function loadData(bizId: string) {
		loading = true;
		businessId = bizId;
		staff = (await getStaff(bizId)).filter(s => s.is_active);
		attendance = await getAttendance(bizId, selectedDate);
		leaveRequests = await getLeaveRequests(bizId);
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) loadData($activeBusinessId);
	});

	async function handleDateChange() {
		if (!businessId) return;
		attendance = await getAttendance(businessId, selectedDate);
	}

	async function handleMark(staffId: string, status: 'present' | 'absent' | 'late' | 'leave') {
		if (!businessId) return;
		try {
			await markAttendance(businessId, staffId, status);
			attendance = await getAttendance(businessId, selectedDate);
			toast.success(`Marked ${status}`);
		} catch {
			toast.error('Failed to mark attendance');
		}
	}

	async function handleMarkAll(status: 'present' | 'absent') {
		if (!businessId) return;
		const unmarked = staff.filter(s => s.is_active && !attendanceMap.has(s.id));
		await Promise.all(unmarked.map(s => markAttendance(businessId, s.id, status)));
		attendance = await getAttendance(businessId, selectedDate);
		toast.success(`Marked all unmarked as ${status}`);
	}

	async function handleLeaveSubmit(e: Event) {
		e.preventDefault();
		if (!leaveStaffId || !leaveStart || !leaveEnd) return;
		submittingLeave = true;
		try {
			await createLeaveRequest(businessId, leaveStaffId, leaveType, leaveStart, leaveEnd, leaveReason);
			leaveRequests = await getLeaveRequests(businessId);
			showLeaveModal = false;
			leaveStaffId = '';
			leaveReason = '';
			toast.success('Leave request submitted');
		} catch {
			toast.error('Failed to submit leave request');
		}
		submittingLeave = false;
	}

	async function handleApproveLeave(id: string, approve: boolean) {
		await approveLeaveRequest(id, 'Admin', approve);
		leaveRequests = await getLeaveRequests(businessId);
		toast.success(approve ? 'Leave approved' : 'Leave rejected');
	}

	function getStaffName(id: string) {
		return staff.find(s => s.id === id)?.name || 'Unknown';
	}
</script>

<svelte:head><title>Attendance | Hisaab</title></svelte:head>

<!-- Header -->
<div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
	<div>
		<h2 class="text-3xl font-headline font-bold text-on-surface">Attendance</h2>
		<p class="text-on-surface-variant font-body mt-1">Track daily attendance and manage leave requests</p>
	</div>
	<div class="flex items-center gap-3">
		<input
			type="date"
			bind:value={selectedDate}
			onchange={handleDateChange}
			class="px-4 py-2 bg-surface-container rounded-xl border-none text-sm font-medium focus:ring-2 focus:ring-primary/20"
		/>
		<button
			onclick={() => { leaveStart = selectedDate; leaveEnd = selectedDate; showLeaveModal = true; }}
			class="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
		>
			<span class="material-symbols-outlined text-base">add</span>
			Leave Request
		</button>
	</div>
</div>

<!-- Tabs -->
<div class="flex bg-surface-container-highest rounded-xl p-1 w-full max-w-xs mb-8">
	<button
		onclick={() => activeTab = 'attendance'}
		class="flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all {activeTab === 'attendance' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}"
	>
		Attendance
	</button>
	<button
		onclick={() => activeTab = 'leave'}
		class="flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all {activeTab === 'leave' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}"
	>
		Leave Requests
		{#if leaveRequests.filter(l => l.status === 'pending').length > 0}
			<span class="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-error text-white rounded-full">
				{leaveRequests.filter(l => l.status === 'pending').length}
			</span>
		{/if}
	</button>
</div>

{#if activeTab === 'attendance'}
	<!-- Stats row -->
	{#if !loading}
		<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8" in:fade={{ duration: 200 }}>
			{#each [
				{ label: 'Present', count: presentCount, color: 'text-green-600', bg: 'bg-green-50' },
				{ label: 'Absent', count: absentCount, color: 'text-red-600', bg: 'bg-red-50' },
				{ label: 'Late', count: lateCount, color: 'text-amber-600', bg: 'bg-amber-50' },
				{ label: 'On Leave', count: onLeaveCount, color: 'text-blue-600', bg: 'bg-blue-50' },
				{ label: 'Unmarked', count: unmarkedCount, color: 'text-on-surface-variant', bg: 'bg-surface-container' }
			] as stat}
				<div class="p-4 {stat.bg} rounded-xl text-center">
					<p class="text-2xl font-extrabold {stat.color}">{stat.count}</p>
					<p class="text-xs font-semibold text-on-surface-variant mt-1">{stat.label}</p>
				</div>
			{/each}
		</div>

		<!-- Bulk actions -->
		{#if unmarkedCount > 0}
			<div class="flex items-center gap-3 mb-6 p-3 bg-surface-container rounded-xl" in:slide={{ duration: 200 }}>
				<span class="text-sm text-on-surface-variant">{unmarkedCount} staff unmarked —</span>
				<button onclick={() => handleMarkAll('present')} class="text-sm font-bold text-green-600 hover:underline">Mark all Present</button>
				<span class="text-on-surface-variant">·</span>
				<button onclick={() => handleMarkAll('absent')} class="text-sm font-bold text-red-600 hover:underline">Mark all Absent</button>
			</div>
		{/if}
	{/if}

	<!-- Staff list -->
	{#if loading}
		<div class="space-y-3">
			{#each Array(4) as _}
				<div class="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
					<Skeleton width="40%" height="1rem" class="mb-2" />
					<Skeleton width="25%" height="0.75rem" />
				</div>
			{/each}
		</div>
	{:else if staff.length === 0}
		<EmptyState
			icon="badge"
			title="No active staff"
			description="Add staff members in the Staff section first."
			actionLabel="Go to Staff"
			actionHref="/staff"
		/>
	{:else}
		<div class="space-y-3">
			{#each staff as member (member.id)}
				{@const record = attendanceMap.get(member.id)}
				<div class="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 flex flex-col sm:flex-row sm:items-center gap-4" in:fade={{ duration: 150 }}>
					<!-- Staff info -->
					<div class="flex items-center gap-3 flex-1 min-w-0">
						<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
							<span class="text-primary font-bold text-sm">{member.name.slice(0, 2).toUpperCase()}</span>
						</div>
						<div class="min-w-0">
							<p class="font-semibold text-on-surface truncate">{member.name}</p>
							<p class="text-xs text-on-surface-variant capitalize">{member.role.replace('_', ' ')}</p>
						</div>
					</div>

					<!-- Current status badge -->
					{#if record}
						<div class="flex items-center gap-2 {statusConfig[record.status].color} px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">{statusConfig[record.status].icon}</span>
							{statusConfig[record.status].label}
							{#if record.check_in}
								<span class="opacity-70 font-normal">· {record.check_in.slice(11, 16)}</span>
							{/if}
						</div>
					{/if}

					<!-- Action buttons -->
					<div class="flex items-center gap-2 flex-wrap">
						{#each (['present', 'late', 'absent', 'leave'] as const) as status}
							<button
								onclick={() => handleMark(member.id, status)}
								class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all border {record?.status === status
									? statusConfig[status].color + ' border-transparent scale-105'
									: 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'}"
							>
								{statusConfig[status].label}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

{:else}
	<!-- Leave Requests Tab -->
	<div in:fade={{ duration: 200 }}>
		{#if loading}
			<div class="space-y-3">
				{#each Array(3) as _}
					<div class="p-4 bg-surface-container-lowest rounded-xl">
						<Skeleton width="50%" height="1rem" class="mb-2" />
						<Skeleton width="30%" height="0.75rem" />
					</div>
				{/each}
			</div>
		{:else if leaveRequests.length === 0}
			<EmptyState
				icon="event_busy"
				title="No leave requests"
				description="No leave requests have been submitted yet."
			/>
		{:else}
			<div class="space-y-3">
				{#each leaveRequests as req (req.id)}
					<div class="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10" in:fade={{ duration: 150 }}>
						<div class="flex flex-col sm:flex-row sm:items-start gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap mb-1">
									<p class="font-semibold text-on-surface">{getStaffName(req.staff_id)}</p>
									<span class="text-xs px-2 py-0.5 rounded-full font-bold {leaveStatusConfig[req.status].color}">
										{leaveStatusConfig[req.status].label}
									</span>
									<span class="text-xs px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full">
										{leaveTypeLabels[req.leave_type]}
									</span>
								</div>
								<p class="text-sm text-on-surface-variant">
									{formatDate(req.start_date)} — {formatDate(req.end_date)}
									<span class="font-semibold text-on-surface"> ({req.days_count} day{req.days_count !== 1 ? 's' : ''})</span>
								</p>
								{#if req.reason}
									<p class="text-sm text-on-surface-variant mt-1 italic">"{req.reason}"</p>
								{/if}
							</div>

							{#if req.status === 'pending'}
								<div class="flex items-center gap-2 flex-shrink-0">
									<button
										onclick={() => handleApproveLeave(req.id, true)}
										class="px-4 py-2 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
									>
										Approve
									</button>
									<button
										onclick={() => handleApproveLeave(req.id, false)}
										class="px-4 py-2 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
									>
										Reject
									</button>
								</div>
							{:else if req.approved_by}
								<p class="text-xs text-on-surface-variant flex-shrink-0">
									by {req.approved_by} · {req.approval_date ? formatDate(req.approval_date.split('T')[0]) : ''}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- Leave Request Modal -->
<Modal show={showLeaveModal} title="New Leave Request" onclose={() => showLeaveModal = false}>
	<form class="p-6 space-y-5" onsubmit={handleLeaveSubmit}>
		<div>
			<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Staff Member</label>
			<select
				bind:value={leaveStaffId}
				required
				class="w-full px-4 py-3 bg-surface-container-highest border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
			>
				<option value="">Select staff...</option>
				{#each staff as s}
					<option value={s.id}>{s.name} — {s.role.replace('_', ' ')}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Leave Type</label>
			<select
				bind:value={leaveType}
				class="w-full px-4 py-3 bg-surface-container-highest border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
			>
				{#each Object.entries(leaveTypeLabels) as [value, label]}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">From</label>
				<input type="date" bind:value={leaveStart} required class="w-full px-4 py-3 bg-surface-container-highest border-none rounded-lg text-sm" />
			</div>
			<div>
				<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">To</label>
				<input type="date" bind:value={leaveEnd} required class="w-full px-4 py-3 bg-surface-container-highest border-none rounded-lg text-sm" />
			</div>
		</div>

		<div>
			<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Reason (optional)</label>
			<textarea
				bind:value={leaveReason}
				rows="3"
				placeholder="Reason for leave..."
				class="w-full px-4 py-3 bg-surface-container-highest border-none rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/20"
			></textarea>
		</div>

		<div class="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
			<button type="button" onclick={() => showLeaveModal = false} class="px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
				Cancel
			</button>
			<button type="submit" disabled={submittingLeave} class="px-5 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-lg disabled:opacity-60">
				{submittingLeave ? 'Submitting...' : 'Submit Request'}
			</button>
		</div>
	</form>
</Modal>
