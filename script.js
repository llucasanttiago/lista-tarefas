let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function saveTasks(){
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function renderTasks(){

  const list = document.getElementById("taskList");
  list.innerHTML = "";

  tasks.forEach((task,index)=>{

    const li = document.createElement("li");

    if(task.completed){
      li.classList.add("completed");
    }

    li.innerHTML = `
      <span>${task.text}</span>

      <div>
        <button class="check-btn ${task.completed ? 'done' : ''}" onclick="toggleTask(${index})">✔</button>

        <button class="delete-btn" onclick="deleteTask(${index})">🗑</button>
      </div>
    `;

    list.appendChild(li);

  });

  updateProgress();
}

function addTask(){

  const input = document.getElementById("taskInput");

  if(input.value.trim() === "") return;

  tasks.push({
    text:input.value,
    completed:false
  });

  input.value = "";

  saveTasks();
  renderTasks();
}

function toggleTask(index){

  tasks[index].completed = !tasks[index].completed;

  if(tasks[index].completed){

    confetti({
      particleCount:100,
      spread:70,
      origin:{ y:0.6 }
    });

  }

  saveTasks();
  renderTasks();
}

function deleteTask(index){
  tasks.splice(index,1);

  saveTasks();
  renderTasks();
}

function updateProgress(){

  const completed = tasks.filter(task => task.completed).length;

  const total = tasks.length;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("progressBar").style.width = percent + "%";

  document.getElementById("progressText").innerText = `${percent}% concluído`;
}

renderTasks();