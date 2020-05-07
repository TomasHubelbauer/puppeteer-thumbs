# Puppeteer Image and Video Thumbnails

Puppeteer can be used to generate image and video thumbnails. This is probably
rarely the best choice, but when you have other workflows which already use
Puppeteer, it might make more sense to reuse it for this rather than to pull in
another dependency like ImageMagick or FFMPEG. Especially when dealing with
cross-platform scenarios.

The way to generate a thumbnail of an image using Puppeteer is as follows:

```ts
const puppeteer = require('puppeteer');
const path = require('path');

void async function () {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto(`file://${path.join(__dirname, 'input.jpg')}`);
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  await page.evaluate(() => [...document.images].forEach(i => {
    i.height = 100;
    i.width = (i.height / i.naturalHeight) * i.naturalWidth;
  }));
  const clip = await page.evaluate(() => document.images[0].getBoundingClientRect().toJSON());
  await page.screenshot({ path: 'output.png', clip });
  await browser.close();
}()
```

## The Question

But what is faster? To navigate to each image and capture it sequentially, or to
load all of the images in one page in parallel and then capture them serially?

## The Answer

Looks like the latter by about 15-20 %. Cool.
