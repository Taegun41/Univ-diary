# 대학 다이어리

부산대학교 학생을 위한 다이어리 웹앱입니다.
오늘의 학식과 학사일정을 학교 홈페이지에서 자동으로 모아 보여주고, 개인 일정 관리·게시판·챗봇을 한곳에 모았습니다.

## 주요 기능

- **홈**: 오늘의 학식(금정회관·문창회관·학생회관 등 4곳), 학사일정
- **일정표**: 날짜별 개인 일정 저장
- **게시판**: 글 작성·댓글·본인 글 삭제
- **지도 / 정보** 페이지
- **대학 다이어리 봇**: OpenAI GPT API를 연결한 채팅
- 회원가입·로그인(세션), PC는 왼쪽 메뉴 / 휴대폰은 하단 탭

## 기술 스택

Node.js · Express 5 · express-session · Puppeteer(학식·학사일정 수집) · HTML/CSS/JavaScript · OpenAI API

## 실행 방법

Node.js 20 이상이 필요합니다.

```bash
# 1. 저장소 내려받기
git clone https://github.com/Taegun41/<저장소이름>.git
cd <저장소이름>/diary-server

# 2. 패키지 설치 (Puppeteer가 크롬을 함께 내려받아 몇 분 걸릴 수 있습니다)
npm install

# 3. 챗봇용 API 키 설정 (챗봇을 쓰지 않으면 생략 가능)
#    diary-server 폴더에 .env 파일을 만들고 아래 한 줄을 적습니다
#    OPENAI_API_KEY=본인의_OpenAI_API_키

# 4. 서버 실행
npm start
```

브라우저에서 **http://localhost:3000** 에 접속한 뒤 회원가입 후 이용합니다.

> 서버를 켜면 학교 홈페이지에서 오늘의 학식을 자동으로 수집합니다(인터넷 연결 필요).
> 학사일정을 새로 받으려면 `node schedule-scraper.js`를 실행합니다.

## 폴더 구조

```
diary-server/   Express 서버, 학식·학사일정 수집기, JSON 데이터 저장
public/         화면 (html, css, js, 이미지)
```
