import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

export const PRICE_IDS = {
  builderMonthly: process.env.STRIPE_PRICE_BUILDER_MONTHLY!,
  builderAnnual: process.env.STRIPE_PRICE_BUILDER_ANNUAL!,
} as const;

export type PlanId = keyof typeof PRICE_IDS;
