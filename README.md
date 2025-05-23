# Steam Inventory Auto Sell Helper

A Tampermonkey userscript to automatically list items in your Steam Community inventory on the Steam Marketplace.

## Features

- Iterates through visible items in your inventory and lists them for sale with minimal user interaction.
- Fetches "Starting at:" price from the Steam UI, with retries and fallback support.
- Integrates fallback via the SteamDB Quick Sell alternative sell button if Steam rate-limits price display.
- Provides a convenient **Start Script** / **Stop Script** toggle button directly on your inventory page.

## Requirements

- Modern web browser (Chrome, Firefox, Edge, etc.) with a userscript manager installed (e.g., Tampermonkey, Greasemonkey, Violentmonkey).
- Must be logged into your own Steam account.
- Navigate to your own inventory URL matching `https://steamcommunity.com/id/*/inventory*`.

## Installation

1. Install a userscript manager (Tampermonkey is recommended).
2. In Tampermonkey, click **Dashboard** → **+** (Add a new script).
3. Delete any default template code, then copy & paste the contents of `main.js` into the editor.
4. Save the script (File → Save or pressing **Ctrl+S**).
5. Reload or navigate to your Steam inventory page; you should see a **Start Script** button appear.

## Usage

1. Go to your Steam Community inventory page (ensure you see your own items).
2. Click the **Start Script** button located near the inventory filters.
3. The script will:
   - Reveal and enable the "Marketable" filter if not already set.
   - Process up to 25 items per page by default.
   - Open each item, fetch its listing price, and click through the sell dialog.
   - Accept the Steam Subscriber Agreement (SSA) and confirm the listing.
   - Handle fallback scenarios and retry logic for rate-limited price data.
4. Monitor the browser console (`F12` → Console) for status logs and any errors.
5. Click **Stop Script** at any time to halt processing.

## Configuration

- DEBUG mode: Edit the `DEBUG` constant at the top of `main.js` to `true` for verbose debug logs.

## Known Issues & Limitations

- Steam may rate-limit price lookups; extensive retries could result in longer delays.
- If you have too many pending listings awaiting confirmation, the script will stop and notify you.
- UI changes on Steam's site or conflicts with other browser extensions may break functionality.
- Always review console logs to ensure correct operation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Disclaimer

Use this script at your own risk. The author is not responsible for any account issues resulting from its use.
