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
        widget.innerHTML = '<span style="font-size:0.7em">Hava yükleniyor...</span>';

        // Try geolocation first, but with timeout
        if (navigator.geolocation) {
            const timeoutId = setTimeout(() => {
                // Fallback to Istanbul if permission takes too long
                app.fetchWeatherForLocation(41.0082, 28.9784, 'İstanbul');
            }, 3000);

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    clearTimeout(timeoutId);
                    app.fetchWeatherForLocation(position.coords.latitude, position.coords.longitude, 'Konumunuz');
                },
                (err) => {
                    clearTimeout(timeoutId);
                    console.error('Geolocation error:', err);
                    app.fetchWeatherForLocation(41.0082, 28.9784, 'İstanbul');
                }
            );
        } else {
            app.fetchWeatherForLocation(41.0082, 28.9784, 'İstanbul');
        }
    },

    fetchWeatherForLocation: async (lat, lon, locationName) => {
        const widget = document.getElementById('weather-widget');
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            const temp = Math.round(data.current_weather.temperature);

            let icon = '☀️';
            const code = data.current_weather.weathercode;
            if (code > 3) icon = '☁️';
            if (code > 45) icon = '🌫️';
            if (code > 50) icon = '🌧️';
            if (code > 70) icon = '❄️';
            if (code > 95) icon = '⛈️';

            widget.innerHTML = `${icon} ${temp}°C`;
        } catch (e) {
            console.error('Weather error:', e);
            widget.innerHTML = '<span style="font-size:0.7em">--°C</span>';
        }
    },

    selectGender: (gender) => {
        app.state.gender = gender;
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

        const name = gender === 'men' ? 'Mustafa' : 'Dudu';
        document.getElementById('page-title').innerText = name + "'nın Dolabı";

        // Apply Theme
        if (gender === 'women') {
            document.body.classList.add('theme-women');
        } else {
            document.body.classList.remove('theme-women');
        }

        app.filterCategory('all', document.querySelector('.cat-chip'));
    },


    goBack: () => {
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('landing-page').classList.remove('hidden');
        app.state.gender = null;
        document.body.classList.remove('theme-women');
    },

    filterCategory: (category, element) => {
        app.state.category = category;
        document.querySelectorAll('.cat-chip').forEach(el => el.classList.remove('active'));
        if (element) element.classList.add('active');
        app.fetchItems();
    },

    fetchItems: async () => {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '<div class="flex-center" style="width:100%; height:200px; color:var(--text-muted)">Yükleniyor...</div>';

        try {
            let query = db.collection('items').where('gender', '==', app.state.gender);

            if (app.state.category !== 'all') {
                query = query.where('category', '==', app.state.category);
            }

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

                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.innerHTML = '🗑️';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    app.deleteItem(doc.id);
                };

                card.appendChild(img);
                card.appendChild(delBtn);
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Error fetching items:', error);
            grid.innerHTML = `<div class="flex-center" style="color:red; text-align:center; padding:10px;">Hata: ${error.message}<br><small>(Eğer 'requires an index' diyorsa linke tıklayın)</small></div>`;
        }
    },

    deleteItem: async (docId) => {
        if (!confirm('Bu kıyafeti silmek istiyor musunuz?')) return;

        try {
            await db.collection('items').doc(docId).delete();
            app.fetchItems();
        } catch (error) {
            alert('Silinemedi: ' + error.message);
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
            const base64Image = await app.compressImage(file);

            if (base64Image.length > 900000) {
                throw new Error("Fotoğraf çok büyük, küçültülemedi.");
            }

            await db.collection('items').add({
                gender: gender,
                category: category,
                imageUrl: base64Image,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            app.closeAddModal();
            app.fetchItems();

        } catch (error) {
            console.error('Error adding item:', error);
            alert('Hata: ' + error.message + '\nİnterneti kontrol edin.');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    /* Outfit Creator */
    openOutfitModal: () => {
        document.getElementById('outfit-modal').classList.remove('hidden');
    },

    closeOutfitModal: () => {
        document.getElementById('outfit-modal').classList.add('hidden');
    },

    currentSlot: null,

    selectOutfitItem: (category, slotId) => {
        app.currentSlot = slotId;
        document.getElementById('selector-modal').classList.remove('hidden');
        app.fetchSelectorItems(category);
    },

    fetchSelectorItems: async (category) => {
        const grid = document.getElementById('selector-grid');
        grid.innerHTML = '<div class="flex-center">Yükleniyor...</div>';

        try {
            let query = db.collection('items')
                .where('gender', '==', app.state.gender)
                .where('category', '==', category)
                .orderBy('created_at', 'desc');

            const snapshot = await query.get();
            grid.innerHTML = '';

            if (snapshot.empty) {
                grid.innerHTML = '<div class="flex-center">Bu kategoride kıyafet yok.</div>';
                return;
            }

            snapshot.forEach(doc => {
                const item = doc.data();
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.style.cssText = "width:100px; height:100px; object-fit:cover; margin:5px; cursor:pointer; border-radius:10px; border:2px solid transparent;";

                img.onclick = () => {
                    app.setOutfitSlot(item.imageUrl);
                };

                grid.appendChild(img);
            });
        } catch (error) {
            console.error(error);
            grid.innerHTML = 'Hata: ' + error.message;
        }
    },

    setOutfitSlot: (url) => {
        const slotImg = document.getElementById(app.currentSlot + '-img');
        if (slotImg) {
            slotImg.src = url;
            slotImg.classList.remove('hidden');
        }
        document.getElementById('selector-modal').classList.add('hidden');
    },

    resetOutfit: () => {
        document.querySelectorAll('.outfit-slot img').forEach(img => {
            img.src = '';
            img.classList.add('hidden');
        });
    }
};

app.init();
