/**
 * RACE Partner — Driver experience design tokens.
 *
 * Single source of truth for the driver surface (dashboard + job cycle).
 *
 * Every value here was measured from the approved driver design boards and is
 * expressed against a **390 dp reference width** — screens must convert with
 * `useScreenPx()` (REF_W = 390) so the layout scales exactly like the boards.
 *
 * Do not swap these for the generic `colors` tokens: the driver boards use a
 * slightly different ramp (pure-black headings, slate greys, #FEA701 amber).
 * `colors` stays the source of truth for the rest of the partner app.
 */

export const driverColors = {
  /** Screen background — warm off-white used behind every card. */
  pageBg: '#F8F9F7',
  card: '#FFFFFF',
  /** Hairline used on card outlines and list dividers. */
  hairline: '#F0F1EF',
  /** Neutral chip / pill fill. */
  light: '#F4F5F2',

  /** Headings, values, job titles. The boards use pure black, not #1A1A1A. */
  ink: '#000000',
  /** Address / route lines — dark, but a step below headings. */
  inkSoft: '#2B2B33',
  /** Secondary copy: subtitles, supporting labels. */
  grey: '#6B6D7C',
  /** Meta copy: timestamps, fares, helper text. */
  greySoft: '#8A8C9A',
  /** Chart axis labels and inactive tab labels. */
  greyFaint: '#7A7C84',

  /** Primary CTA fill. */
  amber: '#FEA701',
  /** Amber used for text/links on light backgrounds (brighter orange). */
  amberText: '#F58A00',
  /** Icon tile behind section headers. */
  amberTile: '#FEEBB8',
  /** Icon tile behind a job icon. */
  amberTileSoft: '#FEEFC8',
  /** Outline of the highlighted request card. */
  amberBorder: '#FEC12D',
  /** Cream wrapper behind the "new requests" section. */
  cream: '#FEF8E8',
  /** Cream circle behind list-row job icons. */
  creamRow: '#FEF6E2',
  /** Earnings bar chart. */
  chartBar: '#FECF66',
  /** Empty bar slot / chart baseline. */
  chartTrack: '#F1EDE2',

  /** Live / verified / positive signal. */
  green: '#0FA94A',
  greenCard: '#F3FBF6',
  greenCardBorder: '#CEF4DE',
  greenPill: '#E5F9ED',
  greenTile: '#E9FAF0',

  /** Informational pill (new request, in progress). */
  blue: '#0057FD',
  bluePill: '#DEEBFE',

  /** Badge + destructive. */
  red: '#FC2320',
  redPill: '#FEE9E8',

  white: '#FFFFFF',
} as const;

/** Corner radii, measured off the boards. */
export const driverRadius = {
  card: 18,
  innerCard: 14,
  onlineCard: 14,
  tile: 12,
  tileSm: 10,
  button: 14,
  pill: 999,
} as const;

/**
 * Type ramp. Weights are RN-compatible string literals.
 * Sizes are reference-dp — always wrap in `px()`.
 */
export const driverType = {
  greeting: { fontSize: 27, lineHeight: 34, fontWeight: '800' as const },
  subtitle: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' as const },
  cardSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  sectionSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  link: { fontSize: 14, lineHeight: 18, fontWeight: '700' as const },
  metricLabel: { fontSize: 14, lineHeight: 19, fontWeight: '600' as const },
  metricValue: { fontSize: 34, lineHeight: 38, fontWeight: '800' as const },
  metricCaption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  chip: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  chartLabel: { fontSize: 10, lineHeight: 13, fontWeight: '500' as const },
  jobTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' as const },
  distance: { fontSize: 14, lineHeight: 18, fontWeight: '700' as const },
  body: { fontSize: 13, lineHeight: 19, fontWeight: '400' as const },
  meta: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  pill: { fontSize: 12, lineHeight: 15, fontWeight: '700' as const },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '700' as const },
  tab: { fontSize: 12, lineHeight: 15, fontWeight: '600' as const },
} as const;

/** Key layout metrics measured from the boards. */
export const driverMetrics = {
  /** Screen side gutter. */
  pagePadding: 15,
  /** Vertical gap between cards. */
  cardGap: 12,
  /** Inner padding of a white card. */
  cardPadding: 15,
  /** Height of the availability (online) card. */
  onlineCardHeight: 53,
  /** Height of the CTA inside a request card. */
  ctaHeight: 43,
  /** Job icon tile inside a request card. */
  jobTile: 34,
  /** Icon tile behind a section header. */
  sectionTile: 55,
  /** Job icon circle in a list row. */
  rowIcon: 38,
  /** Status pill height in a list row. */
  rowPillHeight: 18,
  /** Status pill height in the verification row. */
  pillHeight: 22,
  /** Full-width map viewport used by the active-job boards. */
  activeMapHeight: 260,
  tabBarHeight: 62,
  activeTabUnderlineWidth: 40,
} as const;

/** Soft card elevation used across the driver boards. */
export const driverShadow = {
  shadowColor: '#0B0B0B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
} as const;

export { motionTokens, getPressableFeedback } from './motion';
