# Changelog

Work on the 3D Care project website, carried out by ACIA (Akgün Yaratıcı
Fikirler Derneği) under WP5, Activity 5.1 (Dissemination of Project Results
and Stakeholder Outreach). Every change is also recorded in the commit history
of this repository: https://github.com/laroca00/3dcare/commits/main

## 2026-10-27

### A film-like colour grade
- The 3D scenes get a colour grade, as a film look-up table would give:
  a gentle S-curve for contrast, cool teal shadows, warm highlights and
  slightly richer mid-tones.

### A more real printer
- The printer's aluminium frame now has a brushed, anodised finish with a
  thin satin layer, so its highlights stretch along the extrusions. The
  printed teal parts have a satin sheen, and the bed carries the bronze
  textured PEI sheet most desktop printers ship with.

### From paper to printer
- The home story now opens on a large sheet of drawing paper on the desk,
  with a drawn border and a title block. Once the page is ready a pencil
  line draws the printer on it in front elevation, in graphite. As the
  visitor scrolls, the drawing stands up off the paper like a pop-up page,
  gains its depth and turns teal, then fills in as the real printer.
  The design-program selection box is gone.
- Fixed an error when the desk's textures came from the browser's cache
  before the 3D scene had finished setting up.

### Faster on phones, and easier to use with a keyboard
- On phones and modest devices the home page shows at once, without the
  loading screen, and the 3D scene sets itself up after the visitor's
  first scroll or touch, in smaller steps. Measured with Lighthouse on a
  simulated mid-range phone: performance 52 → 84–87, total blocking time
  about 5.8 s → 0.25–0.35 s, no layout shift. Capable computers keep the
  loading screen and the opening.
- The 3D model loader now comes in its own file, only when the hand and
  the desk's scanned objects are needed. The 3D budget check now counts
  every chunk three.js is split over (199 KB of 200 KB).
- The opening card on phones uses a plain warm tint instead of a costly
  blur.
- Story titles waiting for their scene are no fainter than half, so they
  keep a readable contrast.
- Keyboard: the menu bar itself is no longer a stop of its own, and the
  chapter tabs show as soon as one of them has focus.

## 2026-10-24

### Fixes on the mug and on phones
- Fixed thin light lines showing through the mug's wall and handles: the
  gaps between printed layers let the background through. The layers now
  all but touch, a core closes the wall from inside, and the handle's
  slices overlap.
- On phones, the mug's plan and the "3D CARE" wordmark built from circles
  no longer fall over the scene's text: the camera lifts while the plan
  shows, so the mug sits lower.

### A printed surface on the mug
- The mug's plastic has the fine grain of a real print: a texture that runs
  along the layers with tiny specks across it, so its satin sheen breaks
  up as a printed PETG mug's does. Made in code, no extra download.

### Skin on the hand
- The hand that holds the mug has real skin detail: fine pores and creases
  that catch the light, slight colour variation and an uneven sheen, all
  made in code (no extra download). Its nails are paler and a little
  glossy.

### Photo-scanned objects on the desk
- A used pencil, a blue pen, an eraser, a pair of pliers for cleaning up
  prints and a small potted succulent on the opening desk are now real
  photo-scanned objects (free, CC0, from Poly Haven: "Stationery
  Supplies", "Pliers" and "Potted Plant 04"), with their own textures;
  about 780 KB together. They replace the drawn dark pencil and eraser.
- Fixed a dark smudge on the mat under the printer's drawing: the printer's
  still-transparent solid parts were throwing contact shadows and
  occlusion before it became solid.

### Contact shadows, and full quality that stays on
- At full quality the opening desk gets ambient occlusion: a soft shadow
  where the spools, the coffee bag and the tools meet the wood and the
  mat, as in a photograph. It runs only while the desk is in view.
- Fixed the 3D scene lowering its quality for good during its first
  seconds (while shaders compile and textures load), which turned off the
  glow, the reflection and the anti-aliasing even on fast computers. The
  first four seconds, and the anti-aliasing's own refining frames, no
  longer count.

### Photographed surfaces on the desk
- The opening desk is now real oak veneer, from a photographed texture
  with its own grain relief and sheen, and the cutting mat has the fine
  surface of real rubber. Both textures are free (CC0) from Poly Haven:
  "Mocha Oak Veneer" and "Rubber Tiles". Together they add about 120 KB.

### Leaves in the window light
- The sunlight on the opening desk now carries the shadow of a plant on
  the windowsill: its leaves sway gently while the scene rests and lean
  with the pointer, like a breeze. The window light is the main light on
  the desk now, so its light and shade read clearly.

### Sharper still pictures
- At full quality, whenever the 3D picture holds still it is refined over
  the next frames from 32 slightly shifted renders (temporal
  anti-aliasing): thin lines such as the mat's grid and the drawing come
  out clean, without jagged or shimmering edges. While anything moves it
  renders as before.

### Sunlight through a window on the desk
- The opening desk is lit like a photograph: sunlight comes in through a
  window from the top left, laying the frame's soft light and shade and a
  plant's leaves across the desk, every object throws a long soft shadow
  towards the bottom right, and the corners fall off into warm shade.

### A lived-in desk
- Three spools of filament in the project's colours (teal, violet half
  used, yellow) at the top left, snipped-off filament ends scattered on
  the wood, a digital caliper beside the ruler, a sticky note with a pencil
  sketch of a two-handled mug, and a bag of coffee at the bottom right.
