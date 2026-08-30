You are a senior UI/UX designer and Frontend Engineer.

I want you to build a premium portfolio website for a professional photographer.

## Goal

The website should combine:

1. The WEBSITE STRUCTURE and CONTENT FLOW inspired by:
https://flstudiosa.com/


DO NOT copy the design from FL Studio.

Only use its content hierarchy and user journey.

The entire visual identity must be unique.

--------------------------------------------------

TECH STACK

- Next.js (App Router)
- TypeScript
- TailwindCSS
- (use between these) Framer Motion & Lenis (smooth scrolling) & GSAP ("Use GSAP and ScrollTrigger to create a cinematic scroll experience inspired by premium editorial and luxury portfolio websites. Do not reproduce another website's layout or assets. Create original animations that evoke the same level of polish, including smooth image reveals, pinned storytelling sections, subtle parallax, staggered entrances, and immersive transitions.")
- next/image
- Responsive (Mobile, Tablet, Desktop)

--------------------------------------------------

INTERNATIONALIZATION (i18n)

The website must be fully bilingual.

Supported languages:

• English (default)
• Arabic

Requirements

• Proper RTL support
• Dynamic language switching
• Automatic font switching
• Automatic text alignment
• Mirrored layouts where appropriate
• Navigation adapts to RTL
• Animations respect reading direction
• Icons that indicate direction (arrows, chevrons) must flip automatically in RTL

Use next-intl for translations.

Structure:

/messages
    en.json
    ar.json

Language Switcher

Place a minimal language toggle inside the navbar.

EN | العربية

Switching language should not reload the page.

--------------------------------------------------

DESIGN DIRECTION

The website should feel like:

• Luxury
• Editorial magazine
• Cinematic
• Minimal
• Timeless
• Premium
• High-end photography studio

Imagine a mix of:

- Leica
- Apple
- Aesop
- Kinfolk Magazine
- Luxury Architecture websites

NOT like a template.

--------------------------------------------------

COLOR PALETTE

Background:
#090909

Cards:
#141414

Primary Text:
#FFFFFF

Secondary Text:
#B5B5B5

Accent:
#C8A87D

Borders:
rgba(255,255,255,0.08)

--------------------------------------------------

TYPOGRAPHY

The website must fully support both English and Arabic (RTL/LTR).

Use next/font/google to load all fonts.

English Fonts

Primary UI & Body:
Inter

Alternative Display Font:
Space Grotesk

Arabic Fonts

Primary:
Noto Sans Arabic

Typography Rules

English

• Hero Titles → Space Grotesk (600–700)
• Section Titles → Space Grotesk (500–600)
• Body → Inter (400–500)
• Navigation → Inter (500)
• Buttons → Inter (500)

Arabic

• Hero Titles → Noto Sans Arabic (600–700)
• Section Titles → Noto Sans Arabic (500–600)
• Body → Noto Sans Arabic (400–500)
• Navigation → Noto Sans Arabic (500)
• Buttons → Noto Sans Arabic (500)

The website must automatically switch typography depending on the active language.

Example

English

Space Grotesk
Inter

Arabic

Noto Sans Arabic

Typography should feel:

• Premium
• Minimal
• Editorial
• Modern
• Luxurious
• Clean

Avoid decorative Arabic fonts.

Use generous line-height and spacing for Arabic text.

Suggested font sizes

Desktop

Hero:
72–96px

Section Title:
48–64px

Card Title:
24–32px

Body:
18px

Small Text:
15–16px

Mobile

Hero:
44–56px

Section Title:
32–40px

Body:
16px

Navigation:
15px

Letter Spacing

English

Hero:
-0.04em

Titles:
-0.02em

Navigation:
0.08em

Body:
0

Arabic

Do NOT apply negative letter-spacing.

Use natural spacing for Arabic typography.

Text Alignment

English (LTR)

Left aligned.

Arabic (RTL)

Right aligned.

Ensure every component supports RTL layouts without breaking spacing or animations.

--------------------------------------------------

WEBSITE STRUCTURE

1. Hero

Full viewport.

Large cinematic image/video.

Large typography.

Example:

BADRI STUDIO

Capturing stories that deserve
to be remembered forever.

