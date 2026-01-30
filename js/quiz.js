// quiz.js - Frontend-only quiz logic
(() => {
  // --- Data: questions array (category, difficulty) ---
  const QUESTIONS = [
    {id:1,category:'General',difficulty:'easy',q:'What is the capital of France?',options:['Berlin','Madrid','Paris','Lisbon'],answer:2},
    {id:2,category:'Science',difficulty:'medium',q:'What planet is known as the Red Planet?',options:['Earth','Mars','Jupiter','Venus'],answer:1},
    {id:3,category:'Math',difficulty:'hard',q:'What is the derivative of sin(x)?',options:['cos(x)','-cos(x)','sin(x)','-sin(x)'],answer:0},
    {id:4,category:'Science',difficulty:'easy',q:'Water freezes at what temperature (°C)?',options:['0','100','-1','32'],answer:0},
    {id:5,category:'General',difficulty:'medium',q:'Which language runs in a web browser?',options:['Python','C++','JavaScript','Java'],answer:2},
    {id:6,category:'Math',difficulty:'medium',q:'What is 12 * 8?',options:['96','86','108','92'],answer:0},
    {id:7,category:'History',difficulty:'hard',q:'Who was the first emperor of Rome?',options:['Julius Caesar','Augustus','Nero','Tiberius'],answer:1},
    {id:8,category:'General',difficulty:'easy',q:'Which color is a mix of red and white?',options:['Pink','Purple','Orange','Brown'],answer:0},
    {id:9,category:'Science',difficulty:'hard',q:'What is the chemical symbol for Gold?',options:['Au','Ag','Gd','Go'],answer:0},
    {id:10,category:'History',difficulty:'medium',q:'In which year did World War II end?',options:['1945','1939','1918','1963'],answer:0}
  ];

  // --- DOM references ---
  const categorySelect = document.getElementById('categorySelect');
  const difficultySelect = document.getElementById('difficultySelect');
  const numQuestionsInput = document.getElementById('numQuestions');
  const startBtn = document.getElementById('startBtn');

  const setupSection = document.getElementById('setup');
  const quizSection = document.getElementById('quiz');
  const resultsSection = document.getElementById('results');

  const questionText = document.getElementById('questionText');
  const optionsList = document.getElementById('optionsList');
  const currentIndexEl = document.getElementById('currentIndex');
  const totalQEl = document.getElementById('totalQ');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  const timerText = document.getElementById('timerText');
  const timerCircle = document.getElementById('timerCircle');

  const resTotal = document.getElementById('resTotal');
  const resCorrect = document.getElementById('resCorrect');
  const resIncorrect = document.getElementById('resIncorrect');
  const resPercent = document.getElementById('resPercent');
  const resTime = document.getElementById('resTime');
  const detailTableBody = document.querySelector('#detailTable tbody');

  // Charts
  let pieChart=null, barChart=null;

  // --- State ---
  let pool = []; // filtered questions
  let quiz = []; // selected for this run
  let answers = []; // {qid,selected,correct,timeSpent}
  let current = 0;
  let perQuestionTime = 15; // seconds default
  let timerInterval = null;
  let remaining = perQuestionTime;
  let questionStartTs = 0;

  // --- Init categories in select ---
  function initCategories(){
    const cats = Array.from(new Set(QUESTIONS.map(q=>q.category)));
    cats.forEach(c=>{
      const opt = document.createElement('option'); opt.value=c; opt.textContent=c; categorySelect.appendChild(opt);
    });
  }

  function shuffle(a){
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }

  function startQuiz(){
    // prepare pool based on category/difficulty
    const cat = categorySelect.value;
    const diff = difficultySelect.value;
    const n = Math.max(3,Math.min(20,parseInt(numQuestionsInput.value)||8));

    pool = QUESTIONS.filter(q=> (cat==='all' || q.category===cat) && (diff? q.difficulty===diff : true));
    if(pool.length===0){alert('No questions match selection.');return}

    quiz = shuffle(pool.slice()).slice(0,n);
    answers = quiz.map(q=>({qid:q.id, selected:null, correct:q.answer, time:0}));
    current = 0;
    perQuestionTime = diff==='easy'?20:diff==='hard'?10:15;
    totalQEl.textContent = quiz.length;
    setupSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    renderQuestion();
    startTimer();
  }

  function renderQuestion(){
    const q = quiz[current];
    currentIndexEl.textContent = current+1;
    questionText.textContent = q.q;
    optionsList.innerHTML='';
    q.options.forEach((opt,i)=>{
      const li = document.createElement('li');
      li.tabIndex=0;
      li.dataset.index = i;
      li.innerHTML = `<span class="option-label">${String.fromCharCode(65+i)}</span> ${opt}`;
      if(answers[current].selected===i) li.classList.add('selected');
      li.addEventListener('click', ()=>{ selectOption(i); });
      li.addEventListener('keydown', (e)=>{ if(e.key==='Enter') selectOption(i); });
      optionsList.appendChild(li);
    });
    // set remaining timer based on saved time if any
    remaining = perQuestionTime - Math.floor(answers[current].time || 0);
    if(remaining<=0) remaining=0;
    updateTimerDisplay();
    questionStartTs = Date.now();
  }

  function selectOption(idx){
    answers[current].selected = idx;
    // visual
    Array.from(optionsList.children).forEach(li=>li.classList.remove('selected'));
    const chosen = Array.from(optionsList.children).find(li=>parseInt(li.dataset.index)===idx);
    if(chosen) chosen.classList.add('selected');
  }

  function changeQuestion(delta){
    saveTimeForCurrent();
    current = Math.max(0, Math.min(quiz.length-1, current+delta));
    renderQuestion();
    resetTimer();
  }

  function saveTimeForCurrent(){
    const elapsed = Math.floor((Date.now()-questionStartTs)/1000);
    answers[current].time += elapsed;
  }

  function startTimer(){
    clearInterval(timerInterval);
    remaining = perQuestionTime - Math.floor(answers[current].time || 0);
    if(remaining<=0) remaining=0;
    updateTimerDisplay();
    timerInterval = setInterval(()=>{
      remaining--;
      updateTimerDisplay();
      if(remaining<=0){
        // auto move to next or finish
        saveTimeForCurrent();
        if(current < quiz.length-1){ current++; renderQuestion(); resetTimer(); }
        else { finishQuiz(); }
      }
    },1000);
  }

  function resetTimer(){
    clearInterval(timerInterval);
    questionStartTs = Date.now();
    remaining = perQuestionTime - Math.floor(answers[current].time || 0);
    if(remaining<=0) remaining=0;
    startTimer();
  }

  function updateTimerDisplay(){
    const mm = String(Math.floor(remaining/60)).padStart(2,'0');
    const ss = String(remaining%60).padStart(2,'0');
    timerText.textContent = `${mm}:${ss}`;
    // progress circle
    const pct = Math.max(0, Math.min(100, (remaining / perQuestionTime) * 100));
    const dash = `${pct}, 100`;
    timerCircle.setAttribute('stroke-dasharray', dash);
  }

  function finishQuiz(){
    clearInterval(timerInterval);
    // ensure last time saved
    saveTimeForCurrent();
    // compute results
    const total = quiz.length;
    let correct=0, wrong=0, totTime=0;
    const labels=[]; const times=[];
    detailTableBody.innerHTML='';
    answers.forEach((a,idx)=>{
      const q = quiz[idx];
      const isCorrect = a.selected===a.correct;
      if(isCorrect) correct++; else wrong++;
      totTime += a.time;
      labels.push(`#${idx+1}`);
      times.push(Math.max(1,a.time));
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td><td>${q.q}</td><td>${a.selected==null?'-':q.options[a.selected]}</td><td>${q.options[a.correct]}</td><td>${a.time}s</td>`;
      detailTableBody.appendChild(tr);
    });

    resTotal.textContent = total;
    resCorrect.textContent = correct;
    resIncorrect.textContent = wrong;
    resPercent.textContent = `${Math.round((correct/total)*100)}%`;
    resTime.textContent = `${totTime}s`;

    // draw charts
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if(pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type:'doughnut', data:{labels:['Correct','Incorrect'],datasets:[{data:[correct,wrong],backgroundColor:['#34d399','#fb7185']}]}, options:{responsive:true}
    });

    const barCtx = document.getElementById('barChart').getContext('2d');
    if(barChart) barChart.destroy();
    barChart = new Chart(barCtx,{type:'bar',data:{labels:labels,datasets:[{label:'Time (s)',data:times,backgroundColor:'#60a5fa'}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});

    quizSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
  }

  // Event wiring
  startBtn.addEventListener('click', startQuiz);
  prevBtn.addEventListener('click', ()=>{ if(current>0){ changeQuestion(-1); } });
  nextBtn.addEventListener('click', ()=>{ if(current<quiz.length-1){ changeQuestion(1); } });
  submitBtn.addEventListener('click', ()=>{ if(confirm('Submit quiz now?')) finishQuiz(); });
  document.getElementById('retakeBtn').addEventListener('click', ()=>{ setupSection.classList.remove('hidden'); resultsSection.classList.add('hidden'); });

  // expose some utilities for debugging
  window.__QUIZ = {QUESTIONS};
  initCategories();
})();
