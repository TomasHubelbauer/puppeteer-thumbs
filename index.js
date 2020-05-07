const puppeteer = require('puppeteer');
const path = require('path');
const klaw = require('klaw');
const perf_hooks = require('perf_hooks');
const fs = require('fs-extra');

void async function () {
  await fs.ensureDir('output-serial');
  const serialStamp = perf_hooks.performance.now();
  await serial();
  console.log('Serial:', ~~(perf_hooks.performance.now() - serialStamp), 'ms');

  await fs.ensureDir('output-parallel');
  const parallelStamp = perf_hooks.performance.now();
  await parallel();
  console.log('Parallel:', ~~(perf_hooks.performance.now() - parallelStamp), 'ms');
}()

async function serial() {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  for await (const entry of klaw('input')) {
    // Skip over the directory entry itself
    if (!entry.stats.isFile() || path.extname(entry.path) !== '.jpg') {
      continue;
    }

    await page.goto(`file://${entry.path}`);
    await page.waitForFunction(() => [...document.images].every(i => i.complete));
    await page.evaluate(() => [...document.images].forEach(i => {
      i.height = 100;
      i.width = (i.height / i.naturalHeight) * i.naturalWidth;
    }));
    const clip = await page.evaluate(() => document.images[0].getBoundingClientRect().toJSON());
    const name = path.basename(entry.path, path.extname(entry.path));
    await page.screenshot({ path: `output-serial/${name}.png`, clip });
    console.log(name);
  }

  await browser.close();
}

async function parallel() {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  const names = [];
  for await (const entry of klaw('input')) {
    // Skip over the directory entry itself
    if (!entry.stats.isFile() || path.extname(entry.path) !== '.jpg') {
      continue;
    }

    const name = path.basename(entry.path, path.extname(entry.path));
    names.push(name);
  }

  await fs.writeFile('input/index.html', names.map(n => `<img src="${n}.jpg" />`).join('\n'));
  await page.goto(`file://${path.join(__dirname, 'input/index.html')}`);
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  await page.evaluate(() => [...document.images].forEach(i => {
    i.height = 100;
    i.width = (i.height / i.naturalHeight) * i.naturalWidth;
  }));

  const clips = await page.evaluate(() => [...document.images].map(i => i.getBoundingClientRect().toJSON()));
  for (let index = 0; index < clips.length; index++) {
    const clip = clips[index];
    const name = names[index];
    await page.screenshot({ path: `output-parallel/${name}.png`, clip });
    console.log(name);
  }

  await browser.close();
}
