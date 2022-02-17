describe('Rocketboard', () => {
  beforeAll(async () => {
    allPages = global.allPages.bind(this)
    waitClick = global.bindWaitClick(page)

    jest.setTimeout(10000)
    page2 = await browser.newPage()
    this.pages = [page, page2]

    // Fail on unknown external requests.
    allPages(async (page) => {
      const allowedRequests = [
        process.env.TARGET_URL,
        "gravatar.com",
      ];

      await page.setRequestInterception(true);
      page.on('request', interceptedRequest => {
        if (!allowedRequests.some((str) => interceptedRequest.url().includes(str))) {
          throw "External request made to unverified url " + interceptedRequest.url();
        } else {
          interceptedRequest.continue();
        }
      });
    })

    await page.tracing.start({path: './trace-merge.json', screenshots: true})
    page2.goto(process.env.TARGET_URL)
    page.goto(process.env.TARGET_URL)
  })

  afterAll(async () => {
    await page.tracing.stop()
    extractTraceShots('./trace-merge.json', 'traceshots/merge')
  })

  it('should launch retrospective', async () => {
    waitClick('.action-launch')
    await page.waitForSelector('.page-retrospective')
    page2.goto(page.url())

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
    await page.waitForFunction(() => (
      document.activeElement.tagName === "TEXTAREA"
    ))
    await page.keyboard.type('card1');
    await page.keyboard.press('Enter');

    await allPages(async (page) => {
      await page.waitForSelector('.card-body p')
      const cardText = await page.evaluate(() => document.querySelector('.card-body p').innerText)
      expect(cardText).toEqual('card1')
    })

    waitClick('.column:nth-child(1) .column-header > button')
    await page.waitForSelector('.card-body textarea')
    await page.waitForFunction(() => (
      document.activeElement.tagName === "TEXTAREA"
    ))
    await page.keyboard.type('card2');
    await page.keyboard.press('Enter');

    await allPages(async (page) => {
      await page.waitForSelector('.column:nth-child(1) .card-body p')
      const cardText = await page.evaluate(() => document.querySelector('.card-body p').innerText)
      expect(cardText).toEqual('card2')
    })
  })

  it('should drag and drop', async() => {
    const card = await page.$('.column:nth-child(1) .card');
    const dropCard = await page.$('.column:nth-child(2) .card');

    const cardBox = await card.boundingBox();
    const dropBox = await dropCard.boundingBox();
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + 100, {steps: 10});
    await page.mouse.up();

    await allPages(async (page) => {
      await page.waitForSelector('.nested-card')
      const cardText = await page.evaluate(() => document.querySelector(".column:nth-child(2) .card").innerText)
      expect(cardText).toEqual(expect.stringContaining('card1'))
      expect(cardText).toEqual(expect.stringContaining('card2'))
    })
  })

  it('should nest already nested cards correctly', async() => {
    waitClick('.column:nth-child(3) .column-header > button')
    await page.waitForSelector('.card-body textarea')
    await page.waitForFunction(() => (
      document.activeElement.tagName === "TEXTAREA"
    ))
    await page.keyboard.type('card3');
    await page.keyboard.press('Enter');

    const card = await page.$('.column:nth-child(2) .card');
    const dropCard = await page.$('.column:nth-child(3) .card');

    const cardBox = await card.boundingBox();
    var dropBox = await dropCard.boundingBox();
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + 100, {steps: 10});
    dropBox = await dropCard.boundingBox();
    await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + 100 - cardBox.height / 4, {steps: 5});
    await page.mouse.up();

    await allPages(async (page) => {
      await page.waitForSelector('.nested-card:nth-child(2)')
      const cardText = await page.evaluate(() => document.querySelector(".column:nth-child(3) .card").innerText)
      expect(cardText).toEqual(expect.stringContaining('card1'))
      expect(cardText).toEqual(expect.stringContaining('card2'))
      expect(cardText).toEqual(expect.stringContaining('card3'))
    })
  })
})
