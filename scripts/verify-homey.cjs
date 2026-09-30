'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
async function main() {
  const athom = require('homey/services/AthomApi');
  const selected = await athom.getSelectedHomey();
  const targetIndex = process.argv.indexOf('--homey-id');
  const expectedHomeyId = targetIndex >= 0 ? process.argv[targetIndex + 1] : null;
  if (!expectedHomeyId || selected?.id !== expectedHomeyId) throw new Error('Pass --homey-id for the selected target Homey');
  const api = await athom.getActiveHomey();
  const app = await api.apps.getApp({id:'no.easy.automation', $cache:false});
  const settings = await api.apps.getAppSettings({id:app.id, $cache:false});
  const parse = (raw, fallback) => raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : fallback;
  const autos = parse(settings.automations, []);
  const pinned = parse(settings._pinnedDevices, []);
  const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const devices = await api.devices.getDevices({$cache:false});
  const paired = Object.values(devices).filter(d => d.driverId?.startsWith('homey:app:no.easy.automation:')).map(d => d.id).sort();
  const result = { homey: selected.name, app: {id:app.id, name:app.name, version:app.version, state:app.state, enabled:app.enabled, crashed:app.crashed},
    automationCount: autos.length, automationHash:hash(autos), pinnedCount:pinned.length, pinnedHash:hash(pinned), pairedDeviceIds:paired, hasToken:!!settings._homeyPAT };
  const folder = path.join(__dirname, '../artifacts');
  fs.mkdirSync(folder, { recursive:true });
  const beforeFile = path.join(folder, 'homey-before.json');
  if (process.argv.includes('--before')) {
    if (fs.existsSync(beforeFile)) throw new Error('Before snapshot already exists');
    fs.writeFileSync(beforeFile, JSON.stringify(result, null, 2));
  } else {
    const before = JSON.parse(fs.readFileSync(beforeFile, 'utf8'));
    result.preserved = ['automationHash','pinnedHash','pairedDeviceIds','hasToken'].every(key => JSON.stringify(before[key]) === JSON.stringify(result[key]));
    fs.writeFileSync(path.join(folder, 'homey-after.json'), JSON.stringify(result, null, 2));
    if (!result.preserved || app.state !== 'running' || app.crashed || app.name !== 'Light Guard' || app.version !== require('../app.json').version) throw new Error('Installation verification failed');
  }
  console.log(JSON.stringify({ ...result, automationHash:undefined, pinnedHash:undefined, pairedDeviceIds:undefined }, null, 2));
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1);});
