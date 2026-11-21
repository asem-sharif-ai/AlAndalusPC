const UNITS = [
  ['year', 525600, 'y'],
  ['month', 43200, 'm'],
  ['week', 10080, 'w'],
  ['day', 1440, 'd'],
  ['hour', 60, 'h'],
];

const measure = (mins) => {
  const m = Math.abs(mins);
  const i = UNITS.findIndex(([, size]) => m >= size);
  if (i < 0) return { parts: [], exact: false };
  const [unit, size] = UNITS[i];
  const next = unit === 'day' ? undefined : UNITS[i + 1];
  const rest = (m % size) / (next ? next[1] : size);
  const parts = [[Math.floor(m / size), unit]];
  if (next && Math.floor(rest)) parts.push([Math.floor(rest), next[0]]);
  return { parts, exact: next ? Number.isInteger(rest) : m % size === 0 };
};

const letters = (parts) => parts.map(([n, unit]) => `${n}${UNITS.find(([u]) => u === unit)[2]}`).join(' ');

const AR_UNITS = {
  hour: ['ساعة', 'ساعتين', 'ساعات', 'ساعة'],
  day: ['يوم', 'يومين', 'أيام', 'يومًا'],
  week: ['أسبوع', 'أسبوعين', 'أسابيع', 'أسبوعًا'],
  month: ['شهر', 'شهرين', 'أشهر', 'شهرًا'],
  year: ['سنة', 'سنتين', 'سنوات', 'سنة'],
};

const words = (parts) =>
  parts
    .map(([n, unit]) => {
      const [one, two, few, many] = AR_UNITS[unit];
      return n === 1 ? one : n === 2 ? two : `${n} ${n <= 10 ? few : many}`;
    })
    .reduce((out, part) => `${out} ${/^\d/.test(part) ? 'و ' : 'و'}${part}`);

export const relEn = (mins, kind) => {
  const { parts, exact } = measure(mins);
  if (!parts.length) return 'Under 1h';
  const span = letters(parts);
  return {
    late: exact ? `Late By ${span}` : `Over ${span}`,
    soon: exact ? `In ${span}` : `Around ${span}`,
    ago: exact ? `${span} Ago` : `Over ${span} Ago`,
  }[kind];
};

export const relAr = (mins, kind) => {
  const { parts, exact } = measure(mins);
  if (!parts.length) return 'أقل من ساعة';
  const span = words(parts);
  return {
    late: exact ? `متأخرة ${span}` : `أكثر من ${span}`,
    soon: exact ? `خلال ${span}` : `خلال ${span}`,
    ago: exact ? `منذ ${span}` : `منذ أكثر من ${span}`,
  }[kind];
};
