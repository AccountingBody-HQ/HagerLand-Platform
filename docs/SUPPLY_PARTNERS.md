# Supply partners: how to use them

Admin → **Supply partners** (`/roodber8/supply/partners`). This is HagerLand's private notebook about the businesses we buy materials from. Nothing here is ever shown on the website, to customers, or to the business itself. Owner and Operations staff can use it; Agent and Content staff cannot.

## The rule

**Publish a business only after confirming its details with the business itself.** Until then it stays private: it is not on the public site, in search, in the sitemaps, or reachable by its address, and its products and branches are hidden too.

## Add a new supplier (private)

1. Admin → **Supply partners** → **Add new supplier**.
2. Type of business is already “Supplier” (change it if it is a manufacturer), “Building and construction supplies” is ticked, and Visibility is **Keep private**. Fill in the business name, where it is, and its phone (type it however you like: `0911 23 45 67`, `011 551 2345`, `+251…`). WhatsApp, Telegram and a short tagline are optional.
3. Click **Create supplier**. If another business has the same phone number or a similar name, you see **Possible duplicates** with links. Open them to check. If one is the same business, do not create a new one: go to it and use its Supply partner panel (or **Merge duplicate**). If none is, click **None of these is the same business. Create it.**
4. You land on its page at the **Supply partner** panel, with the record already created (status “Discovered”). The banner at the top says **Private: not shown on the public site.**

The general **Organisations → New organisation** form has the same Visibility choice. “Keep private” is the default; “Publish now with the Listed badge” works as before.

## Add a partner record to a business that is already on HagerLand

1. Go to **Organisations** and open the business.
2. In the **Supply partner** panel, look at **“Check these first”** (businesses with the same phone or a similar name) and merge real duplicates first with **Merge duplicate**.
3. Tick its **roles** (importer, distributor, manufacturer, wholesaler, retail shop, contractor: a business can have several), add **other names** (Amharic name, other spellings, trading names, one per line), say **where the information came from** and how **confident** you are, then click **Create supply partner record**.

## Publish, or make private again

- **Publish**: on the business's page, the banner at the top has a **Publish** button. It asks you to confirm: “Publish only after confirming the details with the business.” Once published it shows on the site with the Listed badge within a few minutes.
- **Make private**: on a published business, the banner has **Make private**. It disappears from the public site, search and sitemaps.
- Both are recorded in the audit log. HagerLand's own organisations always stay published.
- **Organisations** list: private businesses show the badge “private”; filter them with Status → “private (not public)”.

## Contacts and consent

Click **Add contact** for each person you deal with. Phone first: type the number however you like (`0911 23 45 67`, `011 551 2345`, `+251…`); the site stores a standard form so you can search by it.

- **Why we may contact them**: record how you got the contact (the business gave it to you, the person agreed, it is published by the business).
- **Do not contact**: tick it when someone asks us to stop. The contact is shown in red with “Do not contact”. Respect it; if the whole business asks, also set the status to **Do not contact**.
- If a person asks us to delete their details, use **Remove** on the contact (the audit log keeps only a note that it happened).

## Verify

In **Verification**, enter the date you saw the trade licence, checked the TIN, or visited the site. Add photos or PDFs under **Evidence** (private: links work for 10 minutes). **Verified by** fills in with your admin name if you leave it empty. **Re-verify by** is set to 12 months after the latest date unless you choose another date. The licence number and TIN themselves go in **HagerLand-only fields** on the same page.

## Statuses

| Status | Meaning |
|---|---|
| Discovered | We know about them but have not spoken yet |
| Contacted | We have spoken or sent a message |
| Interested | They want to work with HagerLand |
| Terms agreed | Prices, delivery and payment terms are agreed |
| Active | We order from them |
| Inactive | We used to work together but do not now |
| Declined | They or we decided not to work together |
| Do not contact | They asked us not to contact them |
| Needs re-verification | Details or evidence are out of date: check again |

Change it with **Change status**; the date of the change is kept and every change is in the audit log.

## Prices (price lists)

Each partner has a private price list: on its page, the Supply partner panel shows **Prices: N current · M expiring within 7 days · K expired** and an **Open price list** link. Prices are never shown on the site and never change HagerLand's public catalogue prices.

- **Add price**: pick a catalogue product, or choose a category and type the item as the partner names it (“Dangote OPC 42.5 cement 50 kg”). Then the unit, the price in birr (`1250` or `1,250.50`), the price date and **Valid until**. Valid until is filled in for you: **7 days** for cement and reinforcement steel, **14 days** for imported or foreign-currency items, **30 days** for everything else. Change it if the partner said otherwise. Add delivery areas, delivery charge, lead time, VAT, where the price came from, and a photo or PDF of the price list if you have one.
- **Paste a price list**: copy the lines (from a Telegram photo, a PDF or a spreadsheet), one per line: `item, unit, price` and optionally a pack size, for example `Rebar 12mm, piece, 980`. Click **Check the list**: each line shows what was read, whether HagerLand already knows the item, and any problem in red. Choose a category for each new item, fill in the details shared by the whole list once (date, delivery, source, the photo), and save. Every line is saved, or none.
- **A new price replaces the old one.** Enter a new price for the same item, unit and branch and the old one becomes “superseded”. Click **History** on the item to see every earlier price with its dates.
- **Freshness**: **Fresh** (less than half its validity used), **Ageing** (more than half), **Expired** (past Valid until). Expired prices stay in the list, clearly marked.
- **Withdraw**: when the partner no longer sells something. It stays in the history.
- **Prices expiring this week** (button on Supply partners, or the **Prices** filter): every current price that runs out within 7 days or has already run out, with the person to call and their phone. Nothing is sent automatically. People marked “Do not contact” are never suggested.

