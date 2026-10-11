/**
 * The "Contact us" form's rules, the same limits the API enforces (so the visitor is told what is wrong before anything is sent).
 * Pure functions: tested without a browser.
 */

export const CONTACT_LIMITS = { name: 100, email: 150, phone: 50, messageMin: 10, messageMax: 4000 } as const;

/** What the message is about: the numbers are the API's. */
export const CONTACT_TYPES = [
  { value: 1, label: "General inquiry" },
  { value: 2, label: "Sales" },
  { value: 3, label: "Support" },
  { value: 4, label: "Partnership" },
  { value: 5, label: "Complaint" },
] as const;

export type ContactValues = { name: string; email: string; phone: string; message: string; type: number };
export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const EMAIL = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const PHONE = /^\+?[0-9 ()\-]{7,25}$/;

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Please enter your name.";
  else if (name.length > CONTACT_LIMITS.name) errors.name = `The name can have at most ${CONTACT_LIMITS.name} characters.`;

  if (!email || email.length > CONTACT_LIMITS.email || !EMAIL.test(email)) errors.email = "Please enter a valid email address.";

  if (!phone || phone.length > CONTACT_LIMITS.phone || !PHONE.test(phone) || phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Please enter a valid phone number.";
  }

  if (message.length < CONTACT_LIMITS.messageMin) errors.message = `Please write at least ${CONTACT_LIMITS.messageMin} characters.`;
  else if (message.length > CONTACT_LIMITS.messageMax) errors.message = `The message can have at most ${CONTACT_LIMITS.messageMax} characters.`;

  if (!CONTACT_TYPES.some((t) => t.value === values.type)) errors.type = "Please choose what your message is about.";

  return errors;
}

export function hasErrors(errors: ContactErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** A visitor never sees the hidden "website" field; only a program fills it in. Such a message is dropped without telling it. */
export function looksLikeBot(honeypot: string): boolean {
  return honeypot.trim().length > 0;
}

export function messageCounter(message: string): string {
  return `${message.length}/${CONTACT_LIMITS.messageMax}`;
}
