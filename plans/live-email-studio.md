# Live Email Studio — proposed feature design

Status: Phase 1 implemented in the Product updates email editor (live canvas,
shared renderer, section styling, draft recovery). Demo-composer GIF jobs and
inbox-screenshot services are not in this delivery.
Target: `/dashboard/admin/offers?tab=product`.
Audience: Orivraa administrators announcing product changes to shopkeepers.
Working assumption: customizable sections with a live canvas; the requested
preference between guided sections and a freeform canvas is still open.

## Product idea

Make the actual email the center of the editing experience. Administrators
assemble a short visual product story, see each edit immediately, and prepare
motion assets inside the same tool. The editor can use JavaScript; its output
is validated email HTML plus ordinary hosted images/GIFs and links.

The distinctive tool is a demo composer: select a moment from a product video,
crop to the action, add a caption or highlight, choose a strong opening frame,
and generate a short GIF linked to the full demo. The same composer can turn
before/after screenshots or a three-step walkthrough into an animated asset.

The objective is a compelling email that still communicates its message when
images are disabled or animation does not play. Essential copy and calls to
action remain HTML text and links, even when the visual contains captions.

## Editor experience

Keep the entry point within Product updates. Open an expanded workspace that
preserves the selected campaign and returns to its existing audience/schedule
controls. Email styling is editable without changing the surrounding admin UI.

| Area          | Contents                                                         | Primary interaction                                                       |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Header        | Campaign, subject/preheader, undo/redo, draft state, Save design | Understand which campaign is being edited and whether changes are applied |
| Left rail     | Layouts, sections, uploaded media; ordered section list          | Insert or reorder sections; select a section by keyboard or pointer       |
| Center        | Persistent live email canvas; desktop/mobile width controls      | See edits immediately; select a section to edit its properties            |
| Right rail    | Content, appearance and media controls for the selected section  | Change copy, crop, colors, typography, spacing and destination links      |
| Review drawer | Missing content, alt text, URLs, media weight and HTML size      | Jump directly to a section that needs attention                           |

At tablet widths, combine the library and inspector into one contextual side
panel. At phone widths, use Edit/Preview tabs that retain the same draft and
selection. Every drag action has an explicit Move up/Move down alternative.

Preview stays visible during typing, uploading and validation. Errors belong
beside the affected field, with a marked placeholder in the canvas; avoid
repeated error toasts or blanking the entire preview for one incomplete block.

## Tools that produce better emails

### Ready-made sections

- Product spotlight: a large image/GIF, concise benefit and one primary CTA.
- Before/after: paired screenshots with visible labels; optional GIF alternate.
- Three-step walkthrough: numbered captions and screenshots, stacked on mobile.
- Feature pair: image plus copy, with a tested mobile stacking order.
- Product gallery: two or three images with short captions and independent links.
- Release note: a small update label, heading, short description and optional link.
- Existing heading, text, image, linked demo, button, divider and spacer blocks.

Sections expose constrained layout choices rather than arbitrary absolute
positioning. Use theme presets, safe font stacks, hierarchy controls, background
colors, padding, alignment, borders and button treatments. A section preview
shows the result before insertion. Changing a template must offer undo and must
not silently replace a draft that already contains work.

### Demo composer

1. Choose an uploaded video or a sequence of screenshots.
2. For video, select a short excerpt; for screenshots, choose order and timing.
3. Crop to the meaningful action and add optional numbered callouts/captions.
4. Choose the first frame and preview the animation alongside that static frame.
5. Generate an optimized GIF and a matching static poster; retain the original.
6. Insert the GIF/poster as a linked demo section with a separate HTML CTA.

Start with a suggested 3–6 second loop; make duration and output size visible.
Let users lower width/frame rate or shorten the loop when an asset is heavy.
Use a meaningful first frame with the result visible, rather than a blank intro.
The full video plays after opening the destination link, with sound there.

These are proposed production capabilities, not functionality already present
in `uploadEmailMedia`. GIF generation needs an actual bounded media-processing
job. Progress, cancellation, retry, output-size limits and failure states are
part of that job; uploading an MP4 alone does not create a GIF.

### Preview and review

- Live layout preview: the same renderer and design inputs used for delivery.
- Desktop and mobile widths: inspect wrapping, stacking and CTA size.
- Images off: inspect alt text, live copy and links without relying on artwork.
- Static motion view: use the generated first-frame asset, not CSS that merely
  pauses an unrelated browser animation.
- Light/dark approximation: clearly label this as a design check; inbox clients
  may apply their own transformations.
