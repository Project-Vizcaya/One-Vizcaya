# Nueva Vizcaya Municipal App --- Color Palette & UI/UX Guide

## 1. Design direction

**Recommended principle: one provincial application, 15 municipal
identities, and one consistent design system.**

Keep each municipality's selected primary color as its identity color.
Do not redesign the whole interface independently for every
municipality. Instead, use the municipality color in a controlled set of
places---such as the app bar, municipality name, selected navigation
item, small accents, and the municipality information card.

Keep functional colors and the overall layout consistent across all
municipalities. This makes the app recognizable as one product while
still allowing each municipality to feel distinct.

------------------------------------------------------------------------

## 2. Recommended shared colors and their purposes

These colors should be shared by all 15 municipalities. They are not
replaced when the user changes municipality.

  -----------------------------------------------------------------------
  Color role              HEX                     Purpose
  ----------------------- ----------------------- -----------------------
  Main background         `#F5F6F2`               Default page
                                                  background. A soft
                                                  neutral that is easier
                                                  on the eyes than a
                                                  strongly tinted page
                                                  background.

  Card / surface          `#FFFFFF`               Announcement cards,
                                                  information cards, list
                                                  containers, dialogs,
                                                  and other elevated
                                                  content.

  Primary text            `#202522`               Main headings, titles,
                                                  important labels, and
                                                  body text.

  Secondary text          `#68716B`               Descriptions,
                                                  timestamps, metadata,
                                                  captions, and
                                                  supporting information.

  Border / divider        `#E2E7E1`               Subtle card outlines,
                                                  separators, and input
                                                  borders.

  Emergency               `#D92D35`               Emergency
                                                  call-to-action and
                                                  critical emergency
                                                  information. Keep this
                                                  red in every
                                                  municipality.

  Success                 `#23834A`               Completed actions,
                                                  successful submissions,
                                                  and positive status
                                                  indicators.

  Warning                 `#B86B12`               Warnings and caution
                                                  states.

  Information             `#2878A8`               Informational messages
                                                  and neutral notices.

  Weather surface         `#E8F1F8`               Shared background for
                                                  weather information
                                                  cards.

  Weather text / icon     `#365F7D`               Weather labels and
                                                  icons when appropriate.

  Disabled / inactive     `#A3AAA4`               Disabled controls,
                                                  inactive icons, and
                                                  unavailable actions.
  -----------------------------------------------------------------------

### Why these shared colors matter

-   **Background (`#F5F6F2`):** keeps the interface calm and consistent.
-   **White surface (`#FFFFFF`):** separates content from the background
    without adding another strong color.
-   **Dark text (`#202522`):** provides clear, dependable readability.
-   **Secondary text (`#68716B`):** establishes hierarchy without
    competing with headings.
-   **Emergency red (`#D92D35`):** preserves a familiar and consistent
    emergency signal.
-   **Semantic colors:** communicate status, not municipal identity. For
    example, a success message should remain green even when the
    selected municipality is Bambang or Solano.

Do not use the municipality primary color for every element. It is an
identity accent, not the color for every heading, paragraph, icon, or
card.

------------------------------------------------------------------------

## 3. Municipality palettes

Each municipality has three identity colors:

-   **Primary:** the municipality's chosen identity color. Use it for
    the app bar, municipality name, selected navigation item, key icons,
    and small accents.
-   **Primary dark:** a darker companion color for pressed states, dark
    accent areas, or places where the primary needs more depth.
-   **Primary light:** a pale tint for municipality information panels,
    subtle highlights, chips, and selected backgrounds.

The shared background, surface, text, emergency, and semantic colors in
Section 2 remain the same for every municipality.

  ---------------------------------------------------------------------------
  Municipality   Definitive      Primary        Primary dark   Primary light
                 title                                         
  -------------- --------------- -------------- -------------- --------------
  Alfonso        The             `#8B0000`      `#650000`      `#F5E5E5`
  Castañeda      Hydroelectric                                 
                 Powerhouse                                    

  Ambaguio       The Gateway to  `#008080`      `#005F5F`      `#E3F0F0`
                 Mount Pulag                                   

  Aritao         The Onion       `#E27D60`      `#B85D43`      `#FBECE7`
                 Capital                                       

  Bagabag        The Pineapple   `#F4A460`      `#B96D2B`      `#FCF0E2`
                 Haven                                         

  Bambang        The             `#800000`      `#5C0000`      `#F5E5E5`
                 Agricultural                                  
                 Hub                                           

  Bayombong      The Educational `#006400`      `#004B00`      `#E5F0E5`
                 & Institutional                               
                 Capital                                       

  Diadi          The Eco-Tourism `#2E8B57`      `#216640`      `#E6F2EA`
                 Sanctuary                                     

  Dupax del      The             `#8B4513`      `#65320E`      `#F3E9E1`
  Norte          Agro-Forestry                                 
                 Frontier                                      

  Dupax del Sur  The Heritage    `#A52A2A`      `#7D2020`      `#F5E8E8`
                 Capital                                       

  Kasibu         The Citrus      `#FF8C00`      `#B96500`      `#FFF0DB`
                 Capital of the                                
                 Philippines                                   

  Kayapa         The Summer      `#4682B4`      `#315D82`      `#E8F0F7`
                 Capital of                                    
                 Nueva Vizcaya                                 

  Quezon         The Mineral     `#4169E1`      `#2D4BA5`      `#E9EDFA`
                 Outpost                                       

  Santa Fe       The Gateway to  `#556B2F`      `#3D4D22`      `#EEF0E4`
                 Cagayan Valley                                

  Solano         The Premier     `#0A369D`      `#07266E`      `#E7ECF7`
                 Commercial Core                               

  Villaverde     The             `#32CD32`      `#238B23`      `#EAF7E5`
                 Trailblazer's                                 
                 Sanctuary                                     
  ---------------------------------------------------------------------------

