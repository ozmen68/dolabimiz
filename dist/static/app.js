const app = {
    state: {
        gender: null,
        category: 'all'
    },

    init: () => {
        console.log('App initialized (Firebase)');
        app.getWeather();
    },

    getWeather: async () => {
        const widget = document.getElementById('weather-widget');
        try {
            // Default to Istanbul for simplicity if Geo fails or permissions denied
            // Using Open-Meteo free API
            const response = await fetch('https://api.open-meteos.com/v1/forecast?latitude=41.0082&longitude=28.9784&current_weather=true');
            const data = await response.json();
            const temp = Math.round(data.current_weather.temperature);

            let icon = '☀️';
            const code = data.current_weather.weathercode;
            if (code > 3) icon = '☁️';
            if (code > 50) icon = 'Vm^';
            if (code > 70) icon = '❄️';

            widget.innerHTML = `${icon} ${temp}°C <br><span style="font-size:0.7em">İstanbul</span>`;
        } catch (e) {
            console.error('Weather error:', e);
            widget.innerHTML = '<span style="font-size:0.8rem">Hava alınamadı</span>';
        }
    },

    selectGender: (gender) => {
        app.state.gender = gender;
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

        // Personalization
        const name = gender === 'men' ? 'Mustafa' : 'Dudu';
        document.getElementById('page-title').innerText = name + "'nın Dolabı";

        // Reset category and load items
        app.filterCategory('all', document.querySelector('.cat-chip'));
    },

    goBack: () => {
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('landing-page').classList.remove('hidden');
        app.state.gender = null;
    },

    filterCategory: (category, element) => {
        app.state.category = category;

        // Update UI
        document.querySelectorAll('.cat-chip').forEach(el => el.classList.remove('active'));
        if (element) element.classList.add('active');

        app.fetchItems();
    },

    fetchItems: async () => {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '<div class="flex-center" style="width:100%; height:200px; color:var(--text-muted)">Yükleniyor...</div>';

        try {
            // Firestore Query
            let query = db.collection('items').where('gender', '==', app.state.gender);

            if (app.state.category !== 'all') {
                query = query.where('category', '==', app.state.category);
            }

            // Order by created_at desc
            query = query.orderBy('created_at', 'desc');

            const snapshot = await query.get();
            grid.innerHTML = '';

            if (snapshot.empty) {
                grid.innerHTML = '<div class="flex-center" style="grid-column: 1/-1; height:200px; color:var(--text-muted)">Henüz kıyafet eklenmemiş.</div>';
                return;
            }

            snapshot.forEach(doc => {
                const item = doc.data();
                const card = document.createElement('div');
                card.className = 'item-card';

                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.loading = 'lazy';

                card.appendChild(img);
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Error fetching items:', error);
            grid.innerHTML = `<div class="flex-center" style="color:red">Hata: ${error.message}</div>`;
        }
    },

    openAddModal: () => {
        document.getElementById('add-modal').classList.remove('hidden');
    },

    closeAddModal: () => {
        document.getElementById('add-modal').classList.add('hidden');
        document.getElementById('add-form').reset();
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('image-preview').src = '';
    },

    previewImage: (input) => {
        const preview = document.getElementById('image-preview');
        if (input.files && input.files[0]) {
            app.compressImage(input.files[0]).then(base64 => {
                preview.src = base64;
                preview.style.display = 'block';
            });
        }
    },

    compressImage: (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Max dimension 600px (Reduced from 800px for stability)
                    const MAX_SIZE = 600;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.5 quality (Aggressive compression)
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                };
            };
        });
    },

    submitItem: async (event) => {
        event.preventDefault();

        const form = document.getElementById('add-form');
        const fileInput = form.querySelector('input[name="image"]');
        const categoryInput = form.querySelector('select[name="category"]');

        const file = fileInput.files[0];
        const category = categoryInput.value;
        const gender = app.state.gender;

        if (!file) return;

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Yükleniyor...';
        btn.disabled = true;

        try {
            // New Method: Resize & Compress to Base64
            // This avoids using Firebase Storage (which requires billing)
            const base64Image = await app.compressImage(file);

            // Check size (approximate)
            if (base64Image.length > 900000) {
                throw new Error("Fotoğraf çok büyük, küçültülemedi.");
            }

            // Save directly to Firestore
            await db.collection('items').add({
                gender: gender,
                category: category,
                imageUrl: base64Image, // Storing image string directly in DB
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            app.closeAddModal();
            app.fetchItems();

        } catch (error) {
            console.error('Error adding item:', error);
            alert('Hata: ' + error.message + '\nİnterneti kontrol edin veya başka fotoğraf deneyin.');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
};

// Initialize
app.init();
