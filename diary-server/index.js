const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const { fetchAllTodayMeals } = require('./meal-scraper');
const crawlAcademicSchedule = require('./schedule-scraper');
const alertFile = path.join(__dirname, 'json', 'alert.json');
const app = express();
const PORT = 3000;

const boardFilePath = path.join(__dirname, 'json', 'board.json');
const userFilePath = path.join(__dirname, 'users.json');
require('dotenv').config();
// 오늘자 학식 미리 수집
fetchAllTodayMeals();

// 세션 설정
app.use(session({
  secret: 'team11',
  resave: false,
  saveUninitialized: false
}));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/json', express.static(path.join(__dirname, 'json')));

// 요청 파싱
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 요청 로그
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'html', 'auth.html'));
});
//챗 gpt api
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // 또는 'gpt-3.5-turbo'
        messages: [
          { role: 'system', content: '너는 대학 다이어리 봇이야.' },
          { role: 'user', content: userMessage }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const gptReply = response.data.choices[0].message.content;
    res.json({ reply: gptReply });
  } catch (err) {
    console.error('OpenAI 오류:', err.response?.data || err);
    res.status(500).json({ error: 'GPT 호출 실패' });
  }
});

// 로그인 상태 확인
// app.get('/user-info', (req, res) => {
//   if (req.session.username) {
//     res.json({ loggedIn: true, username: req.session.username });
//   } else {
//     res.json({ loggedIn: false });
//   }
// });

// 회원가입
app.post('/register', (req, res) => {
  const { username, password, nickname } = req.body;
  let users = {};

  if (fs.existsSync(userFilePath)) {
    try {
      users = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'));
    } catch (err) {
      console.error('JSON 파싱 오류:', err);
    }
  }

  if (users[username]) {
    return res.send('이미 존재하는 아이디입니다.');
  }

  users[username] = { password, nickname };
  fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));
  res.redirect('/html/auth.html');
});

// 로그인
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = fs.existsSync(userFilePath)
    ? JSON.parse(fs.readFileSync(userFilePath, 'utf-8'))
    : {};

  if (!users[username]) return res.send('존재하지 않는 사용자입니다.');
  if (users[username].password !== password) return res.send('비밀번호가 틀렸습니다.');

  req.session.username = username; // ✅ 수정된 부분
  res.redirect('/html/main.html');
});

// 로그아웃
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('로그아웃 실패');
    res.redirect('/');
  });
});

// 유저 정보 제공
app.get('/user-info', (req, res) => {
  const username = req.session.username;
  if (!username) {
    return res.json({ loggedIn: false });
  }

  const users = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'));
  const userInfo = users[username];

  if (!userInfo) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    username: username,
    nickname: userInfo.nickname || username // 닉네임이 없으면 username 반환
  });
});
//유저 정보
app.get('/getUserInfo', (req, res) => {
  const username = req.session.username;
  if (!username) {
    return res.json({ loggedIn: false });
  }

  const users = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'));
  const userInfo = users[username];

  if (!userInfo) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    username: username,
    nickname: userInfo.nickname || username,
    profileImg: userInfo.profileImg || '/img/default-profile.png', // 선택적으로 추가
  });
});
// 학식 요청
app.get('/app/meal', (req, res) => {
  const building = req.query.building || 'Geumjeong';
  const filename = path.join(__dirname, 'meal-json', `${building}_today.json`);

  if (fs.existsSync(filename)) {
    const rawData = fs.readFileSync(filename, 'utf-8');
    res.json(JSON.parse(rawData));
  } else {
    res.status(404).json({ error: '해당 학식 파일 없음' });
  }
});

// 학사일정
app.get('/app/schedule', (req, res) => {
  const schedulePath = path.join(__dirname, 'academic-schedule', 'academic_schedule.json');
  if (fs.existsSync(schedulePath)) {
    const data = fs.readFileSync(schedulePath, 'utf-8');
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: '학사일정 파일이 없습니다.' });
  }
});

// 게시글 작성
app.post('/board/write', (req, res) => {
  if (!req.session.username) {
    return res.status(403).send("로그인 후 이용 가능합니다.");
  }

  const { title, content } = req.body;
  const createdAt = new Date().toISOString().split('T')[0]; 

  const newPost = {
    id: Date.now(), //고유식별번호 -> 고정
    author: req.session.username,
    title,
    content,
    createdAt,
    comments: [] // 기본값 추가
  };

  let posts = [];
  if (fs.existsSync(boardFilePath)) {
    posts = JSON.parse(fs.readFileSync(boardFilePath, 'utf-8'));
  }

  posts.push(newPost);
  fs.writeFileSync(boardFilePath, JSON.stringify(posts, null, 2));
  res.redirect('/html/pages/board.html');
});

// 게시글 목록
app.get('/app/board', (req, res) => {
  const posts = fs.existsSync(boardFilePath)
    ? JSON.parse(fs.readFileSync(boardFilePath, 'utf-8'))
    : [];
  res.json(posts.reverse());
});

// 게시글 상세
app.get('/board/detail', (req, res) => {
  const id = Number(req.query.id);
  const data = JSON.parse(fs.readFileSync(boardFilePath, 'utf-8'));
  const post = data.find(p => p.id === id);
  post ? res.json(post) : res.status(404).send('Post not found');
});

// 댓글 업로드
app.post('/board/commentUpload', (req, res) => {
  const { postId, comment } = req.body;
  const data = JSON.parse(fs.readFileSync(boardFilePath, 'utf-8'));
  const post = data.find(p => p.id === Number(postId));

  if (!post) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }

  if (!Array.isArray(post.comments)) post.comments = [];

  const newComment = comment;

  post.comments.push(newComment);
  fs.writeFileSync(boardFilePath, JSON.stringify(data, null, 2));
  res.json({ success: true, post });
});

