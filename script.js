const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const statusButton = document.getElementById("statusButton");
const protocolMessage = document.getElementById("protocolMessage");
const securityStatus = document.getElementById("securityStatus");

menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

statusButton.addEventListener("click", () => {
  const protocol = window.location.protocol;

  if (protocol === "https:") {
    securityStatus.textContent = "HTTPS Enabled";
    protocolMessage.textContent =
      "This website is currently using HTTPS, which encrypts communication between client and server.";
  } else {
    securityStatus.textContent = "HTTP Detected";
    protocolMessage.textContent =
      "This website is currently using HTTP. HTTPS is recommended for secure communication.";
  }
});