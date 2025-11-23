const USD_TO_IDR_RATE = 15000;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatUsdToIdr(usdValue: number) {
  const idrValue = usdValue * USD_TO_IDR_RATE;
  return currencyFormatter.format(idrValue);
}

export function formatCustomIdr(amount: number) {
  return currencyFormatter.format(amount);
}

// Format number with thousand separators (e.g., 900000 -> "900.000")
export function formatPriceWithSeparator(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/\./g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export { USD_TO_IDR_RATE };

