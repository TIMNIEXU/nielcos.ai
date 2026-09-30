"use client";

import { createContext, useContext } from "react";

export type ShellMode = "expanded" | "icon" | "drawer";

type ShellState = {
  mode: ShellMode;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  toggleCollapsed: () => void;
};

const ShellContext = createContext<ShellState>({
  mode: "expanded",
  drawerOpen: false,
  setDrawerOpen: () => {},
  toggleCollapsed: () => {},
});

export const ShellProvider = ShellContext.Provider;
export const useShell = () => useContext(ShellContext);
