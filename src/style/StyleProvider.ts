import spotlight from "@/app/shell/Spotlight/Spotlight.module.css";
import {
  ActionIcon,
  AppShell,
  Breadcrumbs,
  Button,
  CSSVariablesResolver,
  Kbd,
  MantineColorsTuple,
  Menu,
  Modal,
  NavLink,
  Popover,
  Select,
  Tabs,
  ThemeIcon,
  Tooltip,
  createTheme,
} from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import actionIcon from "./ActionIcon.module.css";
import appShell from "./AppShell.module.css";
import breadcrumbs from "./Breadcrumbs.module.css";
import button from "./Button.module.css";
import menu from "./Menu.module.css";
import modal from "./Modal.module.css";
import navLink from "./NavLink.module.css";
import navbar from "./Navbar.module.css";
import popover from "./Popover.module.css";
import select from "./Select.module.css";
import tabs from "./Tabs.module.css";
import themeIcon from "./ThemeIcon.module.css";
import tooltip from "./Tooltip.module.css";

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Generate a Mantine colors tuple from a base color
 * Based on Mantine's color generation algorithm
 */
function generateColorScale(baseHex: string): MantineColorsTuple {
  const rgb = hexToRgb(baseHex);
  if (!rgb) {
    // Fallback to forest if invalid color
    return [
      "#E1EFE6",
      "#BADBC9",
      "#87C0A4",
      "#75B797",
      "#63AE8A",
      "#52A57E",
      "#439C72",
      "#378C6A",
      "#2E8064",
      "#1E6B5A",
    ] as unknown as MantineColorsTuple;
  }

  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Generate 10 shades of the color (similar to Mantine's default color scale)
  // Index 0 is lightest, index 9 is darkest
  const lightnessStops = [93, 83, 70, 60, 52, 45, 38, 32, 26, 20];

  const colors: string[] = [];

  for (const lightness of lightnessStops) {
    const rgbColor = hslToRgb(h, s, lightness);
    const hex = `#${rgbColor.r.toString(16).padStart(2, "0")}${rgbColor.g.toString(16).padStart(2, "0")}${rgbColor.b.toString(16).padStart(2, "0")}`;
    colors.push(hex);
  }

  return colors as unknown as MantineColorsTuple;
}

const headingStyle = {
  fontFamily: "Noto Serif Lao",
  fontWeight: "500",
  sizes: {
    h1: { fontSize: "2rem" },
    h2: { fontSize: "1.5rem" },
    h3: { fontSize: "1.25rem" },
    h4: { fontSize: "1.125rem" },
    h5: { fontSize: "1rem" },
    h6: { fontSize: "0.875rem" },
  },
};

export const presetTheme = createTheme({
  other: {},
  headings: headingStyle,
  fontFamily: "Open Sans, sans-serif",
  colors: {
    forest: [
      "#E1EFE6",
      "#BADBC9",
      "#87C0A4",
      "#75B797",
      "#63AE8A",
      "#52A57E",
      "#439C72",
      "#378C6A",
      "#2E8064",
      "#1E6B5A",
    ],
    seaweed: [
      "#e5f9fd",
      "#c4edf3",
      "#99dae5",
      "#7bd3e0",
      "#50bece",
      "#36a3b4",
      "#288391",
      "#227885",
      "#1d6873",
      "#12545d",
    ],
    coral: [
      "#ffe6ea",
      "#f7bec4",
      "#eb959d",
      "#e16b77",
      "#d74150",
      "#be2836",
      "#941e2a",
      "#6a141d",
      "#420910",
      "#1d0003",
    ],
    seagull: [
      "#e6f2ff",
      "#CFDCED",
      "#B8C7DB",
      "#A1B2C9",
      "#8A9DB7",
      "#7388A6",
      "#5C7394",
      "#455E82",
      "#2E4970",
      "#17345F",
    ],
  },
  primaryColor: "forest",
  defaultGradient: {
    deg: 45,
    from: "forest.5",
    to: "forest.7",
  },
  components: {
    AppShell: AppShell.extend({
      classNames: appShell,
    }),
    Button: Button.extend({
      classNames: button,
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        size: "lg",
        variant: "default",
      },
      classNames: actionIcon,
    }),
    Kbd: Kbd.extend({
      defaultProps: {
        size: "xs",
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        shadow: "xl",
        size: "500px",
        radius: "md",
        centered: true,
        closeOnClickOutside: false,
        closeOnEscape: true,
        withCloseButton: true,
        closeButtonProps: {
          size: "sm",
        },
      },

      classNames: modal,
    }),
    Menu: Menu.extend({
      classNames: menu,
    }),
    Breadcrumbs: Breadcrumbs.extend({
      classNames: breadcrumbs,
    }),
    Navbar: AppShell.Navbar.extend({ classNames: navbar }),
    NavLink: NavLink.extend({
      defaultProps: { variant: "light" },
      classNames: navLink,
    }),
    Popover: Popover.extend({
      classNames: popover,
    }),
    Select: Select.extend({
      classNames: select,
    }),
    Spotlight: Spotlight.extend({
      classNames: spotlight,
    }),
    Tabs: Tabs.extend({
      classNames: tabs,
    }),
    TabsPanel: Tabs.Panel.extend({
      defaultProps: {
        pt: "sm",
      },
    }),
    ThemeIcon: ThemeIcon.extend({
      classNames: themeIcon,
    }),
    Tooltip: Tooltip.extend({
      classNames: tooltip,
      defaultProps: {
        openDelay: 500,
        closeDelay: 0,
      },
    }),
    InputWrapper: {
      styles: () => ({
        label: {
          userSelect: "none",
        },
      }),
    },
    Input: {
      styles: () => ({
        icon: {
          "& svg": {
            strokeWidth: "1.5px",
            width: "1.2rem",
          },
        },
      }),
    },
  },
});