**Note:** The dark and light companion colors are proposed design
variants, not official municipal colors. Treat them as starting values
and check contrast in the actual interface before release.

### Suggested application of the municipality colors

  -----------------------------------------------------------------------
  UI component                        Color to use
  ----------------------------------- -----------------------------------
  App bar / top identity area         Primary

  Municipality name and identity      Primary, if contrast is sufficient;
  heading                             otherwise use primary dark

  Municipality information card       Primary light

  Selected bottom navigation item     Primary or primary dark

  Small identity icon / accent line   Primary

  Pressed / active state              Primary dark

  General cards                       Shared white surface

  Main page background                Shared `#F5F6F2`

  Paragraphs and descriptions         Shared text colors
  -----------------------------------------------------------------------

For light primary colors---especially Bagabag, Aritao, Kasibu, and
Villaverde---avoid automatically placing white text directly on the
primary color. Use a darker companion color or dark text where
necessary.

------------------------------------------------------------------------

## 4. Announcement card: recommended redesign

### What to change

The current announcement card uses a bright green fill. That creates a
strong visual block and may clash with the selected municipality theme.
It also competes for attention with the emergency button.

Change it to:

1.  **White background (`#FFFFFF`)** for every municipality.
2.  **A narrow vertical accent bar** on the left, using that
    municipality's primary color.
3.  **A small category label** such as `OFFICIAL ANNOUNCEMENT`, using
    the municipality's primary color or a darker accessible variant.
4.  **A dark headline** using `#202522`.
5.  **A muted summary and source** using `#68716B`.
6.  **A subtle border** using `#E2E7E1`, with a consistent corner radius
    and padding.
7.  Keep the external-link icon small and neutral so it does not compete
    with the headline.

Do not use the municipality's bright light tint as the entire
announcement background. Reserve the light tint for smaller identity
panels or selected states.

### Example: Bambang announcement card

``` text
┌─────────────────────────────────────────────┐
│                                             │
│  ▌  OFFICIAL ANNOUNCEMENT                   │
│  ▌                                          │
│  ▌  PGNV, LGU BAMBANG SIGN MOA DURING ...  ↗│
│  ▌  The Provincial Government of Nueva      │
│  ▌  Vizcaya and the Local Government Unit...│
│  ▌  — Official announcement source          │
│                                             │
└─────────────────────────────────────────────┘
```

-   Card background: `#FFFFFF`
-   Left accent bar: Bambang primary `#800000`
-   Category label: `#800000` (or a darker accessible variant)
-   Headline: `#202522`
-   Summary and source: `#68716B`
-   Border: `#E2E7E1`

### Example: Bayombong announcement card

Use exactly the same layout and shared colors, but change the left
accent bar and category label to Bayombong's primary `#006400`.

This is the important distinction: **the card design stays the same;
only its municipal identity accent changes.**

### Announcement card layout guidance

-   Use a left accent bar approximately 4--5 dp wide.
-   Use around 16 dp internal padding as a starting point.
-   Keep the category label small and visually secondary to the
    headline.
-   Limit the headline to around 2 lines and the summary to around 2--3
    lines, with truncation where needed.
-   Use a consistent card radius, such as 16 dp.
-   Keep the whole card tappable if it opens the full announcement.
-   Make sure the text remains readable at larger system font sizes.

------------------------------------------------------------------------

## 5. How to follow the 60--30--10 color rule

The 60--30--10 rule is a visual guideline for distributing color. It is
not a strict measurement that every screen must satisfy exactly.

For this app, use it as follows:

### 60% --- Neutral background

Use the shared main background `#F5F6F2` for most of the page.

Examples: - Main screen background - Space between cards - Large unused
areas around content

