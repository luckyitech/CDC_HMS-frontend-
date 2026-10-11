import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bold, Italic, Underline, Highlighter, List, ListOrdered, Mic, Square } from 'lucide-react';
import { sanitizeNoteHtml, htmlToText } from '../../utils/noteHtml';
import { isCalcPaste } from '../../utils/calcClipboard';

/**
 * RichTextField — a formatted text box for the clinical note (10 Oct 2026).
 *
 * Bold · italic · underline · highlight (one colour: yellow = "important")
 * · bullet list · numbered list. Nothing else: the value in and out is HTML
 * passed through sanitizeNoteHtml, the same allow-list the server applies,
 * so what the doctor sees is what the record keeps. Pasted text comes in as
 * plain text (no Word styling) — except a result copied from the consultation
 * calculator (marked by calcClipboard), which keeps its bold result line.
 *
 * Shortcuts: Cmd/Ctrl+B, I, U; Cmd/Ctrl+Shift+H highlight; "- " or "* " at
 * the start of a line starts a bullet list, "1. " a numbered one.
 * Typing "/" at the start of a line (or after a space) calls onSlash — the
 * note module opens its "add a section" menu there.
 * Dictation (the microphone) drops words at the cursor.
 *
 * Built on contentEditable + execCommand like the mail composer (no editor
 * library — decision D7, no new dependency). Chrome writes highlights as
 * <span style="background-color"> — they are turned into <mark> in place, so
 * the DOM only ever holds the tags the sanitiser keeps.
 *
 * Props: value (html), onChange(html), placeholder, ariaLabel, minHeight (px),
 *        onSlash(), onFocus, disabled, autoFocus
 * Ref:   focus(), insertText(text)
 */
const HIGHLIGHT = '#fef08a';   // tailwind yellow-200

const isHighlightColour = (c) => c && !/^(transparent|initial|inherit|unset|none|rgba\(0, 0, 0, 0\))$/i.test(String(c).trim());

/** spans Chrome made for highlights → <mark>; every other span / font → its text. */
const normaliseMarks = (root) => {
  root.querySelectorAll('span, font').forEach((el) => {
    if (!el.isConnected) return;
    const bg = el.style && el.style.backgroundColor;
    const replacement = isHighlightColour(bg) ? document.createElement('mark') : null;
    if (replacement) {
      while (el.firstChild) replacement.appendChild(el.firstChild);
      el.replaceWith(replacement);
    } else {
      el.replaceWith(...Array.from(el.childNodes));
    }
  });
  // a highlight inside a highlight is one highlight
  root.querySelectorAll('mark mark').forEach((m) => { if (m.isConnected) m.replaceWith(...Array.from(m.childNodes)); });
};

const unwrap = (el) => el.replaceWith(...Array.from(el.childNodes));

