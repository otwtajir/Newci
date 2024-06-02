document.addEventListener("DOMContentLoaded", function() {
    const statusButtons = document.querySelectorAll(".status-btn");

    statusButtons.forEach(button => {
        button.addEventListener("click", function() {
            const id = button.getAttribute("data-id");
            let status = button.getAttribute("data-status");

            // Toggle status
            status = status === "Tersedia" ? "Digunakan" : "Tersedia";

            // Send AJAX request to update status in the database
            fetch("/update-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ id, status })
            }).then(response => {
                if (response.ok) {
                    // Update button attributes and styles
                    button.setAttribute("data-status", status);
                    button.textContent = status;
                    button.style.backgroundColor = status === "Tersedia" ? "#4CAF50" : "#f44336";
                } else {
                    console.error("Failed to update status");
                }
            }).catch(error => {
                console.error("Error:", error);
            });
        });
    });
});
