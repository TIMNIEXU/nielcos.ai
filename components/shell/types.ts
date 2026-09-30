export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: string;
};

/** Flat shell.* labels, resolved server-side in the layout. */
export type ShellLabels = Record<string, string>;
