let totalCaloriesGained = 0;
let totalCaloriesBurned = 0;

const NUTRITIONIX_APP_ID = '54df6a3b';
const NUTRITIONIX_API_KEY = 'b96e7096a95d174419a93f947c85f1ef';
const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyBRGdHX23RW7cHc3Fx0QGVrx15az8Nyvto';
const API_BASE = '';


function togglePopup(popupId) {
    const popup = document.getElementById(popupId);
    popup.style.display = popup.style.display === "block" ? "none" : "block";
}


function togglePopup(popupId) {
    const popup = document.getElementById(popupId);
    popup.style.display = popup.style.display === "block" ? "none" : "block";
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch(`${API_BASE}/api/login`, {
        method: 'POST',
    	credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Login successful!');
            localStorage.setItem('userId', data.userId);
			localStorage.setItem('username', username);
            updateAuthUI();
            togglePopup('loginPopup');
        } else {
            alert('Login failed: ' + data.message);
        }
    })
    .catch(error => console.error('Error during login:', error));
}

function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    updateAuthUI();
    togglePopup('userPopup');
}

function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const usernameButton = document.getElementById('usernameButton');

    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (userId) {
        authButtons.classList.add('hidden');
        userInfo.classList.remove('hidden');
        usernameButton.innerText ='Settings';
    } else {
        authButtons.classList.remove('hidden');
        userInfo.classList.add('hidden');    
    }
}



// Run updateAuthUI when page loads
document.addEventListener("DOMContentLoaded", updateAuthUI);

function addFood() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please log in first.');
        return;
    }

    const foodName = document.getElementById('foodName').value;
    const foodCalories = parseInt(document.getElementById('foodCalories').value, 10);

    if (!foodName || isNaN(foodCalories) || foodCalories <= 0) {
        alert('Enter a valid food name and calorie value.');
        return;
    }

    fetch(`${API_BASE}/api/addFood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, foodName, foodCalories })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Food added successfully!');
            const foodList = document.getElementById('foodList');
            const listItem = document.createElement('li');
            listItem.textContent = `${foodName}: ${foodCalories} calories`;
            foodList.appendChild(listItem);
            document.getElementById('foodName').value = '';
            document.getElementById('foodCalories').value = '';
            fetchNetCalories();
        } else {
            alert('Error adding food: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}


function addWorkout() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please log in first.');
        return;
    }

    const workoutName = document.getElementById('workoutName').value;
    const workoutCalories = parseInt(document.getElementById('workoutCalories').value, 10);

    if (!workoutName || isNaN(workoutCalories) || workoutCalories <= 0) {
        alert('Enter a valid workout name and calories burned.');
        return;
    }

    fetch(`${API_BASE}/api/addWorkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workoutName, workoutCalories })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Workout added successfully!');
            const workoutList = document.getElementById('workoutList');
            const listItem = document.createElement('li');
            listItem.textContent = `${workoutName}: ${workoutCalories} calories burned`;
            workoutList.appendChild(listItem);
            document.getElementById('workoutName').value = '';
            document.getElementById('workoutCalories').value = '';
            fetchNetCalories(); // Update net calories after adding workout
        } else {
            alert('Error adding workout: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}




async function getCalories(foodName) {
    if (!foodName) {
        alert('Please enter a food name or take a picture.');
        return;
    }

    const url = "https://trackapi.nutritionix.com/v2/natural/nutrients";
    const headers = {
        'x-app-id': NUTRITIONIX_APP_ID,
        'x-app-key': NUTRITIONIX_API_KEY,
        'Content-Type': 'application/json'
    };

    const data = { "query": foodName };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log("Nutrition API Response:", result);

        if (response.ok && result.foods && result.foods.length > 0) {
            const foodInfo = result.foods[0];

            // Extract extra info
            const name = foodInfo.food_name;
            const calories = Math.round(foodInfo.nf_calories);
            const servingQty = foodInfo.serving_qty;
            const servingUnit = foodInfo.serving_unit;
            const grams = Math.round(foodInfo.serving_weight_grams);

            // Show everything
            document.getElementById('result').innerText =
                `Food: ${name}\nCalories: ${calories}\nServing: ${servingQty} ${servingUnit} (${grams}g)`;

            // Pre-fill hidden form fields if you use them
            document.getElementById('foodName').value = name;
            document.getElementById('foodCalories').value = calories;
        } else {
            document.getElementById('result').innerText = `Error: ${result.message || 'Food not found'}`;
        }
    } catch (error) {
        console.error("Nutrition API Error:", error);
        document.getElementById('result').innerText = `Error: ${error.message}`;
    }
}


function analyzeImage() {
    const input = document.getElementById('imageInput');
    const file = input.files[0];

    if (file) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = function() {
            if (img.width < 300 || img.height < 300) {
                document.getElementById('result').innerText = 'Error: Image is too small. Please use a larger image.';
                return;
            }
            document.getElementById('result').innerText = 'Analyzing image...';
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgData = e.target.result.split(',')[1]; // Extract Base64 content
                if (!imgData) {
                    document.getElementById('result').innerText = "Error: Image conversion failed.";
                    return;
                }
                sendToGoogleVision(imgData);
            };
            reader.readAsDataURL(file);
        };
        img.onerror = function() {
            document.getElementById('result').innerText = 'Error: Unable to load image. Please try a different file.';
        };
    } else {
        document.getElementById('result').innerText = 'Error: No file selected';
    }
}