### 30% --- Surfaces and content containers

Use white `#FFFFFF` for most cards and containers.

Examples: - Announcement cards - Municipality information card (or use
the municipality's light tint here) - List containers - Forms and
dialogs

### 10% --- Municipality identity accent

Use the municipality's primary color in smaller, deliberate areas.

Examples: - App bar or top identity area - Municipality name - Selected
navigation item - Small icons and accent bars - Thin highlights and
active indicators

The 10% is a guide for the identity accent, not a requirement to make
every primary-colored component occupy exactly one tenth of the screen.

### Important: semantic colors are functional exceptions

Emergency red, success green, warning orange, and information blue have
their own meanings. Use them only where those states or actions are
present. Do not recolor them to match the municipality.

### Practical screen checklist

-   [ ] Is most of the page a calm neutral background?
-   [ ] Are cards mostly white or lightly tinted?
-   [ ] Is the municipality color used intentionally rather than
    everywhere?
-   [ ] Is the emergency action clearly visible?
-   [ ] Are announcements visually quieter than emergency actions?
-   [ ] Are weather and status colors consistent across municipalities?
-   [ ] Does the screen still look like the same app when switching
    municipalities?

------------------------------------------------------------------------

## 6. Accessibility and text contrast (WCAG)

Some of your lighter primary colors---especially Bagabag's Sandy Brown
(`#F4A460`), Aritao's Onion Coral (`#E27D60`), Kasibu's Citrus Orange
(`#FF8C00`), and Villaverde's Lime Green (`#32CD32`)---may not provide
enough contrast with white text.

### Recommendations

-   **Use dark text on light-colored backgrounds.**
-   **Use white text only on sufficiently dark primary colors.**
-   **Don't use the primary color for every text element.**
-   **Maintain at least 4.5:1 contrast for normal-sized text where
    possible (WCAG AA).**
-   For large text, WCAG AA generally requires at least 3:1 contrast.
-   Check icons, controls, borders, and focus indicators separately;
    text contrast alone does not cover every accessibility requirement.

### Practical examples

  Background             Recommended foreground
  ---------------------- ---------------------------------
  Bagabag `#F4A460`      Dark text such as `#202522`
  Kasibu `#FF8C00`       Dark text such as `#202522`
  Villaverde `#32CD32`   Dark text such as `#202522`
  Bambang `#800000`      White may work; verify contrast
  Bayombong `#006400`    White may work; verify contrast
  Solano `#0A369D`       White may work; verify contrast

Do not assume a color is accessible based on how it looks on a phone.
Verify actual foreground/background pairs with a WCAG contrast checker.
A primary color can still be used as a brand accent even when it is
unsuitable as a text background.

------------------------------------------------------------------------

## 7. Suggested visual hierarchy for the home screen

Use this order of visual importance:

1.  **Emergency action:** immediately recognizable and easy to find.
2.  **Municipality identity:** name, logo, and definitive title.
3.  **Important announcements:** readable, but not more visually
    dominant than emergency access.
4.  **Weather and local information:** consistent shared functional
    styling.
5.  **Navigation:** consistent across all municipalities, with the
    selected item using the municipality primary color.

The emergency action should remain prominent because of its function.
Avoid making every other card equally bright or saturated.

------------------------------------------------------------------------

## 8. Implementation checklist

Before applying the themes to all 15 municipalities:

-   [ ] Define shared colors once in a central theme file.
-   [ ] Define each municipality's primary, dark, and light colors in
    one configuration.
-   [ ] Make the municipality selector update the theme without changing
    the layout.
-   [ ] Keep emergency, success, warning, information, and weather
    colors shared.
-   [ ] Redesign the announcement card using a white surface and
    municipality-colored left accent.
-   [ ] Use the shared neutral background and card surface.
-   [ ] Check text contrast for every municipality, especially lighter
    primary colors.
-   [ ] Test light and dark device brightness conditions.
-   [ ] Test larger font sizes and smaller screens.
-   [ ] Verify that switching municipalities changes identity colors
    without making the app feel like a different product.

## 9. Final recommendation

Keep the 15 primary colors. They give each municipality a recognizable
identity and make the municipal selector meaningful.

The most important improvements are:

1.  Replace municipality-tinted full-screen backgrounds with the shared
    neutral background `#F5F6F2`.
2.  Use white cards consistently.
3.  Use each municipality's light tint selectively for its identity card
    and small highlights.
4.  Redesign announcements as white cards with a narrow
    municipality-colored accent bar.
5.  Keep emergency red and all semantic colors consistent across the
    entire application.
6.  Use dark text on lighter primary colors and verify contrast against
    WCAG AA.

**The intended result:** a clean, consistent provincial government
application in which every municipality has its own identity without
overwhelming the user with color.
