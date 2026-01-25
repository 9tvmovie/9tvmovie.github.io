const form = document.getElementById("aiForm");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModal");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  modalContent.innerHTML = "⏳ Generating...";
  modal.classList.remove("hidden");

  const payload = {
    platform: document.getElementById("platform").value,
    title: document.getElementById("title").value,
    media_type: document.getElementById("media_type").value,
    genres: document.getElementById("genres").value.split(",").map(g => g.trim()),
    rating: parseFloat(document.getElementById("rating").value),
    year: parseInt(document.getElementById("year").value),
    overview: document.getElementById("overview").value,
    style: document.getElementById("style").value
  };

  try {
    const res = await fetch("http://127.0.0.1:8000/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    modalContent.innerHTML = `
      <h3>${data.title}</h3>
      <p>${data.description}</p>
      <p><b>Hashtag:</b><br>${data.hashtags.join(" ")}</p>
    `;
  } catch (err) {
    modalContent.innerHTML = "❌ Gagal generate konten";
  }
});

closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});
