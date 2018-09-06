const fs = require('fs');

describe('Rocketboard', () => {
  var page2
  var pages
  var waitClick = async (selector, ...args) => {
    try {
      await page.waitForSelector(selector, {visible: true})
      return page.click(selector, ...args)
    } catch (err) {
      console.log(err.stack);
    }
  }

  beforeAll(async () => {
    jest.setTimeout(10000)
    page2 = await browser.newPage()
    page.setViewport({ width: 1000, height: 800 })
    page2.setViewport({ width: 1000, height: 800 })
    pages = [page, page2]
    await page.tracing.start({path: './trace.json', screenshots: true})
    page2.goto(process.env.TARGET_URL)
    await page.goto(process.env.TARGET_URL)
  })

  afterAll(async () => {
    await page.tracing.stop()

    const tracing = JSON.parse(fs.readFileSync('./trace.json', 'utf8'));

    if (!fs.existsSync("traceshots")){
        fs.mkdirSync("traceshots");
    }
    const traceScreenshots = tracing.traceEvents.filter(x => (
        x.cat === 'disabled-by-default-devtools.screenshot' &&
        x.name === 'Screenshot' &&
        typeof x.args !== 'undefined' &&
        typeof x.args.snapshot !== 'undefined'
    ));
    traceScreenshots.forEach(function(snap, index) {
      var indexString = "" + index
      while(indexString.length < 5) {
        indexString = "0" + indexString
      }
      fs.writeFile('traceshots/trace-screenshot-'+indexString+'.jpg', snap.args.snapshot, 'base64', function(err) {
        if (err) {
          console.log('writeFile error', err);
        }
      });
    });
  })

  allPages = (callback) => {
    return Promise.all(pages.map(async (page) => {
      await callback.call(this, page)
    }))
  }

  it('should launch retrospective', async () => {
    waitClick('.action-launch')
    await page.waitForSelector('.page-retrospective')
    await page2.goto(page.url())

    await allPages(async (page) => {
      await page.waitForSelector('.page-retrospective')

      // Remove loading overlay
      await page.evaluate(() => {
        var element = document.querySelector('.retrospective-loading')
        element.parentNode.removeChild(element)
      })

      const columnText = await page.evaluate(() => document.querySelector('.column:nth-child(1) .column-header').innerText.trim())
      expect(columnText).toEqual('Positive')
    })
  })

  it('should allow card creation', async () => {
    waitClick('.column:nth-child(2) .column-header > button')
    await page.waitForSelector('.card-body textarea')
    await page.waitFor(() => (
      document.activeElement.tagName === "TEXTAREA"
    ))
    await page.keyboard.type('t');
    await page.keyboard.press('Enter');

    await allPages(async (page) => {
      await page.waitForSelector('.card-body p')
      const cardText = await page.evaluate(() => document.querySelector('.card-body p').innerText)
      expect(cardText).toEqual('t')
    })

    await waitClick('.reaction-new')
    await page.waitFor(200)
    waitClick('.ant-tooltip [aria-label=sauropod]')
    await allPages(async (page) => {
      await page.waitForSelector('.reaction-sauropod')
    })
  })

  it('should allow vote spam', async () => {
    await page.waitForSelector('.reaction-sauropod')
    for( var i = 0; i < 5; i++ ) {
      page.click('.reaction-sauropod')
    }
    await allPages(async (page) => {
      await page.waitForSelector('.reaction-sauropod')
      await page.waitFor(() => (
        document.querySelector('.reaction-sauropod .card-reaction-count').innerText === "6"
      ))
    })
    // And check it works the other way around
    for( var i = 0; i < 5; i++ ) {
      page.click('.reaction-sauropod')
    }
    await allPages(async (page) => {
      await page.waitFor(() => (
        document.querySelector('.reaction-sauropod .card-reaction-count').innerText === "11"
      ))
    })
  })

  it('should drag and drop', async() => {
    const card = await page.$('.card');
    const dropColumn = await page.$('.column:nth-child(1) .column-cards');

    const cardBox = await card.boundingBox();
    const dropBox = await dropColumn.boundingBox();
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + 100, {steps: 10});
    await page.mouse.up();

    await allPages(async (page) => {
      await page.waitForSelector('.column:nth-child(1) .card')
    })
  })

  it('shows online users', async() => {
    await allPages(async (page) => {
      expect(
        await page.evaluate(() => (
          document.querySelectorAll('.userAvatar').length
        ))
      ).toEqual(1)
    })
  })
})