- The main pencil is natural wood, the oak and the mat a touch softer.

### A fuller, warmer desk
- The opening has its own light now: soft, warm afternoon light instead
  of the cool blueprint light the drawing scene uses, so the desk reads
  rich and full. The oak is a deeper brown, the mat a soft olive green,
  and its grid lines are finer.

### A fuller workshop desk
- The opening desk now holds what a 3D printing workshop's desk holds: a
  spool of teal filament with cardboard flanges at the top left, its loose
  end curling across the wood; an orange snap-off utility knife across the
  bottom right, with a grey grip, a slider and a segmented blade; a dark,
  freshly sharpened pencil and an eraser at the bottom left; a teal
  calibration cube on the far corner of the mat. The ruler moves to the
  mat's right edge, and the paper clips are gone.
- The knife can be picked up and moved like the pencil and the ruler.

### The opening, matched detail by detail
- A lighter, honey-coloured oak desk; the mat set a little further left;
  softer window light.
- The project's line now sits above the giant "3D CARE", ending where the
  wordmark ends, and the giant wordmark is larger.
- The frosted card reads like a label: a large heading in capitals, a
  dotted rule, a short note set to the right, then the two ways in.
- The chapter tabs stay out of the way on the opening screen and come in
  once the story starts; the scroll hint is a dotted circle with an arrow
  and a short line in capitals.
- On phones the drawing stays in view between the words at the top and
  the card at the bottom of the first screen.

### One look, and a real cutting mat
- The site now has one look, dark; the light theme and its switch in the
  menu are gone, and the home story's still frames exist once.
- The opening's mat looks like a real studio cutting mat: olive green with
  a faint mottled surface, rounded corners, a soft cream grid of large
  squares, and millimetre ticks with numbers along the bottom and left
  edges. Its large grid makes the desk read as if seen up close.

### The opening, composed like a poster
- The opening camera looks almost straight down on the desk, with the
  printer's drawing in the middle of the picture and the mat a little
  turned, as if put down by hand; the wooden desk shows on the left, with
  two paper clips, the pencil lies across the top and the ruler across the
  bottom right. Warm daylight through a window falls across the desk, and
  the picture is shot like a miniature: sharp in the middle, softly blurred
  towards the edges.
- The opening's words are laid out over the desk: the project's line in
  small capitals over a giant "3D CARE" at the top left, the lead to the
  right of the drawing, and a frosted card at the bottom left with what
  the project is and the two ways in.
- The loading screen now has the mat's colour with construction lines
  through the printer's file, selected in the middle with bezier handles;
  it fills like a clock hand as the scene gets ready, then melts into the
  desk, the selection standing where the drawing grows in.

### A loading screen
- The home page now opens on a loading screen in the site's own colours:
  the cutting mat's grid, the 3D Care mark drawn arc by arc and a count
  from 000 to 100 % that follows the real set-up of the 3D scene (its
  code, the printer, the studio, the drawing, the hand, the shaders), with
  a thin teal bar along the bottom. When everything is ready it lifts away
  like a sheet, uncovering the desk, and the printer's drawing grows in.
- The page does not scroll while it shows. It lifts within nine seconds
  whatever happens, never shows without script, and is skipped for
  visitors who prefer reduced motion.

### A playful opening desk
- The home page opens on the empty desk; a moment later the printer's
  drawing ("yazici.stl" / "printer.stl") grows in from nothing, as if a
  cursor were dragging its selection handle in a design program, while
  its size counts up to 41 × 49 × 67 cm and settles.
- The pencil and the ruler are larger. Pointing at them lifts them a
  little; they can be picked up and moved across the mat, and the pencil
  draws a teal line on the mat as it goes.