/**
 * Create a theme with a custom primary color
 */
export function createThemeFromColor(themeColor: string) {
  const colorScale = generateColorScale(themeColor);
  const primaryColorName = "primary";

  return createTheme({
    other: {},
    headings: headingStyle,
    fontFamily: "Open Sans, sans-serif",
    colors: {
      [primaryColorName]: colorScale,
    },
    primaryColor: primaryColorName,
    defaultGradient: {
      deg: 45,
      from: `${primaryColorName}.5`,
      to: `${primaryColorName}.7`,
    },
    components: {
      AppShell: AppShell.extend({
        classNames: appShell,
      }),
      Button: Button.extend({
        classNames: button,
      }),
      ActionIcon: ActionIcon.extend({
        defaultProps: {
          size: "lg",
          variant: "default",
        },
        classNames: actionIcon,
      }),
      Kbd: Kbd.extend({
        defaultProps: {
          size: "xs",
        },
      }),
      Modal: Modal.extend({
        defaultProps: {
          shadow: "xl",
          size: "500px",
          radius: "md",
          centered: true,
          closeOnClickOutside: false,
          closeOnEscape: true,
          withCloseButton: true,
          closeButtonProps: {
            size: "sm",
          },
        },

        classNames: modal,
      }),
      Menu: Menu.extend({
        classNames: menu,
      }),
      Breadcrumbs: Breadcrumbs.extend({
        classNames: breadcrumbs,
      }),
      Navbar: AppShell.Navbar.extend({ classNames: navbar }),
      NavLink: NavLink.extend({
        defaultProps: { variant: "light" },
        classNames: navLink,
      }),
      Popover: Popover.extend({
        classNames: popover,
      }),
      Select: Select.extend({
        classNames: select,
      }),
      Spotlight: Spotlight.extend({
        classNames: spotlight,
      }),
      Tabs: Tabs.extend({
        classNames: tabs,
      }),
      TabsPanel: Tabs.Panel.extend({
        defaultProps: {
          pt: "sm",
        },
      }),
      ThemeIcon: ThemeIcon.extend({
        classNames: themeIcon,
      }),
      Tooltip: Tooltip.extend({
        classNames: tooltip,
        defaultProps: {
          openDelay: 500,
          closeDelay: 0,
        },
      }),
      InputWrapper: {
        styles: () => ({
          label: {
            userSelect: "none",
          },
        }),
      },
      Input: {
        styles: () => ({
          icon: {
            "& svg": {
              strokeWidth: "1.5px",
              width: "1.2rem",
            },
          },
        }),
      },
    },
  });
}

/**
 * Create CSS variables resolver with custom theme color
 */
export function createCssVariablesResolver(
  themeColor: string
): CSSVariablesResolver {
  const colorScale = generateColorScale(themeColor);

  return (theme) => {
    return {
      variables: {
        "--mantine-primary-color-0": colorScale[0],
        "--mantine-primary-color-1": colorScale[1],
        "--mantine-primary-color-2": colorScale[2],
        "--mantine-primary-color-3": colorScale[3],
        "--mantine-primary-color-4": colorScale[4],
        "--mantine-primary-color-5": colorScale[5],
        "--mantine-primary-color-6": colorScale[6],
        "--mantine-primary-color-7": colorScale[7],
        "--mantine-primary-color-8": colorScale[8],
        "--mantine-primary-color-9": colorScale[9],
      },
      light: {
        "--mantine-color-red-strong": theme.colors.red[7],
        "--mantine-color-pink-strong": theme.colors.pink[7],
        "--mantine-color-grape-strong": theme.colors.grape[7],
        "--mantine-color-violet-strong": theme.colors.violet[7],
        "--mantine-color-indigo-strong": theme.colors.indigo[7],
        "--mantine-color-blue-strong": theme.colors.blue[7],
        "--mantine-color-cyan-strong": theme.colors.cyan[7],
        "--mantine-color-teal-strong": theme.colors.teal[7],
        "--mantine-color-green-strong": theme.colors.green[7],
        "--mantine-color-lime-strong": theme.colors.lime[7],
        "--mantine-color-yellow-strong": theme.colors.yellow[7],
        "--mantine-color-orange-strong": theme.colors.orange[7],
        "--mantine-color-gray-strong": theme.colors.gray[6],
        "--mantine-color-light-border": theme.colors.gray[3],
      },

      dark: {
        "--mantine-color-red-strong": theme.colors.red[3],
        "--mantine-color-pink-strong": theme.colors.pink[3],
        "--mantine-color-grape-strong": theme.colors.grape[3],
        "--mantine-color-violet-strong": theme.colors.violet[3],
        "--mantine-color-indigo-strong": theme.colors.indigo[3],
        "--mantine-color-blue-strong": theme.colors.blue[3],
        "--mantine-color-cyan-strong": theme.colors.cyan[3],
        "--mantine-color-teal-strong": theme.colors.teal[3],
        "--mantine-color-green-strong": theme.colors.green[3],
        "--mantine-color-lime-strong": theme.colors.lime[3],
        "--mantine-color-yellow-strong": theme.colors.yellow[3],
        "--mantine-color-orange-strong": theme.colors.orange[3],
        "--mantine-color-gray-strong": theme.colors.gray[5],
        "--mantine-color-light-border": theme.colors.dark[5],
      },
    };
  };
}
