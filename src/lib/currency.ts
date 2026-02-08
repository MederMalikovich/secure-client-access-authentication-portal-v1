export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('kk-KZ', {
    style: 'currency',
    currency: 'KZT',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCurrencyShort = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ₸`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ₸`;
  }
  return `${value} ₸`;
};