- The 3D scene now also starts by itself once the page has loaded and the
  browser is idle, so the opening plays without waiting for a scroll.

### A director's pass over the home story
- When the mug is touched or held, the light now fills the background
  behind the giant line: colour washes in from the edges, its hue slowly
  running through the spectrum, with a large soft light drifting across;
  the mug, the hand and the line stay clear in front of it.
- The mug looks like real PETG: a satin surface with a thin glossy skin
  and a soft sheen along its layers, in whatever colour was chosen. The
  raised logo has smoother edges.
- The hand has warm, soft skin instead of grey plastic.
- A subtle lens finish: a touch of colour fringing towards the corners.
- The story's words stay readable over every scene (a soft shadow in the
  dark theme, a paper halo in the light one).

### A desk that fills the screen, and a close-up that shows the mug
- The home page now opens straight onto the desk, seen from above and
  filling the whole screen: a large cutting mat with its grid and the
  3D Care wordmark on a wooden desk, the printer's drawing selected on it,
  a pencil and a ruler. From there the camera comes down as the drawing
  becomes the printer.
- Fixed the 0.3 mm close-up: up near the top of the mug, the mug's layers
  disappeared and the scene looked empty. They are always drawn now, so
  the close-up shows the mug's wall, rim and handle with the fine layers.

## 2026-10-22

### Finer layers, a glow behind the mug, a tubelight in the menu
- The mug is drawn with twice as many, thinner layers, so it looks
  smoother from a distance while the print still visibly builds up. The
  printer's screen now counts the real layers (out of 300).
- The 0.3 mm close-up no longer fills the screen with stripes: the camera
  stands a little further back and to the side, so the rim, the handle and
  the mug's edge stay in the picture next to the fine layers.
- Touching the freshly printed mug (or the hand holding it) now lights it
  from behind: a soft glow whose colour slowly runs through the spectrum,
  with a brighter spot circling the mug. It replaces the colour that came
  in from the screen's edges.
- The menu marks the current page like a tubelight: the link sits on a
  soft pill with a small lamp glowing down from the top edge, and both
  spring across when the page changes.

### A clearer, slower story
- Every scene's text now arrives with its scene and stays on screen while
  it plays; before, some texts (the 0.3 mm layers, the material) scrolled
  past at the wrong moment and their scenes showed no words at all.
- The scenes that matter most get more scrolling room: the printing, the
  mug's entrance ("Just printed"), its plan and its layers.
- "Just printed" stands on a deep ink-blue background with a violet glow
  (a soft lavender in the light theme) instead of plain black or grey.
- The mug looks finer: its handles are smooth round loops instead of
  stacked blocks, and every printed layer has softly rounded edges.
- The hand that holds the mug now wraps its fingers round the handle;
  before, some fingers (the ring finger most) went through it.

### The open model package
- At the end of "design and print", the printed mug lowers into a
  cardboard box marked with the 3D Care sign and "Open model · Free". The
  flaps fold shut while what every model is published with appears beside
  it: STL file, print settings, user guide, safety notes, adaptation tips.
  The text says it plainly: the models are shared, not sold, free to
  download, print, adapt and pass on.
- Then the box opens, the camera looks inside and eight pictures come out
  as a strip that slides past: an open file, adapted to the hand, print
  settings included, printed at the centre, with the filament at hand,
  checked layer by layer, greener materials, and an old idea shared again
  (two-handled cups from Troy, Greece and Rome). Finally the mug comes back
  out and goes on to the morning table.
- This replaces the separate unboxing section added earlier the same day,
  which read like a product for sale.
- The gallery now shows the mug in every picture: new pictures of a
  therapist test, a meal at the table and students lifting the mug off the
  printer replace the ones without it.

### Gallery: in everyday life
- The home page now shows nine pictures of printed aids in everyday life
  right after the story: the mug, morning coffee, a key turner, a spoon
  tried out with a therapist, a plate guard, students at a printer, layer
  lines, filament and a trainer with a group.
- Laid out like an editorial table: a large title, then rows split by
  dashed lines, each with a numbered topic, a title and one sentence about
  the project on the left and its picture on the right. As a row scrolls
  in, its picture grows in from the top right corner and the photo settles
  from a slight zoom (still for visitors who prefer reduced motion).
- Each picture has a description for screen readers, in English and Turkish.
- A note under the gallery says the pictures are illustrative and do not
  show the project's real users or its final models.

## 2026-10-20

### A hand reaches for the mug
- In "Just printed", once the mug has stopped turning it faces the
  camera, and a hand reaches in from the right, closes its fingers round
  the handle (the loop, or the T-grip if the visitor chose it) and lets go
  again before the thermal view. While it holds the mug, the screen's edges
  light up in the project's colours, as when the visitor touches the mug.
