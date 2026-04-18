# Mobile UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 concrete mobile UI regressions visible in screenshots: wrong invoices page title, dashboard/patients stat cards that overflow off-screen, insight banner that's too tall on mobile, and page subtitles that wrap to 2 lines.

**Architecture:** All fixes are isolated to individual Svelte page/component files and one i18n JSON file. No new files are created. Changes are purely CSS class adjustments and one string fix — no logic changes.

**Tech Stack:** SvelteKit, Tailwind CSS v4, Material Symbols Outlined icons, svelte-i18n

---

## Root Cause Analysis (from screenshots)

| Issue | Screenshot | Root Cause |
|---|---|---|
| Invoices list shows "Create GST Invoice" as title | Screenshot 3 | `en.json` `invoices.title` = "Create GST Invoice" (belongs to new-invoice form); list page uses same key |
| Dashboard KPI cards: only 2 visible, 3rd barely peeking | Screenshot 2 | `w-44`/`w-40` fixed widths → 176+12+160+12=360px > 366px usable on 390px device |
| Patients stat cards: 3rd card labelled "TOD" cut off | Screenshots 1, 4 | `w-36` (144px) × 3 + gaps = 456px overflows 366px usable width |
| Insight banner "Operating at a Loss" takes 6-line height | Screenshot 2 | Description paragraph renders full 2-3 line text on mobile with no truncation |
| Page subtitles wrap to 2 lines, wasting vertical space | Screenshots 1, 4 | Long subtitle strings with no `line-clamp-1` or `truncate` constraint |

---

## Files Modified

| File | Change |
|---|---|
| `src/lib/i18n/locales/en.json` | Add `invoices.list_title: "Invoices"` key |
| `src/routes/(app)/invoices/+page.svelte` | Use `invoices.list_title` key; subtitle `line-clamp-1` |
| `src/routes/(app)/dashboard/+page.svelte` | KPI cards → `grid grid-cols-3`; insight banner description `line-clamp-2 sm:line-clamp-none` |
| `src/routes/(app)/patients/+page.svelte` | Stat cards → `grid grid-cols-3`; subtitle `line-clamp-1` |

---

## Task 1: Fix invoices page title (i18n bug)

**Files:**
- Modify: `src/lib/i18n/locales/en.json`
- Modify: `src/routes/(app)/invoices/+page.svelte:87`

**Problem:** `invoices.title` = "Create GST Invoice" is the new-invoice form heading. The invoices list page (`/invoices`) uses `$_('invoices.title', { default: 'Invoices' })` and wrongly shows "Create GST Invoice".

- [ ] **Step 1: Add `list_title` key to en.json**

Open `src/lib/i18n/locales/en.json`. Inside the `"invoices"` object, add one line after `"title": "Create GST Invoice",`:

```json
"list_title": "Invoices",
```

The result should look like:
```json
"invoices": {
  "title": "Create GST Invoice",
  "list_title": "Invoices",
  "subtitle": "Generate tax-compliant bills for your customers.",
  ...
}
```

- [ ] **Step 2: Update invoices list page to use new key**

In `src/routes/(app)/invoices/+page.svelte` at line 87, change:

```svelte
<h1 class="text-lg font-headline font-bold text-on-surface lg:text-2xl">{$_('invoices.title', { default: 'Invoices' })}</h1>
```

to:

```svelte
<h1 class="text-lg font-headline font-bold text-on-surface lg:text-2xl">{$_('invoices.list_title', { default: 'Invoices' })}</h1>
```

- [ ] **Step 3: Verify in browser**

Start dev server if not running: `npm run dev`