function sendToGoogleVision(base64Image) {
    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`;

    const requestBody = {
        requests: [
            {
                image: { content: base64Image },
                features: [
                    { type: 'WEB_DETECTION', maxResults: 10 },
                    { type: 'OBJECT_LOCALIZATION' } // optional but useful
                ]
            }
        ]
    };

    fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Google Vision API Response:", data);

        const webLabels = data.responses[0]?.webDetection?.webEntities;

        if (webLabels && webLabels.length > 0) {
            const blacklist = window.blacklist || [];

            const filtered = webLabels
            .map(label => label.description?.toLowerCase())
            .filter(label => label && window.blacklist.includes(label) === false && label.length > 2);
          

            if (filtered.length > 0) {
                const foodName = filtered[0].trim();
                document.getElementById('result').innerText = `Detected food: ${foodName}`;
                getCalories(foodName);
            } else {
                document.getElementById('result').innerText = 'Could not detect a specific food item. Try a clearer image.';
            }
        } else {
            throw new Error("No web labels detected. Try a clearer image.");
        }
    })
    .catch(error => {
        console.error("Google Vision API Error:", error);
        document.getElementById('result').innerText = `Error: ${error.message}`;
    });
}

function register() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    // Send registration request to the server
    fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Registration successful!');
            // Optionally, redirect or clear the form
        } else {
            alert('Registration failed: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error during registration:', error);
        alert('An error occurred. Please try again.');
    });
}

function fetchNetCalories() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`${API_BASE}/api/getNetCalories?userId=${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let netCalories = data.netCalories;
                const calorieText = document.getElementById('calorieText');
                const calorieDisplay = document.getElementById('netCalories');

                const absoluteCalories = Math.abs(netCalories);

                calorieDisplay.innerText = absoluteCalories;

                if (netCalories > 0) {
                    calorieText.innerText = "Calories Gained Today: ";
                    calorieDisplay.style.color = "red";
                } else if (netCalories < 0) {
                    calorieText.innerText = "Calories Lost Today: ";
                    calorieDisplay.style.color = "green";
                } else {
                    calorieText.innerText = "No Calories Gained or Lost Today: ";
                    calorieDisplay.style.color = "black";
                }
            } else {
                console.error('Error fetching net calories:', data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

function loadTodaysFood() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`${API_BASE}/api/getTodaysFood?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
            const foodList = document.getElementById('foodList');
            foodList.innerHTML = '';

            const validItems = data.data.filter(item => item.calories_gained > 0);

            if (validItems.length === 0) {
                foodList.style.display = "none"; // hide list if empty
                return;
            }

            foodList.style.display = "block";
            validItems.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `Food: ${item.calories_gained} calories`;
                foodList.appendChild(li);
            });
        });
}


function loadTodaysWorkouts() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`${API_BASE}/api/getTodaysWorkouts?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
            const workoutList = document.getElementById('workoutList');
            workoutList.innerHTML = '';

            const validItems = data.data.filter(item => item.calories_lost > 0);

            if (validItems.length === 0) {
                workoutList.style.display = "none";
                return;
            }

            workoutList.style.display = "block";
            validItems.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `Workout: ${item.calories_lost} calories burned`;
                workoutList.appendChild(li);
            });
        });
}



