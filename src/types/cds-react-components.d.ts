/**
 * Type shim for cds-react-components — avoids tsc walking package source (Next-style .svg, unused React).
 * Runtime still resolves to node_modules via Vite.
 */
declare module "cds-react-components/src/components" {
  import type { ComponentType, ReactNode } from "react";

  export type ButtonVariant = "primary" | "secondary" | "outline";
  export type ButtonSize = "large" | "small" | "xsmall";
  export interface ButtonProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    inverse?: boolean;
    label?: string;
    icon?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }
  export const Button: ComponentType<ButtonProps>;

  export type BadgeColor = "gray" | "green" | "blue" | "white" | "neutral";
  export interface BadgeProps {
    color?: BadgeColor;
    label?: string;
    statusDot?: boolean;
    className?: string;
  }
  export const Badge: ComponentType<BadgeProps>;

  export interface ChoiceTileProps {
    label?: string;
    description?: string;
    selected?: boolean;
    pressed?: boolean;
    showIcon?: boolean;
    showImage?: boolean;
    icon?: ReactNode;
    image?: ReactNode;
    onClick?: () => void;
    className?: string;
  }
  export const ChoiceTile: ComponentType<ChoiceTileProps>;

  export type LinkSize = "small" | "medium" | "large";
  export interface LinkProps {
    label?: string;
    size?: LinkSize;
    onClick?: () => void;
    className?: string;
  }
  export const Link: ComponentType<LinkProps>;

  export interface TabsItem {
    id: string;
    label: string;
  }
  export interface TabsProps {
    tabs: TabsItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    className?: string;
  }
  export const Tabs: ComponentType<TabsProps>;

  export type HeaderPosition = "page" | "section" | "interstitial";
  export interface HeaderProps {
    header?: string;
    description?: string;
    position?: HeaderPosition;
    className?: string;
  }
  export const Header: ComponentType<HeaderProps>;

  export interface ProgressIndicatorProps {
    progress?: number;
    className?: string;
  }
  export const ProgressIndicator: ComponentType<ProgressIndicatorProps>;

  export type ToolbarType =
    | "ck-l0"
    | "tt-l0"
    | "ck-l1"
    | "tt-l1"
    | "tt-assisted"
    | "tt-assisted-l1"
    | "tt-vignettes"
    | "l2"
    | "l2-dark";

  export interface ToolbarProps {
    type?: ToolbarType;
    progress?: boolean;
    progressValue?: number;
    showStatusBar?: boolean;
    ttLogoSrc?: string;
    expertImageSrc?: string;
    aiPlaceholder?: string;
    vignetteLabel?: string;
    onBackClick?: () => void;
    onMenuClick?: () => void;
    onNotificationClick?: () => void;
    onCartClick?: () => void;
    onAiSearchClick?: () => void;
    onVignetteClick?: () => void;
    className?: string;
  }
  export const Toolbar: ComponentType<ToolbarProps>;

  export interface DeviceStatusBarProps {
    dark?: boolean;
    dynamicIsland?: boolean;
    className?: string;
  }
  export const DeviceStatusBar: ComponentType<DeviceStatusBarProps>;

  export interface StickyActionFooterProps {
    primaryLabel?: string;
    onPrimaryClick?: () => void;
    secondaryLabel?: string;
    onSecondaryClick?: () => void;
    showFab?: boolean;
    fabImage?: string;
    onFabClick?: () => void;
    className?: string;
  }
  export const StickyActionFooter: ComponentType<StickyActionFooterProps>;
}

declare module "cds-react-components/src/icons" {
  import type { ComponentType, SVGProps } from "react";

  export const HomeIcon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
}
