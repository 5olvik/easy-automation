'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const device = (id, name, zone, cls, caps, available = true) => ({ id, name, zone, class: cls, capabilities: caps, available, capabilitiesObj: {} });
const devices = [
  device('motion-hall', 'Bevegelse i gangen', 'Gang', 'sensor', ['alarm_motion']),
  device('hall-light', 'Downlights', 'Gang', 'light', ['onoff', 'dim']),
  device('living-light', 'Taklys', 'Stue', 'light', ['onoff', 'dim', 'light_temperature']),
  device('living-lamp', 'Leselampe', 'Stue', 'socket', ['onoff']),
  device('kitchen-light', 'Lys over kjøkkenbenken', 'Kjøkken', 'light', ['onoff', 'dim']),
  device('door', 'Dørsensor', 'Bod', 'sensor', ['alarm_contact']),
  device('store-light', 'Taklampe', 'Bod', 'light', ['onoff'], false)
];
const automation = (id, name, template, trigger, actions, enabled = true) => ({
  id: id + '-on', name, enabled, _groupId: id, _groupName: name, _templateType: template, trigger, conditions: [], actions
});
const fixtures = {
  _appVersion: require('../app.json').version,
  _deviceCache: JSON.stringify(devices), _pinnedDevices: '[]', _holdStatus: '{}',
  _manualLightStatus: JSON.stringify({ hall: { since: Date.now(), endsAt: null } }),
  _deviceCacheUpdatedAt: Date.now(),
  automations: JSON.stringify([
    automation('hall', 'Bevegelseslys', 'motion_lights', { type: 'motion_start', deviceId: 'motion-hall' }, [{ type: 'turn_on', deviceId: 'hall-light' }, { type: 'set_dim', deviceId: 'hall-light', value: .7 }]),
    { id: 'hall-off', name: 'Bevegelseslys av', _groupId: 'hall', _groupName: 'Bevegelseslys', _templateType: 'motion_lights', enabled: true, trigger: { type: 'motion_stop', deviceId: 'motion-hall' }, conditions: [], actions: [{ type: 'turn_off', deviceId: 'hall-light' }] },
    automation('living', 'Kveldslys', 'scene', { type: 'manual' }, [{ type: 'turn_on', deviceId: 'living-light' }, { type: 'set_dim', deviceId: 'living-light', value: .3 }, { type: 'turn_off', deviceId: 'living-lamp' }]),
    automation('kitchen', 'Morgenlys', 'schedule', { type: 'time', time: '06:30', days: [1,2,3,4,5] }, [{ type: 'turn_on', deviceId: 'kitchen-light' }]),
    automation('store', 'Lys når døren åpnes', 'door_lights', { type: 'door_open', deviceId: 'door' }, [{ type: 'turn_on', deviceId: 'store-light' }], false)
  ]),
  _appLog: JSON.stringify([
    { ts: Date.now() - 100000, level: 'info', message: 'Light Guard er klar.' },
    { ts: Date.now() - 50000, level: 'trigger', message: 'Bevegelseslys: bevegelse i gangen.' },
    { ts: Date.now() - 45000, level: 'action', message: 'Downlights satt til 70 %.' },
    { ts: Date.now() - 20000, level: 'info', message: 'Bevegelseslys: manuell lysstyrke beholdes til rommet er tomt.' }
  ])
};
const cssRoot = process.env.LIGHT_GUARD_HOMEY_CSS || path.resolve(root, '../Home Guard/artifacts/homey-webview/css');
const realStyles = fs.existsSync(cssRoot) ? ['_homey-variables.css','_base.css','_homey-typography.css','_homey-button.css','_homey-form.css','_homey-icon.css'].map(name => fs.readFileSync(path.join(cssRoot, name), 'utf8')).join('\n') : '';
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4792');
    if (req.headers.host !== '127.0.0.1:4792' && req.headers.host !== 'localhost:4792') { res.writeHead(403).end(); return; }
    if (url.pathname === '/homey.js') {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.end(`(() => {
        const query = new URLSearchParams(location.search);
        Object.defineProperty(navigator, 'language', { value: query.get('lang') === 'en' ? 'en-US' : 'nb-NO', configurable: true });
        const values = ${JSON.stringify(fixtures)};
        if (query.has('empty')) { values.automations = '[]'; values._appLog = '[]'; values._manualLightStatus = '{}'; }
        const homey = {
          ready() {},
          get(key, callback) { setTimeout(() => callback(query.has('error') && key !== '_homeyPAT' ? 'Homey is offline' : null, values[key] || null), 10); },
          set(key, value, callback) { values[key] = value; if (key === '_refreshDevices') values._deviceCacheUpdatedAt = Date.now(); setTimeout(() => callback(null), 10); },
          api(method, route, data, callback) { callback(null, {}); },
          alert(message) { window.alert(message); },
          confirm(message, options, callback) { callback(null, window.confirm(message)); }
        };
        window.addEventListener('load', () => {
          if (query.has('homeycss')) { const style = document.createElement('style'); style.textContent = ${JSON.stringify(realStyles)}; document.head.appendChild(style); }
          onHomeyReady(homey);
        });
      })();`);
      return;
    }
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(root, 'settings', relative);
    if (!file.startsWith(path.join(root, 'settings') + path.sep) || !['.html', '.css', '.js'].includes(path.extname(file))) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[path.extname(file)] + '; charset=utf-8');
    res.end(fs.readFileSync(file));
  } catch (error) { res.writeHead(404).end('Not found'); }
});
server.listen(4792, '127.0.0.1', () => console.log('Light Guard preview: http://127.0.0.1:4792 (in-memory sample data)'));
