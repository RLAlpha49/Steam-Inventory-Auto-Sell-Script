// ==UserScript==
// @name         Steam Inventory Auto Sell Script
// @description  Automatically list items in your Steam inventory.
// @version      1.0.0
// @author       RLAlpha49
// @namespace    https://github.com/RLAlpha49/Steam-Inventory-Auto-Sell-Script
// @license      MIT
// @match        https://steamcommunity.com/id/*/inventory*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Set to true to enable debug logging
    const DEBUG = false;
    function log(...args) {
        // User-facing info logs (not too many)
        console.log('[Steam Auto Sell Helper]', ...args);
    }
    function debug(...args) {
        if (DEBUG) console.debug('[Steam Auto Sell Helper][DEBUG]', ...args);
    }

    function isOwnInventory() {
        // Get account pulldown text
        const accountPulldown = document.getElementById('account_pulldown');
        if (!accountPulldown) return false;
        const accountName = accountPulldown.textContent.trim();

        // Get persona name text
        const personaNameElem = document.querySelector('.whiteLink.persona_name_text_content');
        if (!personaNameElem) return false;
        const personaName = personaNameElem.textContent.trim();

        // Compare
        return accountName === personaName;
    }

    function addStartStopButton() {
        if (document.getElementById('my-userscript-toggle-btn')) return; // Prevent duplicate
        const btn = document.createElement('button');
        btn.id = 'my-userscript-toggle-btn';
        btn.textContent = 'Start Script';
        btn.style.float = 'right';
        btn.style.margin = '8px';
        btn.style.zIndex = 10000;
        let running = false;
        let stopRequested = false;

        async function waitForMarketableInput(timeout = 5000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const input = document.querySelector('input[id*="misc_marketable"]');
                if (input) return input;
                await new Promise(res => setTimeout(res, 100));
            }
            return null;
        }

        async function waitForPrice(marketActionsDiv, visibleIndex, link, maxRetries = 3, itemInfoDiv = null) {
            let retries = 0;
            const waitTime = 15000; // 15 seconds
            while (retries < maxRetries && !stopRequested) {
                // Only check price once per retry loop
                if (retries > 0) {
                    // Re-click the itemHolder link to reload the item info
                    if (link) {
                        link.click();
                    }
                    // Wait 1 second after click before checking price
                    await new Promise(res => setTimeout(res, 1000));
                    // Re-select the visible iteminfo div and marketActionsDiv after waiting
                    let itemInfo0 = document.getElementById('iteminfo0');
                    let itemInfo1 = document.getElementById('iteminfo1');
                    if (itemInfo0 && itemInfo0.style.display !== 'none') {
                        itemInfoDiv = itemInfo0;
                    } else if (itemInfo1 && itemInfo1.style.display !== 'none') {
                        itemInfoDiv = itemInfo1;
                    }
                    marketActionsDiv = null;
                    if (itemInfoDiv) {
                        marketActionsDiv = itemInfoDiv.querySelector('#iteminfo0_item_market_actions, #iteminfo1_item_market_actions, .item_market_actions');
                    }
                }
                if (marketActionsDiv) {
                    const priceDivs = marketActionsDiv.querySelectorAll('div');
                    for (const div of priceDivs) {
                        if (div.textContent.includes('Starting at:')) {
                            const match = div.textContent.match(/Starting at:\s*([$€£]?\d+[.,]?\d*)/);
                            if (match) {
                                const price = match[1];
                                log(`Found price for visible itemHolder #${visibleIndex}: ${price}`);
                                return price;
                            }
                        }
                    }
                }
                // On the first failure, check for the alternative sell button
                // The alternative sell button (a.btn_small.btn_darkblue_white_innerfade) is added by the SteamDB browser extension 'SteamDB Quick Sell'.
                // It is used as a fallback if the steam website is rate limiting displaying the list price for items.
                if (retries === 0 && itemInfoDiv) {
                    // Wait half a second before trying to find the alternative sell button
                    await new Promise(res => setTimeout(res, 500));
                    const altSellBtn = itemInfoDiv.querySelector('a.btn_small.btn_darkblue_white_innerfade');
                    if (altSellBtn) {
                        // If present, wait up to 10s for it to become enabled
                        let waited = 0;
                        const maxWait = 10000; // 10 seconds
                        const interval = 250;
                        while (altSellBtn.classList.contains('disabled') && waited < maxWait && !stopRequested) {
                            await new Promise(res => setTimeout(res, interval));
                            waited += interval;
                        }
                        if (!altSellBtn.classList.contains('disabled')) {
                            log(`Clicking alternate sell button for visible itemHolder #${visibleIndex} (early fallback)`);
                            let modalAppeared = false;
                            for (let attempt = 1; attempt <= 3; attempt++) {
                                altSellBtn.click();
                                debug(`Clicked alternate sell button (attempt ${attempt})`);
                                // Wait up to 1 second for the modal to appear
                                waited = 0;
                                while (waited < 1000) {
                                    const modal = document.getElementById('market_sell_dialog');
                                    if (modal && modal.style.display !== 'none') {
                                        modalAppeared = true;
                                        break;
                                    }
                                    await new Promise(res => setTimeout(res, 100));
                                    waited += 100;
                                }
                                if (modalAppeared) break;
                            }
                            if (!modalAppeared) {
                                log('Error: Alternative sell modal did not appear after 3 attempts. Skipping item.');
                                return;
                            }
                            // Skip price input, proceed with SSA and accept
                            const ssaCheckbox = document.getElementById('market_sell_dialog_accept_ssa');
                            if (ssaCheckbox && !ssaCheckbox.checked) {
                                ssaCheckbox.click();
                                debug('Checked SSA checkbox.');
                            }
                            const acceptBtn = document.getElementById('market_sell_dialog_accept');
                            if (acceptBtn) {
                                acceptBtn.click();
                                debug('Clicked accept button.');
                                await new Promise(res => setTimeout(res, 500));
                            } else {
                                log('Accept button not found (early fallback).');
                            }
                            const okBtn = document.getElementById('market_sell_dialog_ok');
                            if (okBtn) {
                                okBtn.click();
                                debug('Clicked OK button.');
                                await new Promise(res => setTimeout(res, 500));
                                // If there is an error, close the modal manually
                                const errorDiv = document.getElementById('market_sell_dialog_error');
                                if (errorDiv && errorDiv.style.display !== 'none') {
                                    if (errorDiv.textContent && errorDiv.textContent.includes('You have too many listings pending confirmation.')) {
                                        log('Too many listings pending confirmation. Stopping script.');
                                        stopRequested = true;
                                        return;
                                    }
                                    const closeBtn = document.querySelector('.newmodal_close');
                                    if (closeBtn) {
                                        closeBtn.click();
                                        log('Closed modal manually due to error after OK click (early fallback).');
                                    } else {
                                        log('Could not find .newmodal_close to close modal after error (early fallback).');
                                    }
                                }
                                // Wait until the modal background is hidden before continuing
                                let modalWaitTries = 0;
                                const maxModalWaitTries = 20; // 20 * 250ms = 5s max
                                while (modalWaitTries < maxModalWaitTries * 2) {
                                    const modalBg = document.querySelector('.newmodal_background');
                                    if (!modalBg || modalBg.style.display === 'none') {
                                        break;
                                    }
                                    await new Promise(res => setTimeout(res, 250));
                                    modalWaitTries++;
                                }
                                if (modalWaitTries >= maxModalWaitTries) {
                                    // Try to close the modal manually if still open
                                    const closeBtn = document.querySelector('.newmodal_close');
                                    if (closeBtn) {
                                        closeBtn.click();
                                        log('Modal background did not hide after OK click (early fallback, timeout). Closed modal manually.');
                                    } else {
                                        log('Modal background did not hide after OK click (early fallback, timeout). Could not find .newmodal_close to close modal manually.');
                                    }
                                } else {
                                    log('Modal background hidden, continuing to next item (early fallback).');
                                }
                            } else {
                                log('OK button not found (early fallback).');
                            }
                            // Return a special value to indicate fallback was used
                            return '__FALLBACK_USED__';
                        }
                        // If still disabled after waiting, continue to retries
                    }
                }
                retries++;
                if (retries < maxRetries) {
                    log(`Price not found for visible itemHolder #${visibleIndex}, retrying in ${waitTime / 1000}s (retry #${retries} of ${maxRetries})...`);
                    await new Promise(res => setTimeout(res, waitTime - 1000));
                }
            }
            return null;
        }

        // Simulate real typing with keyboard events
        async function simulateTyping(input, text) {
            input.value = '';
            for (const char of text) {
                const eventOptions = { bubbles: true, cancelable: true, key: char, char, keyCode: char.charCodeAt(0) };
                input.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
                input.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
                input.value += char;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
                await new Promise(res => setTimeout(res, 50));
            }
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        async function clickItemHolders(inventoryPage) {
            if (!inventoryPage) {
                log('No inventory_page found for current page!');
                return;
            }
            const itemHolders = inventoryPage.querySelectorAll('.itemHolder');
            log(`Found ${itemHolders.length} .itemHolder elements.`);
            let visibleIndex = 1;
            for (let i = 0; i < itemHolders.length && visibleIndex <= 25; i++) {
                if (stopRequested) {
                    log('Stop requested. Halting immediately.');
                    break;
                }
                const itemHolder = itemHolders[i];
                if (itemHolder.style.display === 'none') {
                    debug(`Skipping itemHolder at DOM index ${i} (display: none)`);
                    continue;
                }
                const link = itemHolder.querySelector('a.inventory_item_link');
                if (link) {
                    debug(`Clicking inventory_item_link in visible itemHolder #${visibleIndex} (DOM index ${i})`);
                    link.click();
                    // Wait for item info to update
                    await new Promise(res => setTimeout(res, 500));
                    // Dynamically select the visible iteminfo div
                    let itemInfoDiv = null;
                    const itemInfo0 = document.getElementById('iteminfo0');
                    const itemInfo1 = document.getElementById('iteminfo1');
                    if (itemInfo0 && itemInfo0.style.display !== 'none') {
                        itemInfoDiv = itemInfo0;
                    } else if (itemInfo1 && itemInfo1.style.display !== 'none') {
                        itemInfoDiv = itemInfo1;
                    }
                    let marketActionsDiv = null;
                    if (itemInfoDiv) {
                        marketActionsDiv = itemInfoDiv.querySelector('#iteminfo0_item_market_actions, #iteminfo1_item_market_actions, .item_market_actions');
                    }
                    const price = await waitForPrice(marketActionsDiv, visibleIndex, link, 3, itemInfoDiv);
                    if (stopRequested) {
                        log('Stop requested during price wait. Halting immediately.');
                        break;
                    }
                    if (!price || price === '__FALLBACK_USED__') {
                        if (!price) {
                            log(`No 'Starting at:' price found for visible itemHolder #${visibleIndex} after retries, attempting fallback.`);
                        }
                        visibleIndex++;
                        continue;
                    }
                    // After finding the price, click the green market action button
                    if (itemInfoDiv) {
                        const sellBtn = itemInfoDiv.querySelector('a.item_market_action_button.item_market_action_button_green');
                        if (sellBtn) {
                            debug(`Clicking green market action button for visible itemHolder #${visibleIndex}`);
                            sellBtn.click();
                            // Wait 1 second for the dialog to appear
                            await new Promise(res => setTimeout(res, 1000));
                            // Set the price in the input
                            const priceInput = document.getElementById('market_sell_buyercurrency_input');
                            if (priceInput) {
                                await simulateTyping(priceInput, price);
                                await new Promise(res => setTimeout(res, 100));
                                debug(`Simulated typing price input: ${price} (with keyboard events)`);
                            } else {
                                log('Price input not found.');
                            }
                            // Check the SSA checkbox
                            const ssaCheckbox = document.getElementById('market_sell_dialog_accept_ssa');
                            if (ssaCheckbox && !ssaCheckbox.checked) {
                                ssaCheckbox.click();
                                debug('Checked SSA checkbox.');
                            }
                            // Click the accept button
                            const acceptBtn = document.getElementById('market_sell_dialog_accept');
                            if (acceptBtn) {
                                acceptBtn.click();
                                debug('Clicked accept button.');
                                // Wait 0.5 second after clicking accept
                                await new Promise(res => setTimeout(res, 500));
                            } else {
                                log('Accept button not found.');
                            }
                            // Click the OK button
                            const okBtn = document.getElementById('market_sell_dialog_ok');
                            if (okBtn) {
                                okBtn.click();
                                debug('Clicked OK button.');
                                // If there is an error, close the modal manually
                                const errorDiv = document.getElementById('market_sell_dialog_error');
                                if (errorDiv && errorDiv.style.display !== 'none') {
                                    if (errorDiv.textContent && errorDiv.textContent.includes('You have too many listings pending confirmation.')) {
                                        log('Too many listings pending confirmation. Stopping script.');
                                        stopRequested = true;
                                        return;
                                    }
                                    const closeBtn = document.querySelector('.newmodal_close');
                                    if (closeBtn) {
                                        closeBtn.click();
                                        log('Closed modal manually due to error after OK click (early fallback).');
                                    } else {
                                        log('Could not find .newmodal_close to close modal after error (early fallback).');
                                    }
                                }
                                // Wait until the modal background is hidden before continuing
                                let modalWaitTries = 0;
                                const maxModalWaitTries = 40; // 40 * 250ms = 10s max
                                while (modalWaitTries < maxModalWaitTries) {
                                    const modalBg = document.querySelector('.newmodal_background');
                                    if (!modalBg || modalBg.style.display === 'none') {
                                        break;
                                    }
                                    await new Promise(res => setTimeout(res, 250));
                                    modalWaitTries++;
                                }
                                if (modalWaitTries >= maxModalWaitTries) {
                                    log('Modal background did not hide after OK click (timeout).');
                                } else {
                                    debug('Modal background hidden, continuing to next item.');
                                }
                            } else {
                                log('OK button not found.');
                            }
                        } else {
                            log(`No green market action button found for visible itemHolder #${visibleIndex}`);
                        }
                    }
                } else {
                    log(`No inventory_item_link found in visible itemHolder #${visibleIndex} (DOM index ${i})`);
                }
                await new Promise(res => setTimeout(res, 1000));
                visibleIndex++;
            }
            log('Item click sequence complete.');
        }

        async function processAllPages() {
            let page = 1;
            // Ensure the filter tag is shown and marketable filter is checked only once at the start
            log('Ensuring filters are set before starting page processing...');
            const filterTagCtn = document.querySelector('.filter_tag_button_ctn');
            if (filterTagCtn) {
                const showBtn = filterTagCtn.querySelector('#filter_tag_show');
                const hideBtn = filterTagCtn.querySelector('#filter_tag_hide');
                if (showBtn && hideBtn) {
                    if (showBtn.style.display !== 'none') {
                        debug('Clicking filter_tag_show to reveal filters...');
                        showBtn.click();
                        // Wait for marketable input to appear
                        debug('Waiting for marketable filter input to appear...');
                        const marketableInput = await waitForMarketableInput();
                        if (marketableInput) {
                            debug('Marketable filter input appeared.');
                        } else {
                            log('Timed out waiting for marketable filter input.');
                        }
                    } else {
                        debug('filter_tag_show is hidden, filters already visible.');
                    }
                } else {
                    log('filter_tag_show or filter_tag_hide not found in filter_tag_button_ctn.');
                }
            } else {
                log('No filter_tag_button_ctn found.');
            }
            // Ensure the marketable filter is checked
            const marketableInput = document.querySelector('input[id*="misc_marketable"]');
            if (marketableInput) {
                if (!marketableInput.checked) {
                    debug('Checking the marketable filter input...');
                    marketableInput.click();
                    await new Promise(res => setTimeout(res, 2000));
                    debug('Waited 2 seconds after checking marketable filter.');
                } else {
                    debug('Marketable filter already checked.');
                }
            } else {
                log('No marketable filter input found.');
            }
            while (true) {
                log(`Processing page ${page}...`);
                // Re-query the current page index and inventory_page each time
                const pageCurSpan = document.getElementById('pagecontrol_cur');
                let inventoryPage = null;
                if (pageCurSpan) {
                    const pageIndex = parseInt(pageCurSpan.textContent.trim(), 10);
                    const allInventoryPages = document.querySelectorAll('.inventory_page');
                    if (pageIndex >= 0 && pageIndex < allInventoryPages.length) {
                        inventoryPage = allInventoryPages[pageIndex];
                        debug(`Using inventory_page at index ${pageIndex}.`);
                    } else {
                        log(`Invalid page index: ${pageIndex}.`);
                    }
                } else {
                    log('No pagecontrol_cur span found.');
                }
                await clickItemHolders(inventoryPage);
                if (stopRequested) {
                    log('Stop requested. Stopping immediately.');
                    break;
                }
                const nextBtn = document.getElementById('pagebtn_next');
                if (nextBtn && !nextBtn.classList.contains('disabled')) {
                    debug('Clicking next page button...');
                    nextBtn.click();
                    debug('Waiting 1.5 seconds for next page to load and styles to update...');
                    await new Promise(res => setTimeout(res, 1500));
                    page++;
                } else {
                    log('No next page or next page button is disabled. Stopping.');
                    break;
                }
            }
        }

        btn.onclick = async function() {
            running = !running;
            btn.textContent = running ? 'Stop Script' : 'Start Script';
            if (running) {
                stopRequested = false;
                log('Script started.');
                await processAllPages();
                running = false;
                btn.textContent = 'Start Script';
                log('Script finished.');
            } else {
                stopRequested = true;
                log('Script stopped by user.');
            }
        };
        const logosDiv = document.getElementById('inventory_logos');
        if (logosDiv) {
            logosDiv.appendChild(btn);
        } else {
            // fallback: add to body if not found
        document.body.appendChild(btn);
        }
    }

    function main() {
        if (isOwnInventory()) {
            addStartStopButton();
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})(); 