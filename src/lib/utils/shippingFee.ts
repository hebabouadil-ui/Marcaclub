// Shipping cost from CN to destination country (USD)
// Used both client-side (display) and server-side (Stripe charge)
export const SHIPPING_BY_COUNTRY_USD: Record<string, number> = {
  // North Africa
  MA: 3.5,  DZ: 4.0,  TN: 4.0,  LY: 4.5,  EG: 4.5,
  // Middle East
  AE: 6.0,  SA: 6.0,  QA: 6.0,  KW: 6.0,  BH: 6.0,  OM: 6.5,  JO: 6.5,
  // North America
  US: 7.0,  CA: 7.5,  MX: 8.0,
  // Western Europe
  FR: 9.0,  DE: 9.0,  GB: 8.5,  ES: 9.0,  IT: 9.0,
  NL: 9.0,  BE: 9.0,  PT: 9.5,  CH: 9.5,  AT: 9.5,  IE: 9.5,
  SE: 9.5,  NO: 9.5,  DK: 9.5,
  // Oceania
  AU: 10.0, NZ: 10.5,
  // Asia
  JP: 5.5,  SG: 5.0,  IN: 4.5,
  // South America
  BR: 9.5,
}
export const SHIPPING_DEFAULT_USD = 8.0

/**
 * Returns the shipping cost in CAD for a given destination country.
 * usdToCAD = how many CAD per 1 USD (e.g. 1.37)
 */
export function getShippingFeeCAD(countryCode: string, usdToCAD: number): number {
  const usd = SHIPPING_BY_COUNTRY_USD[countryCode] ?? SHIPPING_DEFAULT_USD
  return Math.round(usd * usdToCAD * 100) / 100
}
