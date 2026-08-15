const dateInput = document.getElementById("date");
const today = new Date();
const isoToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10);
dateInput.min = isoToday;

document.getElementById("swap").addEventListener("click", () => {
  const from = document.getElementById("from");
  const to = document.getElementById("to");
  [from.value, to.value] = [to.value, from.value];
});

document.querySelectorAll(".route-card").forEach(card => {
  card.addEventListener("click", () => {
    document.getElementById("from").value = card.dataset.from;
    document.getElementById("to").value = card.dataset.to;
    document.getElementById("booking").scrollIntoView({behavior:"smooth"});
    document.getElementById("date").focus();
  });
});

document.getElementById("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const date = document.getElementById("date").value;
  if (from === to) {
    alert("Origin and destination cannot be the same.");
    return;
  }
  alert(`Demo search: ${from} → ${to} on ${date}. Real bus results will be connected in the next stage.`);
});
