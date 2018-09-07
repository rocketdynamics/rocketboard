const fs = require('fs');
const puppeteer = require('puppeteer');
var URL = require('url').URL;

describe('OnlineUsers', () => {
  beforeAll(async () => {
    allPages = global.allPages.bind(this)
    browser2 = await puppeteer.launch()
    jest.setTimeout(10000)

    this.pages = [
      await (await browser2.createIncognitoBrowserContext()).newPage(),
      await (await browser2.createIncognitoBrowserContext()).newPage(),
      await (await browser2.createIncognitoBrowserContext()).newPage()
    ]

    mainPage = this.pages[0]
    mainPage.bringToFront()
    await mainPage.tracing.start({path: './trace-online-users.json', screenshots: true})
    waitClick = global.bindWaitClick(mainPage)

    var domain = new URL(process.env.TARGET_URL).host
    this.pages.forEach((page, i) => {
      page.setCookie({
        name: "_oauth2_proxy",
        value: Buffer.from("email:user" + i).toString('base64'),
        domain: domain,
        path: '/',
      })
    })

    await mainPage.goto(process.env.TARGET_URL)

    waitClick('.action-launch')
    await mainPage.waitForSelector('.page-retrospective')
    retroUrl = mainPage.url()
  })

  afterAll(async () => {
    await mainPage.tracing.stop()
    extractTraceShots('./trace-online-users.json', 'traceshots/online-users')
    await browser2.close()
  })

  it('should have 1 online users', async () => {
    await mainPage.waitForSelector('.page-retrospective')
    await mainPage.waitFor(() =>
      document.querySelectorAll('.userAvatar').length === 1
    )
  })

  it('should have 2 online users', async () => {
    this.pages[1].goto(retroUrl)
    await this.pages[1].waitForSelector('.page-retrospective')
    await Promise.all(this.pages.slice(0,2).map(async (page) => {
      await page.waitFor(() =>
        document.querySelectorAll('.userAvatar').length === 2
      )
    }))
  })

  it('should have 3 online users', async () => {
    this.pages[2].goto(retroUrl)
    await this.pages[2].waitForSelector('.page-retrospective')
    await allPages(async (page) => {
      await page.waitFor(() =>
        document.querySelectorAll('.userAvatar').length === 3
      )
    })
  })

  it('should have 2 online users again', async () => {
    await this.pages[2].close({runBeforeUnload: true})
    await Promise.all(this.pages.slice(0,2).map(async (page) => {
      await page.waitFor(() =>
        document.querySelectorAll('.userAvatar').length === 2
      )
    }))
  })
})