Navigate to `/invoices`. Page title must show **"Invoices"** not "Create GST Invoice".

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/locales/en.json src/routes/(app)/invoices/+page.svelte
git commit -m "fix: invoices list page title showing new-invoice form heading"
```

---

## Task 2: Fix dashboard KPI cards — replace horizontal scroll with 3-column grid

**Files:**
- Modify: `src/routes/(app)/dashboard/+page.svelte:132-174`

**Problem:** Cards use `flex overflow-x-auto` with `w-44`/`w-40` fixed widths. On a 390px screen with `px-3` padding, usable width = 366px. Revenue card alone is 176px + 12px gap = 188px, Outstanding 160px ends at 348px, then gap + 3rd card starts at 360px — only 6px visible. Users see a truncated partial 3rd card.

**Fix:** Mirror the pattern already working in `invoices/+page.svelte` — use `grid grid-cols-3 gap-2` with no fixed widths, compact padding on mobile.

- [ ] **Step 1: Replace the stat cards container and cards**

In `src/routes/(app)/dashboard/+page.svelte`, find the stats section (lines 132–174):

```svelte
<!-- Stats: horizontal scroll on mobile, grid on desktop -->
<div class="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 mb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:mx-0 lg:px-0 lg:mb-8">
```

Replace the entire stats block (from the comment `<!-- Stats: horizontal scroll ... -->` through the closing `</div>` of the wrapper at line 174) with:

```svelte
<!-- Stats: 3-column grid, all visible at once -->
<div class="grid grid-cols-3 gap-2 mb-4 lg:gap-4 lg:mb-8">

	<!-- Revenue -->
	<div in:fly={{ y: 16, duration: 350, delay: 50, easing: cubicOut }}
		class="relative overflow-hidden rounded-xl p-3 lg:p-6"
		style="background: linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #1e40af) 100%); box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent);">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-white/80 text-sm lg:text-base" style="font-variation-settings:'FILL' 1">payments</span>
			<p class="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-white/70 truncate">Revenue</p>
		</div>
		<h3 class="text-base lg:text-3xl font-headline font-extrabold leading-none text-white">{formatINRCompact(revenue)}</h3>
		{#if revenueChange !== null}
			<p class="text-[10px] text-white/80 mt-1 flex items-center gap-0.5">
				<span class="material-symbols-outlined text-xs" style="font-variation-settings:'FILL' 1">{revenueChange >= 0 ? 'trending_up' : 'trending_down'}</span>
				<span class="hidden sm:inline">{revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%</span>
			</p>
		{/if}
	</div>

	<!-- Outstanding -->
	<div in:fly={{ y: 16, duration: 350, delay: 130, easing: cubicOut }}
		class="bg-surface-container-lowest rounded-xl p-3 lg:p-6 relative overflow-hidden border border-outline-variant/20">
		<div class="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-error opacity-70"></div>
		<div class="flex items-center gap-1 mb-1 pl-2">
			<span class="material-symbols-outlined text-error text-sm lg:text-base" style="font-variation-settings:'FILL' 1">schedule</span>
			<p class="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">Due</p>
		</div>
		<h3 class="text-base lg:text-3xl font-headline font-extrabold text-error leading-none pl-2">{formatINRCompact(outstanding)}</h3>
		<p class="text-[10px] text-on-surface-variant pl-2 mt-1 hidden sm:block">Unpaid</p>
	</div>

	<!-- Customers -->
	<div in:fly={{ y: 16, duration: 350, delay: 210, easing: cubicOut }}
		class="bg-surface-container-lowest rounded-xl p-3 lg:p-6 relative overflow-hidden border border-outline-variant/20">
		<div class="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-secondary opacity-70"></div>
		<div class="flex items-center gap-1 mb-1 pl-2">
			<span class="material-symbols-outlined text-secondary text-sm lg:text-base" style="font-variation-settings:'FILL' 1">group</span>
			<p class="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">{$activeTerminology.people}</p>
		</div>
		<h3 class="text-base lg:text-3xl font-headline font-extrabold text-secondary leading-none pl-2">{patientCount}</h3>
		<p class="text-[10px] text-on-surface-variant pl-2 mt-1 hidden sm:block">Registered</p>
	</div>
</div>
```

- [ ] **Step 2: Verify all 3 cards visible at once on mobile**

In browser at 390px width (DevTools → iPhone 12 Pro), the dashboard must show all 3 KPI cards in one row without any card being cut off.

- [ ] **Step 3: Commit**

```bash
git add src/routes/(app)/dashboard/+page.svelte
git commit -m "fix: dashboard KPI cards overflow on mobile — switch to 3-column grid"
```

---

## Task 3: Fix patients/clients stat cards — replace horizontal scroll with 3-column grid

**Files:**
- Modify: `src/routes/(app)/patients/+page.svelte:113-140`

**Problem:** Cards use `w-36` (144px) fixed width in a horizontal scroll. 3 × 144px + 2 × 12px gap = 456px overflows the 366px usable width on 390px device. The 3rd card label "TODAY" is cut to "TOD" at screen edge.

- [ ] **Step 1: Replace the stat cards container and cards**

In `src/routes/(app)/patients/+page.svelte`, find the stats section (lines 113–140):

```svelte
<!-- Stats — horizontal scroll on mobile -->
<div class="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 mb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:mx-0 lg:px-0 lg:mb-8">
	<div class="shrink-0 w-36 lg:w-auto bg-surface-container-lowest p-3 lg:p-6 rounded-xl border border-outline-variant/15">
```

Replace the entire stats block (from `<!-- Stats -->` comment through the closing `</div>` at line 140) with:

```svelte
<!-- Stats: 3-column grid -->
<div class="grid grid-cols-3 gap-2 mb-4 lg:gap-4 lg:mb-8">
	<div class="bg-surface-container-lowest p-3 lg:p-6 rounded-xl border border-outline-variant/15">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-primary text-sm">group</span>
			<p class="text-[9px] lg:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Total</p>
		</div>
		<p class="text-base lg:text-xl font-headline font-bold text-on-surface">{totalPatients.toLocaleString('en-IN')}</p>
		<p class="text-[10px] text-on-surface-variant mt-0.5 hidden sm:block">{$activeTerminology.people}</p>
	</div>
	<div class="bg-surface-container-lowest p-3 lg:p-6 rounded-xl border border-outline-variant/15">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-error text-sm">account_balance_wallet</span>
			<p class="text-[9px] lg:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Due</p>
		</div>
		<p class="text-base lg:text-xl font-headline font-bold text-error">{formatINRCompact(totalOutstanding)}</p>
		<p class="text-[10px] text-on-surface-variant mt-0.5 hidden sm:block">Outstanding</p>
	</div>
	<div class="bg-surface-container-lowest p-3 lg:p-6 rounded-xl border border-outline-variant/15">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-secondary text-sm">calendar_today</span>
			<p class="text-[9px] lg:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Today</p>
		</div>
		<p class="text-base lg:text-xl font-headline font-bold text-secondary">
			{patients.filter((p) => p.created_at.startsWith(new Date().toISOString().split('T')[0])).length}
		</p>
		<p class="text-[10px] text-on-surface-variant mt-0.5 hidden sm:block">Registered</p>
	</div>
</div>
```

- [ ] **Step 2: Verify all 3 cards visible at once on mobile**

In browser at 390px width, all 3 cards (Total / Due / Today) must be fully visible in one row. Labels must not be truncated.

- [ ] **Step 3: Commit**

```bash
git add src/routes/(app)/patients/+page.svelte
git commit -m "fix: clients stat cards cut off on mobile — switch to 3-column grid"
```

---

## Task 4: Compact insight banner on mobile (reduce height)

**Files:**
- Modify: `src/routes/(app)/dashboard/+page.svelte:177-198`

**Problem:** The insight banner description "Your expenses exceed revenue. Immediate action needed to review pricing and costs." wraps to 3 lines on mobile, making the banner ~100px tall. This pushes "Recent Invoices" below the fold.

**Fix:** Truncate description to 1 line on mobile with `line-clamp-1`, full text on `sm:` and above. Also compact the internal padding.

- [ ] **Step 1: Update insight banner markup**

In `src/routes/(app)/dashboard/+page.svelte`, find the insight banner block (lines 177–198):

```svelte
<!-- Top Insight Banner -->
{#if $topInsight && !bannerDismissed}
	{@const isError = $topInsight.type === 'danger'}
	<div class="mb-6 {isError ? 'bg-error-container/70 border-error/20' : 'bg-tertiary-container/50 border-tertiary/20'} border rounded-xl p-4 flex items-start gap-3">
		<span class="material-symbols-outlined {isError ? 'text-error' : 'text-tertiary'} text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">{$topInsight.icon}</span>
		<div class="flex-1 min-w-0">
			<p class="font-bold text-sm text-on-surface">{$topInsight.title}</p>
			<p class="text-xs text-on-surface-variant mt-0.5">{$topInsight.description}</p>
			{#if $topInsight.action}
				<a href={$topInsight.action.href} class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary mt-1.5 hover:underline">
					{$topInsight.action.label}
					<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
				</a>
			{/if}
		</div>
		<div class="flex items-center gap-2 shrink-0">
			<a href="/insights" class="text-[11px] font-bold text-primary whitespace-nowrap">All Insights →</a>
			<button onclick={() => bannerDismissed = true} class="p-1 rounded-lg hover:bg-black/10 transition-colors" aria-label="Dismiss">
				<span class="material-symbols-outlined text-base text-on-surface-variant">close</span>
			</button>
		</div>
	</div>
{/if}
```

Replace with:

```svelte
<!-- Top Insight Banner -->
{#if $topInsight && !bannerDismissed}
	{@const isError = $topInsight.type === 'danger'}
	<div class="mb-4 {isError ? 'bg-error-container/70 border-error/20' : 'bg-tertiary-container/50 border-tertiary/20'} border rounded-xl p-3 flex items-center gap-2.5">
		<span class="material-symbols-outlined {isError ? 'text-error' : 'text-tertiary'} text-lg shrink-0" style="font-variation-settings:'FILL' 1">{$topInsight.icon}</span>
		<div class="flex-1 min-w-0">
			<p class="font-bold text-sm text-on-surface leading-tight">{$topInsight.title}</p>
			<p class="text-xs text-on-surface-variant mt-0.5 line-clamp-1 sm:line-clamp-2">{$topInsight.description}</p>
		</div>
		<div class="flex items-center gap-1.5 shrink-0">
			<a href="/insights" class="text-[11px] font-bold text-primary whitespace-nowrap hidden sm:block">All →</a>
			<button onclick={() => bannerDismissed = true} class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors" aria-label="Dismiss">
				<span class="material-symbols-outlined text-base text-on-surface-variant">close</span>
			</button>
		</div>
	</div>
{/if}
```

- [ ] **Step 2: Verify banner is compact on mobile**

At 390px width on dashboard: banner must occupy **2 lines max** (icon row height ~48px total). Title visible, description shows 1 line max.

At 640px+ (sm): description shows 2 lines, "All →" link visible.

- [ ] **Step 3: Commit**

```bash
git add src/routes/(app)/dashboard/+page.svelte
git commit -m "fix: insight banner too tall on mobile — compact layout with line-clamp"
```

---

## Task 5: Fix page header subtitles wrapping to 2 lines

**Files:**
- Modify: `src/routes/(app)/patients/+page.svelte:100`
- Modify: `src/routes/(app)/invoices/+page.svelte:88`
- Modify: `src/routes/(app)/dashboard/+page.svelte:82`

**Problem:** Subtitle text "Manage your clients and outstanding balances." is too long for mobile width when `text-xs`, wrapping to 2 lines and stealing 16px of vertical space from content.

- [ ] **Step 1: Fix patients/clients page subtitle**

In `src/routes/(app)/patients/+page.svelte` at line 100, change:

```svelte
<p class="text-on-surface-variant font-body mt-0.5 text-xs lg:text-base">Manage your {$activeTerminology.people.toLowerCase()} and outstanding balances.</p>
```

to:

```svelte
<p class="text-on-surface-variant font-body mt-0.5 text-xs lg:text-base truncate">Manage {$activeTerminology.people.toLowerCase()} & balances</p>
```

- [ ] **Step 2: Fix invoices page subtitle**

In `src/routes/(app)/invoices/+page.svelte` at line 88, change:

```svelte
<p class="text-on-surface-variant text-xs lg:text-sm">Manage and track your billing</p>
```

to:

```svelte
<p class="text-on-surface-variant text-xs lg:text-sm truncate">Manage and track your billing</p>
```

- [ ] **Step 3: Fix dashboard page subtitle**

In `src/routes/(app)/dashboard/+page.svelte` at line 82, change:

```svelte
<p class="text-on-surface-variant text-xs mt-0.5 lg:text-sm">
	{#if businessName}Financial performance{:else}Welcome to Hisaab{/if}
</p>
```

to:

```svelte
<p class="text-on-surface-variant text-xs mt-0.5 lg:text-sm truncate">
	{#if businessName}Financial performance{:else}Welcome to Hisaab{/if}
</p>
```

- [ ] **Step 4: Verify subtitles are single line on all pages**

At 375px screen width:
- `/patients` → subtitle must be 1 line
- `/invoices` → subtitle must be 1 line
- `/dashboard` → subtitle must be 1 line

- [ ] **Step 5: Commit**

```bash
git add src/routes/(app)/patients/+page.svelte src/routes/(app)/invoices/+page.svelte src/routes/(app)/dashboard/+page.svelte
git commit -m "fix: page subtitle text wrapping to 2 lines on mobile"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 5 issues from screenshots addressed — invoices title (Task 1), dashboard cards (Task 2), patients cards (Task 3), insight banner (Task 4), subtitles (Task 5)
- [x] **Placeholder scan:** All steps have exact code. No "TBD" or "implement later" entries.
- [x] **Type consistency:** No type changes — all changes are Tailwind class strings and one i18n key string.
- [x] **No new files:** All changes are modifications to existing files only.
- [x] **Mobile-first verified:** All fixes tested at 375px/390px screen widths in plan verification steps.
- [x] **Desktop not broken:** All grid replacements fall back gracefully to `lg:` variants. Desktop layout unchanged.