- The hand is the free model "First Person hands rigged" by David Fischer
  (CC BY 4.0, on Sketchfab); the footer credits it on every page. It loads
  with the 3D scene, and the story works without it if it cannot load.
- The still frame for this moment shows the hand.

### Choose the grip
- The slicer on the printer's screen now offers three grips besides the
  colour: two handles, one handle, or a T-grip on each side to close a fist
  round. The preview, the printed mug, its plan (with the right width:
  15.6, 12 or 16.8 cm) and the mug card all follow the choice. A note says
  these are the same mug adapted for different hands; they are not models
  from the catalogue.
- The story's text no longer assumes two handles.

### A giant wordmark in the footer
- The footer card on every page ends in a giant "3D CARE", cut by the
  card's edge, with specks of teal, violet and yellow filament drifting
  round it (they stay still for visitors who prefer reduced motion).
- The gallery planned for this step waits for the project's photos.

### Four looks at the fresh mug
- Between "Just printed" and the morning table, the home story now looks at
  the mug four ways, keeping it in the middle of the picture (beside the
  text on wide screens):
  - **Still warm:** through a thermal camera, the base that has just left
    the hot bed glows, the thin handles are cooler, and the mug cools as
    the visitor scrolls. A small scale shows warm and cool.
  - **Measurements open to all:** a technical drawing is traced over the
    mug with its real size (8.4 cm across, 9 cm tall, 15.6 cm with the
    handles), and the drawing's construction circles gather into the words
    "3D CARE" above it.
  - **Layers of 0.3 millimetres:** the camera moves up to the mug's wall,
    where its real layers show as fine ridges, with a mark the height of
    one layer.
  - **Material matters too:** the mug stands in a cream room with leaf
    shadows (warm dappled light in the dark theme). The text says what the
    project application says: the mug is PETG, which takes heat better
    than PLA; the schools in Ludbreg and Gölcük are trying biodegradable
    and recycled filaments; ways to reuse old prototypes are being explored.
- Each new scene has its own still frame for reduced motion or no WebGL.
- The layer count is now right everywhere: a 9 cm mug printed in 0.3 mm
  layers has about 300 layers, not 30 (the "Just printed" text, the slicer
  and the mug card). The print head card now gives 200–250 °C, which
  covers both PLA and PETG.

### An opening desk
- The home story now opens from above, on a designer's desk: the printer's
  drawing lies on a cutting mat with a measuring grid, a pencil and a steel
  ruler. A selection frame with handles marks the drawing, labelled with
  its file name and its real size. As the visitor scrolls, the camera
  comes down, the desk fades away and the drawing becomes the printer.
- On phones the desk sits below the opening text so the two do not
  overlap. The still frames were rendered again with the desk.

### Light from the edges
- While the freshly printed mug stands in front of the giant line, pointing
  at it (or pressing and holding it on a touch screen) floods the edges of
  the screen with the project's teal, violet and yellow, leaving the mug and
  the line clear. A small hint invites the visitor to try it.

### The mug takes over
- After the print, the home story hands over from the printer to the mug:
  the print head lifts away, the mug rises off the bed towards the visitor
  and turns once, and the printer slides back into the dark. A giant
  glowing line ("Just printed" / "Az önce basıldı") stands behind the mug,
  which passes in front of it, with a short caption underneath. The line
  is also in the page as text for screen readers and search engines.
- From there the mug comes down to the morning table as before. The still
  frames (for reduced motion or no WebGL) gained a frame for this moment.

### Story chapters and progress
- The step chip at the top of the home story became a row of the four
  steps of making a model. The current step is underlined, and clicking a
  step scrolls to where it begins. On phones only the current step shows
  its name.
- A thin bar on the right edge fills as the story goes on, and a "Scroll to
  continue" hint at the bottom of the first screen fades once the visitor
  starts scrolling.

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

### The story is how a model is made, and it closes on the project's numbers
- A small step indicator follows the story through the four steps of making
  a model: specify (the opening drawing), design and print, test with users
  (the mug on the table) and publish (the close).
- A short closing part follows the story: the camera rises over the table
  while the project's nine other tools are sketched in beside the mug, and
  the numbers of what the project will deliver by 2028 come in one by one,
  ending with how the final files will be published. The stage then fades
  into the page. These numbers moved here from their own section below,
  and stay plain text for screen readers and visitors without motion.
- The glow effect now only lights real light sources, which removes a white
  haze some camera angles caused.

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
