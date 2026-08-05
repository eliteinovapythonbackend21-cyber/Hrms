import { lightTheme } from "./lightTheme";
import { darkTheme } from "./darkTheme";

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export const getTheme = (mode) => themes[mode] || themes.light;
