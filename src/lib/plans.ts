export type PlanId = "starter" | "pro" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  staffSeats: number;
  monthlyBookings: number;
  features: string[];
  smsReminders: boolean;
  customBranding: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 19,
    tagline: "For solo practitioners finding their rhythm.",
    staffSeats: 2,
    monthlyBookings: 200,
    smsReminders: false,
    customBranding: false,
    features: [
      "Up to 2 staff members",
      "200 bookings per month",
      "Online booking page",
      "Email confirmations & reminders",
      "Customer records",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    price: 39,
    tagline: "For growing teams with a full book.",
    staffSeats: 10,
    monthlyBookings: 2000,
    smsReminders: true,
    customBranding: false,
    features: [
      "Up to 10 staff members",
      "2,000 bookings per month",
      "SMS reminders",
      "Staff availability & time off",
      "Customer notes, tags & history",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    price: 79,
    tagline: "For multi-room clinics, spas and practices.",
    staffSeats: 100,
    monthlyBookings: 100000,
    smsReminders: true,
    customBranding: true,
    features: [
      "Unlimited staff members",
      "Unlimited bookings",
      "Custom branding on your booking page",
      "Priority support",
      "Advanced reporting",
    ],
  },
};

export const PLAN_LIST: Plan[] = [PLANS.starter, PLANS.pro, PLANS.business];
