export const siteConfig = {
  businessEmail: process.env.NEXT_PUBLIC_ORDER_EMAIL?.trim() ?? "",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() ?? "",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() ?? "",
};

export function formatPhoneForDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("44") && digits.length === 12) {
    return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

export function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits}` : "";
}

export function productEnquiryHref(product: { title: string; pricePence: number | null }) {
  if (!siteConfig.businessEmail) return null;
  const price = product.pricePence === null ? "No price set; please confirm" : `£${(product.pricePence / 100).toFixed(2)}`;
  const subject = `Enquiry about ${product.title}`;
  const body = ["Hello,", "", "I would like to enquire about ordering:", "", `Product: ${product.title}`, `Price: ${price}`, "", "Could you please let me know if this bouquet is currently available and how I can arrange the order?", "", "Thank you."].join("\n");
  return `mailto:${siteConfig.businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}