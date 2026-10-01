 fetch('/api/meals')
      .then(res => res.json())
      .then(data => {
        const menuDiv = document.getElementById('menu');
        if (data.error) {
          menuDiv.innerText = data.error;
        } else {
          for (const [meal, items] of Object.entries(data)) {
            const section = document.createElement('div');
            section.innerHTML = `<h3>${meal}</h3><p>${items.join(', ')}</p>`;
            menuDiv.appendChild(section);
          }
        }
      })
      .catch(err => {
        document.getElementById('menu').innerText = '학식 정보를 불러오는 중 오류 발생';
        console.error(err);
      });