/** Bundled `golden-sunrise-tow-truck-highway.jpg` pixel size */
export const SPLASH_BG_WIDTH = 854;
export const SPLASH_BG_HEIGHT = 1842;

/** Extra pixels so rounding / status-bar insets never show a seam. */
const OVERSCAN = 4;

export function getCoverBackgroundFrame(screenW: number, screenH: number) {
  const scale = Math.max(
    (screenW + OVERSCAN * 2) / SPLASH_BG_WIDTH,
    (screenH + OVERSCAN * 2) / SPLASH_BG_HEIGHT,
  );
  const width = SPLASH_BG_WIDTH * scale;
  const height = SPLASH_BG_HEIGHT * scale;
  const left = (screenW - width) / 2;
  const top = screenH - height + OVERSCAN;
  return { width, height, left, top };
}
