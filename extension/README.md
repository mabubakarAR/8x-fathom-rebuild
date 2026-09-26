# Noted — Chrome extension

Adds a **Record with Noted** button inside Google Meet. Clicking it opens the recorder in a new tab, already knowing which call you are in; the only step left is choosing the Meet tab in Chrome's share dialog and ticking *Share tab audio*.

## Install (10 seconds)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → choose this `extension/` folder

Join any Google Meet. The button appears in the call bar once you are in the room and disappears when you leave.

## Automatic

By default the recorder also opens by itself, in a background tab, the moment you join a call — with your calendar rule already applied (record / skip, and why). The share dialog is still yours to approve. Turn it off from the extension's popup.

## What it deliberately does not do

Chrome's `tabCapture` API would let an extension record a tab's audio with no dialog. This extension does not use it. The share-tab dialog is the consent step, and it stays — nothing is recorded until you choose to share.

Five files, no build step, one permission (`storage`, for the on/off switch), no network requests of its own.
