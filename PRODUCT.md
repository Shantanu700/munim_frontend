# Product

## Register

product

## Platform

web

## Users

Munim's primary users are **merchants** — the owner or whoever holds the `Merchant` account for a
small-to-mid Indian ecommerce store. They sign in to `/dashboard` to manage orders, the product
catalogue, policy rules, the audit ledger and Razorpay payouts, generally checking in a few times a
day rather than living in the dashboard continuously.

A `buyer` role exists at signup (people who purchase through an AI shopping agent), but there is no
buyer-facing dashboard in this codebase yet — every screen under `app/dashboard` today is built for
the merchant role. The buyer experience is a **known future surface**, out of scope for the current
design work, not a gap to design around now.

## Product Purpose

Munim is a trust-and-visibility layer for agentic commerce. It does two things at once: it makes a
merchant's store **safely transactable** by AI shopping agents — every agent checkout is evaluated
by a merchant-configured policy gate and written to an immutable audit ledger the merchant can
verify — and it makes that store **discoverable** to those agents in the first place, by scanning the
merchant's published product data into an agent-readable catalogue with its own MCP endpoint.
Success looks like a merchant who trusts the platform enough to leave the gate armed, can read the
ledger and understand exactly what was refused and why, and sees real agent-driven sales without
feeling like they've handed over control of their storefront.

## Positioning

The layer that makes a merchant's store both safely transactable by AI shopping agents and
visible/discoverable to them — with the merchant keeping the controls and a full audit trail.

## Brand Personality

Trustworthy, precise, in-control. The voice is plainspoken and specific rather than hyped: it
explains what happened and why — ledger reason codes, policy breach sentences, a status pill that
always names the next concrete step — instead of offering vague reassurance. Nothing is dramatized;
a refusal is a fact reported evenly, not an alarm.

## Anti-references

A generic fintech dashboard — navy-and-gold, stock icon packs, interchangeable with any other B2B
SaaS admin panel, no distinct point of view. Munim's navy-and-sand palette and verdict language
(never traffic-light color) exist specifically to avoid reading as that.

## Design Principles

- **Show the reason, not just the verdict.** Every refusal, breach and policy read prints the
  sentence behind it. "Trustworthy" here means explainable, not just correct.
- **Control before automation.** The kill switch and per-rule enforcement pills sit one click from
  any screen; agent commerce is opt-in and reversible, never a black box the merchant has to trust
  blindly.
- **One source of truth per moment.** A screen fetches the smallest number of authoritative calls
  that describe one moment, so the UI can never contradict itself — a stale cached field reads worse
  than a slower request.
- **Real state, not simulated.** Empty and error states are what the API actually reports, not
  fixtures standing in for a demo; a screen with nothing to show says so honestly.
- **Precise over decorative.** Exact figures (paise/rupee conversions, tabular numerals, timestamps
  in the reader's own timezone), and color never substitutes for a word.

## Accessibility & Inclusion

WCAG AA. Verdicts and status never rely on color alone — allow/step-up/deny read as navy/warm-sand/
deep-navy paired with a word, never green/amber/red — which is already enforced at the token level.
No additional formal requirement beyond AA.
