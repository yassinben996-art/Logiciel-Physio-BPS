/** Nombre au format français (virgule décimale) : 4.8 → « 4,8 ». */
export const fr = (n: number): string => String(n).replace('.', ',');
