# Changelog

Work on the 3D Care project website, carried out by ACIA (Akgün Yaratıcı
Fikirler Derneği) under WP5, Activity 5.1 (Dissemination of Project Results
and Stakeholder Outreach). Every change is also recorded in the commit history
of this repository: https://github.com/laroca00/3dcare/commits/main

## 2026-10-20

### A real-looking open printer
- The 3D printer in the home page story was rebuilt as an open-hardware "i3"
  printer of the kind adult education centres use: black aluminium
  extrusions, chrome rods, brass lead screws, a moving heated bed with a
  textured sheet, a tall print head with its fan, cable bundle and filament
  tube, and printed parts in the project's teal (with visible layer lines).
- When the printer comes apart it first turns once on its own axis while
  moving to the middle of the screen, then separates into its parts. Each
  part can be dragged to turn it on its own (its label lights up under the
  pointer), or the whole printer can be turned. The text for this step is
  shown as a caption at the bottom of the screen.
- The printed mug now carries the 3D Care logo, raised from its wall and
  printed layer by layer with the rest of the mug.

### A studio-quality home story
- Studio light: soft contact shadows under the printer and its parts,
  reflections from soft boxes on metal and plastic, and on capable devices a
  satin floor that faintly mirrors the printer.
- Lens: depth of field on the mug at the end and on the part under the
  pointer while the printer is apart, a soft glow on the brightest
  highlights, a light vignette and film grain, and a slight camera drift with
  the mouse. Heavier effects switch off by themselves on slower devices.
- Printing: the hotend glows while it prints, the fan and the spool turn, and
  the printer's screen counts the progress up to 100%. The mug hops slightly
  as it lands on the table.
- Taking the printer apart: the parts come off one after another, and each
  label sits at the end of a callout line, like a technical drawing.
  Clicking a part or its label opens a card on what the part does and how to
  look after it (English and Turkish). The labels and cards work with the
  keyboard; Escape closes a card.
- The 3D stage now reaches up under the floating navigation, so the scene
  fills the whole first screen.

### Slice, choose a colour, print
- Before printing, the camera moves in to the printer's own screen, which
  becomes a slicer: a preview of the mug drawn layer by layer, its layers
  and material, five filament colours (the project's teal, violet and
  yellow, plus white and coral) and a "Print" button. It works with mouse,
  touch and keyboard.
- The chosen colour goes to the spool, the preview and the printed mug.
- "Print" pulls the camera back while the sliced toolpaths appear on the bed,
  then plays the rest of the story by itself: the print, the mug landing on
  the table and the coffee. Any scroll, tap or key press takes over.
  Visitors who simply keep scrolling get the teal mug as before.

### The story as one film
- The light tells the story: a cool blueprint blue for the opening drawing,
  a neutral studio when the printer appears, a darker workshop with one
  strong light while it is taken apart, a slightly warmer room while it
  prints and a sunny morning at the end, in both themes.
- Story text enters with the scene: each line rises from behind its own
  mask, one after another, in step with the scroll.
- When the visitor stops scrolling, the scene keeps breathing for a few
  seconds (the camera floats a little, the fan turns, a cursor blinks on the
  printer's screen), then settles and stops drawing to save battery.
- The mouse wheel glides through the story instead of jumping a notch at a
  time. Touchpads, touch screens, the keyboard and the scroll bar work as
  before, and it is off with reduced motion.

### Time-lapse, a morning ending and a souvenir card
- While it prints, the camera swings slowly round the printer like a print
  time-lapse, and the printer's screen counts the layers (n / 30) and the
  time left. Filament visibly feeds through the tube from the spool, which
  turns with a slight wobble.
- The ending is a morning: as the mug lands, the floor becomes a wooden
  table, warm sunlight falls through a window across it and the room warms
  up, in both themes.
- At the end, "Get your mug card" makes a 1080 × 1350 card from the mug as it
  stands on the table, in the visitor's colour, with the 3D Care mark, the
  site address and the EU funding emblem. It can be downloaded, or shared
  directly from phones that support it.

## 2026-10-19

### Interactive printer and a new story ending
- When the printer comes apart it now fills more of the screen, and visitors
  can drag it to turn it and look at the parts from any side (touch screens:
  swipe sideways). It eases back to its place when the story moves on.
- The printer has softer, rounded edges, a textured print sheet and frame,
  and brushed aluminium.
- New ending: the printed mug now has two handles, is set down on the table
  next to the printer, fills with coffee and starts to steam, while the
  printer behind it goes out of focus. The mug can then be dragged to turn it.
  The hand from the earlier ending was removed. Story text and still frames
  were updated to match.
- The navigation bar marks the current page with a "limelight": a short teal
  bar along the top that shines a soft cone of light over the page's link.
  When the page changes the bar glides to the next link while the light dims
  and pours down again on arrival. On the home page it lights the 3D Care logo.

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
