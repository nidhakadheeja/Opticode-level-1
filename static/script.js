async function optimizeCode() {
    const inputCode = document.getElementById("inputCode").value;
    const outputCode = document.getElementById("outputCode");
    const explanationList = document.getElementById("explanationList");

    // Clear previous output
    outputCode.value = "";
    explanationList.innerHTML = "";

    if (!inputCode.trim()) {
        alert("Please enter some Python code!");
        return;
    }

    try {
        const response = await fetch("/optimize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code: inputCode })
        });

        const data = await response.json();

        if (data.error) {
            outputCode.value = "Error: " + data.error;
            explanationList.innerHTML = "<li>Optimization failed.</li>";
            return;
        }

        // Show optimized code
        outputCode.value = data.optimized_code;

        // Show explanations
        if (data.explanations.length === 0) {
            explanationList.innerHTML = "<li>No optimizations were required.</li>";
        } else {
            data.explanations.forEach(exp => {
                const li = document.createElement("li");
                li.textContent = exp;
                explanationList.appendChild(li);
            });
        }

    } catch (error) {
        outputCode.value = "Server error!";
        explanationList.innerHTML = "<li>Could not connect to server.</li>";
    }
}
