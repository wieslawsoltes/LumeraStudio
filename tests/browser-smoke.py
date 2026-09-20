"""Real Chromium smoke test of the Pages edition, IndexedDB, and subpath assets.
Install Python Playwright and Chromium first. Set CHROMIUM_PATH to use a system browser.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path.startswith('/LumeraStudio/'):
            path = path[len('/LumeraStudio'):]
        return super().translate_path(path)
    def log_message(self, *args):
        pass

server = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / '_site')))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f'http://127.0.0.1:{server.server_address[1]}/LumeraStudio/'
try:
    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 1440, 'height': 960})
        context.add_init_script("Object.defineProperty(Navigator.prototype, 'gpu', {get: () => undefined});")
        page = context.new_page()
        errors, failed, requests = [], [], []
        def on_error(error):
            errors.append(str(error))
            print('PAGE ERROR:', error, flush=True)
        page.on('pageerror', on_error)
        page.on('response', lambda response: failed.append(response.url) if response.status >= 400 else None)
        page.on('request', lambda request: requests.append(request.url))
        page.goto(base, wait_until='networkidle')
        page.wait_for_function("document.querySelector('#save-status').textContent === 'Ready to save'")
        page.locator('.projectbar [data-action="save"]').click()
        page.wait_for_function("document.querySelector('#save-status').textContent === 'Saved'")
        page.locator('[data-menu="edit"]').click()
        page.locator('#menu [data-action="rename"]').click()
        page.locator('#rename-input').fill('Pages persistence smoke')
        page.locator('#rename-save').click()
        page.wait_for_function("document.querySelector('#save-status').textContent === 'Saved'")
        page.reload(wait_until='networkidle')
        page.wait_for_function("document.querySelector('#project-name').textContent === 'Pages persistence smoke'")
        page.locator('.projectbar [data-action="collaborate"]').click()
        assert 'does not provide remote collaboration' in page.locator('#dialog-body').inner_text()
        assert page.locator('#create-invite').count() == 0
        page.locator('#dialog-close').click()
        page.screenshot(path=str(OUT / 'pages-workspace.png'), full_page=True)
        other = context.new_page()
        other.goto(base, wait_until='networkidle')
        other.wait_for_function("document.querySelector('#project-name').textContent === 'Pages persistence smoke'")
        setup = """async () => {
          const {IndexedDBProjectStorage,createLocalTransport}=await import('./packages/collaboration/local.js');
          const {createScene,diff}=await import('./packages/core/index.js');
          window.smoke={request:createLocalTransport({storage:new IndexedDBProjectStorage({name:'lumera-smoke-transactions'})}),createScene,diff};
        }"""
        page.evaluate(setup)
        other.evaluate(setup)
        project = page.evaluate("async () => smoke.request('/projects','POST',{scene:smoke.createScene()})")
        result = page.evaluate("""async id => {
          const a=await smoke.request('/projects/'+id), b=structuredClone(a.scene);b.name='First tab';
          return smoke.request('/projects/'+id,'PATCH',{revision:1,patches:smoke.diff(a.scene,b)});
        }""", project['id'])
        assert result['revision'] == 2
        conflict = other.evaluate("""async id => {
          try { await smoke.request('/projects/'+id,'PATCH',{revision:1,patches:[]}); return null; }
          catch(e){return {status:e.status,revision:e.data.revision,name:e.data.scene.name};}
        }""", project['id'])
        assert conflict == {'status':409,'revision':2,'name':'First tab'}, conflict
        assert not errors, errors
        assert not failed, failed
        assert not any('/api/' in url or '/signin' in url for url in requests), requests
        report = {'browser':browser.version,'storage':'IndexedDB','renderer':'CPU fallback','checks':['subpath assets','save and reload','rename persistence','second-tab load','revision conflict','explicit local sharing boundary','no server API calls','no page errors']}
        (OUT / 'browser-smoke.json').write_text(json.dumps(report, indent=2))
        print(json.dumps(report, indent=2))
        browser.close()
finally:
    server.shutdown()
    server.server_close()
