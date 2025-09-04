async function loadChallenges(){
  const res = await fetch("/api/challenges");
  const data = await res.json();
  const container = document.getElementById("challenges");
  container.innerHTML = "";
  data.forEach(c=>{
    const div = document.createElement("div");
    div.className = "challenge-card";
    div.innerHTML = `
      <strong>${c.name}</strong><br>
      <a href="${c.link}" target="_blank">Link Map</a><br>
      <p>${c.desc||""}</p>
      <button onclick="vote(${c.id})">👍 ${c.votes}</button>
    `;
    container.appendChild(div);
  });
}

async function addChallenge(){
  const name = document.getElementById("playerName").value.trim();
  const link = document.getElementById("mapLink").value.trim();
  const desc = document.getElementById("challengeDesc").value.trim();
  if(!name || !link) return alert("Tên và link map không được bỏ trống!");

  await fetch("/api/challenges", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name, link, desc})
  });
  document.getElementById("playerName").value="";
  document.getElementById("mapLink").value="";
  document.getElementById("challengeDesc").value="";
  loadChallenges();
}

async function vote(id){
  await fetch(`/api/challenges/${id}/vote`, {method:"POST"});
  loadChallenges();
}

document.getElementById("submitBtn").addEventListener("click", addChallenge);
loadChallenges();
