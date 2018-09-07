const fs = require('fs');

const PuppeteerEnvironment = require('jest-environment-puppeteer')

class CustomEnvironment extends PuppeteerEnvironment {
  allPages(callback) {
    return Promise.all(this.pages.map(async (page) => {
      return callback.call(this, page)
    }))
  }

  extractTraceShots(tracefile, destination) {
    try {
      const contents = fs.readFileSync(tracefile, 'utf8');
      const tracing = JSON.parse(contents);

      if (!fs.existsSync("traceshots")){
          fs.mkdirSync("traceshots");
      }

      if (!fs.existsSync(destination)){
          fs.mkdirSync(destination);
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
        fs.writeFile(destination + '/trace-screenshot-'+indexString+'.jpg', snap.args.snapshot, 'base64', function(err) {
          if (err) {
            console.log('writeFile error', err);
          }
        });
      });
    } catch(err) {
      console.log(err)
    }
  }

  bindWaitClick(page) {
    return (
      async (selector, ...args) => {
        try {
          await page.waitForSelector(selector, {visible: true})
          return page.click(selector, ...args)
        } catch (err) {
          console.log(err.stack);
        }
      }
    )
  }
  async setup() {
    await super.setup()
    this.global.allPages = this.allPages
    this.global.bindWaitClick = this.bindWaitClick
    this.global.extractTraceShots = this.extractTraceShots
  }

  async teardown() {
    // Your teardown
    await this.global.page.waitFor(2000)
    await super.teardown()
  }
}

module.exports = CustomEnvironment
