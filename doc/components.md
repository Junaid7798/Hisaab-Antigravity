# Hisaab — Reusable Components

> Last updated: 2026-04-14

## All components: `src/lib/components/`

---

### Sidebar.svelte

**Purpose**: Main navigation sidebar, fixed to the left side of the screen.

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `businessName` | `string` | `'My Clinic'` | Displayed under the Hisaab logo |

**Navigation Items**:
- Dashboard → `/dashboard`
- Patients → `/patients`
- Invoices → `/invoices/new`
- Expenses → `/expenses`
- Reports → `/reports`
- Settings → `/settings`

**Features**:
- Active state highlighting based on `$page.url.pathname`
- "New Invoice" CTA button at bottom
- Help Center link

---

### TopNav.svelte

**Purpose**: Top navigation bar with search, sync status, and user info.

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userName` | `string` | `'Admin'` | Displayed user name |

**Features**:
- Global search input (placeholder, not yet functional)
- Live online/offline status indicator (reads `navigator.onLine`)
- Notification bell
- User avatar with initial

---

### StatusChip.svelte

**Purpose**: Colored badge for invoice payment statuses.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `'PAID' \| 'UNPAID' \| 'PARTIAL' \| 'OVERDUE'` | Yes | Invoice status |

**Colors**:
- PAID → teal (secondary-container)
- UNPAID → orange (tertiary-fixed)
- PARTIAL → orange (tertiary-fixed)
- OVERDUE → red (error-container)

---

### PatientAvatar.svelte

**Purpose**: Generates an initials-based circular avatar from a patient name.

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Patient full name |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Avatar size |

**Sizes**: sm=32px, md=36px, lg=48px

---

### EmptyState.svelte

**Purpose**: Displayed when a data table or list has zero items.

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `string` | `'inbox'` | Material icon name |
| `title` | `string` | required | Heading text |
| `description` | `string` | required | Subtext |
| `actionLabel` | `string` | optional | Button label |
| `actionHref` | `string` | optional | Button link target |
