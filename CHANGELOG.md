# Changelog

Work on the 3D Care project website, carried out by ACIA (Akgün Yaratıcı
Fikirler Derneği) under WP5, Activity 5.1 (Dissemination of Project Results
and Stakeholder Outreach). Every change is also recorded in the commit history
of this repository: https://github.com/laroca00/3dcare/commits/main

## 2026-10-19

### Scroll story refinements
- The story uses the project's own colours: the opening drawing is drawn in
  bolder teal and violet lines, the printed mug and filament are teal, the
  print head is yellow, and the dark theme's studio uses the site's dark blue
  instead of warm brown.
- The printer appears larger, and the story scrolls about 1.5 times more
  slowly, so each step has more time on screen.
- On wide screens the opening drawing is shown as a picture straight away,
  so the page no longer opens with an empty half before the 3D scene loads.

### New footer
- The footer is now a dark card "taped" to the page, with the project's pages
  in two columns, the EU funding emblem and disclaimer, and the privacy,
  accessibility and source code links below it.
- Tailwind CSS was added for interface components (in src/components/ui),
  without changing the styles of the rest of the site.

### New navigation
- The main menu is now a bar floating at the top of the page. It folds into a
  small round button while the visitor scrolls down and opens again when
  they scroll back up or press it.
- On phones the links open in a side panel, which also works with the
  keyboard and screen readers. Visitors who prefer reduced motion get the
  same menu without the animation.

## 2026-10-18 (continued)

### Scroll story on the home page
- The home page opens with a 3D story that moves as the visitor scrolls: a
  technical drawing turns into a desktop 3D printer, the printer is shown in a
  studio, taken apart with each part labelled, prints an easy-grip mug handle
  layer by layer, and the finished mug ends up in a hand.
- The printer and the scene are built in code and belong to the project; no
  third-party models or footage are used. The scene follows the light and dark
  theme.
- The 3D code loads only after the page is shown, stays within a 200 KB
  budget (checked automatically) and draws only while the visitor scrolls.
- Visitors who prefer reduced motion, or whose browser cannot show 3D, see the
  same story as still pictures with descriptions.

### Light and dark theme
- The whole site now has a light and a dark theme. It follows the visitor's
  device setting, and a button in the header switches between them. The
  choice is remembered only in the visitor's browser.
- Colour contrast is checked automatically for both themes against WCAG 2.2
  AA, so every change to the palette is verified.

### New pages
- News section with a page per article, and the latest news on the home page.
  First articles: the project start and the website launch.
- Resources page listing the guides, files and plans the project will produce,
  by work package. The project logo can already be downloaded there.
- Network page for the Network of Innovative Local Learning Centres
  (Activity 5.3): who can join, what centres receive, what is asked of them
  and how to join. Linked from the home page, contact page and footer.

### Sharing and search engines
- Share cards: links shared on social media, messaging apps or by email now
  show the project title, a short description and an image (English and
  Turkish versions, with the EU emblem).
- Sitemap and robots file so search engines can find every page in both
  languages.
- Bilingual "page not found" page with links back to the site.

## 2026-10-18

### Planning
- Website plan agreed: site map, technical approach, hosting, content
  workflow, languages and phases aligned with the project timeline
  (`docs/website-plan.md`).
- Decisions recorded on domain name, contact and feedback forms, and the open
  licence question for the 3D models.

### Visual identity
- Project logo (concentric 3D print layers forming a "C"), colour palette and
  typography (Inter), checked for contrast and accessibility (`design/`).

### Website
- Website published at https://laroca00.github.io/3dcare/ with automatic
  deployment on every change.
- English and Turkish versions of all pages; other partner languages can be
  added.
- Pages: home, about the project, partners, 3D model catalogue with a detail
  page per model (3D preview, download, print settings, safety notes, test
  results), training, contact, privacy notice and accessibility statement.
- Official "Co-funded by the European Union" emblem on every page.

### Visitor statistics
- Cookie-free visitor statistics stored in a spreadsheet owned by the project
  (no third-party analytics service, no personal data).
- Recorded: page views, sessions, estimated country, referring websites,
  campaign links (`utm_*`), device, browser and operating system family, time
  on page, scroll depth, file downloads and clicks on external links.
- Dashboard with key figures and charts for dissemination reporting
  (`analytics/`).
- Privacy notice updated to list the data collected.
