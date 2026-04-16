<script lang="ts">
	import { onMount } from 'svelte';
	import { getTasks, createTask, updateTaskStatus, deleteTask, getStaff, restoreRecord } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatDate } from '$lib/utils/helpers';
	import type { Task, TaskStatus, TaskPriority, Staff } from '$lib/db/index';
	import { toast } from '$lib/stores/toast';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let tasks = $state<Task[]>([]);
	let staff = $state<Staff[]>([]);
	let loading = $state(true);
	let filter = $state<TaskStatus | 'all'>('all');
	let priorityFilter = $state<TaskPriority | 'all'>('all');
	
	// Modal state
	let showModal = $state(false);
	let newTaskTitle = $state('');
	let newTaskDesc = $state('');
	let newTaskAssigned = $state('');
	let newTaskPriority = $state<TaskPriority>('medium');
	let newTaskDue = $state('');

	const columns: { id: TaskStatus; label: string; color: string }[] = [
		{ id: 'todo', label: 'To Do', color: 'bg-surface-container' },
		{ id: 'in_progress', label: 'In Progress', color: 'bg-blue-500/10' },
		{ id: 'review', label: 'Review', color: 'bg-amber-500/10' },
		{ id: 'done', label: 'Done', color: 'bg-green-500/10' }
	];

	const priorityColors = {
		low: 'bg-gray-500/20 text-gray-600',
		medium: 'bg-blue-500/20 text-blue-600',
		high: 'bg-orange-500/20 text-orange-600',
		urgent: 'bg-red-500/20 text-red-600'
	};

	async function loadData(bizId: string) {
		loading = true;
		tasks = await getTasks(bizId);
		staff = await getStaff(bizId);
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	let filteredTasks = $derived(
		tasks.filter(t => {
			if (filter !== 'all' && t.task_status !== filter) return false;
			if (priorityFilter !== 'all' && t.task_priority !== priorityFilter) return false;
			return true;
		})
	);

	let tasksByStatus = $derived(
		columns.reduce((acc, col) => {
			acc[col.id] = filteredTasks.filter(t => t.task_status === col.id);
			return acc;
		}, {} as Record<TaskStatus, Task[]>)
	);

	async function handleCreateTask() {
		if (!newTaskTitle.trim() || !$activeBusinessId) return;
		
		await createTask($activeBusinessId, newTaskTitle.trim(), newTaskAssigned || '', newTaskPriority, newTaskDue);
		tasks = await getTasks($activeBusinessId);
		
		toast.success('Task created successfully');
		showModal = false;
		newTaskTitle = '';
		newTaskDesc = '';
		newTaskAssigned = '';
		newTaskPriority = 'medium';
		newTaskDue = '';
	}

	async function handleStatusChange(task: Task, newStatus: TaskStatus) {
		await updateTaskStatus(task.id, newStatus);
		tasks = await getTasks($activeBusinessId!);
	}

	let showConfirm = $state(false);
	let taskToDelete = $state<Task | null>(null);

	function handleDelete(task: Task) {
		taskToDelete = task;
		showConfirm = true;
	}

	async function confirmDelete() {
		if (!taskToDelete) return;
		const deletedId = taskToDelete.id;
		await deleteTask(deletedId);
		tasks = await getTasks($activeBusinessId!);
		showConfirm = false;
		taskToDelete = null;
		toast.undoable('Task deleted', async () => {
			await restoreRecord('tasks', deletedId);
			tasks = await getTasks($activeBusinessId!);
		});
	}

	function getStaffName(staffId: string): string {
		const s = staff.find(st => st.id === staffId);
		return s?.name || 'Unassigned';
	}
</script>

<svelte:head>
	<title>Tasks | Hisaab</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
		<div>
			<h2 class="text-3xl font-headline font-bold text-on-surface">Tasks & Projects</h2>
			<p class="text-on-surface-variant mt-1">Manage your team tasks and projects</p>
		</div>
		<button onclick={() => showModal = true} class="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
			<span class="material-symbols-outlined">add</span>
			New Task
		</button>
	</div>

	<!-- Filters -->
	<div class="flex gap-3 mb-6 flex-wrap">
		<select bind:value={filter} class="px-4 py-2 bg-surface-container rounded-lg font-medium">
			<option value="all">All Status</option>
			<option value="todo">To Do</option>
			<option value="in_progress">In Progress</option>
			<option value="review">Review</option>
			<option value="done">Done</option>
		</select>
		<select bind:value={priorityFilter} class="px-4 py-2 bg-surface-container rounded-lg font-medium">
			<option value="all">All Priority</option>
			<option value="low">Low</option>
			<option value="medium">Medium</option>
			<option value="high">High</option>
			<option value="urgent">Urgent</option>
		</select>
	</div>

	<!-- Kanban Board -->
	{#if loading}
		<div class="text-center py-12">
			<span class="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">sync</span>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each columns as col}
				<div class="bg-surface-container-low rounded-2xl p-4 {col.color}">
					<div class="flex items-center justify-between mb-4">
						<h3 class="font-bold text-on-surface">{col.label}</h3>
						<span class="text-sm font-semibold text-on-surface-variant px-2 py-1 bg-surface-container rounded-lg">
							{tasksByStatus[col.id]?.length || 0}
						</span>
					</div>
					
					<div class="space-y-3 min-h-[200px]">
						{#each tasksByStatus[col.id] || [] as task (task.id)}
							<div class="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 hover:shadow-md transition-all">
								<div class="flex items-start justify-between gap-2 mb-2">
									<h4 class="font-semibold text-on-surface">{task.title}</h4>
									<button onclick={() => handleDelete(task)} class="p-1 rounded hover:bg-error-container">
										<span class="material-symbols-outlined text-sm text-on-surface-variant">delete</span>
									</button>
								</div>
								
								{#if task.description}
									<p class="text-sm text-on-surface-variant mb-3 line-clamp-2">{task.description}</p>
								{/if}
								
								<div class="flex items-center justify-between gap-2 flex-wrap">
									<span class="text-xs px-2 py-1 rounded-full {priorityColors[task.task_priority]}">
										{task.task_priority}
									</span>
									<span class="text-xs text-on-surface-variant">
										{getStaffName(task.assigned_to)}
									</span>
								</div>
								
								{#if task.due_date}
									<div class="mt-2 text-xs text-on-surface-variant flex items-center gap-1">
										<span class="material-symbols-outlined text-sm">schedule</span>
										{formatDate(task.due_date)}
									</div>
								{/if}
								
								<!-- Status Actions -->
								<div class="mt-3 pt-3 border-t border-outline-variant/10 flex gap-2">
									{#if col.id !== 'todo'}
										<button onclick={() => handleStatusChange(task, 'todo')} class="text-xs text-on-surface-variant hover:text-on-surface">
											← Back
										</button>
									{/if}
									{#if col.id !== 'done'}
										<button onclick={() => handleStatusChange(task, 'done')} class="text-xs text-primary hover:underline ml-auto">
											Done →
										</button>
									{/if}
								</div>
							</div>
						{/each}
						
						{#if tasksByStatus[col.id]?.length === 0}
							<div class="text-center py-8 text-on-surface-variant/50">
								<span class="material-symbols-outlined text-3xl">inbox</span>
								<p class="text-sm mt-2">No tasks</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- New Task Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
		<div class="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<div class="p-6 border-b border-outline-variant/10">
				<h3 class="text-xl font-headline font-bold">Create New Task</h3>
			</div>
			
			<form onsubmit={(e) => { e.preventDefault(); handleCreateTask(); }} class="p-6 space-y-4">
				<label class="block w-full">
					<span class="block text-sm font-medium mb-1">Task Title *</span>
					<input bind:value={newTaskTitle} type="text" class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3" required />
				</label>
				
				<label class="block w-full">
					<span class="block text-sm font-medium mb-1">Description</span>
					<textarea bind:value={newTaskDesc} rows="3" class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3 resize-none"></textarea>
				</label>
				
				<div class="grid grid-cols-2 gap-4">
					<label class="block w-full">
						<span class="block text-sm font-medium mb-1">Assign To</span>
						<select bind:value={newTaskAssigned} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3">
							<option value="">Unassigned</option>
							{#each staff as s}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</label>
					
					<label class="block w-full">
						<span class="block text-sm font-medium mb-1">Priority</span>
						<select bind:value={newTaskPriority} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3">
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="urgent">Urgent</option>
						</select>
					</label>
				</div>
				
				<label class="block w-full">
					<span class="block text-sm font-medium mb-1">Due Date</span>
					<input bind:value={newTaskDue} type="date" class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3" />
				</label>
				
				<div class="flex gap-3 pt-4">
					<button type="button" onclick={() => showModal = false} class="flex-1 px-4 py-3 bg-surface-container text-on-surface font-bold rounded-xl">
						Cancel
					</button>
					<button type="submit" class="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl">
						Create Task
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmDialog
	show={showConfirm}
	title="Delete Task"
	message="Are you sure you want to delete this task? This cannot be undone."
	confirmText="Delete"
	destructive={true}
	onConfirm={confirmDelete}
	onCancel={() => { showConfirm = false; taskToDelete = null; }}
/>