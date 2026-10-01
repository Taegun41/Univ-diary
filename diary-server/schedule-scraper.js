const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://onestop.pusan.ac.kr', {
    waitUntil: 'networkidle2',
  });

  const schedule = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('ul.schedule-list > li'));
    
    return items.map(li => {
      const spans = li.querySelectorAll('span');
      return {
        date: spans[0]?.innerText.trim() || '',
        event: spans[1]?.innerText.trim() || ''
      };
    });
  });

  fs.writeFileSync('./academic-schedule/academic_schedule.json', JSON.stringify(schedule, null, 2), 'utf-8');
  console.log('✅ 학사일정 JSON 저장 완료');

  await browser.close();
})();
