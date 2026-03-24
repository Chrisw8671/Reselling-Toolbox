type ClassValue = string | false | null | undefined;

export function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border px-3.5 text-sm font-[650] leading-none no-underline transition-[transform,filter,opacity] duration-150 disabled:pointer-events-none disabled:opacity-60";

const buttonGradient =
  "border-white/20 bg-[linear-gradient(180deg,#2e4d7a_0%,#1f3658_100%)] text-slate-50 hover:-translate-y-px hover:brightness-105 active:translate-y-0";

const badgeTones: Record<string, string> = {
  IN_STOCK: "border-[color:color-mix(in_srgb,var(--success)_45%,var(--border))]",
  LISTED: "border-[color:color-mix(in_srgb,var(--accent)_45%,var(--border))]",
  SOLD: "border-[color:color-mix(in_srgb,#9333ea_40%,var(--border))]",
  RETURNED: "border-[color:color-mix(in_srgb,#f59e0b_45%,var(--border))]",
  WRITTEN_OFF: "border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))]",
  profitPos: "border-[color:color-mix(in_srgb,var(--success)_45%,var(--border))]",
  profitNeg: "border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))]",
};

export const ui = {
  page: "m-0 w-full py-4 max-md:py-[10px]",
  mainContent:
    "p-[14px] max-md:px-[10px] max-md:pt-[10px] max-md:pb-[calc(88px+env(safe-area-inset-bottom))]",
  toolbar: "mb-[14px] flex flex-wrap items-center justify-between gap-3 max-md:gap-2.5",
  pageTitle: "m-0 text-[22px] font-extrabold leading-tight",
  mobilePageTitle: "m-0 text-[28px] font-black tracking-[-0.5px]",
  mobilePageTitleSm: "m-0 text-[26px] font-black tracking-[-0.5px]",
  mobilePageSubtitle: "mt-1 text-[13px] text-app-muted",
  muted: "text-app-muted",
  button: cx(
    buttonBase,
    buttonGradient,
    "h-10 max-md:h-auto max-md:min-h-11 max-md:w-full",
  ),
  buttonPrimary: cx(
    buttonBase,
    "h-10 border-[color:color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[linear-gradient(180deg,var(--accent)_0%,color-mix(in_srgb,var(--accent)_78%,#000)_100%)] text-slate-50 hover:-translate-y-px hover:brightness-105 active:translate-y-0 max-md:h-auto max-md:min-h-11 max-md:w-full",
  ),
  buttonCompact: cx(
    buttonBase,
    buttonGradient,
    "h-9 w-auto px-4 text-[13px] max-md:min-h-0",
  ),
  buttonPrimaryCompact: cx(
    buttonBase,
    "h-9 w-auto border-[color:color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[linear-gradient(180deg,var(--accent)_0%,color-mix(in_srgb,var(--accent)_78%,#000)_100%)] px-4 text-[13px] text-slate-50 hover:-translate-y-px hover:brightness-105 active:translate-y-0 max-md:min-h-0",
  ),
  iconButton:
    "inline-flex cursor-pointer items-center justify-center rounded-lg border border-app-border bg-app-panel-3 px-2.5 py-[7px] text-app-text transition-[filter,opacity,border-color,background-color] duration-150 hover:brightness-105 disabled:pointer-events-none disabled:opacity-60",
  tableWrap:
    "overflow-hidden rounded-2xl border border-app-border bg-[linear-gradient(180deg,var(--panel)_0%,var(--panel-2)_100%)] shadow-app-sm transition-shadow duration-150 hover:shadow-app-md max-md:rounded-xl",
  tableScroll: "w-full overflow-x-auto [-webkit-overflow-scrolling:touch]",
  table: "w-full min-w-[900px] border-collapse max-md:min-w-[760px]",
  thead: "",
  th: "sticky top-0 z-[1] border-b border-app-border bg-app-panel-3 px-[14px] py-[13px] text-left align-middle text-sm font-bold max-md:px-3 max-md:py-3 max-md:text-[13px]",
  td: "border-b border-app-border px-[14px] py-[13px] align-middle text-sm max-md:px-3 max-md:py-3 max-md:text-[13px]",
  tr: "border-b border-app-border last:border-b-0 hover:bg-[color-mix(in_srgb,var(--panel-3)_50%,transparent)]",
  rowClick: "cursor-pointer",
  titleCell: "max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap",
  actions: "flex flex-nowrap items-center justify-end gap-2 max-md:justify-start",
  badge:
    "inline-flex items-center rounded-full border border-app-border bg-app-panel-3 px-2.5 py-1.5 text-xs font-[650]",
  formGrid: "grid gap-[14px] md:grid-cols-2",
  inlineControls: "mt-3 flex flex-wrap items-end gap-3",
  chartsGrid:
    "grid gap-[14px] [grid-template-columns:repeat(2,minmax(0,1fr))] max-[900px]:grid-cols-1",
  chartBox: "h-[260px] max-[900px]:h-[220px]",
  modalOverlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/70",
  modalCard:
    "w-[min(520px,calc(100vw-24px))] rounded-[14px] border border-app-border bg-app-panel p-4 shadow-app-md",
  mobilePage: "mx-auto w-full max-w-[580px] px-[14px]",
  statGrid: "mb-[14px] grid grid-cols-2 gap-2.5",
  statTile:
    "rounded-2xl border border-app-border bg-[linear-gradient(160deg,var(--panel)_0%,var(--panel-2)_100%)] p-[14px] shadow-app-sm",
  statTileWide: "col-span-2",
  statLabel: "mb-1 text-[11px] font-bold uppercase tracking-[0.5px] text-app-muted",
  actionGrid: "mb-[14px] grid grid-cols-2 gap-2.5",
  actionTile:
    "flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-app-border bg-[linear-gradient(160deg,var(--panel)_0%,var(--panel-2)_100%)] px-3 py-[18px] text-center text-[13px] font-bold text-app-text no-underline shadow-app-sm transition-[transform,opacity] duration-100 active:scale-[0.96] active:opacity-85 [-webkit-tap-highlight-color:transparent]",
  actionIcon: "text-[28px] leading-none",
  mobileItemCard:
    "flex items-stretch overflow-hidden rounded-[14px] border border-app-border bg-app-panel text-app-text no-underline shadow-app-sm transition-opacity duration-100 active:opacity-80 [-webkit-tap-highlight-color:transparent]",
  mobileItemAccent: "w-1 shrink-0",
  mobileItemBody: "min-w-0 flex-1 px-3 py-[11px]",
  mobileItemChevron: "flex items-center px-3 pl-1 text-[20px] font-light text-app-muted",
  statusPill:
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold tracking-[0.1px]",
  chipRow:
    "mb-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  chip: "inline-flex items-center whitespace-nowrap rounded-full border border-app-border bg-app-panel px-[13px] py-1.5 text-xs font-bold text-app-muted no-underline transition-[background-color,color,border-color] duration-150 [-webkit-tap-highlight-color:transparent]",
  chipActive:
    "border-[color:color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-app-accent-soft text-app-accent",
  mobileSearchBar: "mb-3 flex items-center gap-2",
  mobileSearchInput: "mt-0 h-[42px] flex-1 rounded-xl",
  mobileSearchButton:
    "inline-flex h-[42px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-app-border bg-app-panel-3 px-3.5 text-[13px] font-bold text-app-text no-underline",
  mobileSaleCard:
    "block rounded-[14px] border border-app-border bg-app-panel px-[14px] py-[13px] text-app-text no-underline shadow-app-sm transition-opacity duration-100 active:opacity-80 [-webkit-tap-highlight-color:transparent]",
  mobileCard:
    "mb-[14px] rounded-2xl border border-app-border bg-app-panel p-4 shadow-app-sm",
  mobileCardTitle:
    "mb-[14px] text-[11px] font-extrabold uppercase tracking-[0.6px] text-app-muted",
  mGrid1: "grid gap-3",
  mGrid2: "grid gap-3 md:grid-cols-2",
  saleItemCard: "rounded-xl border border-app-border bg-app-panel-2 p-3",
  sectionLabel:
    "mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.6px] text-app-muted",
  navHeader:
    "sticky top-0 z-[100] flex h-[66px] items-center justify-between border-b border-app-border bg-[color-mix(in_srgb,var(--panel)_88%,transparent)] px-4 backdrop-blur-[10px] max-md:h-[60px] max-md:px-2.5",
  navDesktopGroup: "flex items-center gap-2.5 max-md:hidden",
  navMobileGroup: "hidden items-center gap-2.5 max-md:flex",
  logoLink: "inline-flex items-center",
  logo: "rounded-[10px]",
  navDesktopLinks: "flex items-center gap-2 max-md:hidden",
  navDesktopLink:
    "rounded-[10px] border border-transparent px-2.5 py-2 text-sm font-semibold text-app-muted no-underline transition-colors duration-150 hover:bg-app-panel-2 hover:text-app-text",
  navRight: "flex items-center gap-2.5",
  navIcon:
    "inline-flex size-[38px] items-center justify-center rounded-[10px] border border-app-border bg-app-panel-2 text-app-text",
  navActive:
    "border-[color:color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-app-accent-soft !text-app-text",
  mobileBottomNav:
    "fixed inset-x-0 bottom-0 z-[140] hidden grid-cols-5 gap-0.5 border-t border-app-border bg-[color-mix(in_srgb,var(--panel)_96%,transparent)] px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur-[14px] [-webkit-backdrop-filter:blur(14px)] max-md:grid",
  mobileBottomNavLink:
    "flex min-h-12 select-none flex-col items-center justify-center gap-[3px] rounded-[10px] border border-transparent px-0.5 py-1.5 text-center text-[10px] font-bold leading-[1.1] text-app-muted no-underline transition-colors duration-150 [-webkit-tap-highlight-color:transparent]",
  bottomActive: "text-app-accent",
  navTabIcon: "text-[21px] leading-none",
  emptyState: "px-4 py-10 text-center text-app-muted",
} as const;

export function badgeClass(tone?: string) {
  return cx(ui.badge, tone ? badgeTones[tone] : undefined);
}

export function chipClass(active: boolean) {
  return cx(ui.chip, active && ui.chipActive);
}

export function navLinkClass(active: boolean) {
  return cx(ui.navDesktopLink, active && ui.navActive);
}

export function navIconClass(active: boolean) {
  return cx(ui.navIcon, active && ui.navActive);
}

export function bottomNavLinkClass(active: boolean) {
  return cx(ui.mobileBottomNavLink, active && ui.bottomActive);
}
