export const siteConfig = {
  businessEmail: process.env.NEXT_PUBLIC_ORDER_EMAIL?.trim() ?? "belfastsweetpresents@gmail.com",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() ?? "447795272359",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() ?? "https://www.instagram.com/Belfastsweetpresentsforeveryone/",
  whatsappDisplayName: "Belfastsweetpresentsforeveryone",
};

export function normalizePhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") && digits.length === 11 ? `44${digits.slice(1)}` : digits.startsWith("44") ? digits : digits;
}

export function formatPhoneForDisplay(phone: string) {
  const digits = normalizePhoneNumber(phone);
  if (!digits) return phone.trim();

  if (digits.startsWith("44") && digits.length === 12) {
    return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  return `+${digits}`;
}

export function phoneHref(phone: string) {
  const digits = normalizePhoneNumber(phone);
  return digits ? `tel:+${digits}` : "";
}

export function whatsAppHref(phone: string) {
  const digits = normalizePhoneNumber(phone);
  return digits ? `https://wa.me/${digits}` : "";
}

export function productEnquiryHref(product: { title: string; pricePence: number | null }, quantity = 1) {
  if (!siteConfig.businessEmail) return null;
  const validQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const price = product.pricePence === null ? "No price set; please confirm" : `£${(product.pricePence / 100).toFixed(2)}`;
  const subject = `Enquiry about ${product.title}`;
  const body = [
    "Hello,",
    "",
    "I would like to enquire about ordering:",
    "",
    `Product: ${product.title}`,
    `Price: ${price}`,
    `Quantity: ${validQuantity}`,
    "",
    "Could you please let me know if this bouquet is currently available and how I can arrange the order?",
    "",
    "Thank you.",
  ].join("\n");
  return `mailto:${siteConfig.businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}