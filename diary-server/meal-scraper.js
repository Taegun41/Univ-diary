const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');

const buildingMap = {
  'Geumjeong': { buildingCode: 'R001', restaurantCode: 'PG002' },
  'Geumjeong-scholor': { buildingCode: 'R001', restaurantCode: 'PG001' },
  'MunChang': { buildingCode: 'R002', restaurantCode: 'PM002' },
  'Haksaeng': { buildingCode: 'R004', restaurantCode: 'PH002' },
};

async function fetchTodayMealByName(buildingName) {
  const info = buildingMap[buildingName];
  if (!info) return;

  const { buildingCode, restaurantCode } = info;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.pusan.ac.kr/kor/CMS/MenuMgr/menuListOnBuilding.do?mCode=MN202', {
    waitUntil: 'domcontentloaded',
  });

  await page.evaluate((bCode, rCode) => {
    goSearchMenu('PUSAN', bCode, rCode, '');
  }, buildingCode, restaurantCode);

  await page.waitForSelector('tbody tr');

  const dayIndex = new Date().getDay() - 1;
  if (dayIndex < 0 || dayIndex > 4) {
    console.log(`${buildingName} 주말은 식단 없음`);
  }

  const mealData = await page.evaluate((idx) => {
    const rows = document.querySelectorAll('tbody tr');
    const labels = ['조식', '중식', '석식'];
    const result = {};

    rows.forEach((tr, i) => {
      const td = tr.querySelectorAll('td')[idx];
      const liItems = td ? td.querySelectorAll('li') : [];

      result[labels[i]] = {
        정식: liItems[0] ? liItems[0].innerText.trim() : '',
        일식: liItems[1] ? liItems[1].innerText.trim() : '',
      };
    });

    return result;
  }, dayIndex);

  await browser.close();

  // ⬇ JSON 폴더가 없으면 자동 생성
  const dirPath = path.join(__dirname, 'meal-json');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  const filePath = path.join(dirPath, `${buildingName}_today.json`);
  fs.writeFileSync(filePath, JSON.stringify(mealData, null, 2), 'utf-8');
  console.log(`✔ ${buildingName} 식단 저장 완료 → ${filePath}`);
}

async function fetchAllTodayMeals() {
  for (const buildingName of Object.keys(buildingMap)) {
    await fetchTodayMealByName(buildingName);
  }
}

module.exports = { fetchAllTodayMeals };