CTA

Explore Portfolio

Background slowly zooms.

Navigation initially transparent.

--------------------------------------------------

2. About Studio

Large editorial layout.

Photo on one side.

Text on the other.

Heading:

We don't just take photographs.

Body:

We capture emotion, architecture,
people and unforgettable moments.

Minimal.

Lots of whitespace.

--------------------------------------------------

3. Featured Projects

Large project cards.

Each project has

• Hero Image
• Category
• Title
• Small description
• View Project button

Cards animate while scrolling.

--------------------------------------------------

4. Services

Display services as premium image cards.

Wedding Photography

Portrait Photography

Fashion

Commercial

Architecture

Travel

Events

Each card has subtle hover animations.

--------------------------------------------------

5. Portfolio Gallery

Create a masonry layout.

Images have different heights.

Hover effects:

• Image zoom
• Dark overlay
• Project title
• View Project

Click opens fullscreen lightbox.

--------------------------------------------------

6. Featured Story

Large immersive section.

One project explained like a story.

Large typography.

Large photography.

Minimal text.

--------------------------------------------------

7. Working Process

Display as timeline.

01 Discovery

02 Planning

03 Photoshoot

04 Editing

05 Delivery

Minimal design.

Thin lines.

Elegant typography.

--------------------------------------------------

8. Testimonials

Large premium cards.

Minimal.

Fade animation.

--------------------------------------------------

9. Client Logos

Gray logos.

Become white on hover.

--------------------------------------------------

10. Instagram Gallery

Large photo grid.

Hover effects.

--------------------------------------------------

11. Contact

Minimal.

Large heading.

Let's create something unforgettable.

Email

Instagram

WhatsApp

Book Session button.

--------------------------------------------------

12. Footer

Minimal.

Logo

Navigation

Socials

Copyright

--------------------------------------------------

LAYOUT

Alternate sections.

Never center everything.

Some sections:

Image left.

Text right.

Others:

Text left.

Image right.

Use asymmetrical layouts.

Like an editorial magazine.

--------------------------------------------------

ANIMATIONS

Everything should feel expensive.

Use Framer Motion.

Page load:

Fade in.

Scroll:

Reveal animations.

Images:

Mask reveal.

Hover:

Scale 1.05

Text:

Slide up.

Parallax:

Subtle.

NO flashy animations.

NO bouncing.

NO exaggerated motion.

--------------------------------------------------

IMAGE STYLE

Images should dominate the design.

Text should support the images.

The photography is the hero.

--------------------------------------------------

BUTTONS

Minimal.

Rounded.

Transparent.

Thin border.

Hover:

Background becomes white.

Text becomes black.

--------------------------------------------------

NAVBAR

Transparent at top.

Blur after scrolling.

Contains:

Logo

Portfolio

Projects

Services

About

Contact

Book Session button.

--------------------------------------------------

RESPONSIVE DESIGN

Desktop

Magazine layout.

Tablet

Two-column layout where possible.

Mobile

Single-column.

Maintain premium spacing.

Do not simply stack elements tightly.

--------------------------------------------------

CODE QUALITY

Use reusable components.

Suggested structure:

components/
    Navbar
    Hero
    About
    FeaturedProjects
    Services
    Gallery
    StorySection
    Process
    Testimonials
    Clients
    Instagram
    Contact
    Footer

app/

styles/

hooks/

lib/

--------------------------------------------------

COMPONENT REQUIREMENTS

Every component must:

Be reusable.

Be responsive.

Have loading animation.

Support dark mode.

Have proper TypeScript types.

--------------------------------------------------

PERFORMANCE

Use next/image.

Lazy load sections.

Optimize animations.

Avoid layout shift.

Maintain excellent Lighthouse scores.

--------------------------------------------------

FINAL RESULT

The final website should feel like a luxury photography exhibition rather than a standard portfolio website.

The visitor should experience storytelling through scrolling, where every section reveals another chapter of the photographer's work.

Focus on elegance, whitespace, typography, motion, and immersive photography.

Build production-ready code with clean architecture, reusable components, and polished animations. Avoid placeholder-template aesthetics and ensure every interaction feels refined and intentional.