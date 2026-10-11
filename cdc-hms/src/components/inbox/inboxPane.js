// The Inbox's working pane (mail and the WhatsApp / Messenger / Instagram
// threads) fills the page from below the tabs to the bottom of the window
// (11 Oct 2026). Inbox.jsx is a full-height flex column; each pane is the item
// that grows. One definition so mail and the channels can't drift apart again
// (they had used two different hand-tuned heights).
export const INBOX_PANE = 'flex-1 min-h-[26rem]';
