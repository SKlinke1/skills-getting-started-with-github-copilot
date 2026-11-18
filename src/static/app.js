document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(email, activityName) {
    const participant = document.createElement("li");
    participant.className = "participant-item";

    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-participant-button";
    deleteButton.type = "button";
    deleteButton.dataset.action = "unregister";
    deleteButton.dataset.activityName = activityName;
    deleteButton.dataset.email = email;
    deleteButton.setAttribute("aria-label", `Unregister ${email} from ${activityName}`);
    deleteButton.title = "Unregister participant";
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </svg>
    `;

    participant.append(participantEmail, deleteButton);
    return participant;
  }

  function updateActivityCard(activityCard) {
    const participantList = activityCard.querySelector(".participant-list");
    const participants = participantList.querySelectorAll(".participant-item");
    const participantCount = participants.length;

    activityCard.querySelector(".participant-count").textContent = participantCount;
    activityCard.querySelector(".activity-availability").textContent =
      `${Number(activityCard.dataset.maxParticipants) - participantCount} spots left`;

    if (participantCount === 0) {
      if (!participantList.querySelector(".empty-participant-list")) {
        const emptyMessage = document.createElement("li");
        emptyMessage.className = "empty-participant-list";
        emptyMessage.textContent = "No participants yet";
        participantList.appendChild(emptyMessage);
      }
    } else {
      participantList.querySelector(".empty-participant-list")?.remove();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="activity-availability">${spotsLeft} spots left</span></p>
          <div class="participants-section">
            <div class="participants-heading">
              <h5>Participants</h5>
              <span class="participant-count">${details.participants.length}</span>
            </div>
            <ul class="participant-list"></ul>
          </div>
        `;

        const participantList = activityCard.querySelector(".participant-list");
        details.participants.forEach((email) => {
          participantList.appendChild(createParticipantItem(email, name));
        });
        updateActivityCard(activityCard);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        const activityCard = [...activitiesList.children].find(
          (card) => card.dataset.activityName === activity
        );
        if (activityCard) {
          const participantList = activityCard.querySelector(".participant-list");
          participantList.querySelector(".empty-participant-list")?.remove();
          participantList.appendChild(createParticipantItem(email, activity));
          updateActivityCard(activityCard);
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".delete-participant-button");
    if (!deleteButton) {
      return;
    }

    const { activityName, email } = deleteButton.dataset;
    deleteButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to unregister participant");
      }

      const activityCard = deleteButton.closest(".activity-card");
      deleteButton.closest(".participant-item").remove();
      updateActivityCard(activityCard);

      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
    } catch (error) {
      messageDiv.textContent = error.message || "Failed to unregister participant";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    }

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
    deleteButton.disabled = false;
  });

  // Initialize app
  fetchActivities();
});
