# Changelog

Work on the 3D Care project website, carried out by ACIA (Akgün Yaratıcı
Fikirler Derneği) under WP5, Activity 5.1 (Dissemination of Project Results
and Stakeholder Outreach). Every change is also recorded in the commit history
of this repository: https://github.com/laroca00/3dcare/commits/main

## 2026-10-18 (continued)

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