// 댓글 삭제
app.post('/board/commentDelete', (req, res) => {
  const { postId, commentId } = req.body;
  const data = JSON.parse(fs.readFileSync(boardFilePath, 'utf-8'));
  const post = data.find(p => p.id === Number(postId));

  if (!post || !Array.isArray(post.comments)) {
    return res.status(404).json({ success: false, message: '댓글 또는 게시글 없음' });
  }

  post.comments = post.comments.filter(c => c.id !== Number(commentId));
  fs.writeFileSync(boardFilePath, JSON.stringify(data, null, 2));
  res.json({ success: true, post });
});

// 게시글 삭제
app.delete('/app/board/:id', (req, res) => {
  const postId = Number(req.params.id);
  const data = JSON.parse(fs.readFileSync(boardFilePath, 'utf-8'));
  const index = data.findIndex(post => post.id === postId);

  if (index === -1) return res.status(404).json({ success: false, message: '게시글 없음' });

  data.splice(index, 1);
  fs.writeFileSync(boardFilePath, JSON.stringify(data, null, 2));
  res.json({ success: true, message: '삭제 완료' });
});
//----------------------------------------------To do list---------------------------------------------------
//--------------------------------------------------------------------------------------------------------------
//json에서 메모 내용 가져오기기
app.get("/schedule", (req, res) => {
  const user = req.query.user;
  const filePath = path.join(__dirname, "json", "schedule.json");

  if (!user) return res.status(400).send("Missing user");

  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) return res.status(500).send("파일 읽기 실패");

    let schedules = {};
    try {
      schedules = JSON.parse(data);
    } catch (e) {
      return res.status(500).send("JSON 파싱 실패");
    }

    const userEvents = schedules[user] || {}; // 해당 유저 없으면 빈 객체
    res.json(userEvents);
  });
});
//json에 변경된 내용 저장
app.post("/schedule/save", (req, res) => {
  const { user, date, schedule } = req.body;

  if (!user || !date || typeof schedule !== "object") {
    return res.status(400).send("필수 항목 누락");
  }

  const path = "./json/schedule.json";

  let data = {};
  try {
    if (fs.existsSync(path)) {
      data = JSON.parse(fs.readFileSync(path, "utf-8"));
    }
  } catch (err) {
    console.error("파일 읽기 오류:", err);
    return res.status(500).send("서버 파일 오류");
  }

  if (!data[user]) data[user] = {};
  data[user][date] = schedule;

  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    res.send("일정 저장 완료");
  } catch (err) {
    console.error("파일 쓰기 오류:", err);
    res.status(500).send("파일 저장 실패");
  }
});
//----------------------------------------------즐겨찾기----------------------------------------
// 즐겨찾기 추가
app.post('/favorite/add', (req, res) => {
  const username = req.session.username;
  const { storeName } = req.body;

  if (!username || !storeName) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  const users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'));

  if (!Array.isArray(users[username].favorites)) {
    users[username].favorites = [];
  }

  if (users[username].favorites.includes(storeName)) {
    return res.json({ success: false, error: `'${storeName}'은(는) 이미 등록된 즐겨찾기입니다.` });
  }

  users[username].favorites.push(storeName);

  fs.writeFileSync('./users.json', JSON.stringify(users, null, 2), 'utf-8');
  res.json({ success: true, message: `'${storeName}' 즐겨찾기에 추가됨` });
});

//즐겨찾기 읽어오기 
app.get('/favorite/list', (req, res) => {
  const username = req.session.username;

  if (!username) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const usersPath = path.join(__dirname, 'users.json');
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));

  const userData = users[username];
  if (!userData || !Array.isArray(userData.favorites)) {
    return res.json({ favorites: [] });
  }

  res.json(userData.favorites);
});


// 즐겨찾기 삭제 API
app.post('/favorite/delete', (req, res) => {
  const username = req.session.username;
  const { storeName } = req.body;
  const USERS_JSON_PATH = path.join(__dirname, 'users.json');

  if (!username) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  if (!storeName) {
    return res.status(400).json({ success: false, error: '삭제할 음식점 이름이 필요합니다.' });
  }

  fs.readFile(USERS_JSON_PATH, 'utf-8', (err, data) => {
    if (err) {
      console.error('users.json 읽기 오류:', err);
      return res.status(500).json({ success: false, error: '서버 내부 오류' });
    }

    let users;
    try {
      users = JSON.parse(data);
    } catch (parseError) {
      console.error('users.json 파싱 오류:', parseError);
      return res.status(500).json({ success: false, error: '데이터 형식 오류' });
    }

    if (!users[username] || !Array.isArray(users[username].favorites)) {
      return res.status(404).json({ success: false, error: '즐겨찾기 정보 없음' });
    }

    const index = users[username].favorites.indexOf(storeName);
    if (index === -1) {
      return res.status(404).json({ success: false, error: '즐겨찾기 목록에 해당 음식점이 없습니다.' });
    }

    // 배열에서 제거
    users[username].favorites.splice(index, 1);

    fs.writeFile(USERS_JSON_PATH, JSON.stringify(users, null, 2), err => {
      if (err) {
        console.error('users.json 저장 오류:', err);
        return res.status(500).json({ success: false, error: '즐겨찾기 삭제 후 저장 실패' });
      }

      res.json({ success: true, message: '즐겨찾기에서 삭제되었습니다.' });
    });
  });
});
//--------------------------------공지사항----------------------------
app.get('/api/alerts', (req, res) => {
  fs.readFile(alertFile, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '공지사항 파일 읽기 실패' });

    try {
      const alerts = JSON.parse(data);
      res.json(alerts);
    } catch (e) {
      res.status(500).json({ error: 'JSON 파싱 실패' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
