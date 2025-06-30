// Codice JS di esempio da iniettare in Notion
alert('JS injection eseguita!');
document.body.style.background = '#fffae3';

// JS injection: esegui solo sulla pagina target
(function() {
    const TARGET_PAGE_ID = '5921895b58a441c88c98fbd2cc2e093d'; // Sostituisci con l'ID desiderato
    function log(msg, ...args) {
        try { console.log('[INJECT]', msg, ...args); } catch(e) {}
    }
    const url = window.location.href;
    const match = url.match(/[0-9a-f]{32}/i);
    const pageId = match ? match[0] : null;
    log('URL:', url);
    log('Estratto pageId:', pageId);
    if (pageId !== TARGET_PAGE_ID) {
        log('Non è la pagina target, injection annullata.');
        return;
    }
    log('--- INIZIO INJECTION ---');
    const tablists = document.querySelectorAll('div[role="tablist"]');
    log('Numero tablist trovate:', tablists.length);
    if (tablists.length === 0) {
        log('Nessuna tablist trovata');
        log('--- FINE INJECTION ---');
        return;
    }
    tablists.forEach((tablist, idx) => {
        log(`Tablist #${idx}:`, tablist);
        const tabButtons = tablist.querySelectorAll('div[role="button"]');
        log(`Tablist #${idx} - Numero tabButtons:`, tabButtons.length);
        if (tabButtons.length === 0) {
            log(`Tablist #${idx} vuota, nessun tabButton da clonare.`);
            return;
        }
        const lastTab = tabButtons[tabButtons.length - 1];
        log(`Tablist #${idx} - Clono la tab:`, lastTab);
        const newTab = lastTab.cloneNode(true);
        // Cambia il testo della nuova tab (primo span o text node)
        let labelSet = false;
        // Prova a trovare uno span, altrimenti setta direttamente il textContent
        const span = newTab.querySelector('span');
        if (span) {
            span.textContent = 'Terza Vista';
            labelSet = true;
            log(`Tablist #${idx} - Testo della nuova tab impostato via span`);
        } else {
            newTab.textContent = 'Terza Vista';
            labelSet = true;
            log(`Tablist #${idx} - Testo della nuova tab impostato via textContent`);
        }
        // Cambia aria-selected e stile per renderla "non selezionata"
        newTab.setAttribute('aria-selected', 'false');
        newTab.style.background = 'none';
        newTab.style.color = 'rgb(115, 114, 110)';
        log(`Tablist #${idx} - Attributi della nuova tab impostati`);
        // Inserisci la nuova tab alla fine
        tablist.appendChild(newTab);
        log(`Tablist #${idx} - Nuova tab aggiunta`);
    });
    log('--- FINE INJECTION ---');
})();