- Inbox header: subject, preheader and sample personalization with explicit
  sample data. Never imply the sample recipient is a real selected recipient.
- Optional test-send action: an explicit admin-triggered operation with a named
  recipient, rate limiting and clear confirmation of the destination.

Browser layout checks are not pixel-accurate Gmail/Outlook/Apple Mail emulation.
Actual client screenshots require real inbox testing or a rendering-service
integration. Do not label width presets as specific email-client previews.

## Draft behavior

Maintain undo/redo and an account/campaign-scoped recoverable draft, with clear
Unsaved changes / Saved states. Keep editable draft state separate from the
design used by queued campaigns: automatic draft recovery must not silently
change a scheduled email. Save design continues to honor the current send lock.
When the server copy changed elsewhere, preserve the draft and surface a
conflict instead of overwriting. Do not add scheduling or sending controls that
bypass the existing audience confirmation workflow.

## Implementation direction

The current `EmailBlockEditor` alternates between editing and preview and its
preview endpoint is limited to 20 requests/minute. Auto-calling that endpoint on
every input change would create another failure mode.

Extract the existing pure HTML-rendering logic into a browser/server-compatible
email module. Keep the Nest service as the delivery wrapper; remove server-only
dependencies from the shared part. Render locally after a short debounce and
use the server for authoritative save/review validation. Give incomplete drafts
explicit preview placeholders; never persist/send those placeholders. Compare
server and browser output using identical options and normalized designs.

For canvas selection, trusted editor controls may wrap the preview. Selection
IDs and UI affordances must not enter the delivered email. Keep the preview
isolated, prevent arbitrary code in email content, and disable destination-link
navigation while selecting. A read-only preview remains possible when a send
lock prevents editing. Cancel obsolete preview work and bind uploads to stable
section IDs so late results cannot update a different section after reorder.

Evolve the validated design schema additively for section styles, preheader,
stable IDs and theme options. Keep legacy `{ blocks: [...] }` designs readable
and preserve their current rendering. Only expose controls after the renderer
supports them. Verify media dimensions, file types and URLs on the server;
never accept arbitrary HTML, JavaScript or unvalidated CSS from the editor.

Email layout uses responsive tables, inline styles and appropriate client
fallbacks. Rich effects such as annotated transitions are exported into assets.
No dependency on CSS animation, hover interactions, forms or native video for
the email's core message. Keep current unsubscribe and brand-footer behavior.

All editor text uses the existing translation system. Preserve the rendered
HTML size limits and distinguish HTML size from externally loaded asset size.

## Recommended delivery sequence

1. Live canvas, section selection, desktop/mobile widths, undo/redo, draft
   recovery, inline validation and essential style controls. Share the renderer
   and preserve existing designs before introducing richer section types.
2. Guided hero/before-after/walkthrough/gallery sections and reusable layouts;
   richer image cropping and theme controls.
3. Media-processing jobs for the demo composer, with generated GIF/static
   variants and explicit test-email review. Real inbox screenshot integration
   is optional and needs a separate service/cost decision.

Acceptance evidence: edits appear without leaving the form; invalid drafts
remain editable; rapid changes and late uploads cannot replace newer content;
saved designs survive reopening; legacy designs retain their output; preview
matches delivery for the same inputs; mobile sections stack correctly; queued
campaign locks and unsubscribe behavior hold; attack payloads remain escaped or
rejected. Run API and web typechecks and targeted renderer/editor/service tests,
then manually review a representative email in actual target inboxes before a
campaign send. Confirm the rollout flag/revert plan when implementation begins.

## Sources informing compatibility decisions

- [Can I Email: GIF format support](https://www.caniemail.com/features/image-gif/)
  — animation behavior varies, including static/limited animation in some Outlook versions.
- [Can I Email: video element support](https://www.caniemail.com/features/html-video/)
  — native video is not a dependable baseline across inboxes.
- [Can I Email: CSS animation support](https://www.caniemail.com/features/css-animation/)
  — animation support varies by client and should be an enhancement.
- [Mailchimp: add video to an email](https://mailchimp.com/help/add-video-to-an-email/)
  — linked thumbnails provide an established delivery pattern.
- [Mailchimp: preview and test emails](https://mailchimp.com/help/preview-and-test-your-email-campaign/)
  — browser/device preview and inbox-client testing serve different purposes.

Sources checked September 5, 2026. Individual compatibility tests include older
client versions; use them as design guidance and verify the target inboxes at
release. No support percentage is a guarantee for the campaign's audience.
