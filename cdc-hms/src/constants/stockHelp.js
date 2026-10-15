// Stocks — the help behind each tab's "i" button (13 Oct 2026, Emu: "each tab
// needs a description, and what everything in the tab means/does … and
// instructions on how to resolve errors"). Plain text, one entry per tab id
// (pages/shared/Stocks.jsx TABS). Keep it in step when a tab changes.
//
// Shape: { title, about, parts: [[term, meaning]], fixes: [[problem, what to do]] }

// The rule every "fix" below follows: nobody can reverse or delete a movement.
// A mistake is corrected by recording what really happened, through a tab.
const NO_UNDO = "Nothing in Stocks can be deleted or reversed — a mistake is corrected by recording what really happened, so the history always shows both.";

export const STOCK_HELP = {
  dispense: {
    title: "Dispense",
    about: "Hands stock out to a registered patient or to a walk-in (someone not registered at the clinic who comes in for supplies). Everything in the list leaves stock at once and is recorded against the person.",
    parts: [
      ["Registered patient / Walk-in", "Choose who the stock goes to before scanning anything."],
      ["Patient search", "Scan the patient card, or search by name, UHID, phone, email or ID/passport number, then pick the patient."],
      ["Walk-in name and phone", "Both are required. The phone is how the clinic reaches them if a batch is ever recalled. Walk-ins show as \"Walk-in\" in Movements and in Reports → Walk-ins."],
      ["Scan box", "Scan each shelf label (STK-…). Scanning the same label again adds one more."],
      ["Dispensing list", "Each line shows the item, shelf code and expiry. Choose where it comes from and adjust the quantity with − / +."],
      ["FEFO warning (amber)", "An earlier-expiring batch of the same item is at that location. Use that batch if you can; if you carry on, it is logged in Reports → FEFO overrides."],
      ["High-alert confirmation", "High-alert medicines ask for a second confirmation before they enter the list."],
      ["Confirm & dispense", "Dispenses the whole list in one go. Cancel clears the list. Other tabs stay locked until you finish or cancel."],
    ],
    fixes: [
      ["\"Only N held there\"", "Lower the quantity, or choose another location that holds the batch."],
      ["The batch is expired, recalled or quarantined", "It cannot be dispensed. Scan another batch. Expired stock is written off in Analytics → Today."],
      ["Wrong item, quantity or patient — already dispensed", "Record the return in Returns → From a patient (tick \"safe to re-dispense\" if unused), then dispense correctly. " + NO_UNDO],
      ["Shelf label not recognised", "Type the code printed under the barcode. If it still fails, reprint the label from Movements → Deliveries or Receive."],
      ["Patient not found", "Try another detail (phone, UHID). If they are not registered and only need supplies, use Walk-in."],
    ],
  },

  items: {
    title: "Items",
    about: "The list of everything the clinic stocks, the storage locations and the suppliers — with how much of each item is held and where.",
    parts: [
      ["Items / Locations / Suppliers", "Switch between the three lists. Search narrows the list."],
      ["Stock levels", "Open an item's row to see how much is held in each location."],
      ["Counting unit and pack size", "The unit stock is counted in (pen, vial, box…) and how many units come in one supplier pack. Receive uses the pack size to suggest labels."],
      ["GTIN", "The manufacturer's box barcode. With it saved, scanning the box in Receive finds the item."],
      ["Reorder level / quantity", "When stock falls to the level, the item shows as low in Analytics; the quantity is the suggested order."],
      ["Cold chain", "Cold-chain items can only be received or moved into fridge locations."],
      ["High alert", "Dispensing it asks for a second confirmation."],
      ["Add / Edit / Retire", "Needs the \"add and edit items\" permission. Retire hides an item, location or supplier that is no longer used."],
      ["HbA1c test cartridge / Blood glucose test strip / Ketone test strip", "Added by default. The HbA1c, Random Blood Sugar and Ketones tests find them by name, so their names are fixed."],
    ],
    fixes: [
      ["An item was created twice", "Retire the duplicate once nothing is held under it (move its stock to the right item's location first, or count it out at Stocktake)."],
      ["Wrong unit or pack size", "Edit the item. It changes what new labels and reports say; past movements keep their quantities."],
      ["An item does not appear in Receive or Dispense", "Check it is not retired, and that the receiving location is a fridge if the item needs cold chain."],
      ["\"Cannot retire — stock is held\"", "Transfer the stock out, write it off, or return it to the supplier first."],
    ],
  },

  receive: {
    title: "Receive",
    about: "Records a delivery coming in, prints shelf labels for it, and keeps the supplier's invoice or receipt with a scan for auditing. Two ways: From an invoice (photograph it and confirm what was read) or One item at a time.",
    parts: [
      ["From an invoice", "Photograph or scan the invoice, receipt or delivery note (JPG, PNG or PDF). The HMS reads the supplier and every line, and fills in the item, batch, expiry and quantity. Nothing is saved until you tick \"Confirmed correct\" on every line and press Save."],
      ["Supplier", "Read from the invoice and matched to your suppliers. A supplier not on the list yet is added with one press (\"Add as a new supplier\") and matched automatically from then on."],
      ["Put away in", "Each line names where it goes — store, fridge or a room — so nothing needs a transfer afterwards. It starts at where that item was last received (else the store); \"Put all lines into\" sets every line at once. Cold-chain items only offer fridges."],
      ["Remembered / Suggested", "Remembered: this supplier has used that wording before, so the item is certain. Suggested: the closest name in the catalogue — check it. \"change\" picks another item; the two next-closest are offered underneath."],
      ["No confident match", "Search the catalogue for the item under another name. If the HMS really does not have it, \"Add as a new item\" opens the Items form filled in from the invoice — set its reorder level and it is remembered for next time."],
      ["Unclear on the scan", "An amber box is a value the reader was not sure of — check it against the box in your hand. A red expiry box is a medication with no expiry read; type it in."],
      ["Already received?", "Shown when that invoice number from that supplier is already on file, so one delivery is never entered twice."],
      ["Confirmed correct", "Tick each line once you have checked it. A line with a problem cannot be ticked until it is fixed; changing anything on a ticked line clears its tick. Save opens when every line is ticked, and all lines save together — if one fails, nothing is saved."],
      ["Printing after an invoice", "Labels are not printed automatically. After saving, each item has a label count (one per pack, or one per unit) and its own Print button; change the number first. Leaving with unprinted items asks you to confirm."],
      ["Supplier, document and number", "The supplier's invoice, receipt or delivery note. The number is optional; lines on one document share it. Once a number is typed you can scan the document."],
      ["Item", "Type the name or scan the box barcode (GTIN)."],
      ["Batch / lot no. and expiry", "As printed on the box. Expiry is required for medicines."],
      ["Packs and quantity", "Packs fill the quantity using the item's pack size; quantity is in the item's counting unit."],
      ["Receiving location", "Where it is put away. Cold-chain items only offer fridges."],
      ["Labels to print", "One per unit, or one per pack for items that come in packs. You can change the number (0 = none)."],
      ["Save & print", "Saves the line, prints the labels in one go and clears the item for the next one. A green \"Saved\" card confirms what went in."],
      ["Same delivery / New delivery", "Same keeps the supplier, number and location for the next item; New clears everything."],
      ["Received today", "Everything received today on any computer. The printer icon reprints one label."],
    ],
    fixes: [
      ["Wrong quantity, batch number, expiry or item", "Open Movements → Deliveries, select the line, correct it and give a reason (needs \"Can edit deliveries\"). The line then shows \"Edited\" with what changed. Reprint the labels if offered."],
      ["The same delivery was entered twice", "Correct the extra line's quantity to 0 in Movements → Deliveries, with the reason."],
      ["Put away in the wrong location", "Move it with Transfer."],
      ["Too much, faulty or the wrong item was delivered", "Send it back with Returns → To a supplier."],
      ["Labels print sideways, small or across two labels", "In the printer settings the paper must be 60 × 40 mm (Die-Cut Labels). In Chrome's print window: margins None, headers and footers off."],
      ["A label is damaged", "Reprint it from Received today or from Movements → Deliveries."],
      ["\"Not set up\" on From an invoice", "The server has no invoice-reader key (ANTHROPIC_API_KEY in the server's .env). Ask the administrator; use One item at a time meanwhile."],
      ["The reader matched the wrong item", "Press \"change\" on the line and pick the right one before ticking it. The correction is remembered for that supplier's wording, and is listed in Movements → Deliveries as a correction."],
      ["HEIC photo cannot be read", "iPhone photos in HEIC are not readable — set the camera to Most compatible, or take the photo from the Take a photo button, which gives a JPEG."],
    ],
  },

  returns: {
    title: "Returns",
    about: "Stock coming back from a patient, or stock going back to a supplier. In Movements these show as \"Return in\" and \"Return to supplier\".",
    parts: [
      ["From a patient", "Attach the patient, scan the item, give the quantity and reason."],
      ["Safe to re-dispense", "Ticked: it goes back into stock at the location you choose. Unticked: it goes to the Faulty Box, which cannot be dispensed from."],
      ["To a supplier", "Scan the shelf label, choose where it leaves from, how many, and why (excess, wrong item, faulty, short-dated, recalled). Expired and recalled stock can be sent back."],
    ],
    fixes: [
      ["Returned to the wrong location", "Move it with Transfer. Stock in the Faulty Box stays there until an administrator moves it."],
      ["Returned quantity was wrong", "Correct the count at Stocktake for that location, with a note explaining why. " + NO_UNDO],
      ["Sent back to the supplier by mistake", "When the stock comes back, receive it again in Receive."],
    ],
  },

  transfer: {
    title: "Transfer",
    about: "Moves stock from one location to another — for example from the store to a consultation room.",
    parts: [
      ["Scan", "Scan the shelf label of the batch being moved."],
      ["From / To", "Where it leaves and where it goes. Retired locations cannot receive stock."],
      ["Quantity", "How many units move."],
      ["FEFO warning", "An earlier-expiring batch of the same item is at the source. Move that one if you can, or give a reason (logged in FEFO overrides)."],
    ],
    fixes: [
      ["Moved to the wrong place", "Transfer it again, to the right place."],
      ["\"Requires cold chain\"", "That item can only go into a fridge location."],
      ["\"Only N held there\"", "Lower the quantity, or choose the location that actually holds it."],
    ],
  },

  rooms: {
    title: "Room Balance",
    about: "Shows what each room holds against the level it should keep (its par level), and builds a restock list from a store.",
    parts: [
      ["Grid", "Rooms across, items down. Red is below the minimum, amber close to it, green in range."],
      ["Edit pars", "Set each item's minimum and target for a room, or copy them from another room. Needs \"set par levels and restock rooms\"."],
      ["Doctor in this room", "For a doctor's room, choose the doctor who works there. The HbA1c, RBS and Ketones tests that doctor enters take their strip from this room; tests done at triage take theirs from the triage room."],
      ["Restock picklist", "Choose a store and generate: it lists what to take to each room to reach target, earliest-expiring first. Confirming a line moves the stock."],
      ["Store shortfalls", "Items the store does not have enough of to restock — reorder or receive them."],
    ],
    fixes: [
      ["A par level is wrong", "Edit pars for that room and save."],
      ["A doctor's tests show \"No room is matched\"", "Edit pars for their room, choose them as the doctor in this room, save — then Take now in Analytics → Today."],
      ["A restock line was moved to the wrong room", "Use Transfer to move it to the right room."],
      ["A room shows stock that is not there", "Count the room at Stocktake."],
    ],
  },

  stocktake: {
    title: "Stocktake",
    about: "Counts one location at a time and brings the system into line with what is actually on the shelf.",
    parts: [
      ["Location to count", "Choose a location and start: the list shows what the system expects, batch by batch."],
      ["Counted", "Enter what you actually count for each batch."],
      ["Note", "Recorded on every difference — e.g. monthly count, or who counted with you."],
      ["Submit", "Every difference is recorded as an adjustment, and appears in Reports → Variances."],
    ],
    fixes: [
      ["A count was entered wrongly", "Count that location again and submit — the new count sets it right, and both are on record."],
      ["Stock arrived while counting", "Lines delivered after the count started are not written down; count them next time."],
      ["Big or repeated differences", "Check Reports → Variances and Movements for that item to find where it went."],
    ],
  },

  movements: {
    title: "Movements",
    about: "The full history of every stock change — who, when, what, how many, from where to where — and Deliveries, the supplier documents stock came in on.",
    parts: [
      ["Filters", "Narrow by item, location, type, patient UHID or dates. \"Dispense — walk-ins only\" shows supplies given to walk-ins."],
      ["Intake / Dispense / Use", "Received in; handed to a patient or walk-in; used on a patient in a room — including the supplies of each HbA1c, RBS or Ketones test."],
      ["Use cancelled", "A test was taken off a patient's charge sheet as not done, so its supplies went back to stock."],
      ["Transfer", "Moved between locations."],
      ["Return in / Return to supplier", "Back from a patient; sent back to a supplier."],
      ["Delivery corrected", "A received line's quantity was corrected in Deliveries."],
      ["From invoice / Manual", "How a delivery was entered: read from a photographed invoice and confirmed, or typed one item at a time. Filter Deliveries by it; an invoice line also lists what staff corrected before confirming (what the reader got wrong)."],
      ["Adjustment", "A stocktake difference."],
      ["Expiry / Damage write-off", "Taken off the books as expired or damaged."],
      ["Deliveries", "Each invoice or receipt with its lines and its scan. \"Not scanned\" means the document still needs scanning."],
      ["Editing a delivery line", "With \"Can edit deliveries\", select a line to correct the item, quantity, batch number or expiry, with a reason. The line then shows \"Edited\"; click it to see what changed, who and why."],
    ],
    fixes: [
      ["Something was recorded wrongly", NO_UNDO + " Received wrong → correct the line in Deliveries. Dispensed wrong → Returns → From a patient, then dispense again. Moved wrong → Transfer. Count wrong → Stocktake."],
      ["A line received without an invoice number", "It is not in Deliveries — use the pencil on its Intake row here to correct it."],
      ["A delivery has no scan", "Open it in Deliveries and use Scan document."],
    ],
  },

  analytics: {
    title: "Analytics",
    about: "Today shows what needs doing now; Reports is everything for looking back; Audit shows who did what, and when.",
    parts: [
      ["Today — the four numbers", "Expired on the shelf, expiring within 30 days, out of stock or low, and the last stocktake. Click one to jump to its list."],
      ["Today — to-do list", "Grouped in order of risk. Expired stock has a Write off button (needs \"write off expired stock\"): the stock is recorded as thrown away, with an optional comment, in the disposal register. No witness or certificate is needed."],
      ["Tests not taken from stock", "Tests on a patient's charge sheet whose strip could not be taken — no triage room with a par for it, no room matched to the doctor, or none left in the room. Take now tries again; Settle closes it with a note."],
      ["Reports → Inventory overview / Reorder", "Everything held and where; what is at or below its reorder level and how much to order."],
      ["Reports → Expiry", "What expires in a month or range — and for past months, how much was used, written off, returned or is still on the shelf."],
      ["Reports → Consumption", "Units dispensed and used per month, including how much went to walk-ins."],
      ["Reports → Batch recall", "Type a batch or shelf code: where it is now and every patient and walk-in who received it."],
      ["Reports → Walk-ins / Disposal register / FEFO overrides / Variances", "Supplies given to walk-ins; every write-off; every time an earlier-expiring batch was bypassed; every stocktake difference."],
      ["Export", "Each report exports to CSV; \"Export all to Excel\" puts every report in one workbook."],
      ["Audit — when it was last done", "For every location, when it was last counted and by whom; the last delivery received; and when each room was last restocked. Amber means never, or overdue — use it to set stocktake and restock schedules."],
      ["Audit — how deliveries were received", "Each delivery session says whether it was read From invoice, entered Manually, or both; By person counts how many of someone's deliveries came from an invoice; every event and the CSV carry \"How received\"."],
      ["Audit — receiving, stocktakes and room balancing", "One line per delivery received, stocktake (with how long it took), room restocked or par change in the range, and who did it."],
      ["Audit — by person / every stock event", "How often each person did each function, and every timestamped stock event — filter by person or function, export to CSV. The same events show in the Activity Log and each person's Staff File → Activity."],
    ],
    fixes: [
      ["Written off the wrong quantity", "Count that location at Stocktake to set it right. " + NO_UNDO],
      ["Numbers look wrong everywhere", "An administrator can use \"Rebuild levels from ledger\" in Reports, which recalculates every level from the history."],
      ["Expected a report to show something it doesn't", "Check the date range at the top of the report."],
      ["A test shows under \"Tests not taken from stock\"", "Move strips into the room (Transfer or the restock picklist), or match the room to the doctor in Room Balance → edit pars, then Take now. If it was accounted for another way, Settle it with a note."],
    ],
  },
};
