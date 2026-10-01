document.getElementById('back-button').onclick = () => {
      window.location.href = '/html/pages/board.html';
    };
function pushCommentToJson(postId, newComment) {
  // 현재 게시글 데이터를 전역적으로 저장했다는 가정
  fetch('/app/board')
    .then(res => res.json())
    .then(posts => {
      const post = posts.find(p => p.id == postId);
      if (!post) {
        console.error("게시글을 찾을 수 없습니다.");
        return;
      }

      // 댓글 배열이 없으면 초기화
      if (!post.comments) {
        post.comments = [];
      }

      // 댓글 추가
      post.comments.push({
        id: newComment.id,
        writer: newComment.author,
        content: newComment.comment,
        createdAt: newComment.timeStamp
      });

      // 로컬에서 처리한다면 서버로 저장은 하지 않고 바로 render만 가능
      renderComments(post.comments);
    })
    .catch(err => {
      console.error('댓글 추가 중 오류 발생:', err);
    });
}

//유저 정보 요청 함수 
async function getUserInfo() {
  try {
    const response = await fetch('/user-info');
    const data = await response.json();

    if (data.loggedIn) {
      console.log("로그인한 사용자:", data.username);
      return data.username;
    } else {
      console.log("로그인하지 않았습니다.");
      return null;
    }
  } catch (error) {
    console.error("사용자 정보를 불러오는 중 오류 발생:", error);
    return null;
  }
}
//유저 닉네임 가져오기
async function getNicknameInfo() {
  try {
    const response = await fetch('/user-info');
    const data = await response.json();

    if (data.loggedIn) {
      console.log("닉네임:", data.nickname);
      return data.nickname;
    } else {
      console.log("로그인하지 않았습니다.");
      return null;
    }
  } catch (error) {
    console.error("닉네임 정보를 불러오는 중 오류 발생:", error);
    return null;
  }
}
//1.url 추출
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');
console.log('포스트아이디',postId);
//2.서버에 게시글 요청하기
fetch('/app/board')
  .then(res => res.json())
  .then(posts => {
    const post = posts.find(p => p.id == postId);
    if (!post) {
      alert('게시글을 찾을 수 없습니다.');
      return;
    }

    // HTML에 반영
    document.getElementById('title').textContent = post.title;
    document.getElementById('author').textContent = post.author;
    document.getElementById('date').textContent = post.createdAt;
    document.getElementById('content').textContent = post.content;

    // 이후 댓글 처리도 이 안에서 가능
    renderComments(post.comments || []);
  })
  .catch(err => {
    console.error('게시글 로딩 실패:', err);
  });

  //3.서버에서 받은 값으로 댓글 작성하기 
async function renderComments(comments) {
  const container = document.getElementById('comments-list');
  container.innerHTML = '';

  const currentUser = await getUserInfo();

  if (comments.length === 0) {
    container.innerHTML = '<p>댓글이 없습니다.</p>';
    return;
  }

  comments.forEach(c => {
    const wrapper = document.createElement('div');
    wrapper.style.border = '1px solid #ccc';
    wrapper.style.borderRadius = '5px';
    wrapper.style.padding = '8px';
    wrapper.style.marginBottom = '8px';
    wrapper.style.position = 'relative'; // 버튼 위치 고정할 수 있도록

    // 댓글 내용
    const contentHTML = `
      <strong>${c.author}</strong> (${c.timeStamp}):<br>
      ${c.comment}
    `;
    wrapper.innerHTML = contentHTML;

    // 본인 댓글일 때만 삭제 버튼
    if (currentUser === c.realname) {
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '삭제';
      deleteBtn.style.position = 'absolute';
      deleteBtn.style.top = '8px';
      deleteBtn.style.right = '8px';
      deleteBtn.style.backgroundColor = '#ff4d4d';
      deleteBtn.style.color = 'white';
      deleteBtn.style.border = 'none';
      deleteBtn.style.padding = '4px 8px';
      deleteBtn.style.borderRadius = '4px';
      deleteBtn.style.cursor = 'pointer';

      deleteBtn.onclick = () => {
        const confirmDelete = confirm('댓글을 삭제하시겠습니까?');
        if (confirmDelete) {
          deleteComment(postId, c.id);
        }
      };

      wrapper.appendChild(deleteBtn);
    }

    container.appendChild(wrapper);
  });
}

//글 삭제하기
function deleteComment(postId, commentId) {
  fetch('/board/commentDelete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ postId, commentId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        renderComments(data.post.comments); // 갱신된 댓글 다시 렌더링
      } else {
        alert('댓글 삭제 실패');
      }
    })
    .catch(err => {
      console.error('댓글 삭제 중 오류 발생:', err);
    });
}

// ------------------------------------------------------------글 내용 불러오기 ----------------------------------------------------------
//------------------------------------------------------------- 댓글  작성하기 ----------------------------------------------------------
document.getElementById('comment-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const textArea = document.getElementById("comment").value;
  const content = textArea.trim();
  document.getElementById("comment").value = "";

  if (!content) {
    alert('댓글을 입력해주세요!');
    return;
  }

  const id = new Date().getTime();
  const nickname = await getNicknameInfo();
  if (!nickname) {
    alert("로그인 후 댓글을 작성해주세요.");
    return;
  }

  if (!postId) {
    alert("잘못된 접근입니다. 게시글 ID가 없습니다.");
    return;
  }

  const timestamp = new Date().toISOString();
  const realname = await getUserInfo();

  const newComment = {
    id: id,
    author: nickname,
    realname: realname,
    comment: content,
    timeStamp: timestamp
  };

  fetch('/board/commentUpload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      postId: postId,
      comment: newComment
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        renderComments(data.post.comments);
      } else {
        alert('댓글 추가에 실패했습니다.');
      }
    })
    .catch(err => {
      console.error('댓글 전송 중 오류:', err);
    });
});
