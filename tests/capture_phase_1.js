/**
 * Swarm — Phase 1 Automated Browser Capture & Phone Profile Benchmark
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const outDir = '/Users/newtonuser/.gemini/antigravity-ide/brain/3d548fb5-2b76-41d6-95e2-088477819984';

async function captureScreen(width, height, setupFnStr, filename, isMobile = false) {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    '--remote-debugging-port=9229',
    '--user-data-dir=/tmp/chrome-swarm-p1-cdp',
    'http://localhost:8095/'
  ]);

  await new Promise(r => setTimeout(r, 1400));

  try {
    const res = await fetch('http://127.0.0.1:9229/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.url.includes('localhost:8095')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      let id = 1;
      const send = (method, params = {}) => {
        ws.send(JSON.stringify({ id: id++, method, params }));
      };

      ws.onopen = async () => {
        send('Page.enable');
        send('Runtime.enable');
        send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: isMobile
        });
        if (isMobile) {
          send('Emulation.setTouchEmulationEnabled', { enabled: true });
        }
        await new Promise(r => setTimeout(r, 600));

        if (setupFnStr) {
          await new Promise((evalRes) => {
            const evalId = id;
            const timer = setTimeout(evalRes, 6000);
            const evalHandler = (evt) => {
              const m = JSON.parse(evt.data);
              if (m.id === evalId) {
                clearTimeout(timer);
                ws.removeEventListener('message', evalHandler);
                setTimeout(evalRes, 800);
              }
            };
            ws.addEventListener('message', evalHandler);
            send('Runtime.evaluate', {
              expression: `(async () => { ${setupFnStr} })()`,
              awaitPromise: true
            });
          });
        }

        ws.onmessage = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.result && msg.result.data) {
            const buf = Buffer.from(msg.result.data, 'base64');
            const filePath = path.join(outDir, filename);
            fs.writeFileSync(filePath, buf);
            console.log(`Saved screenshot: ${filename} (${width}x${height})`);
            resolve();
          }
        };

        send('Page.captureScreenshot', { format: 'png' });
      };
      ws.onerror = reject;
    });

    ws.close();
  } catch (err) {
    console.error(`Error capturing ${filename}:`, err);
  } finally {
    chrome.kill();
    await new Promise(r => setTimeout(r, 800));
  }
}

async function run() {
  console.log('Capturing Phase 1 screenshots for SWARM...');

  // 1. Title Screen (Laptop)
  await captureScreen(1280, 720, null, 'swarm_title_laptop.png');

  // 2. In-Game Combat Action (Laptop)
  const setupCombat = `
    await new Promise(res => {
      const t = setInterval(() => {
        if (window.__swarm && window.__swarm.game) {
          clearInterval(t);
          window.__swarm.startRun();
          // Let it simulate 1.5s of combat
          setTimeout(() => {
            res();
          }, 1500);
        }
      }, 100);
    });
  `;
  await captureScreen(1280, 720, setupCombat, 'swarm_combat_laptop.png');

  // 3. 600-Enemy Stress Test Swarm (Laptop)
  const setup600Swarm = `
    await new Promise(res => {
      const t = setInterval(() => {
        if (window.__swarm && window.__swarm.game) {
          clearInterval(t);
          window.__swarm.startRun();
          window.__swarm.spawnStressSwarm(600);
          setTimeout(() => {
            console.log("Active entities under stress:", window.__swarm.getActiveCounts(), "FPS:", window.__swarm.getFps());
            res();
          }, 800);
        }
      }, 100);
    });
  `;
  await captureScreen(1280, 720, setup600Swarm, 'swarm_600_enemies_laptop.png');

  // 4. Level-Up Upgrade Cards Modal (Laptop)
  const setupLevelUp = `
    await new Promise(res => {
      const t = setInterval(() => {
        if (window.__swarm && window.__swarm.game) {
          clearInterval(t);
          window.__swarm.startRun();
          window.__swarm.game.triggerLevelUp();
          setTimeout(res, 500);
        }
      }, 100);
    });
  `;
  await captureScreen(1280, 720, setupLevelUp, 'swarm_levelup_laptop.png');

  // 5. In-Game Combat Action (Phone: 414x736)
  await captureScreen(414, 736, setupCombat, 'swarm_combat_phone.png', true);

  // 6. 600-Enemy Stress Test Swarm (Phone: 414x736)
  await captureScreen(414, 736, setup600Swarm, 'swarm_600_enemies_phone.png', true);

  console.log('All Phase 1 screenshots captured successfully!');
}

run();
