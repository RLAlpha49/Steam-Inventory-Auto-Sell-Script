# Steam Inventory Auto Sell Script

A userscript that helps you list **marketable** items from your Steam Community inventory on the Steam Marketplace.

## Requirements

- Modern web browser (Chrome, Firefox, Edge, etc.) with a userscript manager installed (e.g., Tampermonkey, Greasemonkey, Violentmonkey).
- Must be logged into your own Steam account.
- Navigate to your own inventory URL matching `https://steamcommunity.com/id/*/inventory*`.

## Installation

1. Install a userscript manager (Tampermonkey is recommended).
2. In Tampermonkey, click **Dashboard** → **+** (Add a new script).
3. Delete any default template code, then copy & paste the contents of `main.js` into the editor.
4. Save the script (File → Save or pressing **Ctrl+S**).
5. Reload or navigate to your Steam inventory page; you should see the **Auto Sell helper** panel appear (top-right).

## Usage

1. Go to your Steam Community inventory page (ensure you see your own items).
2. Use the **Auto Sell helper** panel (top-right) and click **Start**.
3. The script will:
   - Reveal and enable the "Marketable" filter if not already set.
   - Process up to 25 items per page by default.
   - Open each item, optionally try SteamDB Quick Sell first (if enabled and available), otherwise fetch its listing price and click through the sell dialog.
   - Accept the Steam Subscriber Agreement (SSA) and confirm the listing.
   - Handle fallback scenarios and retry logic for rate-limited price data.
4. Monitor the browser console (`F12` → Console) for status logs and any errors.
5. Click **Stop** at any time to halt processing (it stops as soon as the script reaches its next stop-check; it may finish the current item first).
   - Optional: enable **Stop after page** if you want it to stop cleanly after the current page.
   - Optional: click **Pause** if you need it to temporarily stop between actions.

## Known Issues & Limitations

- Steam may rate-limit price lookups; extensive retries could result in longer delays.
- If you have too many pending listings awaiting confirmation, the script will stop and notify you.
- UI changes on Steam's site or conflicts with other browser extensions may break functionality.
- Always review console logs to ensure correct operation.

## Notes on SteamDB Quick Sell

The SteamDB path is **optional** and only works if you have the [SteamDB extension](https://steamdb.info/extension/) installed and enabled.

- If SteamDB UI is present and enabled, the script clicks it and then completes Steam’s sell dialog confirmations.
- If it’s not present (or stays disabled), the script automatically falls back to Steam’s normal flow.

## Disclaimer

Use this script at your own risk. The author is not responsible for any account issues resulting from its use.

**Important Notice:** Always check market listing confirmations on your mobile device to ensure you are not listing items you do not want to sell. Steam requires mobile confirmation for marketplace listings, and failing to review these may result in unintended sales.