function addRecipe() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please log in to save recipes.');
        return;
    }

    const recipeName = document.getElementById('recipeName').value.trim();
    const recipeCalories = parseInt(document.getElementById('recipeCalories').value, 10);

    if (!recipeName || isNaN(recipeCalories) || recipeCalories <= 0) {
        alert('Please enter a valid name and calorie value.');
        return;
    }

    fetch(`${API_BASE}/api/addRecipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, recipeName, calories: recipeCalories })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Recipe saved!');
            document.getElementById('recipeName').value = '';
            document.getElementById('recipeCalories').value = '';
            loadRecipes();
        } else {
            alert('Failed to save recipe.');
        }
    });
}

function loadRecipes() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`${API_BASE}/api/getRecipes?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
            const recipeList = document.getElementById('recipeList');
            recipeList.innerHTML = '';

            data.recipes.forEach(recipe => {
                const container = document.createElement('div');
                container.classList.add('recipe-item');

                const text = document.createElement('span');
                text.textContent = `${recipe.recipe_name} (${recipe.calories_per_person} cal)`;

                const btn = document.createElement('button');
                btn.textContent = 'Add to Today';
                btn.onclick = () => addRecipeToToday(recipe.recipe_name, recipe.calories_per_person);

                container.appendChild(text);
                container.appendChild(btn);
                recipeList.appendChild(container);
            });
        });
}


function addRecipeToToday(recipeName, calories) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please log in.');
        return;
    }

    fetch(`${API_BASE}/api/addFood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, foodName: recipeName, foodCalories: calories })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Recipe added to today\'s calories!');
            fetchNetCalories();
        } else {
            alert('Error adding to daily log.');
        }
    });
}

function loadWeeklyCaloriesChart() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`/api/weeklyCalories?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                const labels = data.data.map(entry => entry.date);
                const gained = data.data.map(entry => entry.gained);
                const lost = data.data.map(entry => entry.lost);

                const ctx = document.getElementById('weeklyChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Calories Gained',
                                data: gained,
                                borderColor: 'red',
                                fill: false,
                                tension: 0.1
                            },
                            {
                                label: 'Calories Burned',
                                data: lost,
                                borderColor: 'green',
                                fill: false,
                                tension: 0.1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: true
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        });
}


function acceptCookies() {
    localStorage.setItem('cookieConsent', 'true');
    document.getElementById('cookieConsent').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('cookieConsent')) {
        document.getElementById('cookieConsent').style.display = 'block';
    }
});


document.addEventListener("DOMContentLoaded", () => {
    fetch(`${API_BASE}/api/session`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data.loggedIn) {
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username || '');
        } else {
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
        }
        updateAuthUI();
        fetchNetCalories();
        loadRecipes();
        loadTodaysFood();
        loadTodaysWorkouts();
     	loadWeeklyCaloriesChart();
    })
    .catch(err => {
        console.error('Error checking session:', err);
        updateAuthUI(); // fallback
    });
});