const RichTextField = forwardRef(({
  value = '', onChange, placeholder = '', ariaLabel = 'Text', minHeight = 72,
  onSlash = null, onFocus = null, disabled = false, autoFocus = false,
}, ref) => {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const lastEmitted = useRef(null);
  const [empty, setEmpty] = useState(!htmlToText(value));
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(true);
  const recognitionRef = useRef(null);

  const readHtml = useCallback(() => {
    const el = editorRef.current;
    if (!el) return '';
    normaliseMarks(el);
    return sanitizeNoteHtml(el.innerHTML);
  }, []);

  // Value → editor, only when it really differs (never while the doctor is
  // mid-word: their own edits come back equal and are left alone).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming = sanitizeNoteHtml(value);
    if (incoming === lastEmitted.current) return;
    if (incoming === sanitizeNoteHtml(el.innerHTML)) { lastEmitted.current = incoming; return; }
    el.innerHTML = incoming;
    lastEmitted.current = incoming;
    setEmpty(!htmlToText(incoming));
  }, [value]);

  const emit = useCallback(() => {
    const html = readHtml();
    lastEmitted.current = html;
    setEmpty(!htmlToText(html));
    if (onChange) onChange(html);
  }, [onChange, readHtml]);

  const keepSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) selectionRef.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (selectionRef.current && sel) { sel.removeAllRanges(); sel.addRange(selectionRef.current); }
  };
  const focus = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (selectionRef.current) { restoreSelection(); return; }
    // caret at the end
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }, []);

  const command = (cmd, arg) => {
    if (disabled) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(cmd, false, arg);
    keepSelection();
    emit();
  };

  const toggleHighlight = () => {
    if (disabled) return;
    editorRef.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const mark = (node.nodeType === 1 ? node : node.parentElement)?.closest('mark');
    if (mark && editorRef.current.contains(mark)) {
      unwrap(mark);                        // highlighted → plain (the whole run)
    } else if (!range.collapsed) {
      document.execCommand('hiliteColor', false, HIGHLIGHT);
      normaliseMarks(editorRef.current);
    }
    keepSelection();
    emit();
  };

  const insertText = useCallback((text) => {
    if (!text || disabled) return;
    focus();
    document.execCommand('insertText', false, text);
    keepSelection();
    emit();
  }, [disabled, emit, focus]);

  useImperativeHandle(ref, () => ({ focus, insertText }), [focus, insertText]);

  useEffect(() => { if (autoFocus) focus(); }, [autoFocus, focus]);

  // The text from the caret back to the start of its line.
  const lineBeforeCaret = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== 3) return range.startOffset === 0 ? '' : null;
    const before = node.textContent.slice(0, range.startOffset);
    if (/\n/.test(before)) return before.slice(before.lastIndexOf('\n') + 1);
    // walk back through the inline siblings on the same line
    let text = before;
    let n = node;
    while (n.previousSibling) {
      const p = n.previousSibling;
      if (p.nodeName === 'BR' || (p.nodeType === 1 && !/^(B|STRONG|I|EM|U|MARK|SPAN)$/.test(p.nodeName))) break;
      text = (p.textContent || '') + text;
      n = p;
    }
    return text;
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); command('bold'); return; }
      if (k === 'i') { e.preventDefault(); command('italic'); return; }
      if (k === 'u') { e.preventDefault(); command('underline'); return; }
      if (k === 'h' && e.shiftKey) { e.preventDefault(); toggleHighlight(); return; }
    }
    if (e.key === ' ') {
      const line = lineBeforeCaret();
      if (line === '-' || line === '*' || line === '1.') {
        e.preventDefault();
        // remove the marker (one backspace per character keeps the caret in
        // this line — cutting the range would drop it at the top of the box),
        // then start the list
        for (let i = 0; i < line.length; i += 1) document.execCommand('delete');
        document.execCommand(line === '1.' ? 'insertOrderedList' : 'insertUnorderedList');
        keepSelection();
        emit();
      }
      return;
    }
    if (e.key === '/' && onSlash && !mod) {
      const line = lineBeforeCaret();
      if (line !== null && (line === '' || /\s$/.test(line))) {
        e.preventDefault();
        keepSelection();
        onSlash();
      }
    }
  };

  const onPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html') || '';
    if (isCalcPaste(html)) {
      // the sanitiser keeps strong/br and drops the marker; a line break after
      // it so the caret lands on a fresh line
      document.execCommand('insertHTML', false, `${sanitizeNoteHtml(html)}<br>`);
      emit();
      return;
    }
    const text = e.clipboardData?.getData('text/plain') || '';
    if (text) { document.execCommand('insertText', false, text); emit(); }
  };

  // ---- dictation (the same engine as VoiceInput, dropped at the caret) ----
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceOk(false); return undefined; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    r.onresult = (event) => {
      let said = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) said += `${event.results[i][0].transcript} `;
      }
      if (said.trim()) insertText(said);
    };
    r.onend = () => setListening(false);
    r.onerror = (event) => {
      setListening(false);
      if (event.error === 'not-allowed') toast.error('Microphone access denied. Allow it in your browser settings.', { duration: 4000, position: 'top-right' });
    };
    recognitionRef.current = r;
    return () => { try { r.stop(); } catch { /* already stopped */ } };
  }, [insertText]);

  const toggleListening = () => {
    const r = recognitionRef.current;
    if (!r) return;
    if (listening) { r.stop(); setListening(false); return; }
    try { keepSelection(); r.start(); setListening(true); } catch { toast.error('Could not start voice input. Please try again.', { duration: 3000, position: 'top-right' }); }
  };

  const tool = 'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40';
  const stop = (e) => e.preventDefault();   // keep the selection in the editor

  return (
    <div className={`rounded-lg border ${disabled ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-blue-100'}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 px-1.5 py-1">
        <button type="button" className={tool} onMouseDown={stop} onClick={() => command('bold')} disabled={disabled} aria-label="Bold" title="Bold (⌘B)"><Bold className="h-4 w-4" /></button>
        <button type="button" className={tool} onMouseDown={stop} onClick={() => command('italic')} disabled={disabled} aria-label="Italic" title="Italic (⌘I)"><Italic className="h-4 w-4" /></button>
        <button type="button" className={tool} onMouseDown={stop} onClick={() => command('underline')} disabled={disabled} aria-label="Underline" title="Underline (⌘U)"><Underline className="h-4 w-4" /></button>
        <button type="button" className={tool} onMouseDown={stop} onClick={toggleHighlight} disabled={disabled} aria-label="Highlight" title="Highlight (⌘⇧H)"><Highlighter className="h-4 w-4" /></button>
        <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />
        <button type="button" className={tool} onMouseDown={stop} onClick={() => command('insertUnorderedList')} disabled={disabled} aria-label="Bulleted list" title="Bullets (type - and a space)"><List className="h-4 w-4" /></button>
        <button type="button" className={tool} onMouseDown={stop} onClick={() => command('insertOrderedList')} disabled={disabled} aria-label="Numbered list" title="Numbered list (type 1. and a space)"><ListOrdered className="h-4 w-4" /></button>
        <span className="ml-auto flex items-center gap-2">
          {listening && <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-white" />Recording…</span>}
          {voiceOk && !disabled && (
            <button type="button" onMouseDown={stop} onClick={toggleListening} className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-white ${listening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`} aria-label={listening ? 'Stop dictation' : 'Dictate'} title={listening ? 'Stop dictation' : 'Dictate — words land at the cursor'}>
              {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </span>
      </div>
      <div className="relative">
        {empty && <div className="pointer-events-none absolute left-3 top-2.5 text-sm text-gray-400">{placeholder}</div>}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          data-rich-text="true"
          className="rich-note px-3 py-2.5 text-sm leading-relaxed text-gray-900 outline-none"
          style={{ minHeight }}
          onInput={emit}
          onKeyDown={onKeyDown}
          onKeyUp={keepSelection}
          onMouseUp={keepSelection}
          onBlur={keepSelection}
          onFocus={() => { if (onFocus) onFocus(); }}
          onPaste={onPaste}
        />
      </div>
    </div>
  );
});
RichTextField.displayName = 'RichTextField';

export default RichTextField;
