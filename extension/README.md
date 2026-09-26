# Fathom Rebuild — Chrome extension

Adds a **Record with Fathom Rebuild** button inside Google Meet. Clicking it opens the recorder in a new tab, already knowing which call you are in; the only step left is choosing the Meet tab in Chrome's share dialog and ticking *Share tab audio*.

## Install (10 seconds)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → choose this `extension/` folder

Join any Google Meet. The button appears once you are in the room and disappears when you leave.

## What it deliberately does not do

Chrome's `tabCapture` API would let an extension record a tab's audio with no dialog. This extension does not use it. The share-tab dialog is the consent step, and it stays — nothing is recorded until you choose to share.

Three files, no build step, no network requests of its own.
