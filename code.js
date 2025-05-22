// Notion Filter Manager - Proof of Concept
// Questo script crea un menu personalizzato nell'interfaccia di Notion

class NotionFilterManager {
  constructor() {
    this.isActive = false;
    this.menuButton = null;
    this.dropdown = null;
    this.init();
  }

  init() {
    // Aspetta che la pagina sia completamente caricata
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createCustomMenu());
    } else {
      this.createCustomMenu();
    }

    // Monitora i cambiamenti nella pagina per re-iniettare il menu se necessario
    this.observePageChanges();
  }

  createCustomMenu() {
    // Trova la toolbar esistente
    const toolbar = this.findToolbar();
    if (!toolbar) {
      console.log('🔍 Toolbar non trovata, riprovo tra 2 secondi...');
      setTimeout(() => this.createCustomMenu(), 2000);
      return;
    }

    // Evita duplicati
    if (document.getElementById('custom-filter-manager')) {
      return;
    }

    // Crea il pulsante personalizzato
    this.createCustomButton(toolbar);
    console.log('✅ Menu Filter Manager aggiunto con successo');
  }

  findToolbar() {
    // Cerca la toolbar che contiene i pulsanti Filter, Sort, etc.
    const toolbars = document.querySelectorAll('div[style*="display: flex"][style*="align-items: center"]');
    
    for (const toolbar of toolbars) {
      // Verifica se contiene i pulsanti caratteristici (Filter, Sort)
      const hasFilterButton = toolbar.querySelector('svg.filterSmall, [aria-label="Filter"]');
      const hasSortButton = toolbar.querySelector('svg.arrowUpDownSmall, [aria-label="Sort"]');
      
      if (hasFilterButton || hasSortButton) {
        return toolbar;
      }
    }
    
    return null;
  }

  createCustomButton(toolbar) {
    // Crea il container del nostro pulsante
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'custom-filter-manager';
    buttonContainer.style.cssText = `
      position: relative;
      display: contents;
    `;

    // Crea il pulsante principale
    const button = document.createElement('div');
    button.style.cssText = `
      user-select: none;
      transition: background 20ms ease-in;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 6px;
      height: 28px;
      width: 28px;
      padding: 6px;
      font-size: 14px;
      color: rgba(71, 70, 68, 0.6);
      fill: rgba(71, 70, 68, 0.6);
      font-weight: 400;
      line-height: 1;
      margin: 0 2px;
    `;
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', 'Filter Manager');
    button.setAttribute('title', 'Gestione Filtri Salvati');

    // Icona personalizzata (stella per distinguerla)
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" style="display: block; fill: rgb(35, 131, 226); flex-shrink: 0;">
        <path d="M8 1.5l1.5 3h3.5l-2.5 2.5 1 3.5-3-2-3 2 1-3.5-2.5-2.5h3.5z"/>
      </svg>
    `;

    // Effetto hover
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(55, 53, 47, 0.08)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    // Click handler
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown(button);
    });

    buttonContainer.appendChild(button);
    
    // Inserisci il pulsante prima del pulsante "New task" se presente
    const newTaskButton = toolbar.querySelector('.notion-collection-view-item-add');
    if (newTaskButton && newTaskButton.parentNode) {
      newTaskButton.parentNode.insertBefore(buttonContainer, newTaskButton);
    } else {
      // Altrimenti aggiungilo alla fine della toolbar
      toolbar.appendChild(buttonContainer);
    }

    this.menuButton = button;
  }

  toggleDropdown(button) {
    if (this.dropdown && this.dropdown.style.display !== 'none') {
      this.hideDropdown();
    } else {
      this.showDropdown(button);
    }
  }

  showDropdown(button) {
    // Rimuovi dropdown esistente
    this.hideDropdown();

    // Crea il dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'filter-manager-dropdown';
    dropdown.style.cssText = `
      position: absolute;
      top: 35px;
      right: 0;
      background: white;
      border: 1px solid rgba(227, 226, 224, 0.5);
      border-radius: 8px;
      box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;
      z-index: 1000;
      min-width: 200px;
      padding: 8px 0;
      font-size: 14px;
    `;

    // Menu items
    const menuItems = [
      { label: '💾 Salva Filtro Corrente', action: 'save' },
      { label: '📂 Carica Filtro Salvato', action: 'load' },
      { label: '📋 Gestisci Filtri', action: 'manage' },
      { label: '❌ Rimuovi Tutti i Filtri', action: 'clear' }
    ];

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: background 20ms ease-in;
        white-space: nowrap;
      `;
      menuItem.textContent = item.label;

      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = 'rgba(55, 53, 47, 0.08)';
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });

      menuItem.addEventListener('click', () => {
        this.handleMenuAction(item.action);
        this.hideDropdown();
      });

      dropdown.appendChild(menuItem);
    });

    // Aggiungi il dropdown al container del pulsante
    button.parentNode.appendChild(dropdown);
    this.dropdown = dropdown;

    // Chiudi il dropdown quando si clicca fuori
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  hideDropdown() {
    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  handleOutsideClick(event) {
    if (this.dropdown && !this.dropdown.contains(event.target) && !this.menuButton.contains(event.target)) {
      this.hideDropdown();
    }
  }

  handleMenuAction(action) {
    switch (action) {
      case 'save':
        this.saveCurrentFilter();
        break;
      case 'load':
        this.loadSavedFilter();
        break;
      case 'manage':
        this.manageFilters();
        break;
      case 'clear':
        this.clearAllFilters();
        break;
    }
  }

  saveCurrentFilter() {
    this.showInputModal('Salva Filtro', 'Nome per questa configurazione di filtri:', (name) => {
      if (name && name.trim()) {
        // TODO: Implementare la logica di salvataggio
        this.showNotification(`Filtro "${name}" salvato con successo!`, 'success');
        console.log('🔧 Azione: Salva filtro corrente come', name);
      }
    });
  }

  loadSavedFilter() {
    // TODO: Mostrare lista filtri salvati
    this.showNotification('Funzionalità "Carica Filtro" (Da implementare)', 'info');
    console.log('🔧 Azione: Carica filtro salvato');
  }

  manageFilters() {
    // TODO: Aprire pannello di gestione
    this.showNotification('Funzionalità "Gestisci Filtri" (Da implementare)', 'info');
    console.log('🔧 Azione: Gestisci filtri salvati');
  }

  clearAllFilters() {
    this.showConfirmModal(
      'Rimuovi Filtri', 
      'Sei sicuro di voler rimuovere tutti i filtri dalla vista corrente?',
      () => {
        // TODO: Implementare la rimozione filtri
        this.showNotification('Tutti i filtri sono stati rimossi', 'success');
        console.log('🔧 Azione: Rimuovi tutti i filtri');
      }
    );
  }

  observePageChanges() {
    // Observer per re-iniettare il menu quando la pagina cambia
    const observer = new MutationObserver((mutations) => {
      let shouldReinject = false;
      
      mutations.forEach((mutation) => {
        // Controlla se sono stati aggiunti nuovi nodi che potrebbero essere una nuova vista
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && (
              node.querySelector && (
                node.querySelector('[aria-label="Filter"]') ||
                node.querySelector('.notion-collection-view-item-add')
              )
            )) {
              shouldReinject = true;
              break;
            }
          }
        }
      });

      if (shouldReinject && !document.getElementById('custom-filter-manager')) {
        setTimeout(() => this.createCustomMenu(), 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Modal personalizzati per sostituire prompt() e confirm()
  showInputModal(title, message, callback) {
    const overlay = this.createModalOverlay();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 400px;
      width: 90%;
      box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: rgb(55, 53, 47);">${title}</h3>
      <p style="margin: 0 0 16px; font-size: 14px; color: rgba(55, 53, 47, 0.8);">${message}</p>
      <input type="text" id="modal-input" style="
        width: 100%; 
        padding: 8px 12px; 
        border: 1px solid rgba(227, 226, 224, 0.5); 
        border-radius: 6px; 
        font-size: 14px; 
        margin-bottom: 16px;
        box-sizing: border-box;
      " placeholder="Inserisci il nome...">
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="modal-cancel" style="
          padding: 8px 16px; 
          border: 1px solid rgba(227, 226, 224, 0.5); 
          border-radius: 6px; 
          background: white; 
          color: rgba(55, 53, 47, 0.8); 
          cursor: pointer;
          font-size: 14px;
        ">Annulla</button>
        <button id="modal-confirm" style="
          padding: 8px 16px; 
          border: none; 
          border-radius: 6px; 
          background: rgb(35, 131, 226); 
          color: white; 
          cursor: pointer;
          font-size: 14px;
        ">Salva</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector('#modal-input');
    const confirmBtn = modal.querySelector('#modal-confirm');
    const cancelBtn = modal.querySelector('#modal-cancel');

    input.focus();

    const closeModal = () => {
      overlay.remove();
    };

    const handleConfirm = () => {
      const value = input.value.trim();
      closeModal();
      if (value) callback(value);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'Escape') closeModal();
    });
  }

  showConfirmModal(title, message, callback) {
    const overlay = this.createModalOverlay();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 400px;
      width: 90%;
      box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: rgb(55, 53, 47);">${title}</h3>
      <p style="margin: 0 0 20px; font-size: 14px; color: rgba(55, 53, 47, 0.8);">${message}</p>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="modal-cancel" style="
          padding: 8px 16px; 
          border: 1px solid rgba(227, 226, 224, 0.5); 
          border-radius: 6px; 
          background: white; 
          color: rgba(55, 53, 47, 0.8); 
          cursor: pointer;
          font-size: 14px;
        ">Annulla</button>
        <button id="modal-confirm" style="
          padding: 8px 16px; 
          border: none; 
          border-radius: 6px; 
          background: rgb(220, 38, 38); 
          color: white; 
          cursor: pointer;
          font-size: 14px;
        ">Conferma</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const confirmBtn = modal.querySelector('#modal-confirm');
    const cancelBtn = modal.querySelector('#modal-cancel');

    const closeModal = () => {
      overlay.remove();
    };

    confirmBtn.addEventListener('click', () => {
      closeModal();
      callback();
    });
    
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  createModalOverlay() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 15, 15, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    return overlay;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    
    const colors = {
      success: { bg: 'rgb(16, 185, 129)', border: 'rgb(5, 150, 105)' },
      error: { bg: 'rgb(239, 68, 68)', border: 'rgb(220, 38, 38)' },
      info: { bg: 'rgb(59, 130, 246)', border: 'rgb(37, 99, 235)' },
      warning: { bg: 'rgb(245, 158, 11)', border: 'rgb(217, 119, 6)' }
    };

    const color = colors[type] || colors.info;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 4px solid ${color.border};
      box-shadow: rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;
      z-index: 10001;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.textContent = message;

    // Aggiungi l'animazione CSS
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Rimuovi automaticamente dopo 3 secondi
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }
}

// Inizializza il Filter Manager
console.log('🚀 Inizializzazione Notion Filter Manager...');
const filterManager = new NotionFilterManager();