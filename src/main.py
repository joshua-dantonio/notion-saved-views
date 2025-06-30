import socket
import subprocess
import time
import os
import rumps
import json
import urllib.request

NOTION_APP_PATH = "/Applications/Notion.app"
DEBUG_PORT = 9222

def is_port_open(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.settimeout(0.5)
        s.connect(("127.0.0.1", port))
        s.close()
        return True
    except Exception:
        return False

def close_notion():
    # Chiude Notion su macOS
    subprocess.run(["pkill", "-f", "Notion"], check=False)

def open_notion_debug():
    # Avvia Notion in debug mode su macOS con il flag per permettere l'injection
    subprocess.Popen([
        "open", "-na", NOTION_APP_PATH, "--args",
        "--remote-debugging-port=9222",
        "--remote-allow-origins=*"
    ])

def inject_js():
    # Leggi il codice JS da src/inject.js
    js_path = os.path.join(os.path.dirname(__file__), '../src/inject.js')
    with open(js_path, 'r') as f:
        js_code = f.read()
    # Trova la prima tab di Notion aperta tramite DevTools Protocol
    try:
        resp = urllib.request.urlopen('http://localhost:9222/json')
        tabs = json.load(resp)
        # Cerca una tab di Notion (puoi raffinare il filtro se vuoi)
        for tab in tabs:
            if 'Notion' in tab.get('title', ''):
                ws_url = tab['webSocketDebuggerUrl']
                break
        else:
            rumps.alert('Nessuna tab Notion trovata per injection!')
            return
    except Exception as e:
        rumps.alert(f'Errore connessione DevTools: {e}')
        return
    # Inietta il JS tramite websocket
    try:
        import websocket
        import threading
        result = {}
        def send_js():
            ws = websocket.create_connection(ws_url)
            msg = json.dumps({
                'id': 1,
                'method': 'Runtime.evaluate',
                'params': {'expression': js_code}
            })
            ws.send(msg)
            result['resp'] = ws.recv()
            ws.close()
        t = threading.Thread(target=send_js)
        t.start()
        t.join(timeout=5)
        rumps.notification('Notion', 'JS injection', 'Codice JS iniettato!')
    except Exception as e:
        rumps.alert(f'Errore injection: {e}')

class NotionMenuBarApp(rumps.App):
    def __init__(self):
        super().__init__("Notion Debug", icon=None, menu=[
            rumps.MenuItem("Stato: ...", key="stato"),
            rumps.MenuItem("Riavvia Notion in debug mode", key="riavvia"),
            rumps.MenuItem("Esegui JS injection", key="inject"),
            None,
            rumps.MenuItem("Esci", key="esci")
        ])
        self.icon_green = None  # Placeholder per icona verde
        self.icon_red = None    # Placeholder per icona rossa
        # Timer singolo per la prima chiamata
        self.first_timer = rumps.Timer(self.update_status, 1)
        self.first_timer.start()
        # Timer periodico per aggiornamento regolare
        self.status_timer = rumps.Timer(self.update_status, 5)
        self.status_timer.start()

    def update_status(self, _=None):
        try:
            if is_port_open(DEBUG_PORT):
                self.icon = None  # 🟢 emoji come icona
                self.title = "🟢 Notion DevMode"
                self.menu["stato"].title = "Stato: Debug attivo"
            else:
                self.icon = None  # 🔴 emoji come icona
                self.title = "🔴 Notion normale"
                self.menu["stato"].title = "Stato: Debug non attivo"
        except KeyError:
            pass  # Il menu non è ancora pronto, ignora
        # Ferma il timer singolo dopo la prima esecuzione
        if hasattr(self, 'first_timer'):
            self.first_timer.stop()
            del self.first_timer

    @rumps.clicked("Riavvia Notion in debug mode")
    def riavvia_notion(self, _):
        close_notion()
        time.sleep(2)
        open_notion_debug()
        rumps.notification("Notion", "Riavvio in debug mode", "Attendi qualche secondo...")
        self.update_status()

    @rumps.clicked("Esegui JS injection")
    def esegui_injection(self, _):
        inject_js()

    @rumps.clicked("Esci")
    def quit_app(self, _):
        rumps.quit_application()

def main():
    print("Controllo porta 9222...")
    if is_port_open(DEBUG_PORT):
        print("Notion è già in debug mode sulla porta 9222.")
    else:
        print("Porta 9222 chiusa. Riavvio Notion in debug mode...")
        close_notion()
        time.sleep(2)
        open_notion_debug()
        print("Attendo che Notion esponga la porta 9222...")
        for _ in range(10):
            if is_port_open(DEBUG_PORT):
                print("Notion ora è in debug mode sulla porta 9222!")
                break
            time.sleep(1)
        else:
            print("Errore: la porta 9222 non è stata aperta.")

# Entry point + MenuBar app

if __name__ == "__main__":
    NotionMenuBarApp().run()
