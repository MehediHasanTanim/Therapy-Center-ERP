export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(iso));

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