**Never quote a customer from an expired price: call the partner for a new one first.**

## Finding suppliers for a quote

Open **Customer requests → Quotes** and the quote. Everything below is private to HagerLand: the customer, their emails and their account never show it. **Nothing is sent to suppliers or customers automatically**: you phone or message suppliers yourself.

1. **Items.** The customer's own items are listed as they sent them. If they uploaded a list, type its lines in with **Add item** (item, optional category, quantity, unit, note). Your items are labelled **Added by HagerLand**; you can **Edit** or **Remove** them (removal is kept in the history, and is refused once a supplier is chosen for the item). The customer's items cannot be changed here.
2. **Suppliers.** For each item you see **Suggested suppliers**, cheapest delivered total first: price, delivered total, freshness, lead time and a reason in plain words (“Active partner. Delivers to Bole. Price checked 3 days ago. Cheapest delivered total.”). Trial partners (terms agreed) say **Trial**. Warnings such as “VAT not known” or “Similar name: check it is the same item” are shown under the reason. **Not suggested** lists partners left out and why (“Price expired 12 Oct”, “Does not deliver to Bole”, “Minimum order 200 bags; quote asks for 50 bags”).
3. **Add supplier manually** adds any active or trial partner to an item (“Added by staff”).
4. **Ask.** Tick the suppliers you are going to contact, contact them yourself (their phone, WhatsApp or Telegram is shown), then click **Mark as asked**. People marked **Do not contact** cannot be ticked.
5. **Enter reply** when a supplier answers: unit price, quantity, delivery charge (0 if free), valid until, note. **Also save as this supplier’s current price** (ticked) updates their price list; the old price stays in the history.
6. **Compare.** Replies are sorted by delivered total; the cheapest is marked, with the difference from the supplier’s price list. The **Basket** box says whether one supplier can do everything for at most 3% more than splitting the order (one delivery, one invoice), or which supplier is cheapest for each item.
7. **Choose** one supplier per item (**Undo choice** to change your mind), or **Reject** with a reason.
8. **Suggested total** shows the cost of the chosen suppliers (price × quantity + delivery). The owner also sees margin and commission boxes, worked out on screen only (not saved yet). Copy the price into **Issue the quote**, which works exactly as before.

A finished quote (declined, expired or cancelled) shows all of this but cannot be changed. Operations staff can do everything except see the margin and commission boxes.

## Orders, delivery proof and the ledger

Everything here is private to HagerLand. Nothing is sent to customers or suppliers automatically: you tell them yourself.

**The golden rule (model A): never place an order with a supplier before the customer has paid in full.** The site will not let you: the button stays off and the database refuses it too.

**Agreements (owner only).** Supplies → Supply partners → open a partner → **Agreement** → **Add agreement**: the money model (A: customer pays HagerLand and you keep a margin; B: customer pays the supplier and the supplier pays you commission; or Both), the commission rate for B, payment terms, credit days, start and end dates, the signed copy (photo or PDF) and notes. One agreement can be active at a time; old ones stay as history (**Mark expired** or **Terminate** with a reason).

**Create orders.** On the quote, once suppliers are chosen, the **Orders** box has **Create order(s)**: one draft order per supplier. The money model follows the active agreement; with “Both” or no agreement you choose. Without a signed agreement you must tick **Proceed without an agreement** (it is recorded).

**Model A (margin).** On the order: use the **Margin % helper** (or type each customer price) and the customer delivery charge, **Save order**, then **Send to customer for payment** (tell the customer the total). **Record customer payment** each time money arrives (bank transfer, telebirr, CBE Birr, cash; for payments from abroad also the currency, amount and rate). When the full amount is in, **Mark as paid**, then **Place with supplier** → **Supplier confirmed** → **Out for delivery** → **Delivered** → **Complete**. Record **Payment to supplier** when you pay them.

**Model B (commission).** **Place with supplier** → **Supplier confirmed** → **Out for delivery** → **Delivered**. The order shows **Commission due ETB …**: click **Record commission due**, and later **Record commission received**.

**Delivery proof** (owner and Operations): on the order, **Add delivery proof**: a photo or the signed delivery note (on a phone you can take the photo there and then), when it was taken, who received it and their phone. A wrong one can be **Removed** with a reason; it stays in the history. An order can only be completed with proof.

**Problems.** **Report a problem** (owner or Operations) when a delivery is short or damaged; the owner then marks **Problem solved: delivered** or cancels. **Cancel order** (owner, with a reason) is possible until delivery; if the customer has paid, record a **Refund** in the ledger. Every step, payment and proof appears on the order’s **Timeline**.

**Supply orders** (Supplies menu) lists every order; **Needs action** shows orders waiting too long for payment (3 days), supplier confirmation (2 days) or delivery (3 days), and deliveries without proof.

**Supply ledger** (Money menu, owner only): every payment, fee, refund and commission, with totals, a summary per order (**HagerLand earned**) and **Download CSV**. Add a **Service fee** or an **Adjustment** (with a reason) at the bottom. **To correct a mistake, click Reverse entry** on the wrong line and give the reason: an opposite entry is added. Nothing is ever edited or deleted.

**What Operations can and cannot see.** Operations sees Supply orders and order pages (supplier prices, status steps from placed to delivered, problems and delivery proof). It never sees agreements, customer prices, margins, commission, payments or the ledger, and cannot create, cancel or complete orders.

**Deals and commissions** (Money menu) is separate and unchanged: it is your wider sales pipeline across all services. The Supply ledger records the actual money for supply orders.

## Find partners and duplicates

On **Supply partners**, search by name, another name, or any phone number (the business's phone, WhatsApp or Telegram number, or a contact's phone) in any format. Filter by status, role, or **Re-verification: Due now** to see who needs checking again.
