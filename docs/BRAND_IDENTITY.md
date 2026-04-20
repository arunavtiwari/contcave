# Brand Identity & Interface Guidelines

## 1. Design Philosophy: "Quiet Luxury"
ContCave is built on the principle of **Quiet Luxury**—an aesthetic that prioritizes minimalist sophistication, high-tier performance, and enduring elegance. The interface should feel expensive through its restraint, rather than through decorative excess.

### Core Tenets
- **Minimalist Sophistication**: Use negative space as a deliberate design element to provide cognitive breathing room.
- **Optical Clarity**: Ensure every UI element has a clear purpose and a high-contrast relationship with the surrounding environment.
- **Subtle Haptics**: Interactions should feel weighted and meaningful through precise transitions and hover states, avoiding "shimmer" or "pulse" effects that introduce visual noise.

---

## 2. Typography System
Our typography pairing is designed to bridge the gap between classical trustworthiness and modern technical transparency.

### Primary Display (Serif)
- **Typeface**: **Georgia** (Standard Serif)
- **Usage**: All high-level headings (`h1`–`h6`) and hero statements.
- **Rationale**: Provides a sense of heritage, authority, and premium service.

### Primary UI & Body (Sans-Serif)
- **Typeface**: **Geist Sans**
- **Usage**: Body copy, form labels, navigation elements, and data-dense environments.
- **Rationale**: Offers extreme legibility and a modern, technical aesthetic that ensures the platform feels cutting-edge.

---

## 3. Color Architecture
A monochromatic-first palette supported by a refined metallic accent to maintain an "Enterprise" feel.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Foreground** | `#0f0e0c` | Primary text, heavy surfaces, deep shadows. |
| **Background** | `#ffffff` | Primary app surface, cards, empty states. |
| **Accent (Gold)** | `#c8a96e` | High-value accents, brand highlights, active states. |
| **Muted** | `#f5f5f5` | Secondary backgrounds, subtle dividers. |
| **Border** | `#e5e5e5` | Structural boundaries, input fields. |

---

## 4. Interaction Design
Every interaction must reinforce the "Enterprise" quality of the platform.

### Motion Principles
- **Timing**: Use `ease-out` or `cubic-bezier(0.16, 1, 0.3, 1)` for all transitions.
- **Subtlety**: Hover states should involve scale changes (e.g., `1.02x` or `1.05x`) rather than color shifts where possible.
- **Negative Avoidance**: Strictly avoid "janky" animations like shimmer pulses or aggressive horizontal gradients.

---

## 5. Component Logic
- **Pills**: Use the `subtle` variant for standard UI labels and selection states. The `glass` variant is reserved for media overlays (Hero, Cards) to provide a premium translucent aesthetic.
- **Buttons**: Heights are standardized between `10` (h-10) and `12` (h-12). Rounded buttons are reserved for landing page CTAs; modal actions use standard corner radii.
- **Modals**: Surfaces use `rounded-3xl` and `shadow-md` for a stable, integrated presence.
