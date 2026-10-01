
function Explore() {
  const building = document.getElementById('buildingSelect').value;

  fetch(`/app/meal?building=${building}`)
    .then(response => response.json())
    .then(data => {
      const output = document.getElementById('output');
      output.innerHTML = ''; // 테이블 초기화

      const times = ['조식', '중식', '석식'];
      const types = ['정식', '일식'];

      times.forEach(time => {
        const row = document.createElement('tr');

        // 시간 칸
        const timeCell = document.createElement('th');
        timeCell.textContent = time;
        row.appendChild(timeCell);

        // 정식, 일식 칸
        types.forEach(type => {
          const cell = document.createElement('td');
          const content = data[time]?.[type] || '정보 없음';
          cell.innerHTML = content.replace(/\n/g, '<br>'); // 줄바꿈 처리
          row.appendChild(cell);
        });

        output.appendChild(row);
      });
    })
    .catch(err => {
      console.error('식단 정보를 가져오는 중 오류 발생:', err);
      document.getElementById('output').innerHTML = `<tr><td colspan="3">데이터를 불러오지 못했습니다.</td></tr>`;
    });
}

function loadAcademicSchedule() {
  fetch('/app/schedule')
    .then(response => response.json())
    .then(data => {
      const scheduleContainer = document.getElementById('schedule');
      scheduleContainer.innerHTML = ''; // 초기화

      data.forEach(item => {
        const dateElem = document.createElement('div');
        dateElem.style.fontWeight = 'bold';
        dateElem.style.marginTop = '10px';
        dateElem.textContent = item.date;

        const eventElem = document.createElement('div');
        eventElem.textContent = item.event;

        scheduleContainer.appendChild(dateElem);
        scheduleContainer.appendChild(eventElem);
      });
    })
    .catch(err => {
      console.error('학사일정을 불러오는 중 오류 발생:', err);
      document.getElementById('schedule').innerHTML = '<div>일정을 불러오지 못했습니다.</div>';
    });
}


document.addEventListener('DOMContentLoaded', () => {
  Explore(); // 학식 정보 바로 조회
  loadAcademicSchedule(); // 학사일정 불러오기
});

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2,'0');

let day = document.getElementById("date-month");
let year = document.getElementById("date-year");

day.innerHTML = `<h1>${mm}</h1>`;
year.innerHTML = `<h1>${yyyy}</h1>`;




